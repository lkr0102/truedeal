"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Home, Compass, Wallet, User, Plus,
  Eye, EyeOff, ArrowDownToLine, ArrowUpFromLine,
  Trophy, X as XIcon, TrendingDown,
  Copy, Check, ChevronRight, FlaskConical, Loader2,
} from "lucide-react"
import type { Profile, TdpTransaction, TdpReason } from "@/lib/supabase/types"
import { claimDevnetUSDC } from "@/lib/actions/wallet"

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:           "#F0F3F0",
  surface:      "#FFFFFF",
  surface2:     "#E8EDE8",
  border:       "#D8E0D8",
  border2:      "#E6EEE6",
  text:         "#0B1309",
  mid:          "#4E614E",
  dim:          "#8BA09A",
  brand:        "#00B852",
  brandDark:    "#008C3E",
  forming:      "#E8620A",
  activeLight:  "rgba(0,184,82,0.08)",
  activeBorder: "rgba(0,184,82,0.2)",
} as const

const MONO: React.CSSProperties = { fontFamily: "var(--font-dm-mono,'DM Mono',monospace)" }

// ── Bottom nav ────────────────────────────────────────────────────────────────

function BottomNav({ active }: { active: string }) {
  const router = useRouter()
  const items = [
    { icon: Home,    key: "home",    href: "/" },
    { icon: Compass, key: "explore", href: "/explore" },
  ]
  const rightItems = [
    { icon: Wallet, key: "wallet",  href: "/wallet" },
    { icon: User,   key: "profile", href: "/profile" },
  ]
  const navItem = (Icon: React.ElementType, key: string, href: string, label: string) => {
    const isActive = active === key
    return (
      <button key={key} onClick={() => router.push(href)}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontSize: 9, color: isActive ? C.brand : C.dim, cursor: "pointer", background: "none", border: "none", flex: 1, ...MONO, letterSpacing: "0.04em" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: isActive ? C.brand : "transparent" }}>
          <Icon style={{ width: 20, height: 20, stroke: isActive ? "#fff" : C.dim, fill: "none" }} />
        </div>
        <span style={{ textTransform: "uppercase" as const }}>{label}</span>
      </button>
    )
  }
  return (
    <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(240,243,240,0.94)", backdropFilter: "blur(16px)", borderTop: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", padding: "9px 0 26px", zIndex: 20 }}>
      {items.map(i => navItem(i.icon, i.key, i.href, i.key === "home" ? "Deals" : "Explorar"))}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        <button onClick={() => router.push("/create")} style={{ width: 50, height: 50, background: C.brand, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginTop: -14, boxShadow: "0 4px 14px rgba(0,184,82,0.35)", border: `3px solid ${C.bg}`, cursor: "pointer" }}>
          <Plus style={{ width: 22, height: 22, stroke: "#fff", fill: "none" }} />
        </button>
        <span style={{ fontSize: 9, fontWeight: 500, color: C.brand, textTransform: "uppercase" as const, letterSpacing: "0.04em", ...MONO }}>New Deal</span>
      </div>
      {rightItems.map(i => navItem(i.icon, i.key, i.href, i.key === "wallet" ? "Wallet" : "Perfil"))}
    </nav>
  )
}

// ── Labels ────────────────────────────────────────────────────────────────────

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
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (itemDate.getTime() === today.getTime()) return "Hoje"
  if (itemDate.getTime() === yesterday.getTime()) return "Ontem"
  const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
  return `${String(date.getDate()).padStart(2,"0")} ${MONTHS[date.getMonth()]}`
}

type Currency  = "usd" | "sol"
type ModalType = "deposit" | "withdraw" | null

// ── Props ─────────────────────────────────────────────────────────────────────

