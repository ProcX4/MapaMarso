import { DataSourceList } from './DataSourceList'
import { SITE } from '../../config/site'
import { SLOPE_BANDS, walkingAssumption, EVA } from '../../config/assumptions'
import './provenance.css'

/** About / data: what every layer is, what MAPA assumes, and what it stores. */
export function AboutPage() {
  return (
    <main className="about">
      <p className="kicker">About MAPA</p>
      <h1>Marswalk Analysis &amp; Planning Assistant</h1>
      <p className="about-lede">
        NASA's Mars datasets layered into one map for planning a safe, scientifically useful Marswalk at {SITE.name},
        then following it on foot. NASA Space Apps Challenge 2026 · Interplanetary Survival Guide: Martian Map.
      </p>

      <h2 className="kicker">How to read values</h2>
      <dl className="facts about-legend">
        <dt><span className="tag">OBSERVED</span></dt><dd>Straight from a NASA dataset</dd>
        <dt><span className="tag">DERIVED</span></dt><dd>Calculated by MAPA from NASA data</dd>
        <dt><span className="tag">ESTIMATED</span></dt><dd>Based on assumptions; hover the tag to see them</dd>
        <dt><span className="tag is-placeholder">PLACEHOLDER</span></dt><dd>Stand-in until the real dataset is chosen</dd>
      </dl>

      <h2 className="kicker">Assumptions</h2>
      <ul className="about-list">
        <li>{walkingAssumption()}.</li>
        <li>Planned EVA length {EVA.maxHours} h.</li>
        {SLOPE_BANDS.map((b) => (
          <li key={b.label}>
            Slope {b.min}–{b.max}°: {b.label}.
          </li>
        ))}
        <li>None of these are validated physiological figures. MAPA never presents them as precise.</li>
      </ul>

      <h2 className="kicker">Data sources</h2>
      <DataSourceList />

      <h2 className="kicker">Privacy</h2>
      <p className="about-text">
        This build stores nothing about you on a server. Layer toggles are kept in your browser's local storage.
        EVA mode uses a simulated position; MAPA never asks for your device's location.
      </p>

      <h2 className="kicker">Credits</h2>
      <p className="about-text">
        NASA data used under NASA's media and data guidelines. Imagery and elevation tiles via{' '}
        <a href="https://trek.nasa.gov/mars/" target="_blank" rel="noopener noreferrer">NASA Mars Trek</a>.
        Team: TBD.
      </p>
    </main>
  )
}
