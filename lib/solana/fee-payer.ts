import { Keypair, Connection, clusterApiUrl } from "@solana/web3.js"

// APP_FEE_PAYER_KEY: base64-encoded 64-byte Solana secret key (oracle 1 + fee payer).
// Generate: node -e "const k=require('@solana/web3.js').Keypair.generate(); console.log(Buffer.from(k.secretKey).toString('base64'), k.publicKey.toBase58())"
export function getFeePayer(): Keypair {
  const b64 = process.env.APP_FEE_PAYER_KEY
  if (!b64) throw new Error("APP_FEE_PAYER_KEY is not set")
  return Keypair.fromSecretKey(new Uint8Array(Buffer.from(b64, "base64")))
}

// ORACLE_2_PRIVATE_KEY: base64 or JSON-array format. Falls back to a deterministic
// devnet-only derivation from oracle1 — set a real key in production.
export function getOracle2(): Keypair {
  const raw = process.env.ORACLE_2_PRIVATE_KEY
  if (raw) {
    if (raw.startsWith("[")) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)))
    return Keypair.fromSecretKey(new Uint8Array(Buffer.from(raw, "base64")))
  }
  // Devnet fallback: derive from oracle1 seed with offset (never use in production)
  const base = getFeePayer().secretKey.slice(0, 32)
  const seed = Uint8Array.from(base.map((b, i) => (b + i + 7) & 0xff))
  return Keypair.fromSeed(seed)
}

export function getConnection(): Connection {
  return new Connection(
    process.env.SOLANA_RPC_URL ?? clusterApiUrl("devnet"),
    "confirmed",
  )
}
