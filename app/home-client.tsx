"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Bell, Home, Compass, Wallet, User, Plus,
  Clock, Activity,
  Trophy, Star,
  ChevronLeft, ChevronRight,
  PieChart, Award, Search,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { DealWithParticipants, Profile } from "@/lib/supabase/types"

// ── UI types ───────────────────────────────────────────────────────────────────

type VerifType   = "x" | "strava" | "gympass" | "wellhub" | "totalpass"
type PrizeType   = "proporcional" | "primeiro" | "ranking"
type DealTypeUI  = "oficial" | "privado" | "público"
type DealStatusUI = "ativo" | "pendente" | "finalizado"

interface Deal {
  id: string
  title: string
  type: DealTypeUI
  status: DealStatusUI
  prizeType: PrizeType
  pot: number
  valuePerPerson: number
  participants: number
  progress: number
  daysGone: number
  daysTotal: number
  verifications: VerifType[]
  isParticipating: boolean
  myRank?: number
  potentialWin?: number
  daysToStart?: number
}

// ── Mapping from DB → UI ──────────────────────────────────────────────────────

function toDealUI(d: DealWithParticipants, userId: string | null): Deal {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(d.start_date)
  const end   = new Date(d.end_date)
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000))
  const goneDays  = Math.max(0, Math.round((today.getTime() - start.getTime()) / 86400000))
  const daysToStart = Math.max(0, Math.round((start.getTime() - today.getTime()) / 86400000))

  const statusMap: Record<string, DealStatusUI> = {
    formacao: "pendente",
    ativo:    "ativo",
    finalizado: "finalizado",
  }
  const prizeMap: Record<string, PrizeType> = {
    winner:       "primeiro",
    top3:         "ranking",
    proportional: "proporcional",
  }

  const uiStatus: DealStatusUI = statusMap[d.status] ?? "pendente"
  const uiType: DealTypeUI    = d.type === "publico" ? "público" : (d.type as DealTypeUI)
  const prizeType: PrizeType  = prizeMap[d.distribution] ?? "primeiro"
  const verifs: VerifType[]   = d.verification_channels.filter(
    (c): c is VerifType => ["x", "strava", "gympass", "wellhub", "totalpass"].includes(c),
  )

  const myP = userId ? d.participants.find((p) => p.user_id === userId) : null
  const isParticipating = myP != null

  return {
    id:            d.id,
    title:         d.title,
    type:          uiType,
    status:        uiStatus,
    prizeType,
    pot:           d.pot_total,
    valuePerPerson: d.entry_amount,
    participants:  d.participant_count,
    progress:      Math.min(1, goneDays / totalDays),
    daysGone:      goneDays,
    daysTotal:     totalDays,
    verifications: verifs,
    isParticipating,
    myRank:        isParticipating ? (myP?.rank ?? undefined) : undefined,
    potentialWin:  isParticipating ? Math.round(d.net_pot * 0.9) : undefined,
    daysToStart:   uiStatus === "pendente" ? daysToStart : undefined,
  }
}

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<DealStatusUI, { border: string; bg: string; badgeBg: string; badgeColor: string; badgeLabel: string }> = {
  ativo:      { border: "#16A34A", bg: "rgba(22,163,74,0.05)",    badgeBg: "rgba(22,163,74,0.12)",    badgeColor: "#16A34A", badgeLabel: "Em Jogo" },
  pendente:   { border: "#F59E0B", bg: "rgba(245,158,11,0.05)",   badgeBg: "rgba(245,158,11,0.12)",   badgeColor: "#D97706", badgeLabel: "Formação" },
  finalizado: { border: "#9CA3AF", bg: "rgba(156,163,175,0.06)",  badgeBg: "rgba(156,163,175,0.14)",  badgeColor: "#6B7280", badgeLabel: "Encerrado" },
}

