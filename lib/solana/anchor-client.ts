import { AnchorProvider, Program, type Idl, BN } from "@coral-xyz/anchor"
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js"
import {
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token"
import { getConnection } from "./fee-payer"
import { USDC_MINT } from "./constants"
import idl from "./idl.json"

// ── Constants ────────────────────────────────────────────────────────────────

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_TRUEDEAL_PROGRAM_ID ?? "7sb3HQQbaCPYiT2x3tZZGMJyn5qRNiy4PgvCvb2BzZS8"
)

const AGREEMENT_SEED = Buffer.from("agreement")
const VAULT_SEED     = Buffer.from("vault")

// UUIDs with dashes are 36 bytes — Solana seeds are capped at 32.
// The Rust program uses agreement_id.as_bytes() as seed, so we must strip dashes
// to get 32 bytes (exactly at the limit) before any PDA derivation.
function idBytes(id: string): Buffer {
  return Buffer.from(id.replace(/-/g, ""))
}

// ── Provider / Program factory ───────────────────────────────────────────────

export function getProvider(signer: Keypair): AnchorProvider {
  const connection = getConnection()
  const wallet = {
    publicKey: signer.publicKey,
    signTransaction:     async (tx: any) => { tx.partialSign(signer); return tx },
    signAllTransactions: async (txs: any[]) => { txs.forEach(tx => tx.partialSign(signer)); return txs },
  }
  return new AnchorProvider(connection, wallet as any, { commitment: "confirmed" })
}

export function getProgram(provider: AnchorProvider): Program {
  return new Program(idl as unknown as Idl, provider)
}

// ── PDA Derivation ───────────────────────────────────────────────────────────

export function deriveAgreementPDA(agreementId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [AGREEMENT_SEED, idBytes(agreementId)],
    PROGRAM_ID
  )
}

/** Vault PDA — seeds: [b"vault", agreement_id.as_bytes()] */
export function deriveVaultPDA(agreementId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VAULT_SEED, idBytes(agreementId)],
    PROGRAM_ID
  )
}

// ── TX 1: Init Performance Agreement ─────────────────────────────────────────
// Creates AgreementAccount PDA + USDC SPL vault in one transaction.

