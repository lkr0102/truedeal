"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

const GYM_CHANNELS = ["wellhub", "totalpass"] as const

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
    return { error: "No gym account linked. Connect Wellhub or TotalPass in your profile first." }

  // Insert — UNIQUE (deal_id, user_id, checkin_date) prevents double check-in on same day
  const today = new Date().toISOString().split("T")[0]
  const { error: insertErr } = await (supabase.from("deal_checkins") as any).insert({
    deal_id:      dealId,
    user_id:      user.id,
    source:       conn.platform as string,
    activity_at:  new Date().toISOString(),
    checkin_date: today,
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
    .select("user_id, checkin_date, activity_at")
    .eq("deal_id", dealId)
    .order("activity_at", { ascending: true })

  if (error || !data) return {}

  const grouped: Record<string, { date: string; activityAt: string }[]> = {}
  for (const row of data) {
    if (!grouped[row.user_id]) grouped[row.user_id] = []
    grouped[row.user_id].push({ date: row.checkin_date, activityAt: row.activity_at })
  }
  return grouped
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
