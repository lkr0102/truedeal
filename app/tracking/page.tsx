"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Share2 } from "lucide-react"

export default function TrackingPage() {
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState({
    days: 12,
    hours: 6,
    minutes: 34,
    seconds: 21,
  })

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { days, hours, minutes, seconds } = prev
        seconds--
        if (seconds < 0) {
          seconds = 59
          minutes--
        }
        if (minutes < 0) {
          minutes = 59
          hours--
        }
        if (hours < 0) {
          hours = 23
          days--
        }
        if (days < 0) {
          clearInterval(timer)
          return { days: 0, hours: 0, minutes: 0, seconds: 0 }
        }
        return { days, hours, minutes, seconds }
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const players = [
    {
      initials: "LR",
      name: "Lukas R.",
      score: "12.840 → 13.210 seguidores (+370)",
      rank: "Liderando",
      isLeader: true,
      color: "#4AABFF",
      bgColor: "#1A2E3A",
    },
    {
      initials: "MC",
      name: "Maria C.",
      score: "8.400 → 8.610 seguidores (+210)",
      rank: "2º lugar",
      isLeader: false,
      color: "#BF4ADF",
      bgColor: "#2E1A2E",
    },
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
        {/* Deal Info */}
        <div className="text-center py-4">
          <h1 className="text-2xl font-bold text-gray-800">Quem ganha + seguidores</h1>
          <p className="text-gray-600 mt-1">X (Twitter) · 2 participantes · R$100 pot</p>
        </div>

        {/* Countdown */}
        <div
          className="p-6 rounded-2xl text-center mb-6"
          style={{
            background: "rgba(255, 255, 255, 0.4)",
            backdropFilter: "blur(30px) saturate(200%)",
            border: "1px solid rgba(255, 255, 255, 0.5)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          }}
        >
          <p className="text-xs text-gray-500 font-semibold mb-3">TEMPO RESTANTE</p>
          <div className="flex justify-center gap-2">
            {[
              { value: timeLeft.days, label: "dias" },
              { value: timeLeft.hours, label: "horas" },
              { value: timeLeft.minutes, label: "min" },
              { value: timeLeft.seconds, label: "seg" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(22, 163, 74, 0.15) 0%, rgba(123, 123, 255, 0.1) 100%)",
                    border: "1px solid rgba(22, 163, 74, 0.2)",
                  }}
                >
                  <span className="text-2xl font-bold text-[#16A34A]">
                    {String(item.value).padStart(2, "0")}
                  </span>
                </div>
                {i < 3 && <span className="text-xl text-gray-400">:</span>}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">dias · horas · min · seg</p>
        </div>

        {/* Scoreboard */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 mb-4">Placar</h2>
          <div className="space-y-3">
            {players.map((player) => (
              <div
                key={player.initials}
                className="p-4 rounded-2xl flex items-center gap-3"
                style={{
                  background: player.isLeader
                    ? "rgba(61, 191, 106, 0.1)"
                    : "rgba(255, 255, 255, 0.4)",
                  backdropFilter: "blur(20px) saturate(200%)",
                  border: player.isLeader
                    ? "1px solid rgba(61, 191, 106, 0.3)"
                    : "1px solid rgba(255, 255, 255, 0.5)",
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${player.bgColor} 0%, ${player.bgColor}99 100%)` }}
                >
                  <span style={{ color: player.color }} className="font-semibold text-sm">
                    {player.initials}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-gray-800 font-semibold">{player.name}</p>
                  <p className="text-xs text-gray-500">{player.score}</p>
                </div>
                <div
                  className="px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{
                    background: player.isLeader ? "rgba(61, 191, 106, 0.15)" : "rgba(192, 144, 64, 0.15)",
                    color: player.isLeader ? "#3DBF6A" : "#C09040",
                  }}
                >
                  {player.isLeader && "🥇 "}{player.rank}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Verification */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 mb-4">Verificação</h2>
          <div className="space-y-3">
            <button
              className="w-full p-4 rounded-xl flex items-center justify-between transition-all duration-300 hover:scale-[1.01]"
              style={{
                background: "rgba(255, 255, 255, 0.4)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.5)",
              }}
            >
              <span className="text-gray-700">Ver snapshot inicial (dia 1)</span>
              <span className="text-[#16A34A]">&#8594;</span>
            </button>
            <button
              className="w-full p-4 rounded-xl flex items-center justify-between transition-all duration-300 hover:scale-[1.01]"
              style={{
                background: "rgba(255, 255, 255, 0.4)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.5)",
              }}
            >
              <span className="text-gray-700">Última atualização: hoje 09:00</span>
              <span className="text-[#16A34A]">&#8594;</span>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            className="w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.01]"
            style={{
              background: "rgba(255, 255, 255, 0.4)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.5)",
              color: "#6B7280",
            }}
          >
            <Share2 className="w-4 h-4" />
            Compartilhar placar
          </button>

          <button
            onClick={() => router.push("/result")}
            className="w-full py-4 rounded-2xl font-semibold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #1A4A1A 0%, #2A6A2A 100%)",
              boxShadow: "0 8px 32px rgba(61, 191, 106, 0.3)",
            }}
          >
            Ver resultado final &#8594;
          </button>
        </div>
      </div>
    </div>
  )
}
