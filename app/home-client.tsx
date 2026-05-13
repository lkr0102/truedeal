"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Bell, Home, Compass, Wallet, User, Plus,
  Clock, Activity,
  Trophy, Star,
  ChevronLeft, ChevronRight,
  PieChart, Award, Search,
  Globe, Moon,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { DealWithParticipants, Profile } from "@/lib/supabase/types"
import { useLanguageStore, t } from "@/lib/i18n"

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
  startDateISO?: string
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
    startDateISO:  d.start_date,
  }
}

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<DealStatusUI, { border: string; bg: string; badgeBg: string; badgeColor: string; badgeLabel: string }> = {
  ativo:      { border: "#16A34A", bg: "rgba(22,163,74,0.05)",    badgeBg: "rgba(22,163,74,0.12)",    badgeColor: "#16A34A", badgeLabel: "status_active" },
  pendente:   { border: "#F59E0B", bg: "rgba(245,158,11,0.05)",   badgeBg: "rgba(245,158,11,0.12)",   badgeColor: "#D97706", badgeLabel: "status_pending" },
  finalizado: { border: "#9CA3AF", bg: "rgba(156,163,175,0.06)",  badgeBg: "rgba(156,163,175,0.14)",  badgeColor: "#6B7280", badgeLabel: "status_finalized" },
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

function StatusBadge({ status, lang }: { status: DealStatusUI; lang: Language }) {
  const { badgeBg, badgeColor, badgeLabel } = STATUS_STYLE[status]
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: badgeBg, color: badgeColor }}>{t(badgeLabel as any, lang)}</span>
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

function PrizeBadge({ type, lang }: { type: PrizeType; lang: Language }) {
  const { label, bg, color, Icon } = PRIZE_CONFIG[type]
  const localizedLabel = type === "primeiro" ? (lang === "pt" ? "1º Lugar" : "1st Place") : label
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: bg }}>
      <Icon className="w-3 h-3 flex-shrink-0" color={color} />
      <span className="text-[10px] font-bold" style={{ color }}>{localizedLabel}</span>
    </div>
  )
}

function TypeBadge({ type, lang }: { type: DealTypeUI; lang: Language }) {
  const label = type === "oficial" ? (lang === "pt" ? "Oficial" : "Official") : t(type === "privado" ? "priv_private" : "priv_public", lang)
  return (
    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: "rgba(0,0,0,0.05)", color: "#9CA3AF" }}>
      {label}
    </span>
  )
}

// ── Deal Card ─────────────────────────────────────────────────────────────────

function getStartTarget(iso: string): Date {
  return new Date(`${iso}T03:00:00Z`)  // 00h GMT-3 = 03h UTC
}

function formatCountdown(ms: number, lang: Language): { label: string; urgency: "normal" | "warning" | "critical" } {
  if (ms <= 0) return { label: lang === "pt" ? "Iniciando..." : "Starting...", urgency: "critical" }
  const s   = Math.floor(ms / 1000)
  const d   = Math.floor(s / 86400)
  const h   = Math.floor((s % 86400) / 3600)
  const m   = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const p   = (n: number) => String(n).padStart(2, "0")
  if (d > 0) return { label: `${d}d ${p(h)}${lang === "pt" ? "h" : "h"}`, urgency: "normal" }
  if (h > 0) return { label: `${h}h ${p(m)}${lang === "pt" ? "m" : "m"}`, urgency: "warning" }
  return { label: `${p(m)}m ${p(sec)}s`, urgency: "critical" }
}

