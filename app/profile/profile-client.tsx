"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Home, Compass, Wallet, User, Plus, CheckCircle2,
  ChevronRight,
  Trophy, Zap, Shield, Bell, HelpCircle, LogOut,
  Target, Clock, Info, X, Loader2, Camera, Pencil, Mail, Trash2,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getMySocialConnections, saveMembershipEmail, updateProfile, removeSocialConnection } from "@/lib/actions/profile"
import type { Profile, DealWithParticipants } from "@/lib/supabase/types"

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: "#F0F3F0", surface: "#FFFFFF", surface2: "#E8EDE8",
  border: "#D8E0D8", border2: "#E6EEE6",
  text: "#0B1309", mid: "#4E614E", dim: "#8BA09A",
  brand: "#00B852", brandDark: "#008C3E", forming: "#E8620A",
  activeLight: "rgba(0,184,82,0.08)", activeBorder: "rgba(0,184,82,0.2)",
} as const
const MONO: React.CSSProperties = { fontFamily: "var(--font-dm-mono,'DM Mono',monospace)" }

function BottomNav({ active }: { active: string }) {
  const router = useRouter()
  const navItem = (Icon: React.ElementType, key: string, href: string, label: string) => {
    const isActive = active === key
    return (
      <button key={key} onClick={() => router.push(href)}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontSize: 9, color: isActive ? C.brand : C.dim, cursor: "pointer", background: "none", border: "none", flex: 1, ...MONO, letterSpacing: "0.04em" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: isActive ? C.brand : "transparent" }}>
          <Icon style={{ width: 20, height: 20, stroke: isActive ? "#fff" : C.dim, fill: "none" }} />
        </div>
        <span style={{ textTransform: "uppercase" as const }}>{label}</span>
      </button>
    )
  }
  return (
    <nav data-bottom-nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(240,243,240,0.94)", backdropFilter: "blur(16px)", borderTop: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", padding: "9px 0 26px", zIndex: 20 }}>
      {navItem(Home,    "home",    "/",        "Deals")}
      {navItem(Compass, "explore", "/explore", "Explorar")}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        <button onClick={() => router.push("/create")} style={{ width: 50, height: 50, background: C.brand, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginTop: -14, boxShadow: "0 4px 14px rgba(0,184,82,0.35)", border: `3px solid ${C.bg}`, cursor: "pointer" }}>
          <Plus style={{ width: 22, height: 22, stroke: "#fff", fill: "none" }} />
        </button>
        <span style={{ fontSize: 9, fontWeight: 500, color: C.brand, textTransform: "uppercase" as const, letterSpacing: "0.04em", ...MONO }}>New Deal</span>
      </div>
      {navItem(Wallet, "wallet",  "/wallet",  "Wallet")}
      {navItem(User,   "profile", "/profile", "Perfil")}
    </nav>
  )
}

// ── Social verification helpers ─────────────────────────────────────────────

