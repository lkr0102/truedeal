import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

// Rotas sem autenticação
const PUBLIC_ROUTES = ["/login", "/auth/callback"]

// Rotas autenticadas mas sem exigir onboarding concluído
const ONBOARDING_ROUTES = ["/onboarding"]

// Assets e sistema — nunca interceptar
const SKIP_PREFIXES = ["/_next", "/api", "/favicon", "/icon", "/apple-icon", "/brand", "/images", "/public"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (SKIP_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Se Supabase não estiver configurado, permite acesso sem autenticação
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Atualiza sessão (obrigatório para SSR com Supabase)
  const { data: { user } } = await supabase.auth.getUser()

  const isPublic      = PUBLIC_ROUTES.some(r => pathname.startsWith(r))
  const isOnboarding  = ONBOARDING_ROUTES.some(r => pathname.startsWith(r))

  // Supabase OAuth error: redireciona /?error_code=... → /login com mensagem
  if (pathname === "/" && request.nextUrl.searchParams.has("error_code")) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set(
      "error",
      request.nextUrl.searchParams.get("error_description") ??
        request.nextUrl.searchParams.get("error_code") ??
        "auth_error",
    )
    url.searchParams.delete("error_code")
    url.searchParams.delete("error_description")
    return NextResponse.redirect(url)
  }

  // Não autenticado → login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (user) {
    // Logado tentando acessar login → home
    if (pathname.startsWith("/login")) {
      const url = request.nextUrl.clone()
      url.pathname = "/"
      return NextResponse.redirect(url)
    }

    // Onboarding não concluído → redireciona (exceto se já está no onboarding)
    const onboardingDone = user.user_metadata?.onboarding_completed === true
    if (!onboardingDone && !isOnboarding) {
      const url = request.nextUrl.clone()
      url.pathname = "/onboarding/profile"
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
