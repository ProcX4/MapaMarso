import type { TourStep } from '../components/Tour'
import type { Mode } from '../state/types'

/** The guided tour for each mode, following the demo story in the Gen Spec. */
export function tourSteps(mode: Mode): TourStep[] {
  const end: TourStep[] = [
    { target: '.tool-dock-toggle', title: 'Tools', text: 'Recentre on the demo site, fit the whole route in view, or start a new route.' },
    { target: '.tool-dock-hide', title: 'Clear view', text: 'Hides every panel for an unobstructed map. Press it again, or H or Esc, to bring them back.' },
    { target: '.tool-dock-guide', title: 'This tour', text: 'Run it again any time from here.' },
  ]
  if (mode === 'plan') {
    return [
      { title: 'Plan a Marswalk', text: 'Build a route from the habitat to your science stops and back. Every number says whether it is observed, derived or estimated.' },
      { target: '.planner-panel .stops', title: 'Stops', text: 'Your route in walking order. Rename a stop by typing over its name; hover a stop to move it up, down or remove it. Drag a stop on the map to move it.' },
      { target: '.planner-panel .segmented', title: 'Round trip or one way', text: 'A round trip finishes back at the habitat; the return walk then counts towards the EVA time.' },
      { target: '.plan-stats', title: 'Route stats', text: 'Distance, walking time, climb and the steepest slope. Hover a tag to see what an estimate assumes.' },
      { target: '.plan-bottom', title: 'Elevation profile', text: 'Hover the profile to see the matching point on the map, and the other way round. Steep sections are drawn in caution colours.' },
      { target: '.mission-save', title: 'Save and share', text: 'Sign in to save the route as a mission with a code like MRS-204, then open it anywhere at #/globe/2d/plan/MRS-204.' },
      { target: '.tool-dock-toggle', title: 'Walk it', text: 'EVA in the tools follows the route in a simplified, high-contrast view; Plan Marswalk closes the planner.' },
      ...end,
    ]
  }
  if (mode === 'eva') {
    return [
      { title: 'EVA mode', text: 'The route as you would walk it: three facts, one alert at a time, large buttons. Your position is simulated.' },
      { target: '.eva-alert', title: 'One alert', text: 'Only the most urgent warning shows: time to turn back, sunset, or steep ground ahead.' },
      { target: '.eva-progress', title: 'Simulated position', text: 'Slide along the route, or use the arrow keys, to walk it.' },
      { target: '.eva-actions', title: 'Actions', text: 'Jump to the next stop or science stop, go back to the route, or head straight home.' },
    ]
  }
  return [
    { title: 'Welcome to MAPA', text: 'NASA Mars data layered into one map for planning a safe, scientifically useful Marswalk. This short tour points out each control.' },
    { target: '.live-clock', title: 'Clock', text: 'Philippine time, Mars time (MTC), and the local time and daylight at the demo site right now.' },
    { target: '.layers-link', title: 'Layers', text: 'Turn NASA layers on and off: imagery, elevation, slope and science. Each one says where its data comes from.' },
    { target: '.explore-search', title: 'Search', text: 'Find a named place at the site and fly to it.' },
    { target: '.map', title: 'Site analysis', text: 'Click anywhere on the map for its coordinates, elevation, slope and hazards, then add it to your route.' },
    { target: '.tool-dock-toggle', title: 'Modes', text: 'Plan a Marswalk or walk it in EVA mode from the tools.' },
    ...end,
  ]
}

