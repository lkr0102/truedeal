"use server"

import type { createServiceClient } from "@/lib/supabase/server"

export interface CreateNotificationInput {
  user_id:  string
  type:     string
  deal_id?: string | null
  title_pt: string
  title_en: string
  body_pt:  string
  body_en:  string
}

// Receives the service client as a parameter so callers can reuse an existing
// instance without instantiating a second one per notification.
// Errors are swallowed — notification failures never propagate to the caller.
export async function createNotification(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  input: CreateNotificationInput,
): Promise<void> {
  try {
    await (supabase.from("notifications") as any).insert({
      user_id:  input.user_id,
      type:     input.type,
      deal_id:  input.deal_id ?? null,
      title_pt: input.title_pt,
      title_en: input.title_en,
      body_pt:  input.body_pt,
      body_en:  input.body_en,
    })
  } catch (err: any) {
    console.error("[notifications] createNotification failed:", err?.message ?? err)
  }
}
