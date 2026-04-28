"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Home, Compass, Wallet, User,
  Star, Zap, Gift, UserPlus, Trophy, Search,
  Heart, MessageCircle, Share2, Check, X,
  TrendingUp, Award, Users, Bell, MapPin, Clock, Flame,
  ChevronUp, ChevronDown, Minus, Twitter, Instagram,
} from "lucide-react"

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

// ── TDPoints tab (unchanged) ───────────────────────────────────────────────────

const MY_POINTS = 3_210
const CHECKIN_COUNT = 7
const CHECKIN_SECONDS_REMAINING = 18 * 3600

const POINTS_SOURCES = [
  { icon: Zap,        label: "Participar de um Deal",    pts: "+75 TDP",  color: "#16A34A" },
  { icon: Star,       label: "Criar um Deal",            pts: "+100 TDP", color: "#F59E0B" },
  { icon: Trophy,     label: "Ganhar um Deal",           pts: "+200 TDP", color: "#3DBF6A" },
  { icon: MapPin,     label: "Check-in diário",          pts: "+50 TDP",  color: "#3B82F6" },
  { icon: TrendingUp, label: "Streak de 7 dias",         pts: "+150 TDP", color: "#8B5CF6" },
  { icon: TrendingUp, label: "Streak de 30 dias",        pts: "+500 TDP", color: "#EC4899" },
  { icon: UserPlus,   label: "Indicar um amigo",         pts: "+300 TDP", color: "#10B981" },
  { icon: Gift,       label: "Cupom promocional",        pts: "variável", color: "#EF4444" },
]

const POINTS_USES = [
  { label: "Ativar Super Deal extra",         cost: "5.000 TDP" },
  { label: "Destaque no feed da comunidade",  cost: "500 TDP"   },
  { label: "Badge exclusivo de perfil",       cost: "1.000 TDP" },
  { label: "Extensão de prazo em Deal ativo", cost: "800 TDP"   },
]

function CheckInCard() {
  const [secondsLeft, setSecondsLeft] = useState(CHECKIN_SECONDS_REMAINING)
  const [done, setDone]               = useState(false)
  const [checkIns, setCheckIns]       = useState(CHECKIN_COUNT)
  const intervalRef                   = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(intervalRef.current!); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [])

  const canCheckIn = secondsLeft === 0
  const hh = String(Math.floor(secondsLeft / 3600)).padStart(2, "0")
  const mm = String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, "0")
  const ss = String(secondsLeft % 60).padStart(2, "0")

  function handleCheckIn() {
    if (!canCheckIn) return
    setDone(true)
    setCheckIns(c => c + 1)
    setSecondsLeft(24 * 3600)
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
            <p className="text-[10px] text-gray-500">{checkIns} check-ins realizados</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-bold text-gray-800">{checkIns}🔥</span>
        </div>
      </div>
      <div className="px-4 py-4">
        {canCheckIn ? (
          <p className="text-sm text-[#16A34A] font-semibold text-center mb-3">✅ Disponível agora!</p>
        ) : (
          <div className="flex items-center justify-center gap-1 mb-3">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-xs text-gray-500">Próximo check-in em</p>
            <span className="font-mono font-bold text-gray-700 text-sm">{hh}:{mm}:{ss}</span>
          </div>
        )}
        <button onClick={handleCheckIn} disabled={!canCheckIn}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300"
          style={{ background: canCheckIn ? "linear-gradient(135deg,#16A34A,#22C55E)" : "rgba(0,0,0,0.05)", color: canCheckIn ? "white" : "#9CA3AF", boxShadow: canCheckIn ? "0 4px 16px rgba(22,163,74,0.35)" : "none", cursor: canCheckIn ? "pointer" : "not-allowed" }}>
          {done ? "✅ Check-in feito! +50 TDP" : canCheckIn ? "Fazer Check-in · +50 TDP" : "Check-in indisponível"}
        </button>
        <button disabled className="w-full py-2.5 rounded-xl font-medium text-xs mt-2 flex items-center justify-center gap-2"
          style={{ background: "rgba(0,0,0,0.04)", color: "#C4C4C4", border: "1px dashed rgba(0,0,0,0.1)", cursor: "not-allowed" }}>
          <Flame className="w-3.5 h-3.5 text-gray-300" />
          Reparar streak — 2.500 TDP
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: "rgba(0,0,0,0.06)", color: "#C4C4C4" }}>INDISPONÍVEL</span>
        </button>
      </div>
    </div>
  )
}

