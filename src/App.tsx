import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useHash } from './hooks/useHash'
import { useMarswalk } from './hooks/useMarswalk'
import { useRoute } from './hooks/useDerived'
import { MapView } from './map/MapView'
import { fitTo, flyTo } from './map/mapControl'
import { LayerPanel } from './features/explore/LayerPanel'
import { SiteCard } from './features/explore/SiteCard'
import { Search } from './features/explore/Search'
import { PlanPanel } from './features/plan/PlanPanel'
import { NavMenu, type NavPage } from './components/NavMenu'
import { LiveClock } from './components/LiveClock'
import { ToolDock, type Tool } from './components/ToolDock'
import { Tour } from './components/Tour'
import { tourSteps } from './config/tourSteps'
import { SITE } from './config/site'
import { startSpaceSoundOnFirstGesture } from './lib/spaceSound'
import type { Mode } from './state/types'
import './App.css'

const EvaView = lazy(() => import('./features/eva/EvaView').then((m) => ({ default: m.EvaView })))
const AboutPage = lazy(() => import('./features/provenance/AboutPage').then((m) => ({ default: m.AboutPage })))
const AccountPage = lazy(() => import('./features/account/AccountPage').then((m) => ({ default: m.AccountPage })))
const HomePage = lazy(() => import('./features/home/HomePage').then((m) => ({ default: m.HomePage })))
const GlobePage = lazy(() => import('./features/globe/GlobePage').then((m) => ({ default: m.GlobePage })))
const MissionsPage = lazy(() => import('./features/missions/MissionsPage').then((m) => ({ default: m.MissionsPage })))

type Page = 'map' | 'about' | 'account' | 'home' | 'globe' | 'missions'
type Route = { mode: Mode; page: Page; hash: string }

function parse(hash: string): Route {
  if (hash.startsWith('#/plan')) return { mode: 'plan', page: 'map', hash: '#/plan' }
  if (hash === '#/eva') return { mode: 'eva', page: 'map', hash: '#/eva' }
  if (hash === '#/about') return { mode: 'explore', page: 'about', hash: '#/about' }
  if (hash === '#/account') return { mode: 'explore', page: 'account', hash: '#/account' }
  if (hash === '#/home') return { mode: 'explore', page: 'home', hash: '#/home' }
  if (hash === '#/globe' || hash.startsWith('#/globe/')) return { mode: 'explore', page: 'globe', hash: '#/globe' }
  if (hash === '#/missions' || hash.startsWith('#/missions/')) return { mode: 'explore', page: 'missions', hash: '#/missions' }
  return { mode: 'explore', page: 'map', hash: '#/' }
}

const MODES: { mode: Mode; label: string; href: string }[] = [
  { mode: 'explore', label: 'Explore', href: '#/' },
  { mode: 'plan', label: 'Plan Marswalk', href: '#/plan' },
  { mode: 'eva', label: 'EVA', href: '#/eva' },
]

const PAGES: NavPage[] = [
  { hash: '#/home', label: 'Home', icon: 'home', hint: 'Back to the home screen' },
  { hash: '#/globe', label: 'Globe', icon: 'globe', hint: 'Mars in 3D, its moons, orbiters and landing sites' },
  { hash: '#/', label: 'Explore', icon: 'explore', hint: 'NASA layers and site analysis' },
  { hash: '#/plan', label: 'Plan Marswalk', icon: 'plan', hint: 'Route, profile, hazards and science stops' },
  { hash: '#/eva', label: 'EVA', icon: 'eva', hint: 'Follow the route on foot' },
  { hash: '#/missions', label: 'Missions', icon: 'missions', hint: 'Browse missions, yours and everyone else’s' },
  { hash: '#/about', label: 'About & data', icon: 'about', hint: 'Where every layer comes from' },
]

export default function App() {
  const route = parse(useHash())
  const { state, dispatch } = useMarswalk()
  const analysis = useRoute()
  const [uiHidden, setUiHidden] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const onMap = route.page === 'map'

  useEffect(() => {
    if (state.mode !== route.mode) dispatch({ type: 'setMode', mode: route.mode })
  }, [route.mode, state.mode, dispatch])

  // The ambient space sound starts with the first click or key press (browsers block sound before that)
  useEffect(startSpaceSoundOnFirstGesture, [])

  // H toggles the clear view, Esc brings the interface back (when typing, keys belong to the field)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'h' || e.key === 'H') setUiHidden((h) => !h)
      else if (e.key === 'Escape') setUiHidden(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const closeTour = useCallback(() => setTourOpen(false), [])

  const tools: Tool[] = [
    { id: 'site', label: 'Recentre on site', icon: 'target', onClick: () => flyTo(SITE.center, SITE.zoom) },
    { id: 'route', label: 'Fit route', icon: 'route', onClick: () => fitTo(analysis.order.map((s) => s.at)) },
    ...(route.mode === 'plan' ? [{ id: 'new', label: 'New route', icon: 'plan', onClick: () => dispatch({ type: 'newRoute' }) }] : []),
  ]

  return (
    <div className={`app page-${route.page} mode-${route.mode}${uiHidden && onMap ? ' is-ui-hidden' : ''}`}>
      <header className="nav">
        <a className="nav-brand" href="#/">MAPA</a>
        <nav className="mode-switch" aria-label="Mode">
          {MODES.map((m) => {
            const on = onMap && route.mode === m.mode
            return (
              <a key={m.mode} href={m.href} className={on ? 'is-on' : ''} aria-current={on ? 'page' : undefined}>
                {m.label}
              </a>
            )
          })}
        </nav>
        <NavMenu pages={PAGES} current={route.page === 'map' ? route.hash : `#/${route.page}`} />
      </header>

      {/* The map fills the window in every mode and stays mounted, so switching never resets the view. */}
      <div className="stage">
        <MapView />
        {onMap && route.mode !== 'eva' && (
          <>
            {route.mode === 'explore' && <LiveClock />}
            {route.mode === 'explore' && <Search />}
            <LayerPanel />
            {route.mode === 'plan' && <PlanPanel />}
            <SiteCard />
          </>
        )}
        {onMap && (
          <ToolDock
            open={toolsOpen}
            onToggle={() => setToolsOpen((o) => !o)}
            tools={tools}
            uiHidden={uiHidden}
            onHideUi={() => setUiHidden((h) => !h)}
            onGuide={() => {
              // The tour points at the controls, so they need to be showing
              setUiHidden(false)
              setToolsOpen(false)
              setTourOpen((o) => !o)
            }}
          />
        )}
        <Suspense fallback={<p className="stage-loading">Loading…</p>}>
          {onMap && route.mode === 'eva' && <EvaView />}
          {route.page === 'about' && <AboutPage />}
          {route.page === 'account' && <AccountPage />}
          {route.page === 'home' && <HomePage />}
          {route.page === 'globe' && <GlobePage />}
          {route.page === 'missions' && <MissionsPage />}
        </Suspense>
      </div>
      {tourOpen && onMap && <Tour key={route.mode} steps={tourSteps(route.mode)} onClose={closeTour} />}
    </div>
  )
}
