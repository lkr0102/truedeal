"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Home, Compass, Wallet, User, CheckCircle2,
  Instagram, Twitter, Youtube, ChevronRight, Copy,
  TrendingUp, Trophy, Zap, Star, Gift, Shield, Bell, HelpCircle, LogOut,
  Check, ExternalLink, Users, Flame, Target, Award,
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

// ── Mock data ──────────────────────────────────────────────────────────────────

const USER = {
  name: "Lukas Rocha",
  username: "@lukasrocha",
  verified: true,
  tdp: 3210,
  streak: 7,
  totalWon: "R$ 1.840",
  totalDeals: 12,
  pnl: "+R$ 620",
  pnlPositive: true,
  winRate: 67,
  rank: 3,
  referrals: 1,
  referralsGoal: 5,
}

const DEAL_HISTORY = [
  { id: 1, title: "Leitura — 1 livro/mês",      result: "ganhou",   prize: "+R$ 78",  date: "Mar 2025", type: "privado",  color: "#3DBF6A" },
  { id: 2, title: "Academia todo dia",           result: "em curso", prize: "+R$ 485", date: "Abr 2025", type: "privado",  color: "#F59E0B" },
  { id: 3, title: "Quem ganha + seguidores",     result: "em curso", prize: "+R$ 145", date: "Abr 2025", type: "privado",  color: "#F59E0B" },
  { id: 4, title: "Maratona de Posts — X",       result: "em curso", prize: "+R$ 436", date: "Abr 2025", type: "público",  color: "#F59E0B" },
  { id: 5, title: "Meta Mensal de Passos",       result: "em curso", prize: "+R$ 980", date: "Abr 2025", type: "oficial",  color: "#F59E0B" },
  { id: 6, title: "5k Steps Challenge",          result: "perdeu",   prize: "-R$ 50",  date: "Mar 2025", type: "público",  color: "#FF4A4A" },
  { id: 7, title: "Ranking de Corrida — Março",  result: "perdeu",   prize: "-R$ 20",  date: "Mar 2025", type: "oficial",  color: "#FF4A4A" },
]

const DEAL_TYPES_STATS = [
  { label: "Oficial",  count: 3, won: 0, color: "#16A34A" },
  { label: "Privado",  count: 5, won: 2, color: "#3DBF6A" },
  { label: "Público",  count: 4, won: 1, color: "#8B5CF6" },
]

const SOCIALS = [
  { key: "x",        icon: Twitter,   label: "X (Twitter)", handle: "@lukasrocha",   linked: true,  pts: 100 },
  { key: "instagram",icon: Instagram, label: "Instagram",   handle: null,             linked: false, pts: 100 },
  { key: "tiktok",   icon: Star,      label: "TikTok",      handle: null,             linked: false, pts: 100 },
  { key: "youtube",  icon: Youtube,   label: "YouTube",     handle: null,             linked: false, pts: 100 },
]

const CONFIG_ITEMS = [
  { icon: User,     label: "Editar Perfil",       sub: "Atualize suas informações",     color: "#16A34A" },
  { icon: Shield,   label: "Segurança & Privacidade", sub: "Senha, 2FA, biometria",    color: "#3B82F6" },
  { icon: Bell,     label: "Notificações",         sub: "Gerencie seus alertas",         color: "#F59E0B" },
  { icon: HelpCircle,label: "Ajuda & Suporte",     sub: "FAQs e contato",                color: "#8B5CF6" },
  { icon: LogOut,   label: "Sair",                 sub: "Sair da sua conta",             color: "#FF4A4A", danger: true },
]

// ── Avatar placeholder ─────────────────────────────────────────────────────────

function AvatarPlaceholder({ size = 84 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="w-full h-full rounded-full flex items-center justify-center"
        style={{ background: "linear-gradient(135deg,#1A2E3A,#2A4E6A)", border: "3px solid #16A34A" }}>
        <span className="font-bold text-white" style={{ fontSize: size * 0.3 }}>LR</span>
      </div>
      <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center"
        style={{ background: "#ADFF2F", border: "2px solid white" }}>
        <User className="w-3.5 h-3.5 text-green-900" />
      </div>
    </div>
  )
}

