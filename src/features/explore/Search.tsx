import { useId, useState } from 'react'
import { GAZETTEER } from '../../config/site'
import { flyTo } from '../../map/mapControl'
import { useMarswalk } from '../../hooks/useMarswalk'
import { cleanText } from '../../lib/validate'

/** Place-name search over the site's gazetteer subset → fly there and open the site card. */
export function Search() {
  const { dispatch } = useMarswalk()
  const [q, setQ] = useState('')
  const listId = useId()
  const query = cleanText(q, 60).toLowerCase()
  const hits = query ? GAZETTEER.filter((p) => p.name.toLowerCase().includes(query)).slice(0, 6) : []

  return (
    <div className="explore-search">
      <label className="visually-hidden" htmlFor={`${listId}-input`}>Search place names</label>
      <input
        id={`${listId}-input`}
        className="search-input"
        type="search"
        placeholder="Search places"
        value={q}
        maxLength={60}
        autoComplete="off"
        aria-controls={listId}
        onChange={(e) => setQ(e.target.value)}
      />
      {hits.length > 0 && (
        <ul id={listId} className="panel search-results">
          {hits.map((p) => (
            <li key={p.name}>
              <button
                type="button"
                onClick={() => {
                  flyTo(p.at, 11)
                  dispatch({ type: 'select', at: p.at })
                  setQ('')
                }}
              >
                <span>{p.name}</span>
                <small className="muted">{p.note}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
