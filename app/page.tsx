"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Bell, Home, Compass, Wallet, User, Plus,
  Users, DollarSign, Clock, Activity, MapPin,
  Camera, TrendingUp, Heart, Trophy, Star,
  Lock, LockOpen, CheckCircle2, ChevronLeft, ChevronRight,
} from "lucide-react"

// ── Tipos ─────────────────────────────────────────────────────────────────────

type VerifType   = "x" | "instagram" | "tiktok" | "strava" | "checkin" | "manual" | "health" | "onchain"
type DealType    = "oficial" | "privado" | "público"
type DealStatus  = "ativo" | "pendente" | "finalizado"

interface Deal {
  id: number
  title: string
  type: DealType
  status: DealStatus
  pot: number
  valuePerPerson: number
  participants: number
  progress: number
  daysGone: number
  daysTotal: number
  verifications: VerifType[]
  myRank?: number
  potentialWin?: number
  color: string
  daysToStart?: number
}

// ── Mock de deals ─────────────────────────────────────────────────────────────

const ALL_DEALS: Deal[] = [
  { id: 1,  title: "Meta Mensal de Passos",      type: "oficial",  status: "ativo",     pot: 1200, valuePerPerson: 25,  participants: 48, progress: 0.60, daysGone: 18, daysTotal: 30, verifications: ["health","strava"], myRank: 3,  potentialWin: 980, color: "#16A34A" },
  { id: 2,  title: "Ranking de Corrida — Abril", type: "oficial",  status: "ativo",     pot: 800,  valuePerPerson: 20,  participants: 40, progress: 0.80, daysGone: 24, daysTotal: 30, verifications: ["strava"],          myRank: 11, potentialWin: 0,   color: "#16A34A" },
  { id: 3,  title: "Desafio Calorias — Maio",    type: "oficial",  status: "pendente",  pot: 0,    valuePerPerson: 30,  participants: 14, progress: 0,    daysGone: 0,  daysTotal: 21, verifications: ["health"],                              color: "#16A34A", daysToStart: 3 },
  { id: 4,  title: "Quem ganha + seguidores",    type: "privado",  status: "ativo",     pot: 150,  valuePerPerson: 75,  participants: 2,  progress: 0.62, daysGone: 18, daysTotal: 30, verifications: ["x"],               myRank: 1,  potentialWin: 145, color: "#3DBF6A" },
  { id: 5,  title: "Academia todo dia",          type: "privado",  status: "ativo",     pot: 500,  valuePerPerson: 100, participants: 5,  progress: 0.35, daysGone: 7,  daysTotal: 21, verifications: ["checkin","strava"], myRank: 2,  potentialWin: 485, color: "#3DBF6A" },
  { id: 6,  title: "Corrida semanal",            type: "privado",  status: "pendente",  pot: 200,  valuePerPerson: 100, participants: 2,  progress: 0,    daysGone: 0,  daysTotal: 14, verifications: ["health"],                              color: "#C09040", daysToStart: 5 },
  { id: 7,  title: "Leitura — 1 livro/mês",     type: "privado",  status: "finalizado",pot: 80,   valuePerPerson: 40,  participants: 2,  progress: 1,    daysGone: 30, daysTotal: 30, verifications: ["manual"],          myRank: 1,  potentialWin: 78,  color: "#9CA3AF" },
  { id: 8,  title: "5k Steps Challenge",         type: "público",  status: "ativo",     pot: 2300, valuePerPerson: 50,  participants: 46, progress: 0.45, daysGone: 9,  daysTotal: 20, verifications: ["health","strava"], myRank: 12, potentialWin: 0,   color: "#8B5CF6" },
  { id: 9,  title: "Desafio TikTok Viral",       type: "público",  status: "pendente",  pot: 0,    valuePerPerson: 30,  participants: 8,  progress: 0,    daysGone: 0,  daysTotal: 7,  verifications: ["tiktok"],                              color: "#8B5CF6", daysToStart: 2 },
  { id: 10, title: "Maratona de Posts — X",      type: "público",  status: "ativo",     pot: 450,  valuePerPerson: 50,  participants: 9,  progress: 0.70, daysGone: 14, daysTotal: 20, verifications: ["x","instagram"],   myRank: 2,  potentialWin: 436, color: "#8B5CF6" },
]

// ── Dot de status animado ─────────────────────────────────────────────────────

