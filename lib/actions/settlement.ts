"use server"

import { PublicKey } from "@solana/web3.js"
import { auditDeal } from "../integrations/polling-service"
import { generateEvidenceHash } from "../integrations/crypto-proof"
import { createServiceClient } from "../supabase/server"
import { settleUsdcDirect } from "../solana/escrow"
import { getFeePayer } from "../solana/fee-payer"

/**
 * 🏛️ Sovereign Settlement Protocol (DealGuard Engine)
 *
 * Pipeline:
 *  1. DealGuard Audit  — real-world evidence across all verification channels
 *  2. Forensic Proof   — SHA-256 proof hash for on-chain attestation
 *  3. Supabase Update  — mark deal as "liquidando" with audit logs
 *  4. SPL Payout       — direct USDC transfers from custodial escrow to winners
 *  5. Supabase Final   — mark deal as "encerrado" with tx signature
 */
export async function settleDealProtocol(
  dealId: string,
  _beneficiaryWalletAddress?: string,  // kept for API compatibility, unused
) {
  console.log(`[DealGuard] Initiating sovereign settlement for agreement: ${dealId}`)

  // ── 1. DealGuard Audit ───────────────────────────────────────────────────
  const audit = await auditDeal(dealId)
  if ("error" in audit) throw new Error(audit.error)

  // ── 2. Forensic Proof ────────────────────────────────────────────────────
  const proofHashHex = generateEvidenceHash(dealId, audit.results)
  console.log(`[Forensics] Proof generated: ${proofHashHex}`)

  // ── 3. Supabase Pre-settlement Update ───────────────────────────────────
  // Service role bypasses RLS — settlement is an oracle operation, not user-driven.
  const supabase = await createServiceClient()
  await (supabase.from("deals") as any)
    .update({
      status:     "liquidando",
      proof_hash: proofHashHex,
      audit_logs: audit.results,
    })
    .eq("id", dealId)

  // ── 4. SPL Payout ────────────────────────────────────────────────────────
  const winnerUserIds = audit.results
    .filter((r: any) => r.is_success === true)
    .map((r: any) => r.user_id)

  const loserCount = audit.results.length - winnerUserIds.length

  // Fetch deal entry amount (USDC per participant)
  const { data: deal } = await (supabase.from("deals") as any)
    .select("entry_amount")
    .eq("id", dealId)
    .single()

  const stakeAmountMicro = BigInt(Math.round((deal?.entry_amount ?? 0) * 1_000_000))

  // Fetch winner wallet pubkeys
  const { data: winnerWallets } = await (supabase.from("user_wallets") as any)
    .select("public_key")
    .in("user_id", winnerUserIds)

  const winnerPubkeys: PublicKey[] = (winnerWallets ?? [])
    .filter((w: any) => w.public_key)
    .map((w: any) => new PublicKey(w.public_key))

  let txSignatures: string[] = []
  let txSignature: string

  const hasOracleKey = !!process.env.APP_FEE_PAYER_KEY

  if (!hasOracleKey || winnerPubkeys.length === 0) {
    const reason = !hasOracleKey ? "missing fee payer key" : "no winners — stake stays in treasury"
    console.warn(`[DealGuard] Settlement note (${reason}). No transfers executed.`)
    txSignature = `DEMO_TX_${Date.now()}_${dealId.slice(0, 8)}`
  } else {
    const feePayer = getFeePayer()
    txSignatures = await settleUsdcDirect(feePayer, winnerPubkeys, loserCount, stakeAmountMicro)
    txSignature = txSignatures[txSignatures.length - 1] ?? `NO_TX_${Date.now()}`
    console.log(`[SPL] Settlement complete. ${txSignatures.length} transfers: ${txSignatures.join(", ")}`)
  }

  // ── 5. Supabase Post-settlement Update ──────────────────────────────────
  await (supabase.from("deals") as any)
    .update({
      status:              "encerrado",
      solana_tx_signature: txSignature,
    })
    .eq("id", dealId)

  // Mark winners/losers in deal_participants
  for (const result of audit.results) {
    await supabase
      .from("deal_participants")
      .update({ status: result.is_success ? "winner" : "eliminated" })
      .eq("deal_id", dealId)
      .eq("user_id", result.user_id)
  }

  return {
    success: true,
    proofHash: proofHashHex,
    txSignature,
    txSignatures,
    explorerUrl: `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`,
    results: audit.results,
  }
}
