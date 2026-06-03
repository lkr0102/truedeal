import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const url  = new URL(request.url)
  const base = process.env.NEXT_PUBLIC_APP_URL ?? url.origin

  // ?next lets callers control where the callback redirects after success/error.
  // Defaults to /onboarding/profile for the onboarding flow.
  const next = url.searchParams.get("next") ?? "/onboarding/profile"

  const params = new URLSearchParams({
    client_id:       process.env.STRAVA_CLIENT_ID!,
    redirect_uri:    `${base}/api/auth/strava/callback`,
    response_type:   "code",
    approval_prompt: "auto",
    scope:           "read,profile:read_all,activity:read",
  })

  const redirect = NextResponse.redirect(
    `https://www.strava.com/oauth/authorize?${params.toString()}`,
  )

  // Store return destination in a short-lived cookie so the callback can use it
  redirect.cookies.set("strava_oauth_next", next, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 300,
    path: "/",
  })

  return redirect
}
