"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft, Share2, Users, DollarSign, Clock, Activity,
  CheckCircle2, XCircle, ChevronRight, Trophy, PieChart, Award,
  CalendarDays, Lock, Star,
} from "lucide-react"
import { GlassCard, PrimaryBtn, GhostBtn } from "@/components/td-ui"

// ── Types ──────────────────────────────────────────────────────────────────────

type VerifType  = "x" | "strava" | "gympass"
type PrizeType  = "proporcional" | "primeiro" | "ranking"
type DealStatus = "ativo" | "pendente" | "finalizado"

interface Participant {
  id: number
  initials: string
  name: string
  username: string
  color: string
  bg: string
  rank: number
  isMe?: boolean
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

// ── Mock data ─────────────────────────────────────────────────────────────────

const DEALS: Record<string, {
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
}> = {
  "1": {
    id: "1",
    title: "Meta Mensal de Passos",
    subtitle: "Strava · 48 participantes",
    status: "ativo",
    prizeType: "ranking",
    verifications: ["strava"],
    pot: 1200,
    valuePerPerson: 25,
    participants: 48,
    progress: 0.60,
    daysGone: 18,
    daysTotal: 30,
    startDate: "01 Abr 2026",
    endDate: "30 Abr 2026",
    description: "Quem acumular mais passos no mês leva uma fatia do pote. Verificação automática via Strava.",
    rules: [
      "Conectar conta Strava antes do início",
      "Passos contados apenas por atividades públicas",
      "Mínimo de 3 dias de atividade por semana",
      "Sem atividades duplicadas ou importadas",
    ],
    participants_list: [
      { id: 1, initials: "LR", name: "Lukas Rocha",    username: "@lkr0102", color: "#2563EB", bg: "rgba(37,99,235,0.12)",  rank: 3,  isMe: true, value: 187432, approved: true,  paid: true,  joinedDaysAgo: 20 },
      { id: 2, initials: "MC", name: "Maria C.",       username: "@mariac",  color: "#16A34A", bg: "rgba(22,163,74,0.12)",  rank: 1,  isMe: false, value: 231009, approved: true,  paid: true,  joinedDaysAgo: 20 },
      { id: 3, initials: "PF", name: "Paulo F.",       username: "@pfonseca",color: "#D97706", bg: "rgba(217,119,6,0.12)",  rank: 2,  isMe: false, value: 204567, approved: true,  paid: true,  joinedDaysAgo: 18 },
      { id: 4, initials: "AS", name: "Ana S.",         username: "@anas",    color: "#7C3AED", bg: "rgba(124,58,237,0.12)", rank: 4,  isMe: false, value: 145230, approved: true,  paid: true,  joinedDaysAgo: 19 },
      { id: 5, initials: "RB", name: "Rafael B.",      username: "@rafaelb", color: "#DC2626", bg: "rgba(220,38,38,0.12)",  rank: 5,  isMe: false, value: 130400, approved: true,  paid: false, joinedDaysAgo: 15 },
      { id: 6, initials: "TL", name: "Thiago L.",      username: "@thiagol", color: "#059669", bg: "rgba(5,150,105,0.12)",  rank: 6,  isMe: false, value: 118700, approved: false, paid: false, joinedDaysAgo: 14 },
    ],
    timeline: [
      { date: "20 Mar 2026", label: "Deal criado",         done: true  },
      { date: "25 Mar 2026", label: "Período de inscrições",done: true  },
      { date: "01 Abr 2026", label: "Início do deal",      done: true  },
      { date: "18 Abr 2026", label: "Hoje",                done: true, current: true },
      { date: "30 Abr 2026", label: "Fim do deal",         done: false },
      { date: "02 Mai 2026", label: "Resultado final",     done: false },
    ],
    prizeSlices: [
      { label: "1º lugar",  pct: 0.50, color: "#F59E0B", amount: 600 },
      { label: "2º lugar",  pct: 0.30, color: "#9CA3AF", amount: 360 },
      { label: "3º lugar",  pct: 0.20, color: "#D97706", amount: 240 },
    ],
    myRank: 3,
    potentialWin: 240,
    statusBorder: "#16A34A",
  },
  "4": {
    id: "4",
    title: "Quem ganha + seguidores",
    subtitle: "X (Twitter) · 2 participantes",
    status: "ativo",
    prizeType: "primeiro",
    verifications: ["x"],
    pot: 150,
    valuePerPerson: 75,
    participants: 2,
    progress: 0.62,
    daysGone: 18,
    daysTotal: 30,
    startDate: "01 Abr 2026",
    endDate: "30 Abr 2026",
    description: "Duelo de crescimento no X. Quem ganhar mais seguidores no período leva o pote.",
    rules: [
      "Conectar conta X antes do início",
      "Baseline medido no dia de início",
      "Sem compra de seguidores (verificado via API)",
      "Ganho por porcentagem relativa ao baseline",
    ],
    participants_list: [
      { id: 1, initials: "LR", name: "Lukas Rocha", username: "@lkr0102", color: "#2563EB", bg: "rgba(37,99,235,0.12)", rank: 1, isMe: true,  value: 1240, approved: true, paid: true, joinedDaysAgo: 20 },
      { id: 2, initials: "JV", name: "João V.",     username: "@joaov",   color: "#D97706", bg: "rgba(217,119,6,0.12)", rank: 2, isMe: false, value: 1198, approved: true, paid: true, joinedDaysAgo: 20 },
    ],
    timeline: [
      { date: "25 Mar 2026", label: "Deal criado",         done: true  },
      { date: "01 Abr 2026", label: "Início do deal",      done: true  },
      { date: "18 Abr 2026", label: "Hoje",                done: true, current: true },
      { date: "30 Abr 2026", label: "Fim do deal",         done: false },
      { date: "02 Mai 2026", label: "Resultado final",     done: false },
    ],
    prizeSlices: [
      { label: "Vencedor",  pct: 0.95, color: "#F59E0B", amount: 142 },
      { label: "True Deal", pct: 0.05, color: "#16A34A", amount: 8   },
    ],
    myRank: 1,
    potentialWin: 145,
    statusBorder: "#16A34A",
  },
}

const DEFAULT_DEAL = DEALS["1"]

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

function ParticipantsTab({ deal }: { deal: typeof DEFAULT_DEAL }) {
  const [activeTab, setActiveTab] = useState<ParticipantTab>("aprovados")

  const tabs: { key: ParticipantTab; label: string }[] = [
    { key: "aprovados", label: "Aprovados" },
    { key: "pagamento", label: "Pagamento" },
    { key: "pedidos",   label: "Pedidos"   },
  ]

  const approved  = deal.participants_list.filter(p => p.approved)
  const pending   = deal.participants_list.filter(p => !p.approved)
  const paid      = deal.participants_list.filter(p => p.paid)
  const notPaid   = deal.participants_list.filter(p => !p.paid)

  return (
    <div>
      {/* Sub-tab switcher */}
      <div className="flex gap-1 mb-4">
        {tabs.map((t) => (
          <button key={t.key}
            onClick={() => setActiveTab(t.key)}
            className="transition-all duration-150"
            style={{
              padding: "4px 10px",
              borderRadius: 100,
              fontSize: 10,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              background: activeTab === t.key ? "rgba(22,163,74,0.12)" : "rgba(0,0,0,0.05)",
              color: activeTab === t.key ? "#16A34A" : "#9CA3AF",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Aprovados */}
      {activeTab === "aprovados" && (
        <div className="space-y-2">
          {deal.participants_list
            .sort((a, b) => a.rank - b.rank)
            .map((p) => (
              <div key={p.id}
                className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: p.isMe ? "rgba(37,99,235,0.06)" : "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.7)" }}>
                {/* Rank */}
                <span className="text-[11px] font-black w-6 text-center"
                  style={{ color: p.rank === 1 ? "#F59E0B" : p.rank === 2 ? "#9CA3AF" : p.rank === 3 ? "#D97706" : "#9CA3AF" }}>
                  {p.rank}º
                </span>
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: p.bg, border: `2px solid ${p.color}` }}>
                  <span className="text-xs font-bold" style={{ color: p.color }}>{p.initials}</span>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-gray-800 truncate">{p.name}</span>
                    {p.isMe && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(37,99,235,0.12)", color: "#2563EB" }}>Você</span>}
                  </div>
                  <span className="text-[11px] text-gray-400">{p.username}</span>
                </div>
                {/* Value */}
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-800">{p.value.toLocaleString("pt-BR")}</p>
                  <p className="text-[10px] text-gray-400">pts</p>
                </div>
                {/* Status icon */}
                {p.approved
                  ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#16A34A" }} />
                  : <XCircle className="w-4 h-4 flex-shrink-0 text-gray-300" />}
              </div>
            ))}
        </div>
      )}

      {/* Pagamento */}
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
              <span className="text-sm font-bold text-gray-800">R${deal.valuePerPerson}</span>
              {p.paid
                ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(22,163,74,0.12)", color: "#16A34A" }}>Pago</span>
                : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.12)", color: "#D97706" }}>Pendente</span>}
            </div>
          ))}
        </div>
      )}

      {/* Pedidos */}
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

