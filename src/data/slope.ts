import type { DtmGrid } from './elevation'
import { SLOPE_BANDS, type SlopeBand } from '../config/assumptions'

export type SlopeGrid = Pick<DtmGrid, 'width' | 'height' | 'bbox'> & { values: Float32Array }

export function slopeBand(deg: number): SlopeBand {
  return SLOPE_BANDS.find((b) => deg < b.max) ?? SLOPE_BANDS[SLOPE_BANDS.length - 1]
}
