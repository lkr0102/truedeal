import { createServiceClient } from "@/lib/supabase/server"
import { fetchStravaActivitiesSafe, validateStravaRule } from "./strava"
import { fetchXUserPostsSafe, refreshXToken, validateXRule } from "./x"
import { analyzeEvidence } from "./sentinel-core"

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

async function refreshStravaToken(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  connectionId: string,
  refreshToken: string,
): Promise<string | null> {
  try {
    const res = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id:     process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type:    "refresh_token",
        refresh_token: refreshToken,
      }),
    })
    if (!res.ok) return null
    const { access_token, refresh_token, expires_at } = await res.json()
    await (supabase.from("social_connections") as any)
      .update({ access_token, refresh_token, token_expires_at: new Date(expires_at * 1000).toISOString() })
      .eq("id", connectionId)
    return access_token
  } catch {
    return null
  }
}

/**
 * ⚡ DealGuard Engine: Audit Service
 * Orquestra a auditoria de acordos ativos com análise Sentinel AI.
 *
 * For each participant it:
 *  1. Fetches raw evidence from every verification channel
 *  2. Filters evidence to the deal's start_date → end_date window
 *  3. Validates against the configured rule (verification_type) and target (rule_target)
 *  4. Runs Sentinel-01 fraud detection
 */

