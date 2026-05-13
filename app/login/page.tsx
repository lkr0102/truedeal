"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, X } from "lucide-react"
import { useWallet } from "@solana/wallet-adapter-react"
import { createClient } from "@/lib/supabase/client"
import { TrueDealAppIcon } from "@/components/TrueDealLogo"

// ── Ícones ─────────────────────────────────────────────────────────────────────

const IconGoogle = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
)

const IconPhantom = () => (
  <svg className="w-5 h-5" viewBox="0 0 128 128" fill="none">
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
  <svg className="w-5 h-5" viewBox="0 0 128 128" fill="none">
    <rect width="128" height="128" rx="24" fill="#FC8C00" />
    <path d="M64 20 L108 64 L64 108 L20 64 Z" fill="white" fillOpacity="0.2" />
    <path d="M64 32 L96 64 L64 96 L32 64 Z" fill="white" fillOpacity="0.4" />
    <circle cx="64" cy="64" r="16" fill="white" />
  </svg>
)

// ─────────────────────────────────────────────────────────────────────────────

const WALLET_INSTALL = {
  Phantom:  "https://phantom.app/",
  Solflare: "https://solflare.com/",
} as const

export default function LoginPage() {
  const router = useRouter()

  // ── Supabase auth state ──
  const [email,        setEmail]        = useState("")
  const [password,     setPassword]     = useState("")
  const [showPwd,      setShowPwd]      = useState(false)
  const [isSignUp,     setIsSignUp]     = useState(false)
  const [isLoading,    setIsLoading]    = useState(false)
  const [authError,    setAuthError]    = useState<string | null>(null)

  // ── Wallet state ──
  const [showWallets,  setShowWallets]  = useState(false)
  const [walletError,  setWalletError]  = useState<string | null>(null)

  // ── Demo / Placeholder check ──
  const [isDemoMode, setIsDemoMode] = useState(false)
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (url?.includes("seu-projeto")) setIsDemoMode(true)
  }, [])

  // ── Solana wallet adapter ──
  const { wallets, select, wallet, connected, publicKey, connecting } = useWallet()

  // Referência para saber qual carteira o usuário escolheu e acionar o connect()
  // após o estado do WalletProvider atualizar com a nova seleção.
  const pendingRef = useRef<string | null>(null)
  // Só redireciona se o usuário clicou explicitamente — evita redirect pelo autoConnect
  const walletInitiatedRef = useRef(false)

  // Redireciona se já há sessão Supabase ativa (login anterior por e-mail/Google)
  useEffect(() => {
    if (isDemoMode) {
      // Se estamos em demo mode, verificamos o cookie manualmente
      const hasDemoCookie = document.cookie.includes("truedeal-demo-session=true")
      if (hasDemoCookie) router.push("/")
      return
    }

    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push("/")
    })
  }, [router, isDemoMode])

  // Quando o wallet muda (após select()), dispara connect()
  useEffect(() => {
    if (!pendingRef.current || !wallet) return
    if (wallet.adapter.name !== pendingRef.current) return
    pendingRef.current = null
    wallet.adapter.connect().catch(() => {
      setWalletError("Conexão recusada. Tente novamente.")
    })
  }, [wallet])

  // Quando conectado com sucesso → redireciona apenas se foi o usuário quem iniciou
  useEffect(() => {
    if (connected && publicKey && walletInitiatedRef.current) {
      walletInitiatedRef.current = false
      setShowWallets(false)
      router.push("/")
    }
  }, [connected, publicKey, router])

  // ── Handlers ──

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setIsLoading(true)
    setAuthError(null)

    if (isDemoMode) {
      if (email === "demo@truedeal.io" && password === "truedeal123") {
        handleDemoOverride()
      } else {
        setAuthError("Modo Demo: use demo@truedeal.io ou o botão de Override.")
        setIsLoading(false)
      }
      return
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
    // Auto-fill for visual feedback and fallback
    setEmail("demo@truedeal.io")
    setPassword("truedeal123")
    
    // Injeta o cookie de sessão demo
    document.cookie = "truedeal-demo-session=true; path=/; max-age=3600"
    // Redireciona para a home que agora vai ler esse cookie via createClient() do server
    setTimeout(() => {
      router.push("/")
    }, 800)
  }

  function handleWalletConnect(adapterName: string) {
    const found = wallets.find(w => w.adapter.name === adapterName)
    if (!found) {
      window.open(WALLET_INSTALL[adapterName as keyof typeof WALLET_INSTALL] ?? "#", "_blank")
      return
    }
    setWalletError(null)
    walletInitiatedRef.current = true
    pendingRef.current = adapterName
    select(found.adapter.name)
  }

  // ── Styles ──

  const glass = {
    background:    "rgba(255,255,255,0.4)",
    backdropFilter: "blur(20px)",
    border:        "1px solid rgba(255,255,255,0.5)",
  } as const

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage:    "url('/images/gradient-background.jpg')",
        backgroundSize:     "cover",
        backgroundPosition: "center",
        backgroundRepeat:   "no-repeat",
      }}
    >
      {/* Orbs decorativos */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full opacity-50 animate-pulse"
          style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(20px)", border: "2px solid rgba(255,255,255,0.3)" }} />
        <div className="absolute top-3/4 right-1/4 w-24 h-24 rounded-full opacity-40 animate-pulse"
          style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(20px)", border: "2px solid rgba(255,255,255,0.3)", animationDelay: "1s" }} />
      </div>

      <div
        className="w-full max-w-md p-8 rounded-3xl relative z-10"
        style={{
          background:    "rgba(255,255,255,0.25)",
          backdropFilter: "blur(40px) saturate(250%)",
          border:        "1px solid rgba(255,255,255,0.4)",
          boxShadow:     "0 32px 80px rgba(0,0,0,0.3), inset 0 3px 0 rgba(255,255,255,0.6)",
        }}
      >
        {/* Logo */}
        <div className="text-center mb-7">
          <div className="flex justify-center mb-4">
            <TrueDealAppIcon size={80} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">True Deal</h1>
          <p className="text-gray-600 text-sm mt-1 font-medium">Don&apos;t trust, make a True Deal</p>
        </div>

        {/* ── E-mail / senha ── */}
        <form onSubmit={handleEmailLogin} className="space-y-3 mb-4">
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full px-4 py-3 rounded-xl outline-none text-gray-800 placeholder-gray-400 text-sm"
            style={glass} required
          />
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder={isSignUp ? "Criar senha (mín. 6 caracteres)" : "Senha"}
              className="w-full px-4 py-3 pr-12 rounded-xl outline-none text-gray-800 placeholder-gray-400 text-sm"
              style={glass} required
            />
            <button type="button" onClick={() => setShowPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {!isSignUp && (
            <div className="text-right -mt-1">
              <button type="button" className="text-xs text-[#00D26A] hover:underline">
                Esqueci minha senha
              </button>
            </div>
          )}

          {authError && <p className="text-xs text-red-500 text-center px-2">{authError}</p>}

          <button type="submit" disabled={isLoading}
            className="w-full py-3 rounded-xl font-bold text-black transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
            style={{ background: "#00D26A", boxShadow: "0 8px 24px rgba(0,210,106,0.25)" }}>
            {isLoading
              ? (isSignUp ? "Criando conta…" : "Entrando…")
              : (isSignUp ? "Criar conta" : "Entrar com e-mail")}
          </button>

          <p className="text-center text-xs text-gray-500">
            {isSignUp ? "Já tem conta?" : "Não tem conta?"}{" "}
            <button type="button" onClick={() => { setIsSignUp(v => !v); setAuthError(null) }}
              className="text-[#00D26A] font-medium hover:underline">
              {isSignUp ? "Entrar" : "Cadastre-se"}
            </button>
          </p>
        </form>

        {/* ── Google ── */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center gap-3 p-3 rounded-xl mb-5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={glass}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white">
            <IconGoogle />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-gray-800">Continuar com Google</p>
            <p className="text-xs text-gray-400">Gmail · Google Account</p>
          </div>
          <span className="text-gray-400 text-sm">→</span>
        </button>

        {/* ── Divisor ── */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.4)" }} />
          <span className="text-gray-400 text-xs">ou conecte sua carteira</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.4)" }} />
        </div>

        {/* ── Solana wallet button ── */}
        <button
          onClick={() => setShowWallets(true)}
          className="w-full flex items-center gap-3 p-3 rounded-xl mb-5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "rgba(153,69,255,0.1)", backdropFilter: "blur(20px)", border: "1px solid rgba(153,69,255,0.25)" }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#9945FF,#FC8C00)" }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
              <path d="M21 18v1c0 1.1-.9 2-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14c1.1 0 2 .9 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold" style={{ color: "#9945FF" }}>Carteira Solana</p>
            <div className="flex gap-1.5 mt-0.5">
              <span className="text-[10px] font-bold text-gray-500 px-1.5 py-0.5 rounded-full bg-purple-100">Phantom</span>
              <span className="text-[10px] font-bold text-gray-500 px-1.5 py-0.5 rounded-full bg-orange-100">Solflare</span>
            </div>
          </div>
          <span style={{ color: "#9945FF" }}>→</span>
        </button>

        {/* ── Protocol Override (Apenas em modo Demo) ── */}
        {isDemoMode && (
          <div className="mt-4 p-4 rounded-xl border border-dashed border-[#00D26A]/30 bg-[#00D26A]/5">
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest text-center mb-2">
              Sovereign Demo Mode Active
            </p>
            <button
              onClick={handleDemoOverride}
              className="w-full py-2 rounded-lg text-xs font-bold transition-all duration-300 hover:bg-[#00D26A]/10 active:scale-[0.98]"
              style={{ color: "#00D26A", border: "1px solid #00D26A" }}
            >
              {isLoading ? "Bypassing Protocol..." : "PROTOCOL OVERRIDE (LUKAS ADMIN ACCESS)"}
            </button>
          </div>
        )}

        {/* Termos */}
        <div className="text-center mt-6">
          <p className="text-[10px] text-gray-400">
            Ao continuar, você aceita os{" "}
            <a href="#" className="text-blue-600 hover:underline">Termos de Uso</a> e a{" "}
            <a href="#" className="text-blue-600 hover:underline">Política de Privacidade</a>
          </p>
        </div>
      </div>

      {/* ── Modal carteiras Solana ── */}
      {showWallets && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowWallets(false)}>
          <div
            className="w-full max-w-md p-6 rounded-t-3xl"
            style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(40px)", boxShadow: "0 -16px 64px rgba(0,0,0,0.2)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Carteira Solana</h3>
                <p className="text-xs text-gray-400 mt-0.5">Conecte sua carteira para continuar</p>
              </div>
              <button onClick={() => setShowWallets(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.08)" }}>
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Solana strip */}
            <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-xl"
              style={{ background: "linear-gradient(135deg,rgba(153,69,255,0.06),rgba(252,140,0,0.06))" }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#9945FF,#FC8C00)" }}>
                <span className="text-white text-[9px] font-black">◎</span>
              </div>
              <span className="text-xs font-semibold text-gray-600">Rede Solana</span>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(153,69,255,0.1)", color: "#9945FF" }}>
                {process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet"}
              </span>
            </div>

            {walletError && (
              <p className="text-xs text-red-500 text-center mb-3 px-2">{walletError}</p>
            )}

            {/* Wallet buttons */}
            <div className="space-y-3">
              {[
                { name: "Phantom",  icon: <IconPhantom />,  bg: "#9945FF", desc: "Solana · Wallet mais popular" },
                { name: "Solflare", icon: <IconSolflare />, bg: "#FC8C00", desc: "Solana · Suporte multi-conta" },
              ].map(w => {
                const found        = wallets.find(a => a.adapter.name === w.name)
                const isInstalled  = !!found  // Wallet Standard: se está em wallets[], está instalada
                const isConnecting = connecting && wallet?.adapter.name === w.name

                return (
                  <button key={w.name}
                    onClick={() => handleWalletConnect(w.name)}
                    disabled={isConnecting}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                    style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)" }}
                  >
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: w.bg }}>
                      {w.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-800">{w.name}</p>
                        {isInstalled && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(0,210,106,0.1)", color: "#00D26A" }}>
                            Instalado
                          </span>
                        )}
                        {!isInstalled && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(0,0,0,0.06)", color: "#9CA3AF" }}>
                            Instalar
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{w.desc}</p>
                    </div>
                    <span className="text-gray-400 text-lg">
                      {isConnecting ? "…" : "→"}
                    </span>
                  </button>
                )
              })}
            </div>

            <p className="text-center text-xs text-gray-400 mt-5">
              Ao conectar, você confirma ser titular desta carteira
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
