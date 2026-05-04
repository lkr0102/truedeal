"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Share2, ShieldCheck, ChevronRight, ChevronDown, Check, Clock,
  BarChart2, ExternalLink,
} from "lucide-react"

function XLogo({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" />
    </svg>
  )
}
import { GlassCard } from "@/components/td-ui"

// ── Types ──────────────────────────────────────────────────────────────────────

interface DailyEntry {
  day: number
  label: string
  value: number
  delta: number
  verified: boolean
}

interface Player {
  id: number
  initials: string
  name: string
  username: string
  color: string
  bg: string
  rank: number
  isMe: boolean
  currentValue: number
  startValue: number
  streak: number
  weekStreak: number
  dailyLog: DailyEntry[]
  verifyLink: string
}

// ── Mock data ──────────────────────────────────────────────────────────────────

const DEAL = {
  title: "Quem ganha + seguidores",
  subtitle: "X (Twitter) · 2 participantes",
  pot: "R$150",
  perPerson: "R$75",
  daysGone: 18,
  daysTotal: 30,
  endDate: "15 Mai 2026",
  rules: [
    "Snapshot inicial capturado no dia 1 via API do X.",
    "Medição automática a cada 24h às 09:00 BRT.",
    "Vence quem tiver maior crescimento percentual ao final.",
    "Empate: maior número absoluto ganha o pot.",
    "Trapaças verificadas pelo árbitro True Deal invalidam o participante.",
  ],
}

