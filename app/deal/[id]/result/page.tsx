import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchDeal } from "@/lib/actions/deals"
import DealResultClient from "./result-client"

export const dynamic = "force-dynamic"

export default async function DealResultPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const result = await fetchDeal(id)
  if (!("deal" in result) || !result.deal) notFound()

  return <DealResultClient deal={result.deal} userId={user?.id ?? null} />
}
