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

export async function fetchXUserPosts(accessToken: string, userId: string): Promise<XPost[]> {
  try {
    const response = await fetch(`https://api.twitter.com/2/users/${userId}/tweets?tweet.fields=public_metrics`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

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
