import { lazy, Suspense, useEffect } from 'react'
import { useHash } from './hooks/useHash'
import { useMarswalk } from './hooks/useMarswalk'
import { NavMenu, type NavPage } from './components/NavMenu'
import { startSpaceSoundOnFirstGesture } from './lib/spaceSound'
import { currentAddress, mapModeOf } from './lib/missionPaths'
import type { Mode } from './state/types'
import './App.css'

const AboutPage = lazy(() => import('./features/provenance/AboutPage').then((m) => ({ default: m.AboutPage })))
const AccountPage = lazy(() => import('./features/account/AccountPage').then((m) => ({ default: m.AccountPage })))
const HomePage = lazy(() => import('./features/home/HomePage').then((m) => ({ default: m.HomePage })))
const GlobePage = lazy(() => import('./features/globe/GlobePage').then((m) => ({ default: m.GlobePage })))
const MissionsPage = lazy(() => import('./features/missions/MissionsPage').then((m) => ({ default: m.MissionsPage })))

type Page = 'about' | 'account' | 'home' | 'globe' | 'missions'
type Route = { mode: Mode; page: Page; hash: string }

function parse(hash: string): Route {
  if (hash === '#/about') return { mode: 'explore', page: 'about', hash: '#/about' }
  if (hash === '#/account') return { mode: 'explore', page: 'account', hash: '#/account' }
  // The globe, and its 2D map with MAPA's site tools (explore, plan a Marswalk, EVA)
  if (hash === '#/globe' || hash.startsWith('#/globe/')) return { mode: mapModeOf(hash), page: 'globe', hash: '#/globe' }
  if (hash === '#/missions' || hash.startsWith('#/missions/')) return { mode: 'explore', page: 'missions', hash: '#/missions' }
  // The home page, as in the idea bank (and for anything unknown)
  return { mode: 'explore', page: 'home', hash: '#/' }
}

const PAGES: NavPage[] = [
  { hash: '#/', label: 'Home', icon: 'home', hint: 'Back to the home screen' },
  { hash: '#/globe', label: 'Globe', icon: 'globe', hint: 'Mars in 3D and in 2D: NASA layers, site analysis and Marswalk planning' },
  { hash: '#/missions', label: 'Missions', icon: 'missions', hint: 'Browse missions, yours and everyone else’s' },
  { hash: '#/about', label: 'About & data', icon: 'about', hint: 'Where every layer comes from' },
]

export default function App() {
  const route = parse(useHash())
  const { state, dispatch } = useMarswalk()

  useEffect(() => {
    if (state.mode !== route.mode) dispatch({ type: 'setMode', mode: route.mode })
  }, [route.mode, state.mode, dispatch])

  // The site map's old addresses (#/explore, #/plan/CODE, #/eva) now open the 2D map: show the new one
  useEffect(() => {
    const now = currentAddress(window.location.hash)
    if (now !== window.location.hash) window.history.replaceState(null, '', now)
  }, [])

  // The ambient space sound starts with the first click or key press (browsers block sound before that)
  useEffect(startSpaceSoundOnFirstGesture, [])

  return (
    <div className={`app page-${route.page} mode-${route.mode}`}>
      <header className="nav">
        <a className="nav-brand" href="#/">MAPA MARS</a>
        <NavMenu pages={PAGES} current={route.page === 'about' || route.page === 'account' ? `#/${route.page}` : route.hash} />
      </header>

      <div className="stage">
        <Suspense fallback={<p className="stage-loading">Loading…</p>}>
          {route.page === 'about' && <AboutPage />}
          {route.page === 'account' && <AccountPage />}
          {route.page === 'home' && <HomePage />}
          {route.page === 'globe' && <GlobePage />}
          {route.page === 'missions' && <MissionsPage />}
        </Suspense>
      </div>
    </div>
  )
}
