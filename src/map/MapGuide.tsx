import { useState } from 'react'
import { useMarswalk } from '../hooks/useMarswalk'
import { useDatasets } from '../hooks/useDerived'
import { readFlag, writeFlag } from '../lib/storage'
import { flyTo } from './mapControl'

/*
 * The guide on the 2D map: clicking near a green science target opens its site card, with why it matters and
 * Perseverance's photos from there. Shown while the Science targets layer is on, until dismissed.
 */

const DISMISSED_KEY = 'mapa.guide.scienceTargets'
/** Close enough to a target to see the ground the photos show */
const SHOW_ZOOM = 15

export function MapGuide() {
  const { state, dispatch } = useMarswalk()
  const targets = useDatasets().targets.value
  const [dismissed, setDismissed] = useState(() => readFlag(DISMISSED_KEY, false))
  const layerOn = state.layers.find((l) => l.id === 'science-targets')?.visible
  if (dismissed || !layerOn || !targets?.length || state.mode === 'eva') return null

  // A target to show: the first in the list, so the button always lands somewhere with photos
  const showOne = () => {
    const t = targets[0]
    flyTo(t.at, SHOW_ZOOM)
    // Only looks: opening the site card never adds a stop, even while planning
    dispatch({ type: 'select', at: t.at })
  }
  const dismiss = () => {
    setDismissed(true)
    writeFlag(DISMISSED_KEY, true)
  }

  return (
    <aside className="map-guide" aria-label="Guide">
      <p className="map-guide-kicker">Guide</p>
      <p>
        Click near a <span className="map-guide-dot" aria-hidden /> <strong>green science target</strong> to see why it matters and
        Perseverance's photos from there.
      </p>
      <div className="map-guide-actions">
        <button type="button" className="map-guide-show" onClick={showOne}>
          Show me one
        </button>
        <button type="button" className="map-guide-dismiss" onClick={dismiss}>
          Got it
        </button>
      </div>
    </aside>
  )
}
