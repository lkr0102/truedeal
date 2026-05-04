import { getMyProfile, getTdpHistory } from "@/lib/actions/profile"
import { fetchDeals } from "@/lib/actions/deals"
import { getMyWallet, getSolBalance, ensureUserWallet } from "@/lib/actions/wallet"
import { createClient } from "@/lib/supabase/server"
import WalletClient from "./wallet-client"

export default async function WalletPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { profile },
    { transactions: tdpHistory = [] },
    { deals = [] },
  ] = await Promise.all([
    getMyProfile(),
    getTdpHistory(20),
    fetchDeals(),
  ])

  // Ensure the user has a managed wallet (fallback if auth callback was skipped)
  let { publicKey: managedPublicKey } = await getMyWallet()
  if (!managedPublicKey) {
    const created = await ensureUserWallet()
    managedPublicKey = created.publicKey
  }

  // Fetch SOL balance server-side from Solana RPC
  const solBalance = managedPublicKey ? await getSolBalance(managedPublicKey) : 0

  const activeDealsValue = deals
    .filter((d: any) =>
      d.status === "ativo" &&
      d.participants.some((p: any) => p.user_id === user?.id),
    )
    .reduce((sum: number, d: any) => sum + d.entry_amount, 0)

  return (
    <WalletClient
      profile={profile}
      tdpHistory={tdpHistory}
      activeDealsValue={activeDealsValue}
      managedPublicKey={managedPublicKey}
      solBalance={solBalance}
    />
  )
}
