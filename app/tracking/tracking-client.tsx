"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { differenceInCalendarDays, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ArrowLeft, Share2, ShieldCheck, ChevronRight, ChevronDown, BarChart2,
} from "lucide-react"
import { GlassCard } from "@/components/td-ui"
import type { DealWithParticipants } from "@/lib/supabase/types"

const PLAYER_COLORS = ["#4AABFF", "#BF4ADF", "#16A34A", "#F59E0B", "#EF4444", "#10B981"]
const PLAYER_BG    = ["#1A2E3A", "#2E1A2E", "#1A2E1A", "#2E2A1A", "#2E1A1A", "#1A2E26"]

const VERIFICATION_SUBRULES: Record<string, { title: string; items: string[]; hint?: string }> = {
  post:             { title: "Sub-regras — Post publicado", items: ["Conta pública no X", "Mais de 100 caracteres por post", "Conteúdo único — sem repetições dentro do período"] },
  comment_received: { title: "Sub-regras — Comentário recebido", items: ["Ganho líquido de comentários por janela de frequência"] },
  repost_received:  { title: "Sub-regras — Repost recebido", items: ["Ganho líquido de reposts por janela de frequência"] },
  follower_gained:  { title: "Sub-regras — Seguidor recebido", items: ["Novos seguidores líquidos por janela de frequência"] },
  impressions:      { title: "Sub-regras — Impressões", items: ["Total de impressões nos posts da janela de frequência"] },
  km_run:           { title: "Sub-regras — Kms percorridos", items: ["Apenas atividades do tipo Corrida (Run)", "Soma dos KMs registrados na janela de frequência"] },
  pace:             { title: "Pace médio — como é avaliado", items: ["Pace médio das corridas ≤ valor configurado pelo criador", "Medido em min/km · quanto menor, mais rápido", "Exemplo: pace 5 = 5 min 0 seg por km"], hint: "⏱ Pace mais baixo = você correu mais rápido" },
  workout_hours:    { title: "Sub-regras — Horas de treino", items: ["Soma das horas de todas as atividades registradas na janela"] },
  checkin:          { title: "Sub-regras — Check-ins", items: ["Número de check-ins em academias ou locais parceiros por janela"] },
  different_venues: { title: "Sub-regras — Diferentes ambientes", items: ["Número de locais distintos visitados por janela"] },
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
}

function pad(n: number) { return String(n).padStart(2, "0") }

function useCountdown(endDateISO: string) {
  const calc = () => {
    const diff = Math.max(0, new Date(endDateISO).getTime() - Date.now())
    const s = Math.floor(diff / 1000)
    return {
      days:    Math.floor(s / 86400),
      hours:   Math.floor((s % 86400) / 3600),
      minutes: Math.floor((s % 3600) / 60),
      seconds: s % 60,
    }
  }
  const [t, setT] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000)
    return () => clearInterval(id)
  }, [endDateISO]) // eslint-disable-line react-hooks/exhaustive-deps
  return t
}

interface MappedPlayer {
  id: string
  initials: string
  name: string
  username: string
  color: string
  bg: string
  rank: number
  isMe: boolean
  currentValue: number
  startValue: number
  hasData: boolean
}

function PlayerCard({
  player, expanded, onToggle,
}: { player: MappedPlayer; expanded: boolean; onToggle: () => void }) {
  const delta   = player.currentValue - player.startValue
  const pctStr  = player.hasData && player.startValue > 0
    ? `${((delta / player.startValue) * 100).toFixed(2)}%`
    : "—"
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
            #{player.rank}
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
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: "#1f2937", fontSize: 13 }}>{player.name}</span>
            {player.isMe && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 100,
                background: "rgba(22,163,74,0.15)", color: "#16A34A",
              }}>Você</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#9CA3AF" }}>{player.username}</div>
          {player.hasData && (
            <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2, color: delta >= 0 ? "#16A34A" : "#EF4444" }}>
              {deltaStr} pts
            </div>
          )}
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {player.hasData ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>
                {player.currentValue.toLocaleString("pt-BR")}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: delta >= 0 ? "#16A34A" : "#EF4444" }}>
                {pctStr}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>sem dados</div>
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
                { label: "Início", value: player.startValue.toLocaleString("pt-BR") },
                { label: "Atual",  value: player.currentValue.toLocaleString("pt-BR") },
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
              Dados de tracking ainda não disponíveis
            </p>
          )}
        </div>
      )}
    </GlassCard>
  )
}

