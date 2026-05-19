"use server"

import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token"
import { createClient } from "@/lib/supabase/server"
import { generateKeypair, encryptSecret } from "@/lib/solana/keypair"
import { getConnection } from "@/lib/solana/fee-payer"
import { USDC_MINT } from "@/lib/solana/constants"

// ── Ensure wallet exists for the current user ─────────────────────────────────
// Idempotent — safe to call on every login.
export async function ensureUserWallet(): Promise<{ publicKey: string | null; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { publicKey: null, error: "Não autenticado" }

  // Check for existing wallet
  const { data: existing } = await (supabase.from("user_wallets") as any)
    .select("public_key")
    .eq("user_id", user.id)
    .maybeSingle()

  if (existing?.public_key) return { publicKey: existing.public_key }

  // Create and persist a new keypair
  const keypair        = generateKeypair()
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
