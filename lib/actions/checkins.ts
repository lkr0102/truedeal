"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

const GYM_CHANNELS = ["totalpass"] as const

export async function recordDealCheckin(
  dealId: string,
): Promise<{ success?: boolean; error?: string; alreadyDone?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  // Validate deal is active and uses gym verification
  const { data: deal } = await (supabase.from("deals") as any)
    .select("status, verification_channels")
    .eq("id", dealId)
    .single()

  if (!deal || deal.status !== "ativo") return { error: "Deal not active" }

  const channels: string[] = deal.verification_channels ?? []
  const hasGym = channels.some(c => GYM_CHANNELS.includes(c as any))
  if (!hasGym) return { error: "Deal does not use gym verification" }

  // Validate user is an active participant
  const { data: participant } = await (supabase.from("deal_participants") as any)
    .select("id, status")
    .eq("deal_id", dealId)
    .eq("user_id", user.id)
    .single()

  if (!participant || participant.status === "eliminated")
    return { error: "Not an active participant" }

  // Resolve which gym platform the user has connected
  const { data: conn } = await (supabase.from("social_connections") as any)
    .select("platform, member_email, status")
    .eq("user_id", user.id)
    .in("platform", GYM_CHANNELS)
    .limit(1)
    .single()

  if (!conn || !conn.member_email)
    return { error: "No gym account linked. Connect TotalPass in your profile first." }

  // Insert — UNIQUE (deal_id, user_id, date) prevents double check-in on same day
  const today = new Date().toISOString().split("T")[0]
  const { error: insertErr } = await (supabase.from("deal_checkins") as any).insert({
    deal_id:     dealId,
    user_id:     user.id,
    source:      conn.platform as string,
    activity_at: new Date().toISOString(),
    date:        today,
  })

  if (insertErr) {
    if (insertErr.code === "23505") return { alreadyDone: true }
    return { error: insertErr.message }
  }

  revalidatePath(`/deal/${dealId}`)
  return { success: true }
}

export async function getDealAllCheckins(
  dealId: string,
): Promise<Record<string, { date: string; activityAt: string }[]>> {
  const supabase = await createClient()
  const { data, error } = await (supabase.from("deal_checkins") as any)
    .select("user_id, date, activity_at")
    .eq("deal_id", dealId)
    .order("activity_at", { ascending: true })

  if (error || !data) return {}

  const grouped: Record<string, { date: string; activityAt: string }[]> = {}
  for (const row of data) {
    if (!grouped[row.user_id]) grouped[row.user_id] = []
    grouped[row.user_id].push({ date: row.date, activityAt: row.activity_at })
  }
  return grouped
}

/**
 * For active gym deals: evaluate per-period compliance from stored check-ins and
 * mark any participant who missed a completed period as 'eliminated'.
 * Called server-side at page load — idempotent, 2 DB round-trips.
 */
