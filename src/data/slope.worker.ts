/*
 * Slope in degrees for every DTM pixel, Horn's method (same as GDAL `gdaldem slope`).
 * Runs off the main thread so the map stays responsive on a large DTM.
 * Edge pixels and pixels next to no-data come out NaN rather than guessed.
 */

export type SlopeRequest = { width: number; height: number; values: Float32Array; dxM: number; dyM: number }
export type SlopeResponse = { slope: Float32Array }

self.onmessage = (e: MessageEvent<SlopeRequest>) => {
  const { width: w, height: h, values: z, dxM, dyM } = e.data
  const slope = new Float32Array(w * h).fill(NaN)
  const deg = 180 / Math.PI
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const a = z[i - w - 1], b = z[i - w], c = z[i - w + 1]
      const d = z[i - 1], f = z[i + 1]
      const g = z[i + w - 1], hh = z[i + w], k = z[i + w + 1]
      const dzdx = (c + 2 * f + k - (a + 2 * d + g)) / (8 * dxM)
      const dzdy = (g + 2 * hh + k - (a + 2 * b + c)) / (8 * dyM)
      slope[i] = Math.atan(Math.hypot(dzdx, dzdy)) * deg // NaN propagates from no-data neighbours
    }
  }
  ;(self as unknown as { postMessage(m: unknown, t: Transferable[]): void }).postMessage({ slope } satisfies SlopeResponse, [slope.buffer])
}
