import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useHover, useRoute } from '../../hooks/useDerived'
import { formatDistance, formatM, formatSlope, NO_DATA } from '../../lib/format'
import { ProvenanceTag } from '../../components/ProvenanceTag'

const PAD = { top: 16, right: 14, bottom: 26, left: 62 }

/** A round step for axis marks: 1, 2 or 5 times a power of ten, giving about `count` marks over `span` */
function niceStep(span: number, count: number) {
  const raw = span / Math.max(1, count)
  const pow = 10 ** Math.floor(Math.log10(raw))
  const n = raw / pow
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * pow
}

/** Marks from `min` to `max` on whole steps */
function ticks(min: number, max: number, step: number) {
  const out: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-6; v += step) out.push(v)
  return out
}

/**
 * Hand-drawn SVG profile that fills its card. Hover links both ways: hovering here moves a marker on the map,
 * and hovering the route on the map moves the cursor here. Heights are stretched to fit the card; the
 * stretch is printed, so a steep-looking stretch isn't taken for real steepness.
 */
export function ElevationProfile() {
  const route = useRoute()
  const { hover, setHover } = useHover()
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 520, height: 160 })

  // The chart only exists once there's a route; measure it whenever it appears, and as the card resizes
  const charted = route.order.length >= 2
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const next = { width: Math.max(240, Math.round(e.contentRect.width)), height: Math.max(110, Math.round(e.contentRect.height)) }
      setSize((s) => (s.width === next.width && s.height === next.height ? s : next))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [charted])
  const { width, height: H } = size

  const { profile, totalM } = route
  const elevs = profile.map((p) => p.elevM).filter((e): e is number => e !== null)
  const hasElev = elevs.length > 1
  // A little headroom over the highest and lowest points, out to whole height steps
  const lo = hasElev ? Math.min(...elevs) : 0
  const hi = hasElev ? Math.max(...elevs) : 1
  const yStep = niceStep(Math.max(hi - lo, 10), 3)
  const min = Math.floor(lo / yStep) * yStep
  const max = Math.max(Math.ceil(hi / yStep) * yStep, min + yStep)
  const span = max - min
  const innerW = width - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const x = (d: number) => PAD.left + (totalM ? (d / totalM) * innerW : 0)
  const y = (e: number) => PAD.top + innerH - ((e - min) / span) * innerH

  /** SVG path through consecutive points that have elevation; gaps break the line. */
  const pathFor = (pts: typeof profile) => {
    let d = ''
    let pen = false
    for (const p of pts) {
      if (p.elevM === null) {
        pen = false
        continue
      }
      d += `${pen ? 'L' : 'M'}${x(p.distM).toFixed(1)},${y(p.elevM).toFixed(1)}`
      pen = true
    }
    return d
  }

  // Stop positions along the route
  const stopMarks = route.order.map((s, i) => ({
    stop: s,
    d: route.legs.slice(0, i).reduce((sum, l) => sum + l.m, 0),
    label: s.kind === 'base' ? 'A' : s.kind === 'destination' ? 'B' : String(i),
  }))

  const hoverIndex = hover ? profile.findIndex((p) => p.at === hover) : -1
  const hp = hoverIndex >= 0 ? profile[hoverIndex] : null

  const pickAt = (clientX: number) => {
    const rect = box.current!.getBoundingClientRect()
    const d = ((clientX - rect.left - PAD.left) / innerW) * totalM
    let best = profile[0]
    for (const p of profile) if (Math.abs(p.distM - d) < Math.abs(best.distM - d)) best = p
    setHover(best?.at ?? null)
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const stepPts = Math.max(1, Math.round(profile.length / 50))
    const i = hoverIndex < 0 ? 0 : hoverIndex + (e.key === 'ArrowRight' ? stepPts : -stepPts)
    setHover(profile[Math.min(profile.length - 1, Math.max(0, i))].at)
  }

  if (route.order.length < 2) {
    return (
      <div className="plan-profile is-empty">
        <h2 className="kicker">Elevation profile</h2>
        <p className="muted">Add a second stop to see the profile.</p>
      </div>
    )
  }

  const gridYs = hasElev ? ticks(min, max, yStep) : []
  const xTicks = ticks(0, totalM, niceStep(totalM, Math.max(2, Math.floor(innerW / 110))))
  // How much taller the hills are drawn than they are: horizontal metres per pixel over vertical metres per pixel
  const stretch = hasElev && totalM ? totalM / innerW / (span / innerH) : 1
  const linePath = hasElev ? pathFor(profile) : ''
  // The ground under the line, faintly filled so the shape reads at a glance (only where elevation runs unbroken)
  const firstElev = profile.find((p) => p.elevM !== null)
  const lastElev = [...profile].reverse().find((p) => p.elevM !== null)
  const unbroken = !!firstElev && !!lastElev && !profile.slice(profile.indexOf(firstElev), profile.indexOf(lastElev) + 1).some((p) => p.elevM === null)
  const floorY = (PAD.top + innerH).toFixed(1)
  const areaPath = hasElev && unbroken ? `${linePath}L${x(lastElev!.distM).toFixed(1)},${floorY}L${x(firstElev!.distM).toFixed(1)},${floorY}Z` : ''

  return (
    <div className="plan-profile">
      <div className="plan-profile-head">
        <h2 className="kicker">Elevation profile</h2>
        <ProvenanceTag category="derived" note="Sampled every 10 m along the A* safe path, from the Jezero CTX DTM at the site or MOLA elsewhere" />
        {hasElev && stretch > 1.5 && (
          <span className="plan-profile-stretch num" title="Heights are drawn taller than they are so small rises show; the slope numbers are real">
            heights ×{stretch < 10 ? stretch.toFixed(1) : Math.round(stretch)}
          </span>
        )}
        {hp && (
          <span className="plan-profile-readout num">
            {formatDistance(hp.distM)} · {hp.elevM !== null ? formatM(hp.elevM) : NO_DATA} · {hp.slopeDeg !== null ? formatSlope(hp.slopeDeg) : NO_DATA}
          </span>
        )}
      </div>
      <div
        ref={box}
        className="plan-profile-chart"
        tabIndex={0}
        role="img"
        aria-label={`Elevation profile over ${formatDistance(totalM)}. Use left and right arrows to move along the route.`}
        onPointerMove={(e: PointerEvent) => pickAt(e.clientX)}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
      >
        <svg width={width} height={H}>
          {gridYs.map((g) => (
            <g key={g}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(g)} y2={y(g)} className="profile-grid" />
              <text x={PAD.left - 8} y={y(g) + 4} textAnchor="end" className="profile-axis">{formatM(g)}</text>
            </g>
          ))}
          <line x1={PAD.left} x2={width - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} className="profile-grid" />
          {xTicks.map((d) => (
            <g key={d}>
              <line x1={x(d)} x2={x(d)} y1={PAD.top + innerH} y2={PAD.top + innerH + 4} className="profile-grid" />
              <text x={x(d)} y={H - 6} textAnchor={d === 0 ? 'start' : 'middle'} className="profile-axis">{d === 0 ? '0' : formatDistance(d)}</text>
            </g>
          ))}

          {hasElev ? (
            <>
              {areaPath && <path d={areaPath} className="profile-area" />}
              <path d={linePath} className="profile-line" />
              {route.hazards.map((h) => (
                <path key={h.fromM} d={pathFor(profile.filter((p) => p.distM >= h.fromM && p.distM <= h.toM))} className="profile-line" style={{ stroke: `var(--${h.token})`, strokeWidth: 3 }} />
              ))}
            </>
          ) : (
            <text x={PAD.left + innerW / 2} y={PAD.top + innerH / 2} textAnchor="middle" className="profile-empty">
              No elevation data along this route
            </text>
          )}

          {stopMarks.map((m, i) => {
            const pt = profile.find((p) => p.distM >= m.d - 0.5)
            const cy = hasElev && pt?.elevM != null ? y(pt.elevM) : PAD.top + innerH
            const science = m.stop.kind === 'science'
            return (
              <g key={`${m.stop.id}-${i}`}>
                <circle cx={x(m.d)} cy={cy} r={science ? 5 : 4} className={science ? 'profile-science' : 'profile-stop'} />
                <text x={x(m.d)} y={cy - 9} textAnchor="middle" className="profile-axis">{m.label}</text>
              </g>
            )
          })}

          {hp && <line x1={x(hp.distM)} x2={x(hp.distM)} y1={PAD.top} y2={PAD.top + innerH} className="profile-cursor" />}
        </svg>
      </div>
    </div>
  )
}
