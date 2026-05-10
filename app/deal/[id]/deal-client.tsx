"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { differenceInCalendarDays, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ArrowLeft, Share2, Activity,
  Trophy, Lock, ExternalLink, BarChart2, ChevronRight, ChevronDown,
} from "lucide-react"
import { GlassCard } from "@/components/td-ui"
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
  socialHandle?: string
  userTag?: string
  color: string
  bg: string
  rank: number
  isMe: boolean
  value: number
  currentValue: number
  startValue: number
  hasData: boolean
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

interface SocialConnection {
  platform: string
  status: string
  username?: string | null
  member_email?: string | null
  external_id?: string | null
}

interface DealView {
  id: string
  title: string
  subtitle: string
  status: DealStatus
  prizeType: PrizeType
  verifications: VerifType[]
  verificationChannels: string[]
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

function getUserTag(username: string) {
  const plain = username.replace(/^@/, "")
  const digits = (plain.match(/\d+/g) ?? []).join("")
  if (digits) return `#${digits}`
  return `#${plain}`
}

function buildPrizeSlices(distribution: Distribution, netPot: number): PrizeSlice[] {
  if (distribution === "winner") return [
    { label: "Vencedor",  pct: 0.95, color: "#F59E0B", amount: Math.round(netPot * 0.95) },
    { label: "True Deal", pct: 0.05, color: "#16A34A", amount: Math.round(netPot * 0.05) },
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
    const name       = p.profile.display_name || p.profile.username
    const startVal   = p.start_snapshot   ? (Object.values(p.start_snapshot)[0]   as number ?? 0) : 0
    const currVal    = p.current_snapshot ? (Object.values(p.current_snapshot)[0] as number ?? 0) : 0
    const joinedAt   = new Date(p.joined_at)
    return {
      id:           p.id,
      initials:     getInitials(name),
      name,
      username:     `@${p.profile.username}`,
      userTag:      getUserTag(p.profile.username),
      color:        PLAYER_COLORS[i % PLAYER_COLORS.length],
      bg:           PLAYER_BG[i % PLAYER_BG.length],
      rank:         p.rank ?? (i + 1),
      isMe:         p.user_id === userId,
      value:        currVal,
      currentValue: currVal,
      startValue:   startVal,
      hasData:      p.start_snapshot !== null || p.current_snapshot !== null,
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
    { date: startDateStr, label: "Início do deal", done: status !== "pendente" },
    { date: todayStr,     label: "Hoje",            done: true, current: status === "ativo" },
    { date: endDateStr,   label: "Fim do deal",     done: status === "finalizado" },
    ...(status === "finalizado" ? [{ date: endDateStr, label: "Resultado final", done: true }] : []),
  ]

  const borderMap: Record<DealStatus, string> = { ativo: "#16A34A", pendente: "#D97706", finalizado: "#9CA3AF" }

  return {
    id:             d.id,
    title:          d.title,
    subtitle:       `${d.participant_count} participante${d.participant_count !== 1 ? "s" : ""}`,
    status,
    prizeType,
    verifications,
    verificationChannels: d.verification_channels ?? [],
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
    ativo:      { bg: "rgba(22,163,74,0.15)",   color: "#16A34A", label: "Em Jogo"   },
    pendente:   { bg: "rgba(245,158,11,0.15)",  color: "#D97706", label: "Formação"  },
    finalizado: { bg: "rgba(156,163,175,0.15)", color: "#6B7280", label: "Encerrado" },
  }
  const m = map[status]
  return (
    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: m.bg, color: m.color }}>
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
  winner:       { label: "1º Lugar",      icon: "👑", desc: "Winner takes all" },
  top3:         { label: "Ranking",        icon: "🏅", desc: "1º 60% · 2º 30% · 3º 10% do pote" },
  proportional: { label: "Proporcional",   icon: "🤝", desc: "Pote final dividido entre todos que cumprirem o acordo." },
}

const VERIFICATION_SUBRULES: Record<string, { title: string; items: string[]; hint?: string }> = {
  post:             { title: "Sub-regras — Post publicado", items: ["Conta pública no X", "Mais de 100 caracteres por post", "Conteúdo único — sem repetições dentro do período"] },
  comment_received: { title: "Sub-regras — Comentário recebido", items: ["Ganho líquido de comentários por janela de frequência"] },
  repost_received:  { title: "Sub-regras — Repost recebido", items: ["Ganho líquido de reposts por janela de frequência"] },
  follower_gained:  { title: "Sub-regras — Seguidor recebido", items: ["Novos seguidores líquidos por janela de frequência"] },
  impressions:      { title: "Sub-regras — Impressões", items: ["Total de impressões nos posts da janela de frequência"] },
  km_run:           { title: "Sub-regras — Kms percorridos", items: ["Apenas atividades do tipo Corrida (Run)", "Soma dos KMs registrados na janela de frequência"] },
  pace:             { title: "Pace médio — como é avaliado", items: ["Pace médio das corridas ≤ valor configurado pelo criador", "Medido em min/km · quanto menor, mais rápido", "Exemplo: pace 5 = 5 min 0 seg por km"], hint: "⏱ Pace mais baixo = você correu mais rápido" },
  workout_hours:    { title: "Sub-regras — Horas de treino", items: ["Soma das horas de todas as atividades registradas na janela"] },
  checkin:          { title: "Sub-regras — Check-ins", items: ["Número de check-ins em academias ou locais parceiros por janela"] },
  different_venues: { title: "Sub-regras — Diferentes ambientes", items: ["Número de locais distintos visitados por janela"] },
}

function DealRulesCard({ deal, dealData }: { deal: DealView; dealData: DealWithParticipants }) {
  const diffDays   = deal.daysTotal
  const feeRate    = dealData.fee_pct ?? 3
  const distMeta   = DIST_META[dealData.distribution] ?? DIST_META.winner
  const channelNames = (dealData.verification_channels ?? [])
    .map(c => CHANNEL_LABELS[c] ?? c).join(" + ")
  const ruleLabel  = RULE_LABELS[dealData.verification_type] ?? dealData.verification_type

  const confirmRows = [
    {
      icon: "🛡️", iconBg: "rgba(22,163,74,0.1)",
      key: "Regra",
      val: channelNames && ruleLabel ? `${channelNames} · ${ruleLabel}` : ruleLabel || "—",
    },
    {
      icon: "📅", iconBg: "rgba(239,68,68,0.08)",
      key: "Período",
      val: `${deal.startDate} → ${deal.endDate} (${diffDays}d)`,
    },
    {
      icon: "💰", iconBg: "rgba(22,163,74,0.1)",
      key: "Financeiro",
      val: `R$${deal.valuePerPerson.toLocaleString("pt-BR")}/pessoa · ${distMeta.label}`,
    },
    {
      icon: "🔒", iconBg: "rgba(107,114,128,0.1)",
      key: "Acesso",
      val: dealData.type === "privado" ? "Privado" : "Público",
    },
  ]

  return (
    <div style={{ marginTop: 12 }}>
      {/* Hero verde — igual ao preview de confirmação */}
      <div className="rounded-[22px] p-5 mb-3 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0D2E1A, #16A34A 55%, #22C55E)",
          boxShadow: "0 14px 40px rgba(22,163,74,0.35)",
        }}>
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full"
          style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1">
                Deal
              </p>
              <h2 className="text-xl font-bold text-white leading-tight">{deal.title}</h2>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}>
              <Lock className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Entrada",    value: `R$${deal.valuePerPerson.toLocaleString("pt-BR")}` },
              { label: "Pote atual", value: `R$${deal.pot.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
              { label: "Duração",    value: `${diffDays} dias` },
              { label: "Premiação",  value: distMeta.label },
            ].map(stat => (
              <div key={stat.label} className="p-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
                <p className="text-[9px] text-white/70 uppercase tracking-wider">{stat.label}</p>
                <p className="text-base font-bold text-white mt-0.5">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Compact info rows — single card */}
      <div className="rounded-xl overflow-hidden mb-3"
        style={{ background: "rgba(255,255,255,0.48)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)" }}>
        {[
          ...confirmRows,
          { icon: distMeta.icon, iconBg: "rgba(168,85,247,0.1)", key: "Premiação", val: `${distMeta.label} · ${distMeta.desc}` },
        ].map((row, i, arr) => (
          <div key={row.key}
            className="flex items-center gap-3 px-3.5 py-2.5"
            style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
            <span className="text-sm flex-shrink-0">{row.icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 w-16 flex-shrink-0">{row.key}</span>
            <span className="text-[12px] font-semibold text-gray-800 flex-1 min-w-0 truncate">{row.val}</span>
          </div>
        ))}
      </div>

      {deal.description && (
        <div className="mt-2 p-3.5 rounded-xl"
          style={{ background: "rgba(255,255,255,0.48)", border: "1px solid rgba(255,255,255,0.6)" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Descrição</p>
          <p className="text-sm text-gray-700 leading-relaxed">{deal.description}</p>
        </div>
      )}

      {dealData.verification_type && VERIFICATION_SUBRULES[dealData.verification_type] && (
        <div className="mt-2 p-3.5 rounded-xl"
          style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}>
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide mb-2">
            {VERIFICATION_SUBRULES[dealData.verification_type].title}
          </p>
          <ul className="space-y-1.5">
            {VERIFICATION_SUBRULES[dealData.verification_type].items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-gray-600">
                <span className="text-blue-400 mt-0.5 flex-shrink-0">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          {VERIFICATION_SUBRULES[dealData.verification_type].hint && (
            <p className="text-[10px] text-amber-600 mt-2 font-semibold">
              {VERIFICATION_SUBRULES[dealData.verification_type].hint}
            </p>
          )}
        </div>
      )}

      <div className="mt-2 p-3.5 rounded-xl"
        style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
        <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide mb-1">⚠️ Regra estrita</p>
        <p className="text-[11px] text-red-800 leading-relaxed">
          A meta deve ser cumprida em <strong>cada janela de frequência</strong> do período.
          Uma janela perdida = <strong>eliminação permanente</strong>.
        </p>
      </div>
    </div>
  )
}

// ── Live ranking card ─────────────────────────────────────────────────────────

function PlayerCard({
  player, expanded, onToggle,
}: { player: Participant; expanded: boolean; onToggle: () => void }) {
  const delta    = player.currentValue - player.startValue
  const deltaStr = player.hasData
    ? (delta >= 0 ? `+${delta.toLocaleString("pt-BR")}` : delta.toLocaleString("pt-BR"))
    : "—"

  return (
    <GlassCard
      accent={player.isMe ? "#16A34A" : undefined}
      style={{ overflow: "hidden", background: player.isMe ? "rgba(22,163,74,0.05)" : undefined }}
    >
      <button
        onClick={onToggle}
        style={{
          width: "100%", padding: 14,
          display: "flex", gap: 12, alignItems: "center",
          background: "none", border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <div style={{ width: 24, textAlign: "center", flexShrink: 0 }}>
          <span style={{ fontWeight: 900, fontSize: 16, color: player.rank === 1 ? "#16A34A" : "#9CA3AF" }}>
            #{player.rank}
          </span>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 13, flexShrink: 0,
          background: `linear-gradient(135deg,${player.bg},${player.bg}CC)`,
          border: `2px solid ${player.color}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: player.color }}>{player.initials}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, color: "#1f2937", fontSize: 13 }}>{player.name}</span>
            {player.userTag && (
              <span style={{ fontStyle: "italic", fontSize: 11, color: "#6B7280", fontWeight: 500 }}>
                {player.userTag}
              </span>
            )}
            {player.isMe && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 100,
                background: "rgba(22,163,74,0.15)", color: "#16A34A",
              }}>Você</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#9CA3AF" }}>
            {player.socialHandle ?? player.username}
          </div>
          {player.hasData && (
            <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2, color: delta >= 0 ? "#16A34A" : "#EF4444" }}>
              {deltaStr} pts
            </div>
          )}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {player.hasData ? (
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>
              {player.currentValue.toLocaleString("pt-BR")}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>sem dados</div>
          )}
        </div>
        {expanded
          ? <ChevronDown size={14} color="#9CA3AF" style={{ flexShrink: 0 }} />
          : <ChevronRight size={14} color="#9CA3AF" style={{ flexShrink: 0 }} />}
      </button>

      {expanded && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
          {player.hasData ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, paddingTop: 10 }}>
              {[
                { label: "Início", value: player.startValue.toLocaleString("pt-BR") },
                { label: "Atual",  value: player.currentValue.toLocaleString("pt-BR") },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  borderRadius: 10, padding: "8px 4px", textAlign: "center",
                  background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.6)",
                }}>
                  <div style={{ fontWeight: 700, color: "#1f2937", fontSize: 12 }}>{value}</div>
                  <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", paddingTop: 10 }}>
              Dados de tracking ainda não disponíveis
            </p>
          )}
        </div>
      )}
    </GlassCard>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DealClient({
  deal: dealData,
  userId,
  userSocialConnections,
}: {
  deal: DealWithParticipants
  userId: string | null
  userSocialConnections?: SocialConnection[]
}) {
  const router  = useRouter()
  const deal    = mapDeal(dealData, userId)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const requiredChannel = deal.verificationChannels?.[0] ?? null
  const requiredChannelLabel = requiredChannel ? CHANNEL_LABELS[requiredChannel] ?? requiredChannel : null
  const hasRequiredConnection = requiredChannel
    ? !!userSocialConnections?.some(c =>
        c.platform === requiredChannel && c.status !== "pending" &&
        (c.username || c.member_email || c.external_id)
      )
    : true

  const showMissingConnectionWarning = Boolean(
    userId && requiredChannel && !hasRequiredConnection
  )

  const isWinning = deal.myRank != null && deal.myRank <= Math.ceil(deal.participants * 0.3)

  const myInitials = userId
    ? deal.participants_list.find(p => p.isMe)?.initials ?? "EU"
    : "EU"

  // ── Participant stats ──
  const aliveList       = deal.participants_list.filter(p => p.approved)
  const eliminatedList  = deal.participants_list.filter(p => !p.approved)
  const aliveCount      = aliveList.length
  const eliminatedCount = eliminatedList.length
  const totalCount      = deal.participants_list.length

  // ── Financial calc ──
  const entryAmount    = dealData.entry_amount
  const feePct         = dealData.fee_pct ?? 3
  const loserPool      = entryAmount * eliminatedCount
  const netLoserPool   = loserPool * (1 - feePct / 100)
  const extraPerWinner = aliveCount > 0 && eliminatedCount > 0 ? netLoserPool / aliveCount : 0
  const totalPerWinner = entryAmount + extraPerWinner
  const isAlive        = deal.participants_list.find(p => p.isMe)?.approved ?? false

  return (
    <div className="min-h-screen pb-8"
      style={{
        backgroundImage: "url('/images/gradient-background.jpg')",
        backgroundSize: "cover", backgroundPosition: "center",
        backgroundRepeat: "no-repeat", backgroundAttachment: "fixed",
      }}>

      {/* Hero */}
      <div className="relative">
        <div className="px-5 pt-12 pb-6"
          style={{ background: "linear-gradient(160deg, #0D2E1A 0%, #16A34A 55%, #22C55E 100%)" }}>
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => router.back()}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}>
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}>
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <StatusPill status={deal.status} />
            <a 
              href={`https://explorer.solana.com/address/9zfQ1dwJ9Po7YCPWJ3S13ic3nxZcA9cEwBVsXdKub1c4?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[10px] text-white/80 font-bold transition-all border border-white/10"
            >
              <ExternalLink className="w-3 h-3" />
              BLOCKCHAIN
            </a>
            {deal.verifications.map((v) => <VerifChip key={v} type={v} />)}
          </div>

          <h1 className="text-white text-2xl font-black leading-tight mb-1">{deal.title}</h1>
          <p className="text-white/70 text-sm mb-5">{deal.subtitle}</p>

          {deal.status === "ativo" && (
            <>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-white/70 text-xs">Progresso</span>
                <span className="text-white font-bold text-xs">{Math.round(deal.progress * 100)}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden mb-5" style={{ background: "rgba(255,255,255,0.2)" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.round(deal.progress * 100)}%`, background: "rgba(255,255,255,0.9)" }} />
              </div>
            </>
          )}
          {deal.status === "pendente" && (
            <>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-white/70 text-xs">Vagas preenchidas</span>
                <span className="text-white font-bold text-xs">
                  {deal.participants}/{dealData.max_participants}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden mb-5" style={{ background: "rgba(255,255,255,0.2)" }}>
                <div className="h-full rounded-full"
                  style={{ width: `${Math.min(100, (deal.participants / dealData.max_participants) * 100)}%`, background: "rgba(255,255,255,0.9)" }} />
              </div>
            </>
          )}
        </div>

        {/* Info grid */}
        <div className="px-5 -mt-1">
          {/* My rank tile */}
          {deal.myRank != null && (
            <GlassCard style={{ padding: "12px 16px", marginTop: 12 }}
              accent={isWinning ? "#16A34A" : "#9CA3AF"}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#1A2E3A,#2A4E5A)" }}>
                    <span className="text-blue-300 font-bold text-xs">{myInitials}</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Minha posição</p>
                    <p className="text-gray-800 font-bold text-base">
                      {deal.myRank}º lugar
                      {isWinning && <span className="ml-2 text-[11px]" style={{ color: "#16A34A" }}>· Em zona de prêmio</span>}
                    </p>
                  </div>
                </div>
                {deal.potentialWin != null && deal.potentialWin > 0 && (
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400">Ganho potencial</p>
                    <p className="font-bold" style={{ color: "#16A34A" }}>R${deal.potentialWin.toLocaleString("pt-BR")}</p>
                  </div>
                )}
                {isWinning && <Trophy className="w-5 h-5 text-yellow-500 ml-2" />}
              </div>
            </GlassCard>
          )}

          {showMissingConnectionWarning && requiredChannelLabel && (
            <div className="rounded-xl p-4 mb-3"
              style={{ background: "rgba(254,243,199,0.9)", border: "1px solid rgba(245,158,11,0.3)" }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-700 mb-2">
                Atenção
              </p>
              <p className="text-sm text-orange-900 leading-relaxed mb-3">
                Você precisa vincular sua conta do canal de verificação utilizado no deal em questão ({requiredChannelLabel}) para participar.
              </p>
              <a
                href="/profile"
                className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)" }}
              >
                Ir para perfil
              </a>
            </div>
          )}

          <DealRulesCard deal={deal} dealData={dealData} />

          {/* Situação dos participantes */}
          <GlassCard style={{ padding: 16, marginTop: 12 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
              Situação do desafio
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[
                { label: "Iniciaram",  value: totalCount,      color: "#374151", bg: "rgba(0,0,0,0.04)"         },
                { label: "No jogo",    value: aliveCount,      color: "#16A34A", bg: "rgba(22,163,74,0.08)"     },
                { label: "Eliminados", value: eliminatedCount, color: "#EF4444", bg: "rgba(239,68,68,0.08)"     },
              ].map(({ label, value, color, bg }) => (
                <div key={label} style={{
                  borderRadius: 12, padding: "10px 8px", textAlign: "center", background: bg,
                }}>
                  <p style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{value}</p>
                  <p style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4 }}>{label}</p>
                </div>
              ))}
            </div>
            {/* Barra proporcional */}
            {totalCount > 0 && (
              <div style={{ height: 8, borderRadius: 100, overflow: "hidden", display: "flex" }}>
                <div style={{
                  width: `${(aliveCount / totalCount) * 100}%`,
                  background: "linear-gradient(90deg,#16A34A,#22C55E)",
                  transition: "width 0.5s ease",
                }} />
                <div style={{
                  width: `${(eliminatedCount / totalCount) * 100}%`,
                  background: "linear-gradient(90deg,#EF4444,#F87171)",
                  transition: "width 0.5s ease",
                }} />
                <div style={{ flex: 1, background: "rgba(0,0,0,0.07)" }} />
              </div>
            )}
            {totalCount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                <span style={{ fontSize: 10, color: "#16A34A" }}>
                  {Math.round((aliveCount / totalCount) * 100)}% ainda competindo
                </span>
                {eliminatedCount > 0 && (
                  <span style={{ fontSize: 10, color: "#EF4444" }}>
                    {Math.round((eliminatedCount / totalCount) * 100)}% eliminados
                  </span>
                )}
              </div>
            )}
          </GlassCard>

          {/* Cálculo financeiro */}
          {deal.status !== "pendente" && (
            <GlassCard style={{ padding: 16, marginTop: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
                Pote atual por participante ativo
              </p>

              {/* Breakdown */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>Entrada paga</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>
                    R${entryAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {eliminatedCount > 0 && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#6B7280" }}>
                        Pote dos eliminados ({eliminatedCount}× entrada)
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>
                        R${loserPool.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#9CA3AF" }}>
                        Taxa da plataforma ({feePct}%)
                      </span>
                      <span style={{ fontSize: 12, color: "#9CA3AF" }}>
                        −R${(loserPool * feePct / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#6B7280" }}>
                        Distribuído entre {aliveCount} ativos
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#16A34A" }}>
                        +R${extraPerWinner.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div style={{ height: 1, background: "rgba(0,0,0,0.07)", margin: "4px 0" }} />
                  </>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>Total estimado por ativo</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: "#16A34A" }}>
                    R${totalPerWinner.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Mensagem motivacional */}
              {eliminatedCount === 0 ? (
                <div style={{
                  padding: "10px 12px", borderRadius: 12,
                  background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.18)",
                }}>
                  <p style={{ fontSize: 12, color: "#3B82F6", fontWeight: 600, lineHeight: 1.5 }}>
                    🤝 Todos ainda no jogo! Ninguém foi eliminado — se isso se mantiver, cada participante recupera os{" "}
                    <strong>R${entryAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> integralmente.
                  </p>
                </div>
              ) : isAlive ? (
                <div style={{
                  padding: "10px 12px", borderRadius: 12,
                  background: "linear-gradient(135deg,rgba(22,163,74,0.1),rgba(34,197,94,0.06))",
                  border: "1px solid rgba(22,163,74,0.25)",
                }}>
                  <p style={{ fontSize: 12, color: "#16A34A", fontWeight: 700, lineHeight: 1.5 }}>
                    ✅ Cumprir sua palavra está te fazendo ganhar{" "}
                    <strong>R${extraPerWinner.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> a mais.{" "}
                    Continue assim!
                  </p>
                </div>
              ) : (
                <div style={{
                  padding: "10px 12px", borderRadius: 12,
                  background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)",
                }}>
                  <p style={{ fontSize: 12, color: "#EF4444", fontWeight: 600, lineHeight: 1.5 }}>
                    ❌ Você foi eliminado deste deal. Acompanhe quem vai até o fim.
                  </p>
                </div>
              )}
            </GlassCard>
          )}

          {/* Live ranking */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, marginBottom: 4 }}>
            <BarChart2 size={15} color="#16A34A" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>Participantes</span>
            <div
              className="animate-pulse"
              style={{ width: 7, height: 7, borderRadius: "50%", background: "#16A34A", marginLeft: "auto" }}
            />
            <span style={{ fontSize: 10, color: "#9CA3AF" }}>atualizado agora</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {deal.participants_list
              .sort((a, b) => a.rank - b.rank)
              .map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  expanded={expandedId === player.id}
                  onToggle={() => setExpandedId(expandedId === player.id ? null : player.id)}
                />
              ))}
          </div>

        </div>
      </div>
    </div>
  )
}
