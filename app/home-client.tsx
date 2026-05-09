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
type AgreementTypeUI  = "oficial" | "privado" | "público"
type AgreementStatusUI = "ativo" | "pendente" | "finalizado"

interface PerformanceAgreement {
  id: string
  title: string
  type: AgreementTypeUI
  status: AgreementStatusUI
  prizeType: PrizeType
  totalGuarantee: number
  guaranteePerPerson: number
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

function toAgreementUI(d: DealWithParticipants, userId: string | null): PerformanceAgreement {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(d.start_date)
  const end   = new Date(d.end_date)
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000))
  const goneDays  = Math.max(0, Math.round((today.getTime() - start.getTime()) / 86400000))
  const daysToStart = Math.max(0, Math.round((start.getTime() - today.getTime()) / 86400000))

  const statusMap: Record<string, AgreementStatusUI> = {
    formacao: "pendente",
    ativo:    "ativo",
    finalizado: "finalizado",
  }
  const prizeMap: Record<string, PrizeType> = {
    winner:       "primeiro",
    top3:         "ranking",
    proportional: "proporcional",
  }

  const uiStatus: AgreementStatusUI = statusMap[d.status] ?? "pendente"
  const uiType: AgreementTypeUI    = d.type === "publico" ? "público" : (d.type as AgreementTypeUI)
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
    totalGuarantee: d.pot_total,
    guaranteePerPerson: d.entry_amount,
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

const STATUS_STYLE: Record<AgreementStatusUI, { border: string; bg: string; badgeBg: string; badgeColor: string; badgeLabel: string }> = {
  ativo:      { border: "#00D26A", bg: "rgba(0,210,106,0.03)",    badgeBg: "rgba(0,210,106,0.12)",    badgeColor: "#00D26A", badgeLabel: "PROTOCOL ACTIVE" },
  pendente:   { border: "#F59E0B", bg: "rgba(245,158,11,0.03)",   badgeBg: "rgba(245,158,11,0.12)",   badgeColor: "#D97706", badgeLabel: "FORMING" },
  finalizado: { border: "#9CA3AF", bg: "rgba(156,163,175,0.05)",  badgeBg: "rgba(156,163,175,0.12)",  badgeColor: "#6B7280", badgeLabel: "LIQUIDATED" },
}

