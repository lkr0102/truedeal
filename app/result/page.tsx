"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, Share2, ExternalLink, Trophy, Clock, Wallet, Shield } from "lucide-react"

export default function ResultPage() {
  const router = useRouter()

  const players = [
    {
      initials: "LR",
      name: "Lukas R.",
      gain: "+910 seguidores",
      reward: "+R$97",
      isWinner: true,
      color: "#4AABFF",
      bgColor: "#1A2E3A",
    },
    {
      initials: "MC",
      name: "Maria C.",
      gain: "+540 seguidores",
      reward: "—",
      isWinner: false,
      color: "#BF4ADF",
      bgColor: "#2E1A2E",
    },
  ]

  const stats = [
    { icon: Clock, value: "30d", label: "Duração" },
    { icon: Wallet, value: "R$100", label: "Pot total" },
    { icon: Shield, value: "X API", label: "Verificado" },
  ]

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
      {/* Header */}
      <header className="px-5 pt-12 pb-4">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Meus Deals</span>
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 px-5 pb-8">
        {/* Winner Section */}
        <div className="text-center py-8">
          <div className="text-6xl mb-4">
            <Trophy className="w-16 h-16 mx-auto text-yellow-500" />
          </div>
          <p className="text-sm font-semibold text-gray-500 mb-2">Vencedor do Deal</p>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Lukas Rocha</h1>
          <p className="text-4xl font-bold text-[#3DBF6A]">+ R$ 99,00</p>
          <p className="text-sm text-gray-500 mt-2">Após fee True Deal (1%)</p>
        </div>

        {/* Final Scoreboard */}
        <div
          className="p-5 rounded-2xl mb-6"
          style={{
            background: "rgba(61, 191, 106, 0.1)",
            backdropFilter: "blur(30px) saturate(200%)",
            border: "1px solid rgba(61, 191, 106, 0.3)",
            boxShadow: "0 8px 32px rgba(61, 191, 106, 0.1)",
          }}
        >
          <div className="space-y-4">
            {players.map((player) => (
              <div
                key={player.initials}
                className="flex items-center gap-3"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${player.bgColor} 0%, ${player.bgColor}99 100%)` }}
                >
                  <span style={{ color: player.color }} className="font-semibold text-xs">
                    {player.initials}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-gray-800 font-semibold">{player.name}</p>
                  <p className="text-xs text-gray-500">{player.gain}</p>
                </div>
                <span
                  className={`font-semibold ${player.isWinner ? "text-[#3DBF6A]" : "text-gray-400"}`}
                >
                  {player.isWinner && "🥇 "}{player.reward}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="p-4 rounded-xl text-center"
                style={{
                  background: "rgba(255, 255, 255, 0.4)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.5)",
                }}
              >
                <Icon className="w-5 h-5 mx-auto text-gray-500 mb-2" />
                <p className="text-lg font-bold text-gray-800">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            )
          })}
        </div>

        {/* On-chain Link */}
        <button
          className="w-full p-4 rounded-xl flex items-center justify-between mb-6 transition-all duration-300 hover:scale-[1.01]"
          style={{
            background: "rgba(255, 255, 255, 0.4)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.5)",
          }}
        >
          <span className="text-gray-700">Smart contract executado</span>
          <span className="text-[#16A34A] flex items-center gap-1">
            Ver on-chain <ExternalLink className="w-4 h-4" />
          </span>
        </button>

        {/* Actions */}
        <div className="space-y-3">
          <button
            className="w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
              boxShadow: "0 8px 32px rgba(22, 163, 74, 0.4)",
            }}
          >
            <Share2 className="w-5 h-5" />
            Compartilhar vitória
          </button>

          <button
            onClick={() => router.push("/create")}
            className="w-full py-4 rounded-2xl font-semibold transition-all duration-300 hover:scale-[1.01]"
            style={{
              background: "rgba(255, 255, 255, 0.4)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.5)",
              color: "#374151",
            }}
          >
            Criar novo Deal
          </button>

          <button
            onClick={() => router.push("/")}
            className="w-full py-4 rounded-2xl font-semibold transition-all duration-300"
            style={{
              background: "transparent",
              color: "#6B7280",
            }}
          >
            Voltar para Home
          </button>
        </div>
      </div>
    </div>
  )
}
