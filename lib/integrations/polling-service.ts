import { createClient } from "@/lib/supabase/server"
import { fetchStravaActivities, validateStravaRule } from "./strava"
import { fetchXUserPosts, validateXRule } from "./x"
import { analyzeEvidence } from "./sentinel-core"

/**
 * ⚡ DealGuard Engine: Audit Service
 * Orquestra a auditoria de acordos ativos com análise Sentinel AI.
 */

export async function auditDeal(dealId: string) {
  const supabase = await createClient()

  // 1. Fetch deal with participants and their social connections
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

  const results = []

  // 2. Iterate through participants and audit their performance
  for (const participant of deal.participants) {
    const connections = participant.profile.social_connections || []
    let isSuccess = false
    let maxRiskScore = 0
    let fraudReason = null

    for (const channel of deal.verification_channels) {
      const conn = connections.find((c: any) => c.platform === channel)
      if (!conn || !conn.access_token) continue

      let rawData = []
      if (channel === "strava") {
        rawData = await fetchStravaActivities(conn.access_token)
        isSuccess = validateStravaRule(rawData, "km_run", 10)
      } else if (channel === "x") {
        rawData = await fetchXUserPosts(conn.access_token, conn.external_id)
        isSuccess = validateXRule(rawData, "post", 1)
      }

      // 🛡️ Sentinel Integration
      const sentinel = await analyzeEvidence(channel, rawData)
      maxRiskScore = Math.max(maxRiskScore, sentinel.riskScore)
      
      if (sentinel.isFraudulent) {
        console.warn(`[Sentinel] Fraude detectada para usuário ${participant.user_id}: ${sentinel.reason}`)
        isSuccess = false // Anular sucesso se houver fraude
        fraudReason = sentinel.reason
      }

      if (isSuccess) break // Success in one channel is enough
    }

    results.push({
      user_id: participant.user_id,
      is_success: isSuccess,
      risk_score: maxRiskScore,
      fraud_reason: fraudReason
    })
  }

  return { results }
}
