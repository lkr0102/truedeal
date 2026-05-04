"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Home, Compass, Wallet, User,
  Eye, EyeOff, ArrowDownToLine, ArrowUpFromLine,
  Trophy, X as XIcon,
  Copy, Check, AlertCircle,
} from "lucide-react"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import type { Profile, TdpTransaction, TdpReason } from "@/lib/supabase/types"

// ─────────────────────────────────────────────────────────────────────────────
// Bottom nav
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// TDP reason labels
// ─────────────────────────────────────────────────────────────────────────────

const TDP_REASON_LABELS: Record<TdpReason, string> = {
  deal_create:    "Criou um deal",
  deal_join:      "Entrou em um deal",
  deal_win:       "Ganhou um deal",
  daily_checkin:  "Check-in diário",
  streak_7d:      "Streak de 7 dias",
  streak_30d:     "Streak de 30 dias",
  referral:       "Indicação",
  social_link:    "Rede social linkada",
  promo:          "Promoção",
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

function formatTdpDate(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (itemDate.getTime() === today.getTime()) return "Hoje"
  if (itemDate.getTime() === yesterday.getTime()) return "Ontem"

  const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
  return `${String(date.getDate()).padStart(2, "0")} ${MONTH_NAMES[date.getMonth()]}`
}

type ModalType = "deposit" | "withdraw" | null

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface WalletClientProps {
  profile: Profile | null
  tdpHistory: TdpTransaction[]
  activeDealsValue: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function WalletClient({ profile, tdpHistory, activeDealsValue }: WalletClientProps) {
  const [showBalance, setShowBalance]   = useState(true)
  const [activeModal, setActiveModal]   = useState<ModalType>(null)
  const [pixAmount,   setPixAmount]     = useState("")
  const [copied,      setCopied]        = useState(false)
  const [copiedAddr,  setCopiedAddr]    = useState(false)

  // ── Solana real data ──
  const { connection }                  = useConnection()
  const { publicKey, connected, disconnect } = useWallet()
  const [solBalance,  setSolBalance]    = useState<number | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)

  useEffect(() => {
    if (!publicKey || !connection) { setSolBalance(null); return }
    setBalanceLoading(true)
    connection.getBalance(publicKey)
      .then(lamports => setSolBalance(lamports / LAMPORTS_PER_SOL))
      .catch(() => setSolBalance(null))
      .finally(() => setBalanceLoading(false))
  }, [publicKey, connection])

  function truncateAddr(addr: string) {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`
  }

  function copyAddr() {
    if (!publicKey) return
    navigator.clipboard.writeText(publicKey.toBase58()).catch(() => {})
    setCopiedAddr(true)
    setTimeout(() => setCopiedAddr(false), 2000)
  }

  const PIX_KEY = "lukasrocha02@gmail.com"

  function copyPix() {
    navigator.clipboard.writeText(PIX_KEY).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function fmtBRL(val: number): string {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  }

  // Derived values from profile
  const tdpPoints    = profile?.tdp_points ?? 0
  const streakDays   = profile?.streak_days ?? 0
  const displayName  = profile?.display_name ?? "Usuário"
  const username     = profile?.username ?? ""
  const initials     = getInitials(displayName)

  // Balance is TDP points (the "wallet" in this app)
  const BALANCE  = tdpPoints
  const FROZEN   = activeDealsValue
  const AVAILABLE = Math.max(0, BALANCE - FROZEN)

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

        {/* ── Solana Wallet Card ── */}
        {connected && publicKey ? (
          <div className="rounded-2xl p-4 mb-4 mt-3"
            style={{
              background: "linear-gradient(135deg,rgba(153,69,255,0.08),rgba(252,140,0,0.06))",
              border:     "1px solid rgba(153,69,255,0.2)",
              backdropFilter: "blur(20px)",
            }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#9945FF,#FC8C00)" }}>
                  <span className="text-white text-[11px] font-black">◎</span>
                </div>
                <span className="text-sm font-bold text-gray-800">Carteira Solana</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(22,163,74,0.1)", color: "#16A34A" }}>
                  Conectada
                </span>
                <button onClick={() => disconnect()}
                  className="text-[10px] text-gray-400 hover:text-red-400 transition-colors">
                  Desconectar
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              {/* Address */}
              <button onClick={copyAddr}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
                style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.7)" }}>
                <span className="text-xs font-mono font-medium text-gray-700">
                  {truncateAddr(publicKey.toBase58())}
                </span>
                {copiedAddr
                  ? <Check className="w-3 h-3 text-[#16A34A]" />
                  : <Copy className="w-3 h-3 text-gray-400" />}
              </button>

              {/* SOL balance */}
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Saldo SOL</p>
                {balanceLoading ? (
                  <p className="text-lg font-black" style={{ color: "#9945FF" }}>…</p>
                ) : solBalance !== null ? (
                  <p className="text-lg font-black" style={{ color: "#9945FF" }}>
                    {solBalance.toFixed(4)} <span className="text-xs font-bold">SOL</span>
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">—</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-4 mb-4 mt-3 flex items-center gap-3"
            style={{
              background: "rgba(255,255,255,0.4)",
              border: "1px dashed rgba(153,69,255,0.25)",
              backdropFilter: "blur(20px)",
            }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#9945FF" }} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-700">Carteira não conectada</p>
              <p className="text-xs text-gray-400">Conecte sua carteira Solana para ver o saldo on-chain</p>
            </div>
            <button
              onClick={() => (window.location.href = "/login")}
              className="text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0"
              style={{ background: "rgba(153,69,255,0.12)", color: "#9945FF" }}>
              Conectar
            </button>
          </div>
        )}

        {/* User summary card */}
        <div className="rounded-2xl p-4 mb-5 flex items-center gap-4 mt-3"
          style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.55)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#1A2E3A,#2A4E5A)" }}>
            <span className="text-blue-300 font-bold text-lg">{initials}</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-800">{displayName}</p>
            <p className="text-xs text-gray-500">{username} · {tdpPoints.toLocaleString("pt-BR")} TDP</p>
            <div className="flex gap-3 mt-1">
              <span className="text-[10px] text-green-600 font-semibold">{streakDays}🔥 streak</span>
            </div>
          </div>
        </div>

        {/* Balance card */}
        <div className="rounded-3xl p-6 mb-5 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg,#0D2E1A 0%,#16A34A 55%,#22C55E 100%)",
            boxShadow: "0 16px 48px rgba(22,163,74,0.45)",
          }}>
          {/* Subtle grid texture */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 28px,rgba(255,255,255,1) 28px,rgba(255,255,255,1) 29px),repeating-linear-gradient(90deg,transparent,transparent 28px,rgba(255,255,255,1) 28px,rgba(255,255,255,1) 29px)" }} />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Saldo Total</p>
                <p className="text-white text-3xl font-black tracking-tight">
                  {showBalance ? `${tdpPoints.toLocaleString("pt-BR")} TDP` : "•••• TDP"}
                </p>
              </div>
              <button onClick={() => setShowBalance(b => !b)} className="p-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
                {showBalance ? <Eye className="w-5 h-5 text-white" /> : <EyeOff className="w-5 h-5 text-white" />}
              </button>
            </div>

            <div className="flex gap-4 mb-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.2)" }}>
              <div>
                <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Disponível</p>
                <p className="text-white font-bold">{showBalance ? `${AVAILABLE.toLocaleString("pt-BR")} TDP` : "••••"}</p>
              </div>
              <div className="w-px bg-white/20" />
              <div>
                <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Em Deals</p>
                <p className="text-white font-bold">{showBalance ? fmtBRL(FROZEN) : "••••"}</p>
              </div>
            </div>

            {/* PIX key */}
            <button onClick={copyPix}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-white/60 uppercase">Pix</span>
                <span className="text-xs text-white/90 font-medium">{PIX_KEY}</span>
              </div>
              {copied
                ? <Check className="w-4 h-4 text-white" />
                : <Copy className="w-4 h-4 text-white/60" />}
            </button>
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

        {/* Activity header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-700">Histórico de TDP</p>
          <div className="flex gap-1.5">
            {(["Todos","Deals","Movimentos"] as const).map((f, i) => (
              <button key={f}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all"
                style={{
                  background: i === 0 ? "rgba(22,163,74,0.12)" : "rgba(255,255,255,0.4)",
                  color:      i === 0 ? "#16A34A" : "#9CA3AF",
                  border:     i === 0 ? "1px solid rgba(22,163,74,0.3)" : "1px solid rgba(255,255,255,0.5)",
                }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* TDP history list */}
        <div className="space-y-2.5 mb-4">
          {tdpHistory.length === 0 ? (
            <div className="flex items-center justify-center p-8 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.55)" }}>
              <p className="text-sm text-gray-400">Nenhuma transação ainda</p>
            </div>
          ) : (
            tdpHistory.map((tx) => {
              const isPositive = tx.amount > 0
              const Icon = isPositive ? Trophy : XIcon
              const color = isPositive ? "#16A34A" : "#EF4444"
              const bg    = isPositive ? "rgba(22,163,74,0.1)" : "rgba(239,68,68,0.1)"
              const label = TDP_REASON_LABELS[tx.reason] ?? tx.reason
              const dateStr = formatTdpDate(tx.created_at)
              return (
                <div key={tx.id} className="flex items-center gap-3 p-4 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.55)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: bg }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{label}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color }}>
                      {isPositive ? "+" : ""}{tx.amount} TDP
                    </p>
                    <p className="text-[10px] text-gray-400">{dateStr}</p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <BottomNav active="Wallet" />

      {/* ── Deposit / Withdraw modal ── */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setActiveModal(null)}>
          <div className="w-full rounded-t-3xl px-5 pt-6 pb-10"
            style={{ background: "rgba(255,255,255,0.98)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">
                {activeModal === "deposit" ? "Depositar via Pix" : "Sacar para Pix"}
              </h2>
              <button onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.06)" }}>
                <XIcon className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {activeModal === "deposit" ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl text-center"
                  style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.2)" }}>
                  <p className="text-xs text-gray-500 mb-1">Chave Pix True Deal</p>
                  <p className="font-bold text-gray-800 text-sm">{PIX_KEY}</p>
                  <button onClick={copyPix}
                    className="mt-2 flex items-center gap-1.5 mx-auto text-xs font-semibold text-[#16A34A]">
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copiado!" : "Copiar chave"}
                  </button>
                </div>
                <p className="text-xs text-gray-400 text-center leading-relaxed">
                  Envie qualquer valor via Pix para essa chave. O saldo é creditado em até 5 minutos.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Valor a sacar</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-semibold">R$</span>
                    <input type="number" value={pixAmount} onChange={e => setPixAmount(e.target.value)}
                      placeholder="0,00" className="w-full pl-10 pr-4 py-3.5 rounded-xl outline-none text-gray-800 placeholder-gray-400 font-medium"
                      style={{ background: "rgba(0,0,0,0.04)", border: "1.5px solid rgba(22,163,74,0.3)" }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Disponível: {AVAILABLE.toLocaleString("pt-BR")} TDP
                  </p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: "rgba(0,0,0,0.04)" }}>
                  <p className="text-[10px] text-gray-500 mb-0.5">Chave Pix de destino</p>
                  <p className="text-sm font-semibold text-gray-800">{PIX_KEY}</p>
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
