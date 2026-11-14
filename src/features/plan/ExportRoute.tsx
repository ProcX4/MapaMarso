import { useMarswalk } from '../../hooks/useMarswalk'
import { useRoute } from '../../hooks/useDerived'
import { Button } from '../../components/Button'
import { downloadText, routeFileName, routeToGeoJSON } from '../../data/exportRoute'

/** Saves the planned route as a GeoJSON file on this device (separate from saving a mission with a code). */
export function ExportRoute() {
  const { state } = useMarswalk()
  const route = useRoute()
  const ready = route.order.length > 1
  const name = state.mission?.name || 'New Marswalk'

  const save = () => {
    const geo = routeToGeoJSON(route, {
      name,
      code: state.mission?.code ?? undefined,
      roundTrip: state.roundTrip,
      walkingSpeedKmh: state.walkingSpeedKmh,
      maxEvaHours: state.maxEvaHours,
      exportedAt: new Date(),
    })
    downloadText(routeFileName(name), JSON.stringify(geo, null, 2), 'application/geo+json')
  }

  return (
    <div className="plan-export">
      <h2 className="kicker">Export route</h2>
      <p className="muted plan-note">Saves a GeoJSON file to this device: the walked path with elevations, and your stops. Coordinates are on Mars, not Earth.</p>
      <Button variant="ghost" disabled={!ready} onClick={save}>Download route (GeoJSON)</Button>
      {!ready && <p className="muted plan-note">Plan a route of two stops or more first.</p>}
    </div>
  )
}
