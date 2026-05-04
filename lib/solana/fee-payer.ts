import { Keypair, Connection, clusterApiUrl } from "@solana/web3.js"

// The app's fee-payer wallet covers all on-chain transaction costs.
// APP_FEE_PAYER_KEY: base64-encoded 64-byte Solana secret key.
// Generate: node -e "const k=require('@solana/web3.js').Keypair.generate(); console.log(Buffer.from(k.secretKey).toString('base64'), k.publicKey.toBase58())"
export function getFeePayer(): Keypair {
  const b64 = process.env.APP_FEE_PAYER_KEY
  if (!b64) throw new Error("APP_FEE_PAYER_KEY is not set")
  return Keypair.fromSecretKey(new Uint8Array(Buffer.from(b64, "base64")))
}

export function getConnection(): Connection {
  return new Connection(
    process.env.SOLANA_RPC_URL ?? clusterApiUrl("devnet"),
    "confirmed",
  )
}
