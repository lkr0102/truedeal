import { NextRequest, NextResponse } from "next/server"
import { PublicKey } from "@solana/web3.js"
import { createServiceClient } from "@/lib/supabase/server"
import { getFeePayer } from "@/lib/solana/fee-payer"

// Admin-only: refund all participants of a cancelled deal back to their wallets.
// Calls cancelAgreement on the Anchor program — funds flow from vault PDA → participant ATAs.
// Protected by CRON_SECRET — same mechanism as the settlement cron.
// Usage: POST /api/admin/refund-deal  { "deal_id": "..." }
// Header: Authorization: Bearer <CRON_SECRET>
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { deal_id } = await request.json()
  if (!deal_id) return NextResponse.json({ error: "deal_id required" }, { status: 400 })

  const supabase = await createServiceClient()

  // Fetch deal
  const { data: deal, error: dealErr } = await (supabase.from("deals") as any)
    .select("entry_amount, status, title")
    .eq("id", deal_id)
    .single()

  if (dealErr || !deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 })

  // Fetch all participant wallet pubkeys
  const { data: participants, error: partErr } = await (supabase.from("deal_participants") as any)
    .select("user_id")
    .eq("deal_id", deal_id)

  if (partErr || !participants?.length) {
    return NextResponse.json({ error: "No participants found" }, { status: 404 })
  }

  const userIds = participants.map((p: any) => p.user_id)

  const { data: wallets, error: walletErr } = await (supabase.from("user_wallets") as any)
    .select("user_id, public_key")
    .in("user_id", userIds)

  if (walletErr) return NextResponse.json({ error: walletErr.message }, { status: 500 })

  const pubkeys: PublicKey[] = (wallets ?? [])
    .filter((w: any) => w.public_key)
    .map((w: any) => new PublicKey(w.public_key))

  if (pubkeys.length === 0) {
    return NextResponse.json({ error: "No wallet pubkeys found for participants" }, { status: 404 })
  }

  if (!process.env.APP_FEE_PAYER_KEY) {
    return NextResponse.json({ error: "APP_FEE_PAYER_KEY not set" }, { status: 500 })
  }

  const feePayer = getFeePayer()
  const { cancelAgreement } = await import("@/lib/solana/anchor-client")
  const txSignature = await cancelAgreement(feePayer, deal_id, pubkeys)

  // Mark deal as cancelled in DB
  await (supabase.from("deals") as any)
    .update({
      status:              "encerrado",
      solana_tx_signature: txSignature,
      audit_logs:          { refund_tx: txSignature, refunded_at: new Date().toISOString() },
    })
    .eq("id", deal_id)

  console.log(`[admin/refund-deal] Cancelled deal ${deal_id} via Anchor: ${txSignature}`)

  return NextResponse.json({
    ok: true,
    deal_id,
    title:            deal.title,
    refunded_to:      pubkeys.map(p => p.toBase58()),
    amount_each_usdc: deal.entry_amount,
    txSignature,
  })
}
