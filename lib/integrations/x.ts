/**
 * 🛰️ Evidence Bridge: X (Twitter) Fetcher
 * Responsável por coletar métricas de performance social via X API v2.
 */

export interface XPost {
  id: string
  text: string
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
      "tweet.fields": "public_metrics",
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

/**
 * 🔍 DealGuard Logic: Validate Rule
 */
export function validateXRule(posts: XPost[], rule: string, targetValue: number): boolean {
  switch (rule) {
    case "post":
      return posts.length >= targetValue

    case "impressions":
      const totalImpressions = posts.reduce((sum, p) => sum + (p.public_metrics.impression_count || 0), 0)
      return totalImpressions >= targetValue

    default:
      return false
  }
}
