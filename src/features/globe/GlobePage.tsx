import { memo, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { loadVikingLander, VIKING_MODEL_CREDIT } from '../../globe/landerModel'
import { MarsGlobe, type GlobeLayers, type GlobeMarker, type GlobeRoute } from '../../globe/MarsGlobe'
import { MARS_MODEL_CREDIT } from '../../globe/marsModel'
import { MOON_SHAPE_CREDIT } from '../../globe/moonModel'
import { SKY_CREDIT } from '../../globe/skyObjects'
import { SiteTerrain } from '../../globe/SiteTerrain'
import { prepareSiteScene } from '../../globe/siteSceneBuild'
import { landingSites, localMeanSolarTime, marsClock } from '../../data/mars'
import { formatHours, formatLat, formatLon, formatPhTime } from '../../lib/format'
import { daysSinceJ2000, planetFromMars, siteSkyMatrix, SOL_S, sunLocalDirection, type MoonId } from '../../data/marsSky'
import { moonsFromHorizons } from '../../data/moonEphemeris'
import { siteScenes } from '../../data/siteScenes'
import { useHash } from '../../hooks/useHash'
import { useNow } from '../../hooks/useNow'
import { useMissions } from '../../hooks/useMissions'
import { formatAhead } from '../../data/daylight'
import { viewFor } from '../../globe/mapView'
import { routeStops } from '../../globe/missionRoute'
import { readFlag, writeFlag } from '../../lib/storage'
import type { MissionStatus } from '../../services/missions'
import { clearWarpArrival, isWarpArrival } from '../../lib/warp'
import { byOwner, GLOBE_2D, GLOBE_3D, GLOBE_PLAN, go, MAP_EVA, MAP_PLAN, mapModeOf, type OwnerFilter } from '../../lib/missionPaths'
import { MapView } from '../../map/MapView'
import { fitTo, flyTo, showArea } from '../../map/mapControl'
import type { PlanetRoute as MapRoute } from '../../map/planetLayers'
import { useMarswalk } from '../../hooks/useMarswalk'
import { useRoute } from '../../hooks/useDerived'
import { useMissionPath } from '../../hooks/useSafePath'
import type { LngLat } from '../../state/types'
import { SITE } from '../../config/site'
import { LayerPanel, LayersButton } from '../explore/LayerPanel'
import { SiteCard } from '../explore/SiteCard'
import { Search } from '../explore/Search'
import { PlanPanel } from '../plan/PlanPanel'
import { EvaView } from '../eva/EvaView'
import { ElevationProfile } from '../plan/ElevationProfile'
import { MissionPanel } from '../missions/MissionView'
import { CatalogHud } from './CatalogHud'
import { LandingSiteCard, MoonCard, TimeBar, ViewSwitch } from './GlobeOverlay'
import { MissionCard, MissionsHud } from './MissionsHud'
import { OrbiterCard } from './OrbiterCard'
import type { OrbiterId } from '../../data/orbiters'
import { Icon } from '../../components/Icon'
import { LiveClock } from '../../components/LiveClock'
import { ToolDock, type Tool } from '../../components/ToolDock'
import { Tour } from '../../components/Tour'
import { globeTourSteps, tourSteps } from '../../config/tourSteps'
import './globe.css'

/*
 * The 3D globe and the 2D map of the whole planet (from MapaMars pages/GlobePage.tsx). The 2D map is MAPA's
 * NASA map: its layers, site analysis, the Marswalk planner and EVA all work on it, alongside the missions,
 * catalog and day/night playback (the site map is no longer a tab of its own).
 */

const Globe = memo(MarsGlobe)

// The globe's dive toward a landing site, then the cross-fade to its close-up (see .site-layer in globe.css)
const DIVE_MS = 1300
const FADE_MS = 800

// Lighting choices for a landing-site close-up: the real Sun right now, or a fixed day or night sky
type SiteLight = 'live' | 'day' | 'night'
const SITE_LIGHTS: { id: SiteLight; label: string; icon: 'live' | 'sun' | 'moon'; title: string }[] = [
  { id: 'live', label: 'Live', icon: 'live', title: 'Where the Sun really is at the site right now' },
  { id: 'day', label: 'Day', icon: 'sun', title: 'Mid-morning sunlight, with long shadows' },
  { id: 'night', label: 'Night', icon: 'moon', title: 'After dark' },
]
const unit = (east: number, north: number, up: number) => {
  const l = Math.hypot(east, north, up)
  return { east: east / l, north: north / l, up: up / l }
}
const DAY_SUN = unit(0.72, -0.35, 0.6) // east-southeast, about 37° up
const NIGHT_SUN = unit(-0.6, 0.3, -0.74) // well below the horizon

// The time-lapse looks up to one sol (a Mars day) ahead, and loops round it
const SOL_H = SOL_S / 3600
// Playback speed, in hours per second: a whole sol in about 25 s
const PLAY_RATE = 1
// How often the time-lapse moves the page on; the globe fills in the frames between
const PLAY_TICK_MS = 200

const siteMarkers: GlobeMarker[] = landingSites.map((s) => ({
  id: s.id,
  label: s.mission,
  lat: s.lat,
  lon: s.lon,
  variant: s.status === 'ACTIVE' ? 'filled' : undefined,
}))

// Missions share the globe's marker selection with the landing sites, told apart by this prefix.
// A mission's stops add '#' and the stop, e.g. 'mission:<id>#2', and select the mission.
const MISSION_PREFIX = 'mission:'

// Whether each side panel was left open, remembered between visits
const MISSIONS_OPEN_KEY = 'mapa.globe.missionsOpen'
const CATALOG_OPEN_KEY = 'mapa.globe.catalogOpen'
// On a phone the two side panels would cover each other, and the globe: only one opens at a time
const narrow = () => window.matchMedia('(max-width: 720px)').matches

export function GlobePage() {
  const { user } = useAuth()
  const hash = useHash()
  // Adding a mission (the + button, #/globe/new) is planning a new route: the same planner as Plan Marswalk
  const newMission = hash === GLOBE_PLAN
  const flat = hash.startsWith(GLOBE_2D) || newMission
  // The 2D map's tools: site analysis (explore), the Marswalk planner or EVA
  const mapMode = newMission ? 'plan' : flat ? mapModeOf(hash) : 'explore'
  const exploring = mapMode === 'explore'
  const { state: walk, dispatch } = useMarswalk()
  useEffect(() => {
    if (!newMission) return
    dispatch({ type: 'newRoute' })
    window.location.replace(MAP_PLAN)
  }, [newMission, dispatch])
  const walkRoute = useRoute()
  // The NASA layers list shares the top right with the missions list on the 2D map: one opens at a time
  const [layersOpen, setLayersOpen] = useState(false)
  // How far ahead of now the globe and flat map show day and night, in hours (0 = live), and the time-lapse
  const [aheadH, setAheadH] = useState(0)
  // Hours of Mars time per second of playback: 0 paused, or PLAY_RATE
  const [rate, setRate] = useState(0)
  const now = useNow()
  const nowMs = now.getTime()
  // The moment shown: live (to the minute), or ahead on the time-lapse
  const nightAt = Math.floor(nowMs / 60_000) * 60_000 + aheadH * 3_600_000
  const atLabel = aheadH > 0 ? `${formatAhead(aheadH)} (${formatPhTime(nightAt)})` : undefined
  // Mars time at that moment, for a landing-site close-up's local time
  const shownMtc = marsClock(new Date(nightAt)).mtc
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [moonId, setMoonId] = useState<MoonId | null>(null)
  const [orbiterId, setOrbiterId] = useState<OrbiterId | null>(null)
  // Orbiters start hidden so the planet itself is the first thing seen; the Orbiters tool shows them
  const [layers, setLayers] = useState<GlobeLayers>({ labels: true, orbits: true, grid: true, terminator: false, orbiters: false, moons: true })
  const [resetKey, setResetKey] = useState(0)
  const [toolsOpen, setToolsOpen] = useState(false)
  // Every panel cleared off the screen for an unobstructed view (the button at the bottom left, or H)
  const [uiHidden, setUiHidden] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const [arriving] = useState(isWarpArrival)
  // After the hyperspace jump, the controls wait until the camera has glided in to Mars
  const [landed, setLanded] = useState(!arriving)
  // 'site' shows a close-up 3D scene of the selected landing site over the (paused) globe
  const [view, setView] = useState<'globe' | 'site'>('globe')
  const [poiId, setPoiId] = useState<string | null>(null)
  const [siteLayers, setSiteLayers] = useState({ labels: true, rotate: false })
  const [siteLight, setSiteLight] = useState<SiteLight>('live')
  // Into a landing-site close-up and back out again:
  // 1. preparing: the site's terrain is generated while nothing is moving (a brief, unseen pause)
  // 2. diving: the globe camera dives toward the site, while the close-up is set up out of sight (siteMounted)
  // 3. view 'site': once the dive is done and the close-up is ready (siteReady), it fades in over the globe,
  //    and after that (siteShown) the globe pauses underneath
  // 4. back: the close-up fades out (leavingSite) while the globe zooms back out from where the dive stopped
  const [preparing, setPreparing] = useState(false)
  const [diving, setDiving] = useState(false)
  const [siteMounted, setSiteMounted] = useState(false)
  const [siteReady, setSiteReady] = useState(false)
  const [siteShown, setSiteShown] = useState(false)
  const [leavingSite, setLeavingSite] = useState(false)
  const [zoomOut, setZoomOut] = useState<{ lat: number; lon: number } | null>(null)
  const siteVisible = view === 'site' && siteReady

  // The side panels: the catalog of Mars, its moons and landing sites on the left, the missions on the right
  const [catalogOpen, setCatalogOpen] = useState(() => readFlag(CATALOG_OPEN_KEY, false))
  const [missionsOpen, setMissionsOpen] = useState(() => readFlag(MISSIONS_OPEN_KEY, !narrow()))
  const toggleCatalog = () => {
    const open = !catalogOpen
    setCatalogOpen(open)
    writeFlag(CATALOG_OPEN_KEY, open)
    if (open && narrow()) setMissionsOpen(false)
  }
  const toggleMissions = () => {
    const open = !missionsOpen
    setMissionsOpen(open)
    writeFlag(MISSIONS_OPEN_KEY, open)
    if (open) setLayersOpen(false)
    if (open && narrow()) setCatalogOpen(false)
  }
  // The site card (a point picked on the 2D map) takes the same corner as the globe's cards
  const clearSiteCard = () => dispatch({ type: 'select', at: null })
  const layersShown = layersOpen && !walk.selected

  // Missions, on the globe and the flat map alike: ongoing ones unless the list is switched to completed,
  // narrowed by whose they are and by its search. What the list shows is what the globe and map show.
  const [missionStatus, setMissionStatus] = useState<MissionStatus>('open')
  const [missionOwner, setMissionOwner] = useState<OwnerFilter>('all')
  const [missionQuery, setMissionQuery] = useState('')
  const missions = useMissions(missionStatus)
  const userId = user?.id ?? null
  const missionList = useMemo(() => {
    if (!missions.list) return missions.list
    // Yours: you lead it, or you joined it (only its lead and crew get a mission's code)
    // 'Mine' needs an account: signed out, show everyone's instead
    const owner = !userId && missionOwner === 'mine' ? 'all' : missionOwner
    const owned = byOwner(missions.list, owner, (m) => !!userId && (m.ownerId === userId || !!m.code))
    const q = missionQuery.trim().toLowerCase()
    if (!q) return owned
    return owned.filter((m) => [m.name, m.code ?? '', m.commander, m.startName, m.target, ...m.phases.map((p) => p.name)].some((t) => t.toLowerCase().includes(q)))
  }, [missions.list, missionOwner, missionQuery, userId])
  // Every route drawn at once (the All routes tool), or, to keep a busy planet readable, just the picked one
  const [allRoutes, setAllRoutes] = useState(false)
  // Each mission is one green diamond where it starts. Its numbered stops, the flag at its finish (a round trip
  // finishes back at its start) and the route joining them show only once it's picked, or with the All routes
  // tool: with many missions, drawing every route at once would bury the planet.
  const { markers, routes, mapRoutes, fullMapRoutes } = useMemo(() => {
    const list = missionList ?? []
    const markers: GlobeMarker[] = [...siteMarkers]
    const routes: GlobeRoute[] = []
    const mapRoutes: MapRoute[] = []
    const fullMapRoutes = new Map<string, MapRoute>()
    for (const m of list) {
      const id = MISSION_PREFIX + m.id
      const round = m.tripType === 'round'
      const start = { name: m.startName, lat: m.startLat, lon: m.startLon }
      const full: MapRoute = {
        key: id,
        closed: round,
        points: [
          { ...start, key: 'start', badge: '', label: m.name, variant: 'start' },
          ...m.phases.map((p, i) => ({ name: p.name, lat: p.lat, lon: p.lon, key: `p${i}`, badge: String(i + 1), label: p.name, variant: 'phase' as const })),
          ...(round ? [] : [{ lat: m.lat, lon: m.lon, key: 'end', badge: '', label: m.target, variant: 'finish' as const }]),
        ],
      }
      fullMapRoutes.set(id, full)
      markers.push({ id, label: m.name, lat: m.startLat, lon: m.startLon, variant: 'mission' })
      if (!allRoutes && id !== selectedId) {
        mapRoutes.push({ key: id, points: full.points.slice(0, 1) })
        continue
      }
      m.phases.forEach((p, i) => markers.push({ id: `${id}#${i + 1}`, group: id, label: p.name, lat: p.lat, lon: p.lon, variant: 'phase', badge: String(i + 1) }))
      if (!round) markers.push({ id: `${id}#end`, group: id, label: m.target, lat: m.lat, lon: m.lon, variant: 'finish' })
      routes.push({ id, points: routeStops(start, m.phases, { name: m.target, lat: m.lat, lon: m.lon }, round) })
      mapRoutes.push(full)
    }
    return { markers, routes, mapRoutes, fullMapRoutes }
  }, [missionList, selectedId, allRoutes])

  // A picked mission's route is walked by its A* safe path, round steep and deep ground (the Topographic layers)
  const missionPoints = useMemo(() => {
    const r = selectedId ? fullMapRoutes.get(selectedId) : undefined
    if (!r || r.points.length < 2) return null
    const pts = r.points.map((p): LngLat => [p.lon, p.lat])
    return r.closed ? [...pts, pts[0]] : pts
  }, [selectedId, fullMapRoutes])
  const { safe: missionSafe, line: safeLine, note: pathNote } = useMissionPath(missionPoints)

  // On the 2D map a picked landing site shows as a marker too
  const siteRoutes = useMemo(() => {
    const withPath = safeLine ? mapRoutes.map((r) => (r.key === selectedId ? { ...r, path: safeLine } : r)) : mapRoutes
    const s = landingSites.find((l) => l.id === selectedId)
    if (!s) return withPath
    return [...withPath, { key: s.id, points: [{ key: s.id, lat: s.lat, lon: s.lon, badge: '', label: s.mission, variant: 'end' as const }] }]
  }, [mapRoutes, selectedId, safeLine])
  const globeRoutes = useMemo(
    () => (safeLine ? routes.map((r) => (r.id === selectedId ? { ...r, points: safeLine.map(([lon, lat]) => ({ lat, lon })) } : r)) : routes),
    [routes, selectedId, safeLine],
  )

  useEffect(() => {
    if (!preparing) return
    const scene = selectedId ? siteScenes[selectedId] : undefined
    // Wait two frames so "Descending…" is on screen before the pause
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => {
        if (scene) prepareSiteScene(scene)
        setPreparing(false)
        setSiteMounted(true)
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setView('site')
        else setDiving(true)
      })
    })
    return () => cancelAnimationFrame(id)
  }, [preparing, selectedId])

  useEffect(() => {
    if (!diving) return
    const id = setTimeout(() => setView('site'), DIVE_MS)
    return () => clearTimeout(id)
  }, [diving])

  useEffect(() => {
    if (!siteVisible || siteShown) return
    const id = setTimeout(() => {
      setSiteShown(true)
      setDiving(false)
    }, FADE_MS)
    return () => clearTimeout(id)
  }, [siteVisible, siteShown])

  useEffect(() => {
    if (!leavingSite) return
    const id = setTimeout(() => {
      setLeavingSite(false)
      setSiteMounted(false)
      setSiteReady(false)
    }, FADE_MS)
    return () => clearTimeout(id)
  }, [leavingSite])

  useEffect(clearWarpArrival, [])

  // Playback: step a few times a second, forward round and round the sol
  useEffect(() => {
    if (rate === 0) return
    const id = setInterval(() => {
      setAheadH((h) => {
        const next = h + (rate * PLAY_TICK_MS) / 1000
        if (next > 0) return next % SOL_H
        setRate(0)
        return 0
      })
    }, PLAY_TICK_MS)
    return () => clearInterval(id)
  }, [rate])
  const backToNow = () => {
    setRate(0)
    setAheadH(0)
  }

  // Safety net: bring in the controls anyway if the globe never gets to land (for example, no WebGL)
  useEffect(() => {
    if (landed) return
    const id = setTimeout(() => setLanded(true), 8000)
    return () => clearTimeout(id)
  }, [landed])

  const site = landingSites.find((s) => s.id === selectedId)
  const mission = selectedId?.startsWith(MISSION_PREFIX) ? missionList?.find((m) => MISSION_PREFIX + m.id === selectedId) : undefined
  const scene = site ? siteScenes[site.id] : undefined
  const inSite = view === 'site' && !!scene
  // Where the Sun is over the site right now, so the close-up's shadows fall as they really would
  const siteSun = site ? sunLocalDirection(site.lat, site.lon, nightAt) : null
  const siteSunElevation = siteSun ? (Math.asin(siteSun.up) * 180) / Math.PI : 0
  const shownSun = siteLight === 'day' ? DAY_SUN : siteLight === 'night' ? NIGHT_SUN : siteSun
  // The real sky over the site at the time shown (stars turning, Earth as the evening star), whatever the light setting
  const skyMs = nowMs + aheadH * 3_600_000
  const siteSky = site ? { matrix: siteSkyMatrix(site.lat, site.lon, skyMs), earth: planetFromMars('earth', daysSinceJ2000(skyMs)).dir } : null

  // Drop any close-up at once (for jumping straight to something else)
  const resetSite = () => {
    setView('globe')
    setPoiId(null)
    setPreparing(false)
    setDiving(false)
    setSiteMounted(false)
    setSiteReady(false)
    setSiteShown(false)
  }
  const select = (id: string) => {
    // A mission's stop selects the whole mission
    const key = id.startsWith(MISSION_PREFIX) ? id.split('#')[0] : id
    resetSite()
    setSelectedId(key)
    setMoonId(null)
    setOrbiterId(null)
    // Fetch the lander model now, so it's there by the time the close-up opens
    if (siteScenes[key]) void loadVikingLander().catch(() => {})
    clearSiteCard()
    // On the flat map, bring the whole route into view
    const route = fullMapRoutes.get(key)
    if (flat && route) showArea(viewFor(route.points))
  }
  const setFlat = (on: boolean) => {
    if (on) resetSite()
    go(on ? GLOBE_2D : GLOBE_3D)
  }
  const selectMoon = (id: MoonId) => {
    resetSite()
    clearSiteCard()
    setMoonId(id)
    setSelectedId(null)
    setOrbiterId(null)
  }
  // An orbiter opens its card, with its 3D model; the globe view stays where it is
  const selectOrbiter = (id: OrbiterId) => {
    resetSite()
    clearSiteCard()
    setOrbiterId(id)
    setSelectedId(null)
    setMoonId(null)
  }
  const closeCard = () => {
    resetSite()
    setSelectedId(null)
    setMoonId(null)
    setOrbiterId(null)
  }
  // From the catalog: the whole planet, a moon (on the globe; the flat map has no moons) or a landing site
  const pickPlanet = () => {
    closeCard()
    clearSiteCard()
    if (flat) showArea({ lat: 0, lon: 0, span: 360 })
    else setResetKey((k) => k + 1)
    if (narrow()) setCatalogOpen(false)
  }
  const pickMoon = (id: MoonId) => {
    if (flat) setFlat(false)
    selectMoon(id)
    if (narrow()) setCatalogOpen(false)
  }
  // Orbiters are on the globe only (the flat map has none)
  const pickOrbiter = (id: OrbiterId) => {
    if (flat) setFlat(false)
    selectOrbiter(id)
    if (narrow()) setCatalogOpen(false)
  }
  const pickSite = (id: string) => {
    select(id)
    const s = landingSites.find((l) => l.id === id)
    if (flat && s) showArea({ lat: s.lat, lon: s.lon, span: 30 })
    if (narrow()) setCatalogOpen(false)
  }
  const toggleLayers = () => {
    if (layersShown) return setLayersOpen(false)
    clearSiteCard()
    closeCard()
    setLayersOpen(true)
    setMissionsOpen(false)
    if (narrow()) setCatalogOpen(false)
  }
  const toggleLayer = (key: keyof GlobeLayers) => setLayers((l) => ({ ...l, [key]: !l[key] }))
  const toggleSiteLayer = (key: 'labels' | 'rotate') => setSiteLayers((l) => ({ ...l, [key]: !l[key] }))
  const togglePoi = (id: string) => setPoiId((current) => (current === id ? null : id))
  const openSite = () => {
    setPoiId(null)
    setSiteShown(false)
    setPreparing(true)
  }
  const closeSite = () => {
    setPoiId(null)
    setView('globe')
    setSiteShown(false)
    setDiving(false)
    setLeavingSite(true)
    // A new object each time, so the globe flies out even when returning from the same site again
    if (site) setZoomOut({ lat: site.lat, lon: site.lon })
  }

  // Esc closes whatever is open: the tour or a hidden interface first, then the close-up or info card,
  // then the tools. H hides or brings back the interface. Re-registered every render so it always acts on
  // the current selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable]')
      if ((e.key === 'h' || e.key === 'H') && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setUiHidden((h) => !h)
        return
      }
      if (e.key !== 'Escape') return
      if (tourOpen) setTourOpen(false)
      else if (uiHidden) setUiHidden(false)
      else if (selectedId || moonId || orbiterId) {
        if (inSite) closeSite()
        else closeCard()
      } else if (walk.selected) clearSiteCard()
      else setToolsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const globeTools: Tool[] = [
    { id: 'labels', label: 'Labels', icon: 'labels', on: layers.labels, onClick: () => toggleLayer('labels') },
    { id: 'orbits', label: 'Orbits', icon: 'orbits', on: layers.orbits, onClick: () => toggleLayer('orbits') },
    { id: 'moons', label: 'Moons', icon: 'moon', on: layers.moons, onClick: () => toggleLayer('moons') },
    { id: 'orbiters', label: 'Orbiters', icon: 'orbiter', on: layers.orbiters, onClick: () => toggleLayer('orbiters') },
    { id: 'grid', label: 'Grid', icon: 'grid', on: layers.grid, onClick: () => toggleLayer('grid') },
    { id: 'routes', label: 'All routes', icon: 'route', on: allRoutes, onClick: () => setAllRoutes((a) => !a) },
    {
      id: 'reset',
      label: 'Reset view',
      icon: 'reset',
      onClick: () => {
        closeCard()
        setResetKey((k) => k + 1)
      },
    },
  ]
  // The 2D map: the missions' routes, then MAPA's site tools (the planner and EVA open over the same map)
  const mapTools: Tool[] = [
    ...(exploring ? [{ id: 'routes', label: 'All routes', icon: 'route' as const, on: allRoutes, onClick: () => setAllRoutes((a) => !a) }] : []),
    { id: 'plan', label: 'Plan Marswalk', icon: 'plan', on: mapMode === 'plan', onClick: () => go(mapMode === 'plan' ? GLOBE_2D : MAP_PLAN) },
    { id: 'eva', label: 'EVA', icon: 'eva', on: mapMode === 'eva', onClick: () => go(mapMode === 'eva' ? GLOBE_2D : MAP_EVA) },
    { id: 'site', label: 'Recentre on site', icon: 'target', onClick: () => flyTo(SITE.center, SITE.zoom) },
    { id: 'fit', label: 'Fit route', icon: 'reset', onClick: () => fitTo(walkRoute.order.map((s) => s.at)) },
    ...(mapMode === 'plan' ? [{ id: 'new', label: 'New route', icon: 'plus' as const, onClick: () => dispatch({ type: 'newRoute' }) }] : []),
  ]
  const siteTools: Tool[] = [
    { id: 'back', label: 'Back to globe', icon: 'back', onClick: closeSite },
    { id: 'labels', label: 'Labels', icon: 'labels', on: siteLayers.labels, onClick: () => toggleSiteLayer('labels') },
    { id: 'rotate', label: 'Rotate', icon: 'rotate', on: siteLayers.rotate, onClick: () => toggleSiteLayer('rotate') },
  ]

  return (
    <main className={`globe-page${arriving ? ' is-arriving' : ''}${landed ? ' is-landed' : ''}${uiHidden ? ' is-ui-hidden' : ''}`}>
      {/* Hidden (and paused) under the flat map, so switching back is instant */}
      <div className={`globe-frame${flat ? ' is-hidden' : ''}`} aria-hidden={flat}>
        {/* The globe stays loaded under the close-up (paused), ready to zoom back out */}
        <Globe
          sites={markers}
          routes={globeRoutes}
          selectedId={selectedId}
          layers={layers}
          onSelect={select}
          onPick={closeCard}
          dive={diving}
          focus={zoomOut}
          paused={siteShown || flat}
          selectedMoon={moonId}
          onSelectMoon={selectMoon}
          selectedOrbiter={orbiterId}
          onSelectOrbiter={selectOrbiter}
          intro={arriving}
          onIntroDone={() => setLanded(true)}
          resetKey={resetKey}
          clock={{ offsetMs: aheadH * 3_600_000, rate: rate * 3600 }}
        />
        {siteMounted && site && scene && (
          <div className={`site-layer${leavingSite ? ' is-leaving' : siteVisible ? ' is-visible' : ''}`} aria-hidden={!siteVisible}>
            <SiteTerrain
              site={scene}
              selectedPoi={poiId}
              labels={siteLayers.labels}
              rotate={siteLayers.rotate}
              onSelectPoi={togglePoi}
              sun={shownSun}
              sky={siteSky}
              active={view === 'site'}
              onReady={() => setSiteReady(true)}
            />
            {siteVisible && (
              <div className="site-header">
                <button type="button" className="site-back" onClick={closeSite}>
                  <Icon name="back" /> Back to globe
                </button>
                <p className="terrain-caption">
                  <span>
                    {site.mission} · {site.location}
                  </span>
                  <span className="muted">
                    {formatLat(site.lat)} {formatLon(site.lon)} · local time {formatHours(localMeanSolarTime(shownMtc, site.lon)).slice(0, 5)}
                    {aheadH > 0 && ` (${formatAhead(aheadH)})`} ·{' '}
                    {siteLight === 'day'
                      ? 'showing daytime'
                      : siteLight === 'night'
                        ? 'showing night-time'
                        : siteSunElevation >= 0
                          ? `Sun ${Math.round(siteSunElevation)}° up`
                          : // Mars's dusty sky keeps glowing until the Sun is about 10° down (see skyLightShare in SiteTerrain)
                            `${siteSunElevation > -10 ? 'twilight' : 'night'}, Sun ${Math.round(-siteSunElevation)}° below the horizon`}
                  </span>
                </p>
                <div className="light-switch" role="group" aria-label="Lighting">
                  {SITE_LIGHTS.map((l) => (
                    <button key={l.id} type="button" className={siteLight === l.id ? 'is-on' : ''} aria-pressed={siteLight === l.id} title={l.title} onClick={() => setSiteLight(l.id)}>
                      <Icon name={l.icon} /> {l.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {flat && (
        <div className={`flat-view is-${mapMode}`}>
          <MapView routes={siteRoutes} selectedRoute={mission ? selectedId : null} onSelectRoute={select} onPick={closeCard} sunAt={mapMode === 'eva' && walk.evaTimeMs !== null ? walk.evaTimeMs : nightAt} missionPath={safeLine ? missionSafe.value : null} />
        </div>
      )}

      {/* MAPA's tools on the 2D map: the NASA layers and site analysis while exploring, the planner, or EVA */}
      {landed && flat && (
        <>
          {exploring && <LayerPanel button={false} open={layersShown} onOpenChange={setLayersOpen} blocked={!!(site || mission || moonId)} missionPath={missionSafe} />}
          {exploring && <Search />}
          {mapMode === 'plan' && <LayerPanel />}
          {mapMode === 'plan' && <PlanPanel />}
          {/* A saved mission: the planner's map and layers, with its summary, crew and log in place of the steps */}
          {mapMode === 'mission' && <LayerPanel />}
          {mapMode === 'mission' && <MissionPanel />}
          {mapMode === 'mission' && (
            <section className="plan-bottom" aria-label="Elevation profile">
              <ElevationProfile />
            </section>
          )}
          {mapMode !== 'eva' && !site && !mission && !moonId && <SiteCard />}
          {mapMode === 'eva' && <EvaView />}
        </>
      )}

      {landed && (
        <>
          {exploring && <LiveClock compact />}
          {/* The ongoing-missions list makes way for a site, mission or moon card which opens in the same corner.
              A mission completed while its card is open drops out of the list, and the list comes back. */}
          {!inSite && exploring && (
            <CatalogHud open={catalogOpen} onToggleOpen={toggleCatalog} selectedId={site?.id ?? moonId ?? orbiterId} onPlanet={pickPlanet} onMoon={pickMoon} onOrbiter={pickOrbiter} onSite={pickSite} />
          )}
          {exploring && <MissionsHud
            before={flat ? <LayersButton open={layersShown} onClick={toggleLayers} /> : undefined}
            missions={{ list: missionList, error: missions.error }}
            status={missionStatus}
            onStatus={setMissionStatus}
            owner={!user && missionOwner === 'mine' ? 'all' : missionOwner}
            onOwner={setMissionOwner}
            signedIn={!!user}
            query={missionQuery}
            onQuery={setMissionQuery}
            open={missionsOpen}
            onToggleOpen={toggleMissions}
            showList={!inSite && !site && !mission && !moonId && !orbiterId && !(flat && walk.selected)}
            onSelect={(id) => select(MISSION_PREFIX + id)}
          />}
          {!inSite && mapMode !== 'eva' && <ViewSwitch flat={flat} onFlat={setFlat} />}
          {!inSite && exploring && <TimeBar aheadH={aheadH} maxH={SOL_H} onChange={setAheadH} rate={rate} playRate={PLAY_RATE} onRate={setRate} onNow={backToNow} />}
          <ToolDock
            open={toolsOpen}
            onToggle={() => setToolsOpen((o) => !o)}
            tools={flat ? mapTools : inSite ? siteTools : globeTools}
            uiHidden={uiHidden}
            onHideUi={() => setUiHidden((h) => !h)}
            label="Globe tools"
            onGuide={() => {
              // The tour points at the controls, so they need to be showing: bring back a hidden interface
              // and fold the tools away
              setUiHidden(false)
              setToolsOpen(false)
              setTourOpen((o) => !o)
            }}
          />
        </>
      )}
      {tourOpen && (
        <Tour
          key={mapMode}
          steps={!exploring ? tourSteps(mapMode) : globeTourSteps(flat ? 'map' : inSite ? 'site' : 'globe', [
            MARS_MODEL_CREDIT,
            VIKING_MODEL_CREDIT,
            MOON_SHAPE_CREDIT,
            SKY_CREDIT,
            moonsFromHorizons() ? 'Moon positions: JPL Horizons (live)' : 'Moon positions: built-in orbit model',
          ])}
          onClose={() => setTourOpen(false)}
        />
      )}

      {/* Keyed so each new selection slides its card in afresh; the landing-site close-up has none */}
      {site && !inSite ? (
        <LandingSiteCard
          key={site.id}
          site={site}
          canExplore={!!scene && !flat}
          diving={preparing || diving}
          onExplore={openSite}
          onClose={closeCard}
        />
      ) : mission ? (
        <MissionCard key={mission.id} mission={mission} at={nightAt} atLabel={atLabel} pathNote={pathNote} onClose={closeCard} />
      ) : moonId ? (
        <MoonCard key={moonId} id={moonId} onClose={closeCard} />
      ) : orbiterId && !inSite && !flat ? (
        <OrbiterCard key={orbiterId} id={orbiterId} at={nowMs + aheadH * 3_600_000} onClose={closeCard} />
      ) : null}
    </main>
  )
}
