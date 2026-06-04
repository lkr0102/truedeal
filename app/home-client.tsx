"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Bell, Home, Compass, Wallet, User, Plus,
  Clock, Activity, PieChart, Trophy, Award,
  Search, Globe, Moon, ChevronLeft, ChevronRight,
  Lock, SlidersHorizontal, ArrowUpDown, X as XIcon,
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

type VerifType    = "x" | "strava" | "gympass" | "youtube" | "totalpass"
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
    (c): c is VerifType => ["x","strava","gympass","youtube","totalpass"].includes(c),
  )
  const myP = userId ? d.participants.find((p) => p.user_id === userId) : null

  return {
    id: d.id, title: d.title, type: uiType, status: uiStatus, prizeType, pot: d.pot_total,
    valuePerPerson: d.entry_amount, participants: d.participant_count,
    progress: Math.min(1, goneDays / totalDays), daysGone: Math.min(goneDays, totalDays), daysTotal: totalDays,
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

type VerifMeta = { bg: string; text?: string; Icon?: React.FC<{ className?: string }>; label: string }
const VERIF: Record<VerifType, VerifMeta> = {
  x:         { bg: "#000",    text: "𝕏",       label: "Twitter"   },
  strava:    { bg: "#FC4C02", Icon: Activity,  label: "Strava"    },
  gympass:   { bg: "#00A651", text: "GP",      label: "GymPass"   },
  youtube:   { bg: "#FF0000", text: "▶",       label: "YouTube"   },
  totalpass: { bg: "#FF6B35", text: "TP",      label: "TotalPass" },
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
          {deal.type === "privado" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 100, fontSize: 10, fontWeight: 600, background: "rgba(124,58,237,0.08)", color: "#7C3AED", border: "1px solid rgba(124,58,237,0.2)" }}>
              <Lock style={{ width: 8, height: 8 }} />
              {lang === "pt" ? "Privado" : "Private"}
            </span>
          )}
        </div>
        <span style={{ fontSize: 9, fontWeight: 600, color: C.dim, ...MONO, letterSpacing: "0.05em" }}>
          #{deal.shortId}
        </span>
      </div>

      {/* Title */}
      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 3, color: C.text }}>
        {deal.title}
      </div>

      {/* Description */}
      <div style={{ fontSize: 11, color: C.mid, marginBottom: deal.verifications.length > 0 ? 6 : 9, lineHeight: 1.4 }}>
        {buildRuleDisplay(deal, lang)}
      </div>

      {/* Verification channel pills */}
      {deal.verifications.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 9 }}>
          {deal.verifications.map((v) => {
            const m = VERIF[v]
            const isDark = m.bg === "#000"
            return (
              <div key={v} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: isDark ? "rgba(0,0,0,0.07)" : `${m.bg}18`, border: `1px solid ${isDark ? "rgba(0,0,0,0.14)" : m.bg + "44"}`, borderRadius: 100, padding: "3px 10px 3px 4px" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: m.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {m.Icon ? <m.Icon className="w-3 h-3 text-white" /> : <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{m.text}</span>}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? C.text : m.bg }}>{m.label}</span>
              </div>
            )
          })}
        </div>
      )}

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
            <span style={{ fontSize: 8, ...MONO, color: C.dim, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Entrada</span>
            <span style={{ fontWeight: 800, color: C.text, fontSize: 13 }}>${deal.valuePerPerson}</span>
          </div>
          <span style={{ color: C.border }}>·</span>
          {/* Participants */}
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 8, ...MONO, color: C.dim, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Players</span>
            <span style={{ fontWeight: 600, color: C.mid }}>{deal.participants}</span>
          </div>
          <span style={{ color: C.border }}>·</span>
          {/* Period */}
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 8, ...MONO, color: C.dim, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Período</span>
            <span style={{ fontWeight: 600, color: C.mid, fontSize: 10 }}>
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
            <span style={{ fontSize: 8, ...MONO, color: C.dim, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Pote</span>
            <span style={{ fontWeight: 800, color: deal.pot > 0 ? C.brand : C.dim, fontSize: 14 }}>${deal.pot}</span>
          </div>
        </div>
        {(() => {
          const isPrivate  = deal.type === "privado"
          const isPending  = deal.status === "pendente"
          const canJoin    = isPending && !deal.isParticipating
          const isRequest  = canJoin && isPrivate
          const bg = deal.isParticipating
            ? (deal.status === "ativo" ? C.activeLight : C.surface2)
            : isPending
              ? (isPrivate ? "rgba(124,58,237,0.1)" : C.forming)
              : C.surface2
          const color = deal.isParticipating
            ? (deal.status === "ativo" ? C.brand : C.mid)
            : isPending
              ? (isPrivate ? "#7C3AED" : "#fff")
              : C.mid
          const outline = deal.status === "ativo" ? `1px solid ${C.activeBorder}` : isRequest ? "1px solid rgba(124,58,237,0.3)" : undefined
          const label = deal.isParticipating
            ? (deal.status === "ativo" ? (lang === "pt" ? "Progresso" : "Progress") : (lang === "pt" ? "Resultados" : "Results"))
            : isPending
              ? (isPrivate ? (lang === "pt" ? "Solicitar" : "Request") : (lang === "pt" ? "Entrar" : "Join"))
              : (lang === "pt" ? "Ver" : "View")
          return (
            <button
              onClick={(e) => { e.stopPropagation(); onClick() }}
              style={{ padding: "7px 14px", borderRadius: 100, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", background: bg, color, outline }}
            >
              {isRequest && <Lock style={{ width: 9, height: 9, display: "inline", marginRight: 4, verticalAlign: "middle" }} />}
              {label}
            </button>
          )
        })()}
      </div>
    </div>
  )
}

// ── Hero Banner ───────────────────────────────────────────────────────────────

function HeroBanner({ lang }: { lang: Language }) {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [shareFeedback, setShareFeedback] = useState(false)

  async function handleShare() {
    const text = lang === "pt"
      ? "Alguns desafios são mais fáceis com amigos. Me junte no TrueDeal!"
      : "Some challenges are more easy with friends. Join me on TrueDeal!"
    const url = typeof window !== "undefined" ? window.location.origin : ""
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: "TrueDeal", text, url }) } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(`${text} ${url}`)
        setShareFeedback(true)
        setTimeout(() => setShareFeedback(false), 2000)
      } catch {}
    }
  }

  const TOTAL = 2

  function prev(e: React.MouseEvent) { e.stopPropagation(); setCurrent(c => (c - 1 + TOTAL) % TOTAL) }
  function next(e: React.MouseEvent) { e.stopPropagation(); setCurrent(c => (c + 1) % TOTAL) }

  const arrowStyle = (side: "left" | "right"): React.CSSProperties => ({
    position: "absolute", [side]: 10, top: "50%", transform: "translateY(-50%)",
    zIndex: 2, width: 28, height: 28, borderRadius: "50%",
    background: "rgba(255,255,255,0.88)", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.14)", flexShrink: 0,
  })

  return (
    <div style={{ padding: "0 20px 12px" }}>
      <div style={{ position: "relative" }}>

        {/* Banner 1 — Brand / Goals */}
        {current === 0 && (
          <div
            onClick={() => router.push("/create")}
            style={{ borderRadius: 26, padding: "20px 50px 18px", position: "relative", overflow: "hidden", cursor: "pointer", background: `linear-gradient(135deg, #00523A 0%, #008C3E 55%, ${C.brand} 100%)` }}
          >
            <div style={{ position: "absolute", top: "-30%", right: "-8%", width: 180, height: 180, background: "rgba(255,255,255,0.1)", borderRadius: "50%", filter: "blur(40px)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: "-25%", left: "35%", width: 120, height: 120, background: "rgba(0,0,0,0.12)", borderRadius: "50%", filter: "blur(30px)", pointerEvents: "none" }} />

            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 22 }}>
              {/* Left: app logo (green circle + black checkmark) */}
              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
                <div style={{ width: 56, height: 56, background: C.brand, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2.5px solid rgba(255,255,255,0.35)", boxShadow: "0 0 0 4px rgba(255,255,255,0.1)" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                </div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.01em", color: "#fff", textAlign: "center" as const, lineHeight: 1.1 }}>
                  TRUE<br /><span style={{ opacity: 0.65 }}>DEAL</span>
                </div>
              </div>

              {/* Right: tagline + CTA */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.025em", color: "#fff", lineHeight: 1.3, marginBottom: 16 }}>
                  <div>Set your goals.</div>
                  <div>Honor your word.</div>
                  <div style={{ opacity: 0.75 }}>Get paid for it.</div>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.9)", borderRadius: 100, padding: "9px 16px", fontSize: 12, fontWeight: 700, color: C.brandDark, letterSpacing: "-0.01em" }}>
                  {lang === "pt" ? "Definir metas agora" : "Set your goals now"} →
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Banner 2 — Invite / Social */}
        {current === 1 && (
          <div
            onClick={handleShare}
            style={{ borderRadius: 26, padding: "20px 50px 18px", position: "relative", overflow: "hidden", cursor: "pointer", background: C.surface, border: `1px solid ${C.border}` }}
          >
            <div style={{ position: "absolute", top: 0, right: 0, width: "45%", height: "100%", background: `linear-gradient(270deg, ${C.activeLight}, transparent)`, pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: "-20%", right: "15%", width: 100, height: 100, background: `radial-gradient(circle, rgba(0,184,82,0.08), transparent 70%)`, pointerEvents: "none" }} />

            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.brand, ...MONO, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 10 }}>
                Community
              </div>
              <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-0.035em", color: C.text, lineHeight: 1.2, marginBottom: 18 }}>
                {lang === "pt" ? (
                  <>Alguns desafios são<br /><span style={{ color: C.brand }}>mais fáceis</span> com amigos.</>
                ) : (
                  <>Some challenges are<br /><span style={{ color: C.brand }}>more easy</span> with friends.</>
                )}
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.brand, borderRadius: 100, padding: "9px 18px", fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>
                {shareFeedback
                  ? (lang === "pt" ? "Link copiado!" : "Link copied!")
                  : (lang === "pt" ? "Convidar amigos agora" : "Invite your friends now")} →
              </div>
            </div>
          </div>
        )}

        {/* Navigation arrows */}
        <button style={arrowStyle("left")} onClick={prev}>
          <ChevronLeft style={{ width: 15, height: 15, stroke: C.text, fill: "none" }} />
        </button>
        <button style={arrowStyle("right")} onClick={next}>
          <ChevronRight style={{ width: 15, height: 15, stroke: C.text, fill: "none" }} />
        </button>
      </div>

      {/* Dot indicators */}
      <div style={{ display: "flex", justifyContent: "center", gap: 5, paddingTop: 10 }}>
        {Array.from({ length: TOTAL }).map((_, idx) => (
          <button key={idx} onClick={() => setCurrent(idx)} style={{
            width: idx === current ? 18 : 6, height: 6, borderRadius: 3,
            background: idx === current ? C.brand : C.border,
            border: "none", cursor: "pointer", transition: "all 0.2s",
          }} />
        ))}
      </div>
    </div>
  )
}

