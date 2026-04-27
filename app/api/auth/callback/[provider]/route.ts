import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

function getBaseUrl(req: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL ?? `${req.nextUrl.protocol}//${req.nextUrl.host}`
}

// Verifica assinatura do Telegram para evitar spoofing
function verifyTelegramAuth(data: Record<string, string>, botToken: string): boolean {
  const { hash, ...rest } = data
  const checkString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join("\n")
  const secretKey = crypto.createHash("sha256").update(botToken).digest()
  const expectedHash = crypto.createHmac("sha256", secretKey).update(checkString).digest("hex")
  return expectedHash === hash
}

// GET — usado por TikTok, Telegram, Instagram, X, Strava
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params
  const { searchParams } = req.nextUrl
  const baseUrl = getBaseUrl(req)

  const error = searchParams.get("error")
  if (error) {
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(error)}`)
  }

  // Validação de state (CSRF) para provedores padrão
  if (provider !== "telegram") {
    const state = searchParams.get("state")
    const storedState = req.cookies.get("oauth_state")?.value
    if (!state || state !== storedState) {
      return NextResponse.redirect(`${baseUrl}/login?error=state_mismatch`)
    }
  }

  // Telegram envia os dados diretamente na query string (hash, id, first_name, etc.)
  if (provider === "telegram") {
    const botToken = process.env.TELEGRAM_BOT_TOKEN ?? ""
    const data = Object.fromEntries(searchParams.entries())
    if (!verifyTelegramAuth(data, botToken)) {
      return NextResponse.redirect(`${baseUrl}/login?error=telegram_auth_failed`)
    }
    // TODO: criar/buscar usuário no banco com data.id, data.first_name, data.username
    const res = NextResponse.redirect(`${baseUrl}/onboarding/profile`)
    res.cookies.delete("oauth_state")
    return res
  }

  const code = searchParams.get("code")
  if (!code) {
    return NextResponse.redirect(`${baseUrl}/login?error=no_code`)
  }

  // TODO: trocar o `code` pelo access_token no servidor usando as credenciais de cada provedor.
  // Exemplo para X (requer code_verifier):
  // const codeVerifier = req.cookies.get("x_code_verifier")?.value
  // const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", { ... })

  // TODO: criar/buscar o usuário no banco de dados.
  // Se novo usuário → /onboarding/profile
  // Se usuário existente → /

  const redirect = NextResponse.redirect(`${baseUrl}/onboarding/profile`)
  redirect.cookies.delete("oauth_state")
  redirect.cookies.delete("x_code_verifier")
  return redirect
}

// POST — Apple usa response_mode=form_post e envia code via POST
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params
  const baseUrl = getBaseUrl(req)

  if (provider !== "apple") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
  }

  const formData = await req.formData()
  const code = formData.get("code") as string | null
  const error = formData.get("error") as string | null

  if (error) {
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(error)}`)
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/login?error=no_code`)
  }

  // TODO: trocar code por token com Apple Sign In
  return NextResponse.redirect(`${baseUrl}/onboarding/profile`)
}
