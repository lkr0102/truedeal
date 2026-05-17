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
  { icon: Home,    label: "Deals",    href: "/" },
  { icon: Compass, label: "Explorar", href: "/explore" },
  { icon: Wallet,  label: "Wallet",   href: "/wallet" },
  { icon: User,    label: "Perfil",   href: "/profile" },
]

function BottomNav({ active }: { active: string }) {
  const router = useRouter()
  return (
    <nav className="fixed bottom-0 left-0 right-0 px-6 py-4 z-10"
      style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(40px) saturate(200%)", borderTop: "1px solid rgba(255,255,255,0.5)" }}>
      <div className="flex justify-around items-center">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = active === item.label
          return (
            <button key={item.label} onClick={() => router.push(item.href)}
              className="flex flex-col items-center gap-1 transition-all duration-300">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? "scale-110" : ""}`}
                style={{ background: isActive ? "linear-gradient(135deg,#16A34A,#22C55E)" : "transparent" }}>
                <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-500"}`} />
              </div>
              <span className={`text-xs font-medium ${isActive ? "text-[#16A34A]" : "text-gray-500"}`}>{item.label}</span>
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
  deal_create: "Criou um deal",
  deal_join:   "Entrou em um deal",
  deal_win:    "Ganhou um deal",
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

type Currency = "usd" | "sol"
type ModalType = "deposit" | "withdraw" | null

// ── Props ─────────────────────────────────────────────────────────────────────

interface WalletClientProps {
  profile:          Profile | null
  tdpHistory:       TdpTransaction[]
  activeDealsValue: number           // sum of entry amounts in USDC
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

  // ── Currency helpers
  const totalUsd     = solBalance * solUsdPrice
  const frozenUsd    = activeDealsValue   // entry_amount is already in USDC (USD)
  const availableUsd = Math.max(0, totalUsd - frozenUsd)

  function fmtAmount(usdAmount: number, hide = false): string {
    if (hide) return "••••"
    switch (currency) {
      case "usd": return `$${usdAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      case "sol": return `${(solUsdPrice > 0 ? usdAmount / solUsdPrice : 0).toFixed(4)} SOL`
    }
  }

  // ── Profile
  const displayName = profile?.display_name ?? "Usuário"
  const username    = profile?.username ?? ""
  const initials    = getInitials(displayName)

  // ── Deal-only history
  const dealHistory = tdpHistory.filter(tx => DEAL_REASONS.includes(tx.reason))

  const CURRENCY_LABELS: Record<Currency, string> = { usd: "USD", sol: "SOL" }
  const CURRENCY_CYCLE: Currency[] = ["usd", "sol"]
  function cycleCurrency() {
    const idx = CURRENCY_CYCLE.indexOf(currency)
    setCurrency(CURRENCY_CYCLE[(idx + 1) % 3])
  }

  return (
    <div className="min-h-screen flex flex-col pb-24"
      style={{ backgroundImage: "url('/images/gradient-background.jpg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundAttachment: "fixed" }}>

      {/* Header */}
      <header className="px-5 pt-12 pb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Wallet</h1>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.25)" }}>
          <div className="w-2 h-2 rounded-full bg-[#16A34A]" />
          <span className="text-xs font-semibold text-[#16A34A]">Ativa</span>
        </div>
      </header>

      <div className="flex-1 px-5 overflow-y-auto">

        {/* User mini-card */}
        <div className="rounded-2xl px-4 py-3 mb-4 mt-3 flex items-center gap-3"
          style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.55)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#1A2E3A,#2A4E5A)" }}>
            <span className="text-blue-300 font-bold text-sm">{initials}</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-800 text-sm">{displayName}</p>
            {username && <p className="text-xs text-gray-400">@{username}</p>}
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </div>

        {/* ── Balance card ── */}
        <div className="rounded-3xl p-6 mb-5 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg,#0D2E1A 0%,#16A34A 55%,#22C55E 100%)",
            boxShadow: "0 16px 48px rgba(22,163,74,0.45)",
          }}>
          {/* Grid texture */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 28px,rgba(255,255,255,1) 28px,rgba(255,255,255,1) 29px),repeating-linear-gradient(90deg,transparent,transparent 28px,rgba(255,255,255,1) 28px,rgba(255,255,255,1) 29px)" }} />

          <div className="relative z-10">

            {/* Balance row */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Saldo Total</p>
                <p className="text-white text-3xl font-black tracking-tight">
                  {showBalance ? fmtAmount(totalUsd) : "••••"}
                </p>
              </div>
              <div className="flex gap-2">
                {/* Currency toggle */}
                <button onClick={cycleCurrency}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                  style={{ background: "rgba(255,255,255,0.18)", color: "white", border: "1px solid rgba(255,255,255,0.25)" }}>
                  {CURRENCY_LABELS[currency]}
                </button>
                {/* Show/hide */}
                <button onClick={() => setShowBalance(b => !b)}
                  className="p-2 rounded-full"
                  style={{ background: "rgba(255,255,255,0.15)" }}>
                  {showBalance
                    ? <Eye className="w-4 h-4 text-white" />
                    : <EyeOff className="w-4 h-4 text-white" />}
                </button>
              </div>
            </div>

            {/* Disponível / Em Deals */}
            <div className="flex gap-4 mb-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.2)" }}>
              <div>
                <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Disponível</p>
                <p className="text-white font-bold">{fmtAmount(availableUsd, !showBalance)}</p>
              </div>
              <div className="w-px bg-white/20" />
              <div>
                <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Em Deals</p>
                <p className="text-white font-bold">{fmtAmount(frozenUsd, !showBalance)}</p>
              </div>
            </div>

            {/* Wallet address (replaces PIX) */}
            <button onClick={copyAddr}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all active:scale-[0.98]"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-white/50 uppercase">◎</span>
                <span className="text-xs text-white/90 font-mono font-medium">
                  {managedPublicKey ? truncateAddr(managedPublicKey) : "Gerando…"}
                </span>
              </div>
              {copied
                ? <Check className="w-4 h-4 text-white" />
                : <Copy className="w-4 h-4 text-white/60" />}
            </button>
            <p className="mt-2 text-[9px] text-white/40 text-center uppercase tracking-widest font-bold">
              🔐 Sovereign Managed Wallet · AES-256-GCM Secured
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: "Depositar", icon: ArrowDownToLine, action: () => setActiveModal("deposit"),  primary: true  },
            { label: "Sacar",     icon: ArrowUpFromLine, action: () => setActiveModal("withdraw"), primary: false },
          ].map((btn) => {
            const Icon = btn.icon
            return (
              <button key={btn.label} onClick={btn.action}
                className="py-4 rounded-2xl flex flex-col items-center gap-2 font-semibold text-sm transition-all duration-300 active:scale-[0.97]"
                style={{
                  background: btn.primary
                    ? "linear-gradient(135deg,#16A34A,#22C55E)"
                    : "rgba(255,255,255,0.5)",
                  color:     btn.primary ? "white" : "#374151",
                  border:    btn.primary ? "none" : "1px solid rgba(255,255,255,0.55)",
                  backdropFilter: "blur(20px)",
                  boxShadow: btn.primary ? "0 8px 24px rgba(22,163,74,0.35)" : "none",
                }}>
                <Icon className="w-5 h-5" />
                {btn.label}
              </button>
            )
          })}
        </div>

        {/* Deal history */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-700">Extrato de Deals</p>
        </div>

        <div className="space-y-2.5 mb-4">
          {dealHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 rounded-2xl gap-2"
              style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.55)" }}>
              <Trophy className="w-8 h-8 text-gray-200" />
              <p className="text-sm text-gray-400">Nenhum deal ainda</p>
              <p className="text-xs text-gray-300">Participe de um deal para ver seu histórico</p>
            </div>
          ) : (
            dealHistory.map((tx) => {
              const isPositive = tx.amount > 0
              const Icon  = isPositive ? Trophy : TrendingDown
              const color = isPositive ? "#16A34A" : "#EF4444"
              const bg    = isPositive ? "rgba(22,163,74,0.1)" : "rgba(239,68,68,0.1)"
              const label = DEAL_LABELS[tx.reason] ?? tx.reason
              const dateStr = formatDate(tx.created_at)
              return (
                <div key={tx.id} className="flex items-center gap-3 p-4 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.55)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: bg }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{label}</p>
                    <p className="text-[11px] text-gray-400">{dateStr}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color }}>
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
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setActiveModal(null)}>
          <div className="w-full rounded-t-3xl px-5 pt-6 pb-10"
            style={{ background: "rgba(255,255,255,0.98)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">
                {activeModal === "deposit" ? "Depositar" : "Sacar"}
              </h2>
              <button onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.06)" }}>
                <XIcon className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {activeModal === "deposit" ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl"
                  style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.2)" }}>
                  <p className="text-xs text-gray-500 mb-1">Endereço da sua carteira</p>
                  <p className="font-mono font-bold text-gray-800 text-sm break-all">{managedPublicKey ?? "—"}</p>
                  <button onClick={copyAddr}
                    className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#16A34A]">
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copiado!" : "Copiar endereço"}
                  </button>
                </div>
                <p className="text-xs text-gray-400 text-center leading-relaxed">
                  Envie SOL para esse endereço. O saldo é atualizado automaticamente.
                </p>
                <div className="pt-2">
                  <a href="https://faucet.solana.com/" target="_blank" rel="noreferrer"
                    className="block w-full py-2 text-center text-[11px] font-bold text-blue-500 rounded-lg"
                    style={{ background: "rgba(59,130,246,0.06)", border: "1px dashed rgba(59,130,246,0.3)" }}>
                    Precisa de SOL de teste? Use o Faucet da Solana →
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Valor a sacar (USD)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-semibold">$</span>
                    <input type="number" value={pixAmount} onChange={e => setPixAmount(e.target.value)}
                      placeholder="0.00" className="w-full pl-8 pr-4 py-3.5 rounded-xl outline-none text-gray-800 placeholder-gray-400 font-medium"
                      style={{ background: "rgba(0,0,0,0.04)", border: "1.5px solid rgba(22,163,74,0.3)" }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Disponível: {fmtAmount(availableUsd)}
                  </p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: "rgba(0,0,0,0.04)" }}>
                  <p className="text-[10px] text-gray-500 mb-0.5">Destino</p>
                  <p className="text-sm font-mono font-semibold text-gray-800 break-all">
                    {managedPublicKey ? truncateAddr(managedPublicKey) : "—"}
                  </p>
                </div>
                <button
                  className="w-full py-4 rounded-2xl font-bold text-white transition-all"
                  style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)", boxShadow: "0 8px 24px rgba(22,163,74,0.35)" }}>
                  Confirmar saque
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
