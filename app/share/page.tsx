"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, X, Copy, Check, MessageCircle, Send, ExternalLink } from "lucide-react"

export default function ShareDealPage() {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  // Mock deal data (would come from router state in production)
  const deal = {
    name: "Meta Mensal de Passos",
    code: "TD-2026-0427-LR",
    url: "https://truedeal.app/deal/TD-2026-0427-LR",
  }

  const shareText = `Don't trust. Make a True Deal. 🤝

Estabeleci um novo Acordo de Performance via @truedeal_app. 
Minha palavra agora vale dinheiro, literalmente.

💪 ${deal.name}
🎯 Metas auditáveis · Solana settled.

Acompanhe minha execução:
🔗 ${deal.url}

#TrueDeal #Solana #PerformanceAgreement #ProofOfHonor`

  function handleCopyLink() {
    navigator.clipboard.writeText(deal.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleShareX() {
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
    window.open(xUrl, "_blank")
  }

  function handleShareWhatsApp() {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`
    window.open(waUrl, "_blank")
  }

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
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-bold text-xs uppercase tracking-widest">Painel</span>
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 px-5 pb-8">
        {/* Success message */}
        <div className="text-center py-8">
          <div className="w-20 h-20 mx-auto mb-5 rounded-3xl flex items-center justify-center relative"
            style={{ background: "#00D26A", boxShadow: "0 12px 40px rgba(0,210,106,0.3)" }}>
            <Check className="w-10 h-10 text-[#0A0F0D]" />
            <div className="absolute inset-0 bg-white opacity-20 blur-xl scale-75" />
          </div>
          <h1 className="text-3xl font-black text-gray-800 mb-2 tracking-tighter leading-none">PALAVRA DADA.</h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Acordo estabelecido com sucesso.</p>
        </div>

        {/* Deal card */}
        <div className="mb-8 p-6 rounded-3xl"
          style={{
            background: "rgba(255,255,255,0.42)",
            backdropFilter: "blur(40px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.6)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.04)",
          }}
        >
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#0A0F0D,#1A2E3A)" }}>
              <span className="text-[#00D26A] font-black text-sm">TD</span>
            </div>
            <div>
              <p className="font-black text-gray-800 text-lg leading-tight tracking-tight">{deal.name}</p>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">{deal.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-4 rounded-2xl"
            style={{ background: "rgba(0,0,0,0.04)" }}>
            <span className="flex-1 text-xs text-gray-500 font-mono truncate tracking-tight">{deal.url}</span>
            <button
              onClick={handleCopyLink}
              className="p-2.5 rounded-xl transition-all"
              style={{ background: copied ? "rgba(0,210,106,0.15)" : "rgba(255,255,255,0.8)" }}
            >
              {copied
                ? <Check className="w-4 h-4 text-[#00D26A]" />
                : <Copy className="w-4 h-4 text-gray-600" />}
            </button>
          </div>
        </div>

        {/* Share options */}
        <div className="space-y-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-3">Convoque os Parceiros</p>

          {/* X (Twitter) */}
          <button
            onClick={handleShareX}
            className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: "rgba(255,255,255,0.45)",
              border: "1px solid rgba(255,255,255,0.55)",
            }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "#0A0F0D" }}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#00D26A">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <span className="flex-1 text-left font-black text-gray-800 text-sm tracking-tight">Postar no X</span>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </button>

          {/* WhatsApp */}
          <button
            onClick={handleShareWhatsApp}
            className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: "rgba(255,255,255,0.45)",
              border: "1px solid rgba(255,255,255,0.55)",
            }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "#25D366" }}>
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="flex-1 text-left font-black text-gray-800 text-sm tracking-tight">Enviar no WhatsApp</span>
            <Send className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Suggested text */}
        <div className="mt-8 p-5 rounded-2xl relative overflow-hidden"
          style={{ background: "rgba(0,210,106,0.04)", border: "1px solid rgba(0,210,106,0.1)" }}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-[#00D26A] opacity-5 blur-2xl" />
          <p className="text-[9px] font-black text-[#00D26A] uppercase tracking-[0.2em] mb-3">Copy Sugerido</p>
          <p className="text-[11px] text-gray-500 leading-relaxed font-medium">{shareText}</p>
        </div>
      </div>

      {/* Bottom CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-6"
        style={{
          background: "linear-gradient(to top, rgba(255,255,255,0.95) 70%, transparent 100%)",
          backdropFilter: "blur(20px)",
        }}
      >
        <button
          onClick={() => router.push("/")}
          className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 active:scale-[0.98]"
          style={{
            background: "#00D26A",
            color: "#0A0F0D",
            boxShadow: "0 8px 24px rgba(0,210,106,0.3)",
          }}
        >
          Voltar ao Início
        </button>
      </div>
    </div>
  )
}