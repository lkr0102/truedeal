"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Home, Compass, Wallet, User, CheckCircle2,
  Instagram, Twitter, Youtube, ChevronRight, Copy,
  Trophy, Zap, Star, Shield, Bell, HelpCircle, LogOut,
  Check, Users, Flame, Target, Award,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Profile, DealWithParticipants } from "@/lib/supabase/types"

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

// ── Mock data (kept as-is — social links not in DB schema yet) ─────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface ProfileClientProps {
  profile: Profile | null
  deals: DealWithParticipants[]
  userId: string | null
}

// ── Avatar placeholder ─────────────────────────────────────────────────────────

function AvatarPlaceholder({ size = 84, initials }: { size?: number; initials: string }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="w-full h-full rounded-full flex items-center justify-center"
        style={{ background: "linear-gradient(135deg,#1A2E3A,#2A4E6A)", border: "3px solid #16A34A" }}>
        <span className="font-bold text-white" style={{ fontSize: size * 0.3 }}>{initials}</span>
      </div>
      <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center"
        style={{ background: "#ADFF2F", border: "2px solid white" }}>
        <User className="w-3.5 h-3.5 text-green-900" />
      </div>
    </div>
  )
}

// ── Dashboard Tab ──────────────────────────────────────────────────────────────

interface DashboardTabProps {
  user: {
    tdp: number
    streak: number
    winRate: number
    totalWon: string
    pnl: string
    pnlPositive: boolean
    referrals: number
    referralsGoal: number
    referralCode: string
  }
}

function DashboardTab({ user }: DashboardTabProps) {
  const [copied, setCopied] = useState(false)

  function copyReferral() {
    const link = `https://truedeal.app/ref/${user.referralCode}`
    navigator.clipboard.writeText(link).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="px-5 pb-8 space-y-4">
      {/* Performance ring stats */}
      <div className="rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)" }}>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Performance</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Win Rate", value: `${user.winRate}%`, color: "#16A34A", icon: Trophy },
            { label: "Streak",   value: `${user.streak}🔥`,  color: "#F59E0B", icon: Flame },
            { label: "Ranking",  value: "—",                 color: "#8B5CF6", icon: Award },
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
            { label: "Total ganho",  value: user.totalWon,  positive: true },
            { label: "PnL líquido",  value: user.pnl,       positive: user.pnlPositive },
            { label: "TDPoints",     value: `${user.tdp.toLocaleString("pt-BR")} TDP`, positive: true },
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
            <span className="text-xs font-bold text-[#16A34A]">{user.referrals}/{user.referralsGoal}</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-3">A cada 5 indicados novos você libera um Super Deal gratuito!</p>

        {/* progress track */}
        <div className="flex gap-1.5 mb-4">
          {Array.from({ length: user.referralsGoal }).map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full"
              style={{ background: i < user.referrals ? "#16A34A" : "rgba(0,0,0,0.08)" }} />
          ))}
        </div>

        <div className="relative">
          <div className="absolute -top-2 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
            style={{ background: "#16A34A" }}>
            +100 TDP por indicado
          </div>
          <button onClick={copyReferral} className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
            style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.3)", color: "#16A34A", backdropFilter: "blur(10px)" }}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado!" : "Copiar link de indicação"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── History Tab ────────────────────────────────────────────────────────────────

interface DealHistoryItem {
  id: string
  title: string
  result: string
  prize: string
  date: string
  type: string
  color: string
}

