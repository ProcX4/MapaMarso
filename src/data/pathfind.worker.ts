import { metresPerDegree } from './mars'
import { PATHFINDING as P, SLOPE_BANDS } from '../config/assumptions'
import { HAZARD, NO_OBSTACLE_DATA, type LegResult, type PathRequest, type PathResponse, type RouteOption } from './pathfind'

/*
 * The Topographic route finder: A* across an elevation grid, steering round steep ground and deep ground.
 * Runs off the main thread, since a 20 m grid of a whole crater is a few million cells.
 *
 * 1. Slope for every cell (Horn's method, as `gdaldem slope`), with each row's own east-west spacing.
 * 2. Depth: how far a cell sits below the average of the ground around it (a box mean from a summed-area table).
 *    Pits, channels and small craters come out deep; a wide, flat crater floor does not.
 *    Roughness: how much the slope varies nearby (box standard deviation of slope), so a boulder field reads
 *    rough and a steady ramp smooth.
 * 3. A cost to walk each cell: 1 on easy ground, more in the caution and hazard slope bands, on deep ground and
 *    (where the site's HiRISE-derived rock map covers it) on rocky ground; impassable at the slope, depth or rock
 *    limit. Each step also pays for the metres it climbs.
 * 4. A* (8 directions, no cutting corners past blocked cells), then the zigzag of grid steps is pulled straight
 *    wherever a straight line crosses no harder ground than the steps it replaces. Done twice: the safest route
 *    (the costs above) and the most direct one (only impassable ground avoided), so the two can be compared.
 */

const cautionMin = SLOPE_BANDS.find((b) => b.token === 'caution')!.min
const hazardMin = SLOPE_BANDS.find((b) => b.token === 'hazard')!.min

self.onmessage = (e: MessageEvent<PathRequest>) => {
  const res = solve(e.data)
  const transfer = [res.slope.buffer, res.hazard.buffer, res.roughness.buffer]
  ;(self as unknown as { postMessage(m: unknown, t: Transferable[]): void }).postMessage(res satisfies PathResponse, transfer)
}

