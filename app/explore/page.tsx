"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Home, Compass, Wallet, User,
  Star, Zap, Gift, UserPlus, Trophy, Search,
  Heart, MessageCircle, Share2, Check, X,
  TrendingUp, Award, Users, Bell, MapPin, Clock, Flame,
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

interface FeedActivity {
  id: number
  user: { initials: string; name: string; bg: string; color: string }
  action: string
  deal?: string
  time: string
  liked: boolean
  likes: number
  comments: number
}

const FEED: FeedActivity[] = [
  { id: 1, user: { initials: "MC", name: "Maria C.",  bg: "#2E1A2E", color: "#BF4ADF" }, action: "ganhou o deal",     deal: "Academia todo dia",    time: "2h atrás", liked: false, likes: 12, comments: 3 },
  { id: 2, user: { initials: "JP", name: "João P.",   bg: "#1A2E1A", color: "#4ADF7B" }, action: "entrou no deal",   deal: "5k Steps Challenge",   time: "4h atrás", liked: true,  likes: 5,  comments: 1 },
  { id: 3, user: { initials: "LR", name: "Lukas R.",  bg: "#1A2E3A", color: "#4AABFF" }, action: "atingiu streak 🔥",deal: "7 dias consecutivos",  time: "1d atrás", liked: false, likes: 28, comments: 7 },
  { id: 4, user: { initials: "AS", name: "Ana S.",    bg: "#2E2A1A", color: "#FFAB4A" }, action: "criou um deal",    deal: "Corrida Semanal",      time: "1d atrás", liked: false, likes: 4,  comments: 0 },
  { id: 5, user: { initials: "CF", name: "Carlos F.", bg: "#1A1A2E", color: "#7B7BFF" }, action: "completou o deal", deal: "Meta Mensal de Passos", time: "2d atrás", liked: true,  likes: 19, comments: 5 },
]

const FRIEND_REQUESTS = [
  { id: 1, initials: "RO", name: "Rafael O.",  bg: "#2E1A1A", color: "#FF6B6B", mutual: 3 },
  { id: 2, initials: "BL", name: "Beatriz L.", bg: "#1A2A2E", color: "#4AFFEE", mutual: 1 },
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
      style={{
        background: "rgba(255,255,255,0.5)",
        backdropFilter: "blur(20px)",
        border: canCheckIn ? "1.5px solid rgba(22,163,74,0.4)" : "1px solid rgba(255,255,255,0.55)",
      }}>
      <div className="px-4 pt-4 pb-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
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
          style={{
            background: canCheckIn ? "linear-gradient(135deg,#16A34A,#22C55E)" : "rgba(0,0,0,0.05)",
            color:      canCheckIn ? "white" : "#9CA3AF",
            boxShadow:  canCheckIn ? "0 4px 16px rgba(22,163,74,0.35)" : "none",
            cursor:     canCheckIn ? "pointer" : "not-allowed",
          }}>
          {done ? "✅ Check-in feito! +50 TDP" : canCheckIn ? "Fazer Check-in · +50 TDP" : "Check-in indisponível"}
        </button>
        <button disabled
          className="w-full py-2.5 rounded-xl font-medium text-xs mt-2 flex items-center justify-center gap-2"
          style={{ background: "rgba(0,0,0,0.04)", color: "#C4C4C4", border: "1px dashed rgba(0,0,0,0.1)", cursor: "not-allowed" }}>
          <Flame className="w-3.5 h-3.5 text-gray-300" />
          Reparar streak — 2.500 TDP
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: "rgba(0,0,0,0.06)", color: "#C4C4C4" }}>
            INDISPONÍVEL
          </span>
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
        <p className="text-white text-5xl font-black mb-1">
          {MY_POINTS.toLocaleString("pt-BR")}
          <span className="text-2xl font-bold text-white/60 ml-1">TDP</span>
        </p>
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
            <p className="text-sm text-gray-600 mb-4">
              <strong>TDPoints (TDP)</strong> são a moeda de engajamento do True Deal. Você ganha ao participar da plataforma e usa para desbloquear benefícios — Super Deals sem taxa, badges de perfil e muito mais.
            </p>
            <p className="text-sm font-semibold text-gray-700 mb-2">Ranking e prêmios</p>
            <p className="text-sm text-gray-600">O <strong>Top 5</strong> do ranking mensal divide <strong>R$100</strong> proporcionalmente.</p>
          </div>
        </div>
      )}
    </div>
  )
}

