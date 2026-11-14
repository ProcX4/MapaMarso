import { DataSourceList } from './DataSourceList'
import { SITE } from '../../config/site'
import { SLOPE_BANDS, walkingAssumption, EVA } from '../../config/assumptions'
import { useNow } from '../../hooks/useNow'
import { AU_LIGHT_MIN, earthMarsDistanceAU, localMeanSolarTime, marsClock } from '../../data/mars'
import { daylightText, minutesToSunset, sunElevation } from '../../data/daylight'
import { formatDuration, formatHours } from '../../lib/format'
import './provenance.css'

const FEATURES = [
  { title: 'Explore the site', text: `NASA imagery, elevation, slope and science layers for ${SITE.name}, stacked on one map. Click anywhere for a site analysis.` },
  { title: 'Plan a Marswalk', text: 'Habitat to science stops and back: distance, climb, the steepest slope, hazards and nearby science targets.' },
  { title: 'Walk it in EVA mode', text: 'A high-contrast view with the next waypoint, the way home, and one alert at a time.' },
  { title: 'Trust every number', text: 'Each value says whether it is observed by NASA, derived by MAPA, or estimated from a stated assumption.' },
]

/** About / data, in the MapaMars home-page layout: hero, numbered features, "right now", then the sources. */
export function AboutPage() {
  const now = useNow()
  const { msd, mtc } = marsClock(now)
  const sun = sunElevation(SITE.center, now.getTime())
  const toSunset = minutesToSunset(SITE.center, now.getTime())
  const lightMinutes = earthMarsDistanceAU(now) * AU_LIGHT_MIN

  return (
    <main className="about">
      <section className="hero">
        <div className="hero-copy">
          <h1>How should we explore this part of Mars?</h1>
          <p>
            MAPA, the Marswalk Analysis &amp; Planning Assistant, turns NASA's separate Mars datasets into one layered map for planning a safe,
            scientifically useful walk around the habitat, then following it on foot.
          </p>
          <a className="button" href="#/globe/2d/plan">Plan a Marswalk →</a>
        </div>
      </section>

      <section className="features" aria-label="What you can do">
        {FEATURES.map((f, i) => (
          <article key={f.title} className="feature">
            <span className="feature-num">0{i + 1}</span>
            <h2>{f.title}</h2>
            <p>{f.text}</p>
          </article>
        ))}
      </section>

      <section className="now" aria-label={`Right now at ${SITE.name}`}>
        <h2>Right now at {SITE.name}</h2>
        <dl className="stats">
          <div><dt>Sol</dt><dd>{Math.floor(msd).toLocaleString('en-US')}</dd></div>
          <div><dt>Local time</dt><dd>{formatHours(localMeanSolarTime(mtc, SITE.center[0])).slice(0, 5)}</dd></div>
          <div><dt>Daylight</dt><dd>{daylightText(sun)}</dd></div>
          <div><dt>Sunset in</dt><dd>{toSunset === null ? '—' : formatDuration(toSunset)}</dd></div>
          <div><dt>Signal delay</dt><dd>~{lightMinutes.toFixed(1)} min</dd></div>
        </dl>
        <p className="note">
          Local time is local mean solar time (LMST). The Sun's position is calculated from Mars's orbit and rotation; the signal delay is an estimate.
        </p>
      </section>

      <div className="about-body">
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
          Without an account, nothing about you leaves your browser; layer toggles and the sound setting are kept in local storage. With an
          account, MAPA stores your email (private), your username (shown on missions you save) and the missions themselves. Delete a mission from
          your account page. There is no delete-account button yet: to delete your whole account, ask the team that runs this site. Deleting the
          account removes your profile, your saved missions, your crew memberships and your mission entries. EVA mode uses a simulated position;
          MAPA never asks for your device's location.
        </p>

        <h2 className="kicker">Credits</h2>
        <p className="about-text">
          NASA data used under NASA's media and data guidelines. Imagery and elevation tiles via{' '}
          <a href="https://trek.nasa.gov/mars/" target="_blank" rel="noopener noreferrer">NASA Mars Trek</a>. Design and Mars time from the team's
          MapaMars prototype. Team: TBD.
        </p>
      </div>
    </main>
  )
}
