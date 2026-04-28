"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Share2, ChevronDown, ChevronUp, ExternalLink,
  Flame, Trophy, Users, DollarSign, Target, CheckCircle2,
  XCircle, Clock, TrendingUp, Twitter, Activity,
  ShieldCheck, AlertCircle, BarChart2,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────────

interface DailyEntry { day: number; label: string; value: number; verified: boolean; delta: number }

interface Player {
  id: number
  initials: string
  name: string
  username: string
  color: string
  bg: string
  rank: number
  isMe: boolean
  isLeader: boolean
  eliminated: boolean
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
  pot: "R$ 150",
  perPerson: "R$ 75",
  participants: 2,
  active: 2,
  eliminated: 0,
  daysTotal: 30,
  daysGone: 18,
  endDate: "15 Mai 2025",
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
    color: "#4AABFF", bg: "#1A2E3A", rank: 1, isMe: true, isLeader: true, eliminated: false,
    currentValue: 13210, startValue: 12840, streak: 7, weekStreak: 5,
    dailyLog: [
      { day: 16, label: "Seg 13/Mai", value: 13050, verified: true,  delta: 80  },
      { day: 17, label: "Ter 14/Mai", value: 13130, verified: true,  delta: 80  },
      { day: 18, label: "Qua 15/Mai", value: 13210, verified: true,  delta: 80  },
    ],
    verifyLink: "https://x.com/lukasrocha",
  },
  {
    id: 2, initials: "MC", name: "Maria Costa", username: "@mariac",
    color: "#BF4ADF", bg: "#2E1A2E", rank: 2, isMe: false, isLeader: false, eliminated: false,
    currentValue: 8610, startValue: 8400, streak: 5, weekStreak: 3,
    dailyLog: [
      { day: 16, label: "Seg 13/Mai", value: 8520, verified: true,  delta: 60  },
      { day: 17, label: "Ter 14/Mai", value: 8570, verified: true,  delta: 50  },
      { day: 18, label: "Qua 15/Mai", value: 8610, verified: true,  delta: 40  },
    ],
    verifyLink: "https://x.com/mariac",
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function growth(p: Player) {
  return (((p.currentValue - p.startValue) / p.startValue) * 100).toFixed(2)
}

function pad(n: number) { return String(n).padStart(2, "0") }

// ── Countdown ─────────────────────────────────────────────────────────────────

function useCountdown(daysLeft: number, hoursLeft: number, minutesLeft: number, secondsLeft: number) {
  const [time, setTime] = useState({ days: daysLeft, hours: hoursLeft, minutes: minutesLeft, seconds: secondsLeft })
  useEffect(() => {
    const t = setInterval(() => {
      setTime((prev) => {
        let { days, hours, minutes, seconds } = prev
        seconds--
        if (seconds < 0) { seconds = 59; minutes-- }
        if (minutes < 0) { minutes = 59; hours-- }
        if (hours < 0)   { hours = 23;   days-- }
        if (days < 0) { clearInterval(t); return { days: 0, hours: 0, minutes: 0, seconds: 0 } }
        return { days, hours, minutes, seconds }
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])
  return time
}

// ── Player Card ────────────────────────────────────────────────────────────────

function PlayerCard({ player }: { player: Player }) {
  const [expanded, setExpanded] = useState(player.isMe)
  const growthPct = growth(player)
  const delta = player.currentValue - player.startValue

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: player.isLeader ? "rgba(61,191,106,0.08)" : player.eliminated ? "rgba(255,74,74,0.05)" : "rgba(255,255,255,0.45)",
        backdropFilter: "blur(20px)",
        border: player.isLeader ? "1.5px solid rgba(61,191,106,0.35)" : player.eliminated ? "1px solid rgba(255,74,74,0.25)" : "1px solid rgba(255,255,255,0.55)",
        opacity: player.eliminated ? 0.6 : 1,
      }}>

      {/* Header row */}
      <button className="w-full p-4 flex items-center gap-3" onClick={() => setExpanded(!expanded)}>
        {/* Rank badge */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm"
          style={{ background: player.rank === 1 ? "linear-gradient(135deg,#16A34A,#22C55E)" : "rgba(0,0,0,0.07)", color: player.rank === 1 ? "white" : "#6B7280" }}>
          {player.rank === 1 ? "🥇" : player.rank === 2 ? "🥈" : player.rank}
        </div>

        {/* Avatar */}
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `linear-gradient(135deg,${player.bg},${player.bg}AA)`, border: `2px solid ${player.color}` }}>
          <span className="font-bold text-sm" style={{ color: player.color }}>{player.initials}</span>
        </div>

        {/* Info */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-gray-800 text-sm">{player.name}</p>
            {player.isMe && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(22,163,74,0.15)", color: "#16A34A" }}>Você</span>}
            {player.eliminated && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,74,74,0.15)", color: "#FF4A4A" }}>Eliminado</span>}
          </div>
          <p className="text-xs text-gray-500">{player.username}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs font-semibold" style={{ color: delta >= 0 ? "#16A34A" : "#FF4A4A" }}>
              {delta >= 0 ? "+" : ""}{delta.toLocaleString("pt-BR")} seguidores
            </span>
            <span className="text-[10px] text-gray-400">({growthPct}%)</span>
          </div>
        </div>

        {/* Streak + expand */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs font-bold text-gray-600">{player.streak}🔥</span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
          {/* stats row */}
          <div className="grid grid-cols-3 gap-2 pt-3">
            {[
              { label: "Início",  value: player.startValue.toLocaleString("pt-BR") },
              { label: "Atual",   value: player.currentValue.toLocaleString("pt-BR") },
              { label: "Streak",  value: `${player.weekStreak}/7d` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-2 text-center"
                style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.6)" }}>
                <p className="font-bold text-gray-800 text-xs">{value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Daily log */}
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Progresso Diário</p>
            <div className="space-y-1.5">
              {player.dailyLog.map((entry) => (
                <div key={entry.day} className="flex items-center gap-3 py-1.5 px-2 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.4)" }}>
                  {entry.verified
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] flex-shrink-0" />
                    : <Clock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                  <span className="text-xs text-gray-500 flex-1">{entry.label}</span>
                  <span className="text-xs font-semibold text-gray-700">{entry.value.toLocaleString("pt-BR")}</span>
                  <span className="text-xs font-bold" style={{ color: entry.delta >= 0 ? "#16A34A" : "#FF4A4A" }}>
                    {entry.delta >= 0 ? "+" : ""}{entry.delta}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Verification link */}
          <a href={player.verifyLink} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all"
            style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(22,163,74,0.25)", color: "#16A34A" }}>
            <Twitter className="w-3.5 h-3.5" />
            Ver perfil no X
            <ExternalLink className="w-3 h-3 ml-auto" />
          </a>
        </div>
      )}
    </div>
  )
}

// ── Rules accordion ────────────────────────────────────────────────────────────

function RulesAccordion() {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.45)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.55)" }}>
      <button className="w-full px-4 py-3.5 flex items-center justify-between" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
          <span className="font-semibold text-gray-800 text-sm">Regras do Deal</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
          {DEAL.rules.map((rule, i) => (
            <div key={i} className="flex items-start gap-2.5 py-1">
              <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white mt-0.5"
                style={{ background: "#16A34A" }}>{i + 1}</span>
              <p className="text-xs text-gray-600 leading-relaxed">{rule}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function TrackingPage() {
  const router = useRouter()
  const time = useCountdown(DEAL.daysTotal - DEAL.daysGone, 6, 34, 21)

  const progressPct = (DEAL.daysGone / DEAL.daysTotal) * 100
  const myPlayer = PLAYERS.find(p => p.isMe)!

  const TIME_UNITS = [
    { value: time.days,    label: "dias" },
    { value: time.hours,   label: "horas" },
    { value: time.minutes, label: "min" },
    { value: time.seconds, label: "seg" },
  ]

  return (
    <div className="min-h-screen flex flex-col"
      style={{ backgroundImage: "url('/images/gradient-background.jpg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundAttachment: "fixed" }}>

      {/* Header */}
      <header className="px-5 pt-12 pb-2">
        <button onClick={() => router.push("/")} className="flex items-center gap-2 text-gray-600 mb-4">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium text-sm">Meus Deals</span>
        </button>
        <h1 className="text-xl font-bold text-gray-800">{DEAL.title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{DEAL.subtitle}</p>
      </header>

      <div className="flex-1 px-5 pb-10 space-y-4 mt-4">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: DollarSign, label: "Pot Total",    value: DEAL.pot,      color: "#16A34A" },
            { icon: Users,      label: "Participantes",value: `${DEAL.active}/${DEAL.participants}`, color: "#3B82F6" },
            { icon: Target,     label: "Sua posição",  value: `#${myPlayer.rank}`, color: "#F59E0B" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="rounded-2xl p-3 text-center"
              style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto mb-1.5" style={{ background: `${color}18` }}>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
              <p className="font-bold text-gray-800 text-sm">{value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Countdown */}
        <div className="rounded-3xl p-5 text-center"
          style={{ background: "rgba(255,255,255,0.45)", backdropFilter: "blur(30px) saturate(200%)", border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-4">Tempo Restante</p>
          <div className="flex justify-center gap-2">
            {TIME_UNITS.map(({ value, label }, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,rgba(22,163,74,0.15),rgba(123,123,255,0.1))", border: "1px solid rgba(22,163,74,0.25)" }}>
                    <span className="text-2xl font-black text-[#16A34A] font-mono">{pad(value)}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1">{label}</span>
                </div>
                {i < 3 && <span className="text-xl text-gray-300 mb-4">:</span>}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>Dia {DEAL.daysGone}</span>
              <span>Dia {DEAL.daysTotal}</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.07)" }}>
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${progressPct}%`, background: "linear-gradient(90deg,#16A34A,#22C55E)" }} />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Encerra em {DEAL.endDate}</p>
          </div>
        </div>

        {/* Eliminated indicator */}
        {DEAL.eliminated > 0 && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-2"
            style={{ background: "rgba(255,74,74,0.07)", border: "1px solid rgba(255,74,74,0.2)" }}>
            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600 font-semibold">{DEAL.eliminated} participante(s) eliminado(s)</p>
          </div>
        )}

        {/* Placar ao vivo */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-4 h-4 text-[#16A34A]" />
            <h2 className="text-sm font-bold text-gray-700">Placar ao vivo</h2>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-auto" />
            <span className="text-[10px] text-gray-400">atualizado agora</span>
          </div>
          <div className="space-y-3">
            {PLAYERS.sort((a, b) => a.rank - b.rank).map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        </div>

        {/* Rules */}
        <RulesAccordion />

        {/* Verification snapshots */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.45)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.55)" }}>
          <div className="px-4 py-3.5 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
            <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
            <span className="font-semibold text-gray-800 text-sm">Verificação</span>
          </div>
          <div className="p-2 space-y-1.5">
            {[
              "Ver snapshot inicial (Dia 1)",
              "Última atualização: hoje 09:00",
              "Histórico completo de medições",
            ].map((label) => (
              <button key={label} className="w-full px-3 py-3 flex items-center justify-between rounded-xl text-sm transition-all hover:scale-[1.01]"
                style={{ background: "rgba(255,255,255,0.5)", color: "#374151" }}>
                <span>{label}</span>
                <span className="text-[#16A34A]">→</span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button className="w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 text-gray-600"
            style={{ background: "rgba(255,255,255,0.45)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.55)" }}>
            <Share2 className="w-4 h-4" />
            Compartilhar placar
          </button>
          <button onClick={() => router.push("/result")}
            className="w-full py-4 rounded-2xl font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg,#0D2E1A,#1A5A2A)", boxShadow: "0 8px 32px rgba(22,163,74,0.35)" }}>
            Ver resultado final →
          </button>
        </div>
      </div>
    </div>
  )
}
