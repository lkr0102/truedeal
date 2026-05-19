import { Keypair, PublicKey } from "@solana/web3.js"
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

// Distribute USDC from custodial escrow (feePayer's ATA) to winners.
// 3% fee on the loser pool stays in feePayer's ATA (treasury).
// Returns the tx signature for each winner transfer.
export async function settleUsdcDirect(
  feePayer: Keypair,
  winnerPublicKeys: PublicKey[],
  loserCount: number,
  stakeAmountMicro: bigint,
): Promise<string[]> {
  if (winnerPublicKeys.length === 0) return []

  const connection = getConnection()

  const escrowATA = await getOrCreateAssociatedTokenAccount(
    connection, feePayer, USDC_MINT, feePayer.publicKey,
  )

  const loserPool     = BigInt(loserCount) * stakeAmountMicro
  const feeAmount     = loserPool * BigInt(3) / BigInt(100)
  const netLoserPool  = loserPool - feeAmount
  const payoutPerWinner = stakeAmountMicro + netLoserPool / BigInt(winnerPublicKeys.length)

  const txSignatures: string[] = []
  for (const winnerPubkey of winnerPublicKeys) {
    const winnerATA = await getOrCreateAssociatedTokenAccount(
      connection, feePayer, USDC_MINT, winnerPubkey,
    )
    const sig = await transfer(
      connection,
      feePayer,
      escrowATA.address,
      winnerATA.address,
      feePayer,          // feePayer owns escrowATA
      payoutPerWinner,
    )
    txSignatures.push(sig)
  }

  return txSignatures
}
