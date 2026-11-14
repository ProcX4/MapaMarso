import { lazy, Suspense, useEffect } from 'react'
import { useHash } from './hooks/useHash'
import { useMarswalk } from './hooks/useMarswalk'
import { MapView } from './map/MapView'
import { LayerPanel } from './features/explore/LayerPanel'
import { SiteCard } from './features/explore/SiteCard'
import { Search } from './features/explore/Search'
import { PlanPanel } from './features/plan/PlanPanel'
import type { Mode } from './state/types'
import './App.css'

const EvaView = lazy(() => import('./features/eva/EvaView').then((m) => ({ default: m.EvaView })))
const AboutPage = lazy(() => import('./features/provenance/AboutPage').then((m) => ({ default: m.AboutPage })))

type Route = { mode: Mode; about: boolean }

function parse(hash: string): Route {
  if (hash.startsWith('#/plan')) return { mode: 'plan', about: false }
  if (hash === '#/eva') return { mode: 'eva', about: false }
  if (hash === '#/about') return { mode: 'explore', about: true }
  return { mode: 'explore', about: false }
}

const MODES: { mode: Mode; label: string; href: string }[] = [
  { mode: 'explore', label: 'Explore', href: '#/' },
  { mode: 'plan', label: 'Plan Marswalk', href: '#/plan' },
  { mode: 'eva', label: 'EVA', href: '#/eva' },
]

export default function App() {
  const route = parse(useHash())
  const { state, dispatch } = useMarswalk()

  useEffect(() => {
    if (state.mode !== route.mode) dispatch({ type: 'setMode', mode: route.mode })
  }, [route.mode, state.mode, dispatch])

  return (
    <div className="app">
      <header className="nav">
        <a className="nav-brand" href="#/">MAPA</a>
        <nav className="nav-modes" aria-label="Mode">
          {MODES.map((m) => (
            <a key={m.mode} href={m.href} className={`chip ${!route.about && route.mode === m.mode ? 'is-on' : ''}`} aria-current={!route.about && route.mode === m.mode ? 'page' : undefined}>
              {m.label}
            </a>
          ))}
        </nav>
        <a className={`nav-menu-btn ${route.about ? 'is-on' : ''}`} href="#/about" aria-label="About and data sources" title="About and data sources">
          ☰
        </a>
      </header>

      {/* The map stays mounted in every mode, so switching never resets the view or reloads tiles. */}
      <div className={`stage mode-${route.mode}`}>
        <MapView />
        {route.mode !== 'eva' && !route.about && (
          <>
            <LayerPanel />
            {route.mode === 'explore' && <Search />}
            {route.mode === 'plan' && <PlanPanel />}
            <SiteCard />
          </>
        )}
        <Suspense fallback={<p className="stage-loading">Loading…</p>}>
          {route.mode === 'eva' && !route.about && <EvaView />}
          {route.about && <AboutPage />}
        </Suspense>
      </div>
    </div>
  )
}
