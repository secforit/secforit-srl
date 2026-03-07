import { createClient } from '@supabase/supabase-js'

/**
 * Admin client with service role key.
 * Bypasses Row Level Security — ONLY use in server-side code
 * (Server Actions, Route Handlers, server components).
 * NEVER import this in client components or expose to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase admin credentials')
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
