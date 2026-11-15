import type { TourStep } from '../components/Tour'

/**
 * What the full tour can do to the page, so it can walk a visitor from the 3D globe to the 2D map, the
 * planner and EVA by itself. GlobePage provides these.
 */
export type TourActions = {
  /** The 3D globe, nothing picked, panels tidied away */
  globe: () => void
  /** The globe turned back to its starting view */
  resetGlobe: () => void
  openCatalog: () => void
  /** Pick a landing site on the globe (opens its card) */
  site: (id: string) => void
  /** The landing-site close-up is open */
  inSite: () => boolean
  /** The 2D map, exploring, the whole planet in view */
  map: () => void
  openLayers: () => void
  /** The 2D map flown to the demo site's habitat at this zoom */
  zoomToSite: (zoom: number) => void
  /** A point of open ground beside the habitat picked, so its site card opens */
  pickGround: () => void
  openMissions: () => void
  /** The Marswalk planner on the 2D map */
  plan: () => void
  /** EVA mode */
  eva: () => void
  /** The route has at least two stops */
  hasRoute: () => boolean
  /** Adds a short sample route from the habitat, so the planner and EVA have something to show */
  sampleRoute: () => void
}

export const TOUR_CHAPTERS = {
  welcome: 'Welcome',
  globe: 'The 3D globe',
  toMap: 'From 3D to 2D',
  map: 'The 2D map',
  plan: 'Plan a Marswalk',
  eva: 'EVA',
  end: 'Wrap-up',
} as const

/**
 * The full guided tour: from the 3D globe (landing sites, orbiters, moons, day and night, the landing-site
 * close-up) to the 2D map (NASA layers down to 25 cm per pixel, site analysis, rover photos, missions), then
 * planning a Marswalk and walking it in EVA. Each step opens what it talks about; the visitor can try every
 * control as it is lit, or jump between chapters.
 */