function StatusDot({ status }: { status: DealStatus }) {
  const colors: Record<DealStatus, string> = { ativo: "#3DBF6A", pendente: "#F59E0B", finalizado: "#9CA3AF" }
  return (
    <div className="relative flex-shrink-0 w-3 h-3 flex items-center justify-center">
      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[status] }} />
      {status === "ativo" && (
        <div className="absolute w-2.5 h-2.5 rounded-full animate-ping"
          style={{ backgroundColor: colors[status], opacity: 0.45 }} />
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: DealStatus }) {
  const map: Record<DealStatus, { label: string; bg: string; color: string }> = {
    ativo:      { label: "Em Jogo",  bg: "rgba(61,191,106,0.12)",  color: "#16A34A" },
    pendente:   { label: "Formação", bg: "rgba(245,158,11,0.12)",  color: "#D97706" },
    finalizado: { label: "Encerrado",bg: "rgba(156,163,175,0.15)", color: "#6B7280" },
  }
  const { label, bg, color } = map[status]
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: bg, color }}>{label}</span>
  )
}

// ── Badge de verificação ──────────────────────────────────────────────────────

type VerifMeta = { bg: string; label: string; Icon?: React.FC<{ className?: string }>; text?: string }

const VERIF: Record<VerifType, VerifMeta> = {
  x:        { bg: "#000",    label: "X",         text: "𝕏" },
  instagram:{ bg: "#E4405F", label: "Instagram",  text: "IG" },
  tiktok:   { bg: "#010101", label: "TikTok",     text: "TK" },
  strava:   { bg: "#FC4C02", label: "Strava",     Icon: Activity },
  checkin:  { bg: "#3B82F6", label: "Check-in",   Icon: MapPin },
  manual:   { bg: "#8B5CF6", label: "Manual",     Icon: Camera },
  health:   { bg: "#EF4444", label: "Health",     Icon: Heart },
  onchain:  { bg: "#F59E0B", label: "On-chain",   Icon: TrendingUp },
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

// ── Ícone de tipo de deal ─────────────────────────────────────────────────────

function DealTypeIcon({ type }: { type: DealType }) {
  const config: Record<DealType, { Icon: React.FC<{ className?: string; color?: string }>; color: string; title: string }> = {
    oficial:  { Icon: CheckCircle2, color: "#16A34A", title: "Deal Oficial" },
    privado:  { Icon: Lock,         color: "#3DBF6A", title: "Deal Privado" },
    "público":{ Icon: LockOpen,     color: "#8B5CF6", title: "Deal Público" },
  }
  const { Icon, color, title } = config[type]
  return (
    <div title={title} className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: `${color}22` }}>
      <Icon className="w-3 h-3" color={color} />
    </div>
  )
}

// ── Badge de tipo ─────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: DealType }) {
  const map: Record<DealType, { label: string; bg: string; color: string }> = {
    oficial:  { label: "Oficial",  bg: "rgba(22,163,74,0.12)",  color: "#16A34A" },
    privado:  { label: "Privado",  bg: "rgba(61,191,106,0.12)", color: "#3DBF6A" },
    "público":{ label: "Público",  bg: "rgba(139,92,246,0.12)", color: "#8B5CF6" },
  }
  const { label, bg, color } = map[type]
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: bg, color }}>
      {label}
    </span>
  )
}

// ── Card de deal ──────────────────────────────────────────────────────────────

