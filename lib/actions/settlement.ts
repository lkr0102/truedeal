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
  const { error: preUpdateErr } = await (supabase.from("deals") as any)
    .update({
      status:     "liquidando",
      proof_hash: proofHashHex,
      audit_logs: audit.results,
    })
    .eq("id", dealId)
  if (preUpdateErr) throw new Error(`[DealGuard] Pre-settlement DB update failed: ${preUpdateErr.message}`)

  // ── 4. SPL Payout ────────────────────────────────────────────────────────
  const winnerUserIds = audit.results
    .filter((r: any) => r.is_success === true)
    .map((r: any) => r.user_id)

  const loserCount = audit.results.length - winnerUserIds.length

  // Fetch deal entry amount (USDC per participant)
  const { data: deal } = await (supabase.from("deals") as any)
    .select("entry_amount, title")
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
  const { error: postUpdateErr } = await (supabase.from("deals") as any)
    .update({
      status:              "encerrado",
      solana_tx_signature: txSignature,
    })
    .eq("id", dealId)
  if (postUpdateErr) throw new Error(`[DealGuard] Post-settlement DB update failed: ${postUpdateErr.message}`)

  // Mark winners/losers in deal_participants
  for (const result of audit.results) {
    const { error: participantErr } = await supabase
      .from("deal_participants")
      .update({ status: result.is_success ? "winner" : "eliminated" })
      .eq("deal_id", dealId)
      .eq("user_id", result.user_id)
    if (participantErr) {
      console.error(`[DealGuard] Failed to update participant ${result.user_id}:`, participantErr.message)
    }
  }

  // Notify all participants with their result
  try {
    const { createNotification } = await import("@/lib/actions/notifications")
    for (const result of audit.results) {
      if (result.is_success) {
        await createNotification(supabase, {
          user_id:  result.user_id, type: "deal_result_win", deal_id: dealId,
          title_pt: "Você venceu! 🏆",  title_en: "You won! 🏆",
          body_pt:  `Parabéns! Você completou o deal "${deal?.title}" e vai receber sua parte do pote.`,
          body_en:  `Congrats! You completed deal "${deal?.title}" and will receive your share of the pot.`,
        })
      } else {
        await createNotification(supabase, {
          user_id:  result.user_id, type: "deal_result_lose", deal_id: dealId,
          title_pt: "Deal encerrado",  title_en: "Deal closed",
          body_pt:  `O deal "${deal?.title}" finalizou. Você não cumpriu os requisitos desta vez.`,
          body_en:  `Deal "${deal?.title}" ended. You didn't meet the requirements this time.`,
        })
      }
    }
  } catch (err: any) {
    console.error("[notifications] settleDealProtocol notify failed:", err?.message)
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