function TimelineTab({ deal }: { deal: typeof DEFAULT_DEAL }) {
  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-2.5 top-3 bottom-3 w-px" style={{ background: "rgba(0,0,0,0.1)" }} />

      <div className="space-y-5">
        {deal.timeline.map((ev, i) => (
          <div key={i} className="relative flex items-start gap-4">
            {/* Dot */}
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

            {/* Content */}
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

// ── Tab: Distribuição do Pote ─────────────────────────────────────────────────

function DistributionTab({ deal }: { deal: typeof DEFAULT_DEAL }) {
  return (
    <div className="space-y-4">
      {/* Total */}
      <div className="p-4 rounded-2xl text-center"
        style={{ background: "linear-gradient(135deg, #064E3B, #16A34A)", boxShadow: "0 8px 24px rgba(22,163,74,0.25)" }}>
        <p className="text-white/70 text-[11px] font-medium uppercase tracking-wider mb-1">Pote Total</p>
        <p className="text-white text-3xl font-black">R${deal.pot.toLocaleString("pt-BR")}</p>
        <p className="text-white/60 text-xs mt-1">{deal.participants} participantes · R${deal.valuePerPerson} cada</p>
      </div>

      {/* Slices */}
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

      {/* Prize type info */}
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

// ── Main page ─────────────────────────────────────────────────────────────────

type MainTab = "participantes" | "cronograma" | "distribuicao"

export default function DealDetailPage() {
  const router  = useRouter()
  const params  = useParams()
  const id      = params?.id as string ?? "1"

  const deal = DEALS[id] ?? DEFAULT_DEAL

  const [mainTab, setMainTab] = useState<MainTab>("participantes")

  const daysLeft  = deal.daysTotal - deal.daysGone
  const pct       = Math.round(deal.progress * 100)
  const isWinning = deal.myRank != null && deal.myRank <= Math.ceil(deal.participants * 0.3)

  const MAIN_TABS: { key: MainTab; label: string }[] = [
    { key: "participantes", label: "Participantes" },
    { key: "cronograma",    label: "Cronograma"    },
    { key: "distribuicao",  label: "Distribuição"  },
  ]

  return (
    <div className="min-h-screen pb-32"
      style={{
        backgroundImage: "url('/images/gradient-background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}>

      {/* ── Hero Card ─────────────────────────────────────────────────────── */}
      <div className="relative">
        <div className="px-5 pt-12 pb-6"
          style={{ background: "linear-gradient(160deg, #0D2E1A 0%, #16A34A 55%, #22C55E 100%)" }}>

          {/* Nav bar */}
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

          {/* Status + verif chips */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <StatusPill status={deal.status} />
            {deal.verifications.map((v) => <VerifChip key={v} type={v} />)}
          </div>

          {/* Title */}
          <h1 className="text-white text-2xl font-black leading-tight mb-1">{deal.title}</h1>
          <p className="text-white/70 text-sm mb-5">{deal.subtitle}</p>

          {/* Progress */}
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

        {/* ── Info grid (2-col glass tiles) ──────────────────────────────── */}
        <div className="px-5 -mt-1">
          <div className="grid grid-cols-2 gap-3 pb-1">
            {[
              { label: "Pote total",    value: `R$${deal.pot.toLocaleString("pt-BR")}`, Icon: DollarSign, color: "#16A34A" },
              { label: "Entrada",       value: `R$${deal.valuePerPerson}/pessoa`,        Icon: Lock,        color: "#3B82F6" },
              { label: "Participantes", value: `${deal.participants}`,                   Icon: Users,       color: "#8B5CF6" },
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

          {/* My rank tile (full width, if participating) */}
          {deal.myRank != null && (
            <GlassCard style={{ padding: "12px 16px", marginTop: 12 }}
              accent={isWinning ? "#16A34A" : "#9CA3AF"}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#1A2E3A,#2A4E5A)" }}>
                    <span className="text-blue-300 font-bold text-xs">LR</span>
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
          <GlassCard style={{ padding: "14px 16px", marginTop: 12 }}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sobre o deal</p>
            <p className="text-sm text-gray-700 leading-relaxed">{deal.description}</p>
          </GlassCard>

          {/* Rules */}
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
        </div>
      </div>

      {/* ── Main tab switcher ──────────────────────────────────────────────── */}
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
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                }}>
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      <div className="px-5">
        {mainTab === "participantes" && <ParticipantsTab deal={deal} />}
        {mainTab === "cronograma"    && <TimelineTab deal={deal} />}
        {mainTab === "distribuicao"  && <DistributionTab deal={deal} />}
      </div>

      {/* ── Sticky footer ─────────────────────────────────────────────────── */}
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
              R${deal.pot.toLocaleString("pt-BR")}
            </p>
            <p style={{ fontSize: 10, color: "#6B7280" }}>{deal.participants} participantes</p>
          </div>
          <div className="flex-1">
            {deal.status === "ativo" ? (
              <PrimaryBtn
                style={{ width: "100%", textAlign: "center", borderRadius: 12 }}
                onClick={() => router.push("/tracking")}>
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
                onClick={() => router.push(`/deal/${id}/result`)}>
                Ver Resultado Final
              </GhostBtn>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