// ── Dashboard Tab ──────────────────────────────────────────────────────────────

function DashboardTab() {
  return (
    <div className="px-5 pb-8 space-y-4">
      {/* Performance ring stats */}
      <div className="rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)" }}>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Performance</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Win Rate", value: `${USER.winRate}%`, color: "#16A34A", icon: Trophy },
            { label: "Streak",   value: `${USER.streak}🔥`,  color: "#F59E0B", icon: Flame },
            { label: "Ranking",  value: `#${USER.rank}`,    color: "#8B5CF6", icon: Award },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="rounded-xl p-3 text-center"
              style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
              <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
              <p className="font-bold text-gray-800 text-base">{value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Financeiro */}
      <div className="rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)" }}>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Financeiro</p>
        <div className="space-y-3">
          {[
            { label: "Total ganho",  value: USER.totalWon,  positive: true },
            { label: "PnL líquido",  value: USER.pnl,       positive: USER.pnlPositive },
            { label: "TDPoints",     value: `${USER.tdp.toLocaleString("pt-BR")} TDP`, positive: true },
          ].map(({ label, value, positive }) => (
            <div key={label} className="flex items-center justify-between py-2"
              style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              <span className="text-sm text-gray-600">{label}</span>
              <span className="font-bold text-sm" style={{ color: positive ? "#16A34A" : "#FF4A4A" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Deals por tipo */}
      <div className="rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)" }}>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Deals por Tipo</p>
        <div className="space-y-3">
          {DEAL_TYPES_STATS.map(({ label, count, won, color }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">{label}</span>
                <span className="text-xs text-gray-500">{won}/{count} ganhos</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.06)" }}>
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${(won / count) * 100}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Redes sociais */}
      <div className="rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)" }}>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Redes Sociais</p>
        <p className="text-xs text-gray-400 mb-4">+100 TDP por rede linkada e verificada</p>
        <div className="space-y-2">
          {SOCIALS.map(({ key, icon: Icon, label, handle, linked, pts }) => (
            <div key={key} className="flex items-center gap-3 p-3 rounded-xl transition-all"
              style={{ background: linked ? "rgba(22,163,74,0.07)" : "rgba(0,0,0,0.03)", border: linked ? "1px solid rgba(22,163,74,0.25)" : "1px solid rgba(0,0,0,0.06)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: linked ? "rgba(22,163,74,0.15)" : "rgba(0,0,0,0.06)" }}>
                <Icon className="w-4 h-4" style={{ color: linked ? "#16A34A" : "#9CA3AF" }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{label}</p>
                {linked && handle && <p className="text-xs text-gray-500">{handle}</p>}
              </div>
              {linked ? (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  <span className="text-[10px] font-bold text-[#16A34A]">+{pts}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400">+{pts} TDP</span>
                  <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)" }}>
                    Linkar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Referral */}
      <div className="rounded-2xl p-5"
        style={{ background: "linear-gradient(135deg, rgba(22,163,74,0.08), rgba(34,197,94,0.05))", border: "1.5px solid rgba(22,163,74,0.25)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-4 h-4 text-[#16A34A]" />
          <p className="font-bold text-gray-800">Referral</p>
          <div className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full"
            style={{ background: "rgba(22,163,74,0.15)" }}>
            <span className="text-xs font-bold text-[#16A34A]">{USER.referrals}/{USER.referralsGoal}</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-3">A cada 5 indicados novos você libera um Super Deal gratuito!</p>

        {/* progress track */}
        <div className="flex gap-1.5 mb-4">
          {Array.from({ length: USER.referralsGoal }).map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full"
              style={{ background: i < USER.referrals ? "#16A34A" : "rgba(0,0,0,0.08)" }} />
          ))}
        </div>

        <div className="relative">
          <div className="absolute -top-2 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
            style={{ background: "#16A34A" }}>
            +100 TDP por indicado
          </div>
          <button className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
            style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.3)", color: "#16A34A", backdropFilter: "blur(10px)" }}>
            <Copy className="w-4 h-4" />
            Copiar link de indicação
          </button>
        </div>
      </div>
    </div>
  )
}

// ── History Tab ────────────────────────────────────────────────────────────────

function HistoryTab() {
  return (
    <div className="px-5 pb-8 space-y-3">
      {DEAL_HISTORY.map((deal) => (
        <div key={deal.id} className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${deal.color}18` }}>
            {deal.result === "ganhou" ? <Trophy className="w-5 h-5" style={{ color: deal.color }} />
             : deal.result === "perdeu" ? <Target className="w-5 h-5" style={{ color: deal.color }} />
             : <Zap className="w-5 h-5" style={{ color: deal.color }} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 text-sm truncate">{deal.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: `${deal.color}18`, color: deal.color }}>
                {deal.type}
              </span>
              <span className="text-[10px] text-gray-400">{deal.date}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-bold text-sm" style={{ color: deal.color }}>{deal.prize}</p>
            <p className="text-[10px] text-gray-400 capitalize">{deal.result}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Config Tab ─────────────────────────────────────────────────────────────────

function ConfigTab() {
  return (
    <div className="px-5 pb-8 space-y-3">
      {CONFIG_ITEMS.map(({ icon: Icon, label, sub, color, danger }) => (
        <button key={label} className="w-full rounded-2xl p-4 flex items-center gap-4 text-left transition-all active:scale-[0.98]"
          style={{ background: danger ? "rgba(255,74,74,0.05)" : "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: danger ? "1px solid rgba(255,74,74,0.15)" : "1px solid rgba(255,255,255,0.6)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}15` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm" style={{ color: danger ? "#FF4A4A" : "#1A1A2E" }}>{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </button>
      ))}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

type Tab = "dashboard" | "historico" | "config"

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("dashboard")

  const TABS: { key: Tab; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "historico", label: "Histórico" },
    { key: "config",    label: "Config" },
  ]

  return (
    <div className="min-h-screen flex flex-col pb-24"
      style={{ backgroundImage: "url('/images/gradient-background.jpg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundAttachment: "fixed" }}>

      {/* Header */}
      <header className="px-5 pt-12 pb-6">
        <div className="flex flex-col items-center gap-3">
          <AvatarPlaceholder size={84} />
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5">
              <h1 className="text-xl font-bold text-gray-800">{USER.name}</h1>
              {USER.verified && <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{USER.username}</p>
          </div>

          {/* Dark glass stats card */}
          <div className="w-full mt-2 rounded-3xl p-5"
            style={{ background: "linear-gradient(135deg,#0D2E1A 0%,#0D3A22 60%,#0F4D2A 100%)", boxShadow: "0 12px 40px rgba(22,163,74,0.35)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex justify-around">
              <div className="text-center">
                <p className="text-xl font-black text-[#ADFF2F]">{USER.totalWon}</p>
                <p className="text-[10px] text-white/50 mt-0.5 font-medium uppercase tracking-wide">Total Ganho</p>
              </div>
              <div className="w-px bg-white/10" />
              <div className="text-center">
                <p className="text-xl font-black text-[#ADFF2F]">{USER.totalDeals}</p>
                <p className="text-[10px] text-white/50 mt-0.5 font-medium uppercase tracking-wide">Deals</p>
              </div>
              <div className="w-px bg-white/10" />
              <div className="text-center">
                <p className="text-xl font-black" style={{ color: USER.pnlPositive ? "#ADFF2F" : "#FF4A4A" }}>{USER.pnl}</p>
                <p className="text-[10px] text-white/50 mt-0.5 font-medium uppercase tracking-wide">PnL</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-5 mb-5">
        <div className="flex gap-1 p-1 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.35)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.5)" }}>
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300"
              style={{ background: tab === key ? "linear-gradient(135deg,#16A34A,#22C55E)" : "transparent", color: tab === key ? "white" : "#6B7280", boxShadow: tab === key ? "0 4px 12px rgba(22,163,74,0.3)" : "none" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1">
        {tab === "dashboard" && <DashboardTab />}
        {tab === "historico" && <HistoryTab />}
        {tab === "config"    && <ConfigTab />}
      </div>

      <BottomNav active="Perfil" />
    </div>
  )
}
