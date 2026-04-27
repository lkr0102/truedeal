"use client"

import type { FormEvent } from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, ChevronDown, ChevronUp, X } from "lucide-react"

// ── Ícones SVG precisos de cada rede ─────────────────────────────────────────

const IconTikTok = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.31 6.31 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.19a8.16 8.16 0 0 0 4.77 1.52V6.23a4.85 4.85 0 0 1-1-.54z" />
  </svg>
)

const IconApple = () => (
  <svg className="w-4 h-4" viewBox="0 0 814 1000" fill="white">
    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 380.9 0 226 0 124.6 0 56.4 21.5 4.7 71.5 4.7c60.2 0 114.4 36.4 160.7 36.4 44.1 0 113.1-38.6 178.8-38.6 32.3 0 135.1 3.7 197.4 147.6z" />
    <path d="M526.6 8.8c-29.5 13-100 68.2-100 151.2 0 72.3 49.1 125.1 110.1 148.9 6.5 2.5 12.7 3.2 16.3 3.2 4.2 0 9-.8 12.7-2.2-1.3-9.5-2.5-19.7-2.5-30.3 0-68.2 45.3-136.7 96.1-166.3-16.9-47.1-58.3-104.5-132.7-104.5z" />
  </svg>
)

const IconTelegram = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
)

const IconInstagram = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
  </svg>
)

// Ícone oficial do X Corp
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

const socialProviders = [
  { name: "TikTok",    key: "tiktok",    bg: "#010101", icon: <IconTikTok /> },
  { name: "Apple",     key: "apple",     bg: "#1C1C1E", icon: <IconApple /> },
  { name: "Telegram",  key: "telegram",  bg: "#229ED9", icon: <IconTelegram /> },
  { name: "Instagram", key: "instagram", bg: "#E4405F", icon: <IconInstagram /> },
  { name: "X",         key: "x",         bg: "#000000", icon: <IconX /> },
  { name: "Strava",    key: "strava",    bg: "#FC4C02", icon: <IconStrava /> },
]

// ── Carteiras Web3 ─────────────────────────────────────────────────────────────
const IconMetaMask = () => (
  // Forma simplificada reconhecível do logo MetaMask (fox outline)
  <svg className="w-5 h-5" viewBox="0 0 35 33" fill="none">
    <path d="M32.958.5L19.198 10.4l2.5-5.9L32.958.5z" fill="#E17726" stroke="#E17726" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2.042.5l13.65 10-2.39-6L2.042.5z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M28.13 23.53l-3.66 5.62 7.84 2.16 2.25-7.65-6.43-.13zM.44 23.66l2.24 7.65 7.83-2.16-3.65-5.62-6.42.13z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.12 14.36l-2.19 3.31 7.81.36-.26-8.4-5.36 4.73zM24.88 14.36l-5.42-4.82-.18 8.49 7.81-.36-2.21-3.31z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.51 29.15l4.71-2.28-4.06-3.17-.65 5.45zM19.78 26.87l4.71 2.28-.66-5.45-4.05 3.17z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconRabby = () => (
  <svg className="w-5 h-5" viewBox="0 0 32 32" fill="white">
    <ellipse cx="16" cy="18" rx="9" ry="8" fill="white" opacity="0.9" />
    <ellipse cx="10.5" cy="9" rx="3.5" ry="5.5" fill="white" opacity="0.9" />
    <ellipse cx="21.5" cy="9" rx="3.5" ry="5.5" fill="white" opacity="0.9" />
    <ellipse cx="12" cy="18" rx="1.5" ry="1.5" fill="#8697FF" />
    <ellipse cx="20" cy="18" rx="1.5" ry="1.5" fill="#8697FF" />
    <path d="M14 21.5 Q16 23 18 21.5" stroke="#8697FF" strokeWidth="1" fill="none" strokeLinecap="round" />
  </svg>
)

const IconPhantom = () => (
  <svg className="w-5 h-5" viewBox="0 0 128 128" fill="white">
    <path d="M64 8C33.1 8 8 33.1 8 64s25.1 56 56 56 56-25.1 56-56S94.9 8 64 8zm0 96c-22.1 0-40-17.9-40-40s17.9-40 40-40 40 17.9 40 40-17.9 40-40 40z" opacity="0.3" />
    <path d="M80 52c0-8.8-7.2-16-16-16s-16 7.2-16 16v4c0 2.2 1.8 4 4 4s4-1.8 4-4v-4c0-4.4 3.6-8 8-8s8 3.6 8 8v24l-8 8H48l-8-8V64c0-2.2-1.8-4-4-4s-4 1.8-4 4v12l12 12h24l12-12V52z" />
    <circle cx="52" cy="66" r="5" />
    <circle cx="76" cy="66" r="5" />
  </svg>
)

const IconOKX = () => (
  <svg className="w-5 h-5" viewBox="0 0 32 32" fill="white">
    <rect x="3" y="3" width="11" height="11" rx="1.5" />
    <rect x="18" y="3" width="11" height="11" rx="1.5" />
    <rect x="3" y="18" width="11" height="11" rx="1.5" />
    <rect x="18" y="18" width="11" height="11" rx="1.5" />
  </svg>
)

const IconBackpack = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
    <path d="M16 6h-1V5a3 3 0 0 0-6 0v1H8a4 4 0 0 0-4 4v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a4 4 0 0 0-4-4zm-5-1a1 1 0 0 1 2 0v1h-2V5zm5 7H8v-2h8v2zm-4 5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
  </svg>
)