function solve({ grid, points, obstacles }: PathRequest): PathResponse {
  const { width: W, height: H, bbox, values: z } = grid
  const [west, south, east, north] = bbox
  const dLon = (east - west) / W
  const dLat = (north - south) / H
  const latOf = (y: number) => north - (y + 0.5) * dLat
  const dyM = dLat * metresPerDegree(0).lat
  const dxM = Float64Array.from({ length: H }, (_, y) => Math.max(dLon * metresPerDegree(latOf(y)).lon, 1e-3))

  // 1. Slope, clamping at the edges so the border still gets a value
  const slope = new Float32Array(W * H)
  const at = (x: number, y: number) => z[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))]
  const deg = 180 / Math.PI
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = at(x - 1, y - 1), b = at(x, y - 1), c = at(x + 1, y - 1)
      const d = at(x - 1, y), f = at(x + 1, y)
      const g = at(x - 1, y + 1), h = at(x, y + 1), k = at(x + 1, y + 1)
      const dzdx = (c + 2 * f + k - (a + 2 * d + g)) / (8 * dxM[y])
      const dzdy = (g + 2 * h + k - (a + 2 * b + c)) / (8 * dyM)
      slope[y * W + x] = Math.atan(Math.hypot(dzdx, dzdy)) * deg
    }
  }

  // 2. Box statistics from summed-area tables: mean height (for depth), and mean and mean square of slope (roughness)
  const table = (v: (i: number) => number) => {
    const t = new Float64Array((W + 1) * (H + 1))
    for (let y = 0; y < H; y++) {
      let row = 0
      for (let x = 0; x < W; x++) {
        row += v(y * W + x)
        const i = (y + 1) * (W + 1) + x + 1
        t[i] = t[i - W - 1] + row
      }
    }
    return t
  }
  const valid = (v: number) => (Number.isNaN(v) ? 0 : v)
  const zSum = table((i) => valid(z[i]))
  const zCount = table((i) => (Number.isNaN(z[i]) ? 0 : 1))
  const sSum = table((i) => valid(slope[i]))
  const sSq = table((i) => valid(slope[i]) ** 2)
  const sCount = table((i) => (Number.isNaN(slope[i]) ? 0 : 1))
  const box = (t: Float64Array, x0: number, y0: number, x1: number, y1: number) =>
    t[(y1 + 1) * (W + 1) + x1 + 1] - t[y0 * (W + 1) + x1 + 1] - t[(y1 + 1) * (W + 1) + x0] + t[y0 * (W + 1) + x0]
  const depthR = Math.max(2, Math.round(P.depthRadiusM / dyM))
  const roughR = Math.max(1, Math.round(P.roughnessRadiusM / dyM))

  // 3. Hazard class, roughness and walking cost per cell
  const hazard = new Uint8Array(W * H)
  const roughness = new Float32Array(W * H)
  const cost = new Float32Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      const v = z[i], s = slope[i]
      if (Number.isNaN(v) || Number.isNaN(s)) {
        hazard[i] = HAZARD.noData
        roughness[i] = NaN
        cost[i] = Infinity
        continue
      }
      let [x0, y0, x1, y1] = [Math.max(0, x - roughR), Math.max(0, y - roughR), Math.min(W - 1, x + roughR), Math.min(H - 1, y + roughR)]
      const sn = box(sCount, x0, y0, x1, y1)
      const mean = sn ? box(sSum, x0, y0, x1, y1) / sn : s
      roughness[i] = sn ? Math.sqrt(Math.max(0, box(sSq, x0, y0, x1, y1) / sn - mean * mean)) : 0
      ;[x0, y0, x1, y1] = [Math.max(0, x - depthR), Math.max(0, y - depthR), Math.min(W - 1, x + depthR), Math.min(H - 1, y + depthR)]
      const n = box(zCount, x0, y0, x1, y1)
      const depth = n ? box(zSum, x0, y0, x1, y1) / n - v : 0
      let c = 1
      let cls: number = HAZARD.none
      if (s >= P.maxSlopeDeg) { cls = HAZARD.steep; c = Infinity }
      else if (s >= hazardMin) { cls = HAZARD.hazard; c += P.slopePenalty.hazard }
      else if (s >= cautionMin) { cls = HAZARD.caution; c += P.slopePenalty.caution }
      if (depth >= P.depthMaxM) { cls = HAZARD.deep; c = Infinity }
      else if (depth >= P.depthSoftM) {
        if (cls === HAZARD.none) cls = HAZARD.deepSoft
        c += (P.depthPenalty * (depth - P.depthSoftM)) / (P.depthMaxM - P.depthSoftM)
      }
      const rock = obstacles ? obstacles[i] : NO_OBSTACLE_DATA
      if (rock !== NO_OBSTACLE_DATA) {
        if (rock >= P.rockMaxPct) { if (c !== Infinity) cls = HAZARD.rocky; c = Infinity }
        else if (rock >= P.rockSoftPct) {
          if (cls === HAZARD.none) cls = HAZARD.rockySoft
          c += (P.rockPenalty * (rock - P.rockSoftPct)) / (P.rockMaxPct - P.rockSoftPct)
        }
      }
      hazard[i] = cls
      cost[i] = c
    }
  }
  // The most direct route only steers round what can't be crossed at all
  const directCost = cost.map((c) => (c === Infinity ? Infinity : 1))

  const cellOf = ([lon, lat]: [number, number]) => {
    const x = Math.floor((lon - west) / dLon), y = Math.floor((north - lat) / dLat)
    return x >= 0 && y >= 0 && x < W && y < H ? [x, y] : null
  }
  const centre = (x: number, y: number): [number, number] => [west + (x + 0.5) * dLon, latOf(y)]

  const route = (costs: Float32Array): LegResult[] =>
    points.slice(1).map((to, li) => {
      const from = points[li]
      const a = cellOf(from), b = cellOf(to)
      if (!a || !b) return { path: [from, to], status: 'outside' }
      const legM = Math.hypot((b[0] - a[0]) * dxM[a[1]], (b[1] - a[1]) * dyM)
      const marginCells = Math.ceil(Math.max(P.minSearchMarginM, P.searchMargin * legM) / dyM)
      const cells =
        aStar(costs, a, b, Math.min(a[0], b[0]) - marginCells, Math.min(a[1], b[1]) - marginCells, Math.max(a[0], b[0]) + marginCells, Math.max(a[1], b[1]) + marginCells) ??
        aStar(costs, a, b, 0, 0, W - 1, H - 1)
      if (!cells) return { path: [from, to], status: 'blocked' }
      const path = straighten(costs, cells).map(([x, y]) => centre(x, y))
      path[0] = from
      path[path.length - 1] = to
      return { path, status: 'safe' }
    })

  const legs: Record<RouteOption, LegResult[]> = { safest: route(cost), direct: route(directCost) }
  return { legs, slope, hazard, roughness }

  /** The cost of stepping between two neighbouring cells (each cell's cost already includes its penalty) */
  function stepCost(cx: number, cy: number, nx: number, ny: number, ca: number, cb: number, symmetric: boolean) {
    const stepM = Math.hypot((nx - cx) * dxM[cy], (ny - cy) * dyM)
    const dz = z[ny * W + nx] - z[cy * W + cx]
    // One way, only climbing costs; there and back, every metre of height is climbed once
    return (stepM * (ca + cb)) / 2 * (symmetric ? 2 : 1) + P.climbM * (symmetric ? Math.abs(dz) : Math.max(0, dz))
  }

  /** A* inside a window of the grid; cells as [x, y], or null when the goal can't be reached. */
  function aStar(costs: Float32Array, start: number[], goal: number[], wx0: number, wy0: number, wx1: number, wy1: number): number[][] | null {
    wx0 = Math.max(0, wx0); wy0 = Math.max(0, wy0); wx1 = Math.min(W - 1, wx1); wy1 = Math.min(H - 1, wy1)
    const ww = wx1 - wx0 + 1, wh = wy1 - wy0 + 1
    const local = (x: number, y: number) => (y - wy0) * ww + (x - wx0)
    const g = new Float64Array(ww * wh).fill(Infinity)
    const came = new Int32Array(ww * wh).fill(-1)
    const closed = new Uint8Array(ww * wh)
    const heap = new MinHeap()
    // Never trapped by the ground under a stop itself: it costs as hazard ground, not a wall
    const walk = (x: number, y: number) => {
      const c = costs[y * W + x]
      return c === Infinity && ((x === start[0] && y === start[1]) || (x === goal[0] && y === goal[1])) ? 1 + P.slopePenalty.hazard : c
    }
    let dxMin = Infinity
    for (let y = wy0; y <= wy1; y++) dxMin = Math.min(dxMin, dxM[y])
    const h = (x: number, y: number) => Math.hypot((goal[0] - x) * dxMin, (goal[1] - y) * dyM)

    const s = local(start[0], start[1])
    g[s] = 0
    heap.push(s, h(start[0], start[1]))
    const target = local(goal[0], goal[1])
    while (heap.size) {
      const cur = heap.pop()
      if (cur === target) break
      if (closed[cur]) continue
      closed[cur] = 1
      const cx = (cur % ww) + wx0, cy = Math.floor(cur / ww) + wy0
      const cc = walk(cx, cy)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue
          const nx = cx + dx, ny = cy + dy
          if (nx < wx0 || ny < wy0 || nx > wx1 || ny > wy1) continue
          const nc = walk(nx, ny)
          if (nc === Infinity) continue
          // Diagonal steps don't squeeze between two blocked cells
          if (dx && dy && (walk(cx + dx, cy) === Infinity || walk(cx, cy + dy) === Infinity)) continue
          const n = local(nx, ny)
          if (closed[n]) continue
          const ng = g[cur] + stepCost(cx, cy, nx, ny, cc, nc, false)
          if (ng < g[n]) {
            g[n] = ng
            came[n] = cur
            heap.push(n, ng + h(nx, ny))
          }
        }
      }
    }
    if (g[target] === Infinity) return null
    const out: number[][] = []
    for (let i = target; i !== -1; i = came[i]) out.push([(i % ww) + wx0, Math.floor(i / ww) + wy0])
    return out.reverse()
  }

  /** Grid steps pulled into straight runs wherever the straight line is no harder going than the steps it replaces. */
  function straighten(costs: Float32Array, cells: number[][]) {
    const rank = (x: number, y: number) => costs[y * W + x]
    const out = [cells[0]]
    let i = 0
    while (i < cells.length - 1) {
      let best = i + 1
      let worst = rank(cells[i + 1][0], cells[i + 1][1])
      for (let j = i + 2; j < cells.length && j <= i + 400; j++) {
        worst = Math.max(worst, rank(cells[j][0], cells[j][1]))
        if (clearLine(costs, cells[i], cells[j], worst)) best = j
      }
      out.push(cells[best])
      i = best
    }
    return out
  }

  /** Every cell on the straight line between two cells costs no more than `limit` (and none is blocked). */
  function clearLine(costs: Float32Array, [x0, y0]: number[], [x1, y1]: number[], limit: number) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2
    for (let k = 1; k < n; k++) {
      const x = Math.round(x0 + ((x1 - x0) * k) / n), y = Math.round(y0 + ((y1 - y0) * k) / n)
      const c = costs[y * W + x]
      if (c === Infinity || c > limit + 1e-6) return false
    }
    return true
  }

}

/** Binary min-heap of cell indexes by priority. */
class MinHeap {
  private ids: number[] = []
  private keys: number[] = []
  get size() {
    return this.ids.length
  }
  push(id: number, key: number) {
    const { ids, keys } = this
    let i = ids.length
    ids.push(id)
    keys.push(key)
    while (i > 0) {
      const p = (i - 1) >> 1
      if (keys[p] <= key) break
      ids[i] = ids[p]; keys[i] = keys[p]
      i = p
    }
    ids[i] = id; keys[i] = key
  }
  pop() {
    const { ids, keys } = this
    const top = ids[0]
    const id = ids.pop()!, key = keys.pop()!
    if (ids.length) {
      let i = 0
      for (;;) {
        const l = 2 * i + 1, r = l + 1
        let m = i, mk = key
        if (l < ids.length && keys[l] < mk) { m = l; mk = keys[l] }
        if (r < ids.length && keys[r] < mk) { m = r }
        if (m === i) break
        ids[i] = ids[m]; keys[i] = keys[m]
        i = m
      }
      ids[i] = id; keys[i] = key
    }
    return top
  }
}
