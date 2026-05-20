"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Bell, Home, Compass, Wallet, User, Plus,
  Clock, Activity, PieChart, Trophy, Award,
  Search, Globe, Moon,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { DealWithParticipants, Profile } from "@/lib/supabase/types"
import { useLanguageStore, t, type Language } from "@/lib/i18n"

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:           "#F0F3F0",
  surface:      "#FFFFFF",
  surface2:     "#E8EDE8",
  surface3:     "#DFE6DF",
  border:       "#D8E0D8",
  border2:      "#E6EEE6",
  text:         "#0B1309",
  mid:          "#4E614E",
  dim:          "#8BA09A",
  brand:        "#00B852",
  brandDark:    "#008C3E",
  forming:      "#E8620A",
  formingLight: "rgba(232,98,10,0.08)",
  formingBorder:"rgba(232,98,10,0.2)",
  activeLight:  "rgba(0,184,82,0.08)",
  activeBorder: "rgba(0,184,82,0.2)",
  closedLight:  "rgba(139,160,154,0.08)",
  closedBorder: "rgba(139,160,154,0.2)",
} as const

const MONO: React.CSSProperties = { fontFamily: "var(--font-dm-mono, 'DM Mono', monospace)" }

// ── UI Types ──────────────────────────────────────────────────────────────────

type VerifType    = "x" | "strava" | "gympass" | "wellhub" | "totalpass"
type PrizeType    = "proporcional" | "primeiro" | "ranking"
type DealTypeUI   = "oficial" | "privado" | "público"
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
  endDateISO?: string
  ruleTarget: number | null
  ruleFrequency: string | null
  verificationType: string | null
  shortId: string
}

// ── Mapping DB → UI ───────────────────────────────────────────────────────────

function toDealUI(d: DealWithParticipants, userId: string | null): Deal {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const start = new Date(d.start_date)
  const end   = new Date(d.end_date)
  const totalDays  = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000))
  const goneDays   = Math.max(0, Math.round((today.getTime() - start.getTime()) / 86400000))
  const daysToStart = Math.max(0, Math.round((start.getTime() - today.getTime()) / 86400000))

  const statusMap: Record<string, DealStatusUI> = {
    formacao: "pendente", ativo: "ativo", finalizado: "finalizado",
    liquidando: "finalizado", encerrado: "finalizado",
  }
  const prizeMap: Record<string, PrizeType> = {
    winner: "primeiro", top3: "ranking", proportional: "proporcional",
  }
  const uiStatus: DealStatusUI = statusMap[d.status] ?? "pendente"
  const uiType: DealTypeUI     = d.type === "publico" ? "público" : (d.type as DealTypeUI)
  const prizeType: PrizeType   = prizeMap[d.distribution] ?? "primeiro"
  const verifs: VerifType[]    = d.verification_channels.filter(
    (c): c is VerifType => ["x","strava","gympass","wellhub","totalpass"].includes(c),
  )
  const myP = userId ? d.participants.find((p) => p.user_id === userId) : null

  return {
    id: d.id, title: d.title, type: uiType, status: uiStatus, prizeType, pot: d.pot_total,
    valuePerPerson: d.entry_amount, participants: d.participant_count,
    progress: Math.min(1, goneDays / totalDays), daysGone: goneDays, daysTotal: totalDays,
    verifications: verifs, isParticipating: myP != null,
    myRank:       myP != null ? (myP?.rank ?? undefined) : undefined,
    potentialWin: myP != null ? Math.round(d.net_pot * 0.9) : undefined,
    daysToStart:  uiStatus === "pendente" ? daysToStart : undefined,
    startDateISO: d.start_date,
    endDateISO:   d.end_date,
    ruleTarget:   d.rule_target, ruleFrequency: d.rule_frequency, verificationType: d.verification_type,
    shortId:      (d.short_id ?? d.id.replace(/-/g, "").slice(-8)).toUpperCase(),
  }
}

// ── Rule helpers ──────────────────────────────────────────────────────────────