function HistoryTab({ dealHistory }: { dealHistory: DealHistoryItem[] }) {
  if (dealHistory.length === 0) {
    return (
      <div className="px-5 pb-8">
        <div className="rounded-2xl p-8 text-center"
          style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)" }}>
          <p className="text-sm text-gray-400">Nenhum deal ainda — crie ou entre em um deal para começar</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 pb-8 space-y-3">
      {dealHistory.map((deal) => (
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

function ConfigTab({ onSignOut }: { onSignOut: () => void }) {
  const CONFIG_ITEMS = [
    { icon: User,      label: "Editar Perfil",           sub: "Atualize suas informações",     color: "#16A34A", danger: false, action: undefined as (() => void) | undefined },
    { icon: Shield,    label: "Segurança & Privacidade", sub: "Senha, 2FA, biometria",         color: "#3B82F6", danger: false, action: undefined as (() => void) | undefined },
    { icon: Bell,      label: "Notificações",            sub: "Gerencie seus alertas",         color: "#F59E0B", danger: false, action: undefined as (() => void) | undefined },
    { icon: HelpCircle,label: "Ajuda & Suporte",         sub: "FAQs e contato",                color: "#8B5CF6", danger: false, action: undefined as (() => void) | undefined },
    { icon: LogOut,    label: "Sair",                    sub: "Sair da sua conta",             color: "#FF4A4A", danger: true,  action: onSignOut },
  ]

  return (
    <div className="px-5 pb-8 space-y-3">
      {CONFIG_ITEMS.map(({ icon: Icon, label, sub, color, danger, action }) => (
        <button key={label} onClick={action} className="w-full rounded-2xl p-4 flex items-center gap-4 text-left transition-all active:scale-[0.98]"
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

export default function ProfileClient({ profile, deals, userId }: ProfileClientProps) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("dashboard")

  // ── Derived stats ──
  const myDeals   = deals.filter(d => d.participants.some(p => p.user_id === userId))
  const finalized = myDeals.filter(d => d.status === "finalizado")
  const wonDeals  = finalized.filter(d => d.winner_id === userId)
  const totalWon  = wonDeals.reduce((s, d) => s + d.net_pot, 0)
  const totalSpent = myDeals.reduce((s, d) => s + d.entry_amount, 0)
  const pnl       = totalWon - totalSpent
  const winRate   = finalized.length > 0 ? Math.round((wonDeals.length / finalized.length) * 100) : 0

  // ── USER object ──
  const displayName = profile?.display_name ?? "Usuário"
  const initials    = getInitials(displayName)

  const USER = {
    name:          displayName,
    username:      profile?.username ? `@${profile.username}` : "",
    verified:      !!profile,
    tdp:           profile?.tdp_points ?? 0,
    streak:        profile?.streak_days ?? 0,
    totalWon:      totalWon > 0 ? `R$ ${Math.round(totalWon).toLocaleString("pt-BR")}` : "R$ 0",
    totalDeals:    myDeals.length,
    pnl:           `${pnl >= 0 ? "+" : ""}R$ ${Math.round(Math.abs(pnl)).toLocaleString("pt-BR")}`,
    pnlPositive:   pnl >= 0,
    winRate,
    referrals:     profile?.referral_count ?? 0,
    referralsGoal: 5,
    referralCode:  profile?.referral_code ?? "",
  }

  // ── Deal history ──
  const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
  const dealHistory: DealHistoryItem[] = myDeals.map(d => {
    const isFinalized = d.status === "finalizado"
    const won  = isFinalized && d.winner_id === userId
    const lost = isFinalized && d.winner_id !== null && d.winner_id !== userId
    const result = won ? "ganhou" : lost ? "perdeu" : "em curso"
    const color  = won ? "#3DBF6A" : lost ? "#FF4A4A" : "#F59E0B"
    const dt     = new Date(d.start_date)
    const dateStr = `${MONTH_NAMES[dt.getMonth()]} ${dt.getFullYear()}`
    return {
      id:     d.id,
      title:  d.title,
      result,
      prize:  won ? `+R$ ${Math.round(d.net_pot)}` : lost ? `-R$ ${d.entry_amount}` : `R$ ${d.entry_amount}`,
      date:   dateStr,
      type:   d.type === "publico" ? "público" : d.type,
      color,
    }
  })

  // ── Sign out ──
  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

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
          <AvatarPlaceholder size={84} initials={initials} />
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
        {tab === "dashboard" && (
          <DashboardTab user={{
            tdp:           USER.tdp,
            streak:        USER.streak,
            winRate:       USER.winRate,
            totalWon:      USER.totalWon,
            pnl:           USER.pnl,
            pnlPositive:   USER.pnlPositive,
            referrals:     USER.referrals,
            referralsGoal: USER.referralsGoal,
            referralCode:  USER.referralCode,
          }} />
        )}
        {tab === "historico" && <HistoryTab dealHistory={dealHistory} />}
        {tab === "config"    && <ConfigTab onSignOut={handleSignOut} />}
      </div>

      <BottomNav active="Perfil" />
    </div>
  )
}

