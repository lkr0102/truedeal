import { createClient } from "@/lib/supabase/server"
import { fetchStravaActivities, validateStravaRule } from "./strava"
import { fetchXUserPosts, validateXRule } from "./x"
import { analyzeEvidence } from "./sentinel-core"

async function refreshStravaToken(
  supabase: Awaited<ReturnType<typeof createClient>>,
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
  const supabase = await createClient()

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

  // Convert deal period to Unix epoch for Strava / date-based APIs
  const afterEpoch  = deal.start_date ? Math.floor(new Date(deal.start_date).getTime() / 1000) : undefined
  const beforeEpoch = deal.end_date   ? Math.floor(new Date(deal.end_date  ).getTime() / 1000) + 86399 : undefined

  // Fallback: if rule_target was never persisted (legacy deal), use safe defaults
  const ruleTarget: number    = deal.rule_target    ?? 1
  const ruleType:   string    = deal.verification_type ?? ""

  const results = []

  // 2. Iterate through participants and audit their performance
  for (const participant of deal.participants) {
    const connections = participant.profile.social_connections || []
    let isSuccess = false
    let maxRiskScore = 0
    let fraudReason: string | null = null

    for (const channel of deal.verification_channels) {
      const conn = connections.find((c: any) => c.platform === channel)
      if (!conn || !conn.access_token) continue

      let rawData: any[] = []

      if (channel === "strava") {
        let token = conn.access_token
        // Refresh if expired (token_expires_at is a unix timestamp)
        const expiresAt = conn.token_expires_at ? Number(conn.token_expires_at) : 0
        if (expiresAt > 0 && Date.now() / 1000 > expiresAt - 300 && conn.refresh_token) {
          token = (await refreshStravaToken(supabase, conn.id, conn.refresh_token)) ?? token
        }
        rawData = await fetchStravaActivities(token, {
          after:  afterEpoch,
          before: beforeEpoch,
        })
        isSuccess = validateStravaRule(rawData, ruleType, ruleTarget)

      } else if (channel === "x") {
        const startTime = deal.start_date ? new Date(deal.start_date).toISOString() : undefined
        const endTime   = deal.end_date   ? new Date(deal.end_date).toISOString()   : undefined
        rawData = await fetchXUserPosts(conn.access_token, conn.external_id, { startTime, endTime })
        isSuccess = validateXRule(rawData, ruleType, ruleTarget)

      } else if (channel === "wellhub" || channel === "totalpass") {
        // Wellhub / TotalPass: validate check-in count recorded in deal_checkins
        const { count, error: checkinErr } = await (supabase.from("deal_checkins") as any)
          .select("*", { count: "exact", head: true })
          .eq("deal_id",    dealId)
          .eq("user_id",    participant.user_id)
          .eq("source",     channel)
          .gte("activity_at", deal.start_date)
          .lte("activity_at", deal.end_date)

        if (!checkinErr) {
          isSuccess = (count ?? 0) >= ruleTarget
          rawData = [{ checkin_count: count ?? 0 }]
        }
      }

      // 🛡️ Sentinel-01 fraud detection
      if (rawData.length > 0) {
        const sentinel = await analyzeEvidence(channel, rawData)
        maxRiskScore = Math.max(maxRiskScore, sentinel.riskScore)

        if (sentinel.isFraudulent) {
          console.warn(`[Sentinel] Fraude detectada para usuário ${participant.user_id}: ${sentinel.reason}`)
          isSuccess = false
          fraudReason = sentinel.reason
        }
      }

      if (isSuccess) break // Success in one channel is sufficient
    }

    results.push({
      user_id:      participant.user_id,
      is_success:   isSuccess,
      risk_score:   maxRiskScore,
      fraud_reason: fraudReason,
    })
  }

  return { results }
}
