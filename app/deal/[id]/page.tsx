import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { fetchDeal } from "@/lib/actions/deals"
import { getMySocialConnections } from "@/lib/actions/profile"
import { getDealCheckinStats, getDealAllCheckins, evaluateGymDealCompliance } from "@/lib/actions/checkins"
import DealClient from "./deal-client"

export const dynamic = "force-dynamic"

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const result = await fetchDeal(id)
  if (!("deal" in result) || !result.deal) return {}

  const d = result.deal
  const origin = "https://truedeal.app"
  const ogImage = `${origin}/api/og/deal/${id}`
  const title   = `${d.title} — TrueDeal`
  const desc    = `Entrada: $${d.entry_amount} · ${d.participant_count} participante(s) · Junte-se ao desafio`

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: [{ url: ogImage, width: 800, height: 420, alt: d.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [ogImage],
    },
  }
}

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

  if (isGymDeal && isActive) await evaluateGymDealCompliance(id)

  const [connectionsResult, checkinStats, allCheckins] = await Promise.all([
    user ? getMySocialConnections() : Promise.resolve({ connections: [] }),
    (isGymDeal && isActive && user && isPartic)
      ? getDealCheckinStats(id, user.id)
      : Promise.resolve(null),
    isGymDeal ? getDealAllCheckins(id) : Promise.resolve({}),
  ])

  return (
    <DealClient
      deal={result.deal}
      userId={user?.id ?? null}
      userSocialConnections={connectionsResult.connections ?? []}
      checkinStats={checkinStats}
      allCheckins={allCheckins}
    />
  )
}
