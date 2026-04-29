"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { TrueDealAppIcon } from "@/components/TrueDealLogo"

// ── Ícones de canal social ─────────────────────────────────────────────────────

const IconX = () => (
  <svg className="w-4 h-4" viewBox="0 0 1200 1227" fill="white">
    <path d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.163 519.284ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z" />
  </svg>
)

const IconStrava = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
  </svg>
)

const IconWellhub = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="white" fillOpacity="0.2" />
    <path d="M6 12l3.5 4L12 9l2.5 4L18 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const socialProviders = [
  { name: "X",       key: "x",       bg: "#000000", icon: <IconX />,       desc: "Entrar com sua conta X" },
  { name: "Strava",  key: "strava",  bg: "#FC4C02", icon: <IconStrava />,  desc: "Entrar com sua conta Strava" },
  { name: "Wellhub", key: "wellhub", bg: "#00A651", icon: <IconWellhub />, desc: "Entrar com sua conta Wellhub" },
]

// ── Carteiras Solana ───────────────────────────────────────────────────────────

const IconPhantom = () => (
  <svg className="w-5 h-5" viewBox="0 0 128 128" fill="white">
    <path d="M64 8C33.1 8 8 33.1 8 64s25.1 56 56 56 56-25.1 56-56S94.9 8 64 8zm0 96c-22.1 0-40-17.9-40-40s17.9-40 40-40 40 17.9 40 40-17.9 40-40 40z" opacity="0.3" />
    <path d="M80 52c0-8.8-7.2-16-16-16s-16 7.2-16 16v4c0 2.2 1.8 4 4 4s4-1.8 4-4v-4c0-4.4 3.6-8 8-8s8 3.6 8 8v24l-8 8H48l-8-8V64c0-2.2-1.8-4-4-4s-4 1.8-4 4v12l12 12h24l12-12V52z" />
    <circle cx="52" cy="66" r="5" />
    <circle cx="76" cy="66" r="5" />
  </svg>
)

const IconSolflare = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="5" fill="white" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

const wallets = [
  { name: "Phantom",  key: "phantom",  bg: "#9945FF", icon: <IconPhantom />,  desc: "Solana · Wallet mais popular" },
  { name: "Solflare", key: "solflare", bg: "#FC8C00", icon: <IconSolflare />, desc: "Solana · Suporte multi-conta"   },
]

// ─────────────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail]               = useState("")
  const [password, setPassword]         = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading]       = useState(false)
  const [isSignUp, setIsSignUp]         = useState(false)
  const [authError, setAuthError]       = useState<string | null>(null)
  const [showWallets, setShowWallets]   = useState(false)

  async function handleEmailLogin(e: { preventDefault(): void }) {
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

  function handleSocialLogin(key: string) {
    window.location.href = `/api/auth/${key}`
  }

  function handleWalletConnect(_key: string) {
    setShowWallets(false)
    router.push("/onboarding/profile")
  }

  const glass = {
    background: "rgba(255,255,255,0.4)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.5)",
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: "url('/images/gradient-background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
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
          background: "rgba(255,255,255,0.25)",
          backdropFilter: "blur(40px) saturate(250%)",
          border: "1px solid rgba(255,255,255,0.4)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.3), inset 0 3px 0 rgba(255,255,255,0.6)",
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

        {/* Formulário e-mail / senha */}
        <form onSubmit={handleEmailLogin} className="space-y-3 mb-5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full px-4 py-3 rounded-xl outline-none text-gray-800 placeholder-gray-400 text-sm"
            style={glass}
            required
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignUp ? "Criar senha (mín. 6 caracteres)" : "Senha"}
              className="w-full px-4 py-3 pr-12 rounded-xl outline-none text-gray-800 placeholder-gray-400 text-sm"
              style={glass}
              required
            />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {!isSignUp && (
            <div className="text-right -mt-1">
              <button type="button" className="text-xs text-[#16A34A] hover:underline">Esqueci minha senha</button>
            </div>
          )}
          {authError && <p className="text-xs text-red-500 text-center px-2">{authError}</p>}
          <button type="submit" disabled={isLoading}
            className="w-full py-3 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#16A34A 0%,#22C55E 100%)", boxShadow: "0 8px 24px rgba(22,163,74,0.35)" }}>
            {isLoading ? (isSignUp ? "Criando conta…" : "Entrando…") : (isSignUp ? "Criar conta" : "Entrar com e-mail")}
          </button>
          <p className="text-center text-xs text-gray-500">
            {isSignUp ? "Já tem conta?" : "Não tem conta?"}{" "}
            <button type="button" onClick={() => { setIsSignUp(v => !v); setAuthError(null) }}
              className="text-[#16A34A] font-medium hover:underline">
              {isSignUp ? "Entrar" : "Cadastre-se"}
            </button>
          </p>
        </form>

        {/* Divisor */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.4)" }} />
          <span className="text-gray-400 text-xs">ou acesse com</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.4)" }} />
        </div>

        {/* Canais sociais: X, Strava, Wellhub */}
        <div className="space-y-2 mb-3">
          {socialProviders.map((p) => (
            <button key={p.key}
              onClick={() => handleSocialLogin(p.key)}
              className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={glass}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: p.bg }}>
                {p.icon}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-gray-800">Continuar com {p.name}</p>
                <p className="text-xs text-gray-400">{p.desc}</p>
              </div>
              <span className="text-gray-400 text-sm">→</span>
            </button>
          ))}
        </div>

        {/* Carteira Solana */}
        <button
          onClick={() => setShowWallets(true)}
          className="w-full flex items-center gap-3 p-3 rounded-xl mb-5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "rgba(153,69,255,0.1)", backdropFilter: "blur(20px)", border: "1px solid rgba(153,69,255,0.25)" }}>
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

        {/* Termos */}
        <p className="text-center text-xs text-gray-500">
          Ao continuar, você aceita os{" "}
          <a href="#" className="text-blue-600 hover:underline">Termos de Uso</a> e a{" "}
          <a href="#" className="text-blue-600 hover:underline">Política de Privacidade</a>
        </p>
      </div>

      {/* Modal carteiras Solana */}
      {showWallets && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowWallets(false)}>
          <div className="w-full max-w-md p-6 rounded-t-3xl"
            style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(40px)", boxShadow: "0 -16px 64px rgba(0,0,0,0.2)" }}
            onClick={(e) => e.stopPropagation()}>
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

            {/* Solana logo strip */}
            <div className="flex items-center gap-2 mb-5 px-1 py-2 rounded-xl" style={{ background: "linear-gradient(135deg,rgba(153,69,255,0.06),rgba(252,140,0,0.06))" }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#9945FF,#FC8C00)" }}>
                <span className="text-white text-[8px] font-black">◎</span>
              </div>
              <span className="text-xs font-semibold text-gray-600">Rede Solana</span>
            </div>

            <div className="space-y-3">
              {wallets.map((w) => (
                <button key={w.key} onClick={() => handleWalletConnect(w.key)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 hover:scale-[1.02]"
                  style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)" }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: w.bg }}>
                    {w.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-gray-800">{w.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{w.desc}</p>
                  </div>
                  <span className="text-gray-400 text-lg">→</span>
                </button>
              ))}
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
