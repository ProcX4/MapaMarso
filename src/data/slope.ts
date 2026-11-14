import type { DtmGrid } from './elevation'
import { metresPerDegree } from './mars'
import { SLOPE_BANDS, type SlopeBand } from '../config/assumptions'
import type { SlopeRequest, SlopeResponse } from './slope.worker'

export type SlopeGrid = Pick<DtmGrid, 'width' | 'height' | 'bbox'> & { values: Float32Array }

/** Slope (degrees) for the whole DTM grid, computed in a Web Worker. */
export function computeSlope(dtm: DtmGrid): Promise<SlopeGrid> {
  const [minX, minY, maxX, maxY] = dtm.bbox
  const m = metresPerDegree((minY + maxY) / 2)
  const request: SlopeRequest = {
    width: dtm.width,
    height: dtm.height,
    values: dtm.values.slice(), // the worker takes ownership of its copy
    dxM: ((maxX - minX) / dtm.width) * m.lon,
    dyM: ((maxY - minY) / dtm.height) * m.lat,
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./slope.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<SlopeResponse>) => {
      worker.terminate()
      resolve({ width: dtm.width, height: dtm.height, bbox: dtm.bbox, values: e.data.slope })
    }
    worker.onerror = (e) => {
      worker.terminate()
      reject(new Error(e.message))
    }
    worker.postMessage(request, [request.values.buffer])
  })
}

export function slopeBand(deg: number): SlopeBand {
  return SLOPE_BANDS.find((b) => deg < b.max) ?? SLOPE_BANDS[SLOPE_BANDS.length - 1]
}