const RULE_LABELS: Record<string, { pt: string; en: string }> = {
  post:             { pt: "Post",          en: "Post"          },
  follower_gained:  { pt: "Seguidores",    en: "Followers"     },
  impressions:      { pt: "Impressões",    en: "Impressions"   },
  comment_received: { pt: "Comentários",   en: "Comments"      },
  repost_received:  { pt: "Reposts",       en: "Reposts"       },
  km_run:           { pt: "km corridos",   en: "km run"        },
  pace:             { pt: "Pace",          en: "Pace"          },
  workout_hours:    { pt: "Horas treino",  en: "Workout hrs"   },
  checkin:          { pt: "Check-in",      en: "Check-in"      },
  different_venues: { pt: "Locais únicos", en: "Unique venues" },
}
const FREQ_LABELS: Record<string, { pt: string; en: string }> = {
  daily: { pt: "Diário", en: "Daily" }, weekly: { pt: "Semanal", en: "Weekly" },
  monthly: { pt: "Mensal", en: "Monthly" }, yearly: { pt: "Anual", en: "Yearly" },
}
function buildRuleDisplay(deal: Deal, lang: Language): string {
  const ruleLabel = deal.verificationType ? (RULE_LABELS[deal.verificationType]?.[lang] ?? deal.verificationType) : null
  const freqLabel = deal.ruleFrequency    ? (FREQ_LABELS[deal.ruleFrequency]?.[lang]    ?? deal.ruleFrequency)    : null
  const prefix    = deal.ruleTarget != null ? `${deal.ruleTarget} × ` : ""
  const combined  = ruleLabel ? (prefix + ruleLabel).trim() : null
  return [combined, freqLabel].filter(Boolean).join(" · ") || "—"
}

// ── Countdown helpers ─────────────────────────────────────────────────────────

function getStartTarget(iso: string): Date {
  return new Date(`${iso}T03:00:00Z`)
}
function formatCountdown(ms: number, lang: Language): { label: string; urgency: "normal" | "warning" | "critical" } {
  if (ms <= 0) return { label: lang === "pt" ? "A iniciar" : "Starting soon", urgency: "critical" }
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60), sec = s % 60
  const p = (n: number) => String(n).padStart(2, "0")
  if (d > 0) return { label: `${d}d ${p(h)}h`, urgency: "normal" }
  if (h > 0) return { label: `${h}h ${p(m)}m`, urgency: "warning" }
  return { label: `${p(m)}m ${p(sec)}s`, urgency: "critical" }
}

// ── Verif meta ────────────────────────────────────────────────────────────────

type VerifMeta = { bg: string; text?: string; Icon?: React.FC<{ className?: string }> }
const VERIF: Record<VerifType, VerifMeta> = {
  x:         { bg: "#000",    text: "𝕏" },
  strava:    { bg: "#FC4C02", Icon: Activity },
  gympass:   { bg: "#00A651", text: "GP" },
  wellhub:   { bg: "#00A878", text: "W" },
  totalpass: { bg: "#FF6B35", text: "T" },
}

// ── Deal Card ─────────────────────────────────────────────────────────────────

