import { useRoute } from '../../hooks/useDerived'
import { Stat } from '../../components/Stat'
import { ProvenanceTag } from '../../components/ProvenanceTag'
import { RADIATION } from '../../config/assumptions'

/** Rough radiation dose for the planned walk, from the only surface measurements there are (Curiosity's RAD). */
export function RadiationEstimate() {
  const route = useRoute()
  if (route.order.length < 2) return null
  const msv = (RADIATION.doseEquivMsvPerDay * route.durationMin) / (24 * 60)
  const note =
    `${RADIATION.doseEquivMsvPerDay} mSv per day (galactic cosmic rays, quiet Sun) × the walk's duration. ${RADIATION.source}. ` +
    "Measured at another place (Gale crater, 1.8 km lower than Jezero) and inside a rover, so a suited walk elsewhere will differ. Solar storms are not included. There is no live space-weather feed in MAPA yet."
  return (
    <div className="plan-radiation">
      <h2 className="kicker">Radiation</h2>
      <dl className="stats">
        <Stat label="Dose on this walk" value={`≈ ${msv.toFixed(2)} mSv`} tag={<ProvenanceTag category="estimated" note={note} />} />
      </dl>
      <p className="muted plan-note">About {RADIATION.doseEquivMsvPerDay} mSv a day on the surface when the Sun is quiet (Curiosity's detector). Solar storms would add to it.</p>
    </div>
  )
}
