"use server"

import { revalidatePath } from "next/cache"
import { createClient, createServiceClient } from "@/lib/supabase/server"
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
  totalpass: "TotalPass",
}

// ── Sweep stale forming deals (<2 participants past start date) ───────────────
// Subtract 3h from now to match getStartTarget (T03:00:00Z = midnight BRT),
// so deals whose start window passed today are included.

export async function sweepStaleDeals() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("seu-projeto")) return
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return

  try {
    const supabase = await createServiceClient()

    const sweepDate = new Date(Date.now() - 3 * 3600 * 1000).toISOString().split("T")[0]

    const { data: stale } = await (supabase.from("deals") as any)
      .select("id, title, entry_amount, pda_address, deal_participants(id, user_id)")
      .eq("status", "formacao")
      .lte("start_date", sweepDate)

    if (!stale?.length) return

    const toActivate: string[] = (stale as any[])
      .filter((d: any) => (d.deal_participants?.length ?? 0) >= 2)
      .map((d: any) => d.id)

    const toCancel: { id: string; title: string; entry_amount: number; participants: any[] }[] = (stale as any[])
      .filter((d: any) => (d.deal_participants?.length ?? 0) < 2)
      .map((d: any) => ({ id: d.id, title: d.title ?? "", entry_amount: d.entry_amount ?? 0, pda_address: d.pda_address ?? null, participants: d.deal_participants ?? [] }))

    for (const dealId of toActivate) {
      await (supabase.from("deals") as any).update({ status: "ativo" }).eq("id", dealId)
      const dealData = (stale as any[]).find((d: any) => d.id === dealId)
      if (dealData) {
        try {
          const { createNotification } = await import("@/lib/actions/notifications")
          const count = dealData.deal_participants?.length ?? 0
          const pot = (dealData.entry_amount * count).toFixed(0)
          for (const p of dealData.deal_participants ?? []) {
            await createNotification(supabase, {
              user_id:  p.user_id, type: "deal_started", deal_id: dealId,
              title_pt: "Deal iniciado! 🚀", title_en: "Deal started! 🚀",
              body_pt:  `O deal "${dealData.title}" começou com ${count} participantes. Pote: $${pot}. Boa sorte!`,
              body_en:  `Deal "${dealData.title}" kicked off with ${count} participants. Pot: $${pot}. Good luck!`,
            })
          }
        } catch (err: any) {
          console.error("[notifications] sweepStaleDeals activate notify failed:", err?.message)
        }
      }
    }

    if (!toCancel.length) return

    const hasOracleKey = !!process.env.APP_FEE_PAYER_KEY
    for (const deal of toCancel) {
      try {
        if (hasOracleKey && deal.entry_amount > 0 && deal.participants.length > 0) {
          const userIds = deal.participants.map((p: any) => p.user_id)
          const { data: wallets } = await (supabase.from("user_wallets") as any)
            .select("public_key")
            .in("user_id", userIds)

          const pubkeys: PublicKey[] = (wallets ?? [])
            .filter((w: any) => w.public_key)
            .map((w: any) => new PublicKey(w.public_key))

          if (pubkeys.length > 0) {
            const { getFeePayer } = await import("@/lib/solana/fee-payer")
            const feePayer = getFeePayer()
            if (deal.pda_address) {
              const { cancelAgreement } = await import("@/lib/solana/anchor-client")
              await cancelAgreement(feePayer, deal.id, pubkeys)
            } else {
              // Pre-migration deal: USDC in feePayer ATA, not vault PDA
              const { refundUsdcDirect } = await import("@/lib/solana/escrow")
              const { toUSDCUnits }       = await import("@/lib/solana/constants")
              await refundUsdcDirect(feePayer, pubkeys, toUSDCUnits(deal.entry_amount))
            }
          }
        }
      } catch (err: any) {
        console.error(`[sweep] Refund failed for deal ${deal.id}:`, err.message)
      }
    }

    await (supabase.from("deals") as any)
      .update({ status: "encerrado" })
      .in("id", toCancel.map((d) => d.id))

    try {
      const { createNotification } = await import("@/lib/actions/notifications")
      for (const deal of toCancel) {
        for (const p of deal.participants) {
          await createNotification(supabase, {
            user_id:  p.user_id, type: "deal_cancelled", deal_id: deal.id,
            title_pt: "Deal cancelado", title_en: "Deal cancelled",
            body_pt:  `O deal "${deal.title}" foi cancelado por falta de participantes. Seu valor será reembolsado.`,
            body_en:  `Deal "${deal.title}" was cancelled — not enough participants. Your stake will be refunded.`,
          })
        }
      }
    } catch (err: any) {
      console.error("[notifications] sweepStaleDeals cancel notify failed:", err?.message)
    }

    revalidatePath("/")
  } catch (err: any) {
    console.error("[sweep] sweepStaleDeals failed:", err.message)
  }
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
    const emailOnlyPlatforms = new Set(["totalpass"])
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

  // Set short_id from UUID immediately (will be upgraded to tx hash after on-chain success)
  const uuidShortId = deal.id.replace(/-/g, "").slice(-8).toUpperCase()
  await (supabase.from("deals") as any).update({ short_id: uuidShortId }).eq("id", deal.id)

  // Criador entra automaticamente como participante
  await (supabase.from("deal_participants") as any).insert({
    deal_id: deal.id,
    user_id: user.id,
    status:  "active",
  })

  // ── On-chain: init PDA vault + stake creator USDC into vault ─────────────────
  // Non-blocking — deal exists in Supabase regardless of on-chain success.
  let stakeTxSignature: string | undefined
  try {
    const { getFeePayer } = await import("@/lib/solana/fee-payer")
    const { toUSDCUnits } = await import("@/lib/solana/constants")
    const {
      initPerformanceAgreement,
      joinAgreementUSDC,
      deriveAgreementPDA,
    } = await import("@/lib/solana/anchor-client")
    const { generateEvidenceHash } = await import("@/lib/integrations/crypto-proof")

    const { data: walletData } = await (supabase.from("user_wallets") as any)
      .select("encrypted_secret")
      .eq("user_id", user.id)
      .single()

    if (walletData?.encrypted_secret && process.env.APP_FEE_PAYER_KEY) {
      const feePayer    = getFeePayer()
      const userKeypair = decryptSecret(walletData.encrypted_secret)

      // Hash of empty audit results serves as the rule commitment at init time
      const ruleHashHex   = generateEvidenceHash(deal.id, [])
      const ruleHashBytes = Buffer.from(ruleHashHex, "hex")

      await initPerformanceAgreement(feePayer, deal.id, toUSDCUnits(input.entry_amount), ruleHashBytes)

      const [pdaAddress] = deriveAgreementPDA(deal.id)

      if (input.entry_amount > 0) {
        stakeTxSignature = await joinAgreementUSDC(userKeypair, feePayer, deal.id)
      }

      const txShortId = stakeTxSignature ? stakeTxSignature.slice(-8).toUpperCase() : uuidShortId
      await Promise.all([
        (supabase.from("deals") as any)
          .update({
            pda_address:         pdaAddress.toBase58(),
            solana_tx_signature: stakeTxSignature ?? null,
            short_id:            txShortId,
          })
          .eq("id", deal.id),
        stakeTxSignature
          ? (supabase.from("deal_participants") as any)
              .update({ transaction_hash: stakeTxSignature })
              .eq("deal_id", deal.id)
              .eq("user_id", user.id)
          : Promise.resolve(),
      ])

      console.log(`[Anchor] PDA initialized and creator staked for deal ${deal.id}: ${stakeTxSignature}`)
    }
  } catch (err: any) {
    console.error("[Anchor] initPerformanceAgreement / joinAgreementUSDC failed (non-blocking):", err?.message ?? err)
    if (!process.env.APP_FEE_PAYER_KEY) console.error("[Anchor] APP_FEE_PAYER_KEY is not set — on-chain init skipped")
  }

  revalidatePath("/")
  return { deal, stakeTxSignature }
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
    short_id: "MOCK0001",
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
        start_snapshot: { steps: 1000 }, current_snapshot: { steps: 45000 }, rank: 1, transaction_hash: null,
        profile: { id: LUKAS_ID, username: "lukas_admin", display_name: "Lukas Admin", avatar_url: "/images/avatars/lukas.png" }
      },
      {
        id: "p2", deal_id: "mock-deal-1", user_id: "u2", joined_at: new Date().toISOString(), status: "active",
        start_snapshot: { steps: 500 }, current_snapshot: { steps: 32000 }, rank: 2, transaction_hash: null,
        profile: { id: "u2", username: "joao_dev", display_name: "João Dev", avatar_url: null }
      },
      {
        id: "p3", deal_id: "mock-deal-1", user_id: "u3", joined_at: new Date().toISOString(), status: "eliminated",
        start_snapshot: { steps: 200 }, current_snapshot: { steps: 5000 }, rank: 3, transaction_hash: null,
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
    short_id: "MOCK0002",
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
        start_snapshot: { likes: 0 }, current_snapshot: { likes: 1250 }, rank: 1, transaction_hash: null,
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
    .select("id, status, max_participants, mode, entry_amount, verification_channels, creator_id, title, pda_address")
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

  // ── Notifications ─────────────────────────────────────────────────────────────
  try {
    const { createNotification } = await import("@/lib/actions/notifications")
    const { createServiceClient } = await import("@/lib/supabase/server")
    const svc = await createServiceClient()

    const { data: joinerProfile } = await (supabase.from("profiles") as any)
      .select("display_name, username").eq("id", user.id).single()
    const joinerName = joinerProfile?.display_name ?? joinerProfile?.username ?? "Alguém"

    const { count: totalCount } = await (svc.from("deal_participants") as any)
      .select("user_id", { count: "exact", head: true }).eq("deal_id", dealId)
    const total = totalCount ?? 1
    const pot = (deal.entry_amount * total).toFixed(0)

    // 1) Confirm to the joiner
    await createNotification(svc, {
      user_id:  user.id, type: "deal_join_confirm", deal_id: dealId,
      title_pt: "Você entrou! 🤝",  title_en: "You're in! 🤝",
      body_pt:  `Agora são ${total} competindo por um pote de $${pot}. Boa sorte!`,
      body_en:  `${total} people are competing for a $${pot} pot. Good luck!`,
    })

    // 2) Notify creator (skip if they joined their own deal)
    if (deal.creator_id !== user.id) {
      await createNotification(svc, {
        user_id:  deal.creator_id, type: "deal_joined", deal_id: dealId,
        title_pt: "Novo participante! 🎯",  title_en: "New participant! 🎯",
        body_pt:  `${joinerName} entrou no seu deal "${deal.title}". Pote atual: $${pot}`,
        body_en:  `${joinerName} joined your deal "${deal.title}". Current pot: $${pot}`,
      })
    }

    // 3) Notify all other existing active participants (not joiner, not creator) every time someone joins
    const { data: others } = await (svc.from("deal_participants") as any)
      .select("user_id")
      .eq("deal_id", dealId)
      .neq("user_id", user.id)
      .neq("user_id", deal.creator_id)
      .eq("status", "active")
    for (const p of others ?? []) {
      await createNotification(svc, {
        user_id:  p.user_id, type: "deal_joined", deal_id: dealId,
        title_pt: "Novo participante! 🎯", title_en: "New participant! 🎯",
        body_pt:  `${joinerName} entrou no deal "${deal.title}". Agora são ${total} competindo por $${pot}.`,
        body_en:  `${joinerName} joined deal "${deal.title}". Now ${total} people competing for $${pot}.`,
      })
    }
  } catch (err: any) {
    console.error("[notifications] joinDeal notify failed:", err?.message)
  }

  // ── On-chain: stake USDC → PDA vault ─────────────────────────────────────────
  // Non-blocking — participant is registered in DB regardless of on-chain result.
  let txSignature: string | undefined
  try {
    const { data: walletData } = await (supabase.from("user_wallets") as any)
      .select("encrypted_secret")
      .eq("user_id", user.id)
      .single()

    if (walletData?.encrypted_secret && deal.entry_amount > 0 && process.env.APP_FEE_PAYER_KEY) {
      const { getFeePayer } = await import("@/lib/solana/fee-payer")
      const userKeypair = decryptSecret(walletData.encrypted_secret)
      const feePayer    = getFeePayer()

      if (deal.pda_address) {
        const { joinAgreementUSDC } = await import("@/lib/solana/anchor-client")
        txSignature = await joinAgreementUSDC(userKeypair, feePayer, dealId)
      } else {
        // Pre-migration deal: no vault PDA, stake to feePayer ATA (custodial)
        const { stakeUsdc }   = await import("@/lib/solana/escrow")
        const { toUSDCUnits } = await import("@/lib/solana/constants")
        txSignature = await stakeUsdc(userKeypair, feePayer, toUSDCUnits(deal.entry_amount))
      }

      await (supabase.from("deal_participants") as any)
        .update({ transaction_hash: txSignature })
        .eq("deal_id", dealId)
        .eq("user_id", user.id)

      console.log(`[Anchor] Participant ${user.id} staked into vault for deal ${dealId}: ${txSignature}`)
    }
  } catch (err: any) {
    console.error("[Anchor] joinAgreementUSDC failed (non-blocking):", err?.message ?? err)
    if (!process.env.APP_FEE_PAYER_KEY) console.error("[Anchor] APP_FEE_PAYER_KEY is not set — on-chain stake skipped")
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
    await (supabase.from("deals") as any).update({ status: "encerrado" }).eq("id", dealId)
    return { error: "Quorum insuficiente. Deal encerrado.", status: "encerrado" }
  }

  await (supabase.from("deals") as any).update({ status: "ativo" }).eq("id", dealId)

  const transactions = []

  transactions.push({
    user_id: deal.creator_id,
    amount:  500,
    reason:  "deal_create",
    deal_id: deal.id,
  })

  for (const p of deal.participants) {
    if (p.user_id !== deal.creator_id) {
      transactions.push({
        user_id: p.user_id,
        amount:  200,
        reason:  "deal_join",
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
      .update({ transaction_hash: txSignature })
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

// ── Settlement: DealGuard Sovereign Payout ───────────────────────────────────

// Thin wrapper kept for API compatibility. All settlement logic lives in
// lib/actions/settlement.ts and is also triggered by the cron at
// /api/cron/settle-deals (runs hourly on Vercel).
export async function withdrawFromEscrow(dealId: string) {
  const { settleDealProtocol } = await import("@/lib/actions/settlement")
  try {
    const result = await settleDealProtocol(dealId)
    revalidatePath(`/deal/${dealId}`)
    return { success: true, txSignature: result.txSignature }
  } catch (err: any) {
    console.error("[Settlement] withdrawFromEscrow failed:", err)
    return { error: `Erro na liquidação: ${err.message}` }
  }
}