function StatusDot({ status }: { status: DealStatusUI }) {
  const color = STATUS_STYLE[status].border
  return (
    <div className="relative flex-shrink-0 w-3 h-3 flex items-center justify-center">
      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      {status === "ativo" && (
        <div className="absolute w-2.5 h-2.5 rounded-full animate-ping"
          style={{ backgroundColor: color, opacity: 0.45 }} />
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: DealStatusUI }) {
  const { badgeBg, badgeColor, badgeLabel } = STATUS_STYLE[status]
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: badgeBg, color: badgeColor }}>{badgeLabel}</span>
  )
}

// ── Badge de verificação ──────────────────────────────────────────────────────

type VerifMeta = { bg: string; label: string; Icon?: React.FC<{ className?: string }>; text?: string }

const VERIF: Record<VerifType, VerifMeta> = {
  x:         { bg: "#000",     label: "X",         text: "𝕏"  },
  strava:    { bg: "#FC4C02",  label: "Strava",     Icon: Activity },
  gympass:   { bg: "#00A651",  label: "Gympass",    text: "GP" },
  wellhub:   { bg: "#00A878",  label: "Wellhub",    text: "W"  },
  totalpass: { bg: "#FF6B35",  label: "TotalPass",  text: "T"  },
}

function VerifBadge({ type }: { type: VerifType }) {
  const m = VERIF[type]
  return (
    <div title={m.label} className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: m.bg }}>
      {m.Icon ? <m.Icon className="w-3 h-3 text-white" /> : <span className="text-white text-[9px] font-bold">{m.text}</span>}
    </div>
  )
}

// ── Badge de tipo de premiação ────────────────────────────────────────────────

const PRIZE_CONFIG: Record<PrizeType, { label: string; bg: string; color: string; Icon: React.FC<{ className?: string; color?: string }> }> = {
  proporcional: { label: "Proporcional", bg: "rgba(139,92,246,0.12)", color: "#7C3AED", Icon: PieChart },
  primeiro:     { label: "1º Lugar",     bg: "rgba(245,158,11,0.12)", color: "#D97706", Icon: Trophy  },
  ranking:      { label: "Ranking",      bg: "rgba(59,130,246,0.12)", color: "#2563EB", Icon: Award   },
}

function PrizeBadge({ type }: { type: PrizeType }) {
  const { label, bg, color, Icon } = PRIZE_CONFIG[type]
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: bg }}>
      <Icon className="w-3 h-3 flex-shrink-0" color={color} />
      <span className="text-[10px] font-bold" style={{ color }}>{label}</span>
    </div>
  )
}

function TypeBadge({ type }: { type: DealTypeUI }) {
  return (
    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: "rgba(0,0,0,0.05)", color: "#9CA3AF" }}>
      {type}
    </span>
  )
}

// ── Deal Card ─────────────────────────────────────────────────────────────────

