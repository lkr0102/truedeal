import { PublicKey } from "@solana/web3.js"
import { getOrCreateAssociatedTokenAccount, mintTo, transfer, getAccount } from "@solana/spl-token"
import { getFeePayer, getConnection } from "./fee-payer"
import { USDC_MINT } from "./constants"

const DEVNET_USDC_GRANT = 1_000          // 1000 USDC per new user
const USDC_DECIMALS     = 6

/**
 * Mints 1000 devnet USDC to a new user's managed wallet.
 *
 * Strategy:
 * 1. If fee payer IS the mint authority (our custom devnet token) → mintTo (no treasury drain)
 * 2. If not → transfer from fee payer's own USDC ATA (treasury must have balance)
 *
 * Only runs on devnet — callers must check NEXT_PUBLIC_SOLANA_NETWORK before calling.
 */
export async function grantDevnetUSDC(recipientPublicKey: string): Promise<string> {
  const connection = getConnection()
  const feePayer   = getFeePayer()
  const recipient  = new PublicKey(recipientPublicKey)
  const amount     = BigInt(DEVNET_USDC_GRANT) * BigInt(10 ** USDC_DECIMALS)

  const recipientATA = await getOrCreateAssociatedTokenAccount(
    connection, feePayer, USDC_MINT, recipient
  )

  // Check if fee payer is mint authority
  const { getMint } = await import("@solana/spl-token")
  const mintInfo    = await getMint(connection, USDC_MINT)
  const isMintAuth  = mintInfo.mintAuthority?.toBase58() === feePayer.publicKey.toBase58()

  let sig: string

  if (isMintAuth) {
    // Mint fresh tokens (our own devnet token — no treasury drain)
    sig = await mintTo(connection, feePayer, USDC_MINT, recipientATA.address, feePayer, amount)
  } else {
    // Transfer from treasury (fee payer's ATA)
    const treasuryATA = await getOrCreateAssociatedTokenAccount(
      connection, feePayer, USDC_MINT, feePayer.publicKey
    )
    const account = await getAccount(connection, treasuryATA.address)
    if (account.amount < amount) {
      throw new Error(
        `Treasury USDC insufficient (${Number(account.amount) / 10 ** USDC_DECIMALS} USDC). ` +
        `Fee payer: ${feePayer.publicKey.toBase58()}`
      )
    }
    sig = await transfer(
      connection, feePayer, treasuryATA.address, recipientATA.address, feePayer, amount
    )
  }

  console.log(`[devnet-faucet] Granted ${DEVNET_USDC_GRANT} USDC to ${recipientPublicKey}: ${sig}`)
  return sig
}
