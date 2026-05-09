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

  // ── Solana wallet adapter ──
  const { wallets, select, wallet, connected, publicKey, connecting } = useWallet()

  // Referência para saber qual carteira o usuário escolheu e acionar o connect()
  // após o estado do WalletProvider atualizar com a nova seleção.
  const pendingRef = useRef<string | null>(null)
  // Só redireciona se o usuário clicou explicitamente — evita redirect pelo autoConnect
  const walletInitiatedRef = useRef(false)

  // Redireciona se já há sessão Supabase ativa (login anterior por e-mail/Google)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push("/")
    })
  }, [router])

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

  async function handleDemoLogin() {
    setIsLoading(true)
    setAuthError(null)
    const demoEmail = "demo@truedeal.io"
    const demoPass  = "judgelogin2024"
    
    setEmail(demoEmail)
    setPassword(demoPass)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const isPlaceholder = !supabaseUrl || supabaseUrl.includes("seu-projeto")

    if (isPlaceholder) {
      console.warn("[Demo] Placeholder Supabase detected. Bypassing network for Demo Protocol.")
      // Simula um delay de rede para UX
      await new Promise(r => setTimeout(r, 800))
      router.push("/")
      return
    }

    const supabase = createClient()
    
    // Try sign in
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: demoEmail,
      password: demoPass
    })

    if (signInErr) {
      console.log("[Demo] Sign in failed, attempting auto-provisioning...", signInErr.message)
      
      // If sign in fails, attempt sign up (provisioning)
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: demoEmail,
        password: demoPass,
        options: {
          data: {
            display_name: "Judge Performance",
            username: "judge_demo"
          }
        }
      })

      if (signUpErr) {
        setAuthError(`Demo Protocol Error: ${signUpErr.message}`)
        setIsLoading(false)
        return
      }

      // If signUp successful (or pending confirmation), we try to redirect anyway 
      // as some configs auto-login after signup
      if (signUpData.session) {
         router.push("/")
         return
      } else {
         setAuthError("Sessão demo provisionada. Por favor, verifique o e-mail ou tente entrar novamente.")
         setIsLoading(false)
         return
      }
    }

    router.push("/")
  }

  // ── Styles ──

  const glass = {
    background:    "rgba(255,255,255,0.4)",
    backdropFilter: "blur(20px)",
    border:        "1px solid rgba(255,255,255,0.5)",
  } as const

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: "#0A0F0D",
      }}
    >
      {/* Sovereign Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-20 blur-[120px] pointer-events-none"
        style={{ background: "radial-gradient(circle, #00D26A 0%, transparent 70%)" }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-10 blur-[100px] pointer-events-none"
        style={{ background: "radial-gradient(circle, #9945FF 0%, transparent 70%)" }} />

      <div
        className="w-full max-w-md p-10 rounded-[32px] relative z-10"
        style={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(40px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)",
        }}
      >
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="relative">
               <div className="absolute inset-0 bg-[#00D26A] blur-2xl opacity-20 rounded-full animate-pulse" />
               <TrueDealAppIcon size={72} />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter">TRUEDEAL</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="h-[1px] w-4 bg-[#00D26A]" />
            <p className="text-[10px] text-[#00D26A] font-black uppercase tracking-[0.3em]">Institutional Protocol</p>
            <div className="h-[1px] w-4 bg-[#00D26A]" />
          </div>
        </div>

        {/* ── E-mail / senha ── */}
        <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Endereço de Acesso</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 outline-none text-white placeholder-gray-600 text-sm focus:border-[#00D26A]/50 transition-all"
              required
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Credencial Privada</label>
              {!isSignUp && (
                <button type="button" className="text-[9px] font-bold text-[#00D26A] hover:underline uppercase tracking-tighter opacity-70">
                  Esqueci minha senha
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder={isSignUp ? "Mínimo 6 caracteres" : "••••••••"}
                className="w-full px-5 py-4 pr-14 rounded-2xl bg-white/5 border border-white/10 outline-none text-white placeholder-gray-700 text-sm focus:border-[#00D26A]/50 transition-all"
                required
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors">
                {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {authError && <p className="text-[11px] text-red-400 font-medium text-center bg-red-400/10 py-2 rounded-xl border border-red-400/20">{authError}</p>}

          <button type="submit" disabled={isLoading}
            className="w-full py-4 rounded-2xl font-black text-black uppercase tracking-widest text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:scale-100"
            style={{ background: "#00D26A", boxShadow: "0 12px 32px rgba(0,210,106,0.3)" }}>
            {isLoading
              ? (isSignUp ? "Processando…" : "Autenticando…")
              : (isSignUp ? "Criar Identidade" : "Iniciar Sessão")}
          </button>

          <p className="text-center text-[11px] text-gray-500 font-medium">
            {isSignUp ? "Já possui credenciais?" : "Ainda não possui acesso?"}{" "}
            <button type="button" onClick={() => { setIsSignUp(v => !v); setAuthError(null) }}
              className="text-[#00D26A] font-bold hover:underline">
              {isSignUp ? "Fazer Login" : "Criar Conta"}
            </button>
          </p>
        </form>

        {/* ── Social / Wallet Section ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-[1px] bg-white/5" />
            <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em]">External Auth</span>
            <div className="flex-1 h-[1px] bg-white/5" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
            >
              <IconGoogle />
              <span className="text-xs font-bold text-gray-300 group-hover:text-white">Google</span>
            </button>

            <button
              onClick={() => setShowWallets(true)}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
            >
              <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-[#9945FF] to-[#FC8C00]" />
              <span className="text-xs font-bold text-gray-300 group-hover:text-white">Solana</span>
            </button>
          </div>
        </div>

        {/* ── Judge Protocol (Refined) ── */}
        <div className="mt-10 pt-8 border-t border-white/5 text-center space-y-4">
           <div className="inline-block p-[1px] rounded-xl bg-gradient-to-r from-transparent via-[#00D26A]/30 to-transparent">
             <button 
                type="button"
                onClick={handleDemoLogin}
                className="px-6 py-2 rounded-xl bg-[#0A0F0D] text-[9px] font-black text-[#00D26A] uppercase tracking-[0.3em] hover:bg-[#00D26A] hover:text-black transition-all"
              >
                Protocol Override: Demo v1.1
              </button>
           </div>
          
          <p className="text-[9px] text-gray-600 font-medium leading-relaxed max-w-[240px] mx-auto">
            Ao acessar o protocolo, você concorda com nossos{" "}
            <a href="#" className="text-gray-400 hover:text-[#00D26A]">Termos de Governança</a>.
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
