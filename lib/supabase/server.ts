import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const isPlaceholder = supabaseUrl.includes("seu-projeto")

  const client = createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()            { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch { /* Server Component — ignorar */ }
        },
      },
    },
  )

  // Sovereign Demo Bypass: Se for placeholder, mockamos o getUser para permitir navegação
  if (isPlaceholder) {
    const hasDemoCookie = cookieStore.get("truedeal-demo-session")?.value === "true"
    if (hasDemoCookie) {
      const mockUser = {
        id: "demo-judge-uuid",
        email: "demo@truedeal.io",
        user_metadata: { display_name: "Judge Performance", username: "judge_demo" }
      }
      // Sobrescrevemos o getUser apenas para o bypass
      const originalAuth = client.auth
      client.auth = {
        ...originalAuth,
        getUser: async () => ({ data: { user: mockUser as any }, error: null }),
        getSession: async () => ({ data: { session: { user: mockUser } as any }, error: null }),
      } as any
    }
  }

  return client
}

/** Apenas para operações server-side que precisam de privilégios admin */
export async function createServiceClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll()            { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch { /* ignorar */ }
        },
      },
    },
  )
}
