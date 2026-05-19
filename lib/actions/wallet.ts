"use server"

import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token"
import { createClient } from "@/lib/supabase/server"
import { generateKeypair, encryptSecret } from "@/lib/solana/keypair"
import { getConnection } from "@/lib/solana/fee-payer"
import { USDC_MINT } from "@/lib/solana/constants"
import { grantDevnetUSDC } from "@/lib/solana/devnet-faucet"

function shouldGrantUSDC() {
  return process.env.NEXT_PUBLIC_SOLANA_NETWORK !== "mainnet-beta"
}

// ── Ensure wallet exists for the current user ─────────────────────────────────
// Idempotent — safe to call on every login.
export async function ensureUserWallet(): Promise<{ publicKey: string | null; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { publicKey: null, error: "Não autenticado" }

  // Check for existing wallet
  const { data: existing } = await (supabase.from("user_wallets") as any)
    .select("public_key, usdc_granted")
    .eq("user_id", user.id)
    .maybeSingle()

  if (existing?.public_key) {
    // Retry USDC grant if the DB flag shows it never succeeded (no RPC balance check needed)
    if (shouldGrantUSDC() && !existing.usdc_granted) {
      grantDevnetUSDC(existing.public_key)
        .then(() =>
          (supabase.from("user_wallets") as any)
            .update({ usdc_granted: true })
            .eq("user_id", user.id),
        )
        .catch((err) => console.error("[devnet] USDC retry grant failed:", err))
    }
    return { publicKey: existing.public_key }
  }

  // Create and persist a new keypair
  const keypair         = generateKeypair()
  const encryptedSecret = encryptSecret(keypair.secretKey)
  const publicKey       = keypair.publicKey.toBase58()

  const { error } = await (supabase.from("user_wallets") as any).insert({
    user_id:          user.id,
    public_key:       publicKey,
    encrypted_secret: encryptedSecret,
  })

  if (error) return { publicKey: null, error: error.message }

  // Denormalize into profiles for quick reads
  await (supabase.from("profiles") as any)
    .update({ solana_public_key: publicKey })
    .eq("id", user.id)

  // Grant 1,000 USDC to every new managed wallet (non-blocking) and mark the flag on success
  if (shouldGrantUSDC()) {
    grantDevnetUSDC(publicKey)
      .then(() =>
        (supabase.from("user_wallets") as any)
          .update({ usdc_granted: true })
          .eq("user_id", user.id),
      )
      .catch((err) => console.error("[devnet] USDC grant failed:", err))
  }

  return { publicKey }
}

// ── Read the current user's managed wallet ────────────────────────────────────
export async function getMyWallet(): Promise<{ publicKey: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { publicKey: null }

  const { data } = await (supabase.from("user_wallets") as any)
    .select("public_key")
    .eq("user_id", user.id)
    .maybeSingle()

  return { publicKey: data?.public_key ?? null }
}

// ── Manual devnet USDC faucet — for testers only ─────────────────────────────
export async function claimDevnetUSDC(): Promise<{ success: boolean; error?: string }> {
  if (process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta") {
    return { success: false, error: "Not available on mainnet" }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Não autenticado" }

  const { data } = await (supabase.from("user_wallets") as any)
    .select("public_key")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!data?.public_key) return { success: false, error: "Wallet não encontrada" }

  try {
    await grantDevnetUSDC(data.public_key)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ── Fetch SOL balance from the Solana RPC ─────────────────────────────────────
export async function getSolBalance(publicKeyStr: string): Promise<number> {
  try {
    const connection = getConnection()
    const lamports   = await connection.getBalance(new PublicKey(publicKeyStr))
    return lamports / LAMPORTS_PER_SOL
  } catch {
    return 0
  }
}

// ── Fetch USDC balance (ATA) from the Solana RPC ──────────────────────────────
export async function getUsdcBalance(publicKeyStr: string): Promise<number> {
  try {
    const connection = getConnection()
    const ata        = await getAssociatedTokenAddress(USDC_MINT, new PublicKey(publicKeyStr))
    const account    = await getAccount(connection, ata)
    return Number(account.amount) / 1_000_000   // USDC has 6 decimals
  } catch {
    return 0
  }
}
