"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Home, Compass, Wallet, User,
  Star, Zap, Gift, UserPlus, Trophy, Search,
  X, TrendingUp, Award, Bell, MapPin, Clock, Flame,
  ChevronUp, ChevronDown, Minus, Handshake, Lock,
} from "lucide-react"
import { doCheckin } from "@/lib/actions/profile"
import type { Profile } from "@/lib/supabase/types"

// ── Nav ───────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { icon: Home,    label: "Deals",    href: "/" },
  { icon: Compass, label: "Explorar", href: "/explore" },
  { icon: Wallet,  label: "Wallet",   href: "/wallet" },
  { icon: User,    label: "Perfil",   href: "/profile" },
]

function BottomNav({ active }: { active: string }) {
  const router = useRouter()
  return (
    <nav className="fixed bottom-0 left-0 right-0 px-6 py-4 z-10"
      style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(40px) saturate(200%)", borderTop: "1px solid rgba(255,255,255,0.5)" }}>
      <div className="flex justify-around items-center">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = active === item.label
          return (
            <button key={item.label} onClick={() => router.push(item.href)}
              className="flex flex-col items-center gap-1 transition-all duration-300">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? "scale-110" : ""}`}
                style={{ background: isActive ? "linear-gradient(135deg,#16A34A,#22C55E)" : "transparent" }}>
                <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-500"}`} />
              </div>
              <span className={`text-xs font-medium ${isActive ? "text-[#16A34A]" : "text-gray-500"}`}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// ── Points sources (static) ───────────────────────────────────────────────────

const POINTS_SOURCES = [
  { icon: Zap,        label: "Participar de um Deal",    pts: "+75 🤝",  color: "#16A34A" },
  { icon: Star,       label: "Criar um Deal",            pts: "+100 🤝", color: "#F59E0B" },
  { icon: Trophy,     label: "Ganhar um Deal",           pts: "+200 🤝", color: "#3DBF6A" },
  { icon: MapPin,     label: "Check-in diário",          pts: "até 300 🤝", color: "#3B82F6" },
  { icon: TrendingUp, label: "Streak de 7 dias",         pts: "+150 🤝", color: "#8B5CF6" },
  { icon: TrendingUp, label: "Streak de 30 dias",        pts: "+500 🤝", color: "#EC4899" },
  { icon: UserPlus,   label: "Indicar um amigo",         pts: "+300 🤝", color: "#10B981" },
  { icon: Gift,       label: "Cupom promocional",        pts: "variável", color: "#EF4444" },
]

// ── Progressive check-in rewards ─────────────────────────────────────────────

const CHECKIN_REWARDS = [50, 70, 100, 150, 200, 250, 300] // day 1 → day 7+

function getCheckinReward(currentStreak: number): number {
  return CHECKIN_REWARDS[Math.min(currentStreak, 6)]
}

// ── Check-in helpers ──────────────────────────────────────────────────────────

function secondsUntilNextCheckin(lastCheckin: string | null): number {
  if (!lastCheckin) return 0
  const lastDate = new Date(lastCheckin).toISOString().split("T")[0]
  const todayDate = new Date().toISOString().split("T")[0]
  if (lastDate !== todayDate) return 0
  const midnight = new Date(todayDate)
  midnight.setUTCDate(midnight.getUTCDate() + 1)
  return Math.max(0, Math.floor((midnight.getTime() - Date.now()) / 1000))
}

function CheckInCard({
  totalCheckins: initialTotal,
  streak: initialStreak,
  lastCheckin,
}: {
  totalCheckins: number
  streak: number
  lastCheckin: string | null
}) {
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntilNextCheckin(lastCheckin))
  const [done,        setDone]        = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [total,       setTotal]       = useState(initialTotal)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (secondsLeft <= 0) return
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(intervalRef.current!); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const canCheckIn = secondsLeft === 0 && !done
  const hh = String(Math.floor(secondsLeft / 3600)).padStart(2, "0")
  const mm = String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, "0")
  const ss = String(secondsLeft % 60).padStart(2, "0")

  const nextReward = getCheckinReward(initialStreak)

  async function handleCheckIn() {
    if (!canCheckIn || loading) return
    setLoading(true)
    const result = await doCheckin()
    if (!result.error) {
      setDone(true)
      setTotal(c => c + 1)
      setSecondsLeft(24 * 3600)
    }
    setLoading(false)
  }

  return (
    <div className="rounded-2xl overflow-hidden mb-0"
      style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: canCheckIn ? "1.5px solid rgba(22,163,74,0.4)" : "1px solid rgba(255,255,255,0.55)" }}>
      <div className="px-4 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: canCheckIn ? "rgba(22,163,74,0.12)" : "rgba(59,130,246,0.12)" }}>
            <MapPin className="w-4 h-4" style={{ color: canCheckIn ? "#16A34A" : "#3B82F6" }} />
          </div>
          <div>
            <p className="font-bold text-gray-800 text-sm">Check-in Diário</p>
            <p className="text-[10px] text-gray-500">{total} check-ins realizados</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-bold text-gray-800">{initialStreak}🔥</span>
        </div>
      </div>

      {/* Progressive reward track */}
      <div className="px-4 pt-3 pb-0">
        <div className="flex items-center gap-1">
          {CHECKIN_REWARDS.map((reward, i) => {
            const dayStreak = i + 1
            const isCurrentOrPast = initialStreak >= dayStreak
            const isNext = initialStreak === i
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full h-1 rounded-full transition-all"
                  style={{ background: isCurrentOrPast ? "#16A34A" : isNext ? "rgba(22,163,74,0.3)" : "rgba(0,0,0,0.08)" }} />
                <span className="text-[8px] font-bold" style={{ color: isCurrentOrPast ? "#16A34A" : isNext ? "#16A34A" : "#D1D5DB" }}>
                  {reward}
                </span>
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-0.5 mb-2">
          <span className="text-[8px] text-gray-400">Dia 1</span>
          <span className="text-[8px] text-gray-400">Dia 7+</span>
        </div>
      </div>

      <div className="px-4 pb-4">
        {canCheckIn ? (
          <p className="text-sm text-[#16A34A] font-semibold text-center mb-3">✅ Disponível agora!</p>
        ) : (
          <div className="flex items-center justify-center gap-1 mb-3">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-xs text-gray-500">Próximo check-in em</p>
            <span className="font-mono font-bold text-gray-700 text-sm">{hh}:{mm}:{ss}</span>
          </div>
        )}
        <button onClick={handleCheckIn} disabled={!canCheckIn || loading}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300"
          style={{
            background: canCheckIn ? "linear-gradient(135deg,#16A34A,#22C55E)" : "rgba(0,0,0,0.05)",
            color: canCheckIn ? "white" : "#9CA3AF",
            boxShadow: canCheckIn ? "0 4px 16px rgba(22,163,74,0.35)" : "none",
            cursor: canCheckIn ? "pointer" : "not-allowed",
          }}>
          {done ? `✅ Check-in feito! +${nextReward} 🤝` : loading ? "Registrando..." : canCheckIn ? `Fazer Check-in · +${nextReward} 🤝` : "Check-in indisponível"}
        </button>
        <button disabled className="w-full py-2.5 rounded-xl font-medium text-xs mt-2 flex items-center justify-center gap-2"
          style={{ background: "rgba(0,0,0,0.04)", color: "#C4C4C4", border: "1px dashed rgba(0,0,0,0.1)", cursor: "not-allowed" }}>
          <Flame className="w-3.5 h-3.5 text-gray-300" />
          Reparar streak — 2.500 🤝
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: "rgba(0,0,0,0.06)", color: "#C4C4C4" }}>INDISPONÍVEL</span>
        </button>
      </div>
    </div>
  )
}

