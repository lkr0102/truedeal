"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Home, Compass, Wallet, User, CheckCircle2,
  Instagram, Twitter, Youtube, ChevronRight, Copy,
  Trophy, Zap, Star, Shield, Bell, HelpCircle, LogOut,
  Check, Users, Flame, Target, Award, Clock, Info, X, Loader2,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getMySocialConnections, saveMembershipEmail } from "@/lib/actions/profile"
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

// ── Social verification helpers ─────────────────────────────────────────────

type SocialKey    = "x" | "strava" | "wellhub" | "totalpass"
type ConnectMode  = "oauth" | "email"
type ConnectState = "idle" | "connected" | "pending"

interface Platform {
  key:          SocialKey
  label:        string
  dealCategory: string
  whyNeeded:    string
  color:        string
  textColor:    string
  mode:         ConnectMode
  oauthPath?:   string
}

const PLATFORMS: Platform[] = [
  {
    key:          "x",
    label:        "X (Twitter)",
    dealCategory: "Social Media",
    whyNeeded:    "Necessário para deals de crescimento de seguidores, posts e engajamento no X. O app lê seus dados via API do X para verificar automaticamente o resultado.",
    color:        "#000000",
    textColor:    "#ffffff",
    mode:         "oauth",
    oauthPath:    "/api/auth/x",
  },
  {
    key:          "strava",
    label:        "Strava",
    dealCategory: "Corrida & Ciclismo",
    whyNeeded:    "Necessário para deals de corrida, ciclismo e atividades ao ar livre. O app lê suas atividades com GPS via API do Strava para verificar distâncias e tempos.",
    color:        "#FC4C02",
    textColor:    "#ffffff",
    mode:         "oauth",
    oauthPath:    "/api/auth/strava",
  },
  {
    key:          "wellhub",
    label:        "Wellhub",
    dealCategory: "Academia & Fitness",
    whyNeeded:    "Necessário para deals de frequência em academias parceiras Wellhub (ex-Gympass). A verificação de check-ins é feita via parceria com a plataforma.",
    color:        "#00A651",
    textColor:    "#ffffff",
    mode:         "email",
  },
  {
    key:          "totalpass",
    label:        "TotalPass",
    dealCategory: "Academia & Fitness",
    whyNeeded:    "Necessário para deals de check-in em academias parceiras TotalPass. A verificação é feita via parceria com a plataforma.",
    color:        "#0047AB",
    textColor:    "#ffffff",
    mode:         "email",
  },
]

interface SocialConnection {
  platform: string
  status: string
  username?: string | null
  member_email?: string | null
  external_id?: string | null
}

function PlatformIcon({ p }: { p: Platform }) {
  const letters: Record<SocialKey, string> = { x: "𝕏", strava: "S", wellhub: "W", totalpass: "TP" }
  return (
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm"
      style={{ background: p.color, color: p.textColor }}
    >
      {letters[p.key]}
    </div>
  )
}

function MembershipModal({
  platform,
  onClose,
  onSaved,
}: {
  platform: Platform
  onClose: () => void
  onSaved: () => void
}) {
  const [email, setEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!email.trim() || !email.includes("@")) { setError("E-mail inválido"); return }
    setSaving(true)
    const result = await saveMembershipEmail(platform.key as "wellhub" | "totalpass", email.trim())
    if (result.error) { setError(result.error); setSaving(false); return }
    onSaved()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl p-6 pb-10"
        style={{ background: "rgba(255,255,255,0.97)", boxShadow: "0 -16px 64px rgba(0,0,0,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <PlatformIcon p={platform} />
            <div>
              <p className="font-bold text-gray-800">{platform.label}</p>
              <p className="text-xs text-gray-400">Verificação de membership</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.07)" }}>
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="rounded-2xl p-4 mb-5" style={{ background: "rgba(0,71,171,0.06)", border: "1px solid rgba(0,71,171,0.12)" }}>
          <div className="flex gap-2.5">
            <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: platform.color }} />
            <div>
              <p className="text-xs font-bold mb-0.5" style={{ color: platform.color }}>Verificação via parceria</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                {platform.label} não possui OAuth público para apps de terceiros. Cadastre o e-mail da sua conta {platform.label} — a verificação automática dos seus check-ins será ativada assim que a parceria estiver ativa.
              </p>
            </div>
          </div>
        </div>

        <label className="text-sm font-semibold text-gray-700 block mb-2">
          E-mail da sua conta {platform.label}
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null) }}
          placeholder="seu@email.com"
          className="w-full px-4 py-3 rounded-xl outline-none text-gray-800 placeholder-gray-400 mb-4"
          style={{ background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.1)" }}
        />

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving || !email.trim()}
          className="w-full py-3.5 rounded-2xl font-semibold text-white transition-all active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, ${platform.color}, ${platform.color}CC)`,
            opacity: saving || !email.trim() ? 0.6 : 1,
          }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Salvar e-mail"}
        </button>

        <p className="text-center text-xs text-gray-400 mt-3">
          Você poderá atualizar isso no seu perfil a qualquer momento
        </p>
      </div>
    </div>
  )
}

