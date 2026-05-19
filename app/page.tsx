import { fetchDeals, sweepStaleDeals } from "@/lib/actions/deals"
import { getMyProfile } from "@/lib/actions/profile"
import { getMyWallet, getUsdcBalance } from "@/lib/actions/wallet"
import { createClient } from "@/lib/supabase/server"
import HomeClient from "./home-client"

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  await sweepStaleDeals()

  const [{ deals = [] }, { profile }, walletResult] = await Promise.all([
    fetchDeals(),
    getMyProfile(),
    getMyWallet(),
  ])

  const usdcBalance = walletResult.publicKey
    ? await getUsdcBalance(walletResult.publicKey).catch(() => 0)
    : 0

  const activeDealsValue = deals
    .filter((d: any) =>
      (d.status === "ativo" || d.status === "formacao") &&
      d.participants.some((p: any) => p.user_id === user?.id && p.status === "staked"),
    )
    .reduce((sum: number, d: any) => sum + d.entry_amount, 0)

  return (
    <HomeClient
      initialDeals={deals}
      profile={profile}
      userId={user?.id ?? null}
      usdcBalance={usdcBalance}
      activeDealsValue={activeDealsValue}
    />
  )
}
