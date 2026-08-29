import { createClient } from "@supabase/supabase-js"

const defaultUrl = "https://placeholder-project.supabase.co"
const defaultAnonKey = "placeholder-anon-key"

export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? defaultUrl
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? defaultAnonKey

  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

export function getSupabaseServerClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? defaultUrl
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? defaultAnonKey

  if (!process.env.SUPABASE_URL && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      "Supabase server env is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment."
    )
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export const supabase = getSupabaseBrowserClient()
