"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { differenceInCalendarDays, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ArrowLeft, ExternalLink, Trophy, Clock, Wallet, Shield,
  Copy, Check, Plus, AlertCircle,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useLanguageStore, t } from "@/lib/i18n"
import type { DealWithParticipants, Distribution } from "@/lib/supabase/types"

// ── Confetti ──────────────────────────────────────────────────────────────────

function Confetti() {
  const [particles, setParticles] = useState<
    { id: number; left: number; delay: number; duration: number }[]
  >([])

  useEffect(() => {
    setParticles(
      Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.3,
        duration: 2.5 + Math.random() * 1.5,
      }))
    )
  }, [])

  const COLORS = ["#16A34A", "#22C55E", "#bbf7d0", "#FCD34D", "#ffffff", "#6EE7B7"]

  return (
    <>
      {particles.map(p => (
        <div
          key={p.id}
          className="fixed pointer-events-none z-50"
          style={{
            left: `${p.left}%`,
            top: "-20px",
            width: "8px",
            height: "8px",
            borderRadius: "2px",
            background: COLORS[p.id % 6],
            animation: `confettiFall ${p.duration}s linear ${p.delay}s forwards`,
          }}
        />
      ))}
    </>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLAYER_COLORS = ["#4AABFF", "#BF4ADF", "#16A34A", "#F59E0B", "#EF4444", "#10B981"]

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
}

function rewardForRank(distribution: Distribution, netPot: number, rank: number): number {
  if (distribution === "winner") return rank === 1 ? Math.round(netPot * 0.95) : 0
  if (distribution === "top3") {
    const pcts = [0.50, 0.30, 0.20]
    return rank <= 3 ? Math.round(netPot * pcts[rank - 1]) : 0
  }
  return Math.round(netPot / 3)
}

