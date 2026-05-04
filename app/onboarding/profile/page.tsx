"use client"

import type { ChangeEvent } from "react"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Camera, Hash, ArrowRight, CheckCircle2, Loader2, Info } from "lucide-react"
import { updateProfile } from "@/lib/actions/profile"
import { createClient } from "@/lib/supabase/client"

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

// ── Social platform definitions ───────────────────────────────────────────────

type SocialKey = "x" | "strava" | "wellhub" | "totalpass"

interface SocialPlatform {
  key: SocialKey
  label: string
  dealCategory: string
  whyNeeded: string
  color: string
  available: boolean
}

const PLATFORMS: SocialPlatform[] = [
  {
    key:          "x",
    label:        "X (Twitter)",
    dealCategory: "Social Media",
    whyNeeded:    "Necessário para deals de crescimento de seguidores, posts e engajamento no X.",
    color:        "#000000",
    available:    true,
  },
  {
    key:          "strava",
    label:        "Strava",
    dealCategory: "Corrida & Ciclismo",
    whyNeeded:    "Necessário para deals de corrida, ciclismo e atividades ao ar livre verificadas por GPS.",
    color:        "#FC4C02",
    available:    false,
  },
  {
    key:          "wellhub",
    label:        "Wellhub",
    dealCategory: "Academia & Fitness",
    whyNeeded:    "Necessário para deals de frequência em academias parceiras Wellhub (ex-Gympass).",
    color:        "#00A651",
    available:    false,
  },
  {
    key:          "totalpass",
    label:        "TotalPass",
    dealCategory: "Academia & Fitness",
    whyNeeded:    "Necessário para deals de check-in em academias parceiras TotalPass.",
    color:        "#0047AB",
    available:    false,
  },
]

// Platform icon — letter badge
function PlatformIcon({ platform }: { platform: SocialPlatform }) {
  const letters: Record<SocialKey, string> = {
    x:         "𝕏",
    strava:    "S",
    wellhub:   "W",
    totalpass: "TP",
  }
  return (
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-black text-sm"
      style={{ background: platform.color }}
    >
      {letters[platform.key]}
    </div>
  )
}

// ── Social connect card ───────────────────────────────────────────────────────

function SocialCard({
  platform,
  connected,
  onConnect,
  connecting,
}: {
  platform: SocialPlatform
  connected: boolean
  onConnect: () => void
  connecting: boolean
}) {
  const [showTip, setShowTip] = useState(false)

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background:    connected ? "rgba(22,163,74,0.06)" : "rgba(255,255,255,0.55)",
        backdropFilter: "blur(20px)",
        border:        connected
          ? "1px solid rgba(22,163,74,0.25)"
          : "1px solid rgba(255,255,255,0.55)",
        transition: "all 0.2s",
      }}
    >
      <div className="flex items-center gap-3">
        <PlatformIcon platform={platform} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm font-bold text-gray-800">{platform.label}</span>
            {!platform.available && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(0,0,0,0.07)", color: "#9CA3AF" }}
              >
                Em breve
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowTip((v) => !v)}
              className="text-gray-300 hover:text-gray-500 transition-colors"
            >
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

        {/* Action */}
        {connected ? (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            <span className="text-xs font-bold text-[#16A34A]">Conectado</span>
          </div>
        ) : (
          <button
            onClick={onConnect}
            disabled={!platform.available || connecting}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
            style={{
              background: platform.available
                ? `linear-gradient(135deg, ${platform.color}, ${platform.color}CC)`
                : "rgba(0,0,0,0.07)",
              color:   platform.available ? "white" : "#9CA3AF",
              cursor:  platform.available ? "pointer" : "not-allowed",
              opacity: connecting ? 0.7 : 1,
            }}
          >
            {connecting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : platform.available ? (
              "Conectar"
            ) : (
              "Em breve"
            )}
          </button>
        )}
      </div>

      {/* Tooltip explaining why it's needed */}
      {showTip && (
        <div
          className="mt-3 rounded-xl px-3 py-2.5 text-xs text-gray-600 leading-relaxed"
          style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <span className="font-semibold text-gray-700">Por que verificar? </span>
          {platform.whyNeeded}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfileSetupPage() {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name,         setName]         = useState("")
  const [handle,       setHandle]       = useState("")
  const [photo,        setPhoto]        = useState<string | null>(null)
  const [photoFile,    setPhotoFile]    = useState<File | null>(null)
  const [uploading,    setUploading]    = useState(false)
  const [handleEdited, setHandleEdited] = useState(false)
  const [connected,    setConnected]    = useState<Record<SocialKey, boolean>>({
    x: false, strava: false, wellhub: false, totalpass: false,
  })
  const [connecting, setConnecting] = useState<SocialKey | null>(null)
  const [connectError, setConnectError] = useState<string | null>(null)

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?"

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

  async function handleConnect(key: SocialKey) {
    setConnectError(null)
    setConnecting(key)

    if (key === "x") {
      const supabase = createClient()
      const { error } = await supabase.auth.linkIdentity({
        provider: "twitter",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding/profile` },
      })
      if (error) {
        setConnectError(error.message)
        setConnecting(null)
      }
      // On success the browser redirects — no further action needed here
      return
    }

    setConnecting(null)
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
        backgroundImage:    "url('/images/gradient-background.jpg')",
        backgroundSize:     "cover",
        backgroundPosition: "center",
        backgroundRepeat:   "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Progress bar */}
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
            {photo ? (
              <img src={photo} alt="Foto de perfil" className="w-full h-full object-cover" />
            ) : (
              <span className="text-blue-300 font-bold text-2xl">{initials}</span>
            )}
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
            <div className="px-3 py-4 flex items-center gap-1" style={{ borderRight: "1px solid rgba(255,255,255,0.5)" }}>
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
              Vincule suas contas para participar de deals que usam esses canais.
              Toque no <span className="inline-flex items-center gap-0.5"><Info className="w-3 h-3 inline" /></span> para entender por que cada uma é necessária.
            </p>
          </div>

          <div className="space-y-3">
            {PLATFORMS.map((platform) => (
              <SocialCard
                key={platform.key}
                platform={platform}
                connected={connected[platform.key]}
                connecting={connecting === platform.key}
                onConnect={() => handleConnect(platform.key)}
              />
            ))}
          </div>

          {connectError && (
            <p className="text-xs text-red-500 mt-2 ml-1">{connectError}</p>
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
