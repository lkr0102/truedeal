"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Smartphone, Activity, MapPin, Target, TrendingUp, BarChart3 } from "lucide-react"

interface DealType {
  id: string
  icon: ReactNode
  name: string
  desc: string
  available: boolean
}

export default function CreateDealPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)

  const dealTypes: DealType[] = [
    { id: "social", icon: <Smartphone className="w-6 h-6" />, name: "Redes sociais", desc: "Seguidores, posts, views em qualquer plataforma", available: true },
    { id: "fitness", icon: <Activity className="w-6 h-6" />, name: "Atividade física", desc: "Passos, km, treinos via Apple Health / Fit", available: true },
    { id: "checkin", icon: <MapPin className="w-6 h-6" />, name: "Check-in", desc: "Presença diária verificada por localização", available: true },
    { id: "free", icon: <Target className="w-6 h-6" />, name: "Meta livre", desc: "Verificação manual com prova por foto", available: true },
    { id: "onchain", icon: <TrendingUp className="w-6 h-6" />, name: "On-chain", desc: "Volume, holders, TX via APIs Web3", available: false },
    { id: "data", icon: <BarChart3 className="w-6 h-6" />, name: "Dados públicos", desc: "GitHub commits, ranking, etc", available: false },
  ]

  const availableTypes = dealTypes.filter(t => t.available)
  const comingSoonTypes = dealTypes.filter(t => !t.available)

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
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Voltar</span>
        </button>
      </header>

      {/* Steps Indicator */}
      <div className="flex items-center justify-center gap-2 py-4">
        <div
          className="w-8 h-2 rounded-full"
          style={{ background: "linear-gradient(135deg, #4A4AFF 0%, #7B7BFF 100%)" }}
        />
        <div
          className="w-8 h-2 rounded-full"
          style={{ background: "rgba(255, 255, 255, 0.4)" }}
        />
        <div
          className="w-8 h-2 rounded-full"
          style={{ background: "rgba(255, 255, 255, 0.4)" }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Que tipo de Deal?</h1>
          <p className="text-gray-600 mt-2">Escolha a métrica que será verificada</p>
        </div>

        {/* Available Types Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {availableTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelected(type.id)}
              className={`p-4 rounded-2xl text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                selected === type.id ? "ring-2 ring-[#4A4AFF] ring-offset-2" : ""
              }`}
              style={{
                background: selected === type.id
                  ? "rgba(74, 74, 255, 0.15)"
                  : "rgba(255, 255, 255, 0.4)",
                backdropFilter: "blur(20px) saturate(200%)",
                border: selected === type.id
                  ? "1px solid rgba(74, 74, 255, 0.4)"
                  : "1px solid rgba(255, 255, 255, 0.5)",
                boxShadow: selected === type.id
                  ? "0 8px 32px rgba(74, 74, 255, 0.2)"
                  : "0 8px 32px rgba(0, 0, 0, 0.05)",
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                style={{
                  background: selected === type.id
                    ? "linear-gradient(135deg, #4A4AFF 0%, #7B7BFF 100%)"
                    : "rgba(255, 255, 255, 0.6)",
                  color: selected === type.id ? "white" : "#374151",
                }}
              >
                {type.icon}
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">{type.name}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{type.desc}</p>
            </button>
          ))}
        </div>

        {/* Coming Soon Section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 mb-4">Em breve</h2>
          <div className="grid grid-cols-2 gap-4">
            {comingSoonTypes.map((type) => (
              <div
                key={type.id}
                className="p-4 rounded-2xl opacity-40"
                style={{
                  background: "rgba(255, 255, 255, 0.3)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                  style={{
                    background: "rgba(255, 255, 255, 0.5)",
                    color: "#9CA3AF",
                  }}
                >
                  {type.icon}
                </div>
                <h3 className="font-semibold text-gray-600 mb-1">{type.name}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{type.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={() => selected && router.push("/configure")}
          disabled={!selected}
          className={`w-full py-4 rounded-2xl font-semibold text-white transition-all duration-300 ${
            selected ? "hover:scale-[1.02] active:scale-[0.98]" : "opacity-40 cursor-not-allowed"
          }`}
          style={{
            background: selected
              ? "linear-gradient(135deg, #4A4AFF 0%, #7B7BFF 100%)"
              : "linear-gradient(135deg, #4A4AFF 0%, #7B7BFF 100%)",
            boxShadow: selected
              ? "0 8px 32px rgba(74, 74, 255, 0.4)"
              : "none",
          }}
        >
          Continuar &#8594;
        </button>
      </div>
    </div>
  )
}
