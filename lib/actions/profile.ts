"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { Profile, TdpTransaction } from "@/lib/supabase/types"

// ── Fetch current user profile ────────────────────────────────────────────────

export async function getMyProfile(): Promise<{ profile: Profile | null; error?: string }> {
  const supabase = await createClient()
  const isPlaceholder = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("seu-projeto")

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { profile: null, error: "Não autenticado" }

  if (isPlaceholder && user.id === "demo-lukas-admin-uuid") {
    return {
      profile: {
        id: user.id,
        username: "lukas_admin",
        display_name: "Lukas Admin",
        avatar_url: "/images/avatars/lukas.png",
        tdp_points: 2500,
        streak_days: 12,
        last_checkin: new Date().toISOString(),
        super_deal_used: true,
        referral_code: "LUKAS-DEMO",
        referred_by: null,
        referral_count: 5,
        created_at: new Date().toISOString(),
      }
    }
  }

  const { data, error } = await (supabase.from("profiles") as any)
    .select("*")
    .eq("id", user.id)
    .single()

  return { profile: (data ?? null) as Profile | null, error: (error as any)?.message }
}

// ── Fetch any profile by username ─────────────────────────────────────────────

export async function getProfileByUsername(username: string) {
  const supabase = await createClient()

  const { data, error } = await (supabase.from("profiles") as any)
    .select("*")
    .eq("username", username)
    .single()

  return { profile: (data ?? null) as Profile | null, error: (error as any)?.message }
}

// ── Leaderboard user type ─────────────────────────────────────────────────────

export interface HofUser {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  tdp_points: number
  streak_days: number
  total_deals: number
  wins: number
  losses: number
  win_rate: number   // 0–100
  pnl_amount: number // BRL
  pnl_pct: number    // percentage
}

// ── Leaderboard — profiles + deal stats ──────────────────────────────────────

export async function getLeaderboard(limit = 50): Promise<{ users: HofUser[] }> {
  const supabase = await createClient()

  const { data: profiles } = await (supabase.from("profiles") as any)
    .select("id, username, display_name, avatar_url, tdp_points, streak_days")
    .order("tdp_points", { ascending: false })
    .limit(limit)

  if (!profiles?.length) return { users: [] }

  const userIds: string[] = (profiles as any[]).map((p: any) => p.id)

  // All deal participations for these users
  const { data: participations } = await (supabase.from("deal_participants") as any)
    .select("user_id, deal_id, status")
    .in("user_id", userIds)

  const rawDealIds: string[] = ((participations ?? []) as any[]).map((p: any) => p.deal_id)
  const dealIds = [...new Set(rawDealIds)]

  let dealMap: Record<string, { entry_amount: number; fee_pct: number }> = {}
  let countMap: Record<string, number> = {}

  if (dealIds.length > 0) {
    const { data: deals } = await (supabase.from("deals") as any)
      .select("id, entry_amount, fee_pct")
      .in("id", dealIds)
      .in("status", ["finalizado", "encerrado"])

    for (const d of (deals ?? []) as any[]) dealMap[d.id] = d

    const completedIds = Object.keys(dealMap)
    if (completedIds.length > 0) {
      const { data: allParts } = await (supabase.from("deal_participants") as any)
        .select("deal_id")
        .in("deal_id", completedIds)
      for (const p of (allParts ?? []) as any[]) {
        countMap[p.deal_id] = (countMap[p.deal_id] ?? 0) + 1
      }
    }
  }

  const statsMap: Record<string, { total: number; wins: number; losses: number; pnl: number; invested: number }> = {}

  for (const p of (participations ?? []) as any[]) {
    const deal = dealMap[p.deal_id]
    if (!deal) continue
    const count = countMap[p.deal_id] ?? 1
    const fee = deal.fee_pct / 100
    if (!statsMap[p.user_id]) statsMap[p.user_id] = { total: 0, wins: 0, losses: 0, pnl: 0, invested: 0 }
    const s = statsMap[p.user_id]
    s.total++
    s.invested += deal.entry_amount
    if (p.status === "winner") { s.wins++; s.pnl += (count - 1) * deal.entry_amount * fee }
    else if (p.status === "eliminated") { s.losses++; s.pnl -= deal.entry_amount * fee }
  }

  const users: HofUser[] = (profiles as any[]).map((p: any) => {
    const s = statsMap[p.id] ?? { total: 0, wins: 0, losses: 0, pnl: 0, invested: 0 }
    return {
      id: p.id, username: p.username, display_name: p.display_name,
      avatar_url: p.avatar_url, tdp_points: p.tdp_points, streak_days: p.streak_days,
      total_deals: s.total, wins: s.wins, losses: s.losses,
      win_rate: s.total > 0 ? Math.round(s.wins / s.total * 1000) / 10 : 0,
      pnl_amount: Math.round(s.pnl * 100) / 100,
      pnl_pct: s.invested > 0 ? Math.round(s.pnl / s.invested * 1000) / 10 : 0,
    }
  })

  return { users }
}

// ── Daily check-in ────────────────────────────────────────────────────────────

export async function doCheckin() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado" }

  const today = new Date().toISOString().split("T")[0]

  const { error } = await (supabase.from("daily_checkins") as any)
    .insert({ user_id: user.id, date: today })

  if (error) {
    if ((error as any).code === "23505") return { error: "Check-in já realizado hoje" }
    return { error: (error as any).message }
  }

  revalidatePath("/explore")
  return { success: true }
}

// ── Update profile ────────────────────────────────────────────────────────────

export async function updateProfile(updates: { display_name?: string; username?: string; avatar_url?: string }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado" }

  const { error } = await (supabase.from("profiles") as any)
    .update(updates)
    .eq("id", user.id)

  if (error) return { error: (error as any).message }

  revalidatePath("/profile")
  return { success: true }
}

// ── Social connections ────────────────────────────────────────────────────────

export async function getMySocialConnections() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { connections: [] }

  const { data } = await (supabase.from("social_connections") as any)
    .select("platform, status, username, member_email, external_id")
    .eq("user_id", user.id)

  return { connections: (data ?? []) as { platform: string; status: string; username: string | null; member_email: string | null; external_id: string | null }[] }
}

export async function saveMembershipEmail(platform: "wellhub" | "totalpass", memberEmail: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado" }

  const { error } = await (supabase.from("social_connections") as any).upsert(
    { user_id: user.id, platform, status: "pending", member_email: memberEmail },
    { onConflict: "user_id,platform" },
  )

  if (error) return { error: (error as any).message }
  revalidatePath("/onboarding/profile")
  return { success: true }
}

// ── TDP history ───────────────────────────────────────────────────────────────

export async function getTdpHistory(limit = 30) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { transactions: [], error: "Não autenticado" }

  const { data, error } = await (supabase.from("tdp_transactions") as any)
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)

  return { transactions: (data ?? []) as TdpTransaction[], error: (error as any)?.message }
}