const PLAYERS: Player[] = [
  {
    id: 1, initials: "LR", name: "Lukas Rocha", username: "@lukasrocha",
    color: "#4AABFF", bg: "#1A2E3A", rank: 1, isMe: true,
    currentValue: 13210, startValue: 12840, streak: 7, weekStreak: 5,
    dailyLog: [
      { day: 16, label: "Seg 13/Mai", value: 13050, delta: 80, verified: true },
      { day: 17, label: "Ter 14/Mai", value: 13130, delta: 80, verified: true },
      { day: 18, label: "Qua 15/Mai", value: 13210, delta: 80, verified: true },
    ],
    verifyLink: "https://x.com/lukasrocha",
  },
  {
    id: 2, initials: "MC", name: "Maria Costa", username: "@mariac",
    color: "#BF4ADF", bg: "#2E1A2E", rank: 2, isMe: false,
    currentValue: 8610, startValue: 8400, streak: 5, weekStreak: 3,
    dailyLog: [
      { day: 16, label: "Seg 13/Mai", value: 8520, delta: 60, verified: true },
      { day: 17, label: "Ter 14/Mai", value: 8570, delta: 50, verified: true },
      { day: 18, label: "Qua 15/Mai", value: 8610, delta: 40, verified: true },
    ],
    verifyLink: "https://x.com/mariac",
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function growthPct(p: Player) {
  return (((p.currentValue - p.startValue) / p.startValue) * 100).toFixed(2)
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

// ── Countdown ─────────────────────────────────────────────────────────────────

function useCountdown(d: number, h: number, m: number, s: number) {
  const [time, setTime] = useState({ days: d, hours: h, minutes: m, seconds: s })
  useEffect(() => {
    const t = setInterval(() => {
      setTime((prev) => {
        let { days, hours, minutes, seconds } = prev
        seconds--
        if (seconds < 0) { seconds = 59; minutes-- }
        if (minutes < 0) { minutes = 59; hours-- }
        if (hours   < 0) { hours   = 23; days--  }
        if (days    < 0) { clearInterval(t); return { days: 0, hours: 0, minutes: 0, seconds: 0 } }
        return { days, hours, minutes, seconds }
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])
  return time
}

// ── Player card ────────────────────────────────────────────────────────────────

function PlayerCard({
  player, expanded, onToggle,
}: { player: Player; expanded: boolean; onToggle: () => void }) {
  const pct   = growthPct(player)
  const delta = player.currentValue - player.startValue

  return (
    <GlassCard
      accent={player.isMe ? "#16A34A" : undefined}
      style={{
        overflow: "hidden",
        background: player.isMe ? "rgba(22,163,74,0.05)" : undefined,
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: "100%", padding: 14,
          display: "flex", gap: 12, alignItems: "center",
          background: "none", border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        {/* Rank */}
        <div style={{ width: 24, textAlign: "center", flexShrink: 0 }}>
          <span style={{ fontWeight: 900, fontSize: 16, color: player.rank === 1 ? "#16A34A" : "#9CA3AF" }}>
            #{player.rank}
          </span>
        </div>

        {/* Avatar */}
        <div style={{
          width: 44, height: 44, borderRadius: 13, flexShrink: 0,
          background: `linear-gradient(135deg,${player.bg},${player.bg}CC)`,
          border: `2px solid ${player.color}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: player.color }}>{player.initials}</span>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: "#1f2937", fontSize: 13 }}>{player.name}</span>
            {player.isMe && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 100,
                background: "rgba(22,163,74,0.15)", color: "#16A34A",
              }}>
                Você
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#9CA3AF" }}>
            {player.username} · {player.streak}🔥
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2, color: delta >= 0 ? "#16A34A" : "#EF4444" }}>
            {delta >= 0 ? "+" : ""}{delta.toLocaleString("pt-BR")} seguidores
          </div>
        </div>

        {/* Value + growth */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>
            {player.currentValue.toLocaleString("pt-BR")}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: Number(pct) > 0 ? "#16A34A" : "#EF4444" }}>
            +{pct}%
          </div>
        </div>

        {expanded
          ? <ChevronDown size={14} color="#9CA3AF" style={{ flexShrink: 0 }} />
          : <ChevronRight size={14} color="#9CA3AF" style={{ flexShrink: 0 }} />}
      </button>

      {/* Expanded */}
      {expanded && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
          {/* Mini stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "10px 0 10px" }}>
            {[
              { label: "Início",  value: player.startValue.toLocaleString("pt-BR") },
              { label: "Atual",   value: player.currentValue.toLocaleString("pt-BR") },
              { label: "Streak",  value: `${player.weekStreak}/7d` },
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

          {/* Daily log */}
          <div style={{
            fontSize: 10, fontWeight: 700, color: "#9CA3AF",
            textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8,
          }}>
            Histórico recente
          </div>
          {player.dailyLog.map((entry, i) => (
            <div key={entry.day} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "7px 0",
              borderBottom: i < player.dailyLog.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
            }}>
              <span style={{ fontSize: 12, color: "#374151" }}>{entry.label}</span>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#6B7280" }}>{entry.value.toLocaleString("pt-BR")}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#16A34A" }}>+{entry.delta}</span>
                {entry.verified
                  ? (
                    <div style={{
                      width: 16, height: 16, borderRadius: "50%",
                      background: "rgba(22,163,74,0.12)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Check size={9} color="#16A34A" />
                    </div>
                  )
                  : <Clock size={13} color="#D1D5DB" />}
              </div>
            </div>
          ))}

          {/* Verify link */}
          <a
            href={player.verifyLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 8,
              marginTop: 10, padding: "9px 12px", borderRadius: 12,
              background: "rgba(255,255,255,0.5)",
              border: "1px solid rgba(22,163,74,0.25)",
              color: "#16A34A", fontSize: 12, fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <XLogo size={13} />
            Ver perfil no X
            <ExternalLink size={11} style={{ marginLeft: "auto" }} />
          </a>
        </div>
      )}
    </GlassCard>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function TrackingPage() {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<number | null>(1)
  const [rulesOpen, setRulesOpen]   = useState(false)

  const daysLeft = DEAL.daysTotal - DEAL.daysGone
  const progress = DEAL.daysGone / DEAL.daysTotal
  const time     = useCountdown(daysLeft, 6, 34, 21)

  const TIME_UNITS = [
    { value: time.days,    label: "dias"  },
    { value: time.hours,   label: "horas" },
    { value: time.minutes, label: "min"   },
    { value: time.seconds, label: "seg"   },
  ]

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: "url('/images/gradient-background.jpg')",
        backgroundSize: "cover", backgroundPosition: "center",
        backgroundRepeat: "no-repeat", backgroundAttachment: "fixed",
      }}
    >
      {/* Header */}
      <div style={{ padding: "48px 20px 12px", display: "flex", gap: 12, alignItems: "center" }}>
        <button
          onClick={() => router.back()}
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}
        >
          <ArrowLeft size={18} color="#374151" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 16, fontWeight: 700, color: "#1f2937",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {DEAL.title}
          </div>
          <div style={{ fontSize: 11, color: "#6B7280" }}>{DEAL.subtitle}</div>
        </div>
        <button
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}
        >
          <Share2 size={16} color="#374151" />
        </button>
      </div>

      {/* Content */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "0 20px", paddingBottom: 32,
        display: "flex", flexDirection: "column", gap: 14,
      }}>

        {/* 4-stat grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { value: DEAL.pot,                                label: "Pot total",   color: "#16A34A" },
            { value: DEAL.perPerson,                          label: "Por pessoa",  color: "#374151" },
            { value: `${daysLeft}d`,                          label: "Restantes",   color: "#374151" },
            { value: `${DEAL.daysGone}/${DEAL.daysTotal}d`,   label: "Decorridos",  color: "#6B7280" },
          ].map(({ value, label, color }, i) => (
            <GlassCard key={i} style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: 18, fontWeight: 900, color }}>{value}</div>
              <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{label}</div>
            </GlassCard>
          ))}
        </div>

        {/* Countdown */}
        <GlassCard style={{ padding: "16px 14px" }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: "#9CA3AF",
            textTransform: "uppercase", letterSpacing: "0.08em",
            textAlign: "center", marginBottom: 12,
          }}>
            Tempo restante
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
            {TIME_UNITS.map(({ value, label }, i) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "linear-gradient(135deg,rgba(22,163,74,0.12),rgba(34,197,94,0.06))",
                    border: "1px solid rgba(22,163,74,0.2)",
                  }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: "#16A34A", fontVariantNumeric: "tabular-nums" }}>
                      {pad(value)}
                    </span>
                  </div>
                  <span style={{ fontSize: 9, color: "#9CA3AF", marginTop: 4 }}>{label}</span>
                </div>
                {i < 3 && <span style={{ fontSize: 18, color: "#D1D5DB", marginBottom: 16 }}>:</span>}
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Progress bar */}
        <GlassCard style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Progresso do deal</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#16A34A" }}>
              {Math.round(progress * 100)}%
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 100, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${progress * 100}%`,
              background: "linear-gradient(90deg,#16A34A,#22C55E)",
              borderRadius: 100, transition: "width 0.7s ease",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 10, color: "#9CA3AF" }}>Dia {DEAL.daysGone}</span>
            <span style={{ fontSize: 10, color: "#9CA3AF" }}>
              Termina em {daysLeft}d ({DEAL.endDate})
            </span>
          </div>
        </GlassCard>

        {/* Rules accordion */}
        <GlassCard style={{ padding: 14 }}>
          <button
            onClick={() => setRulesOpen(v => !v)}
            style={{
              width: "100%", display: "flex", justifyContent: "space-between",
              alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldCheck size={16} color="#16A34A" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1f2937" }}>Regras do Deal</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: "#16A34A", fontWeight: 600 }}>Árbitro True Deal</span>
              <ChevronDown
                size={14} color="#9CA3AF"
                style={{ transform: rulesOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
              />
            </div>
          </button>
          {rulesOpen && (
            <div style={{ marginTop: 10, borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: 10 }}>
              {DEAL.rules.map((rule, i) => (
                <div key={i} style={{
                  display: "flex", gap: 10, padding: "6px 0",
                  borderTop: i > 0 ? "1px solid rgba(0,0,0,0.04)" : "none",
                }}>
                  <span style={{ fontSize: 11, color: "#16A34A", fontWeight: 700, flexShrink: 0 }}>
                    {i + 1}.
                  </span>
                  <span style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>{rule}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Live ranking */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BarChart2 size={15} color="#16A34A" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>Ranking ao vivo</span>
          <div
            className="animate-pulse"
            style={{ width: 7, height: 7, borderRadius: "50%", background: "#16A34A", marginLeft: "auto" }}
          />
          <span style={{ fontSize: 10, color: "#9CA3AF" }}>atualizado agora</span>
        </div>

        {[...PLAYERS].sort((a, b) => a.rank - b.rank).map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            expanded={expandedId === player.id}
            onToggle={() => setExpandedId(expandedId === player.id ? null : player.id)}
          />
        ))}

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
          <button
            style={{
              width: "100%", padding: "14px", borderRadius: 16, cursor: "pointer",
              background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.6)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontSize: 14, fontWeight: 600, color: "#374151",
            }}
          >
            <Share2 size={16} />
            Compartilhar placar
          </button>
          <button
            onClick={() => router.push("/result")}
            style={{
              width: "100%", padding: "14px", borderRadius: 16, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg,#0D2E1A,#1A5A2A)",
              boxShadow: "0 8px 32px rgba(22,163,74,0.35)",
              fontSize: 14, fontWeight: 700, color: "white",
            }}
          >
            Ver resultado final →
          </button>
        </div>
      </div>
    </div>
  )
}
