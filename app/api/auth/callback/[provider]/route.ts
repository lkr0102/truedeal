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

  if (provider === "x") {
    const codeVerifier = req.cookies.get("x_code_verifier")?.value
    if (!codeVerifier) {
      return NextResponse.redirect(`${baseUrl}/login?error=no_verifier`)
    }

    try {
      const basicAuth = Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString("base64")
      const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          code,
          grant_type: "authorization_code",
          redirect_uri: `${baseUrl}/api/auth/callback/x`,
          code_verifier: codeVerifier,
        }),
      })

      if (!tokenRes.ok) {
        return NextResponse.redirect(`${baseUrl}/login?error=x_token_failed`)
      }

      const tokenData = await tokenRes.json()
      
      const userRes = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url,username", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })
      const { data: xUser } = await userRes.json()

      const { createClient } = await import("@/lib/supabase/server")
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        await (supabase.from("social_connections") as any).upsert({
          user_id:          user.id,
          platform:         "x",
          status:           "connected",
          external_id:      xUser.id,
          username:         xUser.username,
          access_token:     tokenData.access_token,
          refresh_token:    tokenData.refresh_token,
          token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          metadata:         { profile_image_url: xUser.profile_image_url },
        }, { onConflict: "user_id,platform" })
      }
    } catch (err) {
      console.error("OAuth Error:", err)
      return NextResponse.redirect(`${baseUrl}/login?error=oauth_exception`)
    }
  }

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
