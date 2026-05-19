import { NextRequest, NextResponse } from "next/server"
import { Connection, LAMPORTS_PER_SOL, clusterApiUrl } from "@solana/web3.js"
import { getFeePayer, getOracle2 } from "@/lib/solana/fee-payer"

// Vercel Cron calls this route every 6 hours (see vercel.json).
// Only runs on devnet — safely skipped on mainnet.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta") {
    return NextResponse.json({ skipped: "mainnet — no airdrop needed" })
  }

  const connection = new Connection(
    process.env.SOLANA_RPC_URL ?? clusterApiUrl("devnet"),
    "confirmed",
  )

  const results: Array<{ wallet: string; sig?: string; balance_sol?: number; error?: string }> = []

  for (const [label, keypairFn] of [
    ["oracle1 (fee payer)", getFeePayer],
    ["oracle2",             getOracle2],
  ] as const) {
    try {
      const kp  = keypairFn()
      const pub = kp.publicKey.toBase58()

      const sig = await connection.requestAirdrop(kp.publicKey, 2 * LAMPORTS_PER_SOL)
      await connection.confirmTransaction(sig, "confirmed")

      const balance = await connection.getBalance(kp.publicKey)
      const balanceSol = balance / LAMPORTS_PER_SOL

      console.log(`[oracle-airdrop] ${label} (${pub}): +2 SOL → ${balanceSol.toFixed(3)} SOL total`)
      results.push({ wallet: pub, sig, balance_sol: balanceSol })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[oracle-airdrop] ${label} failed:`, msg)
      results.push({ wallet: label, error: msg })
    }
  }

  const allOk = results.every((r) => !r.error)
  return NextResponse.json(
    { ok: allOk, results, ts: new Date().toISOString() },
    { status: allOk ? 200 : 207 },
  )
}
