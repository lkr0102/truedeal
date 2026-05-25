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
      `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
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
      throw new Error(`X API Error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error("Failed to fetch X posts:", error)
    return []
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

/**
 * 🔍 DealGuard Logic: Validate Rule
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
      const dayPosts = posts.filter(p => p.created_at?.startsWith(day))
      return countXMetric(dayPosts, rule) >= targetValue
    })
  }
  if (frequency === "weekly" && startDate && endDate) {
    return getWeekRanges(startDate, endDate).every(([wStart, wEnd]) => {
      const weekPosts = posts.filter(p => {
        const d = p.created_at ? p.created_at.split("T")[0] : ""
        return d >= wStart && d <= wEnd
      })
      return countXMetric(weekPosts, rule) >= targetValue
    })
  }
  return countXMetric(posts, rule) >= targetValue
}
