"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { differenceInCalendarDays, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ArrowLeft, Share2, Users, DollarSign, Clock, Activity,
  CheckCircle2, XCircle, Trophy,
  Lock, AlertCircle, Loader2, ExternalLink, CalendarDays, Hourglass
} from "lucide-react"
import { GlassCard, PrimaryBtn, GhostBtn } from "@/components/td-ui"
import { joinDeal, depositToEscrow } from "@/lib/actions/deals"
import type { DealWithParticipants, Distribution } from "@/lib/supabase/types"

// ── Types ─────────────────────────────────────────────────────────────────────

type VerifType  = "x" | "strava" | "gympass"
type PrizeType  = "proporcional" | "primeiro" | "ranking"
type DealStatus = "ativo" | "pendente" | "finalizado"

interface Participant {
  id: string
  initials: string
  name: string
  username: string
  color: string
  bg: string
  rank: number
  isMe: boolean
  value: number
  approved: boolean
  paid: boolean
  joinedDaysAgo: number
}

interface TimelineEvent {
  date: string
  label: string
  done: boolean
  current?: boolean
}

interface PrizeSlice {
  label: string
  pct: number
  color: string
  amount: number
}

interface DealView {
  id: string
  title: string
  subtitle: string
  status: DealStatus
  prizeType: PrizeType
  verifications: VerifType[]
  pot: number
  valuePerPerson: number
  participants: number
  progress: number
  daysGone: number
  daysTotal: number
  startDate: string
  endDate: string
  description: string
  rules: string[]
  participants_list: Participant[]
  timeline: TimelineEvent[]
  prizeSlices: PrizeSlice[]
  myRank?: number
  potentialWin?: number
  statusBorder: string
}

// ── Color palette ─────────────────────────────────────────────────────────────

const PLAYER_COLORS = ["#2563EB", "#16A34A", "#D97706", "#7C3AED", "#DC2626", "#059669"]
const PLAYER_BG     = [
  "rgba(37,99,235,0.12)", "rgba(22,163,74,0.12)", "rgba(217,119,6,0.12)",
  "rgba(124,58,237,0.12)", "rgba(220,38,38,0.12)", "rgba(5,150,105,0.12)",
]

// ── Data mapping ──────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
}

function buildPrizeSlices(distribution: Distribution, netPot: number): PrizeSlice[] {
  if (distribution === "winner") return [
    { label: "Beneficiário", pct: 0.95, color: "#F59E0B", amount: Math.round(netPot * 0.95) },
    { label: "Taxa Operacional", pct: 0.05, color: "#16A34A", amount: Math.round(netPot * 0.05) },
  ]
  if (distribution === "top3") return [
    { label: "1º lugar", pct: 0.50, color: "#F59E0B", amount: Math.round(netPot * 0.50) },
    { label: "2º lugar", pct: 0.30, color: "#9CA3AF", amount: Math.round(netPot * 0.30) },
    { label: "3º lugar", pct: 0.20, color: "#D97706", amount: Math.round(netPot * 0.20) },
  ]
  return [{ label: "Proporcional", pct: 1.0, color: "#7C3AED", amount: netPot }]
}

function buildPotentialWin(distribution: Distribution, netPot: number, myRank: number): number | undefined {
  if (distribution === "winner") return myRank === 1 ? Math.round(netPot * 0.95) : undefined
  if (distribution === "top3" && myRank <= 3) {
    return [0.50, 0.30, 0.20][myRank - 1] ? Math.round(netPot * [0.50, 0.30, 0.20][myRank - 1]) : undefined
  }
  if (distribution === "proportional") return Math.round(netPot / 3)
  return undefined
}

