/**
 * One-time script to create managed Solana wallets for users who are missing one.
 * Run with: node scripts/provision-wallets.mjs
 */

import { createClient } from "@supabase/supabase-js"
import { Keypair, PublicKey } from "@solana/web3.js"
import { createCipheriv, randomBytes } from "node:crypto"
import { getOrCreateAssociatedTokenAccount, mintTo, getMint } from "@solana/spl-token"
import { Connection } from "@solana/web3.js"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

// ── Load .env.local ───────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dir, "../.env.local")
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => {
      const idx = l.indexOf("=")
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
    })
)

const SUPABASE_URL      = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY
const WALLET_MASTER_KEY = env.WALLET_MASTER_KEY
const FEE_PAYER_B64     = env.APP_FEE_PAYER_KEY
const RPC_URL           = env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com"
const USDC_MINT_ADDR    = env.NEXT_PUBLIC_USDC_MINT_DEVNET ?? "BpXHCSnxhbzSjzWeaTHG14g1zETtcZeDGk772Nvwjb99"
const IS_MAINNET        = env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta"

// ── Helpers ───────────────────────────────────────────────────────────────────

function masterKey() {
  if (!WALLET_MASTER_KEY || WALLET_MASTER_KEY.length !== 64)
    throw new Error("WALLET_MASTER_KEY missing or wrong length")
  return Buffer.from(WALLET_MASTER_KEY, "hex")
}

function encryptSecret(secretKey) {
  const iv      = randomBytes(12)
  const cipher  = createCipheriv("aes-256-gcm", masterKey(), iv)
  const payload = Buffer.from(secretKey).toString("base64")
  const enc     = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()])
  const tag     = cipher.getAuthTag()
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`
}

function getFeePayer() {
  if (!FEE_PAYER_B64) throw new Error("APP_FEE_PAYER_KEY not set")
  return Keypair.fromSecretKey(Buffer.from(FEE_PAYER_B64, "base64"))
}

async function grantUSDC(connection, feePayer, recipientAddress) {
  const recipient  = new PublicKey(recipientAddress)
  const usdcMint   = new PublicKey(USDC_MINT_ADDR)
  const amount     = BigInt(1_000) * BigInt(10 ** 6) // 1000 USDC

  const recipientATA = await getOrCreateAssociatedTokenAccount(
    connection, feePayer, usdcMint, recipient
  )

  const mintInfo = await getMint(connection, usdcMint)
  const isMintAuth = mintInfo.mintAuthority?.toBase58() === feePayer.publicKey.toBase58()

  if (!isMintAuth) {
    console.warn("  Fee payer is NOT mint authority — skipping USDC grant")
    return null
  }

  const sig = await mintTo(connection, feePayer, usdcMint, recipientATA.address, feePayer, amount)
  return sig
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const supabase   = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const connection = new Connection(RPC_URL, "confirmed")
  const feePayer   = getFeePayer()

  // ── Phase 1: Grant USDC to wallets that exist but never received it ───────────
  if (!IS_MAINNET) {
    const { data: ungrantedWallets } = await supabase
      .from("user_wallets")
      .select("user_id, public_key")
      .eq("usdc_granted", false)

    if (ungrantedWallets?.length) {
      console.log(`Found ${ungrantedWallets.length} wallet(s) with usdc_granted = false:`)
      for (const w of ungrantedWallets) {
        console.log(`  • ${w.public_key} (user: ${w.user_id})`)
        try {
          const sig = await grantUSDC(connection, feePayer, w.public_key)
          if (sig) {
            console.log(`    ✓ Granted 1000 USDC — tx: ${sig}`)
            await supabase.from("user_wallets").update({ usdc_granted: true }).eq("user_id", w.user_id)
          }
        } catch (grantErr) {
          console.warn(`    ⚠ USDC grant failed: ${grantErr.message}`)
        }
      }
      console.log()
    }
  }

  // ── Phase 2: Create wallets for users who don't have one ─────────────────────
  const { data: walletRows } = await supabase.from("user_wallets").select("user_id")
  const walletUserIds = (walletRows ?? []).map(r => r.user_id)

  const { data: allProfiles, error: profileErr } = await supabase
    .from("profiles")
    .select("id, display_name, username")

  if (profileErr) { console.error("Failed to query profiles:", profileErr); process.exit(1) }

  const missingResult = (allProfiles ?? []).filter(p => !walletUserIds.includes(p.id))

  if (!missingResult?.length) {
    console.log("✓ All users already have wallets — nothing to do.")
    return
  }

  console.log(`Found ${missingResult.length} user(s) without wallets:`)
  for (const u of missingResult) {
    console.log(`  • ${u.display_name ?? u.username} (${u.id})`)
  }
  console.log()

  for (const user of missingResult) {
    console.log(`Provisioning wallet for ${user.display_name ?? user.username}...`)

    try {
      const keypair         = Keypair.generate()
      const publicKey       = keypair.publicKey.toBase58()
      const encryptedSecret = encryptSecret(keypair.secretKey)

      // Insert wallet (usdc_granted starts as false; updated below if grant succeeds)
      const { error: insertErr } = await supabase
        .from("user_wallets")
        .insert({ user_id: user.id, public_key: publicKey, encrypted_secret: encryptedSecret, usdc_granted: false })

      if (insertErr) throw new Error(`Insert failed: ${insertErr.message}`)

      // Update profile.solana_public_key
      await supabase.from("profiles").update({ solana_public_key: publicKey }).eq("id", user.id)

      console.log(`  ✓ Wallet created: ${publicKey}`)

      // Grant USDC (devnet only) and mark the flag on success
      if (!IS_MAINNET) {
        try {
          const sig = await grantUSDC(connection, feePayer, publicKey)
          if (sig) {
            console.log(`  ✓ Granted 1000 USDC — tx: ${sig}`)
            await supabase.from("user_wallets").update({ usdc_granted: true }).eq("user_id", user.id)
          }
        } catch (grantErr) {
          console.warn(`  ⚠ USDC grant failed: ${grantErr.message}`)
        }
      }
    } catch (err) {
      console.error(`  ✗ Failed for ${user.id}: ${err.message}`)
    }

    console.log()
  }

  console.log("Done.")
}

main().catch(err => { console.error(err); process.exit(1) })
