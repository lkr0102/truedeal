import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"
import { Keypair } from "@solana/web3.js"

const ALGO = "aes-256-gcm"

function masterKey(): Buffer {
  const hex = process.env.WALLET_MASTER_KEY
  if (!hex || hex.length !== 64) {
    throw new Error("WALLET_MASTER_KEY must be a 64-character hex string (32 bytes)")
  }
  return Buffer.from(hex, "hex")
}

export function generateKeypair(): Keypair {
  return Keypair.generate()
}

// Returns "ivHex:tagHex:ciphertextHex"
export function encryptSecret(secretKey: Uint8Array): string {
  const iv      = randomBytes(12)
  const cipher  = createCipheriv(ALGO, masterKey(), iv)
  const payload = Buffer.from(secretKey).toString("base64")
  const enc     = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()])
  const tag     = cipher.getAuthTag()
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`
}

// Inverse of encryptSecret — returns a fully reconstructed Keypair
export function decryptSecret(blob: string): Keypair {
  const [ivHex, tagHex, encHex] = blob.split(":")
  const iv  = Buffer.from(ivHex,  "hex")
  const tag = Buffer.from(tagHex, "hex")
  const enc = Buffer.from(encHex, "hex")
  const dec = createDecipheriv(ALGO, masterKey(), iv)
  dec.setAuthTag(tag)
  const payload = Buffer.concat([dec.update(enc), dec.final()]).toString("utf8")
  return Keypair.fromSecretKey(new Uint8Array(Buffer.from(payload, "base64")))
}
