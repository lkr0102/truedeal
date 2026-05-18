"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type {
  DealWithParticipants,
  DealStatus, DealType, DealCategory,
} from "@/lib/supabase/types"
import { decryptSecret } from "@/lib/solana/keypair"
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

// ── Sweep stale forming deals (<2 participants past start date) ───────────────

export async function sweepStaleDeals() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("seu-projeto")) return
  const supabase = await createClient()

  const today = new Date().toISOString().split("T")[0]

  const { data: stale } = await (supabase.from("deals") as any)
    .select("id, deal_participants(id)")
    .eq("status", "formacao")
    .lt("start_date", today)

  if (!stale?.length) return

  const toCancel: string[] = (stale as any[])
    .filter((d: any) => (d.deal_participants?.length ?? 0) < 2)
    .map((d: any) => d.id)

  if (!toCancel.length) return

  await (supabase.from("deals") as any)
    .update({ status: "encerrado" })
    .in("id", toCancel)

  revalidatePath("/")
}

// ── Create ────────────────────────────────────────────────────────────────────

export interface CreateDealInput {
  title:                 string
  description?:          string
  type:                  DealType
  category:              DealCategory
  verification_type:     string
  verification_channels: string[]
  rule_target:           number        // numeric goal (e.g. 10 for "10 km" or "10 posts")
  rule_frequency:        string        // 'daily' | 'weekly' | 'monthly' | 'yearly'
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

  // Guard: creator must have the required social channels connected
  if (input.verification_channels.length > 0) {
    const emailOnlyPlatforms = new Set(["wellhub", "totalpass"])
    const { data: conns } = await (supabase.from("social_connections") as any)
      .select("platform, status, username, member_email, external_id")
      .eq("user_id", user.id)
      .in("platform", input.verification_channels)

    const connected = new Set(
      ((conns ?? []) as any[])
        .filter(c => {
          if (!c.username && !c.member_email && !c.external_id) return false
          return emailOnlyPlatforms.has(c.platform) || c.status !== "pending"
        })
        .map(c => c.platform)
    )
    const missing = input.verification_channels.filter(ch => !connected.has(ch))
    if (missing.length > 0) return { error: `MISSING_SOCIAL:${missing.join(",")}` }
  }

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
    rule_target:           input.rule_target,
    rule_frequency:        input.rule_frequency,
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

  // ── On-chain: register AgreementAccount PDA + USDC vault (TX 1) ─────────────
  // Non-blocking — deal exists in Supabase regardless of on-chain success.
  try {
    const { createHash } = await import("crypto")
    const { getFeePayer } = await import("@/lib/solana/fee-payer")
    const { initPerformanceAgreement, deriveAgreementPDA } = await import("@/lib/solana/anchor-client")
    const { toUSDCUnits } = await import("@/lib/solana/constants")

    const feePayer      = getFeePayer()
    const ruleHash      = createHash("sha256")
      .update(`${input.verification_type}:${input.verification_channels.join(",")}:${input.rule_target}:${input.rule_frequency}`)
      .digest()
    const guaranteeUSDC = toUSDCUnits(input.entry_amount)   // entry_amount treated as USD

    const txSig = await initPerformanceAgreement(feePayer, deal.id, guaranteeUSDC, ruleHash)
    const [pda]  = deriveAgreementPDA(deal.id)

    await (supabase.from("deals") as any)
      .update({ solana_tx_signature: txSig, pda_address: pda.toString() })
      .eq("id", deal.id)

    console.log(`[Anchor] Deal ${deal.id} registered on-chain: ${txSig}`)
  } catch (err) {
    console.error("[Anchor] initPerformanceAgreement failed (non-blocking):", err)
  }

  revalidatePath("/")
  return { deal }
}

// ── Mock Data for Demo Mode ───────────────────────────────────────────────────

const LUKAS_ID = "demo-lukas-admin-uuid"