export async function auditDeal(dealId: string) {
  const supabase = await createServiceClient()

  // 1. Fetch deal (including rule config) with participants and their social connections
  const { data: deal, error: dealErr } = await (supabase.from("deals") as any)
    .select(`
      *,
      participants:deal_participants(
        *,
        profile:profiles(
          *,
          social_connections(*)
        )
      )
    `)
    .eq("id", dealId)
    .single()

  if (dealErr || !deal) return { error: "Deal not found" }
  if (deal.status !== "ativo") return { error: "Deal is not active" }

  // UTC-3 (BRT) is the platform standard.
  // Day boundary: 00:00 BRT = 03:00 UTC, 23:59:59 BRT = 02:59:59 UTC next day.
  const afterEpoch = deal.start_date
    ? Math.floor(new Date(deal.start_date + "T03:00:00Z").getTime() / 1000)
    : undefined
  let beforeEpoch: number | undefined
  if (deal.end_date) {
    const dt = new Date(deal.end_date + "T02:59:59Z")
    dt.setUTCDate(dt.getUTCDate() + 1)
    beforeEpoch = Math.floor(dt.getTime() / 1000)
  }

  // Fallback: if rule_target was never persisted (legacy deal), use safe defaults
  const ruleTarget: number    = deal.rule_target    ?? 1
  const ruleType:   string    = deal.verification_type ?? ""

  const results = []

  // fitness_connector: "e" (AND — all channels must pass) | "ou" (OR — any channel suffices)
  const fitnessConnector: string = deal.fitness_connector ?? "ou"

  // 2. Iterate through participants and audit their performance
  for (const participant of deal.participants) {
    const connections = participant.profile?.social_connections || []
    let isSuccess = false
    let maxRiskScore = 0
    let fraudReason: string | null = null
    let apiError: string | null = null

    // Per-channel results — combined at the end via fitness_connector
    const channelResults: boolean[] = []

    for (const channel of deal.verification_channels) {
      const conn = connections.find((c: any) => c.platform === channel)
      if (!conn || !conn.access_token) {
        // Channel not connected → failure for this channel
        channelResults.push(false)
        continue
      }

      let rawData: any[] = []
      let channelSuccess = false

      if (channel === "strava") {
        let token = conn.access_token
        // token_expires_at is stored as ISO string (TIMESTAMPTZ) — convert to unix seconds
        const expiresAt = conn.token_expires_at
          ? new Date(conn.token_expires_at).getTime() / 1000
          : 0
        if (expiresAt > 0 && Date.now() / 1000 > expiresAt - 300 && conn.refresh_token) {
          token = (await refreshStravaToken(supabase, conn.id, conn.refresh_token)) ?? token
        }
        const stravaResult = await fetchStravaActivitiesSafe(token, {
          after:  afterEpoch,
          before: beforeEpoch,
        })
        if (stravaResult.error) {
          console.error(`[DealGuard] Strava API fetch failed for participant ${participant.user_id}: ${stravaResult.error}`)
          apiError = stravaResult.error
          channelResults.push(false)
          continue
        }
        rawData = stravaResult.data
        channelSuccess = validateStravaRule(rawData, ruleType, ruleTarget, deal.rule_frequency, deal.start_date, deal.end_date)

      } else if (channel === "x") {
        let xToken = conn.access_token
        const xExpiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() / 1000 : 0
        const tokenExpired = xExpiresAt > 0 && Date.now() / 1000 > xExpiresAt - 300
        const appBearerToken = process.env.X_BEARER_TOKEN

        if (tokenExpired && conn.refresh_token) {
          xToken = (await refreshXToken(supabase, conn.id, conn.refresh_token)) ?? xToken
        } else if (tokenExpired && !conn.refresh_token && appBearerToken) {
          // No refresh token (app is Public client on X dev portal — refresh tokens not issued).
          // Bearer token works for public accounts and doesn't expire.
          console.warn(`[DealGuard] X token expired for ${participant.user_id}, no refresh token — using app bearer token`)
          xToken = appBearerToken
        }

        const startTime = deal.start_date
          ? new Date(deal.start_date + "T03:00:00Z").toISOString()
          : undefined
        // end_time: 23:59:59 BRT = 02:59:59Z of the following day
        let endTime: string | undefined
        if (deal.end_date) {
          const endDt = new Date(deal.end_date + "T02:59:59.999Z")
          endDt.setUTCDate(endDt.getUTCDate() + 1)
          endTime = endDt.toISOString()
        }

        let xResult = await fetchXUserPostsSafe(xToken, conn.external_id, { startTime, endTime })
        if (xResult.error && appBearerToken && xToken !== appBearerToken) {
          // Last resort: user token failed at runtime — retry with app bearer token
          console.warn(`[DealGuard] X user token failed for ${participant.user_id} (${xResult.error}), retrying with app bearer token`)
          const fallback = await fetchXUserPostsSafe(appBearerToken, conn.external_id, { startTime, endTime })
          if (!fallback.error) xResult = fallback
        }
        if (xResult.error) {
          console.error(`[DealGuard] X API fetch failed for participant ${participant.user_id}: ${xResult.error}`)
          apiError = xResult.error
          channelResults.push(false)
          continue
        }
        rawData = xResult.data
        channelSuccess = validateXRule(rawData, ruleType, ruleTarget, deal.rule_frequency, deal.start_date, deal.end_date)

      } else if (channel === "totalpass") {
        // UTC-3: query window matches day boundaries in BRT
        const tpStartIso = deal.start_date
          ? new Date(deal.start_date + "T03:00:00Z").toISOString()
          : deal.start_date
        let tpEndIso = deal.end_date
        if (deal.end_date) {
          const dt = new Date(deal.end_date + "T02:59:59.999Z")
          dt.setUTCDate(dt.getUTCDate() + 1)
          tpEndIso = dt.toISOString()
        }
        const { data: checkins, error: checkinErr } = await (supabase.from("deal_checkins") as any)
          .select("activity_at")
          .eq("deal_id",    dealId)
          .eq("user_id",    participant.user_id)
          .eq("source",     channel)
          .gte("activity_at", tpStartIso)
          .lte("activity_at", tpEndIso)

        if (!checkinErr && checkins) {
          rawData = checkins
          const DAY_MS = 24 * 60 * 60 * 1000
          if (deal.rule_frequency === "daily" && deal.start_date && deal.end_date) {
            channelSuccess = getDateRange(deal.start_date, deal.end_date).every(day => {
              const wStart = new Date(day + "T03:00:00Z").getTime()
              const wEnd   = wStart + DAY_MS - 1
              return checkins.filter((c: any) => {
                const t = new Date(c.activity_at).getTime()
                return t >= wStart && t <= wEnd
              }).length >= ruleTarget
            })
          } else if (deal.rule_frequency === "weekly" && deal.start_date && deal.end_date) {
            channelSuccess = getWeekRanges(deal.start_date, deal.end_date).every(([wStart, wEnd]) => {
              const windowStart = new Date(wStart + "T03:00:00Z").getTime()
              const endDt = new Date(wEnd + "T02:59:59.999Z")
              endDt.setUTCDate(endDt.getUTCDate() + 1)
              const windowEnd = endDt.getTime()
              return checkins.filter((c: any) => {
                const t = new Date(c.activity_at).getTime()
                return t >= windowStart && t <= windowEnd
              }).length >= ruleTarget
            })
          } else {
            channelSuccess = checkins.length >= ruleTarget
          }
        }
      }

      // 🛡️ Sentinel-01 fraud detection
      if (rawData.length > 0) {
        const sentinel = await analyzeEvidence(channel, rawData)
        maxRiskScore = Math.max(maxRiskScore, sentinel.riskScore)

        if (sentinel.isFraudulent) {
          console.warn(`[Sentinel] Fraude detectada para usuário ${participant.user_id}: ${sentinel.reason}`)
          channelSuccess = false
          fraudReason = sentinel.reason
        }
      }

      channelResults.push(channelSuccess)
    }

    // Combine channel results according to fitness_connector
    if (channelResults.length === 0) {
      isSuccess = false
    } else if (fitnessConnector === "e") {
      isSuccess = channelResults.every(r => r)
    } else {
      isSuccess = channelResults.some(r => r)
    }

    results.push({
      user_id:      participant.user_id,
      is_success:   isSuccess,
      risk_score:   maxRiskScore,
      fraud_reason: fraudReason,
      ...(apiError && !isSuccess ? { api_error: apiError } : {}),
    })
  }

  return { results }
}
