import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateKeypair, encryptSecret } from "@/lib/solana/keypair"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Auto-provision a managed Solana wallet on first login (idempotent).
      // Uses the same supabase client so the freshly-set session is available.
      const { data: existingWallet } = await (supabase.from("user_wallets") as any)
        .select("public_key")
        .eq("user_id", data.user.id)
        .maybeSingle()

      if (!existingWallet && process.env.WALLET_MASTER_KEY) {
        const keypair         = generateKeypair()
        const encryptedSecret = encryptSecret(keypair.secretKey)
        const publicKey       = keypair.publicKey.toBase58()

        await (supabase.from("user_wallets") as any).insert({
          user_id:          data.user.id,
          public_key:       publicKey,
          encrypted_secret: encryptedSecret,
        })

        await (supabase.from("profiles") as any)
          .update({ solana_public_key: publicKey })
          .eq("id", data.user.id)
      }

      const onboardingDone = data.user.user_metadata?.onboarding_completed === true
      const destination    = onboardingDone ? next : "/onboarding/profile"
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
