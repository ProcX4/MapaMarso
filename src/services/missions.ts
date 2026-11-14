import { supabase } from '../lib/supabase'
import { MISSION_CODE_PATTERN, randomMissionCode } from '../lib/missionCode'
import { isLngLat } from '../lib/validate'
import type { Stop, StopKind } from '../state/types'

/*
 * Saved Marswalks ("missions"), adapted from MapaMars src/services/missionLogs.ts.
 * Uses the same mission_logs table as MapaMars (supabase/schema.sql), so both apps can share one
 * database: the base is the start, the stops in between are "phases", and the last stop is the end
 * (a round trip ends back at the base). MAPA also stores each phase's stop kind inside the phase.
 */

export type MissionStatus = 'open' | 'complete'
/** Public missions show up when browsing; unlisted ones are reachable only by code. */
export type MissionVisibility = 'public' | 'unlisted'
type TripType = 'linear' | 'round'
type Phase = { name: string; lat: number; lon: number; kind?: StopKind }

/** The database allows up to 10 stops between start and end. */
export const MAX_PHASES = 10

export type Mission = {
  id: string
  ownerId: string
  /** ABC-123. Null when the database withholds it (someone else's mission reached without the code). */
  code: string | null
  name: string
  commander: string
  stops: Stop[]
  roundTrip: boolean
  date: string
  objective: string
  status: MissionStatus
  visibility: MissionVisibility
  createdAt: string
  updatedAt?: string
}

export type MissionFields = {
  code: string
  name: string
  objective: string
  date: string
  visibility: MissionVisibility
  stops: Stop[]
  roundTrip: boolean
}

type Row = {
  id: string
  owner_id: string
  code?: string | null
  name: string
  start_name: string
  start_lat: number
  start_lon: number
  phases: Phase[] | null
  trip_type: TripType | null
  target: string
  lat: number
  lon: number
  date: string | null
  objective: string
  status: MissionStatus
  visibility: MissionVisibility
  created_at: string
  updated_at: string | null
  username?: string
  author?: { username: string } | null
}

// `profiles!owner_id` picks the author: missions also reach profiles through the crew table.
const COLUMNS =
  'id, owner_id, code, name, start_name, start_lat, start_lon, phases, trip_type, target, lat, lon, date, objective, status, visibility, created_at, updated_at, author:profiles!owner_id(username)'

const PHASE_KINDS: StopKind[] = ['waypoint', 'science', 'destination']

/** Exported for tests. */
export function fromRow(r: Row): Mission {
  const roundTrip = r.trip_type === 'round'
  const stops: Stop[] = [{ id: 'base', kind: 'base', name: r.start_name, at: [r.start_lon, r.start_lat] }]
  for (const p of r.phases ?? []) {
    const at: [number, number] = [p.lon, p.lat]
    if (!isLngLat(at)) continue
    stops.push({ id: crypto.randomUUID(), kind: p.kind && PHASE_KINDS.includes(p.kind) ? p.kind : 'waypoint', name: p.name, at })
  }
  if (!roundTrip) stops.push({ id: crypto.randomUUID(), kind: 'destination', name: r.target, at: [r.lon, r.lat] })
  return {
    id: r.id,
    ownerId: r.owner_id,
    code: r.code ?? null,
    name: r.name,
    commander: r.username ?? r.author?.username ?? 'unknown',
    stops,
    roundTrip,
    date: r.date ?? '',
    objective: r.objective,
    status: r.status,
    visibility: r.visibility,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? undefined,
  }
}

// 4 decimal places is about 6 m on Mars: fine enough for a Marswalk
const round4 = (n: number) => Math.round(n * 1e4) / 1e4

