import { useMarswalk } from '../../hooks/useMarswalk'
import { useDatasets } from '../../hooks/useDerived'
import { useElevationAt } from '../../hooks/useElevationAt'
import { sampleGrid } from '../../data/elevation'
import { slopeBand } from '../../data/slope'
import { geologyAt } from '../../data/vectors'
import { distanceM } from '../../data/mars'
import { formatDistance, formatLatLon, formatM, formatSlope, NO_DATA } from '../../lib/format'
import { layerDef, provenanceLine } from '../../map/layers/registry'
import { Button } from '../../components/Button'
import { ProvenanceTag } from '../../components/ProvenanceTag'
import { LIMITS } from '../../config/assumptions'
import type { StopKind } from '../../state/types'

const NEARBY_M = 500

/** Site analysis for the last clicked point. Every row says where its value comes from. */
export function SiteCard() {
  const { state, dispatch } = useMarswalk()
  const data = useDatasets()
  const at = state.selected
  const elev = useElevationAt(at)
  if (!at) return null

  const slope = data.slope.value ? sampleGrid(data.slope.value, data.slope.value.values, at) : null
  const band = slope !== null ? slopeBand(slope) : null
  const geology = data.geology.value ? geologyAt(data.geology.value, at) : null
  const nearby = (data.targets.value ?? [])
    .map((t) => ({ ...t, m: distanceM(t.at, at) }))
    .filter((t) => t.m <= NEARBY_M)
    .sort((a, b) => a.m - b.m)
  const full = state.stops.length >= LIMITS.maxStops

  const add = (kind: StopKind, name: string) => {
    dispatch({ type: 'addStop', stop: { id: crypto.randomUUID(), kind, name, at } })
  }

  return (
    <aside className="panel site-card" aria-label="Site analysis">
      <button type="button" className="icon-button site-card-close" aria-label="Close site card" onClick={() => dispatch({ type: 'select', at: null })}>
        ×
      </button>
      <p className="kicker">Site analysis</p>
      <h2 className="site-card-title num">{formatLatLon(at)}</h2>

      <h3 className="kicker site-card-group">Terrain</h3>
      <dl className="facts">
        <dt>Elevation</dt>
        <dd>
          {elev.status === 'loading' ? '…' : elev.value !== null ? formatM(elev.value) : NO_DATA}
          <ProvenanceTag category="observed" />
        </dd>
        <dt>Slope</dt>
        <dd>
          {slope !== null ? formatSlope(slope) : NO_DATA}
          <ProvenanceTag category="derived" note="Horn method on the site DTM" />
        </dd>
      </dl>

      <h3 className="kicker site-card-group">Science</h3>
      <dl className="facts">
        <dt>Geology</dt>
        <dd>
          {geology ? `${geology.unit} · ${geology.name}` : NO_DATA}
          <ProvenanceTag category="observed" />
        </dd>
        <dt>Targets</dt>
        <dd>{nearby.length ? nearby.map((t) => `${t.name} (${formatDistance(t.m)})`).join(', ') : `None within ${formatDistance(NEARBY_M)}`}</dd>
      </dl>

      <h3 className="kicker site-card-group">Hazards</h3>
      <dl className="facts">
        <dt>Terrain</dt>
        <dd>
          {band ? (
            <span className={band.token ? `text-${band.token}` : 'text-ok'}>{band.label}</span>
          ) : (
            NO_DATA
          )}
          <ProvenanceTag category="estimated" note="Slope thresholds are assumptions for a suited astronaut" />
        </dd>
      </dl>

      <div className="site-card-actions">
        <Button disabled={full} onClick={() => add('waypoint', 'Waypoint')}>Add waypoint</Button>
        <Button disabled={full} variant="ghost" onClick={() => add('science', 'Science stop')}>Add science stop</Button>
        <Button
          disabled={full}
          variant="ghost"
          onClick={() => {
            add('destination', 'Destination')
            window.location.hash = '#/plan'
          }}
        >
          Route here
        </Button>
      </div>
      {full && <p className="muted site-card-note">Route is full ({LIMITS.maxStops} stops max).</p>}

      <p className="provenance-line">
        {[layerDef('site-dtm'), layerDef('geology')].map((d) => d && provenanceLine(d)).join(' | ')}
      </p>
    </aside>
  )
}