interface WalletClientProps {
  profile:          Profile | null
  tdpHistory:       TdpTransaction[]
  activeDealsValue: number
  managedPublicKey: string | null
  isExternalWallet?: boolean
  solBalance:       number
  solUsdPrice:      number
  usdcBalance:      number
  isDevnet:         boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WalletClient({
  profile, tdpHistory, activeDealsValue, managedPublicKey, isExternalWallet = false, solBalance, solUsdPrice, usdcBalance, isDevnet,
}: WalletClientProps) {
  const [showBalance, setShowBalance] = useState(true)
  const [currency,    setCurrency]    = useState<Currency>("usd")
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [copied,      setCopied]      = useState(false)
  const [pixAmount,   setPixAmount]   = useState("")
  const [claimState,  setClaimState]  = useState<"idle" | "loading" | "ok" | "err">("idle")
  const [claimError,  setClaimError]  = useState<string | null>(null)

  async function handleClaimUSDC() {
    if (claimState === "loading") return
    setClaimState("loading")
    setClaimError(null)
    const res = await claimDevnetUSDC()
    if (res.success) {
      setClaimState("ok")
      setTimeout(() => setClaimState("idle"), 4000)
    } else {
      setClaimState("err")
      setClaimError(res.error ?? null)
    }
  }

  function truncateAddr(addr: string) { return `${addr.slice(0,6)}...${addr.slice(-6)}` }
  function copyAddr() {
    if (!managedPublicKey) return
    navigator.clipboard.writeText(managedPublicKey).catch(() => {})
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const totalUsd     = usdcBalance                         // USDC is the deal currency (1 USDC ≈ $1)
  const frozenUsd    = activeDealsValue
  const availableUsd = Math.max(0, usdcBalance - frozenUsd)

  function fmtAmount(usdcAmt: number, hide = false): string {
    if (hide) return "••••"
    if (currency === "sol") return `${(solUsdPrice > 0 ? usdcAmt / solUsdPrice : 0).toFixed(4)} SOL`
    return `$${usdcAmt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const displayName = profile?.display_name ?? "Usuário"
  const username    = profile?.username ?? ""
  const initials    = getInitials(displayName)
  const dealHistory = tdpHistory.filter(tx => DEAL_REASONS.includes(tx.reason))

  const CURRENCY_LABELS: Record<Currency, string> = { usd: "USDC", sol: "SOL" }
  const CURRENCY_CYCLE: Currency[] = ["usd", "sol"]
  function cycleCurrency() {
    const idx = CURRENCY_CYCLE.indexOf(currency)
    setCurrency(CURRENCY_CYCLE[(idx + 1) % CURRENCY_CYCLE.length])
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", paddingBottom: 90 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 8px" }}>
        <h1 style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.03em", color: C.text }}>Wallet</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 100, background: C.activeLight, border: `1px solid ${C.activeBorder}` }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.brand }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: C.brand, ...MONO }}>Ativa</span>
        </div>
      </div>

      <div style={{ flex: 1, padding: "0 20px", overflowY: "auto" }}>

        {/* User mini-card */}
        <div style={{ borderRadius: 16, padding: "12px 14px", marginBottom: 14, marginTop: 6, display: "flex", alignItems: "center", gap: 12, background: C.surface, border: `1px solid ${C.border}` }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: C.brand, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>{initials}</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{displayName}</p>
            {username && <p style={{ fontSize: 12, color: C.dim, ...MONO }}>@{username}</p>}
          </div>
          <ChevronRight style={{ width: 16, height: 16, stroke: C.border, fill: "none" }} />
        </div>

        {/* Balance card — hero verde, mantido por design */}
        <div style={{ borderRadius: 26, padding: 22, marginBottom: 16, position: "relative", overflow: "hidden", background: `linear-gradient(135deg,#003D22,${C.brandDark} 55%,${C.brand})`, boxShadow: "0 12px 40px rgba(0,184,82,0.35)" }}>
          <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 28px,rgba(255,255,255,1) 28px,rgba(255,255,255,1) 29px),repeating-linear-gradient(90deg,transparent,transparent 28px,rgba(255,255,255,1) 28px,rgba(255,255,255,1) 29px)" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Balance row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4, ...MONO }}>
                  {currency === "sol" ? "SOL Balance" : "USDC Balance"}
                </p>
                <p style={{ color: "#fff", fontSize: 30, fontWeight: 900, letterSpacing: "-0.03em" }}>
                  {showBalance ? (currency === "sol" ? `${solBalance.toFixed(4)} SOL` : `${totalUsd.toFixed(2)} USDC`) : "••••"}
                </p>
                {currency === "usd" && (
                  <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 2, ...MONO }}>
                    {showBalance ? `${solBalance.toFixed(4)} SOL` : "•••• SOL"}
                  </p>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={cycleCurrency} style={{ padding: "6px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)", cursor: "pointer", ...MONO }}>
                  {CURRENCY_LABELS[currency]}
                </button>
                <button onClick={() => setShowBalance(b => !b)} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {showBalance ? <Eye style={{ width: 16, height: 16, stroke: "#fff", fill: "none" }} /> : <EyeOff style={{ width: 16, height: 16, stroke: "#fff", fill: "none" }} />}
                </button>
              </div>
            </div>

            {/* Disponível / Em Deals */}
            <div style={{ display: "flex", gap: 20, marginBottom: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.2)" }}>
              <div>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2, ...MONO }}>Disponível</p>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>
                  {!showBalance ? "••••" : currency === "sol"
                    ? `${(solUsdPrice > 0 ? availableUsd / solUsdPrice : 0).toFixed(4)} SOL`
                    : `${availableUsd.toFixed(2)} USDC`}
                </p>
              </div>
              <div style={{ width: 1, background: "rgba(255,255,255,0.2)" }} />
              <div>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2, ...MONO }}>Em Deals</p>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>
                  {!showBalance ? "••••" : currency === "sol"
                    ? `${(solUsdPrice > 0 ? frozenUsd / solUsdPrice : 0).toFixed(4)} SOL`
                    : `${frozenUsd.toFixed(2)} USDC`}
                </p>
              </div>
            </div>