function DealCard({ deal, onClick }: { deal: Deal; onClick: () => void }) {
  const daysLeft = deal.daysTotal - deal.daysGone
  const isWinning = deal.myRank != null && deal.myRank <= Math.ceil(deal.participants * 0.3)

  return (
    <button onClick={onClick}
      className="w-full text-left rounded-2xl p-4 transition-all duration-300 hover:scale-[1.015] active:scale-[0.98]"
      style={{
        background: "rgba(255,255,255,0.42)",
        backdropFilter: "blur(30px) saturate(200%)",
        border: "1px solid rgba(255,255,255,0.55)",
        borderLeft: `3px solid ${deal.color}`,
        boxShadow: "0 4px 20px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.6)",
      }}>

      {/* Linha 1: status + tipo */}
      <div className="flex items-center gap-2 mb-2">
        <StatusDot status={deal.status} />
        <StatusBadge status={deal.status} />
        <DealTypeIcon type={deal.type} />
        <TypeBadge type={deal.type} />
      </div>

      {/* Linha 2: título */}
      <h3 className="text-gray-800 font-bold text-base leading-snug mb-3">{deal.title}</h3>

      {/* Linha 3: ícones de info */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-3">
        <div className="flex items-center gap-1">
          {deal.verifications.map((v) => <VerifBadge key={v} type={v} />)}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <DollarSign className="w-3 h-3 text-gray-400" />
          <span className="font-semibold">R${deal.valuePerPerson}</span>
          <span className="text-gray-400">/pessoa</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Users className="w-3 h-3 text-gray-400" />
          <span className="font-semibold">{deal.participants}</span>
        </div>
        {deal.status !== "pendente" && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="font-semibold">{deal.status === "ativo" ? `${daysLeft}d restantes` : `${deal.daysTotal}d`}</span>
          </div>
        )}
        {deal.pot > 0 && (
          <div className="flex items-center gap-1 text-xs font-bold" style={{ color: deal.color }}>
            <span>R${deal.pot.toLocaleString("pt-BR")}</span>
            <span className="font-normal text-gray-400">pot</span>
          </div>
        )}
      </div>

      {/* Progresso + ranking */}
      {deal.status === "ativo" && deal.progress > 0 && (
        <div className="space-y-1.5">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.08)" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${deal.progress * 100}%`, backgroundColor: deal.color }} />
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
              Inicia em {deal.daysToStart ?? 0}d
            </span>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full text-white"
            style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)" }}>
            Entrar →
          </span>
        </div>
      )}
    </button>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { icon: Home,    label: "Home",    href: "/" },
  { icon: Compass, label: "Explorar", href: "/explore" },
  { icon: Wallet,  label: "Wallet",   href: "/wallet" },
  { icon: User,    label: "Perfil",   href: "/profile" },
]

// ── Hero banner — deal oficial em destaque ───────────────────────────────────

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
    accent: "#FC4C02",   // Strava orange
    dark: "#7A2500",
    Icon: Activity,
  },
  {
    id: "health-challenge",
    badge: "Oficial True Deal",
    title: "Meta Mensal de Passos",
    subtitle: "10k steps/day · Verificado via Health",
    pot: "R$ 1.200",
    entry: "R$ 25",
    players: 48,
    daysLeft: 12,
    progress: 0.60,
    accent: "#EF4444",   // Red
    dark: "#7F1D1D",
    Icon: Heart,
  },
]

function HeroBanner({ onJoin }: { onJoin: () => void }) {
  const [currentBanner, setCurrentBanner] = useState(0)
  const deal = FEATURED_DEALS[currentBanner]

  const handlePrev = () => {
    setCurrentBanner((prev) => (prev - 1 + FEATURED_DEALS.length) % FEATURED_DEALS.length)
  }

  const handleNext = () => {
    setCurrentBanner((prev) => (prev + 1) % FEATURED_DEALS.length)
  }

  return (
    <div className="px-5 mb-4 relative">
      <div
        className="relative rounded-3xl overflow-hidden p-5"
        style={{
          background: `linear-gradient(135deg, ${deal.dark} 0%, ${deal.accent} 60%, #FF8A50 100%)`,
          boxShadow: `0 12px 40px ${deal.accent}55`,
        }}
      >
        {/* Badge */}
        <div className="flex items-center gap-1.5 mb-3">
          <Star className="w-3 h-3 text-white/80" fill="currentColor" />
          <span className="text-white/80 text-[10px] font-bold uppercase tracking-widest">
            {deal.badge}
          </span>
        </div>

        {/* Título + ícone */}
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

        {/* Barra de progresso */}
        <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.2)" }}>
          <div className="h-full rounded-full" style={{ width: `${deal.progress * 100}%`, background: "rgba(255,255,255,0.9)" }} />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4">
          <div>
            <p className="text-white/60 text-[10px]">Pot total</p>
            <p className="text-white font-bold text-base">{deal.pot}</p>
          </div>
          <div>
            <p className="text-white/60 text-[10px]">Entrada</p>
            <p className="text-white font-bold text-base">{deal.entry}</p>
          </div>
          <div>
            <p className="text-white/60 text-[10px]">Players</p>
            <p className="text-white font-bold text-base">{deal.players}</p>
          </div>
          <div>
            <p className="text-white/60 text-[10px]">Restam</p>
            <p className="text-white font-bold text-base">{deal.daysLeft}d</p>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onJoin}
          className="w-full py-3 rounded-2xl font-bold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: "rgba(255,255,255,0.95)",
            color: deal.accent,
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          }}
        >
          Participar →
        </button>
      </div>

      {/* Navigation arrows */}
      {FEATURED_DEALS.length > 1 && (
        <>
          <button onClick={handlePrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)" }}>
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <button onClick={handleNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)" }}>
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
        </>
      )}

      {/* Carousel indicators */}
      {FEATURED_DEALS.length > 1 && (
        <div className="flex gap-1.5 justify-center mt-3">
          {FEATURED_DEALS.map((_, idx) => (
            <button key={idx}
              onClick={() => setCurrentBanner(idx)}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                background: idx === currentBanner ? "rgba(22,163,74,0.8)" : "rgba(0,0,0,0.2)",
                width: idx === currentBanner ? "24px" : "8px",
              }} />
          ))}
        </div>
      )}
    </div>
  )
}

