import { useMarswalk } from '../../hooks/useMarswalk'
import { usePointTerrain } from '../../hooks/usePointTerrain'
import { slopeBand } from '../../data/slope'
import { bearingDeg, distanceM } from '../../data/mars'
import { formatBearing, formatDistance, formatLatLon, formatM, formatSignedM, formatSlope, NO_DATA } from '../../lib/format'
import { Button } from '../../components/Button'
import { ProvenanceTag } from '../../components/ProvenanceTag'
import { flyTo } from '../../map/mapControl'
import type { LngLat } from '../../state/types'

type Side = { at: LngLat; elev: number | null; slope: number | null; loading: boolean }

const bandText = (slope: number | null) => {
  const band = slope === null ? null : slopeBand(slope)
  return band ? band.label : NO_DATA
}

/** Pin a point, click another, and see the two side by side (PS §16, site comparison). */
export function CompareSites({ at }: { at: LngLat }) {
  const { state, dispatch } = useMarswalk()
  const pinned = state.pinned
  const here = usePointTerrain(at)
  const pin = usePointTerrain(pinned)

  if (!pinned) {
    return (
      <div className="site-compare">
        <Button variant="ghost" onClick={() => dispatch({ type: 'pin', at })}>Pin to compare</Button>
      </div>
    )
  }

  const samePoint = pinned[0] === at[0] && pinned[1] === at[1]
  const a: Side = { at: pinned, elev: pin.value?.elevM ?? null, slope: pin.value?.slopeDeg ?? null, loading: pin.status === 'loading' }
  const b: Side = { at, elev: here.value?.elevM ?? null, slope: here.value?.slopeDeg ?? null, loading: here.status === 'loading' }
  const cell = (s: Side, v: string | null) => (s.loading ? '…' : v ?? NO_DATA)
  // From the rounded heights the table shows, so the three numbers always agree
  const rise = a.elev !== null && b.elev !== null ? Math.round(b.elev) - Math.round(a.elev) : null

  return (
    <div className="site-compare">
      <h3 className="info-card-kicker site-card-group">Compare</h3>
      {samePoint ? (
        <p className="muted site-card-note">This is the pinned point. Click somewhere else on the map to compare it.</p>
      ) : (
        <table className="compare-table">
          <caption className="visually-hidden">Pinned point compared with this point</caption>
          <thead>
            <tr><th scope="col" /><th scope="col">Pinned</th><th scope="col">This point</th></tr>
          </thead>
          <tbody>
            <tr><th scope="row">Place</th><td className="num">{formatLatLon(a.at)}</td><td className="num">{formatLatLon(b.at)}</td></tr>
            <tr><th scope="row">Elevation</th><td className="num">{cell(a, a.elev !== null ? formatM(a.elev) : null)}</td><td className="num">{cell(b, b.elev !== null ? formatM(b.elev) : null)}</td></tr>
            <tr><th scope="row">Slope</th><td className="num">{cell(a, a.slope !== null ? formatSlope(a.slope) : null)}</td><td className="num">{cell(b, b.slope !== null ? formatSlope(b.slope) : null)}</td></tr>
            <tr><th scope="row">Terrain</th><td>{cell(a, bandText(a.slope))}</td><td>{cell(b, bandText(b.slope))}</td></tr>
          </tbody>
        </table>
      )}
      {!samePoint && (
        <p className="num site-compare-diff">
          {formatDistance(distanceM(a.at, b.at))} apart, bearing {formatBearing(bearingDeg(a.at, b.at))} from the pin
          {rise !== null && <> · {formatSignedM(rise)} in height</>}{' '}
          <ProvenanceTag category="derived" note="Straight-line distance on a 3,389.5 km Mars sphere; heights from the elevation model at each point (Jezero DTM at the site, MOLA elsewhere)" />
        </p>
      )}
      <div className="site-card-actions">
        <Button variant="ghost" onClick={() => flyTo(pinned)}>Show pin</Button>
        <Button variant="ghost" onClick={() => dispatch({ type: 'pin', at: null })}>Clear pin</Button>
        {!samePoint && <Button variant="ghost" onClick={() => dispatch({ type: 'pin', at })}>Pin this point instead</Button>}
      </div>
    </div>
  )
}