const MOCK_DEALS: DealWithParticipants[] = [
  {
    id: "mock-deal-1",
    title: "100k Steps Challenge",
    description: "Caminhada institucional de 100 mil passos em 7 dias. Verificação via Strava.",
    creator_id: LUKAS_ID,
    type: "oficial",
    mode: "regular",
    status: "ativo",
    category: "fitness",
    verification_type: "fitness_steps",
    verification_channels: ["strava"],
    entry_amount: 50,
    fee_pct: 3,
    distribution: "winner",
    payment_method: "cripto",
    max_participants: 10,
    allow_requests: true,
    start_date: new Date(Date.now() - 3 * 86400000).toISOString(),
    end_date: new Date(Date.now() + 4 * 86400000).toISOString(),
    rule_target: null,
    rule_frequency: null,
    pda_address: null,
    solana_tx_signature: null,
    proof_hash: null,
    final_proof_hash: null,
    audit_logs: null,
    winner_id: null,
    created_at: new Date().toISOString(),
    participant_count: 3,
    pot_total: 150,
    net_pot: 145.5,
    participants: [
      {
        id: "p1", deal_id: "mock-deal-1", user_id: LUKAS_ID, joined_at: new Date().toISOString(), status: "active",
        start_snapshot: { steps: 1000 }, current_snapshot: { steps: 45000 }, rank: 1,
        profile: { id: LUKAS_ID, username: "lukas_admin", display_name: "Lukas Admin", avatar_url: "/images/avatars/lukas.png" }
      },
      {
        id: "p2", deal_id: "mock-deal-1", user_id: "u2", joined_at: new Date().toISOString(), status: "active",
        start_snapshot: { steps: 500 }, current_snapshot: { steps: 32000 }, rank: 2,
        profile: { id: "u2", username: "joao_dev", display_name: "João Dev", avatar_url: null }
      },
      {
        id: "p3", deal_id: "mock-deal-1", user_id: "u3", joined_at: new Date().toISOString(), status: "eliminated",
        start_snapshot: { steps: 200 }, current_snapshot: { steps: 5000 }, rank: 3,
        profile: { id: "u3", username: "slacker", display_name: "The Slacker", avatar_url: null }
      }
    ]
  },
  {
    id: "mock-deal-2",
    title: "Twitter Engagement Battle",
    description: "Quem conseguir mais likes em um post oficial da True Deal.",
    creator_id: "other-user",
    type: "publico",
    mode: "regular",
    status: "finalizado",
    category: "social",
    verification_type: "social_likes",
    verification_channels: ["x"],
    entry_amount: 100,
    fee_pct: 3,
    distribution: "top3",
    payment_method: "cripto",
    max_participants: 20,
    allow_requests: false,
    start_date: new Date(Date.now() - 10 * 86400000).toISOString(),
    end_date: new Date(Date.now() - 3 * 86400000).toISOString(),
    rule_target: null,
    rule_frequency: null,
    pda_address: null,
    solana_tx_signature: null,
    proof_hash: null,
    final_proof_hash: null,
    audit_logs: null,
    winner_id: LUKAS_ID,
    created_at: new Date().toISOString(),
    participant_count: 5,
    pot_total: 500,
    net_pot: 485,
    participants: [
      {
        id: "p4", deal_id: "mock-deal-2", user_id: LUKAS_ID, joined_at: new Date().toISOString(), status: "winner",
        start_snapshot: { likes: 0 }, current_snapshot: { likes: 1250 }, rank: 1,
        profile: { id: LUKAS_ID, username: "lukas_admin", display_name: "Lukas Admin", avatar_url: "/images/avatars/lukas.png" }
      }
    ]
  }
]

// ── Fetch list ────────────────────────────────────────────────────────────────

