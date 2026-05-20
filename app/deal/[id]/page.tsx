import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchDeal } from "@/lib/actions/deals"
import { getMySocialConnections } from "@/lib/actions/profile"
import { getDealCheckinStats } from "@/lib/actions/checkins"
import DealClient from "./deal-client"

export const dynamic = "force-dynamic"

const GYM_CHANNELS = ["wellhub", "totalpass"]

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

  const isGymDeal = (result.deal.verification_channels ?? []).some(c => GYM_CHANNELS.includes(c))
  const isActive  = result.deal.status === "ativo"
  const isPartic  = user ? result.deal.participants.some((p: any) => p.user_id === user.id) : false

  const [connectionsResult, checkinStats] = await Promise.all([
    user ? getMySocialConnections() : Promise.resolve({ connections: [] }),
    (isGymDeal && isActive && user && isPartic)
      ? getDealCheckinStats(id, user.id)
      : Promise.resolve(null),
  ])

  return (
    <DealClient
      deal={result.deal}
      userId={user?.id ?? null}
      userSocialConnections={connectionsResult.connections ?? []}
      checkinStats={checkinStats}
    />
  )
}