function mapDeal(d: DealWithParticipants, userId: string | null): DealView {
  const now       = new Date()
  const startDate = new Date(d.start_date)
  const endDate   = new Date(d.end_date)
  const daysTotal = Math.max(1, differenceInCalendarDays(endDate, startDate))
  const daysGone  = Math.max(0, Math.min(daysTotal, differenceInCalendarDays(now, startDate)))
  const daysLeft  = Math.max(0, daysTotal - daysGone)
  const progress  = daysGone / daysTotal

  const statusMap: Record<string, DealStatus> = { formacao: "pendente", ativo: "ativo", finalizado: "finalizado" }
  const status    = statusMap[d.status] ?? "pendente"
  const prizeMap: Record<string, PrizeType>  = { winner: "primeiro", top3: "ranking", proportional: "proporcional" }
  const prizeType = prizeMap[d.distribution] ?? "primeiro"

  const knownVerifs = ["x", "strava", "gympass"]
  const verifications = (d.verification_channels ?? []).filter(c => knownVerifs.includes(c)) as VerifType[]

  const participants_list: Participant[] = d.participants.map((p, i) => {
    const name        = p.profile.display_name || p.profile.username
    const snapshotVal = p.current_snapshot ? (Object.values(p.current_snapshot)[0] as number ?? 0) : 0
    const joinedAt    = new Date(p.joined_at)
    return {
      id:           p.id,
      initials:     getInitials(name),
      name,
      username:     `@${p.profile.username}`,
      color:        PLAYER_COLORS[i % PLAYER_COLORS.length],
      bg:           PLAYER_BG[i % PLAYER_BG.length],
      rank:         p.rank ?? (i + 1),
      isMe:         p.user_id === userId,
      value:        snapshotVal,
      approved:     p.status !== "eliminated",
      paid:         true,
      joinedDaysAgo: Math.max(0, differenceInCalendarDays(now, joinedAt)),
    }
  })

  const myParticipant = userId ? d.participants.find(p => p.user_id === userId) : null
  const myRank        = myParticipant?.rank ?? undefined

  const prizeSlices   = buildPrizeSlices(d.distribution, d.net_pot)
  const potentialWin  = myRank != null ? buildPotentialWin(d.distribution, d.net_pot, myRank) : undefined

  const startDateStr  = format(startDate, "dd MMM yyyy", { locale: ptBR })
  const endDateStr    = format(endDate,   "dd MMM yyyy", { locale: ptBR })
  const todayStr      = format(now,       "dd MMM yyyy", { locale: ptBR })

  const timeline: TimelineEvent[] = [
    { date: startDateStr, label: "Estabelecimento", done: status !== "pendente" },
    { date: todayStr,     label: "Status Vigente",   done: true, current: status === "ativo" },
    { date: endDateStr,   label: "Auditoria Final",  done: status === "finalizado" },
    ...(status === "finalizado" ? [{ date: endDateStr, label: "Liquidação", done: true }] : []),
  ]

  const borderMap: Record<DealStatus, string> = { ativo: "#16A34A", pendente: "#D97706", finalizado: "#9CA3AF" }

  return {
    id:             d.id,
    title:          d.title,
    subtitle:       `${d.participant_count} participante${d.participant_count !== 1 ? "s" : ""}`,
    status,
    prizeType,
    verifications,
    pot:            d.pot_total,
    valuePerPerson: d.entry_amount,
    participants:   d.participant_count,
    progress,
    daysGone,
    daysTotal,
    startDate:      startDateStr,
    endDate:        endDateStr,
    description:    d.description ?? "",
    rules:          d.description?.split("\n").map(l => l.trim()).filter(Boolean) ?? [],
    participants_list,
    timeline,
    prizeSlices,
    myRank,
    potentialWin,
    statusBorder:   borderMap[status],
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const VERIF_META: Record<VerifType, { bg: string; label: string; text?: string; Icon?: React.FC<{ className?: string }> }> = {
  x:       { bg: "#000",    label: "X",       text: "𝕏"   },
  strava:  { bg: "#FC4C02", label: "Strava",  Icon: Activity },
  gympass: { bg: "#00A651", label: "Gympass", text: "GP"  },
}


function VerifChip({ type }: { type: VerifType }) {
  const m = VERIF_META[type]
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: m.bg }}>
      {m.Icon ? <m.Icon className="w-3 h-3 text-white" /> : <span className="text-white text-[10px] font-bold">{m.text}</span>}
      <span className="text-white text-[10px] font-semibold">{m.label}</span>
    </div>
  )
}

