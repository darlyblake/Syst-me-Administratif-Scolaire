import { createBrowserClient } from "@supabase/ssr"

// Les variables d'environnement restent prioritaires en local/CI.
// Les valeurs publiques de Supabase peuvent être utilisées côté navigateur ;
// le fallback évite qu'un build Next.js échoue lorsqu'elles ne sont pas
// injectées par Vercel au moment du prerendering.
const DEFAULT_SUPABASE_URL = "https://mogbzexqcatpgfrwzjld.supabase.co"
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_AfPR3uNAwy0jjP4VLvZcQA_8Zml0U80"

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  DEFAULT_SUPABASE_PUBLISHABLE_KEY

/**
 * Client Supabase navigateur partagé avec le middleware SSR.
 * Le middleware lit la session dans les cookies : createBrowserClient
 * permet au navigateur et au middleware d'utiliser le même mécanisme de session.
 */
export const supabaseBrowser = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
