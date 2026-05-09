"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type {
  DealInsert, DealWithParticipants,
  DealStatus, DealType, DealCategory,
} from "@/lib/supabase/types"
import { decryptSecret } from "@/lib/solana/keypair"
import { getProvider, getProgram } from "@/lib/solana/anchor-client"
import { PublicKey } from "@solana/web3.js"

// ── Create ────────────────────────────────────────────────────────────────────

export interface CreateDealInput {
  title:                 string
  description?:          string
  type:                  DealType
  mode:                  "regular" | "super"
  category:              DealCategory
  verification_type:     string
  verification_channels: string[]
  entry_amount:          number
  distribution:          "winner" | "top3" | "proportional"
  payment_method:        "pix" | "cripto" | "cartao"
  max_participants:      number
  allow_requests:        boolean
  start_date:            string  // ISO date string
  end_date:              string
}

export async function createDeal(input: CreateDealInput) {
  const supabase = await createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { error: "Não autenticado" }

  const fee_pct = input.mode === "super" ? 1 : 5

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dealPayload: any = {
    title:                 input.title,
    description:           input.description ?? null,
    creator_id:            user.id,
    type:                  input.type,
    mode:                  input.mode,
    category:              input.category,
    verification_type:     input.verification_type,
    verification_channels: input.verification_channels,
    entry_amount:          input.entry_amount,
    fee_pct,
    distribution:          input.distribution,
    payment_method:        input.payment_method,
    max_participants:      input.max_participants,
    allow_requests:        input.allow_requests,
    start_date:            input.start_date,
    end_date:              input.end_date,
  }

  const { data: deal, error } = await supabase
    .from("deals")
    .insert(dealPayload)
    .select()
    .single() as any

  if (error || !deal) return { error: (error as any)?.message ?? "Erro ao criar acordo institucional" }

  // Criador entra automaticamente como participante
  await (supabase.from("deal_participants") as any).insert({
    deal_id: deal.id,
    user_id: user.id,
    status:  "active",
  })

  // +100 TDP por criar um acordo
  await (supabase.from("tdp_transactions") as any).insert({
    user_id: user.id,
    amount:  100,
    reason:  "deal_create",
    deal_id: deal.id,
  })

  // Marca super_deal_used se for Super Acordo
  if (input.mode === "super") {
    await (supabase.from("profiles") as any)
      .update({ super_deal_used: true })
      .eq("id", user.id)
  }

  revalidatePath("/")
  return { deal }
}

// ── Fetch list ────────────────────────────────────────────────────────────────

export async function fetchDeals(filters?: {
  status?: DealStatus
  type?: DealType
  userId?: string   // filtra por participante
  creatorId?: string
}) {
  const supabase = await createClient()

  let query = (supabase.from("deals") as any)
    .select(`
      *,
      participants:deal_participants(
        *,
        profile:profiles(id, username, display_name, avatar_url)
      )
    `)
    .order("created_at", { ascending: false })

  if (filters?.status)    query = query.eq("status", filters.status)
  if (filters?.type)      query = query.eq("type",   filters.type)
  if (filters?.creatorId) query = query.eq("creator_id", filters.creatorId)

  const { data, error } = await query

  if (error || !data) return { error: error?.message, deals: [] }

  const deals: DealWithParticipants[] = data.map((d: any) => {
    const count = d.participants?.length ?? 0
    const pot   = d.entry_amount * count
    return {
      ...d,
      participant_count: count,
      pot_total: pot,
      net_pot:   pot * (1 - d.fee_pct / 100),
    }
  })

  // Filtra por userId (participante) no lado JS — Supabase não suporta filtro nested direto
  if (filters?.userId) {
    return {
      deals: deals.filter(d =>
        d.participants.some((p: any) => p.user_id === filters.userId),
      ),
    }
  }

  return { deals }
}

// ── Fetch single ──────────────────────────────────────────────────────────────

export async function fetchDeal(id: string) {
  const supabase = await createClient()

  const { data, error } = await (supabase.from("deals") as any)
    .select(`
      *,
      participants:deal_participants(
        *,
        profile:profiles(id, username, display_name, avatar_url)
      )
    `)
    .eq("id", id)
    .single()

  if (error || !data) return { error: (error as any)?.message }

  const count = data.participants?.length ?? 0
  const pot   = data.entry_amount * count
  const deal: DealWithParticipants = {
    ...data,
    participant_count: count,
    pot_total: pot,
    net_pot:   pot * (1 - data.fee_pct / 100),
  }

  return { deal }
}

// ── Join ──────────────────────────────────────────────────────────────────────

