"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Copy, ShieldCheck, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function PixGateway({ amount, onComplete }: { amount: number, onComplete: () => void }) {
  const [step, setStep] = useState<"generating" | "qr" | "success">("generating")

  useEffect(() => {
    const timer = setTimeout(() => setStep("qr"), 2000)
    return () => clearTimeout(timer)
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText("00020126580014BR.GOV.BCB.PIX013689f074d2-7c85-4b1e-982c-fa3c767acef4520400005303986540510.005802BR5925SYMBEON LABS6009SAO PAULO62070503***6304E1D4")
    toast.success("Código PIX copiado!")
    
    // Simulate auto-detection of payment
    setTimeout(() => setStep("success"), 3000)
  }

  if (step === "generating") {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="w-10 h-10 text-[#00D26A] animate-spin" />
        <p className="text-gray-400 animate-pulse">Iniciando Protocolo NoxPay...</p>
      </div>
    )
  }

  if (step === "success") {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-6 text-center">
        <div className="w-20 h-20 bg-[#00D26A]/20 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-[#00D26A]" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Garantia Liquidada</h3>
          <p className="text-gray-400 mt-2">Sua garantia de R$ {amount.toFixed(2)} foi processada com sucesso via NoxPay.</p>
        </div>
        <button 
          onClick={onComplete}
          className="w-full py-4 bg-[#00D26A] text-black font-bold rounded-2xl hover:scale-[1.02] transition-transform"
        >
          Ver Protocolo
        </button>
      </div>
    )
  }

  return (
    <div className="bg-[#0A0F0D] border border-white/10 rounded-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#00D26A]" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">NoxPay Institutional</span>
        </div>
        <span className="text-lg font-bold text-white">R$ {amount.toFixed(2)}</span>
      </div>

      <div className="aspect-square bg-white rounded-2xl p-4 flex items-center justify-center">
        {/* Placeholder for QR Code */}
        <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
           <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=truedeal-noxpay-institutional-onramp" alt="QR Code PIX" />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs text-center text-gray-500">Escaneie o QR Code ou copie o código abaixo</p>
        <button 
          onClick={handleCopy}
          className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
        >
          <Copy className="w-4 h-4" />
          <span className="text-sm font-medium">Copiar Código PIX</span>
        </button>
      </div>

      <div className="pt-4 border-t border-white/5">
        <div className="flex items-center justify-center gap-2 text-[10px] text-gray-600">
          <span className="px-2 py-0.5 border border-gray-800 rounded">SSL SECURE</span>
          <span className="px-2 py-0.5 border border-gray-800 rounded">SYMBEON VERIFIED</span>
        </div>
      </div>
    </div>
  )
}
