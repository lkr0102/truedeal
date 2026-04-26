"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Home, Compass, Wallet, User, Plus } from "lucide-react"

interface Deal {
  id: number
  title: string
  sub: string
  type: "oficial" | "privado"
  status: "Ativo" | "Pendente"
  progress: number
  days: string
  pot: string
  color: string
}

const deals: Deal[] = [
  { id: 1, title: "Quem ganha + seguidores", sub: "X (Twitter) · 3 participantes", type: "oficial", status: "Ativo", progress: 0.62, days: "18 de 30 dias", pot: "R$ 150", color: "#4A4AFF" },
  { id: 2, title: "Academia todo dia", sub: "Check-in · 5 participantes", type: "privado", status: "Ativo", progress: 0.35, days: "7 de 21 dias", pot: "R$ 500", color: "#3DBF6A" },
  { id: 3, title: "Corrida semanal", sub: "Apple Health · aguardando 1", type: "privado", status: "Pendente", progress: 0, days: "", pot: "R$ 200", color: "#C09040" },
]

const navItems = [
  { icon: Home, label: "Deals" },
  { icon: Compass, label: "Explorar" },
  { icon: Wallet, label: "Wallet" },
  { icon: User, label: "Perfil" },
]

export default function HomePage() {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState("Ativos")
  const [activeNav, setActiveNav] = useState("Deals")

  const filters = [
    { label: "Ativos", count: 2 },
    { label: "Pendentes", count: 1 },
    { label: "Histórico", count: null },
  ]

  return (
    <div
      className="min-h-screen flex flex-col pb-20"
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">True Deal</h1>
            <p className="text-gray-600 text-sm">Olá, Lukas</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification Button */}
            <button
              className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105"
              style={{
                background: "rgba(255, 255, 255, 0.4)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.5)",
              }}
            >
              <Bell className="w-5 h-5 text-gray-700" />
              <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #1A2E3A 0%, #2A4E5A 100%)",
              }}
            >
              <span className="text-blue-300 font-semibold text-sm">LR</span>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="px-5 py-3">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
          {filters.map((filter) => (
            <button
              key={filter.label}
              onClick={() => setActiveFilter(filter.label)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                activeFilter === filter.label ? "scale-105" : "hover:scale-102"
              }`}
              style={{
                background: activeFilter === filter.label
                  ? "linear-gradient(135deg, #4A4AFF 0%, #7B7BFF 100%)"
                  : "rgba(255, 255, 255, 0.4)",
                backdropFilter: "blur(20px)",
                border: activeFilter === filter.label
                  ? "1px solid rgba(74, 74, 255, 0.5)"
                  : "1px solid rgba(255, 255, 255, 0.5)",
                color: activeFilter === filter.label ? "white" : "#374151",
              }}
            >
              {filter.label} {filter.count !== null && filter.count}
            </button>
          ))}
        </div>
      </div>

      {/* Deals List */}
      <div className="flex-1 px-5 overflow-y-auto">
        <div className="space-y-4">
          {deals.map((deal) => (
            <button
              key={deal.id}
              onClick={() => router.push("/tracking")}
              className="w-full text-left rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "rgba(255, 255, 255, 0.35)",
                backdropFilter: "blur(30px) saturate(200%)",
                border: "1px solid rgba(255, 255, 255, 0.5)",
                borderLeft: `4px solid ${deal.color}`,
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
              }}
            >
              {/* Deal Type Badge */}
              <div className="flex items-center gap-2 mb-2">
                <span 
                  className="text-xs font-semibold"
                  style={{ color: deal.color }}
                >
                  ● {deal.type === "oficial" ? "Oficial" : "Privado"}
                </span>
              </div>

              {/* Deal Info */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="text-gray-800 font-semibold text-base">{deal.title}</h3>
                  <p className="text-gray-500 text-sm mt-0.5">{deal.sub}</p>
                </div>
                <div
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: deal.status === "Ativo" ? "rgba(61, 191, 106, 0.15)" : "rgba(192, 144, 64, 0.15)",
                    color: deal.status === "Ativo" ? "#3DBF6A" : "#C09040",
                  }}
                >
                  {deal.status}
                </div>
              </div>

              {/* Progress Bar */}
              {deal.progress > 0 && (
                <>
                  <div 
                    className="mt-4 h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: "rgba(255, 255, 255, 0.5)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${deal.progress * 100}%`,
                        backgroundColor: deal.color,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-gray-500 text-xs">{deal.days}</span>
                    <span className="text-gray-700 font-semibold text-xs">{deal.pot} pot</span>
                  </div>
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* FAB - New Deal */}
      <button
        onClick={() => router.push("/create")}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 z-20"
        style={{
          background: "linear-gradient(135deg, #4A4AFF 0%, #7B7BFF 100%)",
          boxShadow: "0 8px 32px rgba(74, 74, 255, 0.4), 0 16px 48px rgba(74, 74, 255, 0.2)",
        }}
      >
        <Plus className="w-5 h-5 text-white" />
        <span className="text-white font-semibold">Novo Deal</span>
      </button>

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 px-6 py-4 z-10"
        style={{
          background: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(40px) saturate(200%)",
          borderTop: "1px solid rgba(255, 255, 255, 0.5)",
        }}
      >
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeNav === item.label
            return (
              <button
                key={item.label}
                onClick={() => setActiveNav(item.label)}
                className="flex flex-col items-center gap-1 transition-all duration-300"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    isActive ? "scale-110" : ""
                  }`}
                  style={{
                    background: isActive
                      ? "linear-gradient(135deg, #4A4AFF 0%, #7B7BFF 100%)"
                      : "transparent",
                  }}
                >
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? "text-white" : "text-gray-500"
                    }`}
                  />
                </div>
                <span
                  className={`text-xs font-medium transition-colors ${
                    isActive ? "text-[#4A4AFF]" : "text-gray-500"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