function TDPointsTab() {
  const [showHowModal, setShowHowModal] = useState(false)
  const superDealAvailable = true

  return (
    <div className="px-5 pb-8 space-y-4">
      <div className="rounded-3xl p-6 text-center"
        style={{ background: "linear-gradient(135deg,#0D2E1A 0%,#16A34A 60%,#22C55E 100%)", boxShadow: "0 12px 40px rgba(22,163,74,0.4)" }}>
        <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">Seus TDPoints</p>
        <p className="text-white text-5xl font-black mb-1">{MY_POINTS.toLocaleString("pt-BR")}<span className="text-2xl font-bold text-white/60 ml-1">TDP</span></p>
        <div className="flex justify-center gap-4 mt-4">
          <div className="text-center"><p className="text-white text-base font-bold">7 🔥</p><p className="text-white/60 text-[10px]">Streak atual</p></div>
          <div className="w-px bg-white/20" />
          <div className="text-center"><p className="text-white text-base font-bold">12</p><p className="text-white/60 text-[10px]">Deals</p></div>
          <div className="w-px bg-white/20" />
          <div className="text-center"><p className="text-white text-base font-bold">3º</p><p className="text-white/60 text-[10px]">Ranking</p></div>
        </div>
      </div>

      <CheckInCard />

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
        <p className="text-xs text-gray-500">1 Super Deal gratuito por conta (sem taxa). Quer um segundo? Custa 5.000 TDP.</p>
        {superDealAvailable && (
          <button className="mt-3 w-full py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg,#3DBF6A,#2DA050)" }}>
            Criar Super Deal
          </button>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-700">Como ganhar TDP</p>
          <button onClick={() => setShowHowModal(true)} className="text-[10px] text-[#16A34A] font-semibold">Ver tudo</button>
        </div>
        <div className="space-y-2">
          {POINTS_SOURCES.map((src) => {
            const Icon = src.icon
            return (
              <div key={src.label} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.5)" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${src.color}20` }}>
                  <Icon className="w-4 h-4" style={{ color: src.color }} />
                </div>
                <span className="flex-1 text-sm text-gray-700">{src.label}</span>
                <span className="text-xs font-bold" style={{ color: src.color }}>{src.pts}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <p className="text-sm font-bold text-gray-700 mb-3">Para que serve</p>
        <div className="space-y-2">
          {POINTS_USES.map((u) => (
            <div key={u.label} className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.5)" }}>
              <span className="text-sm text-gray-700">{u.label}</span>
              <span className="text-xs font-bold text-[#16A34A]">{u.cost}</span>
            </div>
          ))}
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
              <h3 className="text-lg font-bold text-gray-800">O que são TDPoints?</h3>
              <button onClick={() => setShowHowModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.08)" }}>
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4"><strong>TDPoints (TDP)</strong> são a moeda de engajamento do True Deal. Você ganha ao participar da plataforma e usa para desbloquear benefícios.</p>
            <p className="text-sm font-semibold text-gray-700 mb-2">Ranking e prêmios</p>
            <p className="text-sm text-gray-600">O <strong>Top 5</strong> do ranking mensal divide <strong>R$100</strong> proporcionalmente.</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Hall of Fame Tab ───────────────────────────────────────────────────────────

type HofFilter = "pnl" | "vitorias" | "winrate"

interface HofUser {
  rank: number
  prevRank: number
  name: string
  username: string
  initials: string
  bg: string
  color: string
  pnl: string
  pnlRaw: number
  wins: number
  winRate: number
  deals: number
  streak: number
  badge?: string
  isMe?: boolean
  socials: { type: "x" | "instagram"; handle: string }[]
}

const HOF_DATA: HofUser[] = [
  { rank: 1, prevRank: 2, name: "Maria Costa",    username: "@mariac",   initials: "MC", bg: "#2E1A2E", color: "#BF4ADF", pnl: "+R$4.820", pnlRaw: 4820, wins: 18, winRate: 90, deals: 20, streak: 21, badge: "👑",      socials: [{ type: "x", handle: "@mariac_deals" }, { type: "instagram", handle: "@mariac.deals" }] },
  { rank: 2, prevRank: 1, name: "João Paulo",     username: "@joaop",    initials: "JP", bg: "#1A2E1A", color: "#4ADF7B", pnl: "+R$3.950", pnlRaw: 3950, wins: 15, winRate: 83, deals: 18, streak: 14, badge: "🥈",      socials: [{ type: "x", handle: "@joaop_bets" }] },
  { rank: 3, prevRank: 3, name: "Lukas Rocha",    username: "@lukasrocha",initials:"LR", bg: "#1A2E3A", color: "#4AABFF", pnl: "+R$1.840", pnlRaw: 1840, wins: 8,  winRate: 67, deals: 12, streak: 7,  badge: "🥉", isMe: true, socials: [{ type: "x", handle: "@lukasrocha" }] },
  { rank: 4, prevRank: 5, name: "Ana Silva",      username: "@anas",     initials: "AS", bg: "#2E2A1A", color: "#FFAB4A", pnl: "+R$1.620", pnlRaw: 1620, wins: 10, winRate: 71, deals: 14, streak: 9,  badge: undefined, socials: [{ type: "instagram", handle: "@anas.challenge" }] },
  { rank: 5, prevRank: 4, name: "Carlos Ferreira",username: "@carlosf",  initials: "CF", bg: "#1A1A2E", color: "#7B7BFF", pnl: "+R$1.440", pnlRaw: 1440, wins: 9,  winRate: 60, deals: 15, streak: 4,  badge: undefined, socials: [{ type: "x", handle: "@carlosf_tdl" }, { type: "instagram", handle: "@carlosferreira" }] },
  { rank: 6, prevRank: 8, name: "Rafael Oliveira",username: "@rafaelo",  initials: "RO", bg: "#2E1A1A", color: "#FF6B6B", pnl: "+R$1.200", pnlRaw: 1200, wins: 7,  winRate: 58, deals: 12, streak: 3,  badge: undefined, socials: [] },
  { rank: 7, prevRank: 6, name: "Beatriz Lima",   username: "@beatrizl", initials: "BL", bg: "#1A2A2E", color: "#4AFFEE", pnl: "+R$980",   pnlRaw: 980,  wins: 6,  winRate: 55, deals: 11, streak: 5,  badge: undefined, socials: [{ type: "instagram", handle: "@beatrizlima" }] },
  { rank: 8, prevRank: 7, name: "Pedro Santos",   username: "@pedros",   initials: "PS", bg: "#2A1A2E", color: "#D946EF", pnl: "+R$860",   pnlRaw: 860,  wins: 5,  winRate: 50, deals: 10, streak: 2,  badge: undefined, socials: [{ type: "x", handle: "@pedros_deals" }] },
  { rank: 9, prevRank: 9, name: "Fernanda Gomes", username: "@fernandg", initials: "FG", bg: "#1A2E26", color: "#34D399", pnl: "+R$720",   pnlRaw: 720,  wins: 5,  winRate: 56, deals: 9,  streak: 6,  badge: undefined, socials: [] },
  { rank: 10,prevRank:11, name: "Thiago Martins", username: "@thiagom",  initials: "TM", bg: "#2E2014", color: "#FB923C", pnl: "+R$640",   pnlRaw: 640,  wins: 4,  winRate: 44, deals: 9,  streak: 1,  badge: undefined, socials: [{ type: "x", handle: "@thiagom.fx" }] },
]

function RankDelta({ curr, prev }: { curr: number; prev: number }) {
  const diff = prev - curr
  if (diff > 0) return <div className="flex items-center gap-0.5" style={{ color: "#16A34A" }}><ChevronUp className="w-3 h-3" /><span className="text-[10px] font-bold">{diff}</span></div>
  if (diff < 0) return <div className="flex items-center gap-0.5" style={{ color: "#FF4A4A" }}><ChevronDown className="w-3 h-3" /><span className="text-[10px] font-bold">{Math.abs(diff)}</span></div>
  return <Minus className="w-3 h-3 text-gray-400" />
}

function SocialBadge({ type, handle }: { type: "x" | "instagram"; handle: string }) {
  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
      style={{ background: type === "x" ? "rgba(0,0,0,0.1)" : "rgba(228,64,95,0.12)" }}>
      {type === "x" ? <Twitter className="w-2.5 h-2.5 text-gray-600" /> : <Instagram className="w-2.5 h-2.5 text-pink-500" />}
      <span className="text-[9px] text-gray-500 font-medium">{handle}</span>
    </div>
  )
}

function PodiumCard({ user, height, medal }: { user: HofUser; height: number; medal: string }) {
  const medalColors: Record<string, { bg: string; border: string }> = {
    "👑": { bg: "linear-gradient(135deg,#8B5CF6,#6D28D9)", border: "rgba(139,92,246,0.5)" },
    "🥈": { bg: "linear-gradient(135deg,#6B7280,#9CA3AF)", border: "rgba(156,163,175,0.5)" },
    "🥉": { bg: "linear-gradient(135deg,#B45309,#D97706)", border: "rgba(180,83,9,0.4)" },
  }
  const mc = medalColors[medal]
  return (
    <div className="flex flex-col items-center gap-2">
      {/* avatar */}
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: `linear-gradient(135deg,${user.bg},${user.bg}AA)`, border: `2px solid ${user.color}` }}>
          <span className="font-bold text-sm" style={{ color: user.color }}>{user.initials}</span>
        </div>
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs"
          style={{ background: mc.bg, border: `1.5px solid ${mc.border}` }}>
          {medal}
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-bold text-gray-800 leading-none">{user.name.split(" ")[0]}</p>
        <p className="text-[10px] text-gray-500">{user.username}</p>
      </div>
      {/* podium block */}
      <div className="w-full rounded-t-xl flex items-center justify-center"
        style={{ height, background: mc.bg, minWidth: 80 }}>
        <p className="text-white font-black text-sm">#{user.rank}</p>
      </div>
    </div>
  )
}

function HallOfFameTab() {
  const [filter, setFilter]   = useState<HofFilter>("pnl")
  const [search, setSearch]   = useState("")

  const sorted = [...HOF_DATA].sort((a, b) => {
    if (filter === "pnl")      return b.pnlRaw - a.pnlRaw
    if (filter === "vitorias") return b.wins - a.wins
    return b.winRate - a.winRate
  })

  const filtered = sorted.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  )

  const top3    = [sorted[1], sorted[0], sorted[2]] // silver, gold, bronze order for podium
  const rest    = filtered.filter(u => u.rank > 3)
  const meInRest = filtered.find(u => u.isMe && u.rank > 3)

  const FILTERS: { key: HofFilter; label: string }[] = [
    { key: "pnl",      label: "PnL" },
    { key: "vitorias", label: "Vitórias" },
    { key: "winrate",  label: "Win Rate" },
  ]

  const filterValue = (u: HofUser) => {
    if (filter === "pnl")      return u.pnl
    if (filter === "vitorias") return `${u.wins} W`
    return `${u.winRate}%`
  }

  return (
    <div className="px-5 pb-8 space-y-5">
      {/* Podium */}
      <div className="rounded-3xl p-5 overflow-hidden"
        style={{ background: "rgba(255,255,255,0.45)", backdropFilter: "blur(30px)", border: "1px solid rgba(255,255,255,0.6)" }}>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center mb-5">🏆 Hall of Fame</p>
        <div className="flex items-end justify-center gap-3">
          <PodiumCard user={top3[0]} height={64}  medal="🥈" />
          <PodiumCard user={top3[1]} height={90}  medal="👑" />
          <PodiumCard user={top3[2]} height={48}  medal="🥉" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5">
        {FILTERS.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: filter === key ? "linear-gradient(135deg,#16A34A,#22C55E)" : "rgba(255,255,255,0.5)", color: filter === key ? "white" : "#6B7280", border: filter === key ? "none" : "1px solid rgba(255,255,255,0.6)", boxShadow: filter === key ? "0 4px 12px rgba(22,163,74,0.3)" : "none" }}>
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
        {filtered.map((user) => (
          <div key={user.rank} className="rounded-2xl p-4 transition-all"
            style={{
              background: user.isMe ? "rgba(22,163,74,0.08)" : "rgba(255,255,255,0.5)",
              backdropFilter: "blur(20px)",
              border: user.isMe ? "1.5px solid rgba(22,163,74,0.3)" : "1px solid rgba(255,255,255,0.6)",
            }}>
            <div className="flex items-center gap-3">
              {/* rank number */}
              <div className="w-8 flex-shrink-0 text-center">
                <p className="font-black text-base" style={{ color: user.rank <= 3 ? "#16A34A" : "#9CA3AF" }}>{user.rank}</p>
                <RankDelta curr={user.rank} prev={user.prevRank} />
              </div>

              {/* avatar */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `linear-gradient(135deg,${user.bg},${user.bg}CC)` }}>
                <span className="font-bold text-xs" style={{ color: user.color }}>{user.initials}</span>
              </div>

              {/* info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-gray-800 text-sm">{user.name}</p>
                  {user.badge && <span className="text-xs">{user.badge}</span>}
                  {user.isMe && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(22,163,74,0.15)", color: "#16A34A" }}>Você</span>}
                </div>
                <p className="text-[11px] text-gray-400">{user.username}</p>

                {/* social handles */}
                {user.socials.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {user.socials.map((s) => (
                      <SocialBadge key={s.type} type={s.type} handle={s.handle} />
                    ))}
                  </div>
                )}
              </div>

              {/* stats */}
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-sm" style={{ color: "#16A34A" }}>{filterValue(user)}</p>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <Flame className="w-3 h-3 text-orange-400" />
                  <span className="text-[10px] text-gray-400">{user.streak}🔥</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Me highlight if outside top list */}
      {search === "" && !filtered.slice(0, 10).find(u => u.isMe) && (
        <div className="rounded-2xl p-4 mt-2"
          style={{ background: "rgba(22,163,74,0.08)", border: "1.5px dashed rgba(22,163,74,0.4)" }}>
          <p className="text-xs text-center text-[#16A34A] font-semibold mb-2">Sua posição atual</p>
          {HOF_DATA.filter(u => u.isMe).map((user) => (
            <div key={user.rank} className="flex items-center gap-3">
              <div className="w-8 text-center">
                <p className="font-black text-base text-[#16A34A]">{user.rank}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `linear-gradient(135deg,${user.bg},${user.bg}CC)` }}>
                <span className="font-bold text-xs" style={{ color: user.color }}>{user.initials}</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800 text-sm">{user.name}</p>
                <p className="text-[11px] text-gray-400">{user.username}</p>
              </div>
              <p className="font-bold text-sm text-[#16A34A]">{filterValue(user)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

type SubTab = "tdpoints" | "halloffame"

export default function ExplorePage() {
  const [subTab, setSubTab] = useState<SubTab>("tdpoints")

  const SUB_TABS: { key: SubTab; label: string; Icon: React.FC<{ className?: string }> }[] = [
    { key: "tdpoints",   label: "TDPoints",     Icon: Star  },
    { key: "halloffame", label: "Hall of Fame",  Icon: Trophy },
  ]

  return (
    <div className="min-h-screen flex flex-col pb-20"
      style={{ backgroundImage: "url('/images/gradient-background.jpg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundAttachment: "fixed" }}>
      <header className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Explorar</h1>
        <p className="text-gray-500 text-sm mt-0.5">Pontos e ranking global</p>
      </header>

      <div className="px-5 mb-5">
        <div className="flex gap-1.5 p-1 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.35)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.5)" }}>
          {SUB_TABS.map((tab) => {
            const Icon = tab.Icon
            const isActive = subTab === tab.key
            return (
              <button key={tab.key} onClick={() => setSubTab(tab.key)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300"
                style={{ background: isActive ? "linear-gradient(135deg,#16A34A,#22C55E)" : "transparent", color: isActive ? "white" : "#6B7280", boxShadow: isActive ? "0 4px 12px rgba(22,163,74,0.3)" : "none" }}>
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {subTab === "tdpoints"   && <TDPointsTab />}
        {subTab === "halloffame" && <HallOfFameTab />}
      </div>

      <BottomNav active="Explorar" />
    </div>
  )
}