function StatusPill({ status }: { status: DealStatus }) {
  const map = {
    ativo:      { bg: "rgba(0,210,106,0.12)",   color: "#00D26A", label: "EM VIGOR"  },
    pendente:   { bg: "rgba(245,158,11,0.12)",  color: "#D97706", label: "FORMAÇÃO"  },
    finalizado: { bg: "rgba(156,163,175,0.12)", color: "#6B7280", label: "AUDITADO"  },
  }
  const m = map[status]
  return (
    <span className="text-[10px] font-black px-2.5 py-1 rounded-full border border-current opacity-90 tracking-widest" style={{ background: m.bg, color: m.color }}>
      {m.label}
    </span>
  )
}

// ── Deal rules card ───────────────────────────────────────────────────────────

const CHANNEL_LABELS: Record<string, string> = {
  x: "X", instagram: "Instagram", tiktok: "TikTok", linkedin: "LinkedIn",
  discord: "Discord", youtube: "YouTube", strava: "Strava", wellhub: "Wellhub", totalpass: "TotalPass",
}

const RULE_LABELS: Record<string, string> = {
  post: "Post publicado", comment_received: "Comentário recebido",
  repost_received: "Repost recebido", follower_gained: "Seguidor recebido",
  impressions: "Impressões", km_run: "Kms percorridos", pace: "Pace médio",
  workout_hours: "Horas de treino", checkin: "Check-ins", different_venues: "Diferentes ambientes",
}

const DIST_META: Record<string, { label: string; icon: string; desc: string }> = {
  winner:       { label: "Beneficiário Único", icon: "👑", desc: "Acordo de performance total" },
  top3:         { label: "Ranking",             icon: "🏅", desc: "1º 60% · 2º 30% · 3º 10% da garantia" },
  proportional: { label: "Proporcional",        icon: "🤝", desc: "Garantia ÷ todos os adimplentes" },
}