            {/* Wallet address */}
            <button onClick={copyAddr} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>◎</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", ...MONO }}>
                  {managedPublicKey ? truncateAddr(managedPublicKey) : "Gerando…"}
                </span>
              </div>
              {copied ? <Check style={{ width: 16, height: 16, stroke: "#fff", fill: "none" }} /> : <Copy style={{ width: 16, height: 16, stroke: "rgba(255,255,255,0.6)", fill: "none" }} />}
            </button>
            <p style={{ marginTop: 8, fontSize: 9, color: "rgba(255,255,255,0.4)", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, ...MONO }}>
              {isExternalWallet ? "◎ Carteira Conectada · Phantom / Solflare" : "🔐 Sovereign Managed Wallet · AES-256-GCM"}
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Depositar", Icon: ArrowDownToLine, action: () => setActiveModal("deposit"),  primary: true  },
            { label: "Sacar",     Icon: ArrowUpFromLine, action: () => setActiveModal("withdraw"), primary: false },
          ].map((btn) => (
            <button key={btn.label} onClick={btn.action}
              style={{
                padding: "16px 0", borderRadius: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                fontWeight: 700, fontSize: 14, cursor: "pointer",
                background: btn.primary ? C.brand : C.surface,
                color:      btn.primary ? "#fff" : C.mid,
                border:     btn.primary ? "none" : `1px solid ${C.border}`,
                boxShadow:  btn.primary ? "0 6px 20px rgba(0,184,82,0.3)" : "none",
              }}>
              <btn.Icon style={{ width: 20, height: 20, stroke: "currentColor", fill: "none" }} />
              {btn.label}
            </button>
          ))}
        </div>

        {/* Devnet faucet */}
        {isDevnet && (
          <button
            onClick={handleClaimUSDC}
            disabled={claimState === "loading"}
            style={{
              width: "100%", marginBottom: 24, padding: "13px 0", borderRadius: 18,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontWeight: 700, fontSize: 13, cursor: claimState === "loading" ? "not-allowed" : "pointer",
              background: claimState === "ok"  ? "rgba(0,184,82,0.10)"
                        : claimState === "err" ? "rgba(220,38,38,0.08)"
                        : "rgba(59,130,246,0.08)",
              color: claimState === "ok"  ? C.brand
                   : claimState === "err" ? "#DC2626"
                   : "#3B82F6",
              border: `1px dashed ${
                claimState === "ok"  ? "rgba(0,184,82,0.35)"
              : claimState === "err" ? "rgba(220,38,38,0.3)"
              : "rgba(59,130,246,0.3)"}`,
            }}>
            {claimState === "loading"
              ? <Loader2 style={{ width: 16, height: 16, stroke: "#3B82F6", fill: "none", animation: "spin 1s linear infinite" }} />
              : <FlaskConical style={{ width: 16, height: 16, stroke: "currentColor", fill: "none" }} />}
            {claimState === "ok"  ? "1000 USDC recebidos! ✓"
           : claimState === "err" ? (claimError ? `Erro: ${claimError.slice(0, 60)}` : "Falha — tente novamente")
           : "Claim 1000 USDC for testing"}
          </button>
        )}

        {/* Deal history */}
        <p style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Extrato de Deals</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {dealHistory.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", borderRadius: 18, gap: 8, background: C.surface, border: `1px solid ${C.border}` }}>
              <Trophy style={{ width: 32, height: 32, stroke: C.border, fill: "none" }} />
              <p style={{ fontSize: 14, color: C.dim, fontWeight: 600 }}>Nenhum deal ainda</p>
              <p style={{ fontSize: 12, color: C.dim }}>Participe de um deal para ver seu histórico</p>
            </div>
          ) : (
            dealHistory.map((tx) => {
              const isPositive = tx.amount > 0
              const Icon  = isPositive ? Trophy : TrendingDown
              const color = isPositive ? C.brand : "#DC2626"
              const bg    = isPositive ? C.activeLight : "rgba(220,38,38,0.08)"
              const label = DEAL_LABELS[tx.reason] ?? tx.reason
              return (
                <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 18, background: C.surface, border: `1px solid ${C.border}` }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: bg }}>
                    <Icon style={{ width: 20, height: 20, stroke: color, fill: "none" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</p>
                    <p style={{ fontSize: 11, color: C.dim }}>{formatDate(tx.created_at)}</p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color }}>{isPositive ? "+" : ""}{tx.amount} 🤝</p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <BottomNav active="wallet" />

      {/* Deposit / Withdraw modal */}
      {activeModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,0.4)" }} onClick={() => setActiveModal(null)}>
          <div style={{ width: "100%", background: C.surface, borderRadius: "24px 24px 0 0", padding: "24px 20px 48px", boxShadow: "0 -16px 64px rgba(0,0,0,0.12)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text }}>
                {activeModal === "deposit" ? "Depositar" : "Sacar"}
              </h2>
              <button onClick={() => setActiveModal(null)} style={{ width: 32, height: 32, borderRadius: "50%", background: C.surface2, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <XIcon style={{ width: 14, height: 14, stroke: C.mid, fill: "none" }} />
              </button>
            </div>

            {activeModal === "deposit" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ padding: 16, borderRadius: 14, background: C.activeLight, border: `1px solid ${C.activeBorder}` }}>
                  <p style={{ fontSize: 11, color: C.dim, marginBottom: 4 }}>Endereço da sua carteira</p>
                  <p style={{ fontWeight: 700, color: C.text, fontSize: 14, wordBreak: "break-all", ...MONO }}>{managedPublicKey ?? "—"}</p>
                  <button onClick={copyAddr} style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: C.brand, background: "none", border: "none", cursor: "pointer" }}>
                    {copied ? <Check style={{ width: 14, height: 14, stroke: C.brand, fill: "none" }} /> : <Copy style={{ width: 14, height: 14, stroke: C.brand, fill: "none" }} />}
                    {copied ? "Copiado!" : "Copiar endereço"}
                  </button>
                </div>
                <p style={{ fontSize: 12, color: C.dim, textAlign: "center", lineHeight: 1.5 }}>
                  Envie USDC ou SOL para esse endereço. O saldo é atualizado automaticamente.
                </p>
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(0,184,82,0.06)", border: "1px dashed rgba(0,184,82,0.3)" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.brand, marginBottom: 2 }}>Devnet USDC (para deals)</p>
                  <p style={{ fontSize: 10, color: C.mid, ...MONO, wordBreak: "break-all" }}>
                    {process.env.NEXT_PUBLIC_USDC_MINT_DEVNET ?? "BpXHCSnxhbzSjzWeaTHG14g1zETtcZeDGk772Nvwjb99"}
                  </p>
                </div>
                <a href="https://faucet.solana.com/" target="_blank" rel="noreferrer"
                  style={{ display: "block", textAlign: "center", padding: "10px 0", fontSize: 12, fontWeight: 700, color: "#3B82F6", borderRadius: 10, background: "rgba(59,130,246,0.06)", border: "1px dashed rgba(59,130,246,0.3)", textDecoration: "none" }}>
                  Precisa de SOL de teste? Use o Faucet da Solana →
                </a>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.mid, display: "block", marginBottom: 8 }}>Valor a sacar (USD)</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.mid, fontWeight: 600 }}>$</span>
                    <input type="number" value={pixAmount} onChange={(e) => setPixAmount(e.target.value)}
                      placeholder="0.00"
                      style={{ width: "100%", boxSizing: "border-box", paddingLeft: 28, paddingRight: 16, paddingTop: 13, paddingBottom: 13, borderRadius: 12, fontSize: 14, background: C.surface2, border: `1px solid ${C.activeBorder}`, color: C.text, outline: "none", fontWeight: 500 }} />
                  </div>
                  <p style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>Disponível: {fmtAmount(availableUsd)}</p>
                </div>
                <div style={{ padding: "12px 14px", borderRadius: 12, background: C.surface2, border: `1px solid ${C.border}` }}>
                  <p style={{ fontSize: 10, color: C.dim, marginBottom: 3 }}>Destino</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text, wordBreak: "break-all", ...MONO }}>
                    {managedPublicKey ? truncateAddr(managedPublicKey) : "—"}
                  </p>
                </div>
                <button style={{ width: "100%", padding: "15px 0", borderRadius: 16, fontWeight: 700, fontSize: 15, color: "#fff", background: C.brand, border: "none", cursor: "pointer", boxShadow: "0 6px 20px rgba(0,184,82,0.3)" }}>
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