function DealCard({ deal, onClick, lang }: { deal: Deal; onClick: () => void; lang: Language }) {
  const daysLeft = deal.daysTotal - deal.daysGone

  const ss = {
    color: deal.status === "ativo" ? C.brand : deal.status === "pendente" ? C.forming : C.dim,
    bg:    deal.status === "ativo" ? C.activeLight : deal.status === "pendente" ? C.formingLight : C.closedLight,
    bdr:   deal.status === "ativo" ? C.activeBorder : deal.status === "pendente" ? C.formingBorder : C.closedBorder,
    label: deal.status === "ativo" ? (lang === "pt" ? "Em andamento" : "Active") : deal.status === "pendente" ? (lang === "pt" ? "Formação" : "Forming") : (lang === "pt" ? "Encerrado" : "Closed"),
  }

  const timeVal   = deal.status === "pendente" ? `${deal.daysToStart ?? 0}d` : deal.status === "ativo" ? `${daysLeft}d` : `${deal.daysTotal}d`
  const timeLabel = deal.status === "pendente" ? (lang === "pt" ? "início em" : "starts in") : deal.status === "ativo" ? (lang === "pt" ? "restam" : "left") : (lang === "pt" ? "duração" : "duration")

  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    if (deal.status !== "pendente" || !deal.startDateISO) return
    const id = setInterval(() => setNowMs(Date.now()), 1_000)
    return () => clearInterval(id)
  }, [deal.status, deal.startDateISO])
  const countdown = deal.status === "pendente" && deal.startDateISO
    ? formatCountdown(getStartTarget(deal.startDateISO).getTime() - nowMs, lang)
    : null

  const prizeLabel = deal.prizeType === "proporcional" ? "Proporcional" : deal.prizeType === "primeiro" ? (lang === "pt" ? "1º Lugar" : "1st Place") : "Ranking"

  return (
    <div onClick={onClick} style={{
      background: C.surface, borderRadius: 18,
      border: `1px solid ${C.border}`,
      borderLeft: `3px solid ${ss.color}`,
      padding: "13px 13px 13px 14px",
      cursor: "pointer",
      position: "relative",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 600, ...MONO, letterSpacing: "0.05em", textTransform: "uppercase" as const, background: ss.bg, color: ss.color, border: `1px solid ${ss.bdr}` }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: ss.color, display: "inline-block", flexShrink: 0, boxShadow: deal.status === "ativo" ? `0 0 4px ${ss.color}` : undefined }} />
            {ss.label}
          </span>
          <span style={{ padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 600, background: C.surface2, color: C.mid, border: `1px solid ${C.border}` }}>
            {prizeLabel}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
          {deal.verifications.length > 0 && (
            <div style={{ display: "flex" }}>
              {deal.verifications.map((v, i) => {
                const m = VERIF[v]
                return (
                  <div key={v} style={{ width: 20, height: 20, borderRadius: "50%", background: m.bg, border: `2px solid ${C.surface}`, marginLeft: i > 0 ? -5 : 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {m.Icon ? <m.Icon className="w-2.5 h-2.5 text-white" /> : <span style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>{m.text}</span>}
                  </div>
                )
              })}
            </div>
          )}
          <span style={{ fontSize: 9, fontWeight: 600, color: C.dim, ...MONO, letterSpacing: "0.05em" }}>
            #{deal.shortId}
          </span>
        </div>
      </div>

      {/* Title */}
      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 3, color: C.text }}>
        {deal.title}
      </div>

      {/* Description */}
      <div style={{ fontSize: 11, color: C.mid, marginBottom: 9, lineHeight: 1.4 }}>
        {buildRuleDisplay(deal, lang)}
      </div>

      {/* Progress bar (active only) */}
      {deal.status === "ativo" && deal.progress > 0 && (
        <div style={{ marginBottom: 9 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: C.mid, marginBottom: 4 }}>
            {lang === "pt" ? "Dia" : "Day"} <strong style={{ color: C.brand }}>{deal.daysGone} de {deal.daysTotal}</strong>
          </div>
          <div style={{ height: 3, background: C.surface2, borderRadius: 100, overflow: "hidden" }}>
            <div style={{ height: "100%", background: `linear-gradient(90deg,${C.brand},#7FFFD4)`, width: `${deal.progress * 100}%`, borderRadius: 100 }} />
          </div>
        </div>
      )}

      {/* Countdown (forming) */}
      {deal.status === "pendente" && countdown && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 9 }}>
          <Clock style={{ width: 12, height: 12, stroke: countdown.urgency === "critical" ? "#DC2626" : C.forming, fill: "none" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: countdown.urgency === "critical" ? "#DC2626" : C.forming, ...MONO }}>
            {lang === "pt" ? "Inicia em" : "Starts in"} {countdown.label}
          </span>
        </div>
      )}

      {/* Stats row + footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 9, borderTop: `1px solid ${C.border2}` }}>
        <div style={{ fontSize: 11, color: C.mid, display: "flex", gap: 8, alignItems: "center" }}>
          {/* Entry */}
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 8, ...MONO, color: C.dim, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Entry</span>
            <span style={{ fontWeight: 600, color: C.text }}>${deal.valuePerPerson}</span>
          </div>
          <span style={{ color: C.border }}>·</span>
          {/* Participants */}
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 8, ...MONO, color: C.dim, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Players</span>
            <span style={{ fontWeight: 600, color: C.text }}>{deal.participants}</span>
          </div>
          <span style={{ color: C.border }}>·</span>
          {/* Period */}
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 8, ...MONO, color: C.dim, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Period</span>
            <span style={{ fontWeight: 600, color: C.text, fontSize: 10 }}>
              {deal.startDateISO && deal.endDateISO
                ? (() => {
                    const fmt = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}` }
                    return `${fmt(deal.startDateISO)}–${fmt(deal.endDateISO)}`
                  })()
                : `${deal.daysTotal}d`}
            </span>
          </div>
          <span style={{ color: C.border }}>·</span>
          {/* Prize Pot */}
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 8, ...MONO, color: C.dim, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Prize Pot</span>
            <span style={{ fontWeight: 700, color: deal.pot > 0 ? C.brand : C.dim }}>${deal.pot}</span>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClick() }}
          style={{
            padding: "7px 14px", borderRadius: 100, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
            background: deal.status === "pendente" && !deal.isParticipating ? C.forming : deal.status === "ativo" ? C.activeLight : C.surface2,
            color: deal.status === "pendente" && !deal.isParticipating ? "#fff" : deal.status === "ativo" ? C.brand : C.mid,
            outline: deal.status === "ativo" ? `1px solid ${C.activeBorder}` : undefined,
          }}
        >
          {deal.isParticipating
            ? (deal.status === "ativo" ? (lang === "pt" ? "Progresso" : "Progress") : (lang === "pt" ? "Resultados" : "Results"))
            : (deal.status === "pendente" ? (lang === "pt" ? "Entrar" : "Join") : (lang === "pt" ? "Ver" : "View"))
          }
        </button>
      </div>
    </div>
  )
}

// ── Hero Banner ───────────────────────────────────────────────────────────────

const FEATURED_DEALS = [
  {
    id: "strava-week",
    badge: "Oficial True Deal", badgeEn: "Official True Deal",
    title: "Strava Week", titleEn: "Strava Week",
    desc: "5 km/dia · Verificado via Strava", descEn: "5 km/day · Verified via Strava",
    pot: "$5,000", entry: "$50", players: 98, daysLeft: 4,
    gradient: `linear-gradient(135deg,#00523A,#00875A 60%,${C.brand})`,
    ctaColor: C.brandDark,
  },
  {
    id: "academia",
    badge: "Oficial True Deal", badgeEn: "Official True Deal",
    title: "Academia 30 Dias", titleEn: "30-Day Gym",
    desc: "Check-in diário · Wellhub", descEn: "Daily check-in · Wellhub",
    pot: "$1,200", entry: "$25", players: 48, daysLeft: 12,
    gradient: `linear-gradient(135deg,#9E3700,#C94C0A 60%,${C.forming})`,
    ctaColor: "#9E3700",
  },
]

function HeroBanner({ onJoin, lang }: { onJoin: () => void; lang: Language }) {
  const [current, setCurrent] = useState(0)
  const deal = FEATURED_DEALS[current]

  return (
    <div style={{ padding: "0 20px 12px" }}>
      <div
        style={{ borderRadius: 26, padding: 20, position: "relative", overflow: "hidden", cursor: "pointer" }}
        onClick={onJoin}
      >
        <div style={{ background: deal.gradient, position: "absolute", inset: 0, borderRadius: 26 }} />
        <div style={{ position: "absolute", top: "-20%", right: "-10%", width: 200, height: 200, background: "rgba(255,255,255,0.1)", borderRadius: "50%", filter: "blur(30px)" }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,0.2)", borderRadius: 100, padding: "3px 10px", fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.85)", ...MONO, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 8 }}>
            {lang === "pt" ? deal.badge : deal.badgeEn}
          </div>
          <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-0.03em", color: "#fff", marginBottom: 3 }}>
            {lang === "pt" ? deal.title : deal.titleEn}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginBottom: 13 }}>
            {lang === "pt" ? deal.desc : deal.descEn}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 13 }}>
            {[
              { label: lang === "pt" ? "Prêmio" : "Prize", value: deal.pot },
              { label: lang === "pt" ? "Entrada" : "Entry", value: deal.entry },
              { label: "Players", value: String(deal.players) },
              { label: lang === "pt" ? "Termina" : "Ends", value: `${deal.daysLeft}d` },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" as const, letterSpacing: "0.1em", ...MONO, display: "block", marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: 100, padding: 10, textAlign: "center", fontSize: 12, fontWeight: 700, color: deal.ctaColor }}>
            {lang === "pt" ? "Ver progresso" : "View progress"}
          </div>
        </div>
      </div>

      {FEATURED_DEALS.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 5, paddingTop: 10 }}>
          {FEATURED_DEALS.map((_, idx) => (
            <button key={idx} onClick={() => setCurrent(idx)} style={{
              width: idx === current ? 18 : 6, height: 6, borderRadius: 3,
              background: idx === current ? C.brand : C.border,
              border: "none", cursor: "pointer", transition: "all 0.2s",
            }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Notification Popover ──────────────────────────────────────────────────────

function NotificationPopover({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { language } = useLanguageStore()
  if (!isOpen) return null
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 30 }} onClick={onClose}>
      <div
        style={{ position: "absolute", top: 70, right: 20, width: 300, borderRadius: 24, padding: 16, background: C.surface, border: `1px solid ${C.border}`, boxShadow: "0 16px 48px rgba(0,0,0,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{language === "pt" ? "Notificações" : "Notifications"}</h2>
          <button onClick={onClose} style={{ color: C.dim, background: "none", border: "none", fontSize: 18, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ textAlign: "center", padding: "20px 0", fontSize: 12, color: C.dim }}>
          {language === "pt" ? "Nenhuma notificação" : "No notifications"}
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
  const [darkMode, setDarkMode] = useState(false)
  const [copied,   setCopied]   = useState(false)

  useEffect(() => {
    setDarkMode(localStorage.getItem("td-dark-mode") === "true")
  }, [])

  function toggleDarkMode() {
    const next = !darkMode; setDarkMode(next)
    localStorage.setItem("td-dark-mode", String(next))
    document.documentElement.classList.toggle("dark", next)
  }

  function handleCopyReferral() {
    if (!userId) return
    navigator.clipboard.writeText(`${window.location.origin}/invite/${userId}`).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
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

  const menuItem = (icon: React.ReactNode, label: string, onClick: () => void, right?: React.ReactNode) => (
    <button onClick={onClick} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" as const }}
      onMouseEnter={e => (e.currentTarget.style.background = C.surface2)}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
      <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: C.surface2 }}>{icon}</div>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.text }}>{label}</span>
      {right}
    </button>
  )

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 30 }} onClick={onClose}>
      <div style={{ position: "absolute", top: 70, right: 20, width: 280, borderRadius: 24, overflow: "hidden", background: C.surface, border: `1px solid ${C.border}`, boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: C.brand, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{initials}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</div>
            {username && <div style={{ fontSize: 11, color: C.dim, ...MONO }}>{username}</div>}
            <div style={{ fontSize: 11, color: C.brand, fontWeight: 700, marginTop: 2 }}>{shakes} 🤝 Shakes</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", background: C.surface2, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.dim, fontSize: 16 }}>×</button>
        </div>
        {/* Menu */}
        <div style={{ padding: "8px 0" }}>
          {menuItem(<User style={{ width: 16, height: 16, stroke: C.brand, fill: "none" }} />, t("nav_profile", language), () => { onClose(); router.push("/profile") })}
          {menuItem(<span style={{ fontSize: 16 }}>🎁</span>, language === "pt" ? "Convide e ganhe" : "Invite & Earn", handleCopyReferral,
            copied ? <span style={{ fontSize: 10, color: C.brand, fontWeight: 700 }}>✓</span> : undefined)}
          <div style={{ height: 1, margin: "4px 20px", background: C.border }} />
          {menuItem(<Globe style={{ width: 16, height: 16, stroke: "#3B82F6", fill: "none" }} />, language === "pt" ? "Idioma" : "Language", () => setLanguage(language === "pt" ? "en" : "pt"),
            <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", background: C.surface2 }}>
              {(["pt", "en"] as const).map((l) => (
                <span key={l} style={{ padding: "3px 8px", fontSize: 11, fontWeight: 700, background: language === l ? C.brand : "transparent", color: language === l ? "#fff" : C.dim, transition: "all 0.15s" }}>{l.toUpperCase()}</span>
              ))}
            </div>)}
          {menuItem(<Moon style={{ width: 16, height: 16, stroke: C.mid, fill: "none" }} />, "Dark Mode", toggleDarkMode,
            <div style={{ width: 40, height: 22, borderRadius: 100, background: darkMode ? C.brand : C.border, position: "relative", transition: "background 0.2s" }}>
              <div style={{ position: "absolute", top: 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.15)", transition: "transform 0.2s", transform: darkMode ? "translateX(20px)" : "translateX(2px)" }} />
            </div>)}
        </div>
        {/* Sign out */}
        <div style={{ padding: "8px 20px 16px", borderTop: `1px solid ${C.border}` }}>
          <button onClick={handleSignOut} style={{ width: "100%", padding: "10px", borderRadius: 12, fontSize: 13, fontWeight: 600, color: "#EF4444", background: "transparent", border: "none", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.06)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            {t("nav_logout", language)}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Bottom Nav (5-col with center FAB) ────────────────────────────────────────

function BottomNav({ active, lang, onCreateClick }: { active: string; lang: Language; onCreateClick: () => void }) {
  const router = useRouter()
  const leftItems  = [
    { icon: Home,    key: "home",    href: "/" },
    { icon: Compass, key: "explore", href: "/explore" },
  ]
  const rightItems = [
    { icon: Wallet, key: "wallet",  href: "/wallet" },
    { icon: User,   key: "profile", href: "/profile" },
  ]
  const navItem = (icon: React.ElementType, key: string, href: string) => {
    const Icon = icon
    const isActive = active === key
    return (
      <button key={key} onClick={() => router.push(href)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontSize: 9, color: isActive ? C.brand : C.dim, cursor: "pointer", background: "none", border: "none", flex: 1, ...MONO, letterSpacing: "0.04em" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: isActive ? C.brand : "transparent", transition: "all 0.2s" }}>
          <Icon style={{ width: 20, height: 20, stroke: isActive ? "#fff" : C.dim, fill: "none" }} />
        </div>
        <span style={{ textTransform: "uppercase" as const }}>{t(`nav_${key}` as any, lang)}</span>
      </button>
    )
  }
  return (
    <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(240,243,240,0.94)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderTop: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", padding: "9px 0 26px", zIndex: 20 }}>
      {leftItems.map(i => navItem(i.icon, i.key, i.href))}

      {/* Center FAB */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        <button onClick={onCreateClick} style={{ width: 50, height: 50, background: C.brand, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginTop: -14, boxShadow: `0 4px 14px rgba(0,184,82,0.35)`, border: `3px solid ${C.bg}`, cursor: "pointer" }}>
          <Plus style={{ width: 22, height: 22, stroke: "#fff", fill: "none" }} />
        </button>
        <span style={{ fontSize: 9, fontWeight: 500, color: C.brand, textTransform: "uppercase" as const, letterSpacing: "0.04em", ...MONO }}>New Deal</span>
      </div>

      {rightItems.map(i => navItem(i.icon, i.key, i.href))}
    </nav>
  )
}

// ── Filter types ──────────────────────────────────────────────────────────────

type StatusFilter = DealStatusUI | null
type TypeFilter   = DealTypeUI | null

const MAIN_TABS = [
  { key: "todos" as const, label: "dash_all_deals" },
  { key: "meus"  as const, label: "dash_my_deals"  },
]

const STATUS_PILLS: { key: DealStatusUI; labelPt: string; labelEn: string; color: string }[] = [
  { key: "pendente",   labelPt: "Formação",     labelEn: "Forming",   color: C.forming },
  { key: "ativo",      labelPt: "Em andamento", labelEn: "Active",    color: C.brand   },
  { key: "finalizado", labelPt: "Encerrados",   labelEn: "Closed",    color: C.dim     },
]

const TYPE_PILLS: { key: DealTypeUI; labelPt: string; labelEn: string }[] = [
  { key: "oficial", labelPt: "Oficial", labelEn: "Official" },
  { key: "privado", labelPt: "Privado", labelEn: "Private"  },
  { key: "público", labelPt: "Público", labelEn: "Public"   },
]

// ── Home Client ───────────────────────────────────────────────────────────────

interface HomeClientProps {
  initialDeals: DealWithParticipants[]
  profile: Profile | null
  userId: string | null
  usdcBalance:      number
  activeDealsValue: number
}

export default function HomeClient({ initialDeals, profile, userId, usdcBalance, activeDealsValue }: HomeClientProps) {
  const router = useRouter()
  const { language } = useLanguageStore()
  const lang = language

  const deals: Deal[] = initialDeals.map((d) => toDealUI(d, userId))

  const [activeMainTab,  setActiveMainTab]  = useState<"todos" | "meus">("todos")
  const [activeStatus,   setActiveStatus]   = useState<StatusFilter>(null)
  const [activeDealType, setActiveDealType] = useState<TypeFilter>(null)
  const [searchQuery,    setSearchQuery]    = useState("")
  const [showSearch,     setShowSearch]     = useState(false)
  const [showNotif,      setShowNotif]      = useState(false)
  const [showProfile,    setShowProfile]    = useState(false)

  const viewingMyDeals = activeMainTab === "meus"

  const filteredDeals = deals
    .filter((d) => !viewingMyDeals  || d.isParticipating)
    .filter((d) => !activeStatus    || d.status === activeStatus)
    .filter((d) => !activeDealType  || d.type   === activeDealType)
    .filter((d) => !searchQuery     || d.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const countByStatus = (s: DealStatusUI) => deals
    .filter((d) => d.status === s)
    .filter((d) => !viewingMyDeals || d.isParticipating)
    .filter((d) => !activeDealType || d.type === activeDealType).length

  const myActiveDeals   = deals.filter((d) => d.isParticipating && d.status === "ativo")
  const footerAtStake   = myActiveDeals.reduce((s, d) => s + d.valuePerPerson, 0)
  const footerPotential = myActiveDeals.reduce((s, d) => s + (d.potentialWin ?? 0), 0)

  const displayName = profile?.display_name ?? (lang === "pt" ? "Usuário" : "User")
  const firstName   = displayName.split(" ")[0]
  const initials    = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"
  const shakes      = profile?.tdp_points ?? 0
  const level       = Math.floor(shakes / 100) + 1

  const [greeting, setGreeting] = useState({ pt: "Bom dia", en: "Good morning" })
  useEffect(() => {
    const h = new Date().getHours()
    if (h >= 18) setGreeting({ pt: "Boa noite", en: "Good evening" })
    else if (h >= 12) setGreeting({ pt: "Boa tarde", en: "Good afternoon" })
    else setGreeting({ pt: "Bom dia", en: "Good morning" })
  }, [])

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", paddingBottom: 90 }}>

      <NotificationPopover isOpen={showNotif}   onClose={() => setShowNotif(false)} />
      <ProfilePopover isOpen={showProfile} onClose={() => setShowProfile(false)} profile={profile} userId={userId} />

      {/* ── TOP BAR ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, background: C.brand, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.03em", color: C.text }}>
              TRUE<span style={{ color: C.brand }}>DEAL</span>
            </div>
            <div style={{ fontSize: 7.5, fontWeight: 500, color: C.dim, letterSpacing: "0.06em", textTransform: "uppercase" as const, ...MONO, whiteSpace: "nowrap" as const }}>
              Set your goals. Honor your word. Get paid for it.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setShowNotif(!showNotif)} style={{ width: 34, height: 34, background: C.surface, border: `1px solid ${C.border}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
            <Bell style={{ width: 16, height: 16, stroke: C.mid, fill: "none" }} />
            <div style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, background: C.forming, borderRadius: "50%", border: `2px solid ${C.bg}` }} />
          </button>
          <button onClick={() => setShowProfile(!showProfile)} style={{ width: 34, height: 34, background: C.brand, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${C.surface}`, cursor: "pointer", position: "relative" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{initials}</span>
            <div style={{ position: "absolute", bottom: -4, right: -4, background: C.brand, color: "#fff", borderRadius: 100, fontSize: 8, fontWeight: 700, padding: "1px 4px", border: `1px solid ${C.bg}`, ...MONO }}>
              {level}
            </div>
          </button>
        </div>
      </div>

      {/* ── GREETING ── */}
      <div style={{ padding: "10px 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 2, color: C.text }}>
            {lang === "pt" ? `${greeting.pt}, ${firstName}` : `${greeting.en}, ${firstName}`}
          </h2>
          <p style={{ fontSize: 12, color: C.mid }}>{lang === "pt" ? "Pronto para vencer hoje?" : "Ready to win today?"}</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { label: "Shakes",    value: shakes.toLocaleString("en-US"),                                                  color: C.text  },
            { label: "Portfolio", value: `$${(usdcBalance + activeDealsValue).toFixed(0)}`,                               color: C.brand },
            { label: "Balance",   value: `$${Math.max(0, usdcBalance - activeDealsValue).toFixed(0)}`,                   color: C.mid   },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "7px 10px", textAlign: "right" }}>
              <div style={{ fontSize: 7.5, ...MONO, color: C.dim, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.03em", color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── HERO BANNER ── */}
      <HeroBanner onJoin={() => router.push("/explore")} lang={lang} />

      {/* ── MAIN TABS ── */}
      <div style={{ display: "flex", gap: 6, padding: "0 20px 11px" }}>
        {MAIN_TABS.map(tab => {
          const isActive = activeMainTab === tab.key
          return (
            <button key={tab.key}
              onClick={() => { setActiveMainTab(tab.key); setActiveDealType(null); setActiveStatus(null); setSearchQuery(""); setShowSearch(false) }}
              style={{
                padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: isActive ? 700 : 500,
                background: isActive ? C.text : C.surface, border: `1px solid ${isActive ? C.text : C.border}`,
                color: isActive ? "#fff" : C.mid, cursor: "pointer", transition: "all 0.15s",
              }}>
              {t(tab.label as any, lang)}
            </button>
          )
        })}
      </div>

      {/* ── FILTER ROW ── */}
      <div style={{ display: "flex", gap: 6, padding: "0 20px 11px", overflowX: "auto", scrollbarWidth: "none" }}>
        <button onClick={() => setShowSearch(s => !s)} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: "50%", background: showSearch ? C.activeLight : C.surface, border: `1px solid ${showSearch ? C.activeBorder : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Search style={{ width: 14, height: 14, stroke: showSearch ? C.brand : C.dim, fill: "none" }} />
        </button>
        {STATUS_PILLS.map(p => {
          const cnt = countByStatus(p.key)
          const isActive = activeStatus === p.key
          return (
            <button key={p.key} onClick={() => setActiveStatus(isActive ? null : p.key)}
              style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 100, fontSize: 11, fontWeight: 500, background: isActive ? (p.key === "pendente" ? C.formingLight : p.key === "ativo" ? C.activeLight : C.closedLight) : C.surface, border: `1px solid ${isActive ? (p.key === "pendente" ? C.formingBorder : p.key === "ativo" ? C.activeBorder : C.closedBorder) : C.border}`, color: isActive ? p.color : C.mid, cursor: "pointer", whiteSpace: "nowrap" as const }}>
              {lang === "pt" ? p.labelPt : p.labelEn}
              {cnt > 0 && <span style={{ background: "rgba(0,0,0,0.08)", borderRadius: 100, padding: "1px 5px", fontSize: 10 }}>{cnt}</span>}
            </button>
          )
        })}
      </div>

      {showSearch && (
        <div style={{ padding: "0 20px 11px", position: "relative" }}>
          <Search style={{ position: "absolute", left: 33, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, stroke: C.dim, fill: "none" }} />
          <input
            type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === "pt" ? "Buscar deals..." : "Search deals..."}
            autoFocus
            style={{ width: "100%", paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10, borderRadius: 12, fontSize: 13, background: C.surface, border: `1.5px solid ${C.activeBorder}`, color: C.text, outline: "none" }}
          />
        </div>
      )}

      {/* ── SECTION HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px 9px" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", color: C.text }}>
          {lang === "pt" ? "Acordos" : "Deals"}
          <em style={{ color: C.brand, fontStyle: "normal", fontSize: 13, marginLeft: 5 }}>{filteredDeals.length}</em>
        </h3>
      </div>

      {/* ── DEAL LIST ── */}
      <div style={{ flex: 1, padding: "0 20px", display: "flex", flexDirection: "column", gap: 9, paddingBottom: 16 }}>
        {filteredDeals.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
            <p style={{ color: C.mid, fontWeight: 600, marginBottom: 6 }}>
              {viewingMyDeals && deals.filter(d => d.isParticipating).length === 0
                ? (lang === "pt" ? "Você ainda não entrou em nenhum deal" : "You haven't joined any deals yet")
                : (lang === "pt" ? "Nenhum deal encontrado" : "No deals found")}
            </p>
            <p style={{ color: C.dim, fontSize: 13 }}>
              {viewingMyDeals && deals.filter(d => d.isParticipating).length === 0
                ? (lang === "pt" ? "Crie ou entre em um deal para começar" : "Create or join a deal to get started")
                : (lang === "pt" ? "Ajuste os filtros ou crie um novo" : "Adjust filters or create a new one")}
            </p>
          </div>
        ) : (
          <>
            {filteredDeals.map((deal) => (
              <DealCard key={deal.id} deal={deal} onClick={() => router.push(`/deal/${deal.id}`)} lang={lang} />
            ))}

            {viewingMyDeals && myActiveDeals.length > 0 && (
              <div style={{ marginTop: 4, padding: 16, borderRadius: 18, background: C.activeLight, border: `1px solid ${C.activeBorder}` }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.dim, textTransform: "uppercase" as const, letterSpacing: "0.12em", ...MONO, marginBottom: 12 }}>
                  {lang === "pt" ? "Resumo financeiro" : "Financial summary"}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: C.mid, marginBottom: 2 }}>{lang === "pt" ? "Em jogo" : "At stake"}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: C.text }}>${footerAtStake.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                    <div style={{ fontSize: 10, color: C.dim }}>{myActiveDeals.length} deal(s)</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: C.mid, marginBottom: 2 }}>{lang === "pt" ? "Projeção" : "Projected win"}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: footerPotential > 0 ? C.brand : C.dim }}>${footerPotential.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                    <div style={{ fontSize: 10, color: C.dim }}>{lang === "pt" ? "posição atual" : "current position"}</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <BottomNav active="home" lang={lang} onCreateClick={() => router.push("/create")} />
    </div>
  )
}