// ── Notification Popover ──────────────────────────────────────────────────────

interface AppNotification {
  id: string; type: string; deal_id: string | null
  title_pt: string; title_en: string; body_pt: string; body_en: string
  is_read: boolean; created_at: string
}

const NOTIF_ICONS: Record<string, string> = {
  deal_join_confirm:  "🤝",
  deal_joined:        "👋",
  deal_milestone:     "🔥",
  deal_started:       "🚀",
  deal_cancelled:     "❌",
  deal_result_win:    "🏆",
  deal_result_lose:   "📉",
  deal_eliminated:    "⚡",
  deal_window_update: "💰",
  deal_ending_soon:   "⏰",
}

function formatRelativeTime(iso: string, lang: Language): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return lang === "pt" ? "agora"   : "just now"
  if (mins < 60) return lang === "pt" ? `${mins}m` : `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return lang === "pt" ? `${hrs}h`  : `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return lang === "pt" ? `${days}d` : `${days}d ago`
}

function NotificationPopover({
  isOpen, onClose, userId,
}: { isOpen: boolean; onClose: () => void; userId: string | null }) {
  const { language } = useLanguageStore()
  const router = useRouter()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch on open
  useEffect(() => {
    if (!isOpen || !userId) return
    setLoading(true)
    const supabase = createClient()
    ;(supabase.from("notifications") as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }: { data: AppNotification[] | null }) => {
        setNotifications(data ?? [])
        setLoading(false)
      })
  }, [isOpen, userId])

  // Mark all as read when opened
  useEffect(() => {
    if (!isOpen || !userId) return
    const supabase = createClient()
    ;(supabase.from("notifications") as any)
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false)
      .then(() => setNotifications(prev => prev.map(n => ({ ...n, is_read: true }))))
  }, [isOpen, userId])

  // Realtime subscription (active as long as userId exists)
  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as AppNotification, ...prev].slice(0, 20))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  if (!isOpen) return null

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 30 }} onClick={onClose}>
      <div
        style={{ position: "absolute", top: 70, right: 20, width: 320, borderRadius: 24, overflow: "hidden", background: C.surface, border: `1px solid ${C.border}`, boxShadow: "0 16px 48px rgba(0,0,0,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 12px", borderBottom: `1px solid ${C.border}` }}>
          <h2 style={{ fontWeight: 700, color: C.text, fontSize: 14, margin: 0 }}>
            {language === "pt" ? "Notificações" : "Notifications"}
          </h2>
          <button onClick={onClose} style={{ color: C.dim, background: "none", border: "none", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        {/* List */}
        <div style={{ maxHeight: 380, overflowY: "auto" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "24px 0", fontSize: 12, color: C.dim }}>
              {language === "pt" ? "Carregando..." : "Loading..."}
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 16px" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
              <div style={{ fontSize: 12, color: C.dim }}>
                {language === "pt" ? "Nenhuma notificação" : "No notifications"}
              </div>
            </div>
          ) : notifications.map((n, i) => (
            <button
              key={n.id}
              onClick={() => { if (n.deal_id) router.push(`/deal/${n.deal_id}`); onClose() }}
              style={{
                width: "100%", display: "flex", alignItems: "flex-start", gap: 10,
                padding: "11px 14px",
                background: n.is_read ? "transparent" : C.activeLight,
                border: "none",
                borderBottom: i < notifications.length - 1 ? `1px solid ${C.border2}` : "none",
                cursor: n.deal_id ? "pointer" : "default", textAlign: "left",
              }}
            >
              <div style={{ width: 34, height: 34, borderRadius: 9, background: C.surface2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16 }}>
                {NOTIF_ICONS[n.type] ?? "🔔"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 2, lineHeight: 1.3, display: "flex", alignItems: "center", gap: 5 }}>
                  {language === "pt" ? n.title_pt : n.title_en}
                  {!n.is_read && <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.brand, flexShrink: 0, display: "inline-block" }} />}
                </div>
                <div style={{ fontSize: 11, color: C.mid, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                  {language === "pt" ? n.body_pt : n.body_en}
                </div>
                <div style={{ fontSize: 10, color: C.dim, marginTop: 3, ...MONO }}>
                  {formatRelativeTime(n.created_at, language)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Profile Popover ───────────────────────────────────────────────────────────

function ProfilePopover({
  isOpen, onClose, profile, userId, onOpenNotif,
}: { isOpen: boolean; onClose: () => void; profile: Profile | null; userId: string | null; onOpenNotif: () => void }) {
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
          <div style={{ width: 44, height: 44, borderRadius: 12, background: C.brand, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{initials}</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {username && <div style={{ fontSize: 12, fontWeight: 700, color: C.text, ...MONO }}>{username}</div>}
            <div style={{ fontSize: 11, color: C.brand, fontWeight: 700, marginTop: 2 }}>{shakes} 🤝 Shakes</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", background: C.surface2, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.dim, fontSize: 16 }}>×</button>
        </div>
        {/* Menu */}
        <div style={{ padding: "8px 0" }}>
          {menuItem(<Bell style={{ width: 16, height: 16, stroke: C.mid, fill: "none" }} />, language === "pt" ? "Notificações" : "Notifications", () => { onClose(); onOpenNotif() })}
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
          <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", opacity: 0.4, cursor: "not-allowed" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: C.surface2 }}>
              <Moon style={{ width: 16, height: 16, stroke: C.mid, fill: "none" }} />
            </div>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.text }}>Dark Mode</span>
            <span style={{ fontSize: 10, color: C.dim, fontWeight: 700, background: C.surface2, padding: "2px 6px", borderRadius: 6 }}>Em breve</span>
          </div>
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
    <nav data-bottom-nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(240,243,240,0.94)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderTop: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", padding: "9px 0 26px", zIndex: 20 }}>
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
  { key: "público", labelPt: "Público", labelEn: "Public"  },
  { key: "privado", labelPt: "Privado", labelEn: "Private" },
]

type SortOption  = "entry_asc" | "entry_desc" | "pot_asc" | "pot_desc" | "start_asc" | null
type DurFilter   = "short" | "medium" | "long" | null
type PriceFilter = "lt50" | "50to200" | "gt200" | null

const CHANNEL_OPTS: { key: VerifType; label: string; bg: string }[] = [
  { key: "x",         label: "𝕏 (Twitter)", bg: "#000"    },
  { key: "strava",    label: "Strava",       bg: "#FC4C02" },
  { key: "youtube",   label: "YouTube",      bg: "#FF0000" },
  { key: "totalpass", label: "TotalPass",    bg: "#FF6B35" },
]
const PRICE_OPTS: { key: PriceFilter; labelPt: string; labelEn: string; min?: number; max?: number }[] = [
  { key: "lt50",    labelPt: "Até $50",    labelEn: "Under $50",  max: 50 },
  { key: "50to200", labelPt: "$50–$200",   labelEn: "$50–$200",   min: 50, max: 200 },
  { key: "gt200",   labelPt: "Acima $200", labelEn: "Over $200",  min: 200 },
]
const DUR_OPTS: { key: DurFilter; labelPt: string; labelEn: string }[] = [
  { key: "short",  labelPt: "Sprint (≤7d)",    labelEn: "Sprint (≤7d)"    },
  { key: "medium", labelPt: "Padrão (8–30d)",  labelEn: "Standard (8–30d)" },
  { key: "long",   labelPt: "Maratona (30d+)", labelEn: "Marathon (30d+)" },
]
const SORT_OPTS: { key: SortOption; labelPt: string; labelEn: string }[] = [
  { key: "entry_asc",  labelPt: "Entrada ↑ (menor)",   labelEn: "Entry ↑ (cheapest)"  },
  { key: "entry_desc", labelPt: "Entrada ↓ (maior)",   labelEn: "Entry ↓ (priciest)"  },
  { key: "pot_asc",    labelPt: "Pote ↑ (menor)",      labelEn: "Pot ↑ (smallest)"    },
  { key: "pot_desc",   labelPt: "Pote ↓ (maior)",      labelEn: "Pot ↓ (largest)"     },
  { key: "start_asc",  labelPt: "Início mais próximo", labelEn: "Starting soonest"    },
]

function checkDuration(days: number, f: DurFilter): boolean {
  if (f === "short")  return days <= 7
  if (f === "medium") return days > 7 && days <= 30
  if (f === "long")   return days > 30
  return true
}

// ── Filter + Sort Sheet ───────────────────────────────────────────────────────

interface FilterSortSheetProps {
  lang: Language
  activeChannels: VerifType[]
  setActiveChannels: (v: VerifType[]) => void
  priceFilter: PriceFilter
  setPriceFilter: (v: PriceFilter) => void
  durFilter: DurFilter
  setDurFilter: (v: DurFilter) => void
  sortOrder: SortOption
  setSortOrder: (v: SortOption) => void
  onClose: () => void
  onReset: () => void
}

function FilterSortSheet({
  lang, activeChannels, setActiveChannels, priceFilter, setPriceFilter,
  durFilter, setDurFilter, sortOrder, setSortOrder, onClose, onReset,
}: FilterSortSheetProps) {
  function toggleChannel(ch: VerifType) {
    setActiveChannels(
      activeChannels.includes(ch)
        ? activeChannels.filter(c => c !== ch)
        : [...activeChannels, ch],
    )
  }

  const pill = (active: boolean, onClick: () => void, label: string, accent: string = C.brand): React.ReactNode => (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0, padding: "7px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600,
        background: active ? accent + "18" : C.surface2,
        color: active ? accent : C.mid,
        border: `1px solid ${active ? accent + "44" : C.border}`,
        cursor: "pointer", whiteSpace: "nowrap" as const,
      }}
    >
      {label}
    </button>
  )

  const section = (title: string) => (
    <div style={{ fontSize: 9, fontWeight: 700, color: C.dim, ...MONO, textTransform: "uppercase" as const, letterSpacing: "0.12em", marginBottom: 10 }}>
      {title}
    </div>
  )

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        style={{ width: "100%", maxWidth: 430, margin: "0 auto", borderRadius: "24px 24px 0 0", background: C.surface, boxShadow: "0 -12px 48px rgba(0,0,0,0.16)", maxHeight: "85vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 100, background: C.border, margin: "14px auto 0" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 4px" }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.025em", color: C.text }}>
            {lang === "pt" ? "Filtros & Ordenação" : "Filters & Sort"}
          </h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onReset} style={{ fontSize: 12, fontWeight: 600, color: C.dim, background: "none", border: "none", cursor: "pointer" }}>
              {lang === "pt" ? "Limpar" : "Reset"}
            </button>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", background: C.surface2, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <XIcon style={{ width: 14, height: 14, stroke: C.dim }} />
            </button>
          </div>
        </div>

        <div style={{ padding: "16px 20px 40px", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Sort */}
          <div>
            {section(lang === "pt" ? "Ordenar por" : "Sort by")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {pill(sortOrder === null, () => setSortOrder(null), lang === "pt" ? "Padrão" : "Default")}
              {SORT_OPTS.map(o => pill(
                sortOrder === o.key,
                () => setSortOrder(sortOrder === o.key ? null : o.key),
                lang === "pt" ? o.labelPt : o.labelEn,
                C.brand,
              ))}
            </div>
          </div>

          {/* Verification channel */}
          <div>
            {section(lang === "pt" ? "Canal de verificação" : "Verification channel")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {pill(activeChannels.length === 0, () => setActiveChannels([]), lang === "pt" ? "Todos" : "All")}
              {CHANNEL_OPTS.map(o => pill(
                activeChannels.includes(o.key),
                () => toggleChannel(o.key),
                o.label,
                o.bg,
              ))}
            </div>
          </div>

          {/* Price range */}
          <div>
            {section(lang === "pt" ? "Faixa de entrada" : "Entry price range")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {pill(priceFilter === null, () => setPriceFilter(null), lang === "pt" ? "Qualquer" : "Any")}
              {PRICE_OPTS.map(o => pill(
                priceFilter === o.key,
                () => setPriceFilter(priceFilter === o.key ? null : o.key),
                lang === "pt" ? o.labelPt : o.labelEn,
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            {section(lang === "pt" ? "Duração do deal" : "Deal duration")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {pill(durFilter === null, () => setDurFilter(null), lang === "pt" ? "Qualquer" : "Any")}
              {DUR_OPTS.map(o => pill(
                durFilter === o.key,
                () => setDurFilter(durFilter === o.key ? null : o.key),
                lang === "pt" ? o.labelPt : o.labelEn,
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

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
  const [unreadCount,    setUnreadCount]    = useState(0)
  const [showFilters,    setShowFilters]    = useState(false)
  const [activeChannels, setActiveChannels] = useState<VerifType[]>([])
  const [priceFilter,    setPriceFilter]    = useState<PriceFilter>(null)
  const [durFilter,      setDurFilter]      = useState<DurFilter>(null)
  const [sortOrder,      setSortOrder]      = useState<SortOption>(null)

  const viewingMyDeals = activeMainTab === "meus"

  const priceOpt = PRICE_OPTS.find(o => o.key === priceFilter)

  const filteredDeals = deals
    .filter((d) => !viewingMyDeals  || d.isParticipating)
    .filter((d) => !activeStatus    || d.status === activeStatus)
    .filter((d) => !activeDealType  || d.type   === activeDealType)
    .filter((d) => !searchQuery     || d.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((d) => activeChannels.length === 0 || d.verifications.some(v => activeChannels.includes(v)))
    .filter((d) => !priceOpt?.min   || d.valuePerPerson >= priceOpt.min)
    .filter((d) => !priceOpt?.max   || d.valuePerPerson <= priceOpt.max)
    .filter((d) => !durFilter       || checkDuration(d.daysTotal, durFilter))
    .sort((a, b) => {
      switch (sortOrder) {
        case "entry_asc":  return a.valuePerPerson - b.valuePerPerson
        case "entry_desc": return b.valuePerPerson - a.valuePerPerson
        case "pot_asc":    return a.pot - b.pot
        case "pot_desc":   return b.pot - a.pot
        case "start_asc":  return (a.daysToStart ?? 9999) - (b.daysToStart ?? 9999)
        default: return 0
      }
    })

  const advancedFilterCount = [
    activeChannels.length > 0,
    priceFilter !== null,
    durFilter   !== null,
    sortOrder   !== null,
  ].filter(Boolean).length

  function resetAdvancedFilters() {
    setActiveChannels([]); setPriceFilter(null); setDurFilter(null); setSortOrder(null)
  }

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

  // Unread notification count + live badge via Realtime
  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    ;(supabase.from("notifications") as any)
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false)
      .then(({ count: c }: { count: number | null }) => setUnreadCount(c ?? 0))
    const ch = supabase
      .channel(`notif-badge:${userId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${userId}`,
      }, () => setUnreadCount(prev => prev + 1))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId])

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, display: "flex", flexDirection: "column", paddingBottom: 90 }}>

      <NotificationPopover isOpen={showNotif} onClose={() => setShowNotif(false)} userId={userId} />
      <ProfilePopover isOpen={showProfile} onClose={() => setShowProfile(false)} profile={profile} userId={userId} onOpenNotif={() => { setShowNotif(true); setUnreadCount(0) }} />

      {/* ── TOP BAR ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 30, background: C.bg, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 8px" }}>
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
          <div style={{ position: "relative", width: 34, height: 34, flexShrink: 0 }}>
            <button onClick={() => setShowProfile(!showProfile)} style={{ width: 34, height: 34, background: C.brand, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${C.surface}`, cursor: "pointer", overflow: "hidden", padding: 0 }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{initials}</span>}
            </button>
            {/* Level badge — bottom right */}
            <div style={{ position: "absolute", bottom: -4, right: -4, background: C.brand, color: "#fff", borderRadius: 100, fontSize: 8, fontWeight: 700, padding: "1px 4px", border: `1px solid ${C.bg}`, ...MONO }}>
              {level}
            </div>
            {/* Unread notifications badge — top left */}
            {unreadCount > 0 && (
              <div style={{ position: "absolute", top: -3, left: -3, minWidth: 16, height: 16, background: "#EF4444", borderRadius: 100, border: `2px solid ${C.bg}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", padding: "0 2px", ...MONO }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </div>
            )}
          </div>
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
      <HeroBanner lang={lang} />

      {/* ── MAIN TABS ── */}
      <div style={{ display: "flex", gap: 6, padding: "0 20px 11px" }}>
        {MAIN_TABS.map(tab => {
          const isActive = activeMainTab === tab.key
          return (
            <button key={tab.key}
              onClick={() => { setActiveMainTab(tab.key); setActiveDealType(null); setActiveStatus(null); setSearchQuery(""); setShowSearch(false); resetAdvancedFilters() }}
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

      {/* ── FILTER ROW (single line, Notion-style) ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 20px 11px", overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>

        {/* 1. Filters button — always first */}
        <button
          onClick={() => setShowFilters(true)}
          style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: advancedFilterCount > 0 ? C.activeLight : C.surface2, border: `1px solid ${advancedFilterCount > 0 ? C.activeBorder : C.border}`, color: advancedFilterCount > 0 ? C.brand : C.mid, cursor: "pointer", whiteSpace: "nowrap" as const }}
        >
          <SlidersHorizontal style={{ width: 12, height: 12 }} />
          {lang === "pt" ? "Filtros" : "Filters"}
          {advancedFilterCount > 0 && (
            <span style={{ background: C.brand, color: "#fff", borderRadius: 100, padding: "1px 6px", fontSize: 9, fontWeight: 700 }}>{advancedFilterCount}</span>
          )}
        </button>

        {/* Divider */}
        <div style={{ flexShrink: 0, width: 1, height: 16, background: C.border, margin: "0 3px" }} />

        {/* 2. Search */}
        <button onClick={() => setShowSearch(s => !s)} style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 7, background: showSearch ? C.activeLight : C.surface2, border: `1px solid ${showSearch ? C.activeBorder : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Search style={{ width: 13, height: 13, stroke: showSearch ? C.brand : C.dim, fill: "none" }} />
        </button>

        {/* Divider */}
        <div style={{ flexShrink: 0, width: 1, height: 16, background: C.border, margin: "0 3px" }} />

        {/* 3. Status section */}
        {STATUS_PILLS.map(p => {
          const cnt = countByStatus(p.key)
          const isActive = activeStatus === p.key
          return (
            <button key={p.key} onClick={() => setActiveStatus(isActive ? null : p.key)}
              style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 7, fontSize: 12, fontWeight: 500, background: isActive ? (p.key === "pendente" ? C.formingLight : p.key === "ativo" ? C.activeLight : C.closedLight) : C.surface2, border: `1px solid ${isActive ? (p.key === "pendente" ? C.formingBorder : p.key === "ativo" ? C.activeBorder : C.closedBorder) : C.border}`, color: isActive ? p.color : C.mid, cursor: "pointer", whiteSpace: "nowrap" as const }}>
              {lang === "pt" ? p.labelPt : p.labelEn}
              {cnt > 0 && <span style={{ background: isActive ? "rgba(0,0,0,0.1)" : C.border, borderRadius: 100, padding: "0px 5px", fontSize: 10, fontWeight: 600, color: isActive ? p.color : C.dim }}>{cnt}</span>}
            </button>
          )
        })}

        {/* Divider */}
        <div style={{ flexShrink: 0, width: 1, height: 16, background: C.border, margin: "0 3px" }} />

        {/* 4. Type section (Public / Private) */}
        {TYPE_PILLS.map(p => {
          const isActive = activeDealType === p.key
          const isPrivate = p.key === "privado"
          const accent = isPrivate ? "#7C3AED" : C.brand
          return (
            <button key={p.key} onClick={() => setActiveDealType(isActive ? null : p.key)}
              style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 7, fontSize: 12, fontWeight: 500, background: isActive ? (isPrivate ? "rgba(124,58,237,0.1)" : C.activeLight) : C.surface2, border: `1px solid ${isActive ? (isPrivate ? "rgba(124,58,237,0.3)" : C.activeBorder) : C.border}`, color: isActive ? accent : C.mid, cursor: "pointer", whiteSpace: "nowrap" as const }}>
              {isPrivate && <Lock style={{ width: 9, height: 9 }} />}
              {lang === "pt" ? p.labelPt : p.labelEn}
            </button>
          )
        })}

        {/* 5. Sort chip — only shown when a sort is active */}
        {sortOrder && (
          <>
            <div style={{ flexShrink: 0, width: 1, height: 16, background: C.border, margin: "0 3px" }} />
            <button onClick={() => setShowFilters(true)}
              style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 7, fontSize: 12, fontWeight: 500, background: C.activeLight, border: `1px solid ${C.activeBorder}`, color: C.brand, cursor: "pointer", whiteSpace: "nowrap" as const }}>
              <ArrowUpDown style={{ width: 11, height: 11 }} />
              {SORT_OPTS.find(o => o.key === sortOrder)?.[lang === "pt" ? "labelPt" : "labelEn"]}
            </button>
          </>
        )}

      </div>

      {showFilters && (
        <FilterSortSheet
          lang={lang}
          activeChannels={activeChannels} setActiveChannels={setActiveChannels}
          priceFilter={priceFilter}       setPriceFilter={setPriceFilter}
          durFilter={durFilter}           setDurFilter={setDurFilter}
          sortOrder={sortOrder}           setSortOrder={setSortOrder}
          onClose={() => setShowFilters(false)}
          onReset={resetAdvancedFilters}
        />
      )}

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
