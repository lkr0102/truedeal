import { createClient } from "@/lib/supabase/server"
import { fetchStravaActivities, validateStravaRule } from "./strava"
import { fetchXUserPosts, validateXRule } from "./x"
import { analyzeEvidence } from "./sentinel-core"

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
        rawData = await fetchStravaActivities(conn.access_token, {
          after:  afterEpoch,
          before: beforeEpoch,
        })
        isSuccess = validateStravaRule(rawData, ruleType, ruleTarget)

      } else if (channel === "x") {
        rawData = await fetchXUserPosts(conn.access_token, conn.external_id)
        isSuccess = validateXRule(rawData, ruleType, ruleTarget)

      } else if (channel === "wellhub" || channel === "totalpass") {
        // Wellhub / TotalPass: validate check-in count recorded in deal_checkins
        const { count, error: checkinErr } = await (supabase.from("deal_checkins") as any)
          .select("*", { count: "exact", head: true })
          .eq("deal_id",  dealId)
          .eq("user_id",  participant.user_id)
          .eq("platform", channel)
          .gte("checked_in_at", deal.start_date)
          .lte("checked_in_at", deal.end_date)

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