export default function TrackingClient({
  deal,
  userId,
}: {
  deal: DealWithParticipants | null
  userId: string | null
}) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rulesOpen,  setRulesOpen]  = useState(false)

  const endISO = deal?.end_date ?? new Date().toISOString()
  const time   = useCountdown(endISO)

  if (!deal) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{
          backgroundImage: "url('/images/gradient-background.jpg')",
          backgroundSize: "cover", backgroundPosition: "center",
        }}
      >
        <p style={{ fontSize: 16, fontWeight: 700, color: "#374151" }}>Deal não encontrado</p>
        <button
          onClick={() => router.push("/")}
          style={{
            padding: "10px 24px", borderRadius: 12,
            background: "#16A34A", color: "white",
            fontWeight: 600, border: "none", cursor: "pointer",
          }}
        >
          Voltar ao início
        </button>
      </div>
    )
  }

  const now       = new Date()
  const startDate = new Date(deal.start_date)
  const endDate   = new Date(deal.end_date)
  const daysTotal = Math.max(1, differenceInCalendarDays(endDate, startDate))
  const daysGone  = Math.max(0, Math.min(daysTotal, differenceInCalendarDays(now, startDate)))
  const daysLeft  = Math.max(0, daysTotal - daysGone)
  const progress  = daysGone / daysTotal
  const endDateStr = format(endDate, "dd MMM yyyy", { locale: ptBR })

  const TIME_UNITS = [
    { value: time.days,    label: "dias"  },
    { value: time.hours,   label: "horas" },
    { value: time.minutes, label: "min"   },
    { value: time.seconds, label: "seg"   },
  ]

  const players: MappedPlayer[] = deal.participants
    .map((p, i) => {
      const name     = p.profile.display_name || p.profile.username
      const startVal = p.start_snapshot   ? (Object.values(p.start_snapshot)[0]   as number ?? 0) : 0
      const currVal  = p.current_snapshot ? (Object.values(p.current_snapshot)[0] as number ?? 0) : 0
      return {
        id:           p.id,
        initials:     getInitials(name),
        name,
        username:     `@${p.profile.username}`,
        color:        PLAYER_COLORS[i % PLAYER_COLORS.length],
        bg:           PLAYER_BG[i % PLAYER_COLORS.length],
        rank:         p.rank ?? (i + 1),
        isMe:         p.user_id === userId,
        currentValue: currVal,
        startValue:   startVal,
        hasData:      p.start_snapshot !== null || p.current_snapshot !== null,
      }
    })
    .sort((a, b) => a.rank - b.rank)

  const pot      = `$${deal.pot_total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
  const perPerson = `$${deal.entry_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
  const subtitle  = `${deal.participant_count} participante${deal.participant_count !== 1 ? "s" : ""}`
  const rules     = deal.description
    ? deal.description.split("\n").map(l => l.trim()).filter(Boolean)
    : []

  const btnBase: React.CSSProperties = {
    width: 36, height: 36, borderRadius: 10,
    background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
  }

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
        <button onClick={() => { if (window.history.length > 1) { router.back() } else { router.push("/") } }} style={btnBase}>
          <ArrowLeft size={18} color="#374151" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 16, fontWeight: 700, color: "#1f2937",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {deal.title}
          </div>
          <div style={{ fontSize: 11, color: "#6B7280" }}>{subtitle}</div>
        </div>
        <button style={btnBase}>
          <Share2 size={16} color="#374151" />
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "0 20px", paddingBottom: 32,
        display: "flex", flexDirection: "column", gap: 14,
      }}>

        {/* 4-stat grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { value: pot,                               label: "Pot total",  color: "#16A34A" },
            { value: perPerson,                         label: "Por pessoa", color: "#374151" },
            { value: `${daysLeft}d`,                    label: "Restantes",  color: "#374151" },
            { value: `${daysGone}/${daysTotal}d`,        label: "Decorridos", color: "#6B7280" },
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
            <span style={{ fontSize: 10, color: "#9CA3AF" }}>Dia {daysGone}</span>
            <span style={{ fontSize: 10, color: "#9CA3AF" }}>
              Termina em {daysLeft}d ({endDateStr})
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
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1f2937" }}>Regras de verificação</span>
            </div>
            <ChevronDown
              size={14} color="#9CA3AF"
              style={{ transform: rulesOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
            />
          </button>
          {rulesOpen && (
            <div style={{ marginTop: 10, borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: 10 }}>
              {deal.verification_type && VERIFICATION_SUBRULES[deal.verification_type] ? (
                <>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#3B82F6", marginBottom: 8 }}>
                    {VERIFICATION_SUBRULES[deal.verification_type].title}
                  </p>
                  {VERIFICATION_SUBRULES[deal.verification_type].items.map((item, i) => (
                    <div key={i} style={{
                      display: "flex", gap: 8, padding: "5px 0",
                      borderTop: i > 0 ? "1px solid rgba(0,0,0,0.04)" : "none",
                    }}>
                      <span style={{ color: "#3B82F6", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                  {VERIFICATION_SUBRULES[deal.verification_type].hint && (
                    <p style={{ fontSize: 11, color: "#D97706", fontWeight: 600, marginTop: 8 }}>
                      {VERIFICATION_SUBRULES[deal.verification_type].hint}
                    </p>
                  )}
                </>
              ) : rules.length > 0 ? (
                rules.map((line, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 10, padding: "6px 0",
                    borderTop: i > 0 ? "1px solid rgba(0,0,0,0.04)" : "none",
                  }}>
                    <span style={{ fontSize: 11, color: "#16A34A", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                    <span style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>{line}</span>
                  </div>
                ))
              ) : null}
              <div style={{
                marginTop: 12, padding: "10px 12px", borderRadius: 10,
                background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#EF4444", marginBottom: 4 }}>
                  ⚠️ Regra estrita por janela
                </p>
                <p style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.5 }}>
                  A meta deve ser cumprida em <strong>cada janela de frequência</strong>.
                  Uma janela perdida = <strong>eliminação permanente</strong>.
                </p>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Compliance warning */}
        <div style={{
          padding: "12px 14px", borderRadius: 12,
          background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#EF4444", marginBottom: 4 }}>
            ⚠️ Regra estrita por janela de frequência
          </p>
          <p style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.5 }}>
            Cumpra a meta em <strong>cada janela</strong>. Uma falha = <strong>eliminado permanentemente</strong>.
          </p>
        </div>

        {/* Live ranking label */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BarChart2 size={15} color="#16A34A" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>Ranking ao vivo</span>
          <div
            className="animate-pulse"
            style={{ width: 7, height: 7, borderRadius: "50%", background: "#16A34A", marginLeft: "auto" }}
          />
          <span style={{ fontSize: 10, color: "#9CA3AF" }}>atualizado agora</span>
        </div>

        {players.map(player => (
          <PlayerCard
            key={player.id}
            player={player}
            expanded={expandedId === player.id}
            onToggle={() => setExpandedId(expandedId === player.id ? null : player.id)}
          />
        ))}

        {/* Share action */}
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
          {deal.status === "finalizado" && (
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
          )}
        </div>

      </div>
    </div>
  )
}