function DealCard({ deal, onClick }: { deal: Deal; onClick: () => void }) {
  const daysLeft = deal.daysTotal - deal.daysGone
  const isWinning = deal.myRank != null && deal.myRank <= Math.ceil(deal.participants * 0.3)
  const ss = STATUS_STYLE[deal.status]

  return (
    <button onClick={onClick}
      className="w-full text-left p-4 transition-all duration-300 hover:scale-[1.015] active:scale-[0.98]"
      style={{
        background: "rgba(255,255,255,0.48)",
        backdropFilter: "blur(30px) saturate(200%)",
        WebkitBackdropFilter: "blur(30px) saturate(200%)",
        border: `1px solid rgba(255,255,255,0.6)`,
        borderLeft: `3.5px solid ${ss.border}`,
        borderRadius: 16,
        boxShadow: "0 4px 20px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.6)",
        backgroundColor: ss.bg,
      }}>

      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <StatusDot status={deal.status} />
        <StatusBadge status={deal.status} />
        <PrizeBadge type={deal.prizeType} />
        <TypeBadge type={deal.type} />
      </div>

      <h3 className="text-gray-800 font-bold text-base leading-snug mb-3">{deal.title}</h3>

      <div className="grid grid-cols-2 gap-1.5 mb-2.5">
        {[
          { label: "Entrada",       value: `R$${deal.valuePerPerson}/pessoa` },
          { label: "Pot total",     value: deal.pot > 0 ? `R$${deal.pot.toLocaleString("pt-BR")}` : "—", green: true },
          { label: "Participantes", value: `${deal.participants} players` },
          {
            label: deal.status === "pendente" ? "Inicia em" : deal.status === "ativo" ? "Tempo restante" : "Duração",
            value: deal.status === "pendente" ? `${deal.daysToStart ?? 0}d` : deal.status === "ativo" ? `${daysLeft}d` : `${deal.daysTotal}d`,
          },
        ].map((tile) => (
          <div key={tile.label} style={{
            background: "rgba(255,255,255,0.5)", borderRadius: 8,
            padding: "6px 8px", display: "flex", flexDirection: "column", gap: 2,
          }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {tile.label}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: tile.green ? "#16A34A" : "#374151" }}>
              {tile.value}
            </span>
          </div>
        ))}
      </div>

      {deal.verifications.length > 0 && (
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span style={{ fontSize: 10, color: "#9CA3AF" }}>Verificado via</span>
          {deal.verifications.map((v) => <VerifBadge key={v} type={v} />)}
        </div>
      )}

      {deal.status === "ativo" && deal.progress > 0 && (
        <div className="space-y-1.5">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.08)" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${deal.progress * 100}%`, background: "linear-gradient(90deg,#16A34A,#22C55E)" }} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-400">{deal.daysGone}/{deal.daysTotal} dias</span>
            {deal.myRank != null && (
              <div className="flex items-center gap-1">
                {isWinning && <Trophy className="w-3 h-3 text-yellow-500" />}
                <span className={`text-[10px] font-bold ${isWinning ? "text-green-600" : "text-gray-400"}`}>
                  {deal.myRank}º{isWinning ? ` · R$${deal.potentialWin?.toLocaleString("pt-BR")}` : " lugar"}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {deal.status === "pendente" && (
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] text-amber-600 font-semibold">
              {(deal.daysToStart ?? 0) === 0 ? "Inicia hoje" : `Inicia em ${deal.daysToStart}d`}
            </span>
          </div>
          {!deal.isParticipating && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full text-white"
              style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)" }}>
              Entrar →
            </span>
          )}
        </div>
      )}

      {deal.status === "finalizado" && (
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-[11px] text-gray-500">Deal encerrado · {deal.daysTotal}d</span>
          {deal.myRank === 1 && <span className="text-[11px] font-bold text-amber-600">🏆 Vencedor</span>}
        </div>
      )}
    </button>
  )
}

// ── Hero banner ───────────────────────────────────────────────────────────────

const FEATURED_DEALS = [
  {
    id: "strava-week",
    badge: "Oficial True Deal",
    title: "Strava Week",
    subtitle: "5 km/day · Verificado via Strava",
    pot: "R$ 5.000",
    entry: "R$ 50",
    players: 98,
    daysLeft: 4,
    progress: 0.72,
    accent: "#FC4C02",
    dark: "#7A2500",
    Icon: Activity,
  },
  {
    id: "academia",
    badge: "Oficial True Deal",
    title: "Academia 30 Dias",
    subtitle: "Check-in diário · Verificado via Wellhub",
    pot: "R$ 1.200",
    entry: "R$ 25",
    players: 48,
    daysLeft: 12,
    progress: 0.60,
    accent: "#00A651",
    dark: "#005A2B",
    Icon: Activity,
  },
]