const MAIN_TABS: { key: "todos" | "meus"; label: string; color: string }[] = [
  { key: "todos", label: "Todos os Deals",  color: "#16A34A" },
  { key: "meus",  label: "Meus Deals",      color: "#3DBF6A" },
]

const DEAL_TYPE_FILTERS: { key: DealType; label: string }[] = [
  { key: "oficial",  label: "Oficiais" },
  { key: "privado",  label: "Privados" },
  { key: "público",  label: "Públicos" },
]

const STATUS_FILTERS: { key: DealStatus; label: string }[] = [
  { key: "ativo",      label: "Ativos" },
  { key: "pendente",   label: "Formação" },
  { key: "finalizado", label: "Histórico" },
]

// ── Notification Popover ─────────────────────────────────────────────────────

function NotificationPopover({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const notifications = [
    { id: 1, type: "join", title: "Novo participante!", message: "João entrou em 'Meta Mensal de Passos'", time: "5m atrás", icon: "🎉" },
    { id: 2, type: "status", title: "Deal finalizado!", message: "'Ranking de Corrida' teve seu resultado confirmado", time: "2h atrás", icon: "✅" },
    { id: 3, type: "join", title: "2 novos participantes", message: "em 'Academia todo dia'", time: "6h atrás", icon: "👥" },
    { id: 4, type: "update", title: "Seu ranking subiu!", message: "Você agora é 2º em 'Desafio Calorias'", time: "1d atrás", icon: "📈" },
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-30" onClick={onClose}>
      <div className="absolute top-16 right-5 w-80 rounded-3xl p-4"
        style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(40px)", border: "1px solid rgba(255,255,255,0.6)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800">Notificações</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">Sem notificações</p>
          ) : (
            notifications.map((notif) => (
              <button key={notif.id} className="w-full text-left p-2.5 rounded-2xl transition-all hover:bg-gray-100 active:bg-gray-200">
                <div className="flex gap-3">
                  <span className="text-xl flex-shrink-0">{notif.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{notif.title}</p>
                    <p className="text-gray-500 text-xs truncate">{notif.message}</p>
                    <p className="text-gray-400 text-xs mt-1">{notif.time}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Profile Popover ──────────────────────────────────────────────────────────

function ProfilePopover({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeProfileTab, setActiveProfileTab] = useState<"settings" | "theme" | "briefing" | "support" | "referral">("settings")

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-30" onClick={onClose}>
      <div className="absolute top-16 right-5 w-80 rounded-3xl p-5"
        style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(40px)", border: "1px solid rgba(255,255,255,0.6)" }}
        onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#1A2E3A,#2A4E5A)" }}>
              <span className="text-blue-300 font-semibold text-sm">LR</span>
            </div>
            <div>
              <p className="font-bold text-gray-800">Lukas Rocha</p>
              <p className="text-xs text-gray-500">@lkr0102</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 pb-3 border-b border-gray-200">
          {[
            { key: "settings" as const, label: "⚙️" },
            { key: "theme" as const, label: "🌙" },
            { key: "briefing" as const, label: "📊" },
            { key: "support" as const, label: "❓" },
            { key: "referral" as const, label: "👥" },
          ].map((tab) => (
            <button key={tab.key}
              onClick={() => setActiveProfileTab(tab.key)}
              className="px-3 py-1.5 rounded-full text-sm transition-all"
              style={{
                background: activeProfileTab === tab.key ? "rgba(22,163,74,0.15)" : "transparent",
                border: activeProfileTab === tab.key ? "1px solid rgba(22,163,74,0.3)" : "none",
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-3">
          {activeProfileTab === "settings" && (
            <>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition-all text-sm">Editar perfil</button>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition-all text-sm">Privacidade e segurança</button>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition-all text-sm">Notificações</button>
            </>
          )}
          {activeProfileTab === "theme" && (
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-300 text-sm">☀️ <span>Modo claro</span></button>
              <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-100 text-sm">🌙 <span>Modo escuro</span></button>
            </div>
          )}
          {activeProfileTab === "briefing" && (
            <p className="text-sm text-gray-600">Resumo financeiro de todos os seus deals</p>
          )}
          {activeProfileTab === "support" && (
            <>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition-all text-sm">Ajuda e suporte</button>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition-all text-sm">Reportar um problema</button>
            </>
          )}
          {activeProfileTab === "referral" && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm">
              <p className="font-semibold text-gray-800 mb-2">Indique amigos</p>
              <p className="text-gray-600 text-xs mb-3">Ganhe R$50 para cada amigo que se cadastre</p>
              <button className="w-full py-2 rounded-lg bg-blue-500 text-white text-xs font-semibold">Copiar código</button>
            </div>
          )}
        </div>

        {/* Logout */}
        <button className="w-full mt-4 px-3 py-2 rounded-lg hover:bg-red-50 transition-all text-sm text-red-600 font-medium">
          Sair
        </button>
      </div>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()

  const [activeMainTab, setActiveMainTab]   = useState<"todos" | "meus">("todos")
  const [activeDealType, setActiveDealType] = useState<DealType | null>(null)
  const [activeStatus, setActiveStatus]     = useState<DealStatus>("ativo")
  const [activeNav, setActiveNav]           = useState("Home")
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile]            = useState(false)

  // Determine if viewing all or my deals
  const viewingMyDeals = activeMainTab === "meus"
  
  // Filter deals based on active tab
  let filteredDeals = ALL_DEALS
    .filter((d) => d.status === activeStatus)
    .filter((d) => {
      // If viewing "Meus Deals", only show deals where user is participating
      if (viewingMyDeals) return d.myRank !== undefined
      return true
    })
    .filter((d) => {
      // If a type filter is selected, apply it
      if (activeDealType) return d.type === activeDealType
      return true
    })

  const countByStatus = (status: DealStatus) => {
    let count = ALL_DEALS.filter((d) => d.status === status)
    if (viewingMyDeals) count = count.filter((d) => d.myRank !== undefined)
    if (activeDealType) count = count.filter((d) => d.type === activeDealType)
    return count.length
  }

  const activeUserDeals = filteredDeals.filter((d) => d.myRank !== undefined)
  const footerAtStake   = activeUserDeals.reduce((s, d) => s + d.valuePerPerson, 0)
  const footerPotential = activeUserDeals.reduce((s, d) => s + (d.potentialWin ?? 0), 0)

  // Stats globais (todos os tipos)
  const allActive    = ALL_DEALS.filter((d) => d.status === "ativo" && d.myRank !== undefined)
  const totalAtStake = allActive.reduce((s, d) => s + d.valuePerPerson, 0)
  const totalPotential = allActive.reduce((s, d) => s + (d.potentialWin ?? 0), 0)

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
            <p className="text-gray-500 text-sm">Olá, Lukas 👋</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowNotifications(!showNotifications)}
              className="relative w-10 h-10 rounded-xl flex items-center justify-center hover:scale-105 transition-all"
              style={{ background: "rgba(255,255,255,0.4)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.5)" }}>
              <Bell className="w-5 h-5 text-gray-700" />
              <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <button onClick={() => setShowProfile(!showProfile)}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:scale-105 transition-all"
              style={{ background: "linear-gradient(135deg,#1A2E3A,#2A4E5A)" }}>
              <span className="text-blue-300 font-semibold text-sm">LR</span>
            </button>
          </div>
        </div>
      </header>

      {/* Popovers */}
      <NotificationPopover isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
      <ProfilePopover isOpen={showProfile} onClose={() => setShowProfile(false)} />

      {/* Hero banner */}
      <HeroBanner onJoin={() => router.push("/create")} />

      {/* Stats rápidos */}
      <div className="px-5 mb-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Deals ativos", value: allActive.length.toString(),   color: "#3DBF6A" },
            { label: "Em jogo",      value: `R$${totalAtStake}`,           color: "#16A34A" },
            { label: "Potencial",    value: `R$${totalPotential}`,         color: "#F59E0B" },
          ].map((s) => (
            <div key={s.label} className="p-3 rounded-2xl text-center"
              style={{ background: "rgba(255,255,255,0.4)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.5)" }}>
              <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Abas principais: Todos vs Meus */}
      <div className="px-5 mb-4">
        <div className="flex gap-2 p-1.5 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.35)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.5)" }}>
          {MAIN_TABS.map((tab) => {
            const isActive = activeMainTab === tab.key
            return (
              <button key={tab.key}
                onClick={() => { setActiveMainTab(tab.key); setActiveDealType(null) }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300"
                style={{
                  background: isActive ? `linear-gradient(135deg,${tab.color},${tab.color}dd)` : "transparent",
                  color: isActive ? "white" : "#6B7280",
                  boxShadow: isActive ? `0 4px 12px ${tab.color}44` : "none",
                }}>
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Filtros por tipo de deal */}
      <div className="px-5 mb-4">
        <div className="flex gap-1.5 overflow-x-auto pb-2">
          <button 
            onClick={() => setActiveDealType(null)}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap"
            style={{
              background: !activeDealType ? "rgba(22,163,74,0.15)" : "rgba(255,255,255,0.4)",
              backdropFilter: "blur(20px)",
              border: !activeDealType ? "1.5px solid rgba(22,163,74,0.4)" : "1px solid rgba(255,255,255,0.5)",
              color: !activeDealType ? "#16A34A" : "#6B7280",
            }}>
            Todos os tipos
          </button>
          {DEAL_TYPE_FILTERS.map((dType) => (
            <button key={dType.key}
              onClick={() => setActiveDealType(dType.key)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap"
              style={{
                background: activeDealType === dType.key ? "rgba(22,163,74,0.15)" : "rgba(255,255,255,0.4)",
                backdropFilter: "blur(20px)",
                border: activeDealType === dType.key ? "1.5px solid rgba(22,163,74,0.4)" : "1px solid rgba(255,255,255,0.5)",
                color: activeDealType === dType.key ? "#16A34A" : "#6B7280",
              }}>
              {dType.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-filtro de status */}
      <div className="px-5 mb-4">
        <div className="flex gap-2">
          {STATUS_FILTERS.map((sf) => {
            const count    = countByStatus(sf.key)
            const isActive = activeStatus === sf.key
            return (
              <button key={sf.key}
                onClick={() => setActiveStatus(sf.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                style={{
                  background: isActive ? "rgba(22,163,74,0.15)" : "rgba(255,255,255,0.4)",
                  backdropFilter: "blur(20px)",
                  border: isActive ? "1.5px solid rgba(22,163,74,0.4)" : "1px solid rgba(255,255,255,0.5)",
                  color: isActive ? "#16A34A" : "#6B7280",
                }}>
                {sf.label}
                {count > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: isActive ? "rgba(22,163,74,0.2)" : "rgba(0,0,0,0.07)" }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 px-5 overflow-y-auto">
        {filteredDeals.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🏆</div>
            <p className="text-gray-600 font-semibold">Nenhum deal aqui ainda</p>
            <p className="text-gray-400 text-sm mt-1">Crie um novo ou explore os públicos</p>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {filteredDeals.map((deal) => (
              <DealCard key={deal.id} deal={deal} onClick={() => router.push("/tracking")} />
            ))}

            {/* Footer de totais */}
            {activeUserDeals.length > 0 && (
              <div className="mt-1 p-4 rounded-2xl"
                style={{ background: "rgba(22,163,74,0.07)", backdropFilter: "blur(20px)", border: "1.5px solid rgba(22,163,74,0.18)" }}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Resumo financeiro</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-gray-500 mb-0.5">Total em jogo</p>
                    <p className="text-xl font-bold text-gray-800">R${footerAtStake.toLocaleString("pt-BR")}</p>
                    <p className="text-[10px] text-gray-400">{activeUserDeals.length} deal(s) ativo(s)</p>
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
            const Icon     = item.icon
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
