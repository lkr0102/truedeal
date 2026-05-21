"use client"

import type { ChangeEvent } from "react"
import { useState, useRef, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Camera, Hash, ArrowRight, CheckCircle2, Loader2, Info, X, Clock } from "lucide-react"
import { updateProfile, getMySocialConnections, saveMembershipEmail } from "@/lib/actions/profile"
import { createClient } from "@/lib/supabase/client"

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:           "#F0F3F0",
  surface:      "#FFFFFF",
  surface2:     "#E8EDE8",
  border:       "#D8E0D8",
  text:         "#0B1309",
  mid:          "#4E614E",
  dim:          "#8BA09A",
  brand:        "#00B852",
  brandDark:    "#008C3E",
  activeLight:  "rgba(0,184,82,0.08)",
  activeBorder: "rgba(0,184,82,0.2)",
} as const

const MONO: React.CSSProperties = { fontFamily: "var(--font-dm-mono,'DM Mono',monospace)" }

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
    key: "x", label: "X (Twitter)", dealCategory: "Social Media",
    whyNeeded: "Necessário para deals de crescimento de seguidores, posts e engajamento no X. O app lê seus dados via API do X para verificar automaticamente o resultado.",
    color: "#000000", textColor: "#ffffff", mode: "oauth", oauthPath: "/api/auth/x",
  },
  {
    key: "strava", label: "Strava", dealCategory: "Corrida & Ciclismo",
    whyNeeded: "Necessário para deals de corrida, ciclismo e atividades ao ar livre. O app lê suas atividades com GPS via API do Strava para verificar distâncias e tempos.",
    color: "#FC4C02", textColor: "#ffffff", mode: "oauth", oauthPath: "/api/auth/strava",
  },
  {
    key: "wellhub", label: "Wellhub", dealCategory: "Academia & Fitness",
    whyNeeded: "Necessário para deals de frequência em academias parceiras Wellhub (ex-Gympass). A verificação de check-ins é feita via parceria com a plataforma.",
    color: "#00A651", textColor: "#ffffff", mode: "email",
  },
  {
    key: "totalpass", label: "TotalPass", dealCategory: "Academia & Fitness",
    whyNeeded: "Necessário para deals de check-in em academias parceiras TotalPass. A verificação é feita via parceria com a plataforma.",
    color: "#0047AB", textColor: "#ffffff", mode: "email",
  },
]

// ── Platform icon ─────────────────────────────────────────────────────────────

function PlatformIcon({ p }: { p: Platform }) {
  const letters: Record<SocialKey, string> = { x: "𝕏", strava: "S", wellhub: "W", totalpass: "TP" }
  return (
    <div style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 900, fontSize: 14, background: p.color, color: p.textColor }}>
      {letters[p.key]}
    </div>
  )
}

// ── Membership email modal ────────────────────────────────────────────────────

function MembershipModal({ platform, onClose, onSaved }: { platform: Platform; onClose: () => void; onSaved: () => void }) {
  const [email,  setEmail]  = useState("")
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  async function handleSave() {
    if (!email.trim() || !email.includes("@")) { setError("E-mail inválido"); return }
    setSaving(true)
    const result = await saveMembershipEmail(platform.key as "wellhub" | "totalpass", email.trim())
    if (result.error) { setError(result.error); setSaving(false); return }
    onSaved()
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 480, background: C.surface, borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", boxShadow: "0 -16px 64px rgba(0,0,0,0.12)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <PlatformIcon p={platform} />
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{platform.label}</p>
              <p style={{ fontSize: 12, color: C.dim }}>Verificação de membership</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: C.surface2, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X width={14} height={14} color={C.mid} />
          </button>
        </div>

        <div style={{ borderRadius: 12, padding: 14, marginBottom: 18, background: `${platform.color}0D`, border: `1px solid ${platform.color}30` }}>
          <div style={{ display: "flex", gap: 10 }}>
            <Clock width={14} height={14} style={{ color: platform.color, flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: platform.color, marginBottom: 3 }}>Verificação via parceria</p>
              <p style={{ fontSize: 12, color: C.mid, lineHeight: 1.5 }}>
                {platform.label} não possui OAuth público. Cadastre o e-mail da sua conta {platform.label} — a verificação automática será ativada quando a parceria estiver ativa.
              </p>
            </div>
          </div>
        </div>

        <label style={{ fontSize: 13, fontWeight: 600, color: C.mid, display: "block", marginBottom: 8 }}>
          E-mail da sua conta {platform.label}
        </label>
        <input
          type="email" value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null) }}
          placeholder="seu@email.com"
          style={{ width: "100%", boxSizing: "border-box", padding: "13px 16px", borderRadius: 12, fontSize: 14, background: C.surface2, border: `1px solid ${C.border}`, color: C.text, outline: "none", marginBottom: 16 }}
        />

        {error && <p style={{ fontSize: 12, color: "#DC2626", marginBottom: 12 }}>{error}</p>}

        <button onClick={handleSave} disabled={saving || !email.trim()}
          style={{ width: "100%", padding: "14px 0", borderRadius: 16, fontWeight: 700, fontSize: 14, color: "#fff", background: platform.color, border: "none", cursor: saving || !email.trim() ? "not-allowed" : "pointer", opacity: saving || !email.trim() ? 0.5 : 1 }}>
          {saving ? <Loader2 style={{ width: 16, height: 16, margin: "0 auto" }} /> : "Salvar e-mail"}
        </button>
        <p style={{ textAlign: "center", fontSize: 11, color: C.dim, marginTop: 12 }}>Você poderá atualizar isso no seu perfil a qualquer momento</p>
      </div>
    </div>
  )
}