export async function fetchDeals(filters?: {
  status?: DealStatus
  type?: DealType
  userId?: string   // filtra por participante
  creatorId?: string
}) {
  const supabase = await createClient()
  const isPlaceholder = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("seu-projeto")

  if (isPlaceholder) {
    let deals = [...MOCK_DEALS]
    if (filters?.userId) {
      deals = deals.filter(d => d.participants.some(p => p.user_id === filters.userId))
    }
    if (filters?.status) deals = deals.filter(d => d.status === filters.status)
    if (filters?.type)   deals = deals.filter(d => d.type === filters.type)
    return { deals }
  }

  let query = (supabase.from("deals") as any)
    .select(`
      *,
      participants:deal_participants(
        *,
        profile:profiles(id, username, display_name, avatar_url)
      )
    `)
    .order("created_at", { ascending: false })
    .neq("status", "encerrado")

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
  const isPlaceholder = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("seu-projeto")

  if (isPlaceholder) {
    const deal = MOCK_DEALS.find(d => d.id === id)
    return deal ? { deal } : { error: "Acordo não encontrado (Mock)" }
  }

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
    .select("id, status, max_participants, mode, entry_amount, verification_channels")
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

  const { error: insertErr } = await (supabase.from("deal_participants") as any).insert({
    deal_id: dealId,
    user_id: user.id,
    status:  "active",
  })

  if (insertErr) {
    if ((insertErr as any).code === "23505") return { error: "Você já está participando deste acordo" }
    return { error: (insertErr as any).message }
  }

  // ── On-chain: stake USDC to vault PDA (TX 2) ─────────────────────────────────
  // Non-blocking — participant is registered in DB regardless of on-chain result.
  let txSignature: string | undefined
  try {
    const { data: walletData } = await (supabase.from("user_wallets") as any)
      .select("encrypted_secret")
      .eq("user_id", user.id)
      .single()

    if (walletData?.encrypted_secret && deal.entry_amount > 0) {
      const { getFeePayer } = await import("@/lib/solana/fee-payer")
      const { joinAgreementUSDC } = await import("@/lib/solana/anchor-client")

      const userKeypair = decryptSecret(walletData.encrypted_secret)
      const feePayer    = getFeePayer()

      txSignature = await joinAgreementUSDC(userKeypair, feePayer, dealId)

      await (supabase.from("deal_participants") as any)
        .update({ transaction_hash: txSignature, status: "staked" })
        .eq("deal_id", dealId)
        .eq("user_id", user.id)

      console.log(`[USDC] Participant ${user.id} staked for deal ${dealId}: ${txSignature}`)
    }
  } catch (err) {
    console.error("[Solana] joinAgreementUSDC failed (non-blocking):", err)
  }

  revalidatePath("/")
  revalidatePath(`/tracking?id=${dealId}`)
  return { success: true, txSignature }
}

// ── Update status ─────────────────────────────────────────────────────────────

