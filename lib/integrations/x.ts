/**
 * 🛰️ Evidence Bridge: X (Twitter) Fetcher
 * Responsável por coletar métricas de performance social via X API v2.
 */

import type { createServiceClient } from "@/lib/supabase/server"

export async function refreshXToken(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  connectionId: string,
  refreshToken: string,
): Promise<string | null> {
  try {
    const credentials = Buffer.from(
      `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
    ).toString("base64")
    const res = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type:    "refresh_token",
        refresh_token: refreshToken,
      }),
    })
    if (!res.ok) return null
    const { access_token, refresh_token, expires_in } = await res.json()
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString()
    await (supabase.from("social_connections") as any)
      .update({ access_token, refresh_token, token_expires_at: expiresAt })
      .eq("id", connectionId)
    return access_token
  } catch {
    return null
  }
}

export interface XPost {
  id: string
  text: string
  created_at?: string
  public_metrics: {
    retweet_count: number
    reply_count: number
    like_count: number
    quote_count: number
    impression_count?: number
  }
}

export interface XFetchOptions {
  startTime?: string  // ISO 8601, e.g. "2025-01-01T00:00:00Z"
  endTime?:   string  // ISO 8601
}

export async function fetchXUserPosts(
  accessToken: string,
  userId: string,
  options: XFetchOptions = {},
): Promise<XPost[]> {
  const { data } = await fetchXUserPostsSafe(accessToken, userId, options)
  return data
}

export async function fetchXUserPostsSafe(
  accessToken: string,
  userId: string,
  options: XFetchOptions = {},
): Promise<{ data: XPost[]; error: string | null }> {
  try {
    const params = new URLSearchParams({
      "tweet.fields": "public_metrics,created_at",
      max_results:    "100",
    })
    if (options.startTime) params.set("start_time", options.startTime)
    if (options.endTime)   params.set("end_time",   options.endTime)

    const response = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!response.ok) {
      const msg = `X API Error ${response.status}: ${response.statusText}`
      console.error("Failed to fetch X posts:", msg)
      return { data: [], error: msg }
    }

    const json = await response.json()
    return { data: json.data || [], error: null }
  } catch (err: any) {
    const msg = err?.message ?? "unknown error"
    console.error("Failed to fetch X posts:", msg)
    return { data: [], error: msg }
  }
}

function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const cur = new Date(startDate + "T00:00:00Z")
  const end = new Date(endDate + "T00:00:00Z")
  while (cur <= end) {
    dates.push(cur.toISOString().split("T")[0])
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return dates
}

function getWeekRanges(startDate: string, endDate: string): [string, string][] {
  const weeks: [string, string][] = []
  const cur = new Date(startDate + "T00:00:00Z")
  const end = new Date(endDate + "T00:00:00Z")
  while (cur <= end) {
    const wStart = cur.toISOString().split("T")[0]
    const wEnd = new Date(Math.min(cur.getTime() + 6 * 86400000, end.getTime())).toISOString().split("T")[0]
    weeks.push([wStart, wEnd])
    cur.setUTCDate(cur.getUTCDate() + 7)
  }
  return weeks
}

function countXMetric(posts: XPost[], rule: string): number {
  switch (rule) {
    case "post":        return posts.length
    case "impressions": return posts.reduce((sum, p) => sum + (p.public_metrics.impression_count || 0), 0)
    default:            return 0
  }
}

const DAY_MS = 24 * 60 * 60 * 1000

// UTC-3 (BRT) day window: 00:00 BRT = 03:00 UTC, 23:59:59.999 BRT = 02:59:59.999 UTC next day.
function dayWindowBRT(dateStr: string): [number, number] {
  const start = new Date(dateStr + "T03:00:00Z").getTime()
  return [start, start + DAY_MS - 1]
}

/**
 * 🔍 DealGuard Logic: Validate Rule
 * All windows use UTC-3 (BRT) as the platform timezone standard.
 */
export function validateXRule(
  posts: XPost[],
  rule: string,
  targetValue: number,
  frequency?: string,
  startDate?: string,
  endDate?: string,
): boolean {
  if (frequency === "daily" && startDate && endDate) {
    return getDateRange(startDate, endDate).every(day => {
      const [wStart, wEnd] = dayWindowBRT(day)
      const dayPosts = posts.filter(p => {
        if (!p.created_at) return false
        const t = new Date(p.created_at).getTime()
        return t >= wStart && t <= wEnd
      })
      return countXMetric(dayPosts, rule) >= targetValue
    })
  }
  if (frequency === "weekly" && startDate && endDate) {
    return getWeekRanges(startDate, endDate).every(([wStart, wEnd]) => {
      const windowStart = new Date(wStart + "T03:00:00Z").getTime()
      const endDt = new Date(wEnd + "T02:59:59.999Z")
      endDt.setUTCDate(endDt.getUTCDate() + 1)
      const windowEnd = endDt.getTime()
      const weekPosts = posts.filter(p => {
        if (!p.created_at) return false
        const t = new Date(p.created_at).getTime()
        return t >= windowStart && t <= windowEnd
      })
      return countXMetric(weekPosts, rule) >= targetValue
    })
  }
  return countXMetric(posts, rule) >= targetValue
}
