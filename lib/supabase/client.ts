import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // The /auth/callback route handler exchanges the code server-side.
        // Leaving detectSessionInUrl=true causes the browser client to race
        // it and call exchangeCodeForSession a second time → flow_state_already_used.
        detectSessionInUrl: false,
      },
    },
  )
}