function StatusDot({ status }: { status: AgreementStatusUI }) {
  const color = STATUS_STYLE[status].border
  return (
    <div className="relative flex-shrink-0 w-3 h-3 flex items-center justify-center">
      <div className="w-2 rounded-full h-2" style={{ backgroundColor: color }} />
      {status === "ativo" && (
        <div className="absolute w-2 h-2 rounded-full animate-ping"
          style={{ backgroundColor: color, opacity: 0.4 }} />
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: AgreementStatusUI }) {
  const { badgeBg, badgeColor, badgeLabel } = STATUS_STYLE[status]
  return (
    <span className="text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest"
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
    <div title={m.label} className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 border border-white/20 shadow-sm"
      style={{ backgroundColor: m.bg }}>
      {m.Icon ? <m.Icon className="w-3.5 h-3.5 text-white" /> : <span className="text-white text-[10px] font-black">{m.text}</span>}
    </div>
  )
}

// ── Badge de tipo de premiação ────────────────────────────────────────────────

const PRIZE_CONFIG: Record<PrizeType, { label: string; bg: string; color: string; Icon: React.FC<{ className?: string; color?: string }> }> = {
  proporcional: { label: "PROPORTIONAL", bg: "rgba(139,92,246,0.1)", color: "#7C3AED", Icon: PieChart },
  primeiro:     { label: "WINNER TAKE ALL", bg: "rgba(245,158,11,0.1)", color: "#D97706", Icon: Trophy  },
  ranking:      { label: "TIERED RANKING", bg: "rgba(59,130,246,0.1)", color: "#2563EB", Icon: Award   },
}

function PrizeBadge({ type }: { type: PrizeType }) {
  const { label, bg, color, Icon } = PRIZE_CONFIG[type]
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg flex-shrink-0" style={{ backgroundColor: bg }}>
      <Icon className="w-3 h-3 flex-shrink-0" color={color} />
      <span className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>{label}</span>
    </div>
  )
}

function TypeBadge({ type }: { type: AgreementTypeUI }) {
  return (
    <span className="text-[8px] font-black px-2 py-0.5 rounded-lg flex-shrink-0 uppercase tracking-widest"
      style={{ backgroundColor: "rgba(0,0,0,0.06)", color: "#9CA3AF" }}>
      {type}
    </span>
  )
}

// ── Agreement Card ────────────────────────────────────────────────────────────

function AgreementCard({ agreement, onClick }: { agreement: PerformanceAgreement; onClick: () => void }) {
  const daysLeft = agreement.daysTotal - agreement.daysGone
  const isWinning = agreement.myRank != null && agreement.myRank <= Math.ceil(agreement.participants * 0.3)
  const ss = STATUS_STYLE[agreement.status]

  return (
    <button onClick={onClick}
      className="w-full text-left p-6 transition-all duration-300 hover:translate-y-[-2px] active:scale-[0.98] group"
      style={{
        background: "rgba(255,255,255,0.4)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: `1px solid rgba(255,255,255,0.7)`,
        borderLeft: `4px solid ${ss.border}`,
        borderRadius: 24,
        boxShadow: "0 8px 32px rgba(0,0,0,0.04), inset 0 1px 1px rgba(255,255,255,0.8)",
      }}>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <StatusDot status={agreement.status} />
        <StatusBadge status={agreement.status} />
        <PrizeBadge type={agreement.prizeType} />
        <TypeBadge type={agreement.type} />
      </div>

      <h3 className="text-[#0A0F0D] font-black text-xl tracking-tight leading-none mb-5 uppercase group-hover:text-[#00D26A] transition-colors">
        {agreement.title}
      </h3>

      <div className="grid grid-cols-2 gap-2 mb-5">
        {[
          { label: "Alocação",      value: `R$${agreement.guaranteePerPerson}` },
          { label: "Garantia Líquida", value: agreement.totalGuarantee > 0 ? `R$${agreement.totalGuarantee.toLocaleString("pt-BR")}` : "—", green: true },
          { label: "Participantes", value: `${agreement.participants} PLRS` },
          {
            label: agreement.status === "pendente" ? "Initialize" : agreement.status === "ativo" ? "Remaining" : "Duration",
            value: agreement.status === "pendente" ? `${agreement.daysToStart ?? 0}D` : agreement.status === "ativo" ? `${daysLeft}D` : `${agreement.daysTotal}D`,
          },
        ].map((tile) => (
          <div key={tile.label} className="p-3 rounded-2xl flex flex-col gap-1"
            style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.5)" }}>
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">
              {tile.label}
            </span>
            <span className="text-[13px] font-black tracking-tight" style={{ color: tile.green ? "#00D26A" : "#0A0F0D" }}>
              {tile.value}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {agreement.verifications.length > 0 && (
            <>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Audit via</span>
              <div className="flex gap-1">
                {agreement.verifications.map((v) => <VerifBadge key={v} type={v} />)}
              </div>
            </>
          )}
        </div>
        
        {agreement.status === "pendente" && !agreement.isParticipating && (
          <span className="text-[10px] font-black px-4 py-2 rounded-2xl text-[#0A0F0D] transition-all hover:scale-105"
            style={{ background: "#00D26A", boxShadow: "0 10px 20px rgba(0,210,106,0.2)" }}>
            INITIALIZE →
          </span>
        )}
      </div>

      {agreement.status === "ativo" && agreement.progress > 0 && (
        <div className="mt-5 space-y-2">
          <div className="h-1.5 rounded-full overflow-hidden bg-gray-100/50">
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${agreement.progress * 100}%`, background: "linear-gradient(90deg,#00D26A,#10B981)" }} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{agreement.daysGone}/{agreement.daysTotal} DAYS SYNCED</span>
            {agreement.myRank != null && (
              <div className="flex items-center gap-1.5">
                {isWinning && <Trophy className="w-3 h-3 text-[#00D26A]" />}
                <span className={`text-[10px] font-black uppercase tracking-widest ${isWinning ? "text-[#00D26A]" : "text-gray-400"}`}>
                  {agreement.myRank}º PLACE {isWinning && `· R$${agreement.potentialWin?.toLocaleString("pt-BR")}`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </button>
  )
}

// ── Hero banner ───────────────────────────────────────────────────────────────

const FEATURED_AGREEMENTS = [
  {
    id: "strava-week",
    badge: "Oficial TrueDeal",
    title: "Strava Week",
    subtitle: "5 km/day · Auditado via Strava",
    totalGuarantee: "R$ 5.000",
    entry: "R$ 50",
    players: 98,
    daysLeft: 4,
    progress: 0.72,
    accent: "#00D26A",
    dark: "#0A0F0D",
    Icon: Activity,
  },
  {
    id: "academia",
    badge: "Oficial TrueDeal",
    title: "Academia 30 Dias",
    subtitle: "Check-in diário · Auditado via Wellhub",
    totalGuarantee: "R$ 1.200",
    entry: "R$ 25",
    players: 48,
    daysLeft: 12,
    progress: 0.60,
    accent: "#00A851",
    dark: "#0A0F0D",
    Icon: Activity,
  },
]

function HeroBanner({ onJoin }: { onJoin: () => void }) {
  const [current, setCurrent] = useState(0)
  const agreement = FEATURED_AGREEMENTS[current]

  return (
    <div className="px-5 mb-4 relative">
      <div
        className="relative rounded-3xl overflow-hidden p-6"
        style={{
          background: `linear-gradient(135deg, ${agreement.dark} 0%, ${agreement.dark} 40%, ${agreement.accent} 100%)`,
          boxShadow: `0 12px 40px ${agreement.accent}33`,
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#00D26A] opacity-10 blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="flex items-center gap-2 mb-4">
          <div className="px-2 py-0.5 rounded-md bg-white/10 border border-white/10">
            <span className="text-white/90 text-[10px] font-bold uppercase tracking-widest">Don't trust. Make a True Deal.</span>
          </div>
        </div>

        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-white text-3xl font-black leading-[0.95] tracking-tight">{agreement.title}</h2>
            <p className="text-white/60 text-xs mt-1.5 font-medium">{agreement.subtitle}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.15)" }}>
            <agreement.Icon className="w-6 h-6 text-[#00D26A]" />
          </div>
        </div>

        <div className="h-1 rounded-full overflow-hidden mb-5" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div className="h-full rounded-full" style={{ width: `${agreement.progress * 100}%`, background: "#00D26A", boxShadow: "0 0 10px #00D26A" }} />
        </div>

        <div className="flex items-center gap-5 mb-6">
          {[
            { label: "Garantia",  value: agreement.totalGuarantee },
            { label: "Alocação",  value: agreement.entry },
            { label: "Players",   value: String(agreement.players) },
            { label: "Restam",    value: `${agreement.daysLeft}d` },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider mb-0.5">{s.label}</p>
              <p className="text-white font-black text-sm tracking-tight">{s.value}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onJoin}
          className="w-full py-3.5 rounded-2xl font-black text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          style={{ background: "#00D26A", color: "#0A0F0D", boxShadow: "0 8px 24px rgba(0,210,106,0.3)" }}
        >
          Make a True Deal →
        </button>
      </div>

      {FEATURED_AGREEMENTS.length > 1 && (
        <>
          <button onClick={() => setCurrent((p) => (p - 1 + FEATURED_AGREEMENTS.length) % FEATURED_AGREEMENTS.length)}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)" }}>
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <button onClick={() => setCurrent((p) => (p + 1) % FEATURED_AGREEMENTS.length)}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)" }}>
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex gap-1.5 justify-center mt-3">
            {FEATURED_AGREEMENTS.map((_, idx) => (
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
    { id: 1, icon: "🎉", title: "Bem-vindo ao TrueDeal!", message: "Aderir a um acordo para começar a trackear sua performance",  time: "agora" },
  ]
  return (
    <div className="fixed inset-0 z-30" onClick={onClose}>
      <div className="absolute top-16 right-5 w-80 rounded-3xl p-4"
        style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(40px)", border: "1px solid rgba(255,255,255,0.6)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800">Notificações</h2>
          <button onClose={onClose} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
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
                <p className="text-xs text-[#16A34A] font-semibold mt-0.5">{profile.tdp_points} 🤝</p>
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
  { icon: Wallet,  label: "Carteira", href: "/wallet" },
  { icon: User,    label: "Perfil",   href: "/profile" },
]

const MAIN_TABS = [
  { key: "todos" as const, label: "Todos os Acordos", color: "#00D26A", tint: "rgba(0,210,106,0.02)"  },
  { key: "meus"  as const, label: "Meus Acordos",    color: "#3B82F6", tint: "rgba(59,130,246,0.02)" },
]

const STATUS_FILTERS: { key: AgreementStatusUI; label: string; color: string }[] = [
  { key: "pendente",   label: "Em preparação", color: "#D97706" },
  { key: "ativo",      label: "Em execução",   color: "#16A34A" },
  { key: "finalizado", label: "Liquidado",     color: "#6B7280" },
]

const TYPE_FILTERS: { key: AgreementTypeUI; label: string }[] = [
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

  const agreements: PerformanceAgreement[] = initialDeals.map((d) => toAgreementUI(d, userId))

  const [activeMainTab, setActiveMainTab]   = useState<"todos" | "meus">("todos")
  const [activeType, setActiveType]         = useState<AgreementTypeUI | null>(null)
  const [activeStatus, setActiveStatus]     = useState<AgreementStatusUI | null>(null)
  const [searchQuery, setSearchQuery]       = useState("")
  const [showSearch, setShowSearch]         = useState(false)
  const [activeNav, setActiveNav]           = useState("Home")
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile]            = useState(false)

  const viewingMyAgreements = activeMainTab === "meus"
  const activeTab = MAIN_TABS.find((t) => t.key === activeMainTab)!

  const filteredAgreements = agreements
    .filter((a) => !viewingMyAgreements || a.isParticipating)
    .filter((a) => !activeStatus   || a.status === activeStatus)
    .filter((a) => !activeType     || a.type   === activeType)
    .filter((a) => !searchQuery    || a.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const countByStatus = (s: AgreementStatusUI) =>
    agreements
      .filter((a) => a.status === s)
      .filter((a) => !viewingMyAgreements || a.isParticipating)
      .filter((a) => !activeType || a.type === activeType).length

  const countByType = (t: AgreementTypeUI) =>
    agreements
      .filter((a) => a.type === t)
      .filter((a) => !viewingMyAgreements || a.isParticipating)
      .filter((a) => !activeStatus   || a.status === activeStatus).length

  const myActiveAgreements = agreements.filter((a) => a.isParticipating && a.status === "ativo")
  const footerAtStake      = myActiveAgreements.reduce((s, a) => s + a.guaranteePerPerson, 0)
  const footerPotential    = myActiveAgreements.reduce((s, a) => s + (a.potentialWin ?? 0), 0)

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
            <h1 className="text-2xl font-bold text-gray-800">TrueDeal</h1>
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
                onClick={() => { setActiveMainTab(tab.key); setActiveType(null); setActiveStatus(null); setSearchQuery(""); setShowSearch(false) }}
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
              const isActive = activeType === tf.key
              return (
                <button key={tf.key}
                  onClick={() => setActiveType(isActive ? null : tf.key)}
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
                placeholder="Buscar acordo pelo nome..."
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
          {filteredAgreements.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">🤝</div>
              <p className="text-gray-600 font-semibold">
                {viewingMyAgreements && agreements.filter((a) => a.isParticipating).length === 0
                  ? "Você ainda não aderiu a nenhum acordo"
                  : "Nenhum acordo encontrado"}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {viewingMyAgreements && agreements.filter((a) => a.isParticipating).length === 0
                  ? "Crie um acordo ou explore os públicos"
                  : searchQuery ? `Sem resultados para "${searchQuery}"` : "Crie um novo ou explore os públicos"}
              </p>
              {viewingMyAgreements && agreements.filter((a) => a.isParticipating).length === 0 && (
                <button
                  onClick={() => router.push("/create")}
                  className="mt-4 px-6 py-2.5 rounded-full text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)" }}
                >
                  Criar meu primeiro Acordo
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {filteredAgreements.map((agreement) => (
                <AgreementCard key={agreement.id} agreement={agreement} onClick={() => router.push(`/deal/${agreement.id}`)} />
              ))}

              {viewingMyAgreements && myActiveAgreements.length > 0 && (
                <div className="mt-1 p-4 rounded-2xl"
                  style={{ background: "rgba(59,130,246,0.07)", backdropFilter: "blur(20px)", border: "1.5px solid rgba(59,130,246,0.18)" }}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Resumo financeiro</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-gray-500 mb-0.5">Garantia alocada</p>
                      <p className="text-xl font-bold text-gray-800">R${footerAtStake.toLocaleString("pt-BR")}</p>
                      <p className="text-[10px] text-gray-400">{myActiveAgreements.length} acordo(s) ativo(s)</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 mb-0.5">Potencial de recebimento</p>
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

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 p-6 z-50">
        <nav className="max-w-md mx-auto h-20 rounded-[2.5rem] flex items-center justify-around px-4 relative overflow-hidden shadow-2xl"
          style={{
            background: "rgba(10, 15, 13, 0.9)",
            backdropFilter: "blur(24px) saturate(160%)",
            WebkitBackdropFilter: "blur(24px) saturate(160%)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}>
          {[
            { id: "HOME",    icon: Home,    href: "/" },
            { id: "EXPLORE", icon: Compass, href: "/explore" },
            { id: "INIT",    icon: Plus,    isAction: true },
            { id: "VAULT",   icon: Wallet,  href: "/wallet" },
            { id: "PROFILE", icon: User,    href: "/profile" },
          ].map((item) => {
            const Icon = item.icon
            const isActive = activeNav.toUpperCase() === item.id
            if (item.isAction) {
              return (
                <button key="action" onClick={() => router.push("/create")}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90 relative group"
                  style={{
                    background: "#00D26A",
                    boxShadow: "0 0 30px rgba(0,210,106,0.2)",
                  }}>
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                  <Icon className="w-7 h-7 text-[#0A0F0D] stroke-[3]" />
                </button>
              )
            }
            return (
              <button key={item.id}
                onClick={() => { if (item.href) router.push(item.href) }}
                className="flex flex-col items-center gap-1.5 transition-all active:scale-95 group">
                <Icon className={`w-5 h-5 transition-colors ${isActive ? "text-[#00D26A]" : "text-gray-500 group-hover:text-gray-300"}`}
                  style={{ strokeWidth: isActive ? 2.5 : 2 }} />
                <span className={`text-[8px] font-black tracking-[0.2em] transition-colors ${isActive ? "text-[#00D26A]" : "text-gray-600 group-hover:text-gray-400"}`}>
                  {item.id}
                </span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
