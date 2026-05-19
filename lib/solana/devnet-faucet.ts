import { Keypair, PublicKey } from "@solana/web3.js"
import { getOrCreateAssociatedTokenAccount, mintTo, getMint } from "@solana/spl-token"
import { getFeePayer, getConnection } from "./fee-payer"
import { USDC_MINT } from "./constants"

const DEVNET_USDC_GRANT = 1_000
const USDC_DECIMALS     = 6

// Returns the mint authority keypair.
// Priority: USDC_MINT_AUTHORITY_KEY env var → falls back to APP_FEE_PAYER_KEY.
// This allows production to use a dedicated mint authority separate from the fee payer.
function getMintAuthority(): Keypair {
  const raw = process.env.USDC_MINT_AUTHORITY_KEY?.trim()
  if (raw && raw.length > 0) {
    // Accept both JSON-array format ([1,2,3,...]) and base64
    if (raw.startsWith("[")) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)))
    return Keypair.fromSecretKey(new Uint8Array(Buffer.from(raw, "base64")))
  }
  return getFeePayer()
}

/**
 * Mints 1000 devnet USDC to a user's managed wallet via the mint authority.
 * Only runs on devnet — callers must check NEXT_PUBLIC_SOLANA_NETWORK before calling.
 */
export async function grantDevnetUSDC(recipientPublicKey: string): Promise<string> {
  const connection  = getConnection()
  const feePayer    = getFeePayer()    // pays SOL tx fees
  const mintAuth    = getMintAuthority() // signs mintTo
  const recipient   = new PublicKey(recipientPublicKey)
  const amount      = BigInt(DEVNET_USDC_GRANT) * BigInt(10 ** USDC_DECIMALS)

  // Verify mint authority matches to catch misconfiguration early
  const mintInfo = await getMint(connection, USDC_MINT)
  if (mintInfo.mintAuthority?.toBase58() !== mintAuth.publicKey.toBase58()) {
    throw new Error(
      `USDC_MINT_AUTHORITY_KEY is not the mint authority. ` +
      `Expected: ${mintInfo.mintAuthority?.toBase58()}, Got: ${mintAuth.publicKey.toBase58()}`
    )
  }

  const recipientATA = await getOrCreateAssociatedTokenAccount(
    connection, feePayer, USDC_MINT, recipient
  )

  const sig = await mintTo(
    connection, feePayer, USDC_MINT, recipientATA.address, mintAuth, amount
  )

  console.log(`[devnet-faucet] Granted ${DEVNET_USDC_GRANT} USDC to ${recipientPublicKey}: ${sig}`)
  return sig
}