function CommunityTab() {
  const [search,   setSearch]   = useState("")
  const [feed,     setFeed]     = useState(FEED)
  const [requests, setRequests] = useState(FRIEND_REQUESTS)

  function toggleLike(id: number) {
    setFeed(prev => prev.map(a => a.id === id ? { ...a, liked: !a.liked, likes: a.liked ? a.likes - 1 : a.likes + 1 } : a))
  }
  function handleRequest(id: number) { setRequests(prev => prev.filter(r => r.id !== id)) }

  return (
    <div className="px-5 pb-8 space-y-5">
      <div className="rounded-2xl p-4 flex items-center gap-4"
        style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.5)" }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#1A2E3A,#2A4E5A)" }}>
          <span className="text-blue-300 font-bold text-lg">LR</span>
        </div>
        <div className="flex-1">
          <p className="font-bold text-gray-800">Lukas Rocha</p>
          <p className="text-xs text-gray-500">lukas#8421 · {MY_POINTS.toLocaleString("pt-BR")} TDP</p>
          <div className="flex gap-3 mt-1">
            <span className="text-[10px] text-gray-500"><strong className="text-gray-700">12</strong> amigos</span>
            <span className="text-[10px] text-gray-500"><strong className="text-gray-700">8</strong> deals</span>
            <span className="text-[10px] text-green-600 font-semibold">7🔥 streak</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar amigos por nome ou #ID…"
          className="w-full pl-11 pr-4 py-3 rounded-xl outline-none text-gray-800 placeholder-gray-400 text-sm"
          style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)" }} />
      </div>

      {requests.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-[#16A34A]" />
            <p className="text-sm font-bold text-gray-700">Solicitações</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(22,163,74,0.15)", color: "#16A34A" }}>{requests.length}</span>
          </div>
          <div className="space-y-2">
            {requests.map((req) => (
              <div key={req.id} className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.5)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg,${req.bg},${req.bg}AA)` }}>
                  <span className="font-bold text-sm" style={{ color: req.color }}>{req.initials}</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-sm">{req.name}</p>
                  <p className="text-[10px] text-gray-400">{req.mutual} amigo(s) em comum</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleRequest(req.id)} className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(61,191,106,0.15)", border: "1px solid rgba(61,191,106,0.4)" }}>
                    <Check className="w-4 h-4 text-green-600" />
                  </button>
                  <button onClick={() => handleRequest(req.id)} className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                    <X className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-bold text-gray-700 mb-3">Atividade dos amigos</p>
        <div className="space-y-3">
          {feed.map((activity) => (
            <div key={activity.id} className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.5)" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg,${activity.user.bg},${activity.user.bg}AA)` }}>
                  <span className="font-bold text-xs" style={{ color: activity.user.color }}>{activity.user.initials}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-bold text-gray-800">{activity.user.name}</span>
                    {" "}<span className="text-gray-500">{activity.action}</span>
                  </p>
                  {activity.deal && <p className="text-xs font-semibold text-[#16A34A]">{activity.deal}</p>}
                </div>
                <span className="text-[10px] text-gray-400 flex-shrink-0">{activity.time}</span>
              </div>
              <div className="flex items-center gap-4 pt-2" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                <button onClick={() => toggleLike(activity.id)} className="flex items-center gap-1.5 text-xs font-medium transition-all"
                  style={{ color: activity.liked ? "#EF4444" : "#9CA3AF" }}>
                  <Heart className="w-4 h-4" fill={activity.liked ? "currentColor" : "none"} />
                  {activity.likes}
                </button>
                <button className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                  <MessageCircle className="w-4 h-4" />{activity.comments}
                </button>
                <button className="flex items-center gap-1.5 text-xs font-medium text-gray-400 ml-auto">
                  <Share2 className="w-4 h-4" />Compartilhar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

type SubTab = "tdpoints" | "community"

export default function ExplorePage() {
  const [subTab, setSubTab] = useState<SubTab>("tdpoints")

  const SUB_TABS: { key: SubTab; label: string; Icon: React.FC<{ className?: string }> }[] = [
    { key: "tdpoints",  label: "TDPoints",  Icon: Star  },
    { key: "community", label: "Community", Icon: Users },
  ]

  return (
    <div className="min-h-screen flex flex-col pb-20"
      style={{ backgroundImage: "url('/images/gradient-background.jpg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundAttachment: "fixed" }}>
      <header className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Explorar</h1>
        <p className="text-gray-500 text-sm mt-0.5">Pontos e comunidade</p>
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
        {subTab === "tdpoints"  && <TDPointsTab />}
        {subTab === "community" && <CommunityTab />}
      </div>

      <BottomNav active="Explorar" />
    </div>
  )
}
