import type { ReactNode } from 'react'
import { NO_DATA } from '../lib/format'

/** Big mono number with a small uppercase label. `value: null` shows "No data", never 0. */
export function Stat({ label, value, tag }: { label: string; value: string | null; tag?: ReactNode }) {
  return (
    <div className="stat">
      <dt>
        {label} {tag}
      </dt>
      <dd className={value === null ? 'is-nodata' : undefined}>{value ?? NO_DATA}</dd>
    </div>
  )
}