const wallets = [
  { name: "MetaMask", key: "metamask", bg: "#F6851B", icon: <IconMetaMask /> },
  { name: "Rabby",    key: "rabby",    bg: "#8697FF", icon: <IconRabby /> },
  { name: "Phantom",  key: "phantom",  bg: "#9945FF", icon: <IconPhantom /> },
  { name: "OKX",      key: "okx",      bg: "#000000", icon: <IconOKX /> },
  { name: "Backpack", key: "backpack", bg: "#E33E3F", icon: <IconBackpack /> },
]

// ─────────────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail]               = useState("")
  const [password, setPassword]         = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading]       = useState(false)
  const [showSocials, setShowSocials]   = useState(false)
  const [showWallets, setShowWallets]   = useState(false)

  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setIsLoading(false)
    router.push("/onboarding/profile")
  }

  function handleSocialLogin(key: string) {
    window.location.href = `/api/auth/${key}`
  }

  function handleWalletConnect(key: string) {
    setShowWallets(false)
    // TODO: integrar EIP-1193 / WalletConnect por carteira
    router.push("/onboarding/profile")
  }

  const glassCard = {
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
          <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#16A34A 0%,#22C55E 100%)", boxShadow: "0 8px 24px rgba(22,163,74,0.4)", borderRadius: "16px" }}>
            {/* True Deal Logo - stylized "TD" with deal arrow */}
            <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 12h10l4 24h-10l-4-24z" fill="white" fillOpacity="0.9"/>
              <path d="M18 12h10l4 24h-10l-4-24z" fill="white" fillOpacity="0.7"/>
              <path d="M28 12h12v6l-4 6h4l4-12h-12v6l4-6h-4z" fill="white" fillOpacity="0.9"/>
              <circle cx="38" cy="34" r="4" fill="white"/>
              <path d="M36 34l2 2 4-4" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">True Deal</h1>
          <p className="text-gray-600 text-sm mt-1">Don&apos;t trust. Make a Deal.</p>
        </div>

        {/* ③ Formulário e-mail / senha (PRIMEIRO) */}
        <form onSubmit={handleEmailLogin} className="space-y-3 mb-5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full px-4 py-3 rounded-xl outline-none text-gray-800 placeholder-gray-400 text-sm"
            style={glassCard}
            required
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              className="w-full px-4 py-3 pr-12 rounded-xl outline-none text-gray-800 placeholder-gray-400 text-sm"
              style={glassCard}
              required
            />
            <button type="button" onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-right -mt-1">
            <button type="button" className="text-xs text-[#16A34A] hover:underline">Esqueci minha senha</button>
          </div>
          <button type="submit" disabled={isLoading}
            className="w-full py-3 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#16A34A 0%,#22C55E 100%)", boxShadow: "0 8px 24px rgba(22,163,74,0.35)" }}>
            {isLoading ? "Entrando…" : "Entrar com e-mail"}
          </button>
          <p className="text-center text-xs text-gray-500">
            Não tem conta?{" "}
            <button type="button" onClick={() => router.push("/onboarding/profile")}
              className="text-[#16A34A] font-medium hover:underline">
              Cadastre-se
            </button>
          </p>
        </form>

        {/* Divisor */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.4)" }} />
          <span className="text-gray-400 text-xs">ou acesse com</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.4)" }} />
        </div>

        {/* ① Redes sociais (SEGUNDO) */}
        <button
          onClick={() => setShowSocials((v) => !v)}
          className="w-full flex items-center gap-3 p-3 rounded-xl mb-2 transition-all duration-300 hover:scale-[1.01]"
          style={glassCard}
        >
          <div className="flex -space-x-1.5">
            {socialProviders.slice(0, 4).map((p) => (
              <div key={p.key}
                className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-white/60 flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: p.bg }}>
                <div className="scale-75">{p.icon}</div>
              </div>
            ))}
            <div className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-white/60 text-[9px] font-bold text-gray-600"
              style={{ background: "rgba(255,255,255,0.85)" }}>
              +{socialProviders.length - 4}
            </div>
          </div>
          <span className="flex-1 text-left text-gray-700 font-medium text-sm">Contas das Redes Sociais</span>
          {showSocials
            ? <ChevronUp className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showSocials && (
          <div className="space-y-2 mb-3">
            {socialProviders.map((p) => (
              <button key={p.key}
                onClick={() => handleSocialLogin(p.key)}
                className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={glassCard}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: p.bg }}>
                  {p.icon}
                </div>
                <span className="flex-1 text-left text-gray-700 font-medium text-sm">Continuar com {p.name}</span>
                <span className="text-gray-400 text-sm">&#8594;</span>
              </button>
            ))}
          </div>
        )}

        {/* ② Carteira de criptomoedas (TERCEIRO) */}
        <button
          onClick={() => setShowWallets(true)}
          className="w-full flex items-center gap-3 p-3 rounded-xl mb-5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "rgba(22,163,74,0.12)", backdropFilter: "blur(20px)", border: "1px solid rgba(22,163,74,0.3)" }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#16A34A" }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
              <path d="M21 18v1c0 1.1-.9 2-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14c1.1 0 2 .9 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <span className="font-medium text-sm" style={{ color: "#8888FF" }}>Carteira de criptomoedas</span>
            <div className="flex gap-1 mt-0.5">
              {["#F6851B","#8697FF","#9945FF","#000","#E33E3F"].map((c) => (
                <div key={c} className="w-3 h-3 rounded-full border border-white/40" style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <span style={{ color: "#16A34A" }}>&#8594;</span>
        </button>

        {/* Termos */}
        <p className="text-center text-xs text-gray-500 mt-5">
          Ao continuar, você aceita os{" "}
          <a href="#" className="text-blue-600 hover:underline">Termos de Uso</a> e a{" "}
          <a href="#" className="text-blue-600 hover:underline">Política de Privacidade</a>
        </p>
      </div>

      {/* Modal carteiras */}
      {showWallets && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowWallets(false)}>
          <div className="w-full max-w-md p-6 rounded-t-3xl"
            style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(40px)", boxShadow: "0 -16px 64px rgba(0,0,0,0.2)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800">Escolha sua carteira</h3>
              <button onClick={() => setShowWallets(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.08)" }}>
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="space-y-3">
              {wallets.map((w) => (
                <button key={w.key} onClick={() => handleWalletConnect(w.key)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 hover:scale-[1.02]"
                  style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: w.bg }}>
                    {w.icon}
                  </div>
                  <span className="flex-1 text-left font-semibold text-gray-800">{w.name}</span>
                  <span className="text-gray-400">&#8594;</span>
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
