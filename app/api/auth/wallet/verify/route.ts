import { NextRequest, NextResponse } from "next/server"
import { PublicKey } from "@solana/web3.js"
import { createServiceClient } from "@/lib/supabase/server"

// POST { publicKey: string, signature: number[], message: string }
// Verifies an ed25519 wallet signature and issues a Supabase magic-link session.
export async function POST(req: NextRequest) {
  try {
    const { publicKey, signature, message } = await req.json()

    if (!publicKey || !signature || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    // ── 1. Verify message freshness (max 2 minutes) ──────────────────────────
    const match = message.match(/Timestamp: (\d+)/)
    if (!match) return NextResponse.json({ error: "Invalid message format" }, { status: 400 })
    const ts = parseInt(match[1], 10)
    if (Date.now() - ts > 2 * 60 * 1000) {
      return NextResponse.json({ error: "Message expired — try again" }, { status: 401 })
    }

    // ── 2. Verify ed25519 signature (Web Crypto API — no extra deps) ─────────
    // new Uint8Array(ArrayLike<number>) constructor always returns Uint8Array<ArrayBuffer>,
    // which satisfies Web Crypto API's BufferSource constraint (unlike Buffer or Uint8Array<ArrayBufferLike>)
    const pubkeyBuf = new Uint8Array(new PublicKey(publicKey).toBytes())
    const msgBuf    = new Uint8Array(new TextEncoder().encode(message))
    const sigBuf    = new Uint8Array(signature as number[])

    const cryptoKey = await crypto.subtle.importKey(
      "raw", pubkeyBuf, { name: "Ed25519" }, false, ["verify"],
    )
    const valid = await crypto.subtle.verify("Ed25519", cryptoKey, sigBuf, msgBuf)
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // ── 3. Create/find Supabase user for this wallet ─────────────────────────
    const supabase = await createServiceClient()
    const email    = `wallet_${publicKey}@truedeal.app`

    // generateLink creates the user if they don't exist yet
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type:  "magiclink",
      email,
      options: {
        data: {
          wallet_address: publicKey,
          provider:       "solana_wallet",
        },
      },
    })

    if (linkError) {
      console.error("[wallet-auth] generateLink error:", linkError.message)
      return NextResponse.json({ error: linkError.message }, { status: 500 })
    }

    // ── 4. Return the hashed_token — client exchanges it for a session ────────
    const token_hash = linkData.properties.hashed_token

    return NextResponse.json({ token_hash })
  } catch (err: any) {
    console.error("[wallet-auth] Unexpected error:", err)
    return NextResponse.json({ error: err.message ?? "Internal error" }, { status: 500 })
  }
}