export async function initPerformanceAgreement(
  signer: Keypair,
  agreementId: string,
  guaranteeAmountUSDC: bigint,  // USDC micro-units (1 USDC = 1_000_000)
  ruleHash: Uint8Array,         // 32-byte SHA-256 of deal rules
): Promise<string> {
  const provider = getProvider(signer)
  const program  = getProgram(provider)
  const [agreementAccount] = deriveAgreementPDA(agreementId)
  const [vault]            = deriveVaultPDA(agreementId)

  const txSignature = await program.methods
    .initPerformanceAgreement(
      agreementId.replace(/-/g, ""),
      new BN(guaranteeAmountUSDC.toString()),
      Array.from(ruleHash),
    )
    .accounts({
      agreementAccount,
      vault,
      creator:       signer.publicKey,
      usdcMint:      USDC_MINT,
      tokenProgram:  TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc()

  console.log(`[Anchor] Agreement initialized on-chain: ${txSignature}`)
  return txSignature
}

// ── TX 2: Join Agreement (USDC) ───────────────────────────────────────────────
// Transfers USDC from participant's ATA → vault PDA.
// feePayer (oracle1) covers ATA creation rent if the account doesn't exist.

export async function joinAgreementUSDC(
  participant: Keypair,
  feePayer: Keypair,
  agreementId: string,
): Promise<string> {
  const connection = getConnection()
  // feePayer is the provider wallet so it covers SOL transaction fees.
  // participant has USDC but 0 SOL, so it can't be the fee payer.
  // participant is added via .signers() to satisfy the IDL signer: true constraint.
  const provider   = getProvider(feePayer)
  const program    = getProgram(provider)
  const [agreementAccount] = deriveAgreementPDA(agreementId)
  const [vault]            = deriveVaultPDA(agreementId)

  const participantUsdcATA = await getOrCreateAssociatedTokenAccount(
    connection, feePayer, USDC_MINT, participant.publicKey,
  )

  const txSignature = await program.methods
    .joinAgreement()
    .accounts({
      agreementAccount,
      participant:            participant.publicKey,
      participantUsdcAccount: participantUsdcATA.address,
      vault,
      usdcMint:               USDC_MINT,
      tokenProgram:           TOKEN_PROGRAM_ID,
    })
    .signers([participant])
    .rpc()

  console.log(`[Anchor] Participant staked USDC: ${txSignature}`)
  return txSignature
}

// ── TX 3a: Cancel Agreement ───────────────────────────────────────────────────
// Called when a deal is cancelled before start (quorum < 2).
// Refunds each participant proportionally from the vault PDA.
// oracle1 must sign; participant USDC ATAs passed as remainingAccounts.

export async function cancelAgreement(
  oracle1: Keypair,
  agreementId: string,
  participantPublicKeys: PublicKey[],
): Promise<string> {
  const connection = getConnection()
  const provider   = getProvider(oracle1)
  const program    = getProgram(provider)
  const [agreementAccount] = deriveAgreementPDA(agreementId)
  const [vault]            = deriveVaultPDA(agreementId)

  // Ensure each participant's USDC ATA exists before the on-chain transfer
  const participantATAs = await Promise.all(
    participantPublicKeys.map(pk =>
      getOrCreateAssociatedTokenAccount(connection, oracle1, USDC_MINT, pk)
    )
  )

  const txSignature = await program.methods
    .cancelAgreement()
    .accounts({
      agreementAccount,
      oracle1: oracle1.publicKey,
      vault,
      usdcMint:     USDC_MINT,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .remainingAccounts(
      participantATAs.map(ata => ({
        pubkey:     ata.address,
        isWritable: true,
        isSigner:   false,
      }))
    )
    .rpc()

  console.log(`[Anchor] Agreement cancelled. Refunded ${participantPublicKeys.length} participants: ${txSignature}`)
  return txSignature
}

// ── TX 3b: Settle Performance Agreement (USDC) ────────────────────────────────
// Dual-oracle settlement: vault → winners' USDC ATAs + 3% fee → treasury ATA.
// winnerWalletPubkeys: wallet pubkeys of all winners (ATAs are derived internally).
// treasuryTokenAccount: oracle1's USDC ATA to receive platform fee.

export async function settlePerformanceAgreement(
  oracle1: Keypair,
  oracle2: Keypair,
  agreementId: string,
  winnerWalletPubkeys: PublicKey[],
  treasuryTokenAccount: PublicKey,
  proofHash: Uint8Array,
  winnersCount: bigint,
): Promise<string> {
  const connection = getConnection()
  const provider   = getProvider(oracle1)
  const program    = getProgram(provider)
  const [agreementAccount] = deriveAgreementPDA(agreementId)
  const [vault]            = deriveVaultPDA(agreementId)

  // Ensure each winner's USDC ATA exists — creates if missing (e.g. new user who never received USDC)
  const winnerATAAccounts = await Promise.all(
    winnerWalletPubkeys.map(pk =>
      getOrCreateAssociatedTokenAccount(connection, oracle1, USDC_MINT, pk)
    )
  )
  const winnerATAs = winnerATAAccounts.map(a => a.address)

  const txSignature = await program.methods
    .settlePerformanceAgreement(
      new BN(winnersCount.toString()),
      Array.from(proofHash),
    )
    .accounts({
      agreementAccount,
      oracle1:              oracle1.publicKey,
      oracle2:              oracle2.publicKey,
      vault,
      treasuryTokenAccount,
      usdcMint:             USDC_MINT,
      tokenProgram:         TOKEN_PROGRAM_ID,
    })
    .remainingAccounts(
      winnerATAs.map(ata => ({
        pubkey:     ata,
        isWritable: true,
        isSigner:   false,
      }))
    )
    .signers([oracle2])
    .rpc()

  console.log(`[Anchor] Agreement settled via DualGuard Consensus: ${txSignature}`)
  return txSignature
}
