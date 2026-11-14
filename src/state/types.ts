export type LngLat = [lon: number, lat: number]

export type StopKind = 'base' | 'waypoint' | 'science' | 'destination'
export type Stop = { id: string; kind: StopKind; name: string; at: LngLat; note?: string }

export type LayerState = { id: string; visible: boolean; opacity: number }

export type Mode = 'explore' | 'plan' | 'eva'

/** Which A* route the plan follows: round all hard ground, or only round impassable ground */
export type RouteOption = 'safest' | 'direct'

export type MarswalkState = {
  mode: Mode
  layers: LayerState[]
  selected: LngLat | null // last clicked point → site card
  pinned: LngLat | null // a point kept for comparing with the selected one
  stops: Stop[] // walking order; base first
  roundTrip: boolean // finish back at base
  routeOption: RouteOption // which of the two A* routes is walked
  walkingSpeedKmh: number // assumption, shown as ESTIMATED
  maxEvaHours: number // assumption for the return threshold
  evaPosition: LngLat | null // simulated position in EVA mode
  mission: OpenMission | null // the saved mission this route was opened from, if any
}

/** Details of a saved mission kept alongside its route (Supabase; see services/missions.ts). */
export type OpenMission = {
  id: string
  code: string | null
  ownerId: string
  commander: string
  name: string
  objective: string
  date: string
  visibility: 'public' | 'unlisted'
}

export type Category = 'observed' | 'derived' | 'estimated'

/** A point as {lat, lon} (planetocentric, east-positive), the shape the globe and flat map use. */
export type LatLon = { lat: number; lon: number }
