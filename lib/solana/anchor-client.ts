import { AnchorProvider, Program, type Idl, BN } from "@coral-xyz/anchor"
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js"
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token"
import { getConnection } from "./fee-payer"
import { USDC_MINT } from "./constants"
import idl from "./idl.json"

// ── Constants ────────────────────────────────────────────────────────────────

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_TRUEDEAL_PROGRAM_ID ?? "885scJ15uLUjnG8tfPUFbx4pAS6ZCkHpSuFd9ZUaxFbZ"
)

const AGREEMENT_SEED = Buffer.from("agreement")
const VAULT_SEED     = Buffer.from("vault")

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
  return new Program(idl as Idl, provider)
}

// ── PDA Derivation ───────────────────────────────────────────────────────────

export function deriveAgreementPDA(agreementId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [AGREEMENT_SEED, Buffer.from(agreementId)],
    PROGRAM_ID
  )
}

/** Vault PDA — seeds: [b"vault", agreement_id.as_bytes()] */
export function deriveVaultPDA(agreementId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VAULT_SEED, Buffer.from(agreementId)],
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
      agreementId,
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
  const provider   = getProvider(participant)
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
    .rpc()

  console.log(`[Anchor] Participant staked USDC: ${txSignature}`)
  return txSignature
}

// ── TX 3: Settle Performance Agreement (USDC) ─────────────────────────────────
// Dual-oracle settlement: vault → winners' ATAs + 3% fee → treasury ATA.
// winnerPubkeys: wallet pubkeys of all winners.
// treasuryUsdcATA: oracle1's USDC ATA to receive platform fee.

export async function settlePerformanceAgreement(
  oracle1: Keypair,
  oracle2: Keypair,
  agreementId: string,
  winnerPubkeys: PublicKey[],
  treasuryTokenAccount: PublicKey,
  proofHash: Uint8Array, // 32-byte forensic proof from generateEvidenceHash
  winnersCount: bigint,
): Promise<string> {
  const provider = getProvider(oracle1)
  const program  = getProgram(provider)
  const [agreementAccount] = deriveAgreementPDA(agreementId)
  const [vault] = deriveVaultPDA(agreementAccount.toBase58())

  const txSignature = await program.methods
    .settlePerformanceAgreement(
      new BN(winnersCount.toString()),
      Array.from(proofHash),
    )
    .accounts({
      agreementAccount,
      oracle1: oracle1.publicKey,
      oracle2: oracle2.publicKey,
      vault,
      treasuryTokenAccount,
      usdcMint: new PublicKey("So11111111111111111111111111111111111111112"), // Mock WSOL for test
      tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    })
    .remainingAccounts(
      winnerPubkeys.map(pubkey => ({
        pubkey,
        isWritable: true,
        isSigner: false,
      }))
    )
    .signers([oracle2])
    .rpc()

  console.log(`[Anchor] Agreement settled via DealGuard Consensus: ${txSignature}`)
  return txSignature
}