function DealCard({ deal, onClick, lang }: { deal: Deal; onClick: () => void; lang: Language }) {
  const daysLeft = deal.daysTotal - deal.daysGone
  const isWinning = deal.myRank != null && deal.myRank <= Math.ceil(deal.participants * 0.3)
  const ss = STATUS_STYLE[deal.status]

  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    if (deal.status !== "pendente" || !deal.startDateISO) return
    const id = setInterval(() => setNowMs(Date.now()), 10_000)
    return () => clearInterval(id)
  }, [deal.status, deal.startDateISO])

  const countdown = deal.status === "pendente" && deal.startDateISO
    ? formatCountdown(getStartTarget(deal.startDateISO).getTime() - nowMs, lang)
    : null

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
        <StatusBadge status={deal.status} lang={lang} />
        <PrizeBadge type={deal.prizeType} lang={lang} />
        <TypeBadge type={deal.type} lang={lang} />
      </div>

      <h3 className="text-gray-800 font-bold text-base leading-snug mb-3">{deal.title}</h3>

      <div className="grid grid-cols-2 gap-1.5 mb-2.5">
        {[
          { label: t("create_entry_fee", lang),       value: `R$${deal.valuePerPerson}/${lang === "pt" ? "pessoa" : "person"}` },
          { label: t("dash_total_pot", lang),     value: deal.pot > 0 ? `R$${deal.pot.toLocaleString(lang === "pt" ? "pt-BR" : "en-US")}` : "—", green: true },
          { label: lang === "pt" ? "Participantes" : "Participants", value: `${deal.participants} players` },
          {
            label: deal.status === "pendente" ? (lang === "pt" ? "Inicia em" : "Starts in") : deal.status === "ativo" ? (lang === "pt" ? "Tempo restante" : "Time left") : (lang === "pt" ? "Duração" : "Duration"),
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
          <span style={{ fontSize: 10, color: "#9CA3AF" }}>{lang === "pt" ? "Verificado via" : "Verified via"}</span>
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
            <span className="text-[10px] text-gray-400">{deal.daysGone}/{deal.daysTotal} {lang === "pt" ? "dias" : "days"}</span>
            {deal.myRank != null && (
              <div className="flex items-center gap-1">
                {isWinning && <Trophy className="w-3 h-3 text-yellow-500" />}
                <span className={`text-[10px] font-bold ${isWinning ? "text-green-600" : "text-gray-400"}`}>
                  {deal.myRank}º{isWinning ? ` · R$${deal.potentialWin?.toLocaleString(lang === "pt" ? "pt-BR" : "en-US")}` : (lang === "pt" ? " lugar" : " place")}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {deal.status === "pendente" && (
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock
                className={`w-3.5 h-3.5 ${countdown?.urgency === "critical" ? "animate-pulse" : ""}`}
                style={{ color: countdown?.urgency === "critical" ? "#EF4444" : "#D97706" }}
              />
              <span
                className="text-[11px] font-bold"
                style={{ color: countdown?.urgency === "critical" ? "#DC2626" : "#D97706" }}
              >
                {countdown
                  ? `${lang === "pt" ? "Inicia em" : "Starts in"} ${countdown.label}`
                  : (deal.daysToStart === 0 ? (lang === "pt" ? "Inicia hoje" : "Starts today") : `${lang === "pt" ? "Inicia em" : "Starts in"} ${deal.daysToStart}d`)}
              </span>
            </div>
            {!deal.isParticipating && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full text-white"
                style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)" }}>
                {t("action_join", lang)} →
              </span>
            )}
          </div>
          <p className="text-[9px] font-medium" style={{ color: "#9CA3AF" }}>
            ⏰ 00h · {lang === "pt" ? "Horário de Brasília (GMT-3)" : "Brasília Time (GMT-3)"}
          </p>
        </div>
      )}

      {deal.status === "finalizado" && (
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-[11px] text-gray-500">{lang === "pt" ? "Deal encerrado" : "Deal closed"} · {deal.daysTotal}d</span>
          {deal.myRank === 1 && <span className="text-[11px] font-bold text-amber-600">🏆 {lang === "pt" ? "Vencedor" : "Winner"}</span>}
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
    badgeEn: "Official True Deal",
    title: "Strava Week",
    titleEn: "Strava Week",
    desc: "5 km/dia · Verificado via Strava",
    descEn: "5 km/day · Verified via Strava",
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
    badgeEn: "Official True Deal",
    title: "Academia 30 Dias",
    titleEn: "30-Day Gym",
    desc: "Check-in diário · Verificado via Wellhub",
    descEn: "Daily check-in · Verified via Wellhub",
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
  const { language } = useLanguageStore()
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
            <p className="text-white font-bold text-lg leading-tight mb-2">
              {language === "pt" ? deal.title : deal.titleEn}
            </p>
            <p className="text-white/80 text-xs line-clamp-2">
              {language === "pt" ? deal.desc : deal.descEn}
            </p>
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
            { label: t("dash_total_pot", lang), value: deal.pot },
            { label: t("create_entry_fee", lang),   value: deal.entry },
            { label: lang === "pt" ? "Players" : "Players",   value: String(deal.players) },
            { label: lang === "pt" ? "Restam" : "Left",    value: `${deal.daysLeft}d` },
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
          {t("action_join", lang)} →
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
  const { language } = useLanguageStore()
  if (!isOpen) return null
  const notifications = [
    { 
      id: 1, 
      icon: "🎉", 
      title: language === "pt" ? "Bem-vindo ao True Deal!" : "Welcome to True Deal!", 
      message: language === "pt" ? "Crie ou entre em um deal para começar" : "Create or join a deal to get started",  
      time: language === "pt" ? "agora" : "now" 
    },
  ]
  return (
    <div className="fixed inset-0 z-30" onClick={onClose}>
      <div className="absolute top-16 right-5 w-80 rounded-3xl p-4"
        style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(40px)", border: "1px solid rgba(255,255,255,0.6)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800">{language === "pt" ? "Notificações" : "Notifications"}</h2>
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
  isOpen, onClose, profile, userId,
}: { isOpen: boolean; onClose: () => void; profile: Profile | null; userId: string | null }) {
  const router = useRouter()
  const { language, setLanguage } = useLanguageStore()
  const [darkMode, setDarkMode]  = useState(false)
  const [copied,   setCopied]    = useState(false)

  useEffect(() => {
    const savedDark = localStorage.getItem("td-dark-mode") === "true"
    setDarkMode(savedDark)
  }, [])

  function toggleDarkMode() {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem("td-dark-mode", String(next))
    document.documentElement.classList.toggle("dark", next)
  }

  function toggleLanguage() {
    setLanguage(language === "pt" ? "en" : "pt")
  }

  function handleCopyReferral() {
    if (!userId) return
    const url = `${window.location.origin}/invite/${userId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    document.cookie = "truedeal-demo-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    router.push("/login")
  }

  if (!isOpen) return null

  const displayName = profile?.display_name ?? (language === "pt" ? "Usuário" : "User")
  const initials    = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"
  const username    = profile?.username ? `@${profile.username}` : ""
  const shakes      = profile?.tdp_points ?? 0

  return (
    <div className="fixed inset-0 z-30" onClick={onClose}>
      <div
        className="absolute top-16 right-5 w-72 rounded-3xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(40px)",
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-3"
          style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#1A2E3A,#2A4E5A)" }}>
            <span className="text-blue-300 font-semibold text-sm">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800 text-sm truncate">{displayName}</p>
            {username && <p className="text-xs text-gray-400 truncate">{username}</p>}
            <p className="text-xs text-[#16A34A] font-bold mt-0.5">{shakes} 🤝</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(0,0,0,0.06)" }}>
            <span className="text-gray-400 text-base leading-none">×</span>
          </button>
        </div>

        {/* Menu items */}
        <div className="py-2">

          {/* Profile */}
          <button
            onClick={() => { onClose(); router.push("/profile") }}
            className="w-full flex items-center gap-3 px-5 py-3 transition-colors"
            style={{ background: "transparent" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(22,163,74,0.1)" }}>
              <User className="w-4 h-4 text-[#16A34A]" />
            </div>
            <span className="flex-1 text-sm font-semibold text-gray-800 text-left">{t("nav_profile", language)}</span>
          </button>

          {/* Invite & Earn */}
          <button
            onClick={handleCopyReferral}
            className="w-full flex items-center gap-3 px-5 py-3 transition-colors"
            style={{ background: "transparent" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(168,85,247,0.1)" }}>
              <span className="text-base">🎁</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-gray-800">{language === "pt" ? "Convide e ganhe Shakes" : "Invite & Earn Shakes"}</p>
              {copied
                ? <p className="text-[10px] text-[#16A34A] font-bold">{language === "pt" ? "Link copiado! ✓" : "Link copied! ✓"}</p>
                : <p className="text-[10px] text-gray-400">{language === "pt" ? "Compartilhe seu link de referral" : "Share your referral link"}</p>
              }
            </div>
          </button>

          <div className="mx-5 my-1" style={{ height: 1, background: "rgba(0,0,0,0.05)" }} />

          {/* Language */}
          <button
            onClick={toggleLanguage}
            className="w-full flex items-center gap-3 px-5 py-3 transition-colors"
            style={{ background: "transparent" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(59,130,246,0.1)" }}>
              <Globe className="w-4 h-4 text-blue-500" />
            </div>
            <span className="flex-1 text-sm font-semibold text-gray-800 text-left">{language === "pt" ? "Idioma" : "Language"}</span>
            <div className="flex items-center rounded-lg overflow-hidden flex-shrink-0"
              style={{ background: "rgba(0,0,0,0.06)" }}>
              {(["pt", "en"] as const).map((lang) => (
                <span key={lang}
                  className="text-[11px] font-bold px-2 py-1 transition-all"
                  style={{
                    background: language === lang ? "#16A34A" : "transparent",
                    color:      language === lang ? "white"   : "#9CA3AF",
                  }}>
                  {lang === "pt" ? "PT" : "EN"}
                </span>
              ))}
            </div>
          </button>

          {/* Dark Mode */}
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center gap-3 px-5 py-3 transition-colors"
            style={{ background: "transparent" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(107,114,128,0.1)" }}>
              <Moon className="w-4 h-4 text-gray-500" />
            </div>
            <span className="flex-1 text-sm font-semibold text-gray-800 text-left">Dark Mode</span>
            <div
              className="relative w-11 h-6 rounded-full flex-shrink-0 transition-colors duration-200"
              style={{ background: darkMode ? "#16A34A" : "rgba(0,0,0,0.15)" }}
            >
              <div
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                style={{ transform: darkMode ? "translateX(22px)" : "translateX(2px)" }}
              />
            </div>
          </button>
        </div>

        {/* Sign out */}
        <div className="px-5 pb-4 pt-2" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <button
            onClick={handleSignOut}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ color: "#EF4444", background: "transparent" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.06)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            {t("nav_logout", language)}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Nav ───────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { icon: Home,    label: "nav_home",    href: "/" },
  { icon: Compass, label: "nav_explore", href: "/explore" },
  { icon: Wallet,  label: "nav_wallet",   href: "/wallet" },
  { icon: User,    label: "nav_profile",   href: "/profile" },
]

const MAIN_TABS = [
  { key: "todos" as const, label: "dash_all_deals", color: "#16A34A", tint: "rgba(22,163,74,0.06)"  },
  { key: "meus"  as const, label: "dash_my_deals",     color: "#3B82F6", tint: "rgba(59,130,246,0.06)" },
]

const STATUS_FILTERS: { key: DealStatusUI; label: string; color: string }[] = [
  { key: "pendente",   label: "status_preparing", color: "#D97706" },
  { key: "ativo",      label: "status_active",     color: "#16A34A" },
  { key: "finalizado", label: "status_closed",      color: "#6B7280" },
]

const TYPE_FILTERS: { key: DealTypeUI; label: string }[] = [
  { key: "oficial", label: "Oficial" },
  { key: "privado", label: "priv_private" },
  { key: "público", label: "priv_public" },
]

// ── Home Client ───────────────────────────────────────────────────────────────

interface HomeClientProps {
  initialDeals: DealWithParticipants[]
  profile: Profile | null
  userId: string | null
}

export default function HomeClient({ initialDeals, profile, userId }: HomeClientProps) {
  const router = useRouter()
  const { language } = useLanguageStore()

  const deals: Deal[] = initialDeals.map((d) => toDealUI(d, userId))

  const [activeMainTab, setActiveMainTab]   = useState<"todos" | "meus">("todos")
  const [activeDealType, setActiveDealType] = useState<DealTypeUI | null>(null)
  const [activeStatus, setActiveStatus]     = useState<DealStatusUI | null>(null)
  const [searchQuery, setSearchQuery]       = useState("")
  const [showSearch, setShowSearch]         = useState(false)
  const [activeNav, setActiveNav]           = useState(t("nav_home", language))
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
            <p className="text-gray-500 text-sm">{t("dash_welcome", language)} {firstName} 👋</p>
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
      <ProfilePopover isOpen={showProfile} onClose={() => setShowProfile(false)} profile={profile} userId={userId} />

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
                {t(tab.label as any, language)}
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
                  {t(tf.label as any, language)}
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
                  {t(sf.label as any, language)}
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
                placeholder={t("dash_search_placeholder", language)}
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
                  ? (language === "pt" ? "Você ainda não entrou em nenhum deal" : "You haven't joined any deals yet")
                  : t("dash_no_deals", language)}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {viewingMyDeals && deals.filter((d) => d.isParticipating).length === 0
                  ? (language === "pt" ? "Crie um deal ou entre em um existente" : "Create a deal or join an existing one")
                  : searchQuery ? `${language === "pt" ? "Sem resultados para" : "No results for"} "${searchQuery}"` : (language === "pt" ? "Crie um novo ou explore os públicos" : "Create a new one or explore public ones")}
              </p>
              {viewingMyDeals && deals.filter((d) => d.isParticipating).length === 0 && (
                <button
                  onClick={() => router.push("/create")}
                  className="mt-4 px-6 py-2.5 rounded-full text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)" }}
                >
                  {t("dash_create_first", language)}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {filteredDeals.map((deal) => (
                <DealCard key={deal.id} deal={deal} onClick={() => router.push(`/deal/${deal.id}`)} lang={language} />
              ))}

              {viewingMyDeals && myActiveDeals.length > 0 && (
                <div className="mt-1 p-4 rounded-2xl"
                  style={{ background: "rgba(59,130,246,0.07)", backdropFilter: "blur(20px)", border: "1.5px solid rgba(59,130,246,0.18)" }}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">{t("dash_financial_summary", language)}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-gray-500 mb-0.5">{t("dash_total_at_stake", language)}</p>
                      <p className="text-xl font-bold text-gray-800">R${footerAtStake.toLocaleString(language === "pt" ? "pt-BR" : "en-US")}</p>
                      <p className="text-[10px] text-gray-400">{myActiveDeals.length} deal(s) {t("status_active", language).toLowerCase()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 mb-0.5">{t("dash_potential_win", language)}</p>
                      <p className="text-xl font-bold" style={{ color: footerPotential > 0 ? "#3DBF6A" : "#9CA3AF" }}>
                        R${footerPotential.toLocaleString(language === "pt" ? "pt-BR" : "en-US")}
                      </p>
                      <p className="text-[10px] text-gray-400">{t("dash_in_current_pos", language)}</p>
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
        <span className="text-white font-semibold">{t("dash_new_deal", language)}</span>
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
                  {t(item.label as any, language)}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
