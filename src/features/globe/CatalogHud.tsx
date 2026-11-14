import { useMemo, useState } from 'react'
import { landingSites } from '../../data/mars'
import { moonInfo } from '../../data/marsMoons'
import { moonPeriodDays, type MoonId } from '../../data/marsSky'
import { ORBITERS, type OrbiterId } from '../../data/orbiters'
import { Icon } from '../../components/Icon'
import { SearchBox } from '../../components/SearchBox'

/* The globe's catalog of Mars, its moons, orbiters and landing sites (from MapaMars). */

type Kind = 'planet' | 'moon' | 'orbiter' | 'site'
type Entry = { id: string; kind: Kind; name: string; detail: string; tag?: string; tagClass?: string; search: string }

const FILTERS: { id: 'all' | 'bodies' | 'orbiters' | 'sites'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'bodies', label: 'Mars & moons' },
  { id: 'orbiters', label: 'Orbiters' },
  { id: 'sites', label: 'Landing sites' },
]
type Filter = (typeof FILTERS)[number]['id']
const KINDS_SHOWN: Record<Filter, Kind[]> = {
  all: ['planet', 'moon', 'orbiter', 'site'],
  bodies: ['planet', 'moon'],
  orbiters: ['orbiter'],
  sites: ['site'],
}

const STATUS_TAG = { ACTIVE: 'Active', RETIRED: 'Retired', ENDED: 'Ended' }

/** "7 h 39 min" */
const formatPeriod = (days: number) => {
  const min = Math.round(days * 24 * 60)
  return `${Math.floor(min / 60)} h ${min % 60} min`
}

const MOON_IDS: MoonId[] = ['phobos', 'deimos']

// Everything in the catalog, in the order it's listed: the planet, its moons, the spacecraft orbiting it, then the
// landing sites, newest first
const ENTRIES: Entry[] = [
  { id: 'mars', kind: 'planet', name: 'Mars', detail: '6,779 km across · a sol is 24 h 37 min', search: 'mars planet red' },
  ...MOON_IDS.map((id): Entry => {
    const m = moonInfo[id]
    return { id, kind: 'moon', name: m.name, detail: `${m.size} · orbit ${formatPeriod(moonPeriodDays(id))}`, search: `${m.name} ${m.designation} moon` }
  }),
  ...ORBITERS.map((o): Entry => ({
    id: o.id,
    kind: 'orbiter',
    name: o.name,
    detail: `${o.agency} · at Mars since ${o.arrived}`,
    tag: 'Active',
    tagClass: 'is-active',
    search: `${o.name} ${o.short} ${o.agency} orbiter spacecraft`,
  })),
  ...[...landingSites]
    .sort((a, b) => b.landed - a.landed)
    .map((s): Entry => ({
      id: s.id,
      kind: 'site',
      name: s.mission,
      detail: `${s.location} · landed ${s.landed}`,
      tag: STATUS_TAG[s.status],
      tagClass: s.status === 'ACTIVE' ? 'is-active' : '',
      search: `${s.mission} ${s.location} ${s.landed} ${STATUS_TAG[s.status]} landing site`,
    })),
]

const GROUPS: { kind: Kind; label: string }[] = [
  { kind: 'planet', label: 'Planet' },
  { kind: 'moon', label: 'Moons' },
  { kind: 'orbiter', label: 'Orbiters' },
  { kind: 'site', label: 'Landing sites' },
]

type Props = {
  open: boolean
  onToggleOpen: () => void
  /** The landing site or moon whose card is showing, to highlight it */
  selectedId: string | null
  onPlanet: () => void
  onMoon: (id: MoonId) => void
  onOrbiter: (id: OrbiterId) => void
  onSite: (id: string) => void
}

/**
 * Top left, under the live time: the Catalog button, which slides a list of Mars, its moons, the spacecraft
 * orbiting it and every landing site in from the left edge, narrowed by type and a search. Picking one flies
 * to it and opens its card.
 */
export function CatalogHud({ open, onToggleOpen, selectedId, onPlanet, onMoon, onOrbiter, onSite }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ENTRIES.filter((e) => KINDS_SHOWN[filter].includes(e.kind) && (!q || e.search.toLowerCase().includes(q)))
  }, [filter, query])

  const pick = (e: Entry) => {
    if (e.kind === 'planet') onPlanet()
    else if (e.kind === 'moon') onMoon(e.id as MoonId)
    else if (e.kind === 'orbiter') onOrbiter(e.id as OrbiterId)
    else onSite(e.id)
  }

  return (
    <div className="catalog-hud">
      <button type="button" className={`catalog-link${open ? ' is-open' : ''}`} onClick={onToggleOpen} aria-expanded={open} aria-controls="catalog-panel">
        <Icon name="list" /> Catalog
      </button>
      {/* Stays in place while closed, so it can slide back out of view instead of vanishing */}
      <section id="catalog-panel" className={`missions-panel catalog-panel${open ? ' is-open' : ''}`} aria-label="Mars, its moons, orbiters and landing sites" inert={!open}>
        <div className="missions-panel-head">
          <span>Catalog</span>
          <span className="missions-count">{shown.length}</span>
        </div>
        <div className="hud-filter">
          <div className="hud-chips" role="group" aria-label="Show">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" className={filter === f.id ? 'is-on' : ''} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
          <SearchBox value={query} onChange={setQuery} label="Search the catalog" />
        </div>
        <div className="missions-panel-body">
          {shown.length === 0 && <p className="muted">Nothing matches “{query.trim()}”.</p>}
          {GROUPS.map((g) => {
            const items = shown.filter((e) => e.kind === g.kind)
            if (items.length === 0) return null
            return (
              <div key={g.kind} className="catalog-group">
                <p className="catalog-group-head">{g.label}</p>
                <ul>
                  {items.map((e) => (
                    <li key={e.id}>
                      <button type="button" className={e.id === selectedId ? 'is-selected' : ''} aria-current={e.id === selectedId || undefined} onClick={() => pick(e)}>
                        <span className="missions-item-name">
                          {e.name}
                          {e.tag && <span className={`catalog-tag ${e.tagClass ?? ''}`}>{e.tag}</span>}
                        </span>
                        <span className="muted">{e.detail}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
