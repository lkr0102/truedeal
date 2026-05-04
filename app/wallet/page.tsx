import { getMyProfile } from "@/lib/actions/profile"
import { getTdpHistory } from "@/lib/actions/profile"
import { fetchDeals } from "@/lib/actions/deals"
import { createClient } from "@/lib/supabase/server"
import WalletClient from "./wallet-client"

export default async function WalletPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ profile }, { transactions: tdpHistory = [] }, { deals = [] }] = await Promise.all([
    getMyProfile(),
    getTdpHistory(20),
    fetchDeals(),
  ])

  // Sum entry_amount for active deals where user is a participant
  const activeDealsValue = deals
    .filter(d =>
      d.status === "ativo" &&
      d.participants.some((p: any) => p.user_id === user?.id)
    )
    .reduce((sum: number, d: any) => sum + d.entry_amount, 0)

  return (
    <WalletClient
      profile={profile}
      tdpHistory={tdpHistory}
      activeDealsValue={activeDealsValue}
    />
  )
}
