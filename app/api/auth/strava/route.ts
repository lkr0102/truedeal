import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  const base = process.env.NEXT_PUBLIC_APP_URL ?? origin

  const params = new URLSearchParams({
    client_id:       process.env.STRAVA_CLIENT_ID!,
    redirect_uri:    `${base}/api/auth/strava/callback`,
    response_type:   "code",
    approval_prompt: "auto",
    scope:           "read,profile:read_all,activity:read",
  })

  return NextResponse.redirect(
    `https://www.strava.com/oauth/authorize?${params.toString()}`,
  )
}