function SocialCard({
  platform,
  state,
  username,
  onOAuth,
  onEmailSaved,
}: {
  platform:     Platform
  state:        ConnectState
  username?:    string | null
  onOAuth:      () => void
  onEmailSaved: () => void
}) {
  const [showTip, setShowTip] = useState(false)
  const [showModal, setShowModal] = useState(false)

  function handleConnect() {
    if (platform.mode === "oauth")  { onOAuth(); return }
    if (platform.mode === "email")  { setShowModal(true) }
  }

  return (
    <>
      <div
        className="rounded-2xl p-4 transition-all duration-200"
        style={{
          background: state === "connected"
            ? "rgba(22,163,74,0.07)"
            : state === "pending"
            ? `${platform.color}0D`
            : "rgba(255,255,255,0.55)",
          backdropFilter: "blur(20px)",
          border: state === "connected"
            ? "1px solid rgba(22,163,74,0.25)"
            : state === "pending"
            ? `1px solid ${platform.color}30`
            : "1px solid rgba(255,255,255,0.55)",
        }}
      >
        <div className="flex items-center gap-3">
          <PlatformIcon p={platform} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <span className="text-sm font-bold text-gray-800">{platform.label}</span>
              {state === "connected" && username && (
                <span className="text-[10px] text-gray-400">@{username}</span>
              )}
              <button type="button" onClick={() => setShowTip(v => !v)} className="text-gray-300 hover:text-gray-500">
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${platform.color}18`, color: platform.color }}
            >
              {platform.dealCategory}
            </span>
          </div>

          {state === "connected" ? (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
              <span className="text-xs font-bold text-[#16A34A]">Conectado</span>
            </div>
          ) : state === "pending" ? (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Clock className="w-4 h-4" style={{ color: platform.color }} />
              <span className="text-xs font-bold" style={{ color: platform.color }}>Pendente</span>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
              style={{ background: `linear-gradient(135deg, ${platform.color}, ${platform.color}CC)` }}
            >
              Conectar
            </button>
          )}
        </div>

        {showTip && (
          <div
            className="mt-3 rounded-xl px-3 py-2.5 text-xs text-gray-600 leading-relaxed"
            style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)" }}
          >
            <span className="font-semibold text-gray-700">Por que verificar? </span>
            {platform.whyNeeded}
            {platform.mode === "email" && (
              <span className="block mt-1.5 text-[11px]" style={{ color: platform.color }}>
                ⚠ Verificação automática ativa quando a parceria {platform.label} estiver disponível.
              </span>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <MembershipModal
          platform={platform}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); onEmailSaved() }}
        />
      )}
    </>
  )
}

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

  const [states, setStates] = useState<Record<SocialKey, ConnectState>>({
    x: "idle", strava: "idle", wellhub: "idle", totalpass: "idle",
  })
  const [usernames, setUsernames] = useState<Record<SocialKey, string | null>>({
    x: null, strava: null, wellhub: null, totalpass: null,
  })

  useEffect(() => {
    getMySocialConnections().then(({ connections }) => {
      const newStates = { ...states }
      const newUsernames = { ...usernames }
      for (const c of connections) {
        const key = c.platform as SocialKey
        if (key in newStates) {
          newStates[key] = c.status === "pending" ? "pending" : "connected"
          newUsernames[key] = c.username ?? null
        }
      }
      setStates(newStates)
      setUsernames(newUsernames)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="px-5 pb-8 space-y-8">
      <div className="rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)" }}>
        <div className="mb-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Verificação de contas</p>
          <p className="text-xs text-gray-400 mt-2">Vincule suas contas para desbloquear deals desses canais. Toque no <Info className="w-3 h-3 inline -mt-0.5" /> para entender a importância de cada verificação.</p>
        </div>
        <div className="space-y-3">
          {PLATFORMS.map((platform) => (
            <SocialCard
              key={platform.key}
              platform={platform}
              state={states[platform.key]}
              username={usernames[platform.key]}
              onOAuth={() => { if (platform.oauthPath) window.location.href = platform.oauthPath }}
              onEmailSaved={() => setStates(prev => ({ ...prev, [platform.key]: "pending" }))}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)" }}>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Referral</p>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-gray-600">Código de indicação</p>
            <p className="mt-1 font-semibold text-gray-800">{user.referralCode || "—"}</p>
          </div>
          <button onClick={copyReferral}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)" }}>
            {copied ? "Copiado" : "Copiar link"}
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

export default function ProfileClient({ profile, deals, userId }: ProfileClientProps) {
  const router = useRouter()

  // ── Derived stats ──
  const myDeals   = deals.filter(d => d.participants.some(p => p.user_id === userId))
  const finalized = myDeals.filter(d => d.status === "finalizado")
  const wonDeals  = finalized.filter(d => d.winner_id === userId)
  const volumeTotal = myDeals.reduce((s, d) => s + d.pot_total, 0)
  const totalWon  = wonDeals.reduce((s, d) => s + d.net_pot, 0)
  const totalSpent = myDeals.reduce((s, d) => s + d.entry_amount, 0)
  const pnl       = totalWon - totalSpent
  const winRate   = finalized.length > 0 ? Math.round((wonDeals.length / finalized.length) * 100) : 0
  const winRateLabel = `${wonDeals.length}/${myDeals.length}`

  // ── USER object ──
  const displayName = profile?.display_name ?? "Usuário"
  const initials    = getInitials(displayName)

  const USER = {
    name:          displayName,
    username:      profile?.username ? `@${profile.username}` : "",
    verified:      !!profile,
    tdp:           profile?.tdp_points ?? 0,
    streak:        profile?.streak_days ?? 0,
    volumeTotal:   `R$ ${Math.round(volumeTotal).toLocaleString("pt-BR")}`,
    totalWon:      totalWon > 0 ? `R$ ${Math.round(totalWon).toLocaleString("pt-BR")}` : "R$ 0",
    totalDeals:    myDeals.length,
    winRateLabel:  winRateLabel,
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
                <p className="text-xl font-black text-[#ADFF2F]">{USER.volumeTotal}</p>
                <p className="text-[10px] text-white/50 mt-0.5 font-medium uppercase tracking-wide">Volume total</p>
              </div>
              <div className="w-px bg-white/10" />
              <div className="text-center">
                <p className="text-xl font-black text-[#ADFF2F]">{USER.totalWon}</p>
                <p className="text-[10px] text-white/50 mt-0.5 font-medium uppercase tracking-wide">Total ganho</p>
              </div>
              <div className="w-px bg-white/10" />
              <div className="text-center">
                <p className="text-xl font-black" style={{ color: USER.pnlPositive ? "#ADFF2F" : "#FF4A4A" }}>{USER.pnl}</p>
                <p className="text-[10px] text-white/50 mt-0.5 font-medium uppercase tracking-wide">PnL</p>
              </div>
              <div className="w-px bg-white/10" />
              <div className="text-center">
                <p className="text-xl font-black text-[#ADFF2F]">{USER.totalDeals}</p>
                <p className="text-[10px] text-white/50 mt-0.5 font-medium uppercase tracking-wide">Deals · {USER.winRateLabel}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1">
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

        <div className="px-5 mt-4 mb-3">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Histórico de deals</h2>
        </div>
        <HistoryTab dealHistory={dealHistory} />
      </div>

      <div className="px-5 pb-24 pt-4">
        <button onClick={handleSignOut}
          className="w-full rounded-2xl px-4 py-4 text-sm font-semibold text-[#B91C1C] text-left transition-colors hover:bg-white/80 hover:text-[#991B1B]"
          style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(185,28,28,0.18)" }}>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#FEE2E2] text-[#B91C1C]">
              <LogOut className="w-5 h-5" />
            </span>
            <span>Sair da conta</span>
          </div>
        </button>
      </div>

      <BottomNav active="Perfil" />
    </div>
  )
}

