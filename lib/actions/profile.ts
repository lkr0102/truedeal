"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { Profile, TdpTransaction } from "@/lib/supabase/types"

// ── Fetch current user profile ────────────────────────────────────────────────

export async function getMyProfile(): Promise<{ profile: Profile | null; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { profile: null, error: "Não autenticado" }

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

// ── Hall of Fame — top users by TDP ──────────────────────────────────────────

export async function getHallOfFame(limit = 20) {
  const supabase = await createClient()

  const { data, error } = await (supabase.from("profiles") as any)
    .select("id, username, display_name, avatar_url, tdp_points, streak_days")
    .order("tdp_points", { ascending: false })
    .limit(limit)

  return { profiles: (data ?? []) as Profile[], error: (error as any)?.message }
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
