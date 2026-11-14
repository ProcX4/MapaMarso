import { useMarswalk } from '../../hooks/useMarswalk'
import { useDatasets } from '../../hooks/useDerived'
import { usePointTerrain } from '../../hooks/usePointTerrain'
import { slopeBand } from '../../data/slope'
import { NEARBY_HAZARD_M, TERRAIN_NOTE } from '../../data/terrain'
import { distanceM } from '../../data/mars'
import { formatDistance, formatLatLon, formatM, formatSlope, NO_DATA } from '../../lib/format'
import { Button } from '../../components/Button'
import { ProvenanceTag } from '../../components/ProvenanceTag'
import { LIMITS, SLOPE_BANDS } from '../../config/assumptions'
import { Icon } from '../../components/Icon'
import { useNow } from '../../hooks/useNow'
import { daylightText, sunElevation } from '../../data/daylight'
import type { StopKind } from '../../state/types'
import { MAP_PLAN } from '../../lib/missionPaths'
import { RoverPhotos } from './RoverPhotos'
import { CompareSites } from './CompareSites'

const NEARBY_M = 500

const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']
const compass = (deg: number) => COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8]
/** Distances on the card are approximate: the nearest 10 m (or 50 m past a kilometre) */
const roundTo = (m: number) => (m < 1000 ? Math.round(m / 10) * 10 : Math.round(m / 50) * 50)

/** Site analysis for the last clicked point. Every row says where its value comes from. */
export function SiteCard() {
  const { state, dispatch } = useMarswalk()
  const data = useDatasets()
  const at = state.selected
  const terrain = usePointTerrain(at)
  const now = useNow(60_000)
  if (!at) return null

  const waiting = terrain.status === 'loading'
  const elev = terrain.value?.elevM ?? null
  const slope = terrain.value?.slopeDeg ?? null
  const band = slope !== null ? slopeBand(slope) : null
  const source = terrain.value ? TERRAIN_NOTE[terrain.value.source] : null
  const steep = terrain.value?.nearbySteep ?? null
  const nearby = (data.targets.value ?? [])
    .map((t) => ({ ...t, m: distanceM(t.at, at) }))
    .filter((t) => t.m <= NEARBY_M)
    .sort((a, b) => a.m - b.m)
  const full = state.stops.length >= LIMITS.maxStops

  const add = (kind: StopKind, name: string) => {
    dispatch({ type: 'addStop', stop: { id: crypto.randomUUID(), kind, name, at } })
  }

  return (
    <aside className="info-card site-card" aria-label="Site analysis">
      <button type="button" className="info-card-close" aria-label="Close site card" onClick={() => dispatch({ type: 'select', at: null })}>
        <Icon name="close" size={16} />
      </button>
      <p className="info-card-kicker">Site analysis</p>
      <h2 className="num">{formatLatLon(at)}</h2>
      <p className="muted site-card-sun">{daylightText(sunElevation(at, now.getTime()))} now</p>

      <h3 className="info-card-kicker site-card-group">Terrain</h3>
      <dl className="info-card-facts">
        <dt>Elevation</dt>
        <dd>
          {waiting ? '…' : elev !== null ? formatM(elev) : NO_DATA}
          <ProvenanceTag category="observed" note={source ?? undefined} />
        </dd>
        <dt>Slope</dt>
        <dd>
          {waiting ? '…' : slope !== null ? formatSlope(slope) : NO_DATA}
          <ProvenanceTag category="derived" note={`Horn method on the ${source ?? 'elevation model'}`} />
        </dd>
      </dl>

      <h3 className="info-card-kicker site-card-group">Science</h3>
      <dl className="info-card-facts">
        <dt>Targets</dt>
        <dd>{nearby.length ? nearby.map((t) => `${t.name} (${formatDistance(t.m)})`).join(', ') : `None within ${formatDistance(NEARBY_M)}`}</dd>
      </dl>

      <h3 className="info-card-kicker site-card-group">Hazards</h3>
      <dl className="info-card-facts">
        <dt>Terrain</dt>
        <dd>
          {waiting ? '…' : band ? (
            <span className={band.token ? `text-${band.token}` : 'text-ok'}>{band.label}</span>
          ) : (
            NO_DATA
          )}
          <ProvenanceTag category="estimated" note="Slope thresholds are assumptions for a suited astronaut" />
        </dd>
        <dt>Nearby</dt>
        <dd>
          {waiting
            ? '…'
            : !terrain.value
              ? NO_DATA
              : steep
                ? `Steep ground (${formatSlope(steep.slopeDeg)}) about ${formatDistance(roundTo(steep.m))} ${compass(steep.bearingDeg)}`
                : `No steep ground within ${formatDistance(NEARBY_HAZARD_M)}`}
          <ProvenanceTag category="derived" note={`Closest ground of ${SLOPE_BANDS.find((b) => b.token === 'hazard')!.min}° or more within ${formatDistance(NEARBY_HAZARD_M)}, from the ${source ?? 'elevation model'}`} />
        </dd>
      </dl>

      <CompareSites at={at} />

      <RoverPhotos at={at} />

      <div className="site-card-actions">
        <Button disabled={full} onClick={() => add('waypoint', 'Waypoint')}>Add waypoint</Button>
        <Button disabled={full} variant="ghost" onClick={() => add('science', 'Science stop')}>Add science stop</Button>
        <Button
          disabled={full}
          variant="ghost"
          onClick={() => {
            add('destination', 'Destination')
            if (state.mode !== 'plan') window.location.hash = MAP_PLAN
          }}
        >
          Route here
        </Button>
        {/* A mission can start anywhere on Mars: this moves the route's start (A) here */}
        <Button variant="ghost" onClick={() => dispatch({ type: 'setBase', at, name: `Start ${formatLatLon(at)}` })}>
          Set as start
        </Button>
      </div>
      {full && <p className="muted site-card-note">Route is full ({LIMITS.maxStops} stops max).</p>}

      {source && <p className="provenance-line">Elevation: {source}</p>}
    </aside>
  )
}
