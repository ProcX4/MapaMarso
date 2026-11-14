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
      { target: '.mission-save', title: 'Save and share', text: 'Sign in to save the route as a mission with a code like MRS-204, then open it anywhere at #/plan/MRS-204.' },
      { target: '.mode-switch', title: 'Walk it', text: 'Switch to EVA to follow the route in a simplified, high-contrast view.' },
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
    { target: '.map', title: 'Site analysis', text: 'Click anywhere on the map for its coordinates, elevation, slope, geology and hazards, then add it to your route.' },
    { target: '.mode-switch', title: 'Modes', text: 'Explore the site, plan a Marswalk, then walk it in EVA mode.' },
    ...end,
  ]
}
