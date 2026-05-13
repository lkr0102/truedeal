"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { differenceInCalendarDays, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ArrowLeft, Share2, Activity,
  Trophy, Lock, ExternalLink, BarChart2, ChevronRight, ChevronDown,
  AlertCircle, X, Loader2,
} from "lucide-react"
import { GlassCard } from "@/components/td-ui"
import type { DealWithParticipants, Distribution } from "@/lib/supabase/types"
import { useLanguageStore, t } from "@/lib/i18n"
import { joinDeal } from "@/lib/actions/deals"

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

function mapDeal(d: DealWithParticipants, userId: string | null, lang: "pt" | "en"): DealView {
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

  const locale = lang === "pt" ? ptBR : undefined
  const startDateStr  = format(startDate, "dd MMM yyyy", { locale })
  const endDateStr    = format(endDate,   "dd MMM yyyy", { locale })
  const todayStr      = format(now,       "dd MMM yyyy", { locale })

  const timeline: TimelineEvent[] = [
    { date: startDateStr, label: lang === "pt" ? "Início do deal" : "Deal start", done: status !== "pendente" },
    { date: todayStr,     label: lang === "pt" ? "Hoje" : "Today",            done: true, current: status === "ativo" },
    { date: endDateStr,   label: lang === "pt" ? "Fim do deal" : "Deal end",     done: status === "finalizado" },
    ...(status === "finalizado" ? [{ date: endDateStr, label: lang === "pt" ? "Resultado final" : "Final result", done: true }] : []),
  ]

  const borderMap: Record<DealStatus, string> = { ativo: "#16A34A", pendente: "#D97706", finalizado: "#9CA3AF" }

  return {
    id:             d.id,
    title:          d.title,
    subtitle:       lang === "pt" 
      ? `${d.participant_count} participante${d.participant_count !== 1 ? "s" : ""}`
      : `${d.participant_count} participant${d.participant_count !== 1 ? "s" : ""}`,
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
  const { language } = useLanguageStore()
  const map = {
    ativo:      { bg: "rgba(22,163,74,0.15)",   color: "#16A34A", label: language === "pt" ? "Em Jogo" : "Live"      },
    pendente:   { bg: "rgba(245,158,11,0.15)",  color: "#D97706", label: language === "pt" ? "Formação" : "Formation" },
    finalizado: { bg: "rgba(156,163,175,0.15)", color: "#6B7280", label: language === "pt" ? "Encerrado" : "Ended"     },
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

const getRuleLabels = (lang: "pt" | "en"): Record<string, string> => ({
  post: lang === "pt" ? "Post publicado" : "Published post",
  comment_received: lang === "pt" ? "Comentário recebido" : "Comment received",
  repost_received: lang === "pt" ? "Repost recebido" : "Repost received",
  follower_gained: lang === "pt" ? "Seguidor recebido" : "Follower gained",
  impressions: lang === "pt" ? "Impressões" : "Impressions",
  km_run: lang === "pt" ? "Kms percorridos" : "Kms run",
  pace: lang === "pt" ? "Pace médio" : "Average pace",
  workout_hours: lang === "pt" ? "Horas de treino" : "Workout hours",
  checkin: lang === "pt" ? "Check-ins" : "Check-ins",
  different_venues: lang === "pt" ? "Diferentes ambientes" : "Different venues",
})

const getDistMeta = (lang: "pt" | "en"): Record<string, { label: string; icon: string; desc: string }> => ({
  winner:       { label: lang === "pt" ? "1º Lugar" : "1st Place",      icon: "👑", desc: lang === "pt" ? "Vencedor leva tudo" : "Winner takes all" },
  top3:         { label: lang === "pt" ? "Ranking" : "Ranking",        icon: "🏅", desc: lang === "pt" ? "1º 60% · 2º 30% · 3º 10% do pote" : "1st 60% · 2nd 30% · 3rd 10% of pot" },
  proportional: { label: lang === "pt" ? "Proporcional" : "Proportional",   icon: "🤝", desc: lang === "pt" ? "Pote final dividido entre todos que cumprirem o acordo." : "Final pot split between everyone who meets the agreement." },
})

const getVerificationSubrules = (lang: "pt" | "en"): Record<string, { title: string; items: string[]; hint?: string }> => ({
  post: {
    title: lang === "pt" ? "Regras do post verificado" : "Verified post rules",
    items: lang === "pt" ? [
      "Conta pública no X no momento da verificação",
      "Mínimo de 100 caracteres por post",
      "Conteúdo original — o DealGuard usa análise semântica para rejeitar repetições",
      "Posts deletados antes da verificação não são contabilizados",
      "A verificação ocorre via API do X com o access token do participante",
    ] : [
      "Public X account at the time of verification",
      "Minimum 100 characters per post",
      "Original content — DealGuard uses semantic analysis to reject duplicates",
      "Posts deleted before verification are not counted",
      "Verified via X API using the participant's access token",
    ],
    hint: lang === "pt" ? "🔍 O DealGuard analisa cada post individualmente — qualidade importa tanto quanto quantidade" : "🔍 DealGuard reviews each post individually — quality matters as much as quantity",
  },
  follower_gained: {
    title: lang === "pt" ? "Regras — Seguidores recebidos" : "Rules — Followers gained",
    items: lang === "pt" ? [
      "A baseline de seguidores é registrada no início do deal (start_snapshot)",
      "O DealGuard calcula o ganho líquido em cada janela (novos − perdidos)",
      "O requisito é sobre ganho líquido por janela, não o total acumulado",
      "Conta deve permanecer pública durante todo o período",
      "Verificado via API da plataforma com access token do participante",
    ] : [
      "Follower baseline is recorded at deal start (start_snapshot)",
      "DealGuard calculates net gain per window (new − lost)",
      "Requirement is net gain per window, not cumulative total",
      "Account must remain public throughout the period",
      "Verified via platform API using the participant's access token",
    ],
  },
  impressions: {
    title: lang === "pt" ? "Regras — Impressões" : "Rules — Impressions",
    items: lang === "pt" ? [
      "Total de impressões das publicações feitas dentro da janela de frequência",
      "Impressões de publicações anteriores ao deal não são contabilizadas",
      "Verificado via API da plataforma com access token do participante",
      "Conta deve permanecer pública durante todo o período",
    ] : [
      "Total impressions from posts published within the frequency window",
      "Impressions from posts made before the deal are not counted",
      "Verified via platform API using the participant's access token",
      "Account must remain public throughout the period",
    ],
  },
  comment_received: {
    title: lang === "pt" ? "Regras — Comentários recebidos" : "Rules — Comments received",
    items: lang === "pt" ? [
      "Total de comentários recebidos nas publicações da janela",
      "O DealGuard filtra comentários spam ou automatizados",
      "Verificado via API da plataforma com access token do participante",
      "Conta deve permanecer pública durante todo o período",
    ] : [
      "Total comments received on posts published within the window",
      "DealGuard filters spam or automated comments",
      "Verified via platform API using the participant's access token",
      "Account must remain public throughout the period",
    ],
  },
  repost_received: {
    title: lang === "pt" ? "Regras — Reposts recebidos" : "Rules — Reposts received",
    items: lang === "pt" ? [
      "Total de reposts ou compartilhamentos recebidos nas publicações da janela",
      "Auto-reposts do próprio participante não contam",
      "Verificado via API da plataforma com access token do participante",
    ] : [
      "Total reposts or shares received on posts published within the window",
      "Self-reposts by the participant do not count",
      "Verified via platform API using the participant's access token",
    ],
  },
  km_run: {
    title: lang === "pt" ? "Regras — Kms percorridos" : "Rules — Kms run",
    items: lang === "pt" ? [
      "Apenas atividades com tipo Corrida (Run) são contabilizadas",
      "As distâncias de todas as corridas da janela são somadas",
      "DealGuard valida os dados via API do Strava com o access token do participante",
      "Atividades manuais sem GPS podem ser desconsideradas pelo DealGuard",
    ] : [
      "Only Run-type activities are counted",
      "All run distances within the window are summed",
      "DealGuard validates data via Strava API using the participant's access token",
      "Manual activities without GPS may be disregarded by DealGuard",
    ],
    hint: lang === "pt" ? "🏃 Registre suas corridas normalmente no Strava — a sincronização é automática" : "🏃 Record your runs normally in Strava — sync is automatic",
  },
  pace: {
    title: lang === "pt" ? "Regras — Pace médio" : "Rules — Average pace",
    items: lang === "pt" ? [
      "DealGuard calcula o pace médio das corridas registradas na janela (em min/km)",
      "Condição de cumprimento: pace_médio ≤ pace configurado pelo criador",
      "Quanto menor o valor, mais rápido (ex: 5:30 é mais rápido que 6:00)",
      "Exemplo: criador configura 6:00 → participante com 5:45 cumpre; com 6:10, não",
    ] : [
      "DealGuard calculates the average pace of runs in the window (min/km)",
      "Compliance condition: avg_pace ≤ pace configured by the creator",
      "Lower value means faster (e.g., 5:30 is faster than 6:00)",
      "Example: creator sets 6:00 → participant at 5:45 passes; at 6:10, fails",
    ],
    hint: lang === "pt" ? "⏱ Pace mais baixo = você correu mais rápido" : "⏱ Lower pace = you ran faster",
  },
  workout_hours: {
    title: lang === "pt" ? "Regras — Horas de exercício" : "Rules — Workout hours",
    items: lang === "pt" ? [
      "Tempo total de atividades registradas no Strava durante a janela",
      "Todas as modalidades de atividade contam (não apenas corrida)",
      "Medido em horas — ex: 1h30 = 1,5",
      "DealGuard valida via API do Strava com o access token do participante",
    ] : [
      "Total workout time recorded on Strava during the window",
      "All activity types count (not just running)",
      "Measured in hours — e.g., 1h30 = 1.5",
      "DealGuard validates via Strava API using the participant's access token",
    ],
  },
  checkin: {
    title: lang === "pt" ? "Como funciona — Check-in em Academia" : "How it works — Gym Check-in",
    items: lang === "pt" ? [
      "Check-in presencial em academia parceira Wellhub ou TotalPass",
      "Verificação automática via API — sem nenhuma ação manual no app",
      "Apenas academias credenciadas na rede parceira são aceitas",
      "Prazo: até 23h59 (horário de Brasília) de cada janela de frequência",
      "Máximo 1 check-in válido por dia — múltiplos na mesma unidade não acumulam",
      "Check-ins de dias anteriores à data de início do deal não são contabilizados",
    ] : [
      "In-person check-in at a Wellhub or TotalPass partner gym",
      "Automatic verification via API — no manual action required in the app",
      "Only credentialed partner network gyms are accepted",
      "Deadline: by 11:59 PM (Brasília time) of each frequency window",
      "Max 1 valid check-in per day — multiple at the same location don't stack",
      "Check-ins from days before the deal start date are not counted",
    ],
    hint: lang === "pt"
      ? "📍 Basta se exercitar e fazer check-in normalmente pelo Wellhub ou TotalPass — o True Deal sincroniza via API automaticamente"
      : "📍 Just work out and check in normally via Wellhub or TotalPass — True Deal syncs via API automatically",
  },
  different_venues: {
    title: lang === "pt" ? "Regras — Ambientes diferentes" : "Rules — Different venues",
    items: lang === "pt" ? [
      "Número de academias ou espaços distintos visitados dentro da janela",
      "Visitar o mesmo local múltiplas vezes conta como 1 ambiente único",
      "Apenas locais credenciados na rede Wellhub ou TotalPass são aceitos",
      "Verificado via API com o e-mail de membro do participante",
    ] : [
      "Number of distinct gyms or venues visited within the window",
      "Visiting the same location multiple times counts as 1 unique venue",
      "Only credentialed Wellhub or TotalPass network locations are accepted",
      "Verified via API using the participant's member email",
    ],
    hint: lang === "pt" ? "🏋️ Varie as academias na semana para acumular ambientes diferentes" : "🏋️ Switch gyms during the week to stack different venues",
  },
})


function DealRulesCard({ deal, dealData }: { deal: DealView; dealData: DealWithParticipants }) {
  const { language } = useLanguageStore()
  const diffDays   = deal.daysTotal
  const distMeta   = getDistMeta(language)[dealData.distribution] ?? getDistMeta(language).winner
  const channelNames = (dealData.verification_channels ?? [])
    .map(c => CHANNEL_LABELS[c] ?? c).join(" + ")
  const ruleLabel  = getRuleLabels(language)[dealData.verification_type] ?? dealData.verification_type
  const subrules   = getVerificationSubrules(language)[dealData.verification_type]

  const frequencyMap: Record<string, string> = {
    daily:   language === "pt" ? "Diário"  : "Daily",
    weekly:  language === "pt" ? "Semanal" : "Weekly",
    monthly: language === "pt" ? "Mensal"  : "Monthly",
    yearly:  language === "pt" ? "Anual"   : "Yearly",
  }
  const freqLabel    = dealData.rule_frequency ? frequencyMap[dealData.rule_frequency] ?? dealData.rule_frequency : null
  const targetPrefix = dealData.rule_target != null ? `${dealData.rule_target} × ` : ""
  const ruleWithFreq = [(targetPrefix + ruleLabel).trim(), freqLabel].filter(Boolean).join(" · ")
  const potTotal     = `R$${deal.pot.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`

  const confirmRows = [
    {
      icon: "🛡️", iconBg: "rgba(22,163,74,0.1)",
      key: language === "pt" ? "Regra" : "Rule",
      val: channelNames && ruleLabel ? `${channelNames} · ${ruleLabel}` : ruleLabel || "—",
    },
    {
      icon: "📅", iconBg: "rgba(239,68,68,0.08)",
      key: language === "pt" ? "Período" : "Period",
      val: `${deal.startDate} → ${deal.endDate} (${diffDays}d)`,
    },
    {
      icon: "💰", iconBg: "rgba(22,163,74,0.1)",
      key: language === "pt" ? "Financeiro" : "Financial",
      val: `R$${deal.valuePerPerson.toLocaleString("pt-BR")}/${language === "pt" ? "pessoa" : "person"} · ${deal.participants} ${language === "pt" ? "participantes" : "participants"} · ${potTotal}`,
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
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}>
              <Lock className="w-3.5 h-3.5 text-white" />
              <span className="text-white text-[10px] font-bold uppercase tracking-wide">
                {dealData.type === "privado"
                  ? (language === "pt" ? "Privado" : "Private")
                  : (language === "pt" ? "Público" : "Public")}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: language === "pt" ? "Entrada" : "Entry",   value: `R$${deal.valuePerPerson.toLocaleString("pt-BR")}` },
              { label: language === "pt" ? "Regra" : "Rule",      value: ruleWithFreq || "—" },
              { label: language === "pt" ? "Duração" : "Duration", value: `${diffDays} ${language === "pt" ? "dias" : "days"}` },
              { label: language === "pt" ? "Premiação" : "Prize",  value: distMeta.label },
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
        {confirmRows.map((row, i, arr) => (
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
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{language === "pt" ? "Descrição" : "Description"}</p>
          <p className="text-sm text-gray-700 leading-relaxed">{deal.description}</p>
        </div>
      )}

      {/* Subrules — expanded detail box */}
      {subrules && (
        <div className="mt-2 p-4 rounded-2xl"
          style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.18)" }}>
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">
            {subrules.title}
          </p>
          <ul className="space-y-2">
            {subrules.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[12px] text-gray-700 leading-relaxed">
                <span className="text-blue-400 mt-0.5 flex-shrink-0 font-bold">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          {subrules.hint && (
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(59,130,246,0.15)" }}>
              <p className="text-[11px] text-amber-600 font-semibold leading-relaxed">
                {subrules.hint}
              </p>
            </div>
          )}
        </div>
      )}

      {/* DealGuard — double verification */}
      <div className="mt-2 p-4 rounded-2xl"
        style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.18)" }}>
        <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest mb-3">
          🔒 {language === "pt" ? "Verificação dupla — DealGuard Engine" : "Double verification — DealGuard Engine"}
        </p>
        <div className="space-y-2.5">
          {[
            {
              step: "1",
              color: "#7C3AED",
              bg: "rgba(124,58,237,0.1)",
              label: language === "pt" ? "Coleta automática via API" : "Automatic API collection",
              desc: language === "pt"
                ? "O DealGuard conecta diretamente nas plataformas (X, Strava, Wellhub…) e extrai os dados brutos de cada participante ao final de cada janela."
                : "DealGuard connects directly to platforms (X, Strava, Wellhub…) and pulls raw data from each participant at the end of each window.",
            },
            {
              step: "2",
              color: "#7C3AED",
              bg: "rgba(124,58,237,0.1)",
              label: language === "pt" ? "Análise Sentinel (IA)" : "Sentinel analysis (AI)",
              desc: language === "pt"
                ? "Uma camada de inteligência artificial analisa as evidências em busca de padrões suspeitos ou atividade fraudulenta. Resultados com risco alto são marcados e excluídos da premiação."
                : "An AI layer reviews the evidence for suspicious patterns or fraudulent activity. High-risk results are flagged and excluded from the prize pool.",
            },
          ].map(({ step, color, bg, label, desc }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: bg, border: `1px solid ${color}30` }}>
                <span style={{ fontSize: 10, fontWeight: 900, color }}>{step}</span>
              </div>
              <div>
                <p className="text-[11px] font-bold text-purple-700 mb-0.5">{label}</p>
                <p className="text-[11px] text-gray-600 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-purple-500 mt-3 font-semibold" style={{ borderTop: "1px solid rgba(124,58,237,0.15)", paddingTop: 10 }}>
          {language === "pt"
            ? "✓ Só após essa verificação dupla o resultado é finalizado e os fundos liberados."
            : "✓ Only after this double verification is the result finalized and funds released."}
        </p>
      </div>

      {/* Compliance — como funciona o cumprimento (friendly) */}
      <div className="mt-2 p-4 rounded-2xl"
        style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.22)" }}>
        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-3">
          📋 {language === "pt" ? "Como funciona o cumprimento" : "How compliance works"}
        </p>
        <p className="text-[12px] text-gray-700 leading-relaxed mb-3">
          {language === "pt"
            ? "Seu desempenho é avaliado janela por janela — não apenas no final. Para ser vencedor, você precisa atingir a meta em cada janela do período (diária, semanal ou mensal)."
            : "Your performance is evaluated window by window — not just at the end. To win, you need to hit the goal in every window of the period (daily, weekly, or monthly)."}
        </p>
        {/* Example table */}
        <div className="rounded-xl overflow-hidden mb-3" style={{ border: "1px solid rgba(245,158,11,0.2)" }}>
          <div className="px-3 py-2" style={{ background: "rgba(245,158,11,0.08)" }}>
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">
              {language === "pt" ? "Exemplo: 5 posts/semana · 4 semanas" : "Example: 5 posts/week · 4 weeks"}
            </p>
          </div>
          {[
            { window: language === "pt" ? "Semana 1" : "Week 1", value: language === "pt" ? "5 posts" : "5 posts", ok: true },
            { window: language === "pt" ? "Semana 2" : "Week 2", value: language === "pt" ? "5 posts" : "5 posts", ok: true },
            { window: language === "pt" ? "Semana 3" : "Week 3", value: language === "pt" ? "5 posts" : "5 posts", ok: true },
            { window: language === "pt" ? "Semana 4" : "Week 4", value: language === "pt" ? "4 posts" : "4 posts", ok: false },
          ].map(({ window, value, ok }) => (
            <div key={window}
              className="flex items-center justify-between px-3 py-2"
              style={{ borderTop: "1px solid rgba(245,158,11,0.1)", background: ok ? "transparent" : "rgba(239,68,68,0.04)" }}>
              <span className="text-[11px] text-gray-500">{window}</span>
              <span className="text-[11px] font-semibold" style={{ color: ok ? "#6B7280" : "#EF4444" }}>{value}</span>
              <span className="text-[11px] font-bold" style={{ color: ok ? "#16A34A" : "#EF4444" }}>
                {ok ? "✓" : language === "pt" ? "✗ abaixo da meta" : "✗ below goal"}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-600 leading-relaxed">
          {language === "pt"
            ? "O bom desempenho das semanas anteriores não compensa uma janela abaixo da meta. O DealGuard verifica automaticamente ao final de cada janela."
            : "Strong performance in previous windows does not make up for a window below the goal. DealGuard checks automatically at the end of each window."}
        </p>
      </div>
    </div>
  )
}

// ── Live ranking card ─────────────────────────────────────────────────────────

function PlayerCard({
  player, expanded, onToggle,
}: { player: Participant; expanded: boolean; onToggle: () => void }) {
  const { language } = useLanguageStore()
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
            {player.rank}{language === "pt" ? "º" : (player.rank === 1 ? "st" : player.rank === 2 ? "nd" : player.rank === 3 ? "rd" : "th")}
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
              }}>{language === "pt" ? "Você" : "You"}</span>
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
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>{language === "pt" ? "sem dados" : "no data"}</div>
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
                { label: language === "pt" ? "Início" : "Start", value: player.startValue.toLocaleString("pt-BR") },
                { label: language === "pt" ? "Atual" : "Current",  value: player.currentValue.toLocaleString("pt-BR") },
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
              {language === "pt" ? "Dados de tracking ainda não disponíveis" : "Tracking data not yet available"}
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
  const { language } = useLanguageStore()
  const deal    = mapDeal(dealData, userId, language)
  const [expandedId,       setExpandedId]       = useState<string | null>(null)
  const [joinLoading,      setJoinLoading]      = useState(false)
  const [joinError,        setJoinError]        = useState<string | null>(null)
  const [showSocialPopup,  setShowSocialPopup]  = useState<string[] | null>(null)

  const requiredChannel = deal.verificationChannels?.[0] ?? null
  const requiredChannelLabel = requiredChannel ? CHANNEL_LABELS[requiredChannel] ?? requiredChannel : null
  const emailOnlyPlatforms = new Set(["wellhub", "totalpass"])
  const hasRequiredConnection = requiredChannel
    ? !!userSocialConnections?.some(c => {
        if (c.platform !== requiredChannel) return false
        if (!c.username && !c.member_email && !c.external_id) return false
        return emailOnlyPlatforms.has(c.platform) || c.status !== "pending"
      })
    : true

  const isParticipant = userId ? dealData.participants.some(p => p.user_id === userId) : false

  async function handleJoin() {
    if (!userId) { router.push("/login"); return }
    if (!hasRequiredConnection && requiredChannel) {
      setShowSocialPopup(deal.verificationChannels.filter(ch => !userSocialConnections?.some(c => {
        if (c.platform !== ch) return false
        if (!c.username && !c.member_email && !c.external_id) return false
        return emailOnlyPlatforms.has(c.platform) || c.status !== "pending"
      })))
      return
    }
    setJoinLoading(true)
    setJoinError(null)
    const result = await joinDeal(dealData.id)
    setJoinLoading(false)
    if (result.error) {
      if (result.error.startsWith("MISSING_SOCIAL:")) {
        const channels = result.error.replace("MISSING_SOCIAL:", "").split(",").filter(Boolean)
        setShowSocialPopup(channels)
        return
      }
      setJoinError(result.error)
      return
    }
    router.refresh()
  }

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
                <span className="text-white/70 text-xs">{language === "pt" ? "Progresso" : "Progress"}</span>
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
                <span className="text-white/70 text-xs">{language === "pt" ? "Vagas preenchidas" : "Slots filled"}</span>
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
                    <p className="text-xs text-gray-400">{language === "pt" ? "Minha posição" : "My position"}</p>
                    <p className="text-gray-800 font-bold text-base">
                      {deal.myRank}{language === "pt" ? "º" : (deal.myRank === 1 ? "st" : deal.myRank === 2 ? "nd" : deal.myRank === 3 ? "rd" : "th")} {language === "pt" ? "lugar" : "place"}
                      {isWinning && <span className="ml-2 text-[11px]" style={{ color: "#16A34A" }}>· {language === "pt" ? "Em zona de prêmio" : "In prize zone"}</span>}
                    </p>
                  </div>
                </div>
                {deal.potentialWin != null && deal.potentialWin > 0 && (
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400">{language === "pt" ? "Ganho potencial" : "Potential gain"}</p>
                    <p className="font-bold" style={{ color: "#16A34A" }}>R${deal.potentialWin.toLocaleString("pt-BR")}</p>
                  </div>
                )}
                {isWinning && <Trophy className="w-5 h-5 text-yellow-500 ml-2" />}
              </div>
            </GlassCard>
          )}

          {/* Join button — only for non-participants during formation */}
          {deal.status === "pendente" && !isParticipant && userId && (
            <div className="mt-3 mb-1">
              {joinError && (
                <p className="text-xs text-red-500 mb-2 text-center">{joinError}</p>
              )}
              <button
                onClick={handleJoin}
                disabled={joinLoading}
                className="w-full py-4 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg,#16A34A,#22C55E)",
                  boxShadow: "0 8px 32px rgba(22,163,74,0.38)",
                  opacity: joinLoading ? 0.7 : 1,
                }}
              >
                {joinLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : (language === "pt" ? "Participar do Deal" : "Join Deal")}
              </button>
            </div>
          )}

          <DealRulesCard deal={deal} dealData={dealData} />

          {/* Financeiro + Situação dos participantes — card unificado */}
          <GlassCard style={{ padding: 16, marginTop: 12 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
              {language === "pt" ? "Financeiro & Participantes" : "Financial & Participants"}
            </p>

            {/* Entrada + Pote total */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[
                { label: language === "pt" ? "Entrada" : "Entry",      value: `R$${entryAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, color: "#374151" },
                { label: language === "pt" ? "Pote total" : "Total pot", value: `R$${deal.pot.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,   color: "#16A34A" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ borderRadius: 12, padding: "10px 8px", textAlign: "center", background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)" }}>
                  <p style={{ fontSize: 17, fontWeight: 900, color, lineHeight: 1 }}>{value}</p>
                  <p style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4 }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Iniciaram / No jogo / Eliminados */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              {[
                { label: language === "pt" ? "Iniciaram" : "Started",   value: totalCount,      color: "#374151", bg: "rgba(0,0,0,0.04)"     },
                { label: language === "pt" ? "No jogo" : "In game",     value: aliveCount,      color: "#16A34A", bg: "rgba(22,163,74,0.08)" },
                { label: language === "pt" ? "Eliminados" : "Out",      value: eliminatedCount, color: "#EF4444", bg: "rgba(239,68,68,0.08)" },
              ].map(({ label, value, color, bg }) => (
                <div key={label} style={{ borderRadius: 12, padding: "10px 8px", textAlign: "center", background: bg }}>
                  <p style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{value}</p>
                  <p style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4 }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Barra proporcional */}
            {totalCount > 0 && (
              <>
                <div style={{ height: 8, borderRadius: 100, overflow: "hidden", display: "flex" }}>
                  <div style={{ width: `${(aliveCount / totalCount) * 100}%`, background: "linear-gradient(90deg,#16A34A,#22C55E)", transition: "width 0.5s ease" }} />
                  <div style={{ width: `${(eliminatedCount / totalCount) * 100}%`, background: "linear-gradient(90deg,#EF4444,#F87171)", transition: "width 0.5s ease" }} />
                  <div style={{ flex: 1, background: "rgba(0,0,0,0.07)" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, marginBottom: 12 }}>
                  <span style={{ fontSize: 10, color: "#16A34A" }}>
                    {Math.round((aliveCount / totalCount) * 100)}% {language === "pt" ? "ainda competindo" : "still competing"}
                  </span>
                  {eliminatedCount > 0 && (
                    <span style={{ fontSize: 10, color: "#EF4444" }}>
                      {Math.round((eliminatedCount / totalCount) * 100)}% {language === "pt" ? "eliminados" : "eliminated"}
                    </span>
                  )}
                </div>
              </>
            )}

            {/* Breakdown financeiro — apenas quando deal está ativo */}
            {deal.status !== "pendente" && (
              <>
                <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "4px 0 12px" }} />
                <p style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                  {language === "pt" ? "Estimativa por participante ativo" : "Estimate per active participant"}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#6B7280" }}>{language === "pt" ? "Entrada paga" : "Entry paid"}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>
                      R${entryAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {eliminatedCount > 0 && (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#6B7280" }}>
                          {language === "pt" ? `Pote dos eliminados (${eliminatedCount}×)` : `Losers pool (${eliminatedCount}×)`}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>
                          R${loserPool.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#9CA3AF" }}>
                          {language === "pt" ? `Taxa da plataforma (${feePct}%)` : `Platform fee (${feePct}%)`}
                        </span>
                        <span style={{ fontSize: 12, color: "#9CA3AF" }}>
                          −R${(loserPool * feePct / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#6B7280" }}>
                          {language === "pt" ? `Distribuído entre ${aliveCount} ativos` : `Distributed among ${aliveCount} active`}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#16A34A" }}>
                          +R${extraPerWinner.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div style={{ height: 1, background: "rgba(0,0,0,0.07)", margin: "4px 0" }} />
                    </>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{language === "pt" ? "Total estimado por ativo" : "Estimated total per active"}</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: "#16A34A" }}>
                      R${totalPerWinner.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {eliminatedCount === 0 ? (
                  <div style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.18)" }}>
                    <p style={{ fontSize: 12, color: "#3B82F6", fontWeight: 600, lineHeight: 1.5 }}>
                      🤝 {language === "pt"
                        ? `Todos ainda no jogo! Se isso se mantiver, cada participante recupera os R$${entryAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} integralmente.`
                        : `Everyone still in the game! If this continues, each participant recovers their R$${entryAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} in full.`}
                    </p>
                  </div>
                ) : isAlive ? (
                  <div style={{ padding: "10px 12px", borderRadius: 12, background: "linear-gradient(135deg,rgba(22,163,74,0.1),rgba(34,197,94,0.06))", border: "1px solid rgba(22,163,74,0.25)" }}>
                    <p style={{ fontSize: 12, color: "#16A34A", fontWeight: 700, lineHeight: 1.5 }}>
                      ✅ {language === "pt"
                        ? `Cumprir sua palavra está te fazendo ganhar R$${extraPerWinner.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} a mais. Continue assim!`
                        : `Keeping your word is earning you R$${extraPerWinner.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} more. Keep it up!`}
                    </p>
                  </div>
                ) : (
                  <div style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <p style={{ fontSize: 12, color: "#EF4444", fontWeight: 600, lineHeight: 1.5 }}>
                      ❌ {language === "pt" ? "Você foi eliminado deste deal. Acompanhe quem vai até o fim." : "You've been eliminated from this deal. Follow who goes until the end."}
                    </p>
                  </div>
                )}
              </>
            )}
          </GlassCard>

          {/* Live ranking */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, marginBottom: 4 }}>
            <BarChart2 size={15} color="#16A34A" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{language === "pt" ? "Participantes" : "Participants"}</span>
            <div
              className="animate-pulse"
              style={{ width: 7, height: 7, borderRadius: "50%", background: "#16A34A", marginLeft: "auto" }}
            />
            <span style={{ fontSize: 10, color: "#9CA3AF" }}>{language === "pt" ? "atualizado agora" : "updated now"}</span>
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

      {/* ── Missing social popup ───────────────────────────────────────────────── */}
      {showSocialPopup && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowSocialPopup(null)}
        >
          <div
            className="w-full rounded-t-3xl px-5 pt-5 pb-10"
            style={{ background: "rgba(255,255,255,0.98)", boxShadow: "0 -16px 64px rgba(0,0,0,0.2)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-base font-bold text-gray-800">
                  {language === "pt" ? "Conta não vinculada" : "Account not linked"}
                </h3>
              </div>
              <button
                onClick={() => setShowSocialPopup(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.06)" }}
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="rounded-2xl p-4 mb-5" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
              <p className="text-sm text-red-700 font-semibold mb-1">
                {language === "pt"
                  ? `Para participar deste deal, você precisa vincular sua conta do ${showSocialPopup.map(ch => CHANNEL_LABELS[ch] ?? ch).join(" + ")}.`
                  : `To join this deal, you need to link your ${showSocialPopup.map(ch => CHANNEL_LABELS[ch] ?? ch).join(" + ")} account.`}
              </p>
              <p className="text-xs text-red-500 leading-relaxed">
                {language === "pt"
                  ? "O app usa sua conta para verificar automaticamente se você cumpriu o desafio."
                  : "The app uses your account to automatically verify if you met the challenge."}
              </p>
            </div>

            <div className="space-y-2 mb-5">
              {showSocialPopup.map(ch => (
                <div key={ch} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.07)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white"
                    style={{ background: ch === "x" ? "#000" : ch === "strava" ? "#FC4C02" : ch === "wellhub" ? "#00A651" : ch === "totalpass" ? "#0047AB" : "#6B7280" }}>
                    {ch === "x" ? "𝕏" : ch === "strava" ? "S" : ch === "wellhub" ? "W" : ch === "totalpass" ? "TP" : ch[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{CHANNEL_LABELS[ch] ?? ch}</p>
                    <p className="text-xs text-gray-400">{language === "pt" ? "Não vinculado" : "Not linked"}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => router.push("/profile")}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm"
              style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)", boxShadow: "0 8px 32px rgba(22,163,74,0.35)" }}
            >
              {language === "pt" ? "Vincular conta agora" : "Link account now"}
            </button>
            <button
              onClick={() => setShowSocialPopup(null)}
              className="w-full mt-2.5 py-3 rounded-2xl font-semibold text-gray-500 text-sm"
              style={{ background: "rgba(0,0,0,0.04)" }}
            >
              {language === "pt" ? "Cancelar" : "Cancel"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
