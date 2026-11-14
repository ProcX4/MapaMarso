import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/*
 * Supabase client for accounts and saved missions (from MapaMars).
 * Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local (and in Vercel). The anon key is public by
 * design and only safe because every table has Row Level Security (supabase/schema.sql).
 * Without them the app still works fully; saving and opening missions is simply unavailable.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && anonKey)

if (!supabaseConfigured) {
  console.info('Supabase is not configured: saved missions and accounts are off. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.')
}

// One client per page. During development, hot reloads re-run this module; reusing the client
// stops several auth clients from fighting over the same stored session.
const globalStore = globalThis as { __mapaSupabase?: SupabaseClient }

export const supabase = (globalStore.__mapaSupabase ??= createClient(url ?? 'http://localhost:54321', anonKey ?? 'missing-key', {
  auth: {
    // PKCE puts the email-confirmation code in the query string, which leaves our #/ routes alone
    flowType: 'pkce',
    persistSession: supabaseConfigured,
    autoRefreshToken: supabaseConfigured,
    detectSessionInUrl: supabaseConfigured,
  },
}))
