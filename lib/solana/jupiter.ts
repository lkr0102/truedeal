import { PublicKey, VersionedTransaction } from "@solana/web3.js"

const SOL_MINT  = "So11111111111111111111111111111111111111112"
const USDC_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"

const USDC_OUTPUT_MINT =
  process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta"
    ? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    : USDC_DEVNET

/**
 * Builds a Jupiter v6 swap transaction: SOL → USDC.
 * Returns a VersionedTransaction the user (or server) must sign and send.
 * slippageBps: 50 = 0.5%
 */
export async function buildSOLtoUSDCSwap(
  userPublicKey: PublicKey,
  solAmountLamports: number,
  slippageBps = 50,
): Promise<{ transaction: VersionedTransaction; usdcReceived: number }> {
  const quoteUrl =
    `https://quote-api.jup.ag/v6/quote` +
    `?inputMint=${SOL_MINT}` +
    `&outputMint=${USDC_OUTPUT_MINT}` +
    `&amount=${solAmountLamports}` +
    `&slippageBps=${slippageBps}`

  const quote = await fetch(quoteUrl).then(r => {
    if (!r.ok) throw new Error(`Jupiter quote failed: ${r.statusText}`)
    return r.json()
  })

  const swap = await fetch("https://quote-api.jup.ag/v6/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: userPublicKey.toString(),
      wrapAndUnwrapSol: true,
    }),
  }).then(r => {
    if (!r.ok) throw new Error(`Jupiter swap failed: ${r.statusText}`)
    return r.json()
  })

  const transaction = VersionedTransaction.deserialize(
    Buffer.from(swap.swapTransaction, "base64"),
  )

  return {
    transaction,
    usdcReceived: Number(quote.outAmount), // micro-USDC units
  }
}
