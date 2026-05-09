"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Home, Compass, Wallet, User,
  Eye, EyeOff, ArrowDownToLine, ArrowUpFromLine,
  Trophy, X as XIcon, TrendingDown,
  Copy, Check, ChevronRight,
} from "lucide-react"
import type { Profile, TdpTransaction, TdpReason } from "@/lib/supabase/types"

// ── Bottom nav ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { icon: Home,    label: "Acordos",  href: "/" },
  { icon: Compass, label: "Explorar", href: "/explore" },
  { icon: Wallet,  label: "Wallet",   href: "/wallet" },
  { icon: User,    label: "Perfil",   href: "/profile" },
]

function BottomNav({ active }: { active: string }) {
  const router = useRouter()
  return (
    <nav className="fixed bottom-0 left-0 right-0 px-6 py-4 z-10"
      style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(40px) saturate(200%)", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
      <div className="flex justify-around items-center">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = active === item.label
          return (
            <button key={item.label} onClick={() => router.push(item.href)}
              className="flex flex-col items-center gap-1 transition-all duration-300">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? "scale-110 shadow-lg" : ""}`}
                style={{ background: isActive ? "#00D26A" : "transparent" }}>
                <Icon className={`w-5 h-5 ${isActive ? "text-[#0A0F0D]" : "text-gray-400"}`} />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-[#00D26A]" : "text-gray-400"}`}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// ── Deal-only history labels ──────────────────────────────────────────────────

const DEAL_REASONS: TdpReason[] = ["deal_create", "deal_join", "deal_win"]
const DEAL_LABELS: Partial<Record<TdpReason, string>> = {
  deal_create: "Abertura de Acordo",
  deal_join:   "Alocação de Garantia",
  deal_win:    "Performance Líquida",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (itemDate.getTime() === today.getTime()) return "Hoje"
  if (itemDate.getTime() === yesterday.getTime()) return "Ontem"
  const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]}`
}

type Currency = "usd" | "sol" | "brl"
type ModalType = "deposit" | "withdraw" | null

// ── Props ─────────────────────────────────────────────────────────────────────

interface WalletClientProps {
  profile:          Profile | null
  tdpHistory:       TdpTransaction[]
  activeDealsValue: number           // sum of entry amounts in BRL
  managedPublicKey: string | null
  solBalance:       number
  solUsdPrice:      number
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WalletClient({
  profile,
  tdpHistory,
  activeDealsValue,
  managedPublicKey,
  solBalance,
  solUsdPrice,
}: WalletClientProps) {
  const [showBalance, setShowBalance] = useState(true)
  const [currency,    setCurrency]    = useState<Currency>("usd")
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [copied,      setCopied]      = useState(false)
  const [pixAmount,   setPixAmount]   = useState("")

  // ── Address helpers
  function truncateAddr(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`
  }
  function copyAddr() {
    if (!managedPublicKey) return
    navigator.clipboard.writeText(managedPublicKey).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Currency conversion
  const BRL_RATE  = 5.85 // approximate USD → BRL

  const totalUsd     = solBalance * solUsdPrice
  const frozenUsd    = activeDealsValue / BRL_RATE
  const availableUsd = Math.max(0, totalUsd - frozenUsd)

  function fmtAmount(usdAmount: number, hide = false): string {
    if (hide) return "••••"
    switch (currency) {
      case "usd": return `$ ${usdAmount.toFixed(2)}`
      case "sol": return `${(solUsdPrice > 0 ? usdAmount / solUsdPrice : 0).toFixed(4)} SOL`
      case "brl": return (usdAmount * BRL_RATE).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    }
  }

  // ── Profile
  const displayName = profile?.display_name ?? "Sovereign User"
  const username    = profile?.username ?? ""
  const initials    = getInitials(displayName)

  // ── Deal-only history
  const dealHistory = tdpHistory.filter(tx => DEAL_REASONS.includes(tx.reason))

  const CURRENCY_LABELS: Record<Currency, string> = { usd: "USD", sol: "SOL", brl: "BRL" }
  const CURRENCY_CYCLE: Currency[] = ["usd", "sol", "brl"]
  function cycleCurrency() {
    const idx = CURRENCY_CYCLE.indexOf(currency)
    setCurrency(CURRENCY_CYCLE[(idx + 1) % 3])
  }

  return (
    <div className="min-h-screen flex flex-col pb-24"
      style={{ backgroundImage: "url('/images/gradient-background.jpg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundAttachment: "fixed" }}>

      {/* Header */}
      <header className="px-5 pt-12 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tighter leading-none uppercase">Asset Vault</h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Soberania On-Chain</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl"
          style={{ background: "#00D26A" }}>
          <div className="w-2 h-2 rounded-full bg-[#0A0F0D] animate-pulse" />
          <span className="text-[10px] font-black text-[#0A0F0D] uppercase tracking-wider">Auditável</span>
        </div>
      </header>

      <div className="flex-1 px-5 overflow-y-auto">

        {/* User mini-card */}
        <div className="rounded-[2rem] px-5 py-4 mb-5 mt-2 flex items-center gap-4"
          style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)" }}>
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "#0A0F0D" }}>
            <span className="text-[#00D26A] font-black text-sm">{initials}</span>
          </div>
          <div className="flex-1">
            <p className="font-black text-gray-800 text-sm tracking-tight leading-none mb-1">{displayName}</p>
            {username && <p className="text-[10px] text-gray-400 font-mono">@{username}</p>}
          </div>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gray-50">
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>
        </div>

        {/* ── Balance card ── */}
        <div className="rounded-[2.5rem] p-7 mb-6 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg,#0A0F0D 0%,#00A851 70%,#00D26A 100%)",
            boxShadow: "0 20px 50px rgba(0,210,106,0.35)",
          }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#9945FF] opacity-10 blur-3xl" />
          
          {/* Grid texture */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 28px,rgba(255,255,255,1) 28px,rgba(255,255,255,1) 29px),repeating-linear-gradient(90deg,transparent,transparent 28px,rgba(255,255,255,1) 28px,rgba(255,255,255,1) 29px)" }} />

          <div className="relative z-10">

            {/* Balance row */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Garantia Líquida</p>
                <p className="text-white text-4xl font-black tracking-tighter leading-none">
                  {showBalance ? fmtAmount(totalUsd) : "••••"}
                </p>
              </div>
              <div className="flex gap-2.5">
                {/* Currency toggle */}
                <button onClick={cycleCurrency}
                  className="px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest transition-all"
                  style={{ background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.15)" }}>
                  {CURRENCY_LABELS[currency]}
                </button>
                {/* Show/hide */}
                <button onClick={() => setShowBalance(b => !b)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-[0.9]"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                  {showBalance
                    ? <Eye className="w-4 h-4 text-white/60" />
                    : <EyeOff className="w-4 h-4 text-white/60" />}
                </button>
              </div>
            </div>

            {/* Disponível / Em Deals */}
            <div className="flex gap-6 mb-6 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <div>
                <p className="text-white/30 text-[9px] font-black uppercase tracking-widest mb-1">Disponível</p>
                <p className="text-white font-black text-base tracking-tight">{fmtAmount(availableUsd, !showBalance)}</p>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <p className="text-white/30 text-[9px] font-black uppercase tracking-widest mb-1">Bloqueado</p>
                <p className="text-white font-black text-base tracking-tight">{fmtAmount(frozenUsd, !showBalance)}</p>
              </div>
            </div>

            {/* Wallet address */}
            <button onClick={copyAddr}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all active:scale-[0.98]"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-lg bg-[#9945FF]/20 flex items-center justify-center">
                  <span className="text-[10px] font-black text-[#9945FF]">◎</span>
                </div>
                <span className="text-xs text-white/60 font-mono font-medium tracking-tight">
                  {managedPublicKey ? truncateAddr(managedPublicKey) : "Gerando…"}
                </span>
              </div>
              {copied
                ? <Check className="w-4 h-4 text-[#00D26A]" />
                : <Copy className="w-4 h-4 text-white/20" />}
            </button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {[
            { label: "Depositar", icon: ArrowDownToLine, action: () => setActiveModal("deposit"),  primary: true  },
            { label: "Liquidar",  icon: ArrowUpFromLine, action: () => setActiveModal("withdraw"), primary: false },
          ].map((btn) => {
            const Icon = btn.icon
            return (
              <button key={btn.label} onClick={btn.action}
                className="py-5 rounded-[2rem] flex flex-col items-center gap-2 transition-all duration-300 active:scale-[0.96]"
                style={{
                  background: btn.primary
                    ? "#00D26A"
                    : "rgba(255,255,255,0.5)",
                  color:     btn.primary ? "#0A0F0D" : "#374151",
                  border:    btn.primary ? "none" : "1px solid rgba(255,255,255,0.6)",
                  backdropFilter: "blur(20px)",
                  boxShadow: btn.primary ? "0 10px 24px rgba(0,210,106,0.3)" : "none",
                }}>
                <Icon className="w-6 h-6 stroke-[2.5]" />
                <span className="text-xs font-black uppercase tracking-widest">{btn.label}</span>
              </button>
            )
          })}
        </div>

        {/* Deal history */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Fluxo de Performance</p>
        </div>

        <div className="space-y-3 mb-6">
          {dealHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 rounded-[2.5rem] gap-3"
              style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)" }}>
              <Trophy className="w-8 h-8 text-gray-200" />
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest text-center leading-relaxed">
                Nenhuma performance<br/>registrada on-chain.
              </p>
            </div>
          ) : (
            dealHistory.map((tx) => {
              const isPositive = tx.amount > 0
              const Icon  = isPositive ? Trophy : TrendingDown
              const color = isPositive ? "#00D26A" : "#FF4A4A"
              const bg    = isPositive ? "rgba(0,210,106,0.08)" : "rgba(255,74,74,0.08)"
              const label = DEAL_LABELS[tx.reason] ?? tx.reason
              const dateStr = formatDate(tx.created_at)
              return (
                <div key={tx.id} className="flex items-center gap-4 p-5 rounded-[2rem]"
                  style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)" }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: bg }}>
                    <Icon className="w-6 h-6" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-black text-gray-800 truncate tracking-tight leading-none mb-1">{label}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{dateStr}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-black tracking-tighter" style={{ color }}>
                      {isPositive ? "+" : ""}{tx.amount} 🤝
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <BottomNav active="Wallet" />

      {/* ── Deposit modal ── */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(10,15,13,0.6)", backdropFilter: "blur(8px)" }}
          onClick={() => setActiveModal(null)}>
          <div className="w-full rounded-t-[3rem] px-6 pt-8 pb-12"
            style={{ background: "#FFFFFF" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-8" />
            
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-[#0A0F0D] tracking-tight uppercase">
                  {activeModal === "deposit" ? "Protocolo de Depósito" : "Liquidação de Ativos"}
                </h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Sincronização em tempo real</p>
              </div>
              <button onClick={() => setActiveModal(null)}
                className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gray-50 border border-gray-100">
                <XIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {activeModal === "deposit" ? (
              <div className="space-y-6">
                <div className="p-6 rounded-[2.5rem]"
                  style={{ background: "#F9FAFB", border: "1.5px dashed #00D26A" }}>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Address do Custodiante (SOL)</p>
                  <p className="font-mono font-bold text-[#0A0F0D] text-sm break-all leading-relaxed">{managedPublicKey ?? "—"}</p>
                  <button onClick={copyAddr}
                    className="mt-4 w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98]"
                    style={{ background: "#0A0F0D", color: "#00D26A" }}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Endereço Copiado" : "Copiar Endereço"}
                  </button>
                </div>
                <div className="p-5 rounded-2xl bg-[#9945FF]/05 border border-[#9945FF]/10 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#9945FF]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[#9945FF] font-black text-lg">!</span>
                  </div>
                  <p className="text-[11px] text-[#9945FF] font-medium leading-relaxed uppercase">
                    Envie apenas <strong>SOLANA (SOL)</strong> para este endereço. O sistema audita o mempool em tempo real.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block">Montante de Liquidação (USD)</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-black text-lg">$</span>
                    <input type="number" value={pixAmount} onChange={e => setPixAmount(e.target.value)}
                      placeholder="0.00" className="w-full pl-10 pr-6 py-5 rounded-[2rem] outline-none text-[#0A0F0D] placeholder-gray-300 font-black text-xl tracking-tight"
                      style={{ background: "#F9FAFB", border: "1.5px solid #00D26A" }} />
                  </div>
                  <div className="flex justify-between items-center mt-3 px-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">
                      Vault Disponível: <span className="text-[#0A0F0D]">{fmtAmount(availableUsd)}</span>
                    </p>
                    <button onClick={() => setPixAmount(availableUsd.toFixed(2))} className="text-[10px] font-black text-[#00D26A] uppercase tracking-wider">MAX</button>
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Destino da Liquidez</p>
                    <p className="text-xs font-mono font-bold text-[#0A0F0D]">
                      {managedPublicKey ? truncateAddr(managedPublicKey) : "—"}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
                <button
                  className="w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-[0.98]"
                  style={{ background: "#0A0F0D", color: "#FFFFFF", boxShadow: "0 12px 30px rgba(0,0,0,0.15)" }}>
                  Autenticar Liquidação
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