type SocialKey    = "x" | "strava" | "youtube" | "totalpass"
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
    key:          "youtube",
    label:        "YouTube",
    dealCategory: "Social Media",
    whyNeeded:    "Necessário para deals de crescimento de inscritos e visualizações no YouTube. O app lê seus dados via YouTube Data API para verificar automaticamente os resultados.",
    color:        "#FF0000",
    textColor:    "#ffffff",
    mode:         "oauth",
    oauthPath:    "/api/auth/youtube",
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
  const letters: Record<SocialKey, string> = { x: "𝕏", strava: "S", youtube: "▶", totalpass: "TP" }
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
    const result = await saveMembershipEmail(platform.key as "totalpass", email.trim())
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
        style={{ background: C.surface, boxShadow: "0 -16px 64px rgba(0,0,0,0.2)" }}
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
          style={{ background: C.surface2, border: `1px solid ${C.border}` }}
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
  onRemoved,
}: {
  platform:     Platform
  state:        ConnectState
  username?:    string | null
  onOAuth:      () => void
  onEmailSaved: () => void
  onRemoved:    () => void
}) {
  const [showTip,    setShowTip]    = useState(false)
  const [showModal,  setShowModal]  = useState(false)
  const [removing,   setRemoving]   = useState(false)
  const [removeErr,  setRemoveErr]  = useState<string | null>(null)

  function handleConnect() {
    if (platform.mode === "oauth") { onOAuth(); return }
    if (platform.mode === "email") { setShowModal(true) }
  }

  async function handleRemove() {
    setRemoving(true)
    setRemoveErr(null)
    const result = await removeSocialConnection(platform.key)
    setRemoving(false)
    if (result.error) { setRemoveErr(result.error); return }
    onRemoved()
  }

  return (
    <>
      <div
        style={{
          background: state === "connected" ? C.activeLight : state === "pending" ? `${platform.color}0D` : C.surface,
          border: state === "connected" ? `1px solid ${C.activeBorder}` : state === "pending" ? `1px solid ${platform.color}30` : `1px solid ${C.border}`,
          borderRadius: 14, padding: 16,
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
              <button
                onClick={handleRemove}
                disabled={removing}
                style={{ fontSize: 11, fontWeight: 600, color: "#DC2626", padding: "4px 8px", borderRadius: 8, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", cursor: "pointer" }}
              >
                {removing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Remover"}
              </button>
              <button
                onClick={handleConnect}
                style={{ fontSize: 11, fontWeight: 600, color: C.brand, padding: "4px 8px", borderRadius: 8, background: C.activeLight, border: `1px solid ${C.activeBorder}`, cursor: "pointer" }}
              >
                Trocar
              </button>
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

        {removeErr && (
          <div className="mt-2 rounded-xl px-3 py-2 text-xs text-red-600" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)" }}>
            {removeErr}
          </div>
        )}

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
  profile:   Profile | null
  deals:     DealWithParticipants[]
  userId:    string | null
  userEmail: string | null
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

function Avatar({ size = 84, initials, avatarUrl, onClick }: {
  size?: number
  initials: string
  avatarUrl?: string | null
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{ position: "relative", width: size, height: size, border: "none", cursor: "pointer", background: "transparent", padding: 0, flexShrink: 0 }}
    >
      <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", border: `3px solid ${C.surface}`, boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="Foto de perfil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: C.brand }}>
            <span style={{ fontWeight: 800, color: "#fff", fontSize: size * 0.3 }}>{initials}</span>
          </div>
        )}
      </div>
      <div style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: "50%", background: C.brandDark, border: `2px solid ${C.surface}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Camera style={{ width: 12, height: 12, color: "#fff", fill: "none" }} />
      </div>
    </button>
  )
}

function formatHandle(username: string): string {
  const match = username.match(/^(.+?)(\d{4})$/)
  if (match) return `${match[1]} #${match[2]}`
  return `@${username}`
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
    x: "idle", strava: "idle", youtube: "idle", totalpass: "idle",
  })
  const [usernames, setUsernames] = useState<Record<SocialKey, string | null>>({
    x: null, strava: null, youtube: null, totalpass: null,
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
      <div style={{ borderRadius: 18, padding: 20, background: C.surface, border: `1px solid ${C.border}` }}>
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
              onRemoved={() => setStates(prev => ({ ...prev, [platform.key]: "idle" }))}
            />
          ))}
        </div>
      </div>

      <div style={{ borderRadius: 18, padding: 20, background: C.surface, border: `1px solid ${C.border}` }}>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Referral</p>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-gray-600">Código de indicação</p>
            <p className="mt-1 font-semibold text-gray-800">{user.referralCode || "—"}</p>
          </div>
          <button onClick={copyReferral}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ background: `linear-gradient(135deg,${C.brandDark},${C.brand})` }}>
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
        <div style={{ borderRadius: 18, padding: 32, textAlign: "center", background: C.surface, border: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 13, color: C.dim }}>Nenhum deal ainda — crie ou entre em um deal para começar</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 pb-8 space-y-3">
      {dealHistory.map((deal) => (
        <div key={deal.id} style={{ borderRadius: 18, padding: 16, display: "flex", alignItems: "center", gap: 12, background: C.surface, border: `1px solid ${C.border}` }}>
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
    { icon: User,      label: "Editar Perfil",           sub: "Atualize suas informações",     color: C.brand,   danger: false, action: undefined as (() => void) | undefined },
    { icon: Shield,    label: "Segurança & Privacidade", sub: "Senha, 2FA, biometria",         color: "#3B82F6", danger: false, action: undefined as (() => void) | undefined },
    { icon: Bell,      label: "Notificações",            sub: "Gerencie seus alertas",         color: "#F59E0B", danger: false, action: undefined as (() => void) | undefined },
    { icon: HelpCircle,label: "Ajuda & Suporte",         sub: "FAQs e contato",                color: "#8B5CF6", danger: false, action: undefined as (() => void) | undefined },
    { icon: LogOut,    label: "Sair",                    sub: "Sair da sua conta",             color: "#FF4A4A", danger: true,  action: onSignOut },
  ]

  return (
    <div className="px-5 pb-8 space-y-3">
      {CONFIG_ITEMS.map(({ icon: Icon, label, sub, color, danger, action }) => (
        <button key={label} onClick={action} style={{ width: "100%", borderRadius: 18, padding: 16, display: "flex", alignItems: "center", gap: 16, textAlign: "left", cursor: "pointer", background: danger ? "rgba(255,74,74,0.05)" : C.surface, border: danger ? "1px solid rgba(255,74,74,0.15)" : `1px solid ${C.border}` }}>
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

export default function ProfileClient({ profile, deals, userId, userEmail }: ProfileClientProps) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const socialError  = searchParams.get("social_error")
  const socialSuccess = searchParams.get("social_success")

  const fileRef     = useRef<HTMLInputElement>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null)

  // ── Username / display name edit ──
  const [editingName,  setEditingName]  = useState(false)
  const [editDisplay,  setEditDisplay]  = useState(profile?.display_name ?? "")
  const [editPrefix,   setEditPrefix]   = useState(() => {
    const m = profile?.username?.match(/^(.+?)(\d{4})$/)
    return m ? m[1] : (profile?.username ?? "")
  })
  const [savingName,   setSavingName]   = useState(false)
  const [nameErr,      setNameErr]      = useState<string | null>(null)
  const usernameSuffix = profile?.username?.match(/^.+?(\d{4})$/)?.[1] ?? null

  async function handleSaveName() {
    if (!editDisplay.trim()) { setNameErr("Nome não pode estar vazio"); return }
    if (!editPrefix.trim())  { setNameErr("Username não pode estar vazio"); return }
    setSavingName(true)
    setNameErr(null)
    const newUsername = usernameSuffix ? `${editPrefix.trim()}${usernameSuffix}` : editPrefix.trim()
    const result = await updateProfile({ display_name: editDisplay.trim(), username: newUsername })
    setSavingName(false)
    if (result.error) { setNameErr(result.error); return }
    setEditingName(false)
    router.refresh()
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarUrl(ev.target?.result as string)
    reader.readAsDataURL(file)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const ext  = file.name.split(".").pop() ?? "jpg"
    const path = `${user?.id ?? "anon"}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true })
    if (!upErr) {
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
      await updateProfile({
        display_name: profile?.display_name ?? "Usuário",
        username:     profile?.username ?? "user",
        avatar_url:   urlData.publicUrl,
      })
      setAvatarUrl(urlData.publicUrl)
    }
  }

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
    volumeTotal:   `$${Math.round(volumeTotal).toLocaleString("en-US")}`,
    totalWon:      totalWon > 0 ? `$${Math.round(totalWon).toLocaleString("en-US")}` : "$0",
    totalDeals:    myDeals.length,
    winRateLabel:  winRateLabel,
    pnl:           `${pnl >= 0 ? "+" : "−"}$${Math.round(Math.abs(pnl)).toLocaleString("en-US")}`,
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
      prize:  won ? `+$${d.net_pot.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : lost ? `-$${d.entry_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : `$${d.entry_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
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

  const SOCIAL_ERROR_MSGS: Record<string, string> = {
    x_not_configured: "Integração com X não configurada. Adicione X_CLIENT_ID e X_CLIENT_SECRET ao servidor.",
    x_token_failed:   "Falha ao obter token do X. Verifique as credenciais do app.",
    no_verifier:      "Sessão expirada. Tente conectar novamente.",
    state_mismatch:   "Erro de segurança CSRF. Tente conectar novamente.",
    oauth_exception:  "Erro inesperado na autenticação. Tente novamente.",
  }

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, display: "flex", flexDirection: "column", paddingBottom: 90 }}>

      {socialError && (
        <div style={{ position: "fixed", top: 16, left: 16, right: 16, zIndex: 50, borderRadius: 16, padding: "12px 16px", fontSize: 13, fontWeight: 500, color: "#fff", display: "flex", alignItems: "flex-start", gap: 8, background: "rgba(220,38,38,0.95)" }}>
          <span style={{ flexShrink: 0 }}>✕</span>
          <span>{SOCIAL_ERROR_MSGS[socialError] ?? `Erro: ${socialError}`}</span>
        </div>
      )}

      {socialSuccess === "x" && (
        <div style={{ position: "fixed", top: 16, left: 16, right: 16, zIndex: 50, borderRadius: 16, padding: "12px 16px", fontSize: 13, fontWeight: 500, color: "#fff", display: "flex", alignItems: "center", gap: 8, background: "rgba(0,184,82,0.95)" }}>
          <CheckCircle2 style={{ width: 16, height: 16, flexShrink: 0 }} />
          <span>X (Twitter) conectado com sucesso!</span>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: "48px 20px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />
        <Avatar size={80} initials={initials} avatarUrl={avatarUrl} onClick={() => fileRef.current?.click()} />

        {editingName ? (
          <div style={{ width: "100%", maxWidth: 320, background: C.surface, borderRadius: 18, padding: 16, border: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.mid, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em", ...MONO }}>Editar perfil</p>
            <label style={{ fontSize: 11, color: C.dim, display: "block", marginBottom: 4 }}>Nome de exibição</label>
            <input
              value={editDisplay}
              onChange={e => { setEditDisplay(e.target.value); setNameErr(null) }}
              placeholder="Seu nome"
              style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, color: C.text, background: C.surface2, outline: "none", boxSizing: "border-box", marginBottom: 10 }}
            />
            <label style={{ fontSize: 11, color: C.dim, display: "block", marginBottom: 4 }}>Username</label>
            <div style={{ display: "flex", alignItems: "center", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", gap: 4, marginBottom: 12 }}>
              <input
                value={editPrefix}
                onChange={e => { setEditPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); setNameErr(null) }}
                placeholder="username"
                style={{ flex: 1, fontSize: 13, color: C.text, background: "transparent", border: "none", outline: "none" }}
              />
              {usernameSuffix && <span style={{ fontSize: 13, color: C.dim, flexShrink: 0 }}>#{usernameSuffix}</span>}
            </div>
            {nameErr && <p style={{ fontSize: 11, color: "#DC2626", marginBottom: 8 }}>{nameErr}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setEditingName(false)} style={{ flex: 1, padding: "9px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, color: C.mid, background: C.surface2, border: `1px solid ${C.border}`, cursor: "pointer" }}>Cancelar</button>
              <button onClick={handleSaveName} disabled={savingName} style={{ flex: 2, padding: "9px 0", borderRadius: 10, fontSize: 12, fontWeight: 700, color: "#fff", background: C.brand, border: "none", cursor: "pointer", opacity: savingName ? 0.7 : 1 }}>
                {savingName ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Salvar"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: C.text }}>{USER.name}</h1>
              {USER.verified && <CheckCircle2 style={{ width: 18, height: 18, color: C.brand }} />}
              <button onClick={() => { setEditDisplay(profile?.display_name ?? ""); setEditPrefix(() => { const m = profile?.username?.match(/^(.+?)(\d{4})$/); return m ? m[1] : (profile?.username ?? "") }); setEditingName(true) }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: C.dim, display: "flex", alignItems: "center" }}>
                <Pencil style={{ width: 14, height: 14 }} />
              </button>
            </div>
            {profile?.username && (
              <p style={{ fontSize: 11, color: C.dim, marginTop: 4, fontStyle: "italic", letterSpacing: "0.01em" }}>
                {formatHandle(profile.username)}
              </p>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 5 }}>
              <Mail style={{ width: 11, height: 11, color: C.dim }} />
              <span style={{ fontSize: 11, color: C.dim }}>{userEmail ?? "—"}</span>
            </div>
          </div>
        )}

        {/* Stats card */}
        <div style={{ width: "100%", borderRadius: 20, padding: 20, background: C.surface, border: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            {[
              { label: "Volume",              value: USER.volumeTotal, accent: C.text },
              { label: "Ganho",               value: USER.totalWon,   accent: C.brand },
              { label: "PnL",                 value: USER.pnl,        accent: USER.pnlPositive ? C.brand : "#DC2626" },
              { label: `${USER.winRateLabel}`, value: String(USER.totalDeals), accent: C.text },
            ].map((s, i, arr) => (
              <div key={s.label} style={{ display: "flex", alignItems: "stretch" }}>
                {i > 0 && <div style={{ width: 1, background: C.border, marginRight: 20 }} />}
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 17, fontWeight: 900, color: s.accent, letterSpacing: "-0.03em" }}>{s.value}</p>
                  <p style={{ fontSize: 9, color: C.dim, marginTop: 3, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", ...MONO }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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

      <div style={{ padding: "16px 20px 96px" }}>
        <button onClick={handleSignOut}
          style={{ width: "100%", borderRadius: 18, padding: 16, display: "flex", alignItems: "center", gap: 12, textAlign: "left", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#B91C1C", background: "rgba(254,226,226,0.5)", border: "1px solid rgba(185,28,28,0.18)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 12, background: "#FEE2E2" }}>
            <LogOut style={{ width: 20, height: 20, color: "#B91C1C" }} />
          </span>
          <span>Sair da conta</span>
        </button>
      </div>

      <BottomNav active="profile" />
    </div>
  )
}

