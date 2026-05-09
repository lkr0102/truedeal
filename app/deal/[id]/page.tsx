import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchDeal } from "@/lib/actions/deals"
import { getMySocialConnections } from "@/lib/actions/profile"
import DealClient from "./deal-client"

export const dynamic = "force-dynamic"

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const result = await fetchDeal(id)
  if (!("deal" in result) || !result.deal) notFound()

  const connectionsResult = user ? await getMySocialConnections() : { connections: [] }
  return (
    <DealClient
      deal={result.deal}
      userId={user?.id ?? null}
      userSocialConnections={connectionsResult.connections ?? []}
    />
  )
}
