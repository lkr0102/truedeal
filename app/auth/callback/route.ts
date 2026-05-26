import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createServiceClient } from "@/lib/supabase/server"
import { generateKeypair, encryptSecret } from "@/lib/solana/keypair"
import { grantDevnetUSDC } from "@/lib/solana/devnet-faucet"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    // The redirect response must be created first so the Supabase client can
    // write session cookies directly onto it. Using cookies() from next/headers
    // causes cookies to be set on a different response object and not merged
    // into the NextResponse.redirect(), leaving the browser with no session.
    const redirectResponse = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              redirectResponse.cookies.set(name, value, options),
            )
          },
        },
      },
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      try {
        // Use service client so wallet creation bypasses RLS and succeeds regardless
        // of session cookie propagation timing in the redirect context.
        const svc = await createServiceClient()

        const { data: existingWallet } = await (svc.from("user_wallets") as any)
          .select("public_key")
          .eq("user_id", data.user.id)
          .maybeSingle()

        if (!existingWallet) {
          const keypair         = generateKeypair()
          const encryptedSecret = encryptSecret(keypair.secretKey)
          const publicKey       = keypair.publicKey.toBase58()

          const { error: insertErr } = await (svc.from("user_wallets") as any).insert({
            user_id:          data.user.id,
            public_key:       publicKey,
            encrypted_secret: encryptedSecret,
          })

          if (insertErr) {
            console.error("[auth/callback] wallet INSERT failed:", insertErr.message)
          } else {
            await (svc.from("profiles") as any)
              .update({ solana_public_key: publicKey })
              .eq("id", data.user.id)

            if (process.env.NEXT_PUBLIC_SOLANA_NETWORK !== "mainnet-beta") {
              grantDevnetUSDC(publicKey)
                .then((sig) => {
                  console.log(`[devnet] Granted 1000 USDC to ${publicKey}: ${sig}`)
                  return (svc.from("user_wallets") as any)
                    .update({ usdc_granted: true })
                    .eq("user_id", data.user.id)
                })
                .catch((err) => console.error("[devnet] USDC grant failed:", err))
            }
          }
        }
      } catch (walletErr) {
        console.error("[auth/callback] wallet provisioning failed:", walletErr)
        // Auth succeeded — continue to app even if wallet creation failed
      }

      const onboardingDone = data.user.user_metadata?.onboarding_completed === true
      const destination    = onboardingDone ? next : "/onboarding/profile"

      if (destination !== next) {
        // Rebuild redirect with correct destination, keeping cookies
        const finalResponse = NextResponse.redirect(`${origin}${destination}`)
        redirectResponse.cookies.getAll().forEach(({ name, value, ...options }) =>
          finalResponse.cookies.set(name, value, options),
        )
        return finalResponse
      }

      return redirectResponse
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
