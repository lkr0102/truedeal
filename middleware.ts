import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

// Rotas que não precisam de autenticação
const PUBLIC_ROUTES = ["/login", "/auth/callback"]

// Rotas de API e assets que o middleware nunca deve interceptar
const SKIP_PREFIXES = ["/_next", "/api", "/favicon", "/icon", "/apple-icon", "/brand", "/images", "/public"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ignora assets e rotas de sistema
  if (SKIP_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: ()               => request.cookies.getAll(),
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

  // Atualiza a sessão (obrigatório para SSR com Supabase)
  const { data: { user } } = await supabase.auth.getUser()

  const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r))

  // Não autenticado tentando acessar rota protegida → login
  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    return NextResponse.redirect(loginUrl)
  }

  // Autenticado tentando acessar login → home
  if (user && pathname.startsWith("/login")) {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = "/"
    return NextResponse.redirect(homeUrl)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