function DealRulesCard({ deal, dealData }: { deal: DealView; dealData: DealWithParticipants }) {
  const diffDays   = deal.daysTotal
  const feeRate    = dealData.fee_pct ?? 5
  const distMeta   = DIST_META[dealData.distribution] ?? DIST_META.winner
  const channelNames = (dealData.verification_channels ?? [])
    .map(c => CHANNEL_LABELS[c] ?? c).join(" + ")
  const ruleLabel  = RULE_LABELS[dealData.verification_type] ?? dealData.verification_type

  const confirmRows = [
    {
      icon: "🛡️", iconBg: "rgba(0,210,106,0.1)",
      key: "Regra",
      val: channelNames && ruleLabel ? `${channelNames} · ${ruleLabel}` : ruleLabel || "—",
    },
    {
      icon: "📅", iconBg: "rgba(239,68,68,0.08)",
      key: "Período",
      val: `${deal.startDate} → ${deal.endDate} (${diffDays}d)`,
    },
    {
      icon: "💰", iconBg: "rgba(0,210,106,0.1)",
      key: "Financeiro",
      val: `R$${deal.valuePerPerson.toLocaleString("pt-BR")}/pessoa · ${distMeta.label}`,
    },
    {
      icon: "🔒", iconBg: "rgba(10,15,13,0.1)",
      key: "Acesso",
      val: dealData.type === "privado" ? "Privado" : "Público",
    },
  ]

  return (
    <div style={{ marginTop: 12 }}>
      {/* Hero verde — official brand look */}
      <div className="rounded-[24px] p-6 mb-4 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0A0F0D, #00A851 70%, #00D26A)",
          boxShadow: "0 14px 40px rgba(0,210,106,0.25)",
        }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#9945FF] opacity-10 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-1.5">
                {(dealData as any).mode === "super" ? "⭐ Super Acordo" : "Acordo Institucional"}
              </p>
              <h2 className="text-2xl font-black text-white leading-none tracking-tight">{deal.title}</h2>
            </div>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <Lock className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: "Alocação",       value: `R$${deal.valuePerPerson.toLocaleString("pt-BR")}` },
              { label: "Garantia Total", value: `R$${deal.pot.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
              { label: "Duração",        value: `${diffDays} dias` },
              { label: "Distribuição",   value: distMeta.label },
            ].map(stat => (
              <div key={stat.label} className="p-3 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">{stat.label}</p>
                <p className="text-base font-black text-white mt-0.5 tracking-tight">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rows — igual confirmRows */}
      <div className="space-y-2 mb-3">
        {confirmRows.map(row => (
          <div key={row.key}
            className="flex items-center gap-3 p-3.5 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.48)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.6)",
            }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: row.iconBg }}>
              <span className="text-base">{row.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{row.key}</p>
              <p className="text-[13px] font-bold text-gray-800 mt-0.5">{row.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Distribuição detalhada */}
      <div className="flex items-center gap-3 p-3.5 rounded-xl mb-3"
        style={{ background: "rgba(255,255,255,0.48)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(168,85,247,0.1)" }}>
          <span className="text-base">{distMeta.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Distribuição</p>
          <p className="text-[13px] font-bold text-gray-800 mt-0.5">{distMeta.label}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{distMeta.desc}</p>
        </div>
      </div>

      {/* Fee info */}
      <div className="p-3.5 rounded-xl"
        style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)" }}>
        <p className="text-xs text-gray-600 leading-relaxed">
          Taxa de <strong className="text-[#16A34A]">{feeRate}%</strong> cobrada apenas em caso de descumprimento.
          Se todos forem adimplentes, o valor integral é devolvido.
        </p>
      </div>

      {deal.description && (
        <div className="mt-2 p-3.5 rounded-xl"
          style={{ background: "rgba(255,255,255,0.48)", border: "1px solid rgba(255,255,255,0.6)" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Descrição</p>
          <p className="text-sm text-gray-700 leading-relaxed">{deal.description}</p>
        </div>
      )}
    </div>
  )
}

// ── Participants list ─────────────────────────────────────────────────────────

function ParticipantsList({ deal }: { deal: DealView }) {
  return (
    <GlassCard style={{ padding: "14px 16px", marginTop: 12, marginBottom: 4 }}>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
        Participantes · {deal.participants_list.length}
      </p>
      <div className="space-y-2">
        {deal.participants_list.sort((a, b) => a.rank - b.rank).map((p) => (
          <div key={p.id}
            className="flex items-center gap-3 p-2.5 rounded-xl"
            style={{ background: p.isMe ? "rgba(37,99,235,0.06)" : "rgba(0,0,0,0.03)" }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: p.bg, border: `2px solid ${p.color}` }}>
              <span className="text-xs font-bold" style={{ color: p.color }}>{p.initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-gray-800 truncate">{p.name}</span>
                {p.isMe && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(37,99,235,0.12)", color: "#2563EB" }}>
                    Você
                  </span>
                )}
              </div>
              <span className="text-[11px] text-gray-400">{p.username}</span>
            </div>
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#16A34A" }} />
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DealClient({
  deal: dealData,
  userId,
}: {
  deal: DealWithParticipants
  userId: string | null
}) {
  const router  = useRouter()
  const deal    = mapDeal(dealData, userId)
  const [joining,   setJoining]   = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  const isParticipating = userId
    ? dealData.participants.some(p => p.user_id === userId)
    : false
  const isFull      = dealData.participant_count >= dealData.max_participants
  const isCreator   = userId === dealData.creator_id

  async function handleJoinDeal() {
    if (joining) return
    setJoining(true)
    setJoinError(null)
    const result = await joinDeal(dealData.id)
    if (result.error) {
      setJoinError(result.error)
      setJoining(false)
      return
    }

    // New: Trigger On-Chain Escrow Deposit
    const escrowResult = await depositToEscrow(dealData.id)
    if (escrowResult.error) {
      setJoinError(escrowResult.error)
      setJoining(false)
      return
    }

    // New: Trigger Initial Snapshot (DealGuard Oracle)
    try {
      await fetch('/api/verify/x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: dealData.id, userId, xUsername: "user_twitter" })
      })
    } catch (e) { console.warn("Snapshot fail", e) }

    router.refresh()
  }

  const daysLeft  = deal.daysTotal - deal.daysGone
  const pct       = Math.round(deal.progress * 100)
  const isWinning = deal.myRank != null && deal.myRank <= Math.ceil(deal.participants * 0.3)

  const myInitials = userId
    ? deal.participants_list.find(p => p.isMe)?.initials ?? "EU"
    : "EU"

  return (
    <div className="min-h-screen pb-32"
      style={{
        backgroundImage: "url('/images/gradient-background.jpg')",
        backgroundSize: "cover", backgroundPosition: "center",
        backgroundRepeat: "no-repeat", backgroundAttachment: "fixed",
      }}>

      {/* Hero */}
      <div className="relative">
        <div className="px-5 pt-12 pb-6"
          style={{ background: "linear-gradient(160deg, #0A0F0D 0%, #00A851 70%, #00D26A 100%)" }}>
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => router.back()}
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <button
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <StatusPill status={deal.status} />
            <a 
              href={`https://explorer.solana.com/address/9zfQ1dwJ9Po7YCPWJ3S13ic3nxZcA9cEwBVsXdKub1c4?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#9945FF]/20 hover:bg-[#9945FF]/30 text-[10px] text-white font-black transition-all border border-[#9945FF]/30 tracking-widest"
            >
              <ExternalLink className="w-3 h-3" />
              SOLANA SECURED
            </a>
            {deal.verifications.map((v) => <VerifChip key={v} type={v} />)}
          </div>

          <h1 className="text-white text-3xl font-black leading-none mb-2 tracking-tighter">{deal.title}</h1>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-6">{deal.subtitle}</p>

          {deal.status === "ativo" && (
            <>
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Execução Institucional</span>
                <span className="text-white font-black text-xs">{pct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden mb-6" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full shadow-[0_0_12px_#00D26A]" style={{ width: `${pct}%`, background: "#00D26A" }} />
              </div>
            </>
          )}
          {deal.status === "pendente" && (
            <>
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Captação de Garantia</span>
                <span className="text-white font-black text-xs">
                  {deal.participants}/{dealData.max_participants}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden mb-6" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full shadow-[0_0_12px_#00D26A]"
                  style={{ width: `${Math.min(100, (deal.participants / dealData.max_participants) * 100)}%`, background: "#00D26A" }} />
              </div>
            </>
          )}
        </div>

        {/* Info grid */}
        <div className="px-5 -mt-3">
          <div className="grid grid-cols-2 gap-3 pb-1">
            {[
              { label: "Garantia Total", value: `R$${deal.pot.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, Icon: DollarSign, color: "#00D26A" },
              { label: "Alocação",       value: `R$${deal.valuePerPerson.toLocaleString("pt-BR")}`,         Icon: Lock,        color: "#3B82F6" },
              { label: "Participantes",  value: `${deal.participants}`,                                    Icon: Users,       color: "#9945FF" },
              { label: deal.status === "ativo" ? "Auditoria Final" : "Vigência",
                value: deal.status === "ativo" ? `${daysLeft}d restantes` : `${deal.daysTotal} dias`,
                Icon: Clock, color: "#F59E0B" },
            ].map((stat, i) => (
              <GlassCard key={i} style={{ padding: "14px 16px" }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: `${stat.color}12` }}>
                    <stat.Icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                  </div>
                  <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider">{stat.label}</span>
                </div>
                <p className="text-gray-800 font-black text-base leading-tight tracking-tight">{stat.value}</p>
              </GlassCard>
            ))}
          </div>

          {/* My rank tile */}
          {deal.myRank != null && (
            <GlassCard style={{ padding: "14px 18px", marginTop: 12 }}
              accent={isWinning ? "#00D26A" : "#9CA3AF"}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
                    style={{ background: "#0A0F0D" }}>
                    <span className="text-[#00D26A] font-black text-xs">{myInitials}</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Meu Status</p>
                    <p className="text-gray-800 font-black text-base tracking-tight">
                      {deal.myRank}º lugar
                      {isWinning && <span className="ml-2 text-[10px] font-black uppercase tracking-wider" style={{ color: "#00D26A" }}>· Adimplente</span>}
                    </p>
                  </div>
                </div>
                {deal.potentialWin != null && deal.potentialWin > 0 && (
                  <div className="text-right">
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Retorno Previsto</p>
                    <p className="font-black text-lg tracking-tighter" style={{ color: "#00D26A" }}>R${deal.potentialWin.toLocaleString("pt-BR")}</p>
                  </div>
                )}
                {isWinning && <Trophy className="w-5 h-5 text-yellow-500 ml-2" />}
              </div>
            </GlassCard>
          )}

          <DealRulesCard deal={deal} dealData={dealData} />
          <ParticipantsList deal={deal} />
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 px-5 py-5 z-20"
        style={{
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(40px) saturate(200%)",
          WebkitBackdropFilter: "blur(40px) saturate(200%)",
          borderTop: "1px solid rgba(0,0,0,0.05)",
        }}>
        <div className="flex items-center gap-5">
          <div className="flex-shrink-0">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] color-gray-400 mb-1">
              Garantia Total
            </p>
            <p className="text-2xl font-black text-gray-800 leading-none tracking-tighter">
              R${deal.pot.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="flex-1">
            {deal.status === "ativo" ? (
              <PrimaryBtn
                style={{ width: "100%", textAlign: "center", borderRadius: 16, background: "#00D26A", color: "#0A0F0D", fontWeight: 900, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em" }}
                onClick={() => router.push(`/tracking?id=${deal.id}`)}>
                Auditoria em Tempo Real →
              </PrimaryBtn>
            ) : deal.status === "pendente" ? (
              <div className="flex-1 flex flex-col gap-1.5">
                {joinError && (
                  <div className="flex items-center gap-1.5 text-red-500 text-xs px-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{joinError}</span>
                  </div>
                )}
                {isCreator || isParticipating ? (
                  <div className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl"
                    style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                    <Hourglass className="w-5 h-5 flex-shrink-0 animate-pulse" style={{ color: "#D97706" }} />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider" style={{ color: "#D97706" }}>Formando Acordo</p>
                      <p className="text-[10px] text-gray-400 font-medium">Sincronizando garantias on-chain</p>
                    </div>
                  </div>
                ) : (
                  <PrimaryBtn
                    disabled={joining || isFull}
                    style={{
                      width: "100%", textAlign: "center", borderRadius: 16, background: "#00D26A", color: "#0A0F0D", fontWeight: 900, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em",
                      opacity: (joining || isFull) ? 0.65 : 1,
                      cursor: (joining || isFull) ? "not-allowed" : "pointer",
                    }}
                    onClick={handleJoinDeal}>
                    {joining ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        FORMALIZANDO…
                      </span>
                    ) : isFull ? "ACORDO LOTADO" : "ADERIR AO ACORDO →"}
                  </PrimaryBtn>
                )}
              </div>
            ) : (
              <GhostBtn
                style={{ width: "100%", textAlign: "center", borderRadius: 16, fontWeight: 900, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em" }}
                onClick={() => router.push(`/deal/${deal.id}/result`)}>
                Resultado da Liquidação
              </GhostBtn>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
