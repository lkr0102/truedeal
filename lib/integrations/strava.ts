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

export async function fetchStravaActivities(accessToken: string): Promise<StravaActivity[]> {
  try {
    const response = await fetch("https://www.strava.com/api/v3/athlete/activities", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

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
    case "km_run":
      const totalKm = activities
        .filter(a => a.type === "Run")
        .reduce((sum, a) => sum + (a.distance / 1000), 0)
      return totalKm >= targetValue

    case "workout_hours":
      const totalHours = activities.reduce((sum, a) => sum + (a.moving_time / 3600), 0)
      return totalHours >= targetValue

    default:
      return false
  }
}