/** Checks the route the way the database will, with messages people can act on. */
export function toRow(f: MissionFields) {
  const code = f.code.trim().toUpperCase()
  const name = f.name.trim()
  if (!MISSION_CODE_PATTERN.test(code)) throw new Error('Mission code must look like ABC-123')
  if (!name) throw new Error('Give the mission a name')
  if (name.length > 80) throw new Error('Mission name must be 80 characters or fewer')
  if (f.objective.length > 500) throw new Error('Objective must be 500 characters or fewer')

  const [base, ...rest] = f.stops
  if (!base || rest.length === 0) throw new Error('Add at least one stop besides the base')
  const end = f.roundTrip ? base : rest[rest.length - 1]
  const between = f.roundTrip ? rest : rest.slice(0, -1)
  if (between.length > MAX_PHASES) {
    throw new Error(`Saved missions hold up to ${MAX_PHASES} stops between the start and the end; remove ${between.length - MAX_PHASES}`)
  }
  const label = (s: Stop, i: number) => s.name.trim().slice(0, 80) || `Stop ${i + 1}`
  return {
    code,
    name,
    start_name: label(base, 0),
    start_lat: round4(base.at[1]),
    start_lon: round4(base.at[0]),
    phases: between.map((s, i) => ({ name: label(s, i + 1), lat: round4(s.at[1]), lon: round4(s.at[0]), kind: s.kind })),
    trip_type: (f.roundTrip ? 'round' : 'linear') as TripType,
    // A round trip ends where it started, under the same name (the database checks this)
    target: f.roundTrip ? label(base, 0) : label(end, rest.length),
    lat: round4(end.at[1]),
    lon: round4(end.at[0]),
    date: f.date || null,
    objective: f.objective.trim(),
    visibility: f.visibility,
  }
}

function fail(error: { message: string; code?: string }): never {
  if (error.message.includes('AbortError')) throw new DOMException('Request cancelled', 'AbortError')
  console.error('[missions]', error)
  if (error.code === '23505') throw new Error('That mission code was just taken. Pick another one.')
  // Function or column missing: the database is older than this version of the app
  if (error.code === 'PGRST202' || error.code === '42703' || error.code === 'PGRST204' || error.code === 'PGRST200') {
    throw new Error('The mission database needs setting up. Run supabase/schema.sql in the Supabase SQL Editor.')
  }
  if (error.code === '42501') throw new Error('You need to be signed in to do that.')
  if (error.message.toLowerCase().includes('failed to fetch')) throw new Error('Could not reach Supabase. Check your connection.')
  // Messages raised by the database functions are already readable
  throw new Error(error.message)
}

type Query<T> = PromiseLike<{ data: T | null; error: { message: string; code?: string } | null }> & { abortSignal: (s: AbortSignal) => Query<T> }

async function run<T>(query: Query<T>, signal?: AbortSignal): Promise<T> {
  const { data, error } = await (signal ? query.abortSignal(signal) : query)
  if (error) fail(error)
  return data as T
}

/** Opens a mission by its code. Resolves to null when no mission has that code. */
export async function fetchMissionByCode(code: string, signal?: AbortSignal): Promise<Mission | null> {
  const rows = await run<Row[]>(supabase.rpc('get_mission_by_code', { p_code: code }) as unknown as Query<Row[]>, signal)
  return rows[0] ? fromRow(rows[0]) : null
}

/** Missions you lead, newest first. */
export async function fetchMyMissions(userId: string, signal?: AbortSignal): Promise<Mission[]> {
  const rows = await run<Row[]>(
    supabase.from('mission_logs').select(COLUMNS).eq('owner_id', userId).order('created_at', { ascending: false }) as unknown as Query<Row[]>,
    signal,
  )
  return rows.map(fromRow)
}

/** True when the code is well-formed and no other mission uses it. */
export async function isMissionCodeAvailable(code: string, excludeId?: string): Promise<boolean> {
  return (await run<boolean>(supabase.rpc('mission_code_available', { p_code: code, p_exclude: excludeId ?? null }) as unknown as Query<boolean>)) === true
}

/** A random code that isn't in use yet. */
export async function suggestMissionCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = randomMissionCode()
    if (await isMissionCodeAvailable(code)) return code
  }
  throw new Error('Could not find a free code. Try typing one yourself.')
}

export async function createMission(fields: MissionFields): Promise<Mission> {
  const { data, error } = await supabase.from('mission_logs').insert(toRow(fields)).select(COLUMNS).single()
  if (error) fail(error)
  return fromRow(data as unknown as Row)
}

// Row Level Security silently skips rows you may not change, so an empty result means "not allowed"
export async function updateMission(id: string, fields: MissionFields): Promise<Mission> {
  const { data, error } = await supabase.from('mission_logs').update(toRow(fields)).eq('id', id).select(COLUMNS)
  if (error) fail(error)
  if (!data?.length) throw new Error('You can only change your own missions (or it was already deleted).')
  return fromRow(data[0] as unknown as Row)
}

export async function deleteMission(id: string): Promise<void> {
  const { data, error } = await supabase.from('mission_logs').delete().eq('id', id).select('id')
  if (error) fail(error)
  if (!data?.length) throw new Error('You can only delete your own missions (or it was already deleted).')
}
