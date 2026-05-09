import { createClient } from "@/lib/supabase/server"
import { fetchStravaActivities, validateStravaRule } from "./strava"
import { fetchXUserPosts, validateXRule } from "./x"

/**
 * ⚡ DealGuard Engine: Audit Service
 * Orquestra a auditoria de acordos ativos.
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

    for (const channel of deal.verification_channels) {
      const conn = connections.find((c: any) => c.platform === channel)
      if (!conn || !conn.access_token) continue

      if (channel === "strava") {
        const activities = await fetchStravaActivities(conn.access_token)
        // Mocking targetValue as 10km for now
        isSuccess = validateStravaRule(activities, "km_run", 10)
      } else if (channel === "x") {
        const posts = await fetchXUserPosts(conn.access_token, conn.external_id)
        // Mocking targetValue as 1 post for now
        isSuccess = validateXRule(posts, "post", 1)
      }

      if (isSuccess) break // Success in one channel is enough (OR logic)
    }

    results.push({
      user_id: participant.user_id,
      is_success: isSuccess
    })
  }

  return { results }
}
