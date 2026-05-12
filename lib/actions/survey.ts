"use server"

import { createClient } from "@/lib/supabase/server"

export async function saveSurveyResponses(answers: Record<string, string | string[]>) {
  try {
    const supabase  = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Upsert into profiles as a JSON blob — graceful if column doesn't exist yet.
    await (supabase.from("profiles") as any)
      .update({ survey_data: answers, survey_completed: true })
      .eq("id", user.id)
  } catch {
    // Non-blocking — survey save failure must never break the onboarding flow.
  }
}
