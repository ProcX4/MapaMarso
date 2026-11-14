import { useEffect, useId, useMemo, useState } from 'react'
import { loadGazetteer, searchPlaces, zoomFor, type Place } from '../../data/gazetteer'
import { formatKm } from '../../lib/format'
import { flyTo } from '../../map/mapControl'
import { useMarswalk } from '../../hooks/useMarswalk'
import { cleanText } from '../../lib/validate'
import { Icon } from '../../components/Icon'

/** Place-name search over the IAU gazetteer of Mars → fly there and open the site card. */
export function Search() {
  const { dispatch } = useMarswalk()
  const [q, setQ] = useState('')
  const [places, setPlaces] = useState<Place[]>([])
  const [failed, setFailed] = useState(false)
  const listId = useId()
  const query = cleanText(q, 60)
  const hits = useMemo(() => searchPlaces(places, query), [places, query])

  // The names load when you start typing, not with the page
  useEffect(() => {
    if (!query || places.length) return
    let live = true
    loadGazetteer().then((p) => live && (setPlaces(p), setFailed(false)), () => live && setFailed(true))
    return () => { live = false }
  }, [query, places.length])

  return (
    <div className="explore-search">
      <label className="hud-search">
        <Icon name="search" size={15} />
        <span className="visually-hidden">Search place names</span>
        <input
          type="search"
          placeholder="Search places"
          value={q}
          maxLength={60}
          autoComplete="off"
          aria-controls={listId}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setQ('')}
        />
      </label>
      {failed && query && <p className="hud-panel is-open search-results muted" role="status">Place names could not be loaded.</p>}
      {query && !failed && places.length > 0 && hits.length === 0 && <p className="hud-panel is-open search-results muted" role="status">No place with that name.</p>}
      {hits.length > 0 && (
        <ul id={listId} className="hud-panel is-open search-results">
          {hits.map((p) => (
            <li key={`${p.name}-${p.at[0]}-${p.at[1]}`}>
              <button
                type="button"
                onClick={() => {
                  flyTo(p.at, zoomFor(p.diameterKm))
                  dispatch({ type: 'select', at: p.at })
                  setQ('')
                }}
              >
                <span>{p.name}</span>
                <small className="muted">{p.iau ? `${p.kind}${p.diameterKm ? ` · ${formatKm(p.diameterKm)} across` : ''} · IAU name` : p.kind}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