function HeroBanner({ onJoin }: { onJoin: () => void }) {
  const [current, setCurrent] = useState(0)
  const deal = FEATURED_DEALS[current]

  return (
    <div className="px-5 mb-4 relative">
      <div
        className="relative rounded-3xl overflow-hidden p-5"
        style={{
          background: `linear-gradient(135deg, ${deal.dark} 0%, ${deal.accent} 60%, #FF8A50 100%)`,
          boxShadow: `0 12px 40px ${deal.accent}55`,
        }}
      >
        <div className="flex items-center gap-1.5 mb-3">
          <Star className="w-3 h-3 text-white/80" fill="currentColor" />
          <span className="text-white/80 text-[10px] font-bold uppercase tracking-widest">{deal.badge}</span>
        </div>

        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-white text-2xl font-black leading-tight">{deal.title}</h2>
            <p className="text-white/70 text-xs mt-0.5">{deal.subtitle}</p>
          </div>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.3)" }}>
            <deal.Icon className="w-7 h-7 text-white" />
          </div>
        </div>

        <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.2)" }}>
          <div className="h-full rounded-full" style={{ width: `${deal.progress * 100}%`, background: "rgba(255,255,255,0.9)" }} />
        </div>

        <div className="flex items-center gap-4 mb-4">
          {[
            { label: "Pot total", value: deal.pot },
            { label: "Entrada",   value: deal.entry },
            { label: "Players",   value: String(deal.players) },
            { label: "Restam",    value: `${deal.daysLeft}d` },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-white/60 text-[10px]">{s.label}</p>
              <p className="text-white font-bold text-base">{s.value}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onJoin}
          className="w-full py-3 rounded-2xl font-bold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "rgba(255,255,255,0.95)", color: deal.accent, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}
        >
          Participar →
        </button>
      </div>

      {FEATURED_DEALS.length > 1 && (
        <>
          <button onClick={() => setCurrent((p) => (p - 1 + FEATURED_DEALS.length) % FEATURED_DEALS.length)}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)" }}>
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <button onClick={() => setCurrent((p) => (p + 1) % FEATURED_DEALS.length)}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)" }}>
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex gap-1.5 justify-center mt-3">
            {FEATURED_DEALS.map((_, idx) => (
              <button key={idx} onClick={() => setCurrent(idx)}
                className="h-2 rounded-full transition-all"
                style={{
                  background: idx === current ? "rgba(22,163,74,0.8)" : "rgba(0,0,0,0.2)",
                  width: idx === current ? "24px" : "8px",
                }} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Notification Popover ──────────────────────────────────────────────────────

function NotificationPopover({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null
  const notifications = [
    { id: 1, icon: "🎉", title: "Bem-vindo ao True Deal!", message: "Crie ou entre em um deal para começar",  time: "agora" },
  ]
  return (
    <div className="fixed inset-0 z-30" onClick={onClose}>
      <div className="absolute top-16 right-5 w-80 rounded-3xl p-4"
        style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(40px)", border: "1px solid rgba(255,255,255,0.6)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800">Notificações</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
        </div>
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className="flex gap-3 p-2.5 rounded-2xl">
              <span className="text-xl flex-shrink-0">{n.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">{n.title}</p>
                <p className="text-gray-500 text-xs truncate">{n.message}</p>
                <p className="text-gray-400 text-xs mt-1">{n.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Profile Popover ───────────────────────────────────────────────────────────

function ProfilePopover({
  isOpen, onClose, profile,
}: { isOpen: boolean; onClose: () => void; profile: Profile | null }) {
  const router = useRouter()

  if (!isOpen) return null

  const displayName = profile?.display_name ?? "Usuário"
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"
  const username = profile?.username ? `@${profile.username}` : ""

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <div className="fixed inset-0 z-30" onClick={onClose}>
      <div className="absolute top-16 right-5 w-80 rounded-3xl p-5"
        style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(40px)", border: "1px solid rgba(255,255,255,0.6)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#1A2E3A,#2A4E5A)" }}>
              <span className="text-blue-300 font-semibold text-sm">{initials}</span>
            </div>
            <div>
              <p className="font-bold text-gray-800">{displayName}</p>
              {username && <p className="text-xs text-gray-500">{username}</p>}
              {profile && (
                <p className="text-xs text-[#16A34A] font-semibold mt-0.5">{profile.tdp_points} TDP</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
        </div>
        <div className="space-y-1">
          <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition-all text-sm">Editar perfil</button>
          <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition-all text-sm">Privacidade e segurança</button>
          <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition-all text-sm">Notificações</button>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full mt-4 px-3 py-2 rounded-lg hover:bg-red-50 transition-all text-sm text-red-600 font-medium"
        >
          Sair
        </button>
      </div>
    </div>
  )
}

// ── Nav ───────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { icon: Home,    label: "Home",    href: "/" },
  { icon: Compass, label: "Explorar", href: "/explore" },
  { icon: Wallet,  label: "Wallet",   href: "/wallet" },
  { icon: User,    label: "Perfil",   href: "/profile" },
]

const MAIN_TABS = [
  { key: "todos" as const, label: "Todos os Deals", color: "#16A34A", tint: "rgba(22,163,74,0.06)"  },
  { key: "meus"  as const, label: "Meus Deals",     color: "#3B82F6", tint: "rgba(59,130,246,0.06)" },
]

const STATUS_FILTERS: { key: DealStatusUI; label: string; color: string }[] = [
  { key: "pendente",   label: "Em preparação", color: "#D97706" },
  { key: "ativo",      label: "Deal ativo",     color: "#16A34A" },
  { key: "finalizado", label: "Encerrado",      color: "#6B7280" },
]

const TYPE_FILTERS: { key: DealTypeUI; label: string }[] = [
  { key: "oficial", label: "Oficial" },
  { key: "privado", label: "Privado" },
  { key: "público", label: "Público" },
]

// ── Home Client ───────────────────────────────────────────────────────────────

interface HomeClientProps {
  initialDeals: DealWithParticipants[]
  profile: Profile | null
  userId: string | null
}

export default function HomeClient({ initialDeals, profile, userId }: HomeClientProps) {
  const router = useRouter()

  const deals: Deal[] = initialDeals.map((d) => toDealUI(d, userId))

  const [activeMainTab, setActiveMainTab]   = useState<"todos" | "meus">("todos")
  const [activeDealType, setActiveDealType] = useState<DealTypeUI | null>(null)
  const [activeStatus, setActiveStatus]     = useState<DealStatusUI | null>(null)
  const [searchQuery, setSearchQuery]       = useState("")
  const [showSearch, setShowSearch]         = useState(false)
  const [activeNav, setActiveNav]           = useState("Home")
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile]            = useState(false)

  const viewingMyDeals = activeMainTab === "meus"
  const activeTab = MAIN_TABS.find((t) => t.key === activeMainTab)!

  const filteredDeals = deals
    .filter((d) => !viewingMyDeals || d.isParticipating)
    .filter((d) => !activeStatus   || d.status === activeStatus)
    .filter((d) => !activeDealType || d.type   === activeDealType)
    .filter((d) => !searchQuery    || d.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const countByStatus = (s: DealStatusUI) =>
    deals
      .filter((d) => d.status === s)
      .filter((d) => !viewingMyDeals || d.isParticipating)
      .filter((d) => !activeDealType || d.type === activeDealType).length

  const countByType = (t: DealTypeUI) =>
    deals
      .filter((d) => d.type === t)
      .filter((d) => !viewingMyDeals || d.isParticipating)
      .filter((d) => !activeStatus   || d.status === activeStatus).length

  const myActiveDeals = deals.filter((d) => d.isParticipating && d.status === "ativo")
  const footerAtStake   = myActiveDeals.reduce((s, d) => s + d.valuePerPerson, 0)
  const footerPotential = myActiveDeals.reduce((s, d) => s + (d.potentialWin ?? 0), 0)

  const displayName = profile?.display_name ?? "Usuário"
  const firstName   = displayName.split(" ")[0]
  const initials    = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"

  return (
    <div
      className="min-h-screen flex flex-col pb-20"
      style={{
        backgroundImage: "url('/images/gradient-background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Header */}
      <header className="px-5 pt-12 pb-4 z-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">True Deal</h1>
            <p className="text-gray-500 text-sm">Olá, {firstName} 👋</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowNotifications(!showNotifications)}
              className="relative w-10 h-10 rounded-xl flex items-center justify-center hover:scale-105 transition-all"
              style={{ background: "rgba(255,255,255,0.4)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.5)" }}>
              <Bell className="w-5 h-5 text-gray-700" />
            </button>
            <button onClick={() => setShowProfile(!showProfile)}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:scale-105 transition-all"
              style={{ background: "linear-gradient(135deg,#1A2E3A,#2A4E5A)" }}>
              <span className="text-blue-300 font-semibold text-sm">{initials}</span>
            </button>
          </div>
        </div>
      </header>

      <NotificationPopover isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
      <ProfilePopover isOpen={showProfile} onClose={() => setShowProfile(false)} profile={profile} />

      {/* Hero */}
      <HeroBanner onJoin={() => router.push("/create")} />

      {/* Abas */}
      <div className="px-5 mb-3">
        <div className="flex gap-2 p-1.5 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.35)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.5)" }}>
          {MAIN_TABS.map((tab) => {
            const isActive = activeMainTab === tab.key
            return (
              <button key={tab.key}
                onClick={() => { setActiveMainTab(tab.key); setActiveDealType(null); setActiveStatus(null); setSearchQuery(""); setShowSearch(false) }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300"
                style={{
                  background: isActive ? `linear-gradient(135deg,${tab.color},${tab.color}cc)` : "transparent",
                  color: isActive ? "white" : "#6B7280",
                  boxShadow: isActive ? `0 4px 14px ${tab.color}44` : "none",
                }}>
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col transition-colors duration-300" style={{ background: activeTab.tint }}>
        {/* Filtros */}
        <div className="px-5 pt-3 pb-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5" style={{ scrollbarWidth: "none" }}>
            <button
              onClick={() => setShowSearch((s) => !s)}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all"
              style={{
                background: showSearch ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.5)",
                border: showSearch ? "1.5px solid rgba(59,130,246,0.4)" : "1px solid rgba(255,255,255,0.6)",
              }}>
              <Search className="w-3.5 h-3.5" style={{ color: showSearch ? "#3B82F6" : "#6B7280" }} />
            </button>
            <div className="w-px h-5 bg-gray-300/60 flex-shrink-0" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex-shrink-0">Tipo</span>

            {TYPE_FILTERS.map((tf) => {
              const cnt = countByType(tf.key)
              const isActive = activeDealType === tf.key
              return (
                <button key={tf.key}
                  onClick={() => setActiveDealType(isActive ? null : tf.key)}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap"
                  style={{
                    background: isActive ? "rgba(22,163,74,0.15)" : "rgba(255,255,255,0.5)",
                    border: isActive ? "1.5px solid rgba(22,163,74,0.4)" : "1px solid rgba(255,255,255,0.6)",
                    color: isActive ? "#16A34A" : "#6B7280",
                  }}>
                  {tf.label}
                  {cnt > 0 && (
                    <span className="text-[9px] font-bold px-1 py-0.5 rounded-full"
                      style={{ background: isActive ? "rgba(22,163,74,0.2)" : "rgba(0,0,0,0.07)" }}>
                      {cnt}
                    </span>
                  )}
                </button>
              )
            })}

            <div className="w-px h-5 bg-gray-300/60 flex-shrink-0" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex-shrink-0">Status</span>

            {STATUS_FILTERS.map((sf) => {
              const cnt = countByStatus(sf.key)
              const isActive = activeStatus === sf.key
              return (
                <button key={sf.key}
                  onClick={() => setActiveStatus(isActive ? null : sf.key)}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap"
                  style={{
                    background: isActive ? `${sf.color}18` : "rgba(255,255,255,0.5)",
                    border: isActive ? `1.5px solid ${sf.color}55` : "1px solid rgba(255,255,255,0.6)",
                    color: isActive ? sf.color : "#6B7280",
                  }}>
                  {sf.label}
                  {cnt > 0 && (
                    <span className="text-[9px] font-bold px-1 py-0.5 rounded-full"
                      style={{ background: isActive ? `${sf.color}25` : "rgba(0,0,0,0.07)", color: isActive ? sf.color : "#6B7280" }}>
                      {cnt}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {showSearch && (
            <div className="mt-2 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar deal pelo nome..."
                autoFocus
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none text-gray-800 placeholder-gray-400"
                style={{
                  background: "rgba(255,255,255,0.7)",
                  backdropFilter: "blur(20px)",
                  border: "1.5px solid rgba(59,130,246,0.3)",
                }}
              />
            </div>
          )}
        </div>

        {/* Lista */}
        <div className="flex-1 px-5 overflow-y-auto">
          {filteredDeals.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">🏆</div>
              <p className="text-gray-600 font-semibold">
                {viewingMyDeals && deals.filter((d) => d.isParticipating).length === 0
                  ? "Você ainda não entrou em nenhum deal"
                  : "Nenhum deal encontrado"}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {viewingMyDeals && deals.filter((d) => d.isParticipating).length === 0
                  ? "Crie um deal ou entre em um existente"
                  : searchQuery ? `Sem resultados para "${searchQuery}"` : "Crie um novo ou explore os públicos"}
              </p>
              {viewingMyDeals && deals.filter((d) => d.isParticipating).length === 0 && (
                <button
                  onClick={() => router.push("/create")}
                  className="mt-4 px-6 py-2.5 rounded-full text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)" }}
                >
                  Criar meu primeiro Deal
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {filteredDeals.map((deal) => (
                <DealCard key={deal.id} deal={deal} onClick={() => router.push(`/deal/${deal.id}`)} />
              ))}

              {viewingMyDeals && myActiveDeals.length > 0 && (
                <div className="mt-1 p-4 rounded-2xl"
                  style={{ background: "rgba(59,130,246,0.07)", backdropFilter: "blur(20px)", border: "1.5px solid rgba(59,130,246,0.18)" }}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Resumo financeiro</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-gray-500 mb-0.5">Total em jogo</p>
                      <p className="text-xl font-bold text-gray-800">R${footerAtStake.toLocaleString("pt-BR")}</p>
                      <p className="text-[10px] text-gray-400">{myActiveDeals.length} deal(s) ativo(s)</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 mb-0.5">Potencial de ganho</p>
                      <p className="text-xl font-bold" style={{ color: footerPotential > 0 ? "#3DBF6A" : "#9CA3AF" }}>
                        R${footerPotential.toLocaleString("pt-BR")}
                      </p>
                      <p className="text-[10px] text-gray-400">na posição atual</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button onClick={() => router.push("/create")}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 z-20"
        style={{
          background: "linear-gradient(135deg,#16A34A 0%,#22C55E 100%)",
          boxShadow: "0 8px 32px rgba(22,163,74,0.45), 0 16px 48px rgba(22,163,74,0.2)",
        }}>
        <Plus className="w-5 h-5 text-white" />
        <span className="text-white font-semibold">Novo Deal</span>
      </button>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 px-6 py-4 z-10"
        style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(40px) saturate(200%)", borderTop: "1px solid rgba(255,255,255,0.5)" }}>
        <div className="flex justify-around items-center">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeNav === item.label
            return (
              <button key={item.label}
                onClick={() => { setActiveNav(item.label); if (item.href !== "/") router.push(item.href) }}
                className="flex flex-col items-center gap-1 transition-all duration-300">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${isActive ? "scale-110" : ""}`}
                  style={{ background: isActive ? "linear-gradient(135deg,#16A34A,#22C55E)" : "transparent" }}>
                  <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-500"}`} />
                </div>
                <span className={`text-xs font-medium ${isActive ? "text-[#16A34A]" : "text-gray-500"}`}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
