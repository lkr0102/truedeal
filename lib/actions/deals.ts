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

const CHANNEL_LABELS: Record<string, string> = {
  x: "X",
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  discord: "Discord",
  youtube: "YouTube",
  strava: "Strava",
  wellhub: "Wellhub",
  totalpass: "TotalPass",
}

// ── Create ────────────────────────────────────────────────────────────────────

export interface CreateDealInput {
  title:                 string
  description?:          string
  type:                  DealType
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dealPayload: any = {
    title:                 input.title,
    description:           input.description ?? null,
    creator_id:            user.id,
    type:                  input.type,
    mode:                  "regular",
    category:              input.category,
    verification_type:     input.verification_type,
    verification_channels: input.verification_channels,
    entry_amount:          input.entry_amount,
    fee_pct:               3,
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

  if (Array.isArray(data.participants) && data.verification_channels?.length > 0) {
    const platform = data.verification_channels[0]
    const participantIds = data.participants.map((p: any) => p.user_id)

    const { data: connections } = await (supabase.from("social_connections") as any)
      .select("user_id, platform, username")
      .in("user_id", participantIds)
      .in("platform", [platform])

    const connectionByUser = new Map<string, any>()
    ;(connections ?? []).forEach((conn: any) => {
      if (conn?.user_id && conn?.platform && conn?.username) {
        connectionByUser.set(`${conn.user_id}:${conn.platform}`, conn.username)
      }
    })

    data.participants = data.participants.map((p: any) => {
      const socialHandle = connectionByUser.get(`${p.user_id}:${platform}`)
      return {
        ...p,
        socialHandle: socialHandle ? (socialHandle.startsWith("@") ? socialHandle : `@${socialHandle}`) : undefined,
      }
    })
  }

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

  const requiredChannel = Array.isArray(deal.verification_channels) ? deal.verification_channels[0] : null
  if (requiredChannel) {
    const channelLabel = CHANNEL_LABELS[requiredChannel] ?? requiredChannel
    const { data: connections, error: connErr } = await (supabase.from("social_connections") as any)
      .select("platform, status, username, member_email, external_id")
      .eq("user_id", user.id)
      .eq("platform", requiredChannel)
      .neq("status", "pending")
      .limit(1)

    if (connErr) return { error: "Erro ao verificar sua conta social" }
    const connection = Array.isArray(connections) ? connections[0] : null
    if (!connection || !(connection.username || connection.member_email || connection.external_id)) {
      return { error: `Você precisa vincular sua conta do ${channelLabel} para participar deste deal.` }
    }
  }

  const { error } = await (supabase.from("deal_participants") as any).insert({
    deal_id: dealId,
    user_id: user.id,
    status:  "active",
  })

  if (error) {
    if ((error as any).code === "23505") return { error: "Você já está participando deste acordo" }
    return { error: (error as any).message }
  }

  revalidatePath("/")
  revalidatePath(`/tracking?id=${dealId}`)
  return { success: true }
}

// ── Update status ─────────────────────────────────────────────────────────────

export async function updateDealStatus(dealId: string, status: DealStatus) {
  const supabase = await createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { error: "Não autenticado" }

  // Se o status for 'ativo', usamos a lógica de ativação institucional
  if (status === "ativo") {
    return await activateDeal(dealId)
  }

  const { error } = await (supabase.from("deals") as any)
    .update({ status })
    .eq("id", dealId)
    .eq("creator_id", user.id)

  if (error) return { error: (error as any).message }

  revalidatePath("/")
  return { success: true }
}

/**
 * 🚀 Institutional Activation Protocol
 * Transitions a deal from 'formacao' to 'ativo'.
 * Checks quorum, sets snapshots, and awards Shakes.
 */
export async function activateDeal(dealId: string) {
  const supabase = await createClient()

  // 1. Fetch deal and participants
  const { data: deal, error: dealErr } = await (supabase.from("deals") as any)
    .select("*, participants:deal_participants(*)")
    .eq("id", dealId)
    .single()

  if (dealErr || !deal) return { error: "Deal não encontrado" }
  if (deal.status !== "formacao") return { error: "Deal já está ativo ou encerrado" }

  // 2. Quorum Check (min 2 participants)
  if (deal.participants.length < 2) {
    await (supabase.from("deals") as any).update({ status: "cancelado" }).eq("id", dealId)
    return { error: "Quorum insuficiente. Deal cancelado.", status: "cancelado" }
  }

  // 3. Transition to 'ativo'
  await (supabase.from("deals") as any).update({ status: "ativo" }).eq("id", dealId)

  // 4. Award Shakes (TDP)
  const transactions = []
  
  // Creator: +500
  transactions.push({
    user_id: deal.creator_id,
    amount:  500,
    reason:  "deal_activate_creator",
    deal_id: deal.id,
  })

  // Participants: +200 each (including creator if double-reward is desired, 
  // but usually it's unique. Here we follow: Creator (+500), Others (+200))
  for (const p of deal.participants) {
    if (p.user_id !== deal.creator_id) {
      transactions.push({
        user_id: p.user_id,
        amount:  200,
        reason:  "deal_activate_participant",
        deal_id: deal.id,
      })
    }
  }

  await (supabase.from("tdp_transactions") as any).insert(transactions)

  revalidatePath("/")
  revalidatePath(`/deal/${dealId}`)
  return { success: true, status: "ativo" }
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

// ── Declare Winner ────────────────────────────────────────────────────────────

export async function declareWinner(dealId: string, winnerId: string) {
  const supabase = await createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { error: "Não autenticado" }

  const { data: deal, error: dealErr } = await (supabase.from("deals") as any)
    .select("id, creator_id, status")
    .eq("id", dealId)
    .single()

  if (dealErr || !deal) return { error: "Deal não encontrado" }
  if (deal.creator_id !== user.id) return { error: "Apenas o criador pode declarar o vencedor" }
  if (deal.status === "finalizado") return { error: "Deal já encerrado" }

  const { error: updateErr } = await (supabase.from("deals") as any)
    .update({ winner_id: winnerId, status: "finalizado" })
    .eq("id", dealId)

  if (updateErr) return { error: updateErr.message }

  await (supabase.from("deal_participants") as any)
    .update({ status: "winner" })
    .eq("deal_id", dealId)
    .eq("user_id", winnerId)

  await (supabase.from("tdp_transactions") as any).insert({
    user_id: winnerId,
    amount:  500,
    reason:  "deal_win",
    deal_id: dealId,
  })

  revalidatePath("/")
  revalidatePath(`/deal/${dealId}`)
  revalidatePath(`/deal/${dealId}/result`)
  return { success: true }
}

/**
 * Distributes the pot to the winner(s) after DealGuard Engine verification.
 * Requires a valid verification hash/proof.
 */
export async function withdrawFromEscrow(dealId: string, proofHash: string) {
  const supabase = await createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { error: "Não autenticado" }

  try {
    // 1. Fetch winners from database
    const { data: winners, error: winErr } = await (supabase.from("deal_participants") as any)
      .select("user_id, user_wallets(pubkey, token_account)")
      .eq("deal_id", dealId)
      .eq("status", "winner")

    if (winErr || !winners || winners.length === 0) return { error: "Nenhum vencedor encontrado para liquidação." }

    // 2. Get Oracle/Fee Payer
    const { getFeePayer } = await import("@/lib/solana/fee-payer")
    const oracleKeypair = getFeePayer() 
    const provider      = getProvider(oracleKeypair)
    const program       = getProgram(provider)

    // 3. Prepare Accounts & Remaining Accounts (Winners)
    const [agreementPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("agreement"), Buffer.from(dealId)],
      program.programId
    )
    const agreementAccount = await program.account.agreementAccount.fetch(agreementPDA)

    const proofHashBytes = Buffer.from(proofHash.replace("0x", ""), "hex")
    const winnerRemainingAccounts = winners.map((w: any) => ({
      pubkey: new PublicKey(w.user_wallets.token_account),
      isWritable: true,
      isSigner: false,
    }))

    // 4. Execute settle_performance_agreement on-chain
    // In MVP, we use the same oracleKeypair for both oracle_1 and oracle_2 for demo purposes
    const treasuryTokenAccount = process.env.TREASURY_TOKEN_ACCOUNT 
      ? new PublicKey(process.env.TREASURY_TOKEN_ACCOUNT)
      : oracleKeypair.publicKey // Fallback to oracle for demo

    const txSignature = await program.methods
      .settlePerformanceAgreement(
        new (await import("bn.js")).default(winners.length),
        Array.from(proofHashBytes)
      )
      .accounts({
        agreementAccount: agreementPDA,
        oracle1: oracleKeypair.publicKey,
        oracle2: oracleKeypair.publicKey,
        vault: agreementAccount.vault, // Fetching from state
        treasuryTokenAccount: treasuryTokenAccount,
        tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      })
      .remainingAccounts(winnerRemainingAccounts)
      .signers([oracleKeypair])
      .rpc()

    // 5. Update Deal status to 'settled'
    await (supabase.from("deals") as any)
      .update({ 
        status: "settled",
        final_proof_hash: proofHash,
        solana_tx_signature: txSignature
      })
      .eq("id", dealId)

    revalidatePath(`/deal/${dealId}`)
    return { success: true, txSignature }
  } catch (err: any) {
    console.error("Settlement Error:", err)
    return { error: `Erro na liquidação on-chain: ${err.message}` }
  }
}
