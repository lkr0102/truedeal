/**
 * 🛰️ Evidence Bridge: Strava Fetcher
 * Responsável por coletar métricas de performance física via Strava API.
 */

export interface StravaActivity {
  id: number
  type: string
  distance: number // meters
  moving_time: number // seconds
  start_date: string
}

export interface StravaFetchOptions {
  /** Unix epoch (seconds) — only return activities after this timestamp */
  after?: number
  /** Unix epoch (seconds) — only return activities before this timestamp */
  before?: number
}

export async function fetchStravaActivities(
  accessToken: string,
  options: StravaFetchOptions = {},
): Promise<StravaActivity[]> {
  try {
    const params = new URLSearchParams({ per_page: "200" })
    if (options.after  !== undefined) params.set("after",  String(options.after))
    if (options.before !== undefined) params.set("before", String(options.before))

    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!response.ok) {
      throw new Error(`Strava API Error: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Failed to fetch Strava activities:", error)
    return []
  }
}

/**
 * 🔍 DealGuard Logic: Validate Rule
 */
export function validateStravaRule(activities: StravaActivity[], rule: string, targetValue: number): boolean {
  switch (rule) {
    case "km_run": {
      const totalKm = activities
        .filter(a => a.type === "Run")
        .reduce((sum, a) => sum + (a.distance / 1000), 0)
      return totalKm >= targetValue
    }
    case "workout_hours": {
      const totalHours = activities.reduce((sum, a) => sum + (a.moving_time / 3600), 0)
      return totalHours >= targetValue
    }
    default:
      return false
  }
}