// ── Points Tab ────────────────────────────────────────────────────────────────

function PointsTab({
  profile,
  totalCheckins,
}: {
  profile: Profile | null
  totalCheckins: number
}) {
  const [showHowModal,  setShowHowModal]  = useState(false)
  const superDealAvailable = !(profile?.super_deal_used ?? false)
  const shakesPoints = profile?.tdp_points  ?? 0
  const streak       = profile?.streak_days ?? 0
  const lastCheckin  = profile?.last_checkin ?? null

  return (
    <div className="px-5 pb-8 space-y-4">
      {/* Hero card */}
      <div className="rounded-3xl p-6 text-center"
        style={{ background: "linear-gradient(135deg,#0D2E1A 0%,#16A34A 60%,#22C55E 100%)", boxShadow: "0 12px 40px rgba(22,163,74,0.4)" }}>
        <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">Seus Shakes</p>
        <div className="flex items-center justify-center gap-2 mb-1">
          <p className="text-white text-5xl font-black">
            {shakesPoints.toLocaleString("pt-BR")}
          </p>
          <Handshake className="w-8 h-8 text-white/70 mt-1" />
        </div>
        <div className="flex justify-center gap-4 mt-4">
          <div className="text-center">
            <p className="text-white text-base font-bold">{streak} 🔥</p>
            <p className="text-white/60 text-[10px]">Streak atual</p>
          </div>
          <div className="w-px bg-white/20" />
          <div className="text-center">
            <p className="text-white text-base font-bold">{totalCheckins}</p>
            <p className="text-white/60 text-[10px]">Check-ins</p>
          </div>
          <div className="w-px bg-white/20" />
          <div className="text-center">
            <p className="text-white text-base font-bold">{profile?.referral_count ?? 0}</p>
            <p className="text-white/60 text-[10px]">Indicações</p>
          </div>
        </div>
      </div>

      <CheckInCard totalCheckins={totalCheckins} streak={streak} lastCheckin={lastCheckin} />

      {/* Super Deal */}
      <div className="rounded-2xl p-4"
        style={{ background: superDealAvailable ? "rgba(61,191,106,0.08)" : "rgba(239,68,68,0.08)", border: `1.5px solid ${superDealAvailable ? "rgba(61,191,106,0.3)" : "rgba(239,68,68,0.3)"}` }}>
        <div className="flex items-center gap-2 mb-1">
          <Award className="w-4 h-4" style={{ color: superDealAvailable ? "#3DBF6A" : "#EF4444" }} />
          <p className="font-bold text-gray-800">Super Deal</p>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: superDealAvailable ? "rgba(61,191,106,0.15)" : "rgba(239,68,68,0.15)", color: superDealAvailable ? "#3DBF6A" : "#EF4444" }}>
            {superDealAvailable ? "Disponível" : "Em uso"}
          </span>
        </div>
        <p className="text-xs text-gray-500">1 Super Deal gratuito por conta (sem taxa). Quer um segundo? Custa 5.000 🤝.</p>
        {superDealAvailable && (
          <button className="mt-3 w-full py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg,#3DBF6A,#2DA050)" }}>
            Criar Super Deal
          </button>
        )}
      </div>

      {/* Como ganhar Shakes — com overlay "em breve" */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-700">Como ganhar Shakes</p>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: "rgba(139,92,246,0.12)", color: "#8B5CF6" }}>
              <Lock className="w-2.5 h-2.5" />
              Claim em breve
            </span>
          </div>
          <button onClick={() => setShowHowModal(true)} className="text-[10px] text-[#16A34A] font-semibold">Ver tudo</button>
        </div>

        {/* "em breve" notice */}
        <div className="mb-2 px-3 py-2 rounded-xl flex items-center gap-2"
          style={{ background: "rgba(139,92,246,0.07)", border: "1px dashed rgba(139,92,246,0.3)" }}>
          <Handshake className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#8B5CF6" }} />
          <p className="text-[11px] text-gray-500">
            Bata as metas e faça o <strong style={{ color: "#8B5CF6" }}>claim</strong> dos seus Shakes. Disponível em breve.
          </p>
        </div>

        <div className="space-y-2">
          {POINTS_SOURCES.map((src) => {
            const Icon = src.icon
            return (
              <div key={src.label} className="flex items-center gap-3 p-3 rounded-xl relative overflow-hidden"
                style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.5)", opacity: 0.75 }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${src.color}20` }}>
                  <Icon className="w-4 h-4" style={{ color: src.color }} />
                </div>
                <span className="flex-1 text-sm text-gray-700">{src.label}</span>
                <span className="text-xs font-bold" style={{ color: src.color }}>{src.pts}</span>
                <Lock className="w-3 h-3 ml-1 flex-shrink-0" style={{ color: "#C4C4C4" }} />
              </div>
            )
          })}
        </div>
      </div>

      {showHowModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowHowModal(false)}>
          <div className="w-full max-w-md rounded-t-3xl p-6"
            style={{ background: "rgba(255,255,255,0.97)", maxHeight: "80vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Handshake className="w-5 h-5 text-[#16A34A]" />
                <h3 className="text-lg font-bold text-gray-800">O que são Shakes?</h3>
              </div>
              <button onClick={() => setShowHowModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.08)" }}>
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4"><strong>Shakes 🤝</strong> são a moeda de engajamento do True Deal — como apertos de mão digitais. Você ganha ao participar da plataforma e usa para desbloquear benefícios.</p>
            <p className="text-sm font-semibold text-gray-700 mb-2">Ranking e prêmios</p>
            <p className="text-sm text-gray-600">O <strong>Top 5</strong> do ranking mensal divide <strong>R$100</strong> proporcionalmente.</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Hall of Fame Tab ──────────────────────────────────────────────────────────

type HofFilter = "mensal" | "streak"

function userColor(id: string): string {
  const colors = ["#4AABFF", "#BF4ADF", "#16A34A", "#F59E0B", "#EF4444", "#10B981", "#8B5CF6", "#EC4899"]
  let hash = 0
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return colors[Math.abs(hash) % colors.length]
}
function userBg(id: string): string {
  const bgs = ["#1A2E3A", "#2E1A2E", "#1A2E1A", "#2E2A1A", "#2E1A1A", "#1A2E26", "#1A1A2E", "#2A1A2E"]
  let hash = 0
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return bgs[Math.abs(hash) % bgs.length]
}
function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
}

function RankDelta({ curr, prev }: { curr: number; prev: number }) {
  const diff = prev - curr
  if (diff > 0) return <div className="flex items-center gap-0.5" style={{ color: "#16A34A" }}><ChevronUp className="w-3 h-3" /><span className="text-[10px] font-bold">{diff}</span></div>
  if (diff < 0) return <div className="flex items-center gap-0.5" style={{ color: "#FF4A4A" }}><ChevronDown className="w-3 h-3" /><span className="text-[10px] font-bold">{Math.abs(diff)}</span></div>
  return <Minus className="w-3 h-3 text-gray-400" />
}

function PodiumCard({ profile, rank, medal, height }: { profile: Profile; rank: number; medal: string; height: number }) {
  const medalColors: Record<string, { bg: string; border: string }> = {
    "👑": { bg: "linear-gradient(135deg,#8B5CF6,#6D28D9)", border: "rgba(139,92,246,0.5)" },
    "🥈": { bg: "linear-gradient(135deg,#6B7280,#9CA3AF)", border: "rgba(156,163,175,0.5)" },
    "🥉": { bg: "linear-gradient(135deg,#B45309,#D97706)", border: "rgba(180,83,9,0.4)" },
  }
  const mc      = medalColors[medal]
  const color   = userColor(profile.id)
  const bg      = userBg(profile.id)
  const initials = getInitials(profile.display_name || profile.username)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: `linear-gradient(135deg,${bg},${bg}AA)`, border: `2px solid ${color}` }}>
          <span className="font-bold text-sm" style={{ color }}>{initials}</span>
        </div>
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs"
          style={{ background: mc.bg, border: `1.5px solid ${mc.border}` }}>
          {medal}
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-bold text-gray-800 leading-none">{(profile.display_name || profile.username).split(" ")[0]}</p>
        <p className="text-[10px] text-gray-500">@{profile.username}</p>
      </div>
      <div className="w-full rounded-t-xl flex items-center justify-center"
        style={{ height, background: mc.bg, minWidth: 80 }}>
        <p className="text-white font-black text-sm">#{rank}</p>
      </div>
    </div>
  )
}

