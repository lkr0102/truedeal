"use server"

import { PublicKey } from "@solana/web3.js"
import { auditDeal } from "../integrations/polling-service"
import { generateEvidenceHash } from "../integrations/crypto-proof"
import { createServiceClient } from "../supabase/server"
import { getFeePayer, getOracle2, getConnection } from "../solana/fee-payer"

/**
 * 🏛️ Sovereign Settlement Protocol (DealGuard Engine)
 *
 * Pipeline:
 *  1. DealGuard Audit   — real-world evidence across all verification channels
 *  2. Forensic Proof    — SHA-256 proof hash for on-chain attestation
 *  3. Supabase Update   — mark deal as "liquidando" with audit logs
 *  4. Anchor Settlement — vault PDA → winners' ATAs + 3% fee → treasury (dual-oracle)
 *  5. Supabase Final    — mark deal as "encerrado" with tx signature
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

  // ── 4. Anchor Settlement ─────────────────────────────────────────────────
  const winnerUserIds = audit.results
    .filter((r: any) => r.is_success === true)
    .map((r: any) => r.user_id)

  // Fetch deal title for notifications
  const { data: deal, error: dealFetchErr } = await (supabase.from("deals") as any)
    .select("entry_amount, title, pda_address")
    .eq("id", dealId)
    .single()
  if (dealFetchErr || !deal) throw new Error(`[DealGuard] Failed to fetch deal for settlement: ${dealFetchErr?.message ?? "not found"}`)

  // Fetch winner wallet pubkeys
  const { data: winnerWallets } = await (supabase.from("user_wallets") as any)
    .select("public_key")
    .in("user_id", winnerUserIds)

  const winnerPubkeys: PublicKey[] = (winnerWallets ?? [])
    .filter((w: any) => w.public_key)
    .map((w: any) => new PublicKey(w.public_key))

  let txSignature: string

  const hasOracleKey = !!process.env.APP_FEE_PAYER_KEY

  if (!hasOracleKey) {
    console.warn(`[DealGuard] Settlement demo mode — APP_FEE_PAYER_KEY not set.`)
    txSignature = `DEMO_TX_${Date.now()}_${dealId.slice(0, 8)}`
  } else if (!deal?.pda_address) {
    // Pre-migration deal: USDC is in feePayer's ATA (custodial), no vault PDA exists on-chain
    const { settleUsdcDirect } = await import("../solana/escrow")
    const { toUSDCUnits }      = await import("../solana/constants")
    const feePayer   = getFeePayer()
    const loserCount = audit.results.filter((r: any) => r.is_success === false).length
    const txSigs = await settleUsdcDirect(feePayer, winnerPubkeys, loserCount, toUSDCUnits(deal.entry_amount))
    txSignature = txSigs[txSigs.length - 1] ?? `SETTLE_${dealId.slice(0, 8)}`
    console.log(`[Escrow] Custodial settlement complete (pre-migration deal). Last tx: ${txSignature}`)
  } else {
    const { settlePerformanceAgreement } = await import("../solana/anchor-client")
    const { getOrCreateAssociatedTokenAccount } = await import("@solana/spl-token")
    const { USDC_MINT } = await import("../solana/constants")

    const feePayer   = getFeePayer()
    const oracle2    = getOracle2()
    const connection = getConnection()

    // Ensure treasury ATA exists (feePayer's USDC ATA receives platform fee)
    const treasuryATA = await getOrCreateAssociatedTokenAccount(
      connection, feePayer, USDC_MINT, feePayer.publicKey,
    )

    const proofHashBytes = Buffer.from(proofHashHex, "hex")

    txSignature = await settlePerformanceAgreement(
      feePayer,
      oracle2,
      dealId,
      winnerPubkeys,
      treasuryATA.address,
      proofHashBytes,
      BigInt(winnerPubkeys.length),
    )
    console.log(`[Anchor] DualGuard settlement complete. Tx: ${txSignature}`)
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
    explorerUrl: `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`,
    results: audit.results,
  }
}
