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

function computeStravaMetric(activities: StravaActivity[], rule: string): number {
  switch (rule) {
    case "km_run":        return activities.filter(a => a.type === "Run").reduce((sum, a) => sum + a.distance / 1000, 0)
    case "workout_hours": return activities.reduce((sum, a) => sum + a.moving_time / 3600, 0)
    default:              return 0
  }
}

/**
 * 🔍 DealGuard Logic: Validate Rule
 */
export function validateStravaRule(
  activities: StravaActivity[],
  rule: string,
  targetValue: number,
  frequency?: string,
  startDate?: string,
  endDate?: string,
): boolean {
  if (frequency === "daily" && startDate && endDate) {
    return getDateRange(startDate, endDate).every(day => {
      const dayActivities = activities.filter(a => a.start_date.startsWith(day))
      return computeStravaMetric(dayActivities, rule) >= targetValue
    })
  }
  if (frequency === "weekly" && startDate && endDate) {
    return getWeekRanges(startDate, endDate).every(([wStart, wEnd]) => {
      const weekActivities = activities.filter(a => {
        const d = a.start_date.split("T")[0]
        return d >= wStart && d <= wEnd
      })
      return computeStravaMetric(weekActivities, rule) >= targetValue
    })
  }
  return computeStravaMetric(activities, rule) >= targetValue
}