export function fullTourSteps(a: TourActions, credits: string[]): TourStep[] {
  const C = TOUR_CHAPTERS
  return [
    // ---------- Welcome ----------
    {
      chapter: C.welcome,
      title: 'Welcome to Mapa Mars',
      text: 'Plan a walk on Mars with real NASA data. This tour takes about four minutes and moves the app for you: press Next, or try each control as it lights up.',
      points: [
        'The 3D globe: landing sites, orbiters and moons, live',
        'The 2D map: NASA layers, from whole-planet colour down to single rocks',
        'Site analysis and real Perseverance photos',
        'Plan, save and share a Marswalk, then walk it in EVA mode',
      ],
      enter: a.globe,
    },

    // ---------- The 3D globe ----------
    {
      chapter: C.globe,
      title: 'Turn the planet',
      text: 'This is Mars as it is right now. The dark side is night, where the Sun has set at this very moment.',
      tryIt: 'Drag to spin the globe and scroll to zoom in and out.',
      enter: () => { a.globe(); a.resetGlobe() },
    },
    {
      chapter: C.globe,
      target: '.live-clock',
      title: 'Two clocks',
      text: 'Philippine time, and Mars time (MTC), the Martian equivalent of UTC. A sol, a Martian day, lasts 24 h 39 min.',
    },
    {
      chapter: C.globe,
      target: '.daylight-bar',
      title: 'Day and night',
      text: 'Look ahead through the next sol and watch day and night sweep across the planet.',
      tryIt: 'Press play, or drag the ring along the line. Now brings you back to the present.',
    },
    {
      chapter: C.globe,
      target: '.site-marker',
      // The label may sit on any side of the dot (moved clear of its neighbours): ring the two as drawn
      ringParts: '.site-marker-dot, .site-marker-label',
      title: 'Landing sites',
      text: 'Each dot is a spacecraft that landed on Mars, from Viking 1 in 1976 to Perseverance. Filled dots are still working.',
      tryIt: 'Click a dot to read its card.',
    },
    {
      chapter: C.globe,
      target: '.orbiter-marker',
      title: 'Orbiters',
      text: 'The spacecraft circling Mars right now, placed live from NASA JPL Horizons. Their cards show the orbit and a 3D model.',
    },
    {
      chapter: C.globe,
      target: '.moon-marker',
      title: 'Phobos and Deimos',
      text: 'Mars’s two moons, in their live positions, with their real shapes measured from spacecraft images.',
      tryIt: 'Click a moon to fly up to it.',
    },
    {
      chapter: C.globe,
      target: '.catalog-panel',
      title: 'Catalog',
      text: 'Everything on the globe in one list: Mars, its moons, the orbiters and every landing site, with filters and a search.',
      tryIt: 'Type “jezero” in the search, or pick anything to fly to it.',
      enter: () => { a.globe(); a.openCatalog() },
    },
    {
      chapter: C.globe,
      target: '.info-card',
      title: 'A landing site’s card',
      text: 'Perseverance landed in Jezero Crater in 2021 and is still exploring it. Jezero is MAPA’s demo site: the 2D map, the route planner and the rover photos all work there.',
      enter: () => a.site('m2020'),
    },
    {
      chapter: C.globe,
      target: '.info-card-action',
      title: 'Walk around a landing site in 3D',
      text: 'Viking 1’s landing site can be explored on the surface: the real lander, its trenches and the boulder Big Joe, lit by the Sun as it is there right now.',
      tryIt: 'Press Explore landing site and wait for the descent, then press Next. Or just press Next to skip it.',
      enter: () => a.site('vl1'),
    },
    {
      chapter: C.globe,
      target: '.light-switch',
      title: 'Light on the site',
      text: 'Live lights the site as the Sun is there right now; Day and Night show either. After dark your cursor becomes a flashlight.',
      when: a.inSite,
    },
    {
      chapter: C.globe,
      target: '.poi-dot',
      title: 'Points of interest',
      text: 'Each white dot is something the mission found or did here. Click one to fly to it and read about it; click it again to zoom back out.',
      when: a.inSite,
    },

    // ---------- From 3D to 2D ----------
    {
      chapter: C.toMap,
      target: '.view-switch',
      title: '3D or 2D',
      text: 'The globe is for the big picture. For planning a walk you want the flat map: all of Mars on NASA’s own layers, down to walking scale. Switch here any time.',
      tryIt: 'Press Next and the tour switches to 2D for you.',
      enter: a.globe,
    },

    // ---------- The 2D map ----------
    {
      chapter: C.map,
      target: '.map',
      title: 'The whole planet, flat',
      text: 'The same Mars, as a map. Drag to pan and scroll to zoom: it goes from the whole planet down to single rocks. Mission routes and the landing sites are on it too.',
      enter: a.map,
    },
    {
      chapter: C.map,
      target: '.layers-panel',
      title: 'NASA layers',
      text: 'Every layer comes from a NASA mission, and says so. Switch them on and off and fade them with the sliders.',
      points: [
        'Topographic: elevation, steep and deep ground, the safe path',
        'Optical: colour mosaics, CTX (5 m/px) and HiRISE (25 cm/px)',
        'Spectral: infrared, minerals, dust and albedo',
      ],
      tryIt: 'Type “Jezero” in Search places at the top left and pick it. The map flies down to the crater and the sharp CTX imagery takes over; zoom in one more step for HiRISE. Keep MRO CTX and MRO HiRISE switched on here.',
      enter: () => { a.map(); a.openLayers() },
    },
    {
      chapter: C.map,
      target: '.map',
      title: 'Down to Jezero Crater',
      text: 'From zoom 10 the CTX camera takes over from the blurry whole-planet colour: about 5 m per pixel, enough to see craters, ridges and dunes.',
      enter: () => a.zoomToSite(11),
    },
    {
      chapter: C.map,
      target: '.map',
      title: 'Single rocks with HiRISE',
      text: 'Around Perseverance’s landing site the HiRISE camera shows 25 cm per pixel: boulders, ripples and the rover’s own landing area. This is the scale a walk is planned at.',
      tryIt: 'Zoom in and out a step to see CTX and HiRISE swap over.',
      enter: () => a.zoomToSite(15),
    },
    {
      chapter: C.map,
      target: '.explore-search',
      title: 'Search places',
      text: 'Find a named place at the site, like the Octavia E. Butler Landing, and fly straight to it.',
      enter: () => a.zoomToSite(13),
    },
    {
      chapter: C.map,
      target: '.site-card',
      title: 'Site analysis',
      text: 'Click any open ground for what is there: its coordinates, elevation, slope, whether it is safe to walk, the Sun right now and any science targets nearby.',
      points: ['Observed: measured by a spacecraft', 'Derived: calculated by MAPA from NASA data', 'Estimated: based on stated assumptions'],
      tryIt: 'Hover a tag like OBSERVED to see where a number comes from.',
      enter: a.pickGround,
    },
    {
      chapter: C.map,
      target: '.rover-photos',
      title: 'What you’ll see when you arrive',
      text: 'Wherever Perseverance has stopped within 250 m, the site card shows its real photos from that spot, which way each one looks, and when it was taken.',
      tryIt: 'Click a photo to open it large; the arrow keys step through them.',
      enter: a.pickGround,
    },
    {
      chapter: C.map,
      target: '.missions-panel',
      title: 'Missions',
      text: 'Marswalks people have planned: ongoing or completed, with a search. Pick one to see its route on the map; All routes in the tools draws every one at once.',
      enter: a.openMissions,
    },
    {
      chapter: C.map,
      target: '.missions-add',
      title: 'Start a mission',
      text: 'Plan a new Marswalk mission with a name, a crew and an invite code like MRS-204. You need to be signed in.',
    },

    // ---------- Plan a Marswalk ----------
    {
      chapter: C.plan,
      target: '.planner-panel',
      title: 'The Marswalk planner',
      text: 'Build a walk from the habitat to your science stops and back. MAPA finds a safe path round steep and deep ground and works out how long it will take.',
      points: ['Stops in walking order', 'Distance, time, climb and steepest slope', 'An elevation profile linked to the map', 'Save and share it as a mission'],
      enter: a.plan,
    },
    {
      chapter: C.plan,
      target: '.planner-panel .stops',
      title: 'Stops',
      text: 'Every walk starts at the habitat. To add a stop, click the map, then Add waypoint or Add science stop on the site card. Rename a stop by typing over it, drag it on the map to move it.',
      action: { label: 'Add a sample route', run: a.sampleRoute, done: a.hasRoute },
      tryIt: 'No time to click? Add a sample route of two stops near the habitat.',
      enter: a.plan,
    },
    {
      chapter: C.plan,
      target: '.planner-panel .segmented',
      title: 'Round trip or one way',
      text: 'A round trip finishes back at the habitat, and the walk home counts towards your EVA time. One way ends at the last stop.',
    },
    {
      chapter: C.plan,
      target: '.plan-stats',
      title: 'Route stats',
      text: 'Distance, walking time, height gained and lost, and the steepest slope on the way. Every number is tagged observed, derived or estimated.',
      tryIt: 'Hover ESTIMATED to see the walking speed it assumes.',
    },
    {
      chapter: C.plan,
      target: '.plan-bottom',
      title: 'Elevation profile',
      text: 'The ground along your walk, from start to finish. Steep stretches are drawn in caution colours.',
      tryIt: 'Hover the profile: a marker shows the same point on the map.',
    },
    {
      chapter: C.plan,
      target: '.map',
      title: 'A safe path, not a straight line',
      text: 'MAPA routes round slopes too steep to walk and hollows too deep to climb out of (the A* path), and shades that ground on the map so you can see why.',
    },
    {
      chapter: C.plan,
      target: '.mission-save',
      title: 'Save and share',
      text: 'Sign in to save the walk as a mission with a code. Anyone with the code can open it, see the route and join the crew.',
    },

    // ---------- EVA ----------
    {
      chapter: C.eva,
      title: 'EVA mode: walk it',
      text: 'The route as you would walk it in a spacesuit: a simple, high-contrast view with three facts and one alert at a time. Your position along the route is simulated.',
      action: { label: 'Add a sample route first', run: a.sampleRoute, done: a.hasRoute },
      enter: a.eva,
    },
    {
      chapter: C.eva,
      target: '.eva-alert',
      title: 'One alert at a time',
      text: 'Only the most urgent warning shows: time to turn back, sunset coming, or steep ground ahead.',
      enter: a.eva,
    },
    {
      chapter: C.eva,
      target: '.eva-progress',
      title: 'Walk the route',
      text: 'Slide along the route to move your simulated position and watch the facts and alerts change.',
      tryIt: 'Drag the slider, or use the arrow keys on it.',
    },
    {
      chapter: C.eva,
      target: '.eva-actions',
      title: 'Big buttons',
      text: 'Jump to the next stop or science stop, go back to the route, or head straight home.',
    },

    // ---------- Wrap-up ----------
    {
      chapter: C.end,
      target: '.tool-dock-toggle',
      title: 'Tools',
      text: 'On the map: all mission routes, Plan Marswalk, EVA, recentring on the demo site and fitting your route. On the globe: labels, orbits, moons, orbiters and the grid.',
      enter: a.map,
    },
    {
      chapter: C.end,
      target: '.tool-dock-hide',
      title: 'Clear view',
      text: 'Hides every panel for an unobstructed view. Press it again, or H or Esc, to bring them back.',
    },
    {
      chapter: C.end,
      target: '.tool-dock-guide',
      title: 'That’s the tour',
      text: 'Run it again any time from here, or jump to a chapter with the dots on this card.',
      points: [`Data and models: ${credits.join(' · ')}`],
    },
  ]
}

