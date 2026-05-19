"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, X } from "lucide-react"
import { useWallet } from "@solana/wallet-adapter-react"
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

// ── Wallet icons ──────────────────────────────────────────────────────────────

const IconGoogle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
)

const IconPhantom = () => (
  <svg width="20" height="20" viewBox="0 0 128 128" fill="none">
    <rect width="128" height="128" rx="24" fill="#9945FF" />
    <path d="M110.5 64c0 25.68-20.82 46.5-46.5 46.5S17.5 89.68 17.5 64 38.32 17.5 64 17.5 110.5 38.32 110.5 64z" fill="url(#phantom_g)" />
    <ellipse cx="51" cy="63" rx="7" ry="9" fill="white" />
    <ellipse cx="77" cy="63" rx="7" ry="9" fill="white" />
    <ellipse cx="51" cy="65" rx="3.5" ry="4.5" fill="#9945FF" />
    <ellipse cx="77" cy="65" rx="3.5" ry="4.5" fill="#9945FF" />
    <defs>
      <linearGradient id="phantom_g" x1="64" y1="17.5" x2="64" y2="110.5" gradientUnits="userSpaceOnUse">
        <stop stopColor="#534BB1" />
        <stop offset="1" stopColor="#551BF9" />
      </linearGradient>
    </defs>
  </svg>
)

const IconSolflare = () => (
  <svg width="20" height="20" viewBox="0 0 128 128" fill="none">
    <rect width="128" height="128" rx="24" fill="#FC8C00" />
    <path d="M64 20 L108 64 L64 108 L20 64 Z" fill="white" fillOpacity="0.2" />
    <path d="M64 32 L96 64 L64 96 L32 64 Z" fill="white" fillOpacity="0.4" />
    <circle cx="64" cy="64" r="16" fill="white" />
  </svg>
)

const WALLET_INSTALL = {
  Phantom:  "https://phantom.app/",
  Solflare: "https://solflare.com/",
} as const

// ── Input field ───────────────────────────────────────────────────────────────

function Field({
  type, value, onChange, placeholder, right,
}: {
  type: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  right?: React.ReactNode
}) {
  return (
    <div style={{ position: "relative" }}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        style={{
          width: "100%", boxSizing: "border-box",
          padding: right ? "13px 44px 13px 16px" : "13px 16px",
          borderRadius: 12, fontSize: 14,
          background: C.surface2, border: `1px solid ${C.border}`,
          color: C.text, outline: "none",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = C.brand }}
        onBlur={(e) =>  { e.currentTarget.style.borderColor = C.border }}
      />
      {right && (
        <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)" }}>
          {right}
        </div>
      )}
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────

function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      <span style={{ fontSize: 11, color: C.dim }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  )
}

// ── Social row button ─────────────────────────────────────────────────────────

function SocialBtn({
  icon, title, sub, accent, onClick,
}: {
  icon: React.ReactNode
  title: string
  sub?: string
  accent?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px", borderRadius: 12,
        background: C.surface, border: `1px solid ${C.border}`,
        cursor: "pointer", textAlign: "left",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = C.surface2 }}
      onMouseLeave={(e) => { e.currentTarget.style.background = C.surface }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: C.surface2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: accent ?? C.text }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: C.dim, marginTop: 1 }}>{sub}</div>}
      </div>
      <span style={{ color: C.dim, fontSize: 14 }}>→</span>
    </button>
  )
}

// ── Main login component ──────────────────────────────────────────────────────

function LoginPageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [email,       setEmail]       = useState("")
  const [password,    setPassword]    = useState("")
  const [showPwd,     setShowPwd]     = useState(false)
  const [isSignUp,    setIsSignUp]    = useState(false)
  const [isLoading,   setIsLoading]   = useState(false)
  const [authError,   setAuthError]   = useState<string | null>(
    searchParams.get("error") ? "Falha na autenticação. Tente novamente." : null
  )
  const [showWallets, setShowWallets] = useState(false)
  const [walletError, setWalletError] = useState<string | null>(null)
  const [isDemoMode,  setIsDemoMode]  = useState(false)

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (url?.includes("seu-projeto")) setIsDemoMode(true)
  }, [])

  const { wallets, select, connect, wallet, connected, publicKey, connecting } = useWallet()
  const pendingRef = useRef<string | null>(null)

  useEffect(() => {
    if (isDemoMode) {
      if (document.cookie.includes("truedeal-demo-session=true")) router.push("/")
      return
    }
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push("/")
    })
  }, [router, isDemoMode])

  // When wallet state changes after select(), connect and redirect
  useEffect(() => {
    if (!pendingRef.current || !wallet) return
    if (wallet.adapter.name !== pendingRef.current) return
    pendingRef.current = null
    connect()
      .then(() => {
        setShowWallets(false)
        router.push("/")
      })
      .catch(() => setWalletError("Conexão recusada. Tente novamente."))
  }, [wallet, connect, router])

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setIsLoading(true); setAuthError(null)
    if (isDemoMode) {
      if (email === "demo@truedeal.io" && password === "truedeal123") { handleDemoOverride(); return }
      setAuthError("Modo Demo: use demo@truedeal.io ou o botão de Override.")
      setIsLoading(false); return
    }
    const supabase = createClient()
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setAuthError(error.message); setIsLoading(false); return }
      router.push("/onboarding/profile")
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setAuthError("E-mail ou senha incorretos"); setIsLoading(false); return }
      router.push("/")
    }
  }

  async function handleGoogleLogin() {
    setAuthError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setAuthError(error.message)
  }

  function handleDemoOverride() {
    setIsLoading(true)
    setEmail("demo@truedeal.io")
    setPassword("truedeal123")
    document.cookie = "truedeal-demo-session=true; path=/; max-age=3600"
    setTimeout(() => router.push("/"), 800)
  }

  async function handleWalletConnect(adapterName: string) {
    const found = wallets.find((w) => w.adapter.name === adapterName)
    if (!found) {
      window.open(WALLET_INSTALL[adapterName as keyof typeof WALLET_INSTALL] ?? "#", "_blank")
      return
    }
    setWalletError(null)

    // Already connected with the right wallet — go directly
    if (connected && publicKey && wallet?.adapter.name === adapterName) {
      setShowWallets(false)
      router.push("/")
      return
    }

    // Wallet already selected but not yet connected — call connect() directly
    if (wallet?.adapter.name === adapterName && !connected) {
      try {
        await connect()
        setShowWallets(false)
        router.push("/")
      } catch {
        setWalletError("Conexão recusada. Tente novamente.")
      }
      return
    }

    // Different wallet selected — switch and let the effect call connect()
    pendingRef.current = adapterName
    select(found.adapter.name)
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, background: C.brand, borderRadius: "50%", marginBottom: 14 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", color: C.text }}>
            TRUE<span style={{ color: C.brand }}>DEAL</span>
          </div>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>
            Set your goals. Honor your word. Get paid for it.
          </div>
        </div>

        {/* Card */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: 24 }}>

          {/* Email form */}
          <form onSubmit={handleEmailLogin} style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            <Field type="email" value={email} onChange={setEmail} placeholder="seu@email.com" />
            <Field
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={setPassword}
              placeholder={isSignUp ? "Criar senha (mín. 6 caracteres)" : "Senha"}
              right={
                <button type="button" onClick={() => setShowPwd((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: C.dim, display: "flex" }}>
                  {showPwd ? <EyeOff width={16} height={16} /> : <Eye width={16} height={16} />}
                </button>
              }
            />

            {!isSignUp && (
              <div style={{ textAlign: "right", marginTop: -4 }}>
                <button type="button" style={{ fontSize: 11, color: C.brand, background: "none", border: "none", cursor: "pointer" }}>
                  Esqueci minha senha
                </button>
              </div>
            )}

            {authError && (
              <p style={{ fontSize: 12, color: "#DC2626", textAlign: "center", padding: "6px 10px", background: "rgba(220,38,38,0.06)", borderRadius: 8 }}>
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%", padding: "13px 0", borderRadius: 12,
                fontSize: 14, fontWeight: 700, color: "#fff",
                background: isLoading ? C.dim : C.brand, border: "none",
                cursor: isLoading ? "not-allowed" : "pointer",
                marginTop: 2,
              }}
            >
              {isLoading
                ? (isSignUp ? "Criando conta…" : "Entrando…")
                : (isSignUp ? "Criar conta" : "Entrar com e-mail")}
            </button>

            <p style={{ textAlign: "center", fontSize: 12, color: C.dim }}>
              {isSignUp ? "Já tem conta?" : "Não tem conta?"}{" "}
              <button type="button" onClick={() => { setIsSignUp((v) => !v); setAuthError(null) }}
                style={{ color: C.brand, fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>
                {isSignUp ? "Entrar" : "Cadastre-se"}
              </button>
            </p>
          </form>

          <Divider label="ou" />

          {/* Social logins */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
            <SocialBtn
              icon={<IconGoogle />}
              title="Continuar com Google"
              sub="Gmail · Google Account"
              onClick={handleGoogleLogin}
            />

            <SocialBtn
              icon={
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(153,69,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#9945FF">
                    <path d="M21 18v1c0 1.1-.9 2-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14c1.1 0 2 .9 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                  </svg>
                </div>
              }
              title="Carteira Solana"
              sub="Phantom · Solflare"
              accent="#9945FF"
              onClick={() => setShowWallets(true)}
            />
          </div>

          {/* Demo mode */}
          {isDemoMode && (
            <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 12, background: C.activeLight, border: `1px dashed ${C.activeBorder}` }}>
              <p style={{ fontSize: 10, color: C.brand, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center", marginBottom: 8, ...MONO }}>
                Sovereign Demo Mode
              </p>
              <button
                onClick={handleDemoOverride}
                style={{ width: "100%", padding: "9px 0", borderRadius: 10, fontSize: 12, fontWeight: 700, color: C.brand, background: "transparent", border: `1px solid ${C.brand}`, cursor: "pointer" }}
              >
                {isLoading ? "Acessando..." : "PROTOCOL OVERRIDE (DEMO ACCESS)"}
              </button>
            </div>
          )}
        </div>

        {/* Terms */}
        <p style={{ textAlign: "center", fontSize: 11, color: C.dim, marginTop: 16 }}>
          Ao continuar, você aceita os{" "}
          <a href="#" style={{ color: C.brand }}>Termos de Uso</a>{" "}e a{" "}
          <a href="#" style={{ color: C.brand }}>Política de Privacidade</a>
        </p>
      </div>

      {/* Wallet bottom sheet */}
      {showWallets && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(0,0,0,0.4)" }}
          onClick={() => setShowWallets(false)}
        >
          <div
            style={{ width: "100%", maxWidth: 480, background: C.surface, borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", boxShadow: "0 -16px 64px rgba(0,0,0,0.12)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Carteira Solana</h3>
                <p style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>Conecte sua carteira para continuar</p>
              </div>
              <button onClick={() => setShowWallets(false)} style={{ width: 32, height: 32, borderRadius: "50%", background: C.surface2, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X width={14} height={14} color={C.mid} />
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: C.surface2, border: `1px solid ${C.border}`, marginBottom: 16 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "linear-gradient(135deg,#9945FF,#FC8C00)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontSize: 9, fontWeight: 900 }}>◎</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.mid }}>Rede Solana</span>
              <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(153,69,255,0.1)", color: "#9945FF", ...MONO }}>
                {process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet"}
              </span>
            </div>

            {walletError && (
              <p style={{ fontSize: 12, color: "#DC2626", textAlign: "center", marginBottom: 12 }}>{walletError}</p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { name: "Phantom",  Icon: IconPhantom,  bg: "#9945FF", desc: "Solana · Wallet mais popular" },
                { name: "Solflare", Icon: IconSolflare, bg: "#FC8C00", desc: "Solana · Suporte multi-conta" },
              ].map((w) => {
                const found       = wallets.find((a) => a.adapter.name === w.name)
                const isInstalled = !!found
                const isConnecting = connecting && wallet?.adapter.name === w.name
                return (
                  <button
                    key={w.name}
                    onClick={() => handleWalletConnect(w.name)}
                    disabled={isConnecting}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 16, background: C.surface2, border: `1px solid ${C.border}`, cursor: "pointer", textAlign: "left" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.brand }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: w.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <w.Icon />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{w.name}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 100, ...MONO,
                          background: isInstalled ? C.activeLight : C.surface2,
                          color: isInstalled ? C.brand : C.dim }}>
                          {isInstalled ? "Instalado" : "Instalar"}
                        </span>
                      </div>
                      <p style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{w.desc}</p>
                    </div>
                    <span style={{ color: C.dim }}>{isConnecting ? "…" : "→"}</span>
                  </button>
                )
              })}
            </div>

            <p style={{ textAlign: "center", fontSize: 11, color: C.dim, marginTop: 16 }}>
              Ao conectar, você confirma ser titular desta carteira
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  )
}