const rankMedals = ["🥇", "🥈", "🥉"]
const rankColors = ["#D97706", "#6B7280", "#9A3412"]

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DealResultClient({
  deal,
  userId,
}: {
  deal: DealWithParticipants
  userId: string | null
}) {
  const router = useRouter()
  const { language } = useLanguageStore()
  const [showConfetti, setShowConfetti] = useState(false)
  const [copied, setCopied] = useState(false)

  const isWinner = !!deal.winner_id && deal.winner_id === userId
  const hasPendingResult = deal.status === "finalizado" && !deal.winner_id

  useEffect(() => {
    if (!hasPendingResult) {
      const t = setTimeout(() => setShowConfetti(true), 400)
      return () => clearTimeout(t)
    }
  }, [hasPendingResult])

  // Computed display values
  const startDate  = new Date(deal.start_date)
  const endDate    = new Date(deal.end_date)
  const durationDays = Math.max(1, differenceInCalendarDays(endDate, startDate))
  const startStr   = format(startDate, "dd MMM", { locale: language === "pt" ? ptBR : undefined })
  const endStr     = format(endDate,   "dd MMM", { locale: language === "pt" ? ptBR : undefined })
  const channel    = deal.verification_channels?.[0] ?? "manual"

  // Ranking: sorted by rank, or by participant order if rank not set
  const ranking = [...deal.participants]
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    .map((p, i) => {
      const name     = p.profile.display_name || p.profile.username
      const rank     = p.rank ?? (i + 1)
      const snapVal  = p.current_snapshot ? (Object.values(p.current_snapshot)[0] as number ?? 0) : 0
      const reward   = rewardForRank(deal.distribution, deal.net_pot, rank)
      return {
        rank,
        initials: getInitials(name),
        name,
        metric:   snapVal > 0 ? snapVal.toLocaleString("pt-BR") : "—",
        reward:   `$${reward.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        color:    PLAYER_COLORS[i % PLAYER_COLORS.length],
        isMe:     p.user_id === userId,
        isWinner: p.user_id === deal.winner_id,
      }
    })

  // Winner info
  const winnerPlayer = ranking.find(r => r.isWinner) ?? ranking[0]
  const myPlayer     = ranking.find(r => r.isMe)
  const myReward     = myPlayer ? rewardForRank(deal.distribution, deal.net_pot, myPlayer.rank) : 0

  // Payout distribution rows
  const payoutRows = (() => {
    if (deal.distribution === "winner") return [
      { position: language === "pt" ? "Vencedor" : "Winner",  pct: 95, amount: Math.round(deal.net_pot * 0.95), color: "#FCD34D" },
      { position: "True Deal", pct: 5,  amount: Math.round(deal.net_pot * 0.05), color: "#16A34A" },
    ]
    if (deal.distribution === "top3") return [
      { position: language === "pt" ? "1º Lugar" : "1st Place", pct: 50, amount: Math.round(deal.net_pot * 0.50), color: "#FCD34D" },
      { position: language === "pt" ? "2º Lugar" : "2nd Place", pct: 30, amount: Math.round(deal.net_pot * 0.30), color: "#9CA3AF" },
      { position: language === "pt" ? "3º Lugar" : "3rd Place", pct: 20, amount: Math.round(deal.net_pot * 0.20), color: "#D97706" },
    ]
    return [{ position: language === "pt" ? "Proporcional" : "Proportional", pct: 100, amount: deal.net_pot, color: "#7C3AED" }]
  })()

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/deal/${deal.id}`
    : `/deal/${deal.id}`

  function handleCopyLink() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleShare(platform: string) {
    const winText = isWinner
      ? (language === "pt" 
          ? `Acabei de vencer "${deal.title}"! 🏆 Ganhei $${myReward.toLocaleString("en-US", { minimumFractionDigits: 2 })} na True Deal. Quer participar?`
          : `I just won "${deal.title}"! 🏆 I earned $${myReward.toLocaleString("en-US", { minimumFractionDigits: 2 })} on True Deal. Want to join?`)
      : (language === "pt"
          ? `Confira o resultado do deal "${deal.title}" na True Deal!`
          : `Check out the result of deal "${deal.title}" on True Deal!`)
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(winText + " " + shareUrl)}`,
      twitter:  `https://twitter.com/intent/tweet?text=${encodeURIComponent(winText + " " + shareUrl)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(winText)}`,
    }
    if (urls[platform]) window.open(urls[platform], "_blank")
  }

  // ── Pending result state ──────────────────────────────────────────────────

  if (hasPendingResult) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6"
        style={{ backgroundImage: "url('/images/gradient-background.jpg')", backgroundSize: "cover" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
          <AlertCircle className="w-9 h-9 text-amber-500" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-1">{language === "pt" ? "Resultado pendente" : "Pending result"}</h2>
          <p className="text-sm text-gray-500">{language === "pt" ? "O vencedor ainda não foi declarado pelo árbitro." : "The winner has not yet been declared by the referee."}</p>
        </div>
        <button onClick={() => router.push("/")}
          className="px-6 py-3 rounded-2xl font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)" }}>
          {language === "pt" ? "Voltar para Home" : "Back to Home"}
        </button>
      </div>
    )
  }

  // ── Full result view ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        backgroundImage: "url('/images/gradient-background.jpg')",
        backgroundSize: "cover", backgroundPosition: "center",
        backgroundRepeat: "no-repeat", backgroundAttachment: "fixed",
      }}>
      {showConfetti && isWinner && <Confetti />}

      <header className="px-5 pt-12 pb-4 flex-shrink-0">
        <button onClick={() => router.push("/")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">{language === "pt" ? "Meus Deals" : "My Deals"}</span>
        </button>
      </header>

      <div className="flex-1 px-5 pb-8 overflow-y-auto space-y-5">

        {/* Hero */}
        <div className="rounded-3xl p-6 relative overflow-hidden text-white text-center"
          style={{
            background: "linear-gradient(160deg,#0D2E1A 0%,#16A34A 60%,#22C55E 100%)",
            boxShadow: "0 16px 48px rgba(22,163,74,0.45)",
          }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="relative z-10">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}>
                <Trophy className="w-9 h-9" />
              </div>
            </div>
            <p className="text-sm font-semibold opacity-90 mb-1">{language === "pt" ? "Vencedor do Deal" : "Deal Winner"}</p>
            <h1 className="text-2xl font-black mb-3">{winnerPlayer?.name ?? "—"}</h1>
            <div className="text-4xl font-bold mb-1">
              ${rewardForRank(deal.distribution, deal.net_pot, 1).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs opacity-70 mb-4">{language === "pt" ? `Após fee True Deal (${deal.fee_pct}%)` : `After True Deal fee (${deal.fee_pct}%)`}</p>
            <div className="pt-4 border-t border-white/20 text-xs opacity-80 space-y-1">
              <p className="font-semibold">{deal.title}</p>
              <p>{startStr} → {endStr}</p>
            </div>
          </div>
        </div>

        {/* Winner payout banner */}
        {isWinner && (
          <div className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "linear-gradient(135deg,rgba(22,163,74,0.12),rgba(34,197,94,0.08))", border: "1px solid rgba(22,163,74,0.25)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(22,163,74,0.2)" }}>
              <span className="text-xl">💸</span>
            </div>
            <div>
              <p className="text-xs font-bold text-[#16A34A] uppercase tracking-wide">{language === "pt" ? "Pagamento confirmado" : "Payment confirmed"}</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">
                ${myReward.toLocaleString("en-US", { minimumFractionDigits: 2 })} — {language === "pt" ? "parabéns!" : "congratulations!"}
              </p>
            </div>
          </div>
        )}

        {/* My position (if participating) */}
        {myPlayer && (
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.18)" }}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)", boxShadow: "0 4px 14px rgba(22,163,74,0.4)" }}>
                {rankMedals[myPlayer.rank - 1] ?? myPlayer.rank}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{language === "pt" ? "Minha posição" : "My position"}</p>
                <p className="text-sm font-bold text-gray-800">{myPlayer.rank}{language === "pt" ? "º" : (myPlayer.rank === 1 ? "st" : myPlayer.rank === 2 ? "nd" : myPlayer.rank === 3 ? "rd" : "th")} {language === "pt" ? "lugar" : "place"}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-black text-[#16A34A]">
                  ${myReward.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
                {myPlayer.metric !== "—" && <p className="text-xs text-gray-500">{myPlayer.metric} pts</p>}
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { Icon: Clock,  value: `${durationDays}d`, label: language === "pt" ? "Duração" : "Duration" },
            { Icon: Wallet, value: `$${deal.entry_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, label: language === "pt" ? "Entrada" : "Entry" },
            { Icon: Shield, value: channel.toUpperCase(), label: language === "pt" ? "Verificado" : "Verified" },
          ].map(stat => {
            const Icon = stat.Icon
            return (
              <div key={stat.label} className="p-4 rounded-2xl text-center"
                style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(30px)", border: "1px solid rgba(255,255,255,0.6)" }}>
                <Icon className="w-5 h-5 mx-auto text-gray-600 mb-2" />
                <p className="text-sm font-bold text-gray-800 truncate">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            )
          })}
        </div>

        {/* Prize distribution */}
        <div className="rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(30px)", border: "1px solid rgba(255,255,255,0.6)" }}>
          <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">
            {language === "pt" ? "Distribuição" : "Distribution"} ($${deal.pot_total.toLocaleString("en-US", { minimumFractionDigits: 2 })})
          </p>
          <div className="space-y-3">
            {payoutRows.map((row, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-800">{row.position}</span>
                  <span className="text-sm font-bold text-gray-800">
                    {row.pct}% · ${row.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${row.pct}%`, background: row.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Final ranking */}
        <div className="rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(30px)", border: "1px solid rgba(255,255,255,0.6)" }}>
          <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">{language === "pt" ? "Ranking Final" : "Final Ranking"}</p>
          <div className="space-y-2">
            {ranking.map(player => (
              <div key={player.initials + player.rank}
                className="flex items-center gap-3 p-2.5 rounded-xl"
                style={player.isMe
                  ? { background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.2)" }
                  : { background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.05)" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    background: player.rank === 1 ? "rgba(251,191,36,0.15)" : player.rank === 2 ? "rgba(156,163,175,0.15)" : "rgba(180,83,9,0.12)",
                    color: rankColors[Math.min(player.rank - 1, 2)],
                  }}>
                  {rankMedals[player.rank - 1] ?? `#${player.rank}`}
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: player.color }}>
                  {player.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${player.isMe ? "text-[#16A34A]" : "text-gray-800"}`}>
                    {player.name}
                    {player.isMe && <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(22,163,74,0.12)", color: "#16A34A" }}>{language === "pt" ? "Você" : "You"}</span>}
                  </p>
                  <p className="text-xs text-gray-500">{player.metric !== "—" ? `${player.metric} pts` : (language === "pt" ? "sem dados" : "no data")}</p>
                </div>
                <p className={`text-xs font-bold flex-shrink-0 ${player.rank === 1 ? "text-[#16A34A]" : "text-gray-500"}`}>
                  {player.reward}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* On-chain link */}
        {(deal as any).solana_tx_signature ? (
          <a
            href={`https://explorer.solana.com/tx/${(deal as any).solana_tx_signature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full p-4 rounded-2xl flex items-center justify-between transition-all active:scale-[0.98]"
            style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(30px)", border: "1px solid rgba(255,255,255,0.6)" }}
          >
            <span className="text-gray-700 font-semibold text-sm">{language === "pt" ? "Smart contract executado" : "Smart contract executed"}</span>
            <span className="text-[#16A34A] flex items-center gap-1 text-sm font-medium">
              {language === "pt" ? "Ver on-chain" : "View on-chain"} <ExternalLink className="w-4 h-4" />
            </span>
          </a>
        ) : (
          <div className="w-full p-4 rounded-2xl flex items-center justify-between opacity-50 cursor-default"
            style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(30px)", border: "1px solid rgba(255,255,255,0.6)" }}>
            <span className="text-gray-700 font-semibold text-sm">{language === "pt" ? "Smart contract executado" : "Smart contract executed"}</span>
            <span className="text-gray-400 flex items-center gap-1 text-sm font-medium">
              {language === "pt" ? "Processando..." : "Processing..."} <ExternalLink className="w-4 h-4" />
            </span>
          </div>
        )}

        {/* Share preview */}
        <div className="rounded-2xl p-5 relative overflow-hidden text-white text-center"
          style={{ background: "linear-gradient(160deg,#0D2E1A 0%,#16A34A 55%,#22C55E 100%)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
          <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="relative z-10">
            <p className="text-xs opacity-70 mb-1">{language === "pt" ? "Compartilhe sua vitória" : "Share your victory"}</p>
            <p className="text-base font-bold mb-2">{deal.title}</p>
            {myPlayer && <p className="text-3xl font-black mb-1">${myReward.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>}
            <p className="text-xs opacity-70">{myPlayer?.rank ?? 1}{language === "pt" ? "º" : (myPlayer?.rank === 1 ? "st" : myPlayer?.rank === 2 ? "nd" : myPlayer?.rank === 3 ? "rd" : "th")} {language === "pt" ? "lugar" : "place"}</p>
          </div>
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "whatsapp", label: "WhatsApp", color: "#25D366" },
            { id: "twitter",  label: "X",         color: "#000000" },
            { id: "telegram", label: "Telegram",  color: "#229ED9" },
          ].map(btn => (
            <button key={btn.id} onClick={() => handleShare(btn.id)}
              className="flex items-center justify-center gap-2 p-3 rounded-xl transition-all active:scale-95"
              style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(30px)", border: "1px solid rgba(255,255,255,0.6)" }}>
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: btn.color }} />
              <span className="text-xs font-semibold text-gray-800">{btn.label}</span>
            </button>
          ))}
        </div>

        {/* Copy link */}
        <button onClick={handleCopyLink}
          className="w-full p-3.5 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2"
          style={{
            background: copied ? "rgba(22,163,74,0.12)" : "rgba(255,255,255,0.5)",
            backdropFilter: "blur(30px)", border: copied ? "1px dashed rgba(22,163,74,0.3)" : "1px dashed rgba(200,200,200,0.4)",
            color: copied ? "#16A34A" : "#374151",
          }}>
          {copied 
            ? <><Check className="w-4 h-4" /> {language === "pt" ? "Link copiado!" : "Link copied!"}</> 
            : <><Copy className="w-4 h-4" /> {language === "pt" ? "Copiar link" : "Copy link"}</>}
        </button>

        {/* CTAs */}
        <div className="space-y-3">
          <button onClick={() => router.push("/create")}
            className="w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 text-white transition-all active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg,#16A34A 0%,#22C55E 100%)", boxShadow: "0 8px 32px rgba(22,163,74,0.4)" }}>
            <Plus className="w-5 h-5" />
            {language === "pt" ? "Criar novo Deal" : "Create new Deal"}
          </button>
          <button onClick={() => router.push("/")}
            className="w-full py-4 rounded-2xl font-semibold transition-all"
            style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(30px)", border: "1px solid rgba(255,255,255,0.6)", color: "#374151" }}>
            {language === "pt" ? "Voltar para Home" : "Back to Home"}
          </button>
        </div>

      </div>
    </div>
  )
}