/** Where the full tour opens when started from a view: its chapter's first step */
export function tourStartFor(steps: TourStep[], chapter: string) {
  const i = steps.findIndex((s) => s.chapter === chapter)
  return i < 0 ? 0 : i
}

/**
 * The flat-map mission planner's own tour (the ? in its panel, and once by itself on a first visit); from
 * MapaMars. Steps whose control isn't on screen are left out, so it fits whichever step of the form is open.
 */
export const plannerTourSteps: TourStep[] = [
  { title: 'Plan a Marswalk', text: 'Lay out a walk on the map, give it a name and an invite code, and add any details. This quick tour shows where everything is.' },
  { target: '.planner-steps', title: 'Three steps', text: 'Route, then name and code, then details. Click a step to jump to it; a tick shows once one is done.' },
  { target: '.trip-switch', title: 'Trip type', text: 'A → B finishes somewhere new. A round trip comes back to the start, and needs at least one stop on the way.' },
  { target: '.stop-row.is-placing', title: 'Place a stop', text: 'The highlighted stop is the one the map places: click the map to drop it there, and the next empty stop is picked for you. Click any stop’s letter to place it again.' },
  { target: '.stop-coords', title: 'Exact coordinates', text: 'Click a stop’s coordinates to type its latitude and longitude instead. Once two stops are placed, the distance from the one before shows here too.' },
  { target: '.add-stop', title: 'Stops along the way', text: 'Add up to 10 stops between start and finish, in walking order. Hover a stop to move it earlier or later, or remove it.' },
  { target: '.planner-map .jump-to', title: 'Jump to a place', text: 'Fly the map to a landmark or a landing site.' },
  { target: '.planner-map .map2d-zoom', title: 'Zoom', text: 'Zoom in for Marswalk-scale detail. You can also scroll to zoom and drag to pan.' },
  { target: '.planner-summary', title: 'Distance', text: 'The walk’s straight-line length, once every stop is placed.' },
  { target: '.planner-next', title: 'Next step', text: 'On to the name and invite code, then the details. You create the Marswalk from the last step.' },
  { target: '.planner-help', title: 'This tour', text: 'Run it again any time from here.' },
]
