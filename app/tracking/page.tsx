import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchDeal } from "@/lib/actions/deals"
import TrackingClient from "./tracking-client"

export default async function TrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await searchParams
  if (!id) redirect("/")

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const result = await fetchDeal(id)
  const deal   = "deal" in result ? result.deal ?? null : null

  return <TrackingClient deal={deal} userId={user?.id ?? null} />
}
