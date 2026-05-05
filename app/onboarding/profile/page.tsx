"use client"

import type { ChangeEvent } from "react"
import { useState, useRef, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Camera, Hash, ArrowRight, CheckCircle2, Loader2, Info, X, Clock } from "lucide-react"
import { updateProfile, getMySocialConnections, saveMembershipEmail } from "@/lib/actions/profile"
import { createClient } from "@/lib/supabase/client"

// ── Handle generator ──────────────────────────────────────────────────────────

function generateHandle(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12)
  const num = Math.floor(1000 + Math.random() * 9000)
  return `${base || "user"}#${num}`
}

// ── Platform definitions ──────────────────────────────────────────────────────

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

// Platform icon badge
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

// ── Membership email modal (Wellhub / TotalPass) ──────────────────────────────

function MembershipModal({
  platform,
  onClose,
  onSaved,
}: {
  platform: Platform
  onClose: () => void
  onSaved: () => void
}) {
  const [email,   setEmail]   = useState("")
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

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
        {/* Header */}
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

        {/* Info box */}
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

        {/* Email input */}
        <label className="text-sm font-semibold text-gray-700 block mb-2">
          E-mail da sua conta {platform.label}
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null) }}
          placeholder={`seu@email.com`}
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

// ── Social connect card ───────────────────────────────────────────────────────

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
  const [showTip,    setShowTip]    = useState(false)
  const [showModal,  setShowModal]  = useState(false)

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

          {/* Action button / status */}
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

        {/* Why needed tooltip */}
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

// ── Page ──────────────────────────────────────────────────────────────────────

function ProfileSetupContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const fileRef      = useRef<HTMLInputElement>(null)

  const [name,         setName]         = useState("")
  const [handle,       setHandle]       = useState("")
  const [photo,        setPhoto]        = useState<string | null>(null)
  const [photoFile,    setPhotoFile]    = useState<File | null>(null)
  const [uploading,    setUploading]    = useState(false)
  const [handleEdited, setHandleEdited] = useState(false)
  const [socialError,  setSocialError]  = useState<string | null>(null)

  const [states, setStates] = useState<Record<SocialKey, ConnectState>>({
    x: "idle", strava: "idle", wellhub: "idle", totalpass: "idle",
  })
  const [usernames, setUsernames] = useState<Record<SocialKey, string | null>>({
    x: null, strava: null, wellhub: null, totalpass: null,
  })

  // Load existing connections on mount
  useEffect(() => {
    getMySocialConnections().then(({ connections }) => {
      const newStates    = { ...states }
      const newUsernames = { ...usernames }
      for (const c of connections) {
        const key = c.platform as SocialKey
        if (key in newStates) {
          newStates[key]    = c.status === "pending" ? "pending" : "connected"
          newUsernames[key] = c.username
        }
      }
      setStates(newStates)
      setUsernames(newUsernames)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle return from OAuth (Strava / X)
  useEffect(() => {
    const connected = searchParams.get("social_connected") as SocialKey | null
    const errParam  = searchParams.get("social_error")

    if (connected && connected in states) {
      setStates(prev => ({ ...prev, [connected]: "connected" }))
    }
    if (errParam) {
      const messages: Record<string, string> = {
        strava_denied: "Autorização do Strava cancelada.",
        strava_token:  "Erro ao conectar com Strava. Tente novamente.",
        x_denied:      "Autorização do X cancelada.",
      }
      setSocialError(messages[errParam] ?? "Erro ao conectar. Tente novamente.")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?"

  function handleNameChange(value: string) {
    setName(value)
    if (!handleEdited) setHandle(generateHandle(value))
  }

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhoto(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function handleOAuth(platform: Platform) {
    if (platform.oauthPath) window.location.href = platform.oauthPath
  }

  function handleEmailSaved(key: SocialKey) {
    setStates(prev => ({ ...prev, [key]: "pending" }))
  }

  async function handleContinue() {
    if (!name.trim()) return
    setUploading(true)

    const supabase = createClient()
    let avatar_url: string | undefined

    if (photoFile) {
      const ext = photoFile.name.split(".").pop() ?? "jpg"
      const { data: { user } } = await supabase.auth.getUser()
      const path = `${user?.id ?? "anon"}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, photoFile, { upsert: true })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
        avatar_url = urlData.publicUrl
      }
    }

    const username = handle.replace(/[^a-z0-9_]/gi, "").toLowerCase().slice(0, 20) || "user"
    await updateProfile({ display_name: name.trim(), username, ...(avatar_url ? { avatar_url } : {}) })
    await supabase.auth.updateUser({ data: { onboarding_completed: true } })
    router.push("/onboarding/survey")
  }

  const isValid = name.trim().length >= 2

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage:      "url('/images/gradient-background.jpg')",
        backgroundSize:       "cover",
        backgroundPosition:   "center",
        backgroundRepeat:     "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Progress */}
      <div className="px-5 pt-12 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.3)" }}>
            <div className="h-full rounded-full" style={{ width: "50%", background: "linear-gradient(90deg, #16A34A, #22C55E)" }} />
          </div>
        </div>
        <p className="text-xs text-gray-500">Etapa 1 de 2 — Perfil</p>
      </div>

      <div className="flex-1 px-5 pb-8 overflow-y-auto">
        <div className="text-center mb-8 mt-4">
          <h1 className="text-2xl font-bold text-gray-800">Crie seu perfil</h1>
          <p className="text-gray-600 mt-1 text-sm">Como os outros te verão no True Deal</p>
        </div>

        {/* Avatar */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative w-24 h-24 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105"
            style={{
              background:  photo ? "transparent" : "linear-gradient(135deg, #1A2E3A 0%, #2A4E5A 100%)",
              boxShadow:   "0 8px 24px rgba(0,0,0,0.15)",
              border:      "2px solid rgba(255,255,255,0.5)",
            }}
          >
            {photo
              ? <img src={photo} alt="Foto de perfil" className="w-full h-full object-cover" />
              : <span className="text-blue-300 font-bold text-2xl">{initials}</span>}
            <div
              className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 hover:opacity-100 transition-opacity"
              style={{ background: "rgba(0,0,0,0.4)" }}
            >
              <Camera className="w-5 h-5 text-white" />
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>

        {/* Nome */}
        <div className="mb-5">
          <label className="text-sm font-semibold text-gray-600 mb-2 block">Nome completo</label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Seu nome"
            className="w-full p-4 rounded-xl outline-none text-gray-800 placeholder-gray-400 font-medium"
            style={{
              background:    "rgba(255,255,255,0.6)",
              backdropFilter: "blur(20px)",
              border:        name ? "2px solid rgba(22,163,74,0.4)" : "1px solid rgba(255,255,255,0.6)",
            }}
          />
        </div>

        {/* Handle */}
        <div className="mb-8">
          <label className="text-sm font-semibold text-gray-600 mb-2 block">
            Seu identificador <span className="text-gray-400 font-normal">(como amigos te encontram)</span>
          </label>
          <div
            className="flex items-center rounded-xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)" }}
          >
            <div className="px-3 py-4" style={{ borderRight: "1px solid rgba(255,255,255,0.5)" }}>
              <Hash className="w-4 h-4 text-[#16A34A]" />
            </div>
            <input
              type="text"
              value={handle.replace(/^[^#]*#?/, "").replace("#", "")}
              onChange={(e) => {
                setHandleEdited(true)
                const base = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "").replace(/[^a-z0-9]/g, "").slice(0, 12) || "user"
                setHandle(`${base}#${e.target.value.replace(/\D/g, "").slice(0, 4)}`)
              }}
              placeholder="0000"
              className="flex-1 px-3 py-4 outline-none text-gray-800 font-medium bg-transparent"
              maxLength={4}
            />
            <span className="px-3 text-sm text-gray-400">{handle.split("#")[0] || "user"}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1 ml-1">
            Identificador único: <span className="text-[#16A34A] font-medium">{handle || "user#0000"}</span>
          </p>
        </div>

        {/* Social verification */}
        <div className="mb-8">
          <div className="mb-3">
            <label className="text-sm font-semibold text-gray-600 block">
              Verificação de contas <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              Vincule suas contas para desbloquear deals desses canais. Toque no{" "}
              <Info className="w-3 h-3 inline -mt-0.5" /> para entender a importância de cada verificação.
            </p>
          </div>

          <div className="space-y-3">
            {PLATFORMS.map((platform) => (
              <SocialCard
                key={platform.key}
                platform={platform}
                state={states[platform.key]}
                username={usernames[platform.key]}
                onOAuth={() => handleOAuth(platform)}
                onEmailSaved={() => handleEmailSaved(platform.key)}
              />
            ))}
          </div>

          {socialError && (
            <p className="text-xs text-red-500 mt-2 ml-1">{socialError}</p>
          )}
        </div>

        {/* Continuar */}
        <button
          onClick={handleContinue}
          disabled={!isValid || uploading}
          className={`w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300 ${
            isValid && !uploading ? "hover:scale-[1.02] active:scale-[0.98]" : "opacity-40 cursor-not-allowed"
          }`}
          style={{
            background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
            boxShadow:  isValid ? "0 8px 32px rgba(22,163,74,0.4)" : "none",
          }}
        >
          {uploading ? "Salvando…" : "Continuar"}
          {!uploading && <ArrowRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  )
}

export default function ProfileSetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white font-bold bg-[#1A2E3A]">Carregando...</div>}>
      <ProfileSetupContent />
    </Suspense>
  )
}
