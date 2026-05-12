import { AnchorProvider, Program, type Idl, BN } from "@coral-xyz/anchor"
import {
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js"
import { getConnection } from "./fee-payer"
import idl from "./idl.json"

// ── Constants ────────────────────────────────────────────────────────────────

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_TRUEDEAL_PROGRAM_ID ?? "885scJ15uLUjnG8tfPUFbx4pAS6ZCkHpSuFd9ZUaxFbZ"
)

// Devnet SOL conversion: 1 BRL = 1_000_000 lamports (0.001 SOL) for demo
export const LAMPORTS_PER_BRL = 1_000_000

const AGREEMENT_SEED = Buffer.from("agreement")

// ── Provider / Program factory ───────────────────────────────────────────────

export function getProvider(signer: Keypair): AnchorProvider {
  const connection = getConnection()
  const wallet = {
    publicKey: signer.publicKey,
    signTransaction: async (tx: any) => { tx.partialSign(signer); return tx },
    signAllTransactions: async (txs: any[]) => { txs.forEach(tx => tx.partialSign(signer)); return txs },
  }
  return new AnchorProvider(connection, wallet as any, { commitment: "confirmed" })
}

export function getProgram(provider: AnchorProvider): Program {
  return new Program(idl as Idl, provider)
}

// ── PDA Derivation ───────────────────────────────────────────────────────────

export function deriveAgreementPDA(agreementId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [AGREEMENT_SEED, Buffer.from(agreementId)],
    PROGRAM_ID
  )
}

export function deriveVaultPDA(agreementPDA: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), agreementPDA.toBuffer()],
    PROGRAM_ID
  )
}

// ── Instruction: Init Performance Agreement ──────────────────────────────────
// Called by the fee-payer (server oracle) when a new Deal is created.
// The fee-payer acts as the on-chain creator; its pubkey is stored as vault (treasury).

export async function initPerformanceAgreement(
  signer: Keypair,
  agreementId: string,
  guaranteeAmountLamports: bigint,
  ruleHash: Uint8Array, // 32-byte SHA-256 of the deal rules
): Promise<string> {
  const provider = getProvider(signer)
  const program  = getProgram(provider)
  const [agreementAccount] = deriveAgreementPDA(agreementId)

  const txSignature = await program.methods
    .initPerformanceAgreement(
      agreementId,
      new BN(guaranteeAmountLamports.toString()),
      Array.from(ruleHash),
    )
    .accounts({
      agreementAccount,
      creator:       signer.publicKey,
      vault:         signer.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc()

  console.log(`[Anchor] Agreement initialized on-chain: ${txSignature}`)
  return txSignature
}

// ── Native SOL: Stake Deposit ────────────────────────────────────────────────
// Transfers native SOL from the participant's managed wallet to the treasury.
// This is the actual escrow mechanism for the hackathon demo (avoids SPL token complexity).

export async function joinAgreementNativeSOL(
  signer: Keypair,
  treasuryPubkey: PublicKey,
  lamports: number,
): Promise<string> {
  const connection = getConnection()
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: signer.publicKey, toPubkey: treasuryPubkey, lamports })
  )
  const sig = await sendAndConfirmTransaction(connection, tx, [signer], { commitment: "confirmed" })
  console.log(`[Native SOL] Stake deposited to treasury: ${sig}`)
  return sig
}

// ── Native SOL: Winner Payout ────────────────────────────────────────────────
// Sends native SOL from the treasury (fee-payer) to a winner's wallet.

export async function payoutNativeSOL(
  treasury: Keypair,
  toPubkey: PublicKey,
  lamports: number,
): Promise<string> {
  const connection = getConnection()
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: treasury.publicKey, toPubkey, lamports })
  )
  const sig = await sendAndConfirmTransaction(connection, tx, [treasury], { commitment: "confirmed" })
  console.log(`[Native SOL] Payout sent to ${toPubkey.toBase58()}: ${sig}`)
  return sig
}

// ── Instruction: Settle Performance Agreement ─────────────────────────────────
// Called by DealGuard dual-oracle after the audit concludes.
// NOTE: For the devnet demo, actual SOL movement is handled via payoutNativeSOL above.
// This instruction updates the on-chain AgreementAccount state to Settled.

export async function settlePerformanceAgreement(
  oracle1: Keypair,
  oracle2: Keypair,
  agreementId: string,
  beneficiaryPubkey: PublicKey,
  proofHash: Uint8Array, // 32-byte forensic proof from generateEvidenceHash
  winnersCount: bigint,
): Promise<string> {
  const provider = getProvider(oracle1)
  const program  = getProgram(provider)
  const [agreementAccount] = deriveAgreementPDA(agreementId)
  const [vault]            = deriveVaultPDA(agreementAccount)

  // Args order matches Rust: winners_count first, proof_hash second
  const txSignature = await program.methods
    .settlePerformanceAgreement(
      new BN(winnersCount.toString()),
      Array.from(proofHash),
    )
    .accounts({
      agreementAccount,
      oracle1:               oracle1.publicKey,
      oracle2:               oracle2.publicKey,
      vault,
      treasuryTokenAccount:  beneficiaryPubkey,
      tokenProgram:          new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    })
    .signers([oracle2])
    .rpc()

  console.log(`[Anchor] Agreement settled via DualGuard Consensus: ${txSignature}`)
  return txSignature
}