/** The globe page's tour for whichever view is showing (from MapaMars pages/globe/tourSteps.ts). */
export function globeTourSteps(view: 'globe' | 'map' | 'site', credits: string[]): TourStep[] {
  const end: TourStep[] = [
    { target: '.tool-dock-toggle', title: 'Tools', text: view === 'site' ? 'Back to the globe, labels on or off, and a slow automatic turn around the site.' : 'Labels, orbit lines, the moons, the orbiters, the latitude grid, all mission routes, and resetting the view.' },
    { target: '.tool-dock-hide', title: 'Clear view', text: 'Hides every panel and button for an unobstructed view. Press it again, or H or Esc, to bring them back.' },
    { target: '.tool-dock-guide', title: 'This tour', text: `Run it again any time from here. Data and models: ${credits.join(' · ')}.` },
  ]
  if (view === 'site') {
    return [
      { title: 'At the landing site', text: 'Drag to orbit, right-drag to pan and scroll to zoom. This short tour points out each control.' },
      { target: '.site-back', title: 'Back to globe', text: 'Zooms back out to the whole of Mars.' },
      { target: '.light-switch', title: 'Light', text: 'Live lights the site as the Sun is there right now; Day and Night show either. After dark your cursor becomes a flashlight.' },
      { target: '.poi-dot', title: 'Points of interest', text: 'Click a white dot to fly to that spot and read about it; click it again to zoom back out.' },
      { target: '.live-clock', title: 'Clock', text: 'Philippine time, and Mars time (MTC): the Martian equivalent of UTC.' },
      ...end,
    ]
  }
  if (view === 'map') {
    return [
      { title: 'The 2D map', text: 'All of Mars at once on NASA layers. Drag to pan, scroll to zoom right down to the demo site, and click a mission route to see it.' },
      { target: '.layers-link', title: 'Layers', text: 'Turn NASA layers on and off: imagery, elevation, slope and science. Each one says where its data comes from.' },
      { target: '.explore-search', title: 'Search', text: 'Find a named place at the demo site and fly to it.' },
      { target: '.map', title: 'Site analysis', text: 'Click open ground for its coordinates, elevation, slope and hazards, then add it to your route.' },
      { target: '.view-switch', title: '3D or 2D', text: 'Switch back to the globe.' },
      { target: '.daylight-bar', title: 'Day and night', text: 'Play day and night, or drag the ring along the line through the next sol; Now returns to the present.' },
      { target: '.catalog-link', title: 'Catalog', text: 'Mars, its moons and every landing site, with filters and a search. Pick one to go to it.' },
      { target: '.missions-link', title: 'Missions', text: 'Lists ongoing or completed missions, with a search. Pick one to see its route; All routes in the tools shows every route at once.' },
      { target: '.tool-dock-toggle', title: 'Tools', text: 'All mission routes, Plan Marswalk (stops, profile, hazards and science), EVA, recentring on the demo site and fitting the route.' },
      ...end.slice(1),
    ]
  }
  return [
    { title: 'Welcome to Mapa Mars', text: 'Drag to turn Mars and scroll to zoom. This short tour points out what each control does.' },
    { target: '.site-marker', title: 'Landing sites', text: 'Each dot is a spacecraft landing site. Click one for its card; some can be explored on the surface in 3D.' },
    { target: '.orbiter-marker', title: 'Orbiters', text: 'The spacecraft working around Mars right now, placed live from NASA JPL Horizons. Click one for its story, its orbit and its 3D model.' },
    { target: '.moon-marker', title: 'Moons', text: 'Click Phobos or Deimos to fly up to it. Their positions are live from NASA JPL Horizons and their shapes are measured from spacecraft images.' },
    { target: '.live-clock', title: 'Clock', text: 'Philippine time, and Mars time (MTC): the Martian equivalent of UTC.' },
    { target: '.daylight-bar', title: 'Day and night', text: 'Play day and night, or drag the ring along the line through the next sol; Now returns to the present.' },
    { target: '.catalog-link', title: 'Catalog', text: 'Mars, its moons and every landing site, with filters and a search. Pick one to fly to it.' },
    { target: '.view-switch', title: '3D or 2D', text: 'Switch between this globe and a flat map of the whole planet.' },
    { target: '.missions-add', title: 'New mission', text: 'Plan a new Marswalk mission (you need to be signed in).' },
    { target: '.missions-link', title: 'Missions', text: 'Opens the list of missions: ongoing, or switch to completed, with a search. Pick one to see its route; All routes in the tools shows every route at once.' },
    ...end,
  ]
}