export async function updateDealStatus(dealId: string, status: DealStatus) {
  const supabase = await createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { error: "Não autenticado" }

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
 * Institutional Activation Protocol
 * Transitions a deal from 'formacao' to 'ativo'.
 * Checks quorum, sets snapshots, and awards Shakes.
 */
export async function activateDeal(dealId: string) {
  const supabase = await createClient()

  const { data: deal, error: dealErr } = await (supabase.from("deals") as any)
    .select("*, participants:deal_participants(*)")
    .eq("id", dealId)
    .single()

  if (dealErr || !deal) return { error: "Deal não encontrado" }
  if (deal.status !== "formacao") return { error: "Deal já está ativo ou encerrado" }

  if (deal.participants.length < 2) {
    await (supabase.from("deals") as any).update({ status: "cancelado" }).eq("id", dealId)
    return { error: "Quorum insuficiente. Deal cancelado.", status: "cancelado" }
  }

  await (supabase.from("deals") as any).update({ status: "ativo" }).eq("id", dealId)

  const transactions = []

  transactions.push({
    user_id: deal.creator_id,
    amount:  500,
    reason:  "deal_activate_creator",
    deal_id: deal.id,
  })

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

// ── On-chain Escrow (legacy single-step) ─────────────────────────────────────

/**
 * Deposits the user's stake into the treasury escrow via native SOL transfer.
 * Checks if already staked to prevent double-charging.
 */
export async function depositToEscrow(dealId: string) {
  const supabase = await createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { error: "Não autenticado" }

  // Guard: skip if already staked (joinDeal already handled it)
  const { data: participant } = await (supabase.from("deal_participants") as any)
    .select("status, transaction_hash")
    .eq("deal_id", dealId)
    .eq("user_id", user.id)
    .single()

  if (participant?.transaction_hash) {
    return { success: true, txSignature: participant.transaction_hash }
  }

  const { data: walletData, error: walletErr } = await (supabase.from("user_wallets") as any)
    .select("encrypted_secret")
    .eq("user_id", user.id)
    .single()

  if (walletErr || !walletData) return { error: "Carteira gerenciada não encontrada" }

  const { data: deal, error: dealErr } = await (supabase.from("deals") as any)
    .select("entry_amount")
    .eq("id", dealId)
    .single()

  if (dealErr || !deal) return { error: "Acordo não encontrado" }

  try {
    const { getFeePayer } = await import("@/lib/solana/fee-payer")
    const { joinAgreementUSDC } = await import("@/lib/solana/anchor-client")

    const userKeypair = decryptSecret(walletData.encrypted_secret)
    const feePayer    = getFeePayer()

    const txSignature = await joinAgreementUSDC(userKeypair, feePayer, dealId)

    await (supabase.from("deal_participants") as any)
      .update({ status: "staked", transaction_hash: txSignature })
      .eq("deal_id", dealId)
      .eq("user_id", user.id)

    revalidatePath(`/deal/${dealId}`)
    return { success: true, txSignature }
  } catch (err: any) {
    console.error("[Solana] joinAgreementUSDC failed:", err)
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

// ── Settlement: DealGuard Sovereign Payout (TX 3) ────────────────────────────

/**
 * Distributes USDC to winners via the on-chain Anchor settle instruction.
 * Economic logic (Slacker Tax 3%) is fully enforced by the smart contract.
 * Dual-oracle signatures (oracle1 + oracle2) authorize the settlement.
 */
export async function withdrawFromEscrow(dealId: string, proofHash: string) {
  const supabase = await createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { error: "Não autenticado" }

  try {
    // 1. Fetch winners and their wallet pubkeys
    const { data: winners, error: winErr } = await (supabase.from("deal_participants") as any)
      .select("user_id, user_wallets(public_key)")
      .eq("deal_id", dealId)
      .eq("status", "winner")

    if (winErr || !winners || winners.length === 0) {
      return { error: "Nenhum vencedor encontrado para liquidação." }
    }

    // 2. Load dual-oracle keypairs
    const { getFeePayer, getOracle2 } = await import("@/lib/solana/fee-payer")
    const { settlePerformanceAgreement } = await import("@/lib/solana/anchor-client")
    const { USDC_MINT } = await import("@/lib/solana/constants")
    const { getAssociatedTokenAddress } = await import("@solana/spl-token")

    const oracle1 = getFeePayer()
    const oracle2 = getOracle2()

    // 3. Collect winner wallet pubkeys
    const winnerPubkeys = winners
      .filter((w: any) => w.user_wallets?.public_key)
      .map((w: any) => new PublicKey(w.user_wallets.public_key))

    if (winnerPubkeys.length === 0) {
      return { error: "Carteiras dos vencedores não encontradas." }
    }

    // 4. Treasury USDC ATA (oracle1 receives the 3% fee)
    const treasuryUsdcATA = await getAssociatedTokenAddress(USDC_MINT, oracle1.publicKey)

    // 5. Convert proof hash hex string → Uint8Array
    const { createHash } = await import("crypto")
    const proofHashBytes = Buffer.from(proofHash.replace("0x", ""), "hex")

    console.log(`[Settlement] ${winnerPubkeys.length} winners for deal ${dealId}`)

    // 6. On-chain settle — Rust contract handles all economic distribution
    const txSignature = await settlePerformanceAgreement(
      oracle1,
      oracle2,
      dealId,
      winnerPubkeys,
      treasuryUsdcATA,
      proofHashBytes,
      BigInt(winnerPubkeys.length),
    )

    // 7. Persist final settlement state
    await (supabase.from("deals") as any)
      .update({
        status:              "encerrado",   // enum value added in migration 010
        final_proof_hash:    proofHash,     // column added in migration 009
        solana_tx_signature: txSignature,
      })
      .eq("id", dealId)

    revalidatePath(`/deal/${dealId}`)
    return { success: true, txSignature }
  } catch (err: any) {
    console.error("[Settlement] withdrawFromEscrow failed:", err)
    return { error: `Erro na liquidação on-chain: ${err.message}` }
  }
}