export async function evaluateGymDealCompliance(dealId: string): Promise<void> {
  const supabase = await createClient()

  const { data: deal } = await (supabase.from("deals") as any)
    .select("status, start_date, end_date, rule_frequency, rule_target, verification_channels, entry_amount, title")
    .eq("id", dealId)
    .single()

  if (!deal || deal.status !== "ativo") return

  const channels: string[] = deal.verification_channels ?? []
  if (!channels.some(c => GYM_CHANNELS.includes(c as any))) return

  const now      = new Date()
  const start    = new Date(deal.start_date)
  const end      = new Date(deal.end_date)
  const freq     = (deal.rule_frequency ?? "daily") as string
  const target   = (deal.rule_target ?? 1) as number

  // Build completed windows (same logic as deal-client progress tab)
  const completedWindows: { startStr: string; endStr: string }[] = []
  let cur = new Date(start)
  while (cur < end) {
    const next = new Date(cur)
    if (freq === "daily")        next.setDate(next.getDate() + 1)
    else if (freq === "weekly")  next.setDate(next.getDate() + 7)
    else if (freq === "monthly") next.setMonth(next.getMonth() + 1)
    else                         next.setTime(end.getTime())
    const windowEnd = next > end ? new Date(end) : next
    if (windowEnd <= now) {
      completedWindows.push({
        startStr: cur.toISOString().split("T")[0],
        endStr:   windowEnd.toISOString().split("T")[0],
      })
    }
    cur = new Date(windowEnd)
  }

  if (completedWindows.length === 0) return

  const { data: participants } = await (supabase.from("deal_participants") as any)
    .select("id, user_id")
    .eq("deal_id", dealId)
    .eq("status", "active")

  if (!participants?.length) return

  const { data: allCheckins } = await (supabase.from("deal_checkins") as any)
    .select("user_id, date")
    .eq("deal_id", dealId)

  // Build userId → Set<dateString>
  const byUser: Record<string, Set<string>> = {}
  for (const c of allCheckins ?? []) {
    if (!byUser[c.user_id]) byUser[c.user_id] = new Set()
    byUser[c.user_id].add(c.date)
  }

  const toEliminate: { id: string; user_id: string }[] = []
  for (const p of participants) {
    const dates = byUser[p.user_id] ?? new Set<string>()
    for (const w of completedWindows) {
      const count = [...dates].filter(d => d >= w.startStr && d < w.endStr).length
      if (count < target) {
        toEliminate.push({ id: p.id, user_id: p.user_id })
        break
      }
    }
  }

  if (toEliminate.length > 0) {
    await (supabase.from("deal_participants") as any)
      .update({ status: "eliminated" })
      .in("id", toEliminate.map(p => p.id))

    try {
      const { createNotification } = await import("@/lib/actions/notifications")
      const { createServiceClient } = await import("@/lib/supabase/server")
      const svc = await createServiceClient()
      const eliminatedIds = new Set(toEliminate.map(p => p.user_id))

      const { count: totalEver } = await (svc.from("deal_participants") as any)
        .select("id", { count: "exact", head: true }).eq("deal_id", dealId)

      const { data: stillActive } = await (svc.from("deal_participants") as any)
        .select("user_id").eq("deal_id", dealId).eq("status", "active")

      const activeCount    = Math.max(stillActive?.length ?? 1, 1)
      const totalPot       = (deal.entry_amount ?? 0) * (totalEver ?? 1)
      const expectedPrize  = (totalPot * 0.97 / activeCount).toFixed(0)
      const eliminatedCount = toEliminate.length

      for (const p of toEliminate) {
        await createNotification(svc, {
          user_id:  p.user_id, type: "deal_eliminated", deal_id: dealId,
          title_pt: "Você foi eliminado ⚡",  title_en: "You were eliminated ⚡",
          body_pt:  `Você não cumpriu os requisitos do deal "${deal.title}" e foi eliminado.`,
          body_en:  `You missed the requirements for deal "${deal.title}" and have been eliminated.`,
        })
      }

      for (const p of stillActive ?? []) {
        if (eliminatedIds.has(p.user_id)) continue
        await createNotification(svc, {
          user_id:  p.user_id, type: "deal_window_update", deal_id: dealId,
          title_pt: `${eliminatedCount} eliminado${eliminatedCount > 1 ? "s" : ""}! 💰`,
          title_en: `${eliminatedCount} eliminated! 💰`,
          body_pt:  `${eliminatedCount} participante${eliminatedCount > 1 ? "s caíram" : " caiu"} da disputa. Seu prêmio esperado agora é $${expectedPrize}!`,
          body_en:  `${eliminatedCount} participant${eliminatedCount > 1 ? "s dropped" : " dropped"} out. Your expected prize is now $${expectedPrize}!`,
        })
      }
    } catch (err: any) {
      console.error("[notifications] evaluateGymDealCompliance notify failed:", err?.message)
    }
  }
}

export async function getDealCheckinStats(
  dealId: string,
  userId: string,
): Promise<{ count: number; checkedInToday: boolean }> {
  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]

  const [{ count: total }, { count: todayCount }] = await Promise.all([
    (supabase.from("deal_checkins") as any)
      .select("*", { count: "exact", head: true })
      .eq("deal_id", dealId)
      .eq("user_id", userId),
    (supabase.from("deal_checkins") as any)
      .select("*", { count: "exact", head: true })
      .eq("deal_id", dealId)
      .eq("user_id", userId)
      .eq("checkin_date", today),
  ])

  return { count: total ?? 0, checkedInToday: (todayCount ?? 0) > 0 }
}
