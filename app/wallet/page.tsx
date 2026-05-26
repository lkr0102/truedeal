import { getMyProfile, getTdpHistory } from "@/lib/actions/profile"
import { fetchDeals } from "@/lib/actions/deals"
import { getMyWallet, getSolBalance, getUsdcBalance, ensureUserWallet } from "@/lib/actions/wallet"
import { createClient } from "@/lib/supabase/server"
import WalletClient from "./wallet-client"

export const dynamic    = "force-dynamic"
export const maxDuration = 60

async function fetchSolUsdPrice(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { next: { revalidate: 60 } },
    )
    const data = await res.json()
    return data?.solana?.usd ?? 150
  } catch {
    return 150 // fallback price
  }
}

export default async function WalletPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { profile },
    { transactions: tdpHistory = [] },
    { deals = [] },
    solUsdPrice,
  ] = await Promise.all([
    getMyProfile(),
    getTdpHistory(30),
    fetchDeals(),
    fetchSolUsdPrice(),
  ])

  // For users who authenticated via their own Solana wallet (Phantom/Solflare),
  // their actual public key is stored in user metadata — use it directly.
  const externalWalletAddress = (user?.user_metadata?.wallet_address as string | undefined) ?? null
  const isExternalWallet = !!externalWalletAddress

  let managedPublicKey: string | null = null
  let walletError: string | undefined
  if (!isExternalWallet) {
    try {
      const existing = await getMyWallet()
      managedPublicKey = existing.publicKey
      if (!managedPublicKey) {
        const created = await ensureUserWallet()
        managedPublicKey = created.publicKey
        if (!managedPublicKey) {
          walletError = created.error ?? "Não foi possível gerar sua carteira"
          console.error("[wallet/page] ensureUserWallet failed:", walletError)
        }
      }
    } catch (err: any) {
      walletError = err.message ?? "Não foi possível gerar sua carteira"
      console.error("[wallet/page] wallet provisioning failed:", err)
    }
  }

  const displayPublicKey = managedPublicKey ?? externalWalletAddress

  const [solBalance, usdcBalance] = await Promise.all([
    displayPublicKey ? getSolBalance(displayPublicKey)  : Promise.resolve(0),
    displayPublicKey ? getUsdcBalance(displayPublicKey) : Promise.resolve(0),
  ])

  const activeDealsValue = deals
    .filter((d: any) =>
      (d.status === "ativo" || d.status === "formacao") &&
      d.participants.some((p: any) => p.user_id === user?.id && (p.status === "active" || p.status === "staked")),
    )
    .reduce((sum: number, d: any) => sum + d.entry_amount, 0)

  return (
    <WalletClient
      profile={profile}
      tdpHistory={tdpHistory}
      activeDealsValue={activeDealsValue}
      managedPublicKey={displayPublicKey}
      isExternalWallet={isExternalWallet}
      solBalance={solBalance}
      solUsdPrice={solUsdPrice}
      usdcBalance={usdcBalance}
      isDevnet={process.env.NEXT_PUBLIC_SOLANA_NETWORK !== "mainnet-beta"}
      walletError={walletError}
    />
  )
}