function HallOfFameTab({
  hofProfiles,
  userId,
}: {
  hofProfiles: Profile[]
  userId: string | null
}) {
  const [filter, setFilter] = useState<HofFilter>("mensal")
  const [search, setSearch] = useState("")

  const sorted = [...hofProfiles].sort((a, b) =>
    filter === "mensal" ? b.tdp_points - a.tdp_points : b.streak_days - a.streak_days,
  )

  const filtered = sorted.filter(u =>
    (u.display_name || u.username).toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()),
  )

  const top3   = sorted.slice(0, 3)
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean) // silver, gold, bronze

  const FILTERS: { key: HofFilter; label: string }[] = [
    { key: "mensal",  label: "Mensal"  },
    { key: "streak",  label: "Streak"  },
  ]

  const metricValue = (p: Profile) =>
    filter === "mensal"
      ? `${p.tdp_points.toLocaleString("pt-BR")} 🤝`
      : `${p.streak_days}🔥`

  return (
    <div className="px-5 pb-8 space-y-5">
      {/* Podium */}
      {podium.length >= 3 && (
        <div className="rounded-3xl p-5 overflow-hidden"
          style={{ background: "rgba(255,255,255,0.45)", backdropFilter: "blur(30px)", border: "1px solid rgba(255,255,255,0.6)" }}>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center mb-1">🏆 Hall of Fame</p>
          <p className="text-[10px] text-gray-400 text-center mb-5">
            {filter === "mensal" ? "Ranking mensal · Shakes ganhos em deals" : "Ranking de streak · dias consecutivos"}
          </p>
          <div className="flex items-end justify-center gap-3">
            <PodiumCard profile={podium[0]} rank={2} medal="🥈" height={64} />
            <PodiumCard profile={podium[1]} rank={1} medal="👑" height={90} />
            <PodiumCard profile={podium[2]} rank={3} medal="🥉" height={48} />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-1.5">
        {FILTERS.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: filter === key ? "linear-gradient(135deg,#16A34A,#22C55E)" : "rgba(255,255,255,0.5)",
              color: filter === key ? "white" : "#6B7280",
              border: filter === key ? "none" : "1px solid rgba(255,255,255,0.6)",
              boxShadow: filter === key ? "0 4px 12px rgba(22,163,74,0.3)" : "none",
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou @username…"
          className="w-full pl-11 pr-4 py-3 rounded-xl outline-none text-gray-800 placeholder-gray-400 text-sm"
          style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)" }} />
      </div>

      {/* Ranking list */}
      <div className="space-y-2">
        {filtered.map((u) => {
          const globalRank = sorted.indexOf(u) + 1
          const isMe       = u.id === userId
          const color      = userColor(u.id)
          const bg         = userBg(u.id)
          const initials   = getInitials(u.display_name || u.username)

          return (
            <div key={u.id} className="rounded-2xl p-4 transition-all"
              style={{
                background: isMe ? "rgba(22,163,74,0.08)" : "rgba(255,255,255,0.5)",
                backdropFilter: "blur(20px)",
                border: isMe ? "1.5px solid rgba(22,163,74,0.3)" : "1px solid rgba(255,255,255,0.6)",
              }}>
              <div className="flex items-center gap-3">
                <div className="w-8 flex-shrink-0 text-center">
                  <p className="font-black text-base" style={{ color: globalRank <= 3 ? "#16A34A" : "#9CA3AF" }}>{globalRank}</p>
                  <RankDelta curr={globalRank} prev={globalRank} />
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg,${bg},${bg}CC)` }}>
                  <span className="font-bold text-xs" style={{ color }}>{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-gray-800 text-sm">{u.display_name || u.username}</p>
                    {isMe && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(22,163,74,0.15)", color: "#16A34A" }}>Você</span>}
                  </div>
                  <p className="text-[11px] text-gray-400">@{u.username}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sm" style={{ color: "#16A34A" }}>{metricValue(u)}</p>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <Flame className="w-3 h-3 text-orange-400" />
                    <span className="text-[10px] text-gray-400">{u.streak_days}d</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-8">
            <Bell className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-400">Nenhum resultado encontrado</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

type SubTab = "points" | "halloffame"

export default function ExploreClient({
  profile,
  totalCheckins,
  hofProfiles,
  userId,
}: {
  profile: Profile | null
  totalCheckins: number
  hofProfiles: Profile[]
  userId: string | null
}) {
  const [subTab, setSubTab] = useState<SubTab>("points")

  const SUB_TABS: { key: SubTab; label: string; Icon: React.FC<{ className?: string }> }[] = [
    { key: "points",     label: "Points",       Icon: Handshake },
    { key: "halloffame", label: "Hall of Fame",  Icon: Trophy    },
  ]

  return (
    <div className="min-h-screen flex flex-col pb-20"
      style={{
        backgroundImage: "url('/images/gradient-background.jpg')",
        backgroundSize: "cover", backgroundPosition: "center",
        backgroundRepeat: "no-repeat", backgroundAttachment: "fixed",
      }}>
      <header className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Explorar</h1>
        <p className="text-gray-500 text-sm mt-0.5">Shakes e ranking global</p>
      </header>

      <div className="px-5 mb-5">
        <div className="flex gap-1.5 p-1 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.35)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.5)" }}>
          {SUB_TABS.map((tab) => {
            const Icon     = tab.Icon
            const isActive = subTab === tab.key
            return (
              <button key={tab.key} onClick={() => setSubTab(tab.key)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300"
                style={{
                  background: isActive ? "linear-gradient(135deg,#16A34A,#22C55E)" : "transparent",
                  color: isActive ? "white" : "#6B7280",
                  boxShadow: isActive ? "0 4px 12px rgba(22,163,74,0.3)" : "none",
                }}>
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {subTab === "points"     && <PointsTab profile={profile} totalCheckins={totalCheckins} />}
        {subTab === "halloffame" && <HallOfFameTab hofProfiles={hofProfiles} userId={userId} />}
      </div>

      <BottomNav active="Explorar" />
    </div>
  )
}