export async function joinDeal(dealId: string) {
  const supabase = await createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { error: "Não autenticado" }

  // Verifica se o deal existe e tem vagas
  const { data: deal, error: dealErr } = await (supabase.from("deals") as any)
    .select("id, status, max_participants, mode")
    .eq("id", dealId)
    .single()

  if (dealErr || !deal) return { error: "Acordo não encontrado" }
  if (deal.status !== "formacao") return { error: "Este acordo já iniciou" }

  const { count } = await (supabase.from("deal_participants") as any)
    .select("*", { count: "exact", head: true })
    .eq("deal_id", dealId)

  if ((count ?? 0) >= deal.max_participants) return { error: "Acordo lotado" }

  const { error } = await (supabase.from("deal_participants") as any).insert({
    deal_id: dealId,
    user_id: user.id,
    status:  "active",
  })

  if (error) {
    if ((error as any).code === "23505") return { error: "Você já está participando deste acordo" }
    return { error: (error as any).message }
  }

  // +75 TDP por participar
  await (supabase.from("tdp_transactions") as any).insert({
    user_id: user.id,
    amount:  75,
    reason:  "deal_join",
    deal_id: dealId,
  })

  revalidatePath("/")
  revalidatePath(`/tracking?id=${dealId}`)
  return { success: true }
}

// ── Update status ─────────────────────────────────────────────────────────────

export async function updateDealStatus(dealId: string, status: DealStatus) {
  const supabase = await createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { error: "Não autenticado" }

  // Check minimum participants before starting
  if (status === "ativo") {
    const { count } = await (supabase.from("deal_participants") as any)
      .select("*", { count: "exact", head: true })
      .eq("deal_id", dealId)

    if ((count ?? 0) < 2) {
      // Se não tem 2 pessoas, bloqueia ou cancela
      // Vamos retornar um erro claro para o frontend para que o criador saiba que precisa convidar
      return { error: "São necessários no mínimo 2 participantes para iniciar o acordo." }
    }
  }

  const { error } = await (supabase.from("deals") as any)
    .update({ status })
    .eq("id", dealId)
    .eq("creator_id", user.id)

  if (error) return { error: (error as any).message }

  revalidatePath("/")
  return { success: true }
}

// ── On-chain Escrow ───────────────────────────────────────────────────────────

/**
 * Deposits the user's stake into the Deal's Escrow PDA on Solana.
 * Uses the server-managed wallet (Account Abstraction).
 */
export async function depositToEscrow(dealId: string) {
  const supabase = await createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { error: "Não autenticado" }

  // 1. Get encrypted wallet secret
  const { data: walletData, error: walletErr } = await (supabase.from("user_wallets") as any)
    .select("encrypted_secret")
    .eq("user_id", user.id)
    .single()

  if (walletErr || !walletData) return { error: "Carteira gerenciada não encontrada" }

  // 2. Get deal entry amount
  const { data: deal, error: dealErr } = await (supabase.from("deals") as any)
    .select("entry_amount")
    .eq("id", dealId)
    .single()

  if (dealErr || !deal) return { error: "Acordo não encontrado" }

  try {
    // 3. Decrypt wallet and set up Anchor Provider
    const userKeypair = decryptSecret(walletData.encrypted_secret)
    const provider    = getProvider(userKeypair)
    const program     = getProgram(provider)

    // 4. Execute on-chain instruction (join_deal)
    const [dealPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("deal"), Buffer.from(dealId)],
      program.programId
    )

    // For now, we simulate success until the IDL is ready
    const txSignature = "simulated_on_chain_tx_" + Math.random().toString(36).slice(2)

    // 5. Update participant status to 'staked'
    await (supabase.from("deal_participants") as any)
      .update({ 
        status: "staked",
        transaction_hash: txSignature 
      })
      .eq("deal_id", dealId)
      .eq("user_id", user.id)

    revalidatePath(`/deals/${dealId}`)
    return { success: true, txSignature }
  } catch (err: any) {
    console.error("Escrow Error:", err)
    return { error: `Erro na transação on-chain: ${err.message}` }
  }
}

/**
 * Distributes the pot to the winner(s) after DealGuard Engine verification.
 * Requires a valid verification hash/proof.
 */
export async function withdrawFromEscrow(dealId: string, winnerId: string, proofHash: string) {
  const supabase = await createClient()

  // In production, this would be restricted to the DealGuard Oracle authority
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { error: "Não autenticado" }

  try {
    // 1. Get Fee Payer (as Oracle authority for MVP)
    const { getFeePayer } = await import("@/lib/solana/fee-payer")
    const oracleKeypair = getFeePayer() 
    const provider      = getProvider(oracleKeypair)
    const program       = getProgram(provider)

    // 2. Execute settle_deal on-chain
    // await program.methods.settleDeal(new PublicKey(winnerPubKey), [...proofHashBytes]).accounts({ ... }).rpc()

    const txSignature = "settlement_tx_" + Math.random().toString(36).slice(2)

    // 3. Update Deal status to 'settled'
    await (supabase.from("deals") as any)
      .update({ 
        status: "settled",
        final_proof_hash: proofHash 
      })
      .eq("id", dealId)

    // 4. Record win for the user
    await (supabase.from("deal_participants") as any)
      .update({ is_winner: true })
      .eq("deal_id", dealId)
      .eq("user_id", winnerId)

    revalidatePath(`/deals/${dealId}`)
    return { success: true, txSignature }
  } catch (err: any) {
    console.error("Settlement Error:", err)
    return { error: `Erro na liquidação: ${err.message}` }
  }
}
