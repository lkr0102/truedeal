"use server"

import { PublicKey } from "@solana/web3.js"
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token"
import { auditDeal } from "../integrations/polling-service"
import { generateEvidenceHash } from "../integrations/crypto-proof"
import { createClient } from "../supabase/server"
import { settlePerformanceAgreement } from "../solana/anchor-client"
import { getFeePayer, getOracle2, getConnection } from "../solana/fee-payer"
import { USDC_MINT } from "../solana/constants"

/**
 * 🏛️ Sovereign Settlement Protocol (DealGuard Engine)
 *
 * Pipeline:
 *  1. DealGuard Audit  — real-world evidence across all verification channels
 *  2. Forensic Proof   — SHA-256 proof hash (32 bytes) for on-chain attestation
 *  3. Supabase Update  — mark deal as "liquidando" with audit logs
 *  4. Sovereign Payout — anchor program executes payout on Solana Devnet
 */
export async function settleDealProtocol(
  dealId: string,
  beneficiaryWalletAddress: string,
) {
  console.log(`[DealGuard] Initiating sovereign settlement for agreement: ${dealId}`)

  // ── 1. DealGuard Audit ───────────────────────────────────────────────────
  const audit = await auditDeal(dealId)
  if ("error" in audit) throw new Error(audit.error)

  // ── 2. Forensic Proof ────────────────────────────────────────────────────
  const proofHashHex = generateEvidenceHash(dealId, audit.results)
  const proofHashBytes = Buffer.from(proofHashHex.replace("0x", ""), "hex")
  console.log(`[Forensics] Proof generated: ${proofHashHex}`)

  // ── 3. Supabase Pre-settlement Update ───────────────────────────────────
  const supabase = await createClient()
  await (supabase.from("deals") as any)
    .update({
      status:     "liquidando",   // enum value added in migration 010
      proof_hash: proofHashHex,
      audit_logs: audit.results,
    })
    .eq("id", dealId)

  // ── 4. Sovereign Payout (Solana Anchor) ─────────────────────────────────
  const isPlaceholderSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("seu-projeto")
  const hasOracleKeys = !!(process.env.APP_FEE_PAYER_KEY && process.env.ORACLE_2_PRIVATE_KEY)

  // Use real on-chain execution only when both Supabase and oracle keys are configured
  const useRealChain = !isPlaceholderSupabase && hasOracleKeys

  let txSignature: string

  if (!useRealChain) {
    const reason = isPlaceholderSupabase ? "placeholder Supabase URL" : "missing oracle keypairs"
    console.warn(`[DealGuard] Demo mode active (${reason}). Simulating on-chain settlement.`)
    await new Promise(r => setTimeout(r, 600))
    txSignature = `DEMO_TX_${Date.now()}_${dealId.slice(0, 8)}`
    console.log(`[Demo] Simulated on-chain settlement: ${txSignature}`)
  } else {
    const oracle1 = getFeePayer()
    const oracle2 = getOracle2()
    const connection = getConnection()

    // Fetch pubkeys of winners from user_wallets
    const winnerUserIds = audit.results
      .filter((r: any) => r.is_success === true)
      .map((r: any) => r.user_id)

    const { data: winnerWallets } = await (supabase.from("user_wallets") as any)
      .select("public_key")
      .in("user_id", winnerUserIds)

    const winnerPubkeys: PublicKey[] = (winnerWallets ?? [])
      .filter((w: any) => w.public_key)
      .map((w: any) => new PublicKey(w.public_key))

    // Ensure oracle1's USDC ATA exists; create it if needed (3% fee destination)
    const treasuryATA = await getOrCreateAssociatedTokenAccount(
      connection, oracle1, USDC_MINT, oracle1.publicKey,
    )

    txSignature = await settlePerformanceAgreement(
      oracle1,
      oracle2,
      dealId,
      winnerPubkeys,
      treasuryATA.address,
      proofHashBytes,
      BigInt(winnerPubkeys.length),
    )
  }

  // ── 5. Supabase Post-settlement Update ──────────────────────────────────
  await (supabase.from("deals") as any)
    .update({
      status:              "encerrado",   // enum value added in migration 010
      solana_tx_signature: txSignature,
    })
    .eq("id", dealId)

  return {
    success: true,
    proofHash: proofHashHex,
    txSignature,
    explorerUrl: `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`,
    results: audit.results,
  }
}
