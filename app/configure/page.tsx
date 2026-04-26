"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Check } from "lucide-react"

export default function ConfigureDealPage() {
  const router = useRouter()
  const [payMethod, setPayMethod] = useState<"pix" | "cripto">("pix")
  const [amount, setAmount] = useState<number>(50)
  const participants = 2

  const amountOptions = [25, 50, 100]

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
          <span className="font-medium">Tipo de Deal</span>
        </button>
      </header>

      {/* Steps Indicator */}
      <div className="flex items-center justify-center gap-2 py-4">
        <div
          className="w-8 h-2 rounded-full"
          style={{ background: "rgba(74, 74, 255, 0.3)" }}
        />
        <div
          className="w-8 h-2 rounded-full"
          style={{ background: "linear-gradient(135deg, #4A4AFF 0%, #7B7BFF 100%)" }}
        />
        <div
          className="w-8 h-2 rounded-full"
          style={{ background: "rgba(255, 255, 255, 0.4)" }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Configure o Deal</h1>

        {/* Deal Name */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-gray-600 mb-2 block">Nome do deal</label>
          <div
            className="p-4 rounded-xl"
            style={{
              background: "rgba(255, 255, 255, 0.5)",
              backdropFilter: "blur(20px)",
              border: "2px solid rgba(74, 74, 255, 0.3)",
            }}
          >
            <span className="text-gray-800">Quem ganha mais seguidores</span>
          </div>
        </div>

        {/* Participants */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-gray-600 mb-2 block">Participantes</label>
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1A2E3A 0%, #2A4E5A 100%)" }}
            >
              <span className="text-blue-300 font-semibold text-xs">LR</span>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #2E1A2E 0%, #4E2A4E 100%)" }}
            >
              <span className="text-purple-300 font-semibold text-xs">MC</span>
            </div>
            <button
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105"
              style={{
                background: "rgba(255, 255, 255, 0.4)",
                backdropFilter: "blur(20px)",
                border: "2px dashed rgba(74, 74, 255, 0.4)",
              }}
            >
              <Plus className="w-5 h-5 text-[#4A4AFF]" />
            </button>
          </div>
        </div>

        {/* Period */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-gray-600 mb-2 block">Período</label>
          <div className="flex gap-3">
            <div
              className="flex-1 p-4 rounded-xl"
              style={{
                background: "rgba(255, 255, 255, 0.4)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.5)",
              }}
            >
              <span className="text-xs text-gray-500 block mb-1">INÍCIO</span>
              <span className="text-gray-800 font-medium">01 Mai 2026</span>
            </div>
            <div
              className="flex-1 p-4 rounded-xl"
              style={{
                background: "rgba(255, 255, 255, 0.5)",
                backdropFilter: "blur(20px)",
                border: "2px solid rgba(74, 74, 255, 0.3)",
              }}
            >
              <span className="text-xs text-gray-500 block mb-1">FIM</span>
              <span className="text-gray-800 font-medium">31 Mai 2026</span>
            </div>
          </div>
        </div>

        {/* Amount per person */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-gray-600 mb-2 block">Valor por pessoa</label>
          <div className="flex gap-3">
            {amountOptions.map((val) => (
              <button
                key={val}
                onClick={() => setAmount(val)}
                className="flex-1 py-3 rounded-xl font-semibold transition-all duration-300"
                style={{
                  background: amount === val
                    ? "linear-gradient(135deg, #4A4AFF 0%, #7B7BFF 100%)"
                    : "rgba(255, 255, 255, 0.4)",
                  backdropFilter: "blur(20px)",
                  border: amount === val
                    ? "1px solid rgba(74, 74, 255, 0.5)"
                    : "1px solid rgba(255, 255, 255, 0.5)",
                  color: amount === val ? "white" : "#6B7280",
                }}
              >
                R${val}
              </button>
            ))}
            <button
              className="flex-1 py-3 rounded-xl font-semibold transition-all duration-300"
              style={{
                background: "rgba(255, 255, 255, 0.4)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.5)",
                color: "#6B7280",
              }}
            >
              Outro
            </button>
          </div>
        </div>

        {/* Verification Factor */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-gray-600 mb-2 block">Fator de verificação</label>
          
          {/* Selected Factor */}
          <div
            className="p-4 rounded-xl flex items-center gap-3 mb-3"
            style={{
              background: "rgba(74, 74, 255, 0.1)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(74, 74, 255, 0.3)",
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#1A1A2E" }}
            >
              <span className="text-white font-bold text-xs">&#120143;</span>
            </div>
            <div className="flex-1">
              <p className="text-gray-800 font-medium">Seguidores no X</p>
              <p className="text-xs text-gray-500">API oficial · verificação automática</p>
            </div>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #4A4AFF 0%, #7B7BFF 100%)" }}
            >
              <Check className="w-3 h-3 text-white" />
            </div>
          </div>

          {/* Additional Factor */}
          <div
            className="p-4 rounded-xl flex items-center gap-3 opacity-50"
            style={{
              background: "rgba(255, 255, 255, 0.3)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.4)",
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#1A1A2E" }}
            >
              <span className="text-white font-bold text-xs">IG</span>
            </div>
            <div className="flex-1">
              <p className="text-gray-600 font-medium">Seguidores no Instagram</p>
              <p className="text-xs text-gray-400">Meta API · requer vinculação</p>
            </div>
            <Plus className="w-5 h-5 text-[#4A4AFF]" />
          </div>
        </div>

        {/* Pot Total */}
        <div
          className="p-5 rounded-2xl text-center mb-6"
          style={{
            background: "linear-gradient(135deg, rgba(74, 74, 255, 0.15) 0%, rgba(123, 123, 255, 0.1) 100%)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(74, 74, 255, 0.3)",
          }}
        >
          <p className="text-xs text-gray-500 font-semibold mb-1">POT TOTAL</p>
          <p className="text-3xl font-bold text-[#4A4AFF]">R$ {amount * participants}</p>
          <p className="text-xs text-gray-500 mt-1">{participants} participantes × R${amount} · fee 3%</p>
        </div>

        {/* Payment Method */}
        <div className="mb-8">
          <label className="text-sm font-semibold text-gray-600 mb-2 block">Pagamento</label>
          <div
            className="flex p-1 rounded-xl"
            style={{
              background: "rgba(255, 255, 255, 0.4)",
              backdropFilter: "blur(20px)",
            }}
          >
            <button
              onClick={() => setPayMethod("pix")}
              className="flex-1 py-3 rounded-lg font-semibold transition-all duration-300"
              style={{
                background: payMethod === "pix"
                  ? "linear-gradient(135deg, #4A4AFF 0%, #7B7BFF 100%)"
                  : "transparent",
                color: payMethod === "pix" ? "white" : "#6B7280",
              }}
            >
              Pix
            </button>
            <button
              onClick={() => setPayMethod("cripto")}
              className="flex-1 py-3 rounded-lg font-semibold transition-all duration-300"
              style={{
                background: payMethod === "cripto"
                  ? "linear-gradient(135deg, #4A4AFF 0%, #7B7BFF 100%)"
                  : "transparent",
                color: payMethod === "cripto" ? "white" : "#6B7280",
              }}
            >
              Cripto
            </button>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={() => router.push("/tracking")}
          className="w-full py-4 rounded-2xl font-semibold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #4A4AFF 0%, #7B7BFF 100%)",
            boxShadow: "0 8px 32px rgba(74, 74, 255, 0.4)",
          }}
        >
          Revisar e confirmar &#8594;
        </button>
      </div>
    </div>
  )
}
