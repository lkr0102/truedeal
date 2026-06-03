import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get("code")
  const error = searchParams.get("error")

  // Read the return destination set by the initiation route; clear it after use
  const nextPath    = request.cookies.get("strava_oauth_next")?.value ?? "/onboarding/profile"
  const base        = process.env.NEXT_PUBLIC_APP_URL ?? origin
  const redirectBase = `${base}${nextPath}`

  if (error || !code) {
    const res = NextResponse.redirect(`${redirectBase}?social_error=strava_denied`)
    res.cookies.delete("strava_oauth_next")
    return res
  }

  // Exchange authorization code for access token
  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id:     process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  })

  if (!tokenRes.ok) {
    const res = NextResponse.redirect(`${redirectBase}?social_error=strava_token`)
    res.cookies.delete("strava_oauth_next")
    return res
  }

  const token = await tokenRes.json()
  const athlete = token.athlete ?? {}

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  await (supabase.from("social_connections") as any).upsert(
    {
      user_id:          user.id,
      platform:         "strava",
      status:           "connected",
      external_id:      String(athlete.id ?? ""),
      username:         athlete.username ?? athlete.firstname ?? null,
      access_token:     token.access_token,
      refresh_token:    token.refresh_token,
      token_expires_at: token.expires_at
        ? new Date(token.expires_at * 1000).toISOString()
        : null,
      metadata: {
        firstname:    athlete.firstname,
        lastname:     athlete.lastname,
        profile:      athlete.profile_medium ?? athlete.profile,
        city:         athlete.city,
        country:      athlete.country,
      },
    },
    { onConflict: "user_id,platform" },
  )

  const res = NextResponse.redirect(`${redirectBase}?social_connected=strava`)
  res.cookies.delete("strava_oauth_next")
  return res
}
