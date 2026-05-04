"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft, ExternalLink, Trophy, Clock, Wallet, Shield, Copy, Check, Plus,
} from "lucide-react"

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

// ── Mock data per deal ────────────────────────────────────────────────────────

const RESULTS: Record<string, {
  dealTitle: string
  dealId: string
  channel: string
  startDate: string
  endDate: string
  totalPot: number
  myWon: number
  myRank: number
  isWinner: boolean
  ranking: { rank: number; initials: string; name: string; metric: string; reward: string; color: string; isMe: boolean }[]
  payoutDistribution: { position: string; percentage: number; amount: number; color: string }[]
}> = {
  "7": {
    dealTitle: "Leitura — 1 livro/mês",
    dealId: "#0007",
    channel: "X (Twitter)",
    startDate: "01 Abr",
    endDate: "30 Abr",
    totalPot: 78,
    myWon: 74,
    myRank: 1,
    isWinner: true,
    ranking: [
      { rank: 1, initials: "LR", name: "Lukas R.",  metric: "1 livro",   reward: "R$74",   color: "#4AABFF", isMe: true  },
      { rank: 2, initials: "JV", name: "João V.",   metric: "0 livros",  reward: "R$0",    color: "#D97706", isMe: false },
    ],
    payoutDistribution: [
      { position: "1º Lugar",    percentage: 94.9, amount: 74,   color: "#FCD34D" },
      { position: "True Deal",   percentage: 5.1,  amount: 4,    color: "#16A34A" },
    ],
  },
  default: {
    dealTitle: "Quem ganha mais seguidores",
    dealId: "#0042",
    channel: "X (Twitter)",
    startDate: "15 Abr",
    endDate: "15 Mai",
    totalPot: 290,
    myWon: 97.50,
    myRank: 1,
    isWinner: true,
    ranking: [
      { rank: 1, initials: "LR", name: "Lukas R.",  metric: "+910 seguidores", reward: "R$97,50", color: "#4AABFF", isMe: true  },
      { rank: 2, initials: "MC", name: "Maria C.",  metric: "+540 seguidores", reward: "R$48,75", color: "#BF4ADF", isMe: false },
      { rank: 3, initials: "PJ", name: "Pedro J.",  metric: "+320 seguidores", reward: "R$24,38", color: "#FF6B6B", isMe: false },
    ],
    payoutDistribution: [
      { position: "1º Lugar",  percentage: 33.6, amount: 97.50, color: "#FCD34D" },
      { position: "2º Lugar",  percentage: 16.8, amount: 48.75, color: "#9CA3AF" },
      { position: "3º Lugar",  percentage: 8.4,  amount: 24.38, color: "#C2410C" },
    ],
  },
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DealResultPage() {
  const router = useRouter()
  const params = useParams()
  const id     = (params?.id as string) ?? "default"

  const data = RESULTS[id] ?? RESULTS.default

  const [showConfetti, setShowConfetti] = useState(false)
  const [copied,       setCopied]       = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(true), 400)
    return () => clearTimeout(t)
  }, [])

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/deal/${id}`
    : `/deal/${id}`

  function handleCopyLink() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleShare(platform: string) {
    const text = `Acabei de vencer "${data.dealTitle}"! 🏆 Ganhei R$${data.myWon} na True Deal. Quer participar?`
    const urls: Record<string, string> = {
      whatsapp:  `https://wa.me/?text=${encodeURIComponent(text + " " + shareUrl)}`,
      instagram: `https://instagram.com/?text=${encodeURIComponent(text + " " + shareUrl)}`,
      twitter:   `https://twitter.com/intent/tweet?text=${encodeURIComponent(text + " " + shareUrl)}`,
      telegram:  `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`,
    }
    if (urls[platform]) window.open(urls[platform], "_blank")
  }

  const rankColors = ["#D97706", "#6B7280", "#9A3412"]
  const rankMedals = ["🥇", "🥈", "🥉"]

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: "url('/images/gradient-background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {showConfetti && <Confetti />}

      {/* Header */}
      <header className="px-5 pt-12 pb-4 flex-shrink-0">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Meus Deals</span>
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 px-5 pb-8 overflow-y-auto">

        {/* ── Result Hero ── */}
        <div
          className="rounded-3xl p-6 mb-6 relative overflow-hidden"
          style={{
            background: "linear-gradient(160deg, #0D2E1A 0%, #16A34A 60%, #22C55E 100%)",
            boxShadow: "0 16px 48px rgba(22,163,74,0.45)",
          }}
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full"
            style={{ background: "rgba(255,255,255,0.06)" }} />

          <div className="relative z-10 text-center text-white">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}>
                <Trophy className="w-9 h-9" />
              </div>
            </div>
            <p className="text-sm font-semibold opacity-90 mb-1">Vencedor do Deal</p>
            <h1 className="text-2xl font-black mb-3">{data.ranking[0].name}</h1>
            <div className="text-4xl font-bold mb-1">R${data.myWon.toLocaleString("pt-BR")}</div>
            <p className="text-xs opacity-70 mb-4">Após fee True Deal ({data.isWinner ? "1%" : "5%"})</p>

            <div className="pt-4 border-t border-white/20 text-xs space-y-1 opacity-80">
              <p className="font-semibold">{data.dealTitle} {data.dealId}</p>
              <p>{data.startDate} → {data.endDate}</p>
            </div>
          </div>
        </div>

        {/* ── Payout Banner ── */}
        {data.isWinner && (
          <div
            className="rounded-2xl p-4 mb-6 flex items-center gap-3"
            style={{
              background: "linear-gradient(135deg, rgba(22,163,74,0.12), rgba(34,197,94,0.08))",
              border: "1px solid rgba(22,163,74,0.25)",
            }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(22,163,74,0.2)" }}>
              <span className="text-xl">💸</span>
            </div>
            <div>
              <p className="text-xs font-bold text-[#16A34A] uppercase tracking-wide">Pagamento confirmado</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">
                R${data.myWon.toLocaleString("pt-BR")} enviado via PIX
              </p>
            </div>
          </div>
        )}

        {/* ── Minha Posição ── */}
        <div
          className="rounded-2xl p-4 mb-6"
          style={{
            background: "linear-gradient(135deg, rgba(22,163,74,0.08), rgba(34,197,94,0.05))",
            border: "1px solid rgba(22,163,74,0.18)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #16A34A, #22C55E)", boxShadow: "0 4px 14px rgba(22,163,74,0.4)" }}
            >
              {rankMedals[data.myRank - 1] ?? data.myRank}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Minha posição</p>
              <p className="text-sm font-bold text-gray-800">{data.myRank}º lugar</p>
            </div>
            <div className="text-right">
              <p className="text-base font-black text-[#16A34A]">R${data.myWon.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-gray-500">{data.ranking.find(r => r.isMe)?.metric}</p>
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { Icon: Clock,   value: `${Math.round((new Date(data.endDate.replace(" ", " 1 ")).getTime() - new Date(data.startDate.replace(" ", " 1 ")).getTime()) / 86400000) || 30}d`, label: "Duração" },
            { Icon: Wallet,  value: `R$${Math.round(data.totalPot / (data.ranking.length || 1))}`,   label: "Entrada"   },
            { Icon: Shield,  value: data.channel.split(" ")[0],                                       label: "Verificado" },
          ].map(stat => {
            const Icon = stat.Icon
            return (
              <div key={stat.label} className="p-4 rounded-2xl text-center"
                style={{
                  background: "rgba(255,255,255,0.5)",
                  backdropFilter: "blur(30px) saturate(200%)",
                  border: "1px solid rgba(255,255,255,0.6)",
                }}>
                <Icon className="w-5 h-5 mx-auto text-gray-600 mb-2" />
                <p className="text-base font-bold text-gray-800">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            )
          })}
        </div>

        {/* ── Distribuição do Pote ── */}
        <div
          className="rounded-2xl p-4 mb-6"
          style={{
            background: "rgba(255,255,255,0.5)",
            backdropFilter: "blur(30px) saturate(200%)",
            border: "1px solid rgba(255,255,255,0.6)",
          }}
        >
          <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">
            Distribuição do Pote (R${data.totalPot.toFixed(2)})
          </p>
          <div className="space-y-3">
            {data.payoutDistribution.map((dist, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-800">{dist.position}</span>
                  <span className="text-sm font-bold text-gray-800">
                    {dist.percentage.toFixed(1)}% · R${dist.amount.toFixed(2)}
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${dist.percentage}%`, background: dist.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Ranking Final ── */}
        <div
          className="rounded-2xl p-4 mb-6"
          style={{
            background: "rgba(255,255,255,0.5)",
            backdropFilter: "blur(30px) saturate(200%)",
            border: "1px solid rgba(255,255,255,0.6)",
          }}
        >
          <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">Ranking Final</p>
          <div className="space-y-2">
            {data.ranking.map(player => (
              <div
                key={player.initials}
                className="flex items-center gap-3 p-2.5 rounded-xl"
                style={
                  player.isMe
                    ? { background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.2)" }
                    : { background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.05)" }
                }
              >
                {/* Rank badge */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    background: player.rank === 1 ? "rgba(251,191,36,0.15)" : player.rank === 2 ? "rgba(156,163,175,0.15)" : "rgba(180,83,9,0.12)",
                    color: rankColors[Math.min(player.rank - 1, 2)],
                  }}
                >
                  {rankMedals[player.rank - 1] ?? player.rank}
                </div>

                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: player.color }}
                >
                  {player.initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${player.isMe ? "text-[#16A34A]" : "text-gray-800"}`}>
                    {player.name}
                    {player.isMe && (
                      <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(22,163,74,0.12)", color: "#16A34A" }}>Você</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">{player.metric}</p>
                </div>

                {/* Reward */}
                <p className={`text-xs font-bold flex-shrink-0 ${player.rank === 1 ? "text-[#16A34A]" : "text-gray-500"}`}>
                  {player.reward}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Smart contract link ── */}
        <button
          className="w-full p-4 rounded-2xl flex items-center justify-between mb-6 transition-all"
          style={{
            background: "rgba(255,255,255,0.5)",
            backdropFilter: "blur(30px) saturate(200%)",
            border: "1px solid rgba(255,255,255,0.6)",
          }}
        >
          <span className="text-gray-700 font-semibold text-sm">Smart contract executado</span>
          <span className="text-[#16A34A] flex items-center gap-1 text-sm font-medium">
            Ver on-chain <ExternalLink className="w-4 h-4" />
          </span>
        </button>

        {/* ── Share Preview Card ── */}
        <div
          className="rounded-2xl p-5 mb-4 relative overflow-hidden"
          style={{
            background: "linear-gradient(160deg, #0D2E1A 0%, #16A34A 55%, #22C55E 100%)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            color: "white",
          }}
        >
          <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full"
            style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="relative z-10 text-center">
            <p className="text-xs opacity-70 mb-1">Compartilhe sua vitória</p>
            <p className="text-base font-bold mb-2">{data.dealTitle}</p>
            <p className="text-3xl font-black mb-1">R${data.myWon.toLocaleString("pt-BR")}</p>
            <p className="text-xs opacity-70">{data.myRank}º lugar · {data.dealId}</p>
          </div>
        </div>

        {/* ── Share Buttons ── */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { id: "whatsapp",  label: "WhatsApp",   color: "#25D366", iconPath: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-5.031 1.378l-.361.214-3.741-.982.998 3.645-.235.374a9.86 9.86 0 001.51 5.748c.526.965 1.362 1.867 2.356 2.514 6.528 3.93 15.676-.931 15.676-8.772 0-1.324-.278-2.584-.795-3.785C19.028 4.172 16.809 2.979 14.157 2.979m7.915 13.39c-1.33.627-2.78.923-4.26.923-3.701 0-7.64-2.088-9.486-5.407-.586-1.008-.988-2.151-1.145-3.348.384.091.762.133 1.146.133 3.701 0 7.64 2.088 9.486 5.407.586 1.008.988 2.151 1.145 3.348-.384-.091-.762-.133-1.146-.133" },
            { id: "twitter",   label: "X",          color: "#000000", iconPath: "M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" },
            { id: "telegram",  label: "Telegram",   color: "#229ED9", iconPath: "M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295-.393 0-.32-.148-.451-.524l-1.004-3.311-2.99-.924c-.648-.204-.657-.648.14-.968l11.653-4.49c.54-.22 1.065.132.878.942z" },
            { id: "instagram", label: "Instagram",  color: "#E1306C", iconPath: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.266.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z" },
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => handleShare(btn.id)}
              className="flex items-center gap-2.5 p-3 rounded-xl transition-all active:scale-95"
              style={{
                background: "rgba(255,255,255,0.5)",
                backdropFilter: "blur(30px) saturate(200%)",
                border: "1px solid rgba(255,255,255,0.6)",
              }}
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill={btn.color}>
                <path d={btn.iconPath} />
              </svg>
              <span className="text-sm font-semibold text-gray-800">{btn.label}</span>
            </button>
          ))}
        </div>

        {/* Copy link */}
        <button
          onClick={handleCopyLink}
          className="w-full p-3.5 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2 mb-6"
          style={{
            background: copied ? "rgba(22,163,74,0.12)" : "rgba(255,255,255,0.5)",
            backdropFilter: "blur(30px) saturate(200%)",
            border: copied ? "1px dashed rgba(22,163,74,0.3)" : "1px dashed rgba(200,200,200,0.4)",
            color: copied ? "#16A34A" : "#374151",
          }}
        >
          {copied ? (
            <><Check className="w-4 h-4" /> Link copiado!</>
          ) : (
            <><Copy className="w-4 h-4" /> Copiar link</>
          )}
        </button>

        {/* ── Action Buttons ── */}
        <div className="space-y-3">
          <button
            onClick={() => router.push("/create")}
            className="w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 text-white transition-all active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
              boxShadow: "0 8px 32px rgba(22,163,74,0.4)",
            }}
          >
            <Plus className="w-5 h-5" />
            Criar novo Deal
          </button>

          <button
            onClick={() => router.push("/")}
            className="w-full py-4 rounded-2xl font-semibold transition-all"
            style={{
              background: "rgba(255,255,255,0.5)",
              backdropFilter: "blur(30px) saturate(200%)",
              border: "1px solid rgba(255,255,255,0.6)",
              color: "#374151",
            }}
          >
            Voltar para Home
          </button>
        </div>
      </div>
    </div>
  )
}
