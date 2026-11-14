export type LngLat = [lon: number, lat: number]

export type StopKind = 'base' | 'waypoint' | 'science' | 'destination'
export type Stop = { id: string; kind: StopKind; name: string; at: LngLat; note?: string }

export type LayerState = { id: string; visible: boolean; opacity: number }

export type Mode = 'explore' | 'plan' | 'eva'

export type MarswalkState = {
  mode: Mode
  layers: LayerState[]
  selected: LngLat | null // last clicked point → site card
  stops: Stop[] // walking order; base first
  roundTrip: boolean // finish back at base
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
