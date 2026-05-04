"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { differenceInCalendarDays, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ArrowLeft, Share2, Users, DollarSign, Clock, Activity,
  CheckCircle2, XCircle, ChevronRight, Trophy, PieChart, Award,
  Lock, Star,
} from "lucide-react"
import { GlassCard, PrimaryBtn, GhostBtn } from "@/components/td-ui"
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

const PRIZE_META: Record<PrizeType, { label: string; color: string; Icon: React.FC<{ className?: string; color?: string }> }> = {
  proporcional: { label: "Proporcional", color: "#7C3AED", Icon: PieChart },
  primeiro:     { label: "1º Lugar",     color: "#D97706", Icon: Trophy   },
  ranking:      { label: "Ranking",      color: "#2563EB", Icon: Award    },
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

// ── Tab: Participantes ────────────────────────────────────────────────────────

type ParticipantTab = "aprovados" | "pagamento" | "pedidos"

function ParticipantsTab({ deal }: { deal: DealView }) {
  const [activeTab, setActiveTab] = useState<ParticipantTab>("aprovados")

  const tabs: { key: ParticipantTab; label: string }[] = [
    { key: "aprovados", label: "Aprovados" },
    { key: "pagamento", label: "Pagamento" },
    { key: "pedidos",   label: "Pedidos"   },
  ]

  const pending = deal.participants_list.filter(p => !p.approved)

  return (
    <div>
      <div className="flex gap-1 mb-4">
        {tabs.map((t) => (
          <button key={t.key}
            onClick={() => setActiveTab(t.key)}
            className="transition-all duration-150"
            style={{
              padding: "4px 10px", borderRadius: 100,
              fontSize: 10, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif",
              background: activeTab === t.key ? "rgba(22,163,74,0.12)" : "rgba(0,0,0,0.05)",
              color: activeTab === t.key ? "#16A34A" : "#9CA3AF",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "aprovados" && (
        <div className="space-y-2">
          {deal.participants_list.sort((a, b) => a.rank - b.rank).map((p) => (
            <div key={p.id}
              className="flex items-center gap-3 p-3 rounded-2xl"
              style={{ background: p.isMe ? "rgba(37,99,235,0.06)" : "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.7)" }}>
              <span className="text-[11px] font-black w-6 text-center"
                style={{ color: p.rank === 1 ? "#F59E0B" : p.rank === 2 ? "#9CA3AF" : p.rank === 3 ? "#D97706" : "#9CA3AF" }}>
                {p.rank}º
              </span>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: p.bg, border: `2px solid ${p.color}` }}>
                <span className="text-xs font-bold" style={{ color: p.color }}>{p.initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-gray-800 truncate">{p.name}</span>
                  {p.isMe && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(37,99,235,0.12)", color: "#2563EB" }}>Você</span>}
                </div>
                <span className="text-[11px] text-gray-400">{p.username}</span>
              </div>
              {p.value > 0 && (
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-800">{p.value.toLocaleString("pt-BR")}</p>
                  <p className="text-[10px] text-gray-400">pts</p>
                </div>
              )}
              {p.approved
                ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#16A34A" }} />
                : <XCircle className="w-4 h-4 flex-shrink-0 text-gray-300" />}
            </div>
          ))}
        </div>
      )}

      {activeTab === "pagamento" && (
        <div className="space-y-2">
          {deal.participants_list.map((p) => (
            <div key={p.id}
              className="flex items-center gap-3 p-3 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.7)" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: p.bg, border: `2px solid ${p.color}` }}>
                <span className="text-xs font-bold" style={{ color: p.color }}>{p.initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-800 truncate block">{p.name}</span>
                <span className="text-[11px] text-gray-400">{p.username}</span>
              </div>
              <span className="text-sm font-bold text-gray-800">R${deal.valuePerPerson.toLocaleString("pt-BR")}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(22,163,74,0.12)", color: "#16A34A" }}>
                Pago
              </span>
            </div>
          ))}
        </div>
      )}

      {activeTab === "pedidos" && (
        <div className="space-y-2">
          {pending.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2" style={{ color: "#16A34A" }} />
              <p className="text-sm font-semibold text-gray-600">Nenhum pedido pendente</p>
              <p className="text-xs text-gray-400 mt-1">Todos os participantes foram aprovados</p>
            </div>
          ) : (
            pending.map((p) => (
              <div key={p.id}
                className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.7)" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: p.bg, border: `2px solid ${p.color}` }}>
                  <span className="text-xs font-bold" style={{ color: p.color }}>{p.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-gray-800 block truncate">{p.name}</span>
                  <span className="text-[11px] text-gray-400">{p.username} · {p.joinedDaysAgo}d atrás</span>
                </div>
                <div className="flex gap-2">
                  <button className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(22,163,74,0.12)", color: "#16A34A" }}>
                    Aprovar
                  </button>
                  <button className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626" }}>
                    Recusar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Tab: Cronograma ───────────────────────────────────────────────────────────

function TimelineTab({ deal }: { deal: DealView }) {
  return (
    <div className="relative pl-6">
      <div className="absolute left-2.5 top-3 bottom-3 w-px" style={{ background: "rgba(0,0,0,0.1)" }} />
      <div className="space-y-5">
        {deal.timeline.map((ev, i) => (
          <div key={i} className="relative flex items-start gap-4">
            <div className="absolute -left-3.5 flex items-center justify-center">
              {ev.current ? (
                <div className="relative">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#16A34A" }}>
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "rgba(22,163,74,0.35)" }} />
                </div>
              ) : ev.done ? (
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(22,163,74,0.15)" }}>
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#16A34A" }} />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full" style={{ background: "rgba(0,0,0,0.06)", border: "2px solid rgba(0,0,0,0.1)" }} />
              )}
            </div>
            <div className="pt-0.5">
              <p className={`text-sm font-semibold ${ev.done || ev.current ? "text-gray-800" : "text-gray-400"}`}>
                {ev.label}
                {ev.current && (
                  <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(22,163,74,0.12)", color: "#16A34A" }}>
                    Agora
                  </span>
                )}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">{ev.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tab: Distribuição ─────────────────────────────────────────────────────────

function DistributionTab({ deal }: { deal: DealView }) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl text-center"
        style={{ background: "linear-gradient(135deg, #064E3B, #16A34A)", boxShadow: "0 8px 24px rgba(22,163,74,0.25)" }}>
        <p className="text-white/70 text-[11px] font-medium uppercase tracking-wider mb-1">Pote Total</p>
        <p className="text-white text-3xl font-black">R${deal.pot.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        <p className="text-white/60 text-xs mt-1">{deal.participants} participantes · R${deal.valuePerPerson.toLocaleString("pt-BR")} cada</p>
      </div>

      <div className="space-y-3">
        {deal.prizeSlices.map((slice, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-gray-700">{slice.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{Math.round(slice.pct * 100)}%</span>
                <span className="text-sm font-bold text-gray-800">R${slice.amount.toLocaleString("pt-BR")}</span>
              </div>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${slice.pct * 100}%`, background: slice.color }} />
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.7)" }}>
        <div className="flex items-center gap-2 mb-2">
          {(() => {
            const meta = PRIZE_META[deal.prizeType]
            const Icon = meta.Icon
            return (
              <>
                <Icon className="w-4 h-4" color={meta.color} />
                <span className="text-sm font-bold" style={{ color: meta.color }}>{meta.label}</span>
              </>
            )
          })()}
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          {deal.prizeType === "ranking"      && "O pote é dividido proporcionalmente entre os primeiros colocados ao final do período."}
          {deal.prizeType === "primeiro"     && "O vencedor leva todo o pote. Em caso de empate, o pote é dividido igualmente."}
          {deal.prizeType === "proporcional" && "Cada participante recebe de volta uma proporção do que apostou conforme seu desempenho."}
        </p>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

type MainTab = "participantes" | "cronograma" | "distribuicao"

export default function DealClient({
  deal: dealData,
  userId,
}: {
  deal: DealWithParticipants
  userId: string | null
}) {
  const router  = useRouter()
  const deal    = mapDeal(dealData, userId)
  const [mainTab, setMainTab] = useState<MainTab>("participantes")

  const daysLeft  = deal.daysTotal - deal.daysGone
  const pct       = Math.round(deal.progress * 100)
  const isWinning = deal.myRank != null && deal.myRank <= Math.ceil(deal.participants * 0.3)

  const MAIN_TABS: { key: MainTab; label: string }[] = [
    { key: "participantes", label: "Participantes" },
    { key: "cronograma",    label: "Cronograma"    },
    { key: "distribuicao",  label: "Distribuição"  },
  ]

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
            {deal.verifications.map((v) => <VerifChip key={v} type={v} />)}
          </div>

          <h1 className="text-white text-2xl font-black leading-tight mb-1">{deal.title}</h1>
          <p className="text-white/70 text-sm mb-5">{deal.subtitle}</p>

          {deal.status === "ativo" && (
            <>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-white/70 text-xs">Progresso</span>
                <span className="text-white font-bold text-xs">{pct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden mb-5" style={{ background: "rgba(255,255,255,0.2)" }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "rgba(255,255,255,0.9)" }} />
              </div>
            </>
          )}
        </div>

        {/* Info grid */}
        <div className="px-5 -mt-1">
          <div className="grid grid-cols-2 gap-3 pb-1">
            {[
              { label: "Pote total",    value: `R$${deal.pot.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, Icon: DollarSign, color: "#16A34A" },
              { label: "Entrada",       value: `R$${deal.valuePerPerson.toLocaleString("pt-BR")}/pessoa`, Icon: Lock,        color: "#3B82F6" },
              { label: "Participantes", value: `${deal.participants}`,                                    Icon: Users,       color: "#8B5CF6" },
              { label: deal.status === "ativo" ? "Dias restantes" : "Duração",
                value: deal.status === "ativo" ? `${daysLeft}d` : `${deal.daysTotal}d`,
                Icon: Clock, color: "#F59E0B" },
            ].map((stat, i) => (
              <GlassCard key={i} style={{ padding: "12px 14px" }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: `${stat.color}18` }}>
                    <stat.Icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">{stat.label}</span>
                </div>
                <p className="text-gray-800 font-bold text-base leading-tight">{stat.value}</p>
              </GlassCard>
            ))}
          </div>

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

          {/* Description */}
          {deal.description && (
            <GlassCard style={{ padding: "14px 16px", marginTop: 12 }}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sobre o deal</p>
              <p className="text-sm text-gray-700 leading-relaxed">{deal.description}</p>
            </GlassCard>
          )}

          {/* Rules */}
          {deal.rules.length > 0 && (
            <GlassCard style={{ padding: "14px 16px", marginTop: 12, marginBottom: 4 }}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Regras</p>
              <div className="space-y-2">
                {deal.rules.map((rule, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "rgba(22,163,74,0.12)" }}>
                      <span className="text-[8px] font-black" style={{ color: "#16A34A" }}>{i + 1}</span>
                    </div>
                    <p className="text-sm text-gray-700">{rule}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="px-5 mt-6 mb-4">
        <div className="flex gap-1.5 p-1.5 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.40)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.55)" }}>
          {MAIN_TABS.map((tab) => {
            const isActive = mainTab === tab.key
            return (
              <button key={tab.key}
                onClick={() => setMainTab(tab.key)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200"
                style={{
                  background: isActive ? "linear-gradient(135deg,#16A34A,#22C55E)" : "transparent",
                  color: isActive ? "white" : "#9CA3AF",
                  boxShadow: isActive ? "0 4px 14px rgba(22,163,74,0.35)" : "none",
                  border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif",
                }}>
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-5">
        {mainTab === "participantes" && <ParticipantsTab deal={deal} />}
        {mainTab === "cronograma"    && <TimelineTab    deal={deal} />}
        {mainTab === "distribuicao"  && <DistributionTab deal={deal} />}
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 px-5 py-4 z-20"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(40px) saturate(200%)",
          WebkitBackdropFilter: "blur(40px) saturate(200%)",
          borderTop: "1px solid rgba(255,255,255,0.6)",
        }}>
        <div className="flex items-center gap-4">
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9CA3AF" }}>
              Pote total
            </p>
            <p style={{ fontSize: 22, fontWeight: 900, color: "#16A34A", lineHeight: 1.1 }}>
              R${deal.pot.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p style={{ fontSize: 10, color: "#6B7280" }}>{deal.participants} participantes</p>
          </div>
          <div className="flex-1">
            {deal.status === "ativo" ? (
              <PrimaryBtn
                style={{ width: "100%", textAlign: "center", borderRadius: 12 }}
                onClick={() => router.push(`/tracking?id=${deal.id}`)}>
                Ver Tracking →
              </PrimaryBtn>
            ) : deal.status === "pendente" ? (
              <PrimaryBtn
                style={{ width: "100%", textAlign: "center", borderRadius: 12 }}>
                Entrar no Deal →
              </PrimaryBtn>
            ) : (
              <GhostBtn
                style={{ width: "100%", textAlign: "center", borderRadius: 12 }}
                onClick={() => router.push(`/deal/${deal.id}/result`)}>
                Ver Resultado Final
              </GhostBtn>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
