import { Keypair } from "@solana/web3.js"
import { transfer, getOrCreateAssociatedTokenAccount } from "@solana/spl-token"
import { getConnection } from "./fee-payer"
import { USDC_MINT } from "./constants"

// Transfer USDC from user's ATA → fee payer's ATA (custodial escrow).
// Fee payer covers SOL tx fees; participant signs as ATA owner.
// This works without a deployed Anchor program — uses only SPL Token.
export async function stakeUsdc(
  participant: Keypair,
  feePayer: Keypair,
  amountMicroUsdc: bigint,
): Promise<string> {
  const connection = getConnection()

  const [participantATA, escrowATA] = await Promise.all([
    getOrCreateAssociatedTokenAccount(connection, feePayer, USDC_MINT, participant.publicKey),
    getOrCreateAssociatedTokenAccount(connection, feePayer, USDC_MINT, feePayer.publicKey),
  ])

  return transfer(
    connection,
    feePayer,                  // pays SOL tx fees
    participantATA.address,    // from
    escrowATA.address,         // to (escrow)
    participant,               // authority of from ATA (signer)
    amountMicroUsdc,
  )
}