// ── Social connect card ───────────────────────────────────────────────────────

function SocialCard({ platform, state, username, onOAuth, onEmailSaved }: {
  platform: Platform; state: ConnectState; username?: string | null; onOAuth: () => void; onEmailSaved: () => void
}) {
  const [showTip,   setShowTip]   = useState(false)
  const [showModal, setShowModal] = useState(false)

  function handleConnect() {
    if (platform.mode === "oauth") { onOAuth(); return }
    setShowModal(true)
  }

  return (
    <>
      <div style={{
        borderRadius: 14, padding: 16,
        background: state === "connected" ? C.activeLight : state === "pending" ? `${platform.color}0D` : C.surface,
        border: state === "connected" ? `1px solid ${C.activeBorder}` : state === "pending" ? `1px solid ${platform.color}30` : `1px solid ${C.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <PlatformIcon p={platform} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{platform.label}</span>
              {state === "connected" && username && (
                <span style={{ fontSize: 11, color: C.dim }}>@{username}</span>
              )}
              <button type="button" onClick={() => setShowTip(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: C.dim, display: "flex" }}>
                <Info width={13} height={13} />
              </button>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: `${platform.color}18`, color: platform.color }}>
              {platform.dealCategory}
            </span>
          </div>

          {state === "connected" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <CheckCircle2 width={16} height={16} style={{ color: C.brand }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.brand }}>Conectado</span>
            </div>
          ) : state === "pending" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <Clock width={14} height={14} style={{ color: platform.color }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: platform.color }}>Pendente</span>
            </div>
          ) : (
            <button onClick={handleConnect}
              style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, color: "#fff", background: platform.color, border: "none", cursor: "pointer" }}>
              Conectar
            </button>
          )}
        </div>

        {showTip && (
          <div style={{ marginTop: 12, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: C.mid, lineHeight: 1.5, background: C.surface2, border: `1px solid ${C.border}` }}>
            <span style={{ fontWeight: 700, color: C.text }}>Por que verificar? </span>
            {platform.whyNeeded}
            {platform.mode === "email" && (
              <span style={{ display: "block", marginTop: 6, fontSize: 11, color: platform.color }}>
                ⚠ Verificação automática ativa quando a parceria {platform.label} estiver disponível.
              </span>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <MembershipModal platform={platform} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); onEmailSaved() }} />
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

  useEffect(() => {
    const connected = searchParams.get("social_connected") as SocialKey | null
    const errParam  = searchParams.get("social_error")
    if (connected && connected in states) setStates(prev => ({ ...prev, [connected]: "connected" }))
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

  async function handleContinue() {
    if (!name.trim()) return
    setUploading(true)
    const supabase = createClient()
    let avatar_url: string | undefined
    if (photoFile) {
      const ext = photoFile.name.split(".").pop() ?? "jpg"
      const { data: { user } } = await supabase.auth.getUser()
      const path = `${user?.id ?? "anon"}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, photoFile, { upsert: true })
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
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      {/* Progress */}
      <div style={{ padding: "48px 20px 16px" }}>
        <div style={{ height: 4, borderRadius: 100, background: C.border, overflow: "hidden", marginBottom: 6 }}>
          <div style={{ height: "100%", width: "50%", background: C.brand, borderRadius: 100 }} />
        </div>
        <p style={{ fontSize: 11, color: C.dim, ...MONO, textTransform: "uppercase", letterSpacing: "0.06em" }}>Etapa 1 de 2 — Perfil</p>
      </div>

      <div style={{ flex: 1, padding: "0 20px 32px", overflowY: "auto" }}>
        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 28, marginTop: 8 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: C.text }}>Crie seu perfil</h1>
          <p style={{ fontSize: 13, color: C.mid, marginTop: 4 }}>Como os outros te verão no True Deal</p>
        </div>

        {/* Avatar */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              position: "relative", width: 88, height: 88, borderRadius: 24,
              overflow: "hidden", background: photo ? "transparent" : C.brand,
              border: `2px solid ${C.border}`, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {photo
              ? <img src={photo} alt="Foto de perfil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ color: "#fff", fontWeight: 800, fontSize: 24 }}>{initials}</span>}
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 8 }}>
              <Camera width={18} height={18} color="#fff" />
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />
        </div>

        {/* Nome */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.mid, display: "block", marginBottom: 8 }}>
            Nome do usuário <span style={{ color: "#DC2626" }}>*</span>
          </label>
          <input
            type="text" value={name} onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Seu nome"
            style={{ width: "100%", boxSizing: "border-box", padding: "13px 16px", borderRadius: 12, fontSize: 14, background: C.surface2, border: `1px solid ${name ? C.activeBorder : C.border}`, color: C.text, outline: "none", fontWeight: 500 }}
            onFocus={(e) => { e.currentTarget.style.borderColor = C.brand }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = name ? C.activeBorder : C.border }}
          />
        </div>

        {/* Handle */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.mid, display: "block", marginBottom: 8 }}>
            Seu identificador <span style={{ color: C.dim, fontWeight: 400 }}>(como amigos te encontram)</span>
          </label>
          <div style={{ display: "flex", alignItems: "center", borderRadius: 12, overflow: "hidden", background: C.surface, border: `1px solid ${C.border}` }}>
            <div style={{ padding: "13px 14px", borderRight: `1px solid ${C.border}`, display: "flex", alignItems: "center" }}>
              <Hash width={14} height={14} color={C.brand} />
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
              maxLength={4}
              style={{ flex: 1, padding: "13px 12px", outline: "none", fontSize: 14, color: C.text, background: "transparent", fontWeight: 500 }}
            />
            <span style={{ padding: "0 14px", fontSize: 13, color: C.dim }}>{handle.split("#")[0] || "user"}</span>
          </div>
          <p style={{ fontSize: 11, color: C.dim, marginTop: 5, marginLeft: 2 }}>
            Identificador único: <span style={{ color: C.brand, fontWeight: 600 }}>{handle || "user#0000"}</span>
          </p>
        </div>

        {/* Social verification */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.mid, display: "block", marginBottom: 4 }}>
              Verificação de contas <span style={{ color: C.dim, fontWeight: 400 }}>(opcional)</span>
            </label>
            <p style={{ fontSize: 12, color: C.dim, lineHeight: 1.5 }}>
              Vincule suas contas para desbloquear deals. Toque no <Info width={11} height={11} style={{ display: "inline", verticalAlign: "middle" }} /> para saber mais.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
          {socialError && <p style={{ fontSize: 12, color: "#DC2626", marginTop: 8 }}>{socialError}</p>}
        </div>

        {/* Continuar */}
        <button
          onClick={handleContinue}
          disabled={!isValid || uploading}
          style={{
            width: "100%", padding: "15px 0", borderRadius: 16,
            fontWeight: 700, fontSize: 15, color: "#fff",
            background: isValid && !uploading ? C.brand : C.dim,
            border: "none", cursor: isValid && !uploading ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {uploading ? "Salvando…" : "Continuar"}
          {!uploading && <ArrowRight width={18} height={18} />}
        </button>
      </div>
    </div>
  )
}

export default function ProfileSetupPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F0F3F0", fontWeight: 700, color: "#0B1309" }}>Carregando...</div>}>
      <ProfileSetupContent />
    </Suspense>
  )
}
