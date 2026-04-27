import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

type Provider = "tiktok" | "apple" | "telegram" | "instagram" | "x" | "strava"

function getBaseUrl(req: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL ?? `${req.nextUrl.protocol}//${req.nextUrl.host}`
}

function buildAuthUrl(
  provider: Provider,
  redirectUri: string,
  state: string,
  codeChallenge?: string,
): string {
  const params = (obj: Record<string, string>) => new URLSearchParams(obj).toString()

  switch (provider) {
    case "tiktok":
      return `https://www.tiktok.com/v2/auth/authorize?${params({
        client_key: process.env.TIKTOK_CLIENT_KEY ?? "",
        response_type: "code",
        scope: "user.info.basic",
        redirect_uri: redirectUri,
        state,
      })}`

    case "apple":
      return `https://appleid.apple.com/auth/authorize?${params({
        client_id: process.env.APPLE_CLIENT_ID ?? "",
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "name email",
        state,
        response_mode: "form_post",
      })}`

    case "telegram":
      // Telegram usa oauth.telegram.org com bot_id
      return `https://oauth.telegram.org/auth?${params({
        bot_id: process.env.TELEGRAM_BOT_ID ?? "",
        origin: process.env.NEXT_PUBLIC_APP_URL ?? "",
        return_to: redirectUri,
      })}`

    case "instagram":
      return `https://api.instagram.com/oauth/authorize?${params({
        client_id: process.env.INSTAGRAM_CLIENT_ID ?? "",
        redirect_uri: redirectUri,
        scope: "user_profile,user_media",
        response_type: "code",
        state,
      })}`

    case "x":
      // X OAuth 2.0 requer PKCE (code_challenge)
      return `https://twitter.com/i/oauth2/authorize?${params({
        response_type: "code",
        client_id: process.env.X_CLIENT_ID ?? "",
        redirect_uri: redirectUri,
        scope: "users.read tweet.read",
        state,
        code_challenge: codeChallenge ?? "",
        code_challenge_method: "S256",
      })}`

    case "strava":
      return `https://www.strava.com/oauth/authorize?${params({
        client_id: process.env.STRAVA_CLIENT_ID ?? "",
        redirect_uri: redirectUri,
        response_type: "code",
        approval_prompt: "auto",
        scope: "read,activity:read",
        state,
      })}`

    default:
      throw new Error(`Provedor desconhecido: ${provider}`)
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params
  const baseUrl = getBaseUrl(req)
  const redirectUri = `${baseUrl}/api/auth/callback/${provider}`
  const state = crypto.randomUUID()

  const response = NextResponse.redirect("about:blank") // placeholder, substituído abaixo
  let authUrl: string
  let codeVerifier: string | undefined

  if (provider === "x") {
    // PKCE: gera code_verifier e code_challenge
    codeVerifier = crypto.randomBytes(32).toString("base64url")
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url")
    authUrl = buildAuthUrl(provider as Provider, redirectUri, state, codeChallenge)
  } else {
    authUrl = buildAuthUrl(provider as Provider, redirectUri, state)
  }

  const redirect = NextResponse.redirect(authUrl)

  // Guarda state e code_verifier (X) em cookies httpOnly por 5 minutos
  redirect.cookies.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 300,
    path: "/",
  })

  if (codeVerifier) {
    redirect.cookies.set("x_code_verifier", codeVerifier, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 300,
      path: "/",
    })
  }

  return redirect
}
