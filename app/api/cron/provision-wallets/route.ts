import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { generateKeypair, encryptSecret } from "@/lib/solana/keypair"
import { grantDevnetUSDC } from "@/lib/solana/devnet-faucet"

// Runs daily to provision managed wallets for any user who doesn't have one.
// Covers users who signed up before the auth callback was fixed, or whose
// wallet creation failed silently due to a missing/wrong env var.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createServiceClient()

  // Find all profiles and all existing wallet user_ids, then diff them.
  const [{ data: profiles, error: profilesErr }, { data: wallets, error: walletsErr }] =
    await Promise.all([
      (supabase.from("profiles") as any).select("id"),
      (supabase.from("user_wallets") as any).select("user_id"),
    ])

  if (profilesErr) return NextResponse.json({ error: profilesErr.message }, { status: 500 })
  if (walletsErr)  return NextResponse.json({ error: walletsErr.message  }, { status: 500 })

  const existingWalletIds = new Set((wallets ?? []).map((w: any) => w.user_id))
  const usersToProvision  = (profiles ?? []).filter((p: any) => !existingWalletIds.has(p.id))

  if (!usersToProvision.length) {
    return NextResponse.json({ ok: true, provisioned: 0 })
  }

  console.log(`[provision-wallets] ${usersToProvision.length} user(s) need a wallet`)

  let provisioned = 0
  let failed      = 0

  for (const user of usersToProvision) {
    try {
      const keypair         = generateKeypair()
      const encryptedSecret = encryptSecret(keypair.secretKey)
      const publicKey       = keypair.publicKey.toBase58()

      const { error: insertErr } = await (supabase.from("user_wallets") as any).insert({
        user_id:          user.id,
        public_key:       publicKey,
        encrypted_secret: encryptedSecret,
      })

      if (insertErr) {
        console.error(`[provision-wallets] INSERT failed for ${user.id}:`, insertErr.message)
        failed++
        continue
      }

      await (supabase.from("profiles") as any)
        .update({ solana_public_key: publicKey })
        .eq("id", user.id)

      if (process.env.NEXT_PUBLIC_SOLANA_NETWORK !== "mainnet-beta") {
        grantDevnetUSDC(publicKey)
          .then(() =>
            (supabase.from("user_wallets") as any)
              .update({ usdc_granted: true })
              .eq("user_id", user.id),
          )
          .catch((err) => console.error(`[provision-wallets] USDC grant failed for ${user.id}:`, err))
      }

      console.log(`[provision-wallets] Provisioned wallet ${publicKey} for user ${user.id}`)
      provisioned++
    } catch (err: any) {
      console.error(`[provision-wallets] Error for user ${user.id}:`, err.message)
      failed++
    }
  }

  const allOk = failed === 0
  return NextResponse.json(
    { ok: allOk, provisioned, failed },
    { status: allOk ? 200 : 207 },
  )
}
