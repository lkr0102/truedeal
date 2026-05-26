"use server"

import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token"
import { createClient, createServiceClient } from "@/lib/supabase/server"
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

  // Use service client for DB operations: bypasses RLS so the INSERT always
  // succeeds regardless of session propagation timing or policy edge cases.
  const svc = await createServiceClient()

  const { data: existing } = await (svc.from("user_wallets") as any)
    .select("public_key, usdc_granted")
    .eq("user_id", user.id)
    .maybeSingle()

  if (existing?.public_key) {
    if (shouldGrantUSDC() && !existing.usdc_granted) {
      grantDevnetUSDC(existing.public_key)
        .then(() =>
          (svc.from("user_wallets") as any)
            .update({ usdc_granted: true })
            .eq("user_id", user.id),
        )
        .catch((err) => console.error("[devnet] USDC retry grant failed:", err))
    }
    return { publicKey: existing.public_key }
  }

  try {
    const keypair         = generateKeypair()
    const encryptedSecret = encryptSecret(keypair.secretKey)
    const publicKey       = keypair.publicKey.toBase58()

    const { error } = await (svc.from("user_wallets") as any).insert({
      user_id:          user.id,
      public_key:       publicKey,
      encrypted_secret: encryptedSecret,
    })

    if (error) return { publicKey: null, error: error.message }

    await (svc.from("profiles") as any)
      .update({ solana_public_key: publicKey })
      .eq("id", user.id)

    if (shouldGrantUSDC()) {
      grantDevnetUSDC(publicKey)
        .then(() =>
          (svc.from("user_wallets") as any)
            .update({ usdc_granted: true })
            .eq("user_id", user.id),
        )
        .catch((err) => console.error("[devnet] USDC grant failed:", err))
    }

    return { publicKey }
  } catch (err: any) {
    console.error("[ensureUserWallet] keypair generation failed:", err.message)
    return { publicKey: null, error: err.message }
  }
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
    console.error("[claimDevnetUSDC] grant failed:", err?.message ?? err)
    return { success: false, error: err?.message ?? "Erro desconhecido" }
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

// ── Convenience: fetch balance for the currently authenticated user ────────────
export async function getMyUsdcBalance(): Promise<number> {
  const { publicKey } = await getMyWallet()
  if (!publicKey) return 0
  return getUsdcBalance(publicKey).catch(() => 0)
}
