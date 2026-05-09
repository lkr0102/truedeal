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
  { icon: Home,    label: "Acordos",  href: "/" },
  { icon: Compass, label: "Explorar", href: "/explore" },
  { icon: Wallet,  label: "Wallet",   href: "/wallet" },
  { icon: User,    label: "Perfil",   href: "/profile" },
]

function BottomNav({ active }: { active: string }) {
  const router = useRouter()
  return (
    <nav className="fixed bottom-0 left-0 right-0 px-6 py-4 z-10"
      style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(40px) saturate(200%)", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
      <div className="flex justify-around items-center">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = active === item.label
          return (
            <button key={item.label} onClick={() => router.push(item.href)}
              className="flex flex-col items-center gap-1 transition-all duration-300">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? "scale-110 shadow-lg" : ""}`}
                style={{ background: isActive ? "#00D26A" : "transparent" }}>
                <Icon className={`w-5 h-5 ${isActive ? "text-[#0A0F0D]" : "text-gray-400"}`} />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-[#00D26A]" : "text-gray-400"}`}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// ── Mock data (kept as-is — social links not in DB schema yet) ─────────────────

const DEAL_TYPES_STATS = [
  { label: "Oficial",  count: 3, won: 0, color: "#00D26A" },
  { label: "Privado",  count: 5, won: 2, color: "#14F195" },
  { label: "Público",  count: 4, won: 1, color: "#9945FF" },
]

const SOCIALS = [
  { key: "x",        icon: Twitter,   label: "X (Twitter)", handle: "@lukasrocha",   linked: true,  pts: 100 },
  { key: "instagram",icon: Instagram, label: "Instagram",   handle: null,             linked: false, pts: 100 },
  { key: "wellhub",  icon: Shield,    label: "Wellhub",      handle: null,             linked: false, pts: 100 },
  { key: "strava",   icon: Target,    label: "Strava",       handle: null,             linked: false, pts: 100 },
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
      <div className="w-full h-full rounded-[2.5rem] flex items-center justify-center relative overflow-hidden"
        style={{ background: "#0A0F0D", border: "3px solid #00D26A" }}>
        <div className="absolute inset-0 bg-[#00D26A] opacity-5 blur-xl" />
        <span className="font-black text-white relative z-10" style={{ fontSize: size * 0.35 }}>{initials}</span>
      </div>
      <div className="absolute bottom-0 right-0 w-8 h-8 rounded-2xl flex items-center justify-center shadow-lg"
        style={{ background: "#00D26A", border: "3px solid white" }}>
        <Shield className="w-4 h-4 text-[#0A0F0D]" />
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
      <div className="rounded-3xl p-6"
        style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)" }}>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-5">Sovereign Execution</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Win Rate",    value: `${user.winRate}%`, color: "#00D26A", icon: Trophy },
            { label: "Palavra",     value: `${user.streak}🔥`, color: "#F59E0B", icon: Flame },
            { label: "Rank",        value: "S-Tier",           color: "#9945FF", icon: Award },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="rounded-2xl p-4 text-center transition-all hover:scale-[1.02]"
              style={{ background: `${color}08`, border: `1.5px solid ${color}15` }}>
              <Icon className="w-5 h-5 mx-auto mb-2" style={{ color }} />
              <p className="font-black text-gray-800 text-lg tracking-tight leading-none">{value}</p>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Financeiro */}
      <div className="rounded-3xl p-6"
        style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)" }}>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-4">Assentamento On-Chain</p>
        <div className="space-y-4">
          {[
            { label: "Rendimento Total", value: user.totalWon,  positive: true },
            { label: "PnL Institucional", value: user.pnl,       positive: user.pnlPositive },
            { label: "Performance Score", value: `${user.tdp.toLocaleString("pt-BR")} 🤝`, positive: true },
          ].map(({ label, value, positive }) => (
            <div key={label} className="flex items-center justify-between pb-3"
              style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
              <span className="text-[13px] text-gray-500 font-medium">{label}</span>
              <span className="font-black text-sm tracking-tight" style={{ color: positive ? "#00D26A" : "#FF4A4A" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Deals por tipo */}
      <div className="rounded-3xl p-6"
        style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)" }}>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-5">Acordos por Nível</p>
        <div className="space-y-4">
          {DEAL_TYPES_STATS.map(({ label, count, won, color }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-700 font-black uppercase tracking-wider">{label}</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase">{won}/{count} ADIMPLENTES</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.04)" }}>
                <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${(won / count) * 100}%`, background: color, boxShadow: `0 0 10px ${color}40` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Social Oracle */}
      <div className="rounded-3xl p-6"
        style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)" }}>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">Social Oracle Sync</p>
        <p className="text-[10px] text-gray-400 font-medium mb-5 uppercase tracking-wider">+100 🤝 por canal de auditoria</p>
        <div className="space-y-3">
          {SOCIALS.map(({ key, icon: Icon, label, handle, linked, pts }) => (
            <div key={key} className="flex items-center gap-3 p-4 rounded-2xl transition-all"
              style={{ background: linked ? "rgba(0,210,106,0.05)" : "rgba(0,0,0,0.03)", border: linked ? "1.5px solid rgba(0,210,106,0.15)" : "1px solid rgba(0,0,0,0.05)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: linked ? "#00D26A" : "rgba(0,0,0,0.06)" }}>
                <Icon className="w-4 h-4" style={{ color: linked ? "#0A0F0D" : "#9CA3AF" }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-gray-800 tracking-tight">{label}</p>
                {linked && handle && <p className="text-[10px] text-gray-400 font-mono">{handle}</p>}
              </div>
              {linked ? (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#00D26A]" />
                  <span className="text-[10px] font-black text-[#00D26A]">SYNCED</span>
                </div>
              ) : (
                <button className="px-4 py-2 rounded-xl text-[10px] font-black text-[#0A0F0D] uppercase tracking-wider transition-all active:scale-[0.98]"
                  style={{ background: "#00D26A" }}>
                  LINK
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Referral */}
      <div className="rounded-3xl p-6 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(0,210,106,0.08), rgba(0,168,81,0.04))", border: "1.5px solid rgba(0,210,106,0.2)", backdropFilter: "blur(20px)" }}>
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#00D26A] opacity-5 blur-2xl" />
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-[#00D26A]" />
          <p className="font-black text-gray-800 text-sm tracking-tight uppercase">Squad de Performance</p>
          <div className="ml-auto flex items-center gap-1 px-3 py-1 rounded-full"
            style={{ background: "#00D26A" }}>
            <span className="text-[10px] font-black text-[#0A0F0D]">{user.referrals}/{user.referralsGoal}</span>
          </div>
        </div>
        <p className="text-[11px] text-gray-500 font-medium mb-4 leading-relaxed">A cada 5 parceiros recrutados você ativa o status <strong className="text-[#00D26A]">Oracle Premium</strong>.</p>

        {/* progress track */}
        <div className="flex gap-2 mb-5">
          {Array.from({ length: user.referralsGoal }).map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full"
              style={{ background: i < user.referrals ? "#00D26A" : "rgba(0,0,0,0.06)", boxShadow: i < user.referrals ? "0 0 8px rgba(0,210,106,0.3)" : "none" }} />
          ))}
        </div>

        <div className="relative">
          <button onClick={copyReferral} className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,210,106,0.2)", color: "#00D26A", backdropFilter: "blur(10px)" }}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "COPIADO!" : "CONVOCAR PARCEIRO"}
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
        <div className="rounded-3xl p-10 text-center"
          style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)" }}>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">Nenhum rastro institucional.<br/>Sua palavra ainda não foi testada.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 pb-8 space-y-3">
      {dealHistory.map((deal) => (
        <div key={deal.id} className="rounded-3xl p-5 flex items-center gap-4"
          style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)" }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${deal.color}12` }}>
            {deal.result === "ganhou" ? <Trophy className="w-6 h-6" style={{ color: deal.color }} />
             : deal.result === "perdeu" ? <Target className="w-6 h-6" style={{ color: deal.color }} />
             : <Zap className="w-6 h-6" style={{ color: deal.color }} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-800 text-[15px] truncate tracking-tight">{deal.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider"
                style={{ background: `${deal.color}15`, color: deal.color }}>
                {deal.type}
              </span>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{deal.date}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-black text-base tracking-tighter" style={{ color: deal.color }}>{deal.prize}</p>
            <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{deal.result === "ganhou" ? "adimplente" : deal.result === "perdeu" ? "inadimplente" : "vigente"}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Config Tab ─────────────────────────────────────────────────────────────────

function ConfigTab({ onSignOut }: { onSignOut: () => void }) {
  const CONFIG_ITEMS = [
    { icon: User,      label: "Perfil Institucional",    sub: "Metadados e Identidade",        color: "#00D26A", danger: false, action: undefined as (() => void) | undefined },
    { icon: Shield,    label: "Soberania & Auditoria",   sub: "Chaves e Auditoria On-Chain",    color: "#3B82F6", danger: false, action: undefined as (() => void) | undefined },
    { icon: Bell,      label: "Protocolos de Alerta",    sub: "Configurações de Push",          color: "#F59E0B", danger: false, action: undefined as (() => void) | undefined },
    { icon: HelpCircle,label: "Base de Conhecimento",    sub: "Manuais e Suporte",             color: "#9945FF", danger: false, action: undefined as (() => void) | undefined },
    { icon: LogOut,    label: "Sair do Sistema",         sub: "Encerrar Sessão Soberana",      color: "#FF4A4A", danger: true,  action: onSignOut },
  ]

  return (
    <div className="px-5 pb-8 space-y-3">
      {CONFIG_ITEMS.map(({ icon: Icon, label, sub, color, danger, action }) => (
        <button key={label} onClick={action} className="w-full rounded-3xl p-5 flex items-center gap-5 text-left transition-all active:scale-[0.98]"
          style={{ background: danger ? "rgba(255,74,74,0.05)" : "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: danger ? "1px solid rgba(255,74,74,0.15)" : "1px solid rgba(255,255,255,0.6)" }}>
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}12` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div className="flex-1">
            <p className="font-black text-sm tracking-tight" style={{ color: danger ? "#FF4A4A" : "#0A0F0D" }}>{label}</p>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">{sub}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
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
  const displayName = profile?.display_name ?? "Sovereign User"
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
    const color  = won ? "#00D26A" : lost ? "#FF4A4A" : "#F59E0B"
    const dt     = new Date(d.start_date)
    const dateStr = `${MONTH_NAMES[dt.getMonth()]} ${dt.getFullYear()}`
    return {
      id:     d.id,
      title:  d.title,
      result,
      prize:  won ? `+R$ ${Math.round(d.net_pot)}` : lost ? `-R$ ${d.entry_amount}` : `R$ ${d.entry_amount}`,
      date:   dateStr,
      type:   d.type === "publico" ? "PÚBLICO" : d.type.toUpperCase(),
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
    { key: "dashboard", label: "Protocolos" },
    { key: "historico", label: "Auditoria" },
    { key: "config",    label: "Sistema" },
  ]

  return (
    <div className="min-h-screen flex flex-col pb-24"
      style={{ backgroundImage: "url('/images/gradient-background.jpg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundAttachment: "fixed" }}>

      {/* Header */}
      <header className="px-5 pt-12 pb-8">
        <div className="flex flex-col items-center gap-4">
          <AvatarPlaceholder size={96} initials={initials} />
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-black text-gray-800 tracking-tighter leading-none">{USER.name}</h1>
              {USER.verified && <div className="w-5 h-5 rounded-full bg-[#00D26A] flex items-center justify-center border-2 border-white"><Check className="w-3 h-3 text-[#0A0F0D] stroke-[3]" /></div>}
            </div>
            <p className="text-[10px] text-gray-400 font-mono mt-1 uppercase tracking-widest">{USER.username}</p>
          </div>

          {/* Dark glass stats card */}
          <div className="w-full mt-4 rounded-[2.5rem] p-6 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg,#0A0F0D 0%,#00A851 70%,#00D26A 100%)", boxShadow: "0 14px 40px rgba(0,210,106,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#9945FF] opacity-10 blur-3xl" />
            <div className="flex justify-around relative z-10">
              <div className="text-center">
                <p className="text-xl font-black text-white tracking-tight leading-none">{USER.totalWon}</p>
                <p className="text-[9px] text-white/40 mt-2 font-black uppercase tracking-widest">Rendimento</p>
              </div>
              <div className="w-px bg-white/10" />
              <div className="text-center">
                <p className="text-xl font-black text-white tracking-tight leading-none">{USER.totalDeals}</p>
                <p className="text-[9px] text-white/40 mt-2 font-black uppercase tracking-widest">Acordos</p>
              </div>
              <div className="w-px bg-white/10" />
              <div className="text-center">
                <p className="text-xl font-black tracking-tight leading-none" style={{ color: USER.pnlPositive ? "#00D26A" : "#FF4A4A" }}>{USER.pnl}</p>
                <p className="text-[9px] text-white/40 mt-2 font-black uppercase tracking-widest">PnL</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-5 mb-6">
        <div className="flex gap-1.5 p-1 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.35)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.5)" }}>
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300"
              style={{ background: tab === key ? "#00D26A" : "transparent", color: tab === key ? "#0A0F0D" : "#6B7280", boxShadow: tab === key ? "0 4px 12px rgba(0,210,106,0.3)" : "none" }}>
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

