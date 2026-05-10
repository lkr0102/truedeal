import { AnchorProvider, Program, type Idl, BN } from "@coral-xyz/anchor"
import {
  PublicKey,
  Keypair,
  SystemProgram,
} from "@solana/web3.js"
import { getConnection } from "./fee-payer"
import idl from "./idl.json"

// ── Constants ────────────────────────────────────────────────────────────────

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_TRUEDEAL_PROGRAM_ID ?? "9zfQ1dwJ9Po7YCPWJ3S13ic3nxZcA9cEwBVsXdKub1c4"
)

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
// Called by the creator when a new Deal is submitted.

export async function initPerformanceAgreement(
  signer: Keypair,
  agreementId: string,
  guaranteeAmountLamports: bigint,
  ruleHash: Uint8Array, // 32-byte SHA-256 of the deal rules
): Promise<string> {
  const provider = getProvider(signer)
  const program  = getProgram(provider)
  const [agreementAccount] = deriveAgreementPDA(agreementId)
  const [vault] = deriveVaultPDA(agreementAccount)

  const txSignature = await program.methods
    .initPerformanceAgreement(
      agreementId,
      new BN(guaranteeAmountLamports.toString()),
      Array.from(ruleHash),
    )
    .accounts({
      agreementAccount,
      creator: signer.publicKey,
      mint: new PublicKey("So11111111111111111111111111111111111111112"), // Mock WSOL for test
      vault,
      systemProgram: SystemProgram.programId,
      tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      rent: new PublicKey("SysvarRent111111111111111111111111111111111"),
    })
    .rpc()

  console.log(`[Anchor] Agreement initialized: ${txSignature}`)
  return txSignature
}

// ── Instruction: Settle Performance Agreement ─────────────────────────────────
// Called by the DealGuard oracle server wallet after the audit concludes.

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
  const [vault] = deriveVaultPDA(agreementAccount)

  const txSignature = await program.methods
    .settlePerformanceAgreement(
      Array.from(proofHash),
      new BN(winnersCount.toString()),
    )
    .accounts({
      agreementAccount,
      oracle1: oracle1.publicKey,
      oracle2: oracle2.publicKey,
      vault,
      treasuryTokenAccount: beneficiaryPubkey, // Use beneficiary for test
      tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    })
    .signers([oracle2])
    .rpc()

  console.log(`[Anchor] Agreement settled via DealGuard Consensus: ${txSignature}`)
  return txSignature
}
