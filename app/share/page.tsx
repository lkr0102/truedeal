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

  const shareText = `🚀 Acabei de criar um Deal no True Deal!

💪 ${deal.name}
🎯 Participe e vamos nos motivar juntos!

🔗 ${deal.url}

#TrueDeal #Deal #Metas #Fitness`

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
          className="flex items-center gap-2 text-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Voltar</span>
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 px-5 pb-8">
        {/* Success message */}
        <div className="text-center py-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)", boxShadow: "0 8px 32px rgba(22,163,74,0.3)" }}>
            <Check className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Deal Criado! 🎉</h1>
          <p className="text-gray-600 text-sm">Compartilhe com seus amigos</p>
        </div>

        {/* Deal card */}
        <div className="mb-6 p-5 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.42)",
            backdropFilter: "blur(30px)",
            border: "1px solid rgba(255,255,255,0.55)",
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)" }}>
              <span className="text-white font-bold text-sm">TD</span>
            </div>
            <div>
              <p className="font-semibold text-gray-800">{deal.name}</p>
              <p className="text-xs text-gray-500">{deal.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl"
            style={{ background: "rgba(0,0,0,0.04)" }}>
            <span className="flex-1 text-xs text-gray-600 truncate">{deal.url}</span>
            <button
              onClick={handleCopyLink}
              className="p-2 rounded-lg transition-all"
              style={{ background: copied ? "rgba(22,163,74,0.15)" : "rgba(255,255,255,0.5)" }}
            >
              {copied
                ? <Check className="w-4 h-4 text-[#16A34A]" />
                : <Copy className="w-4 h-4 text-gray-600" />}
            </button>
          </div>
        </div>

        {/* Share options */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-600 mb-2">Compartilhar em</p>

          {/* X (Twitter) */}
          <button
            onClick={handleShareX}
            className="w-full flex items-center gap-3 p-4 rounded-xl transition-all hover:scale-[1.01]"
            style={{
              background: "rgba(255,255,255,0.45)",
              border: "1px solid rgba(255,255,255,0.55)",
            }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#000" }}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <span className="flex-1 text-left font-medium text-gray-800">Postar no X</span>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </button>

          {/* WhatsApp */}
          <button
            onClick={handleShareWhatsApp}
            className="w-full flex items-center gap-3 p-4 rounded-xl transition-all hover:scale-[1.01]"
            style={{
              background: "rgba(255,255,255,0.45)",
              border: "1px solid rgba(255,255,255,0.55)",
            }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#25D366" }}>
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-800">Enviar no WhatsApp</span>
            <Send className="w-4 h-4 text-gray-400" />
          </button>

          {/* Copy link */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3 p-4 rounded-xl transition-all hover:scale-[1.01]"
            style={{
              background: "rgba(255,255,255,0.45)",
              border: "1px solid rgba(255,255,255,0.55)",
            }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#4A4AFF" }}>
              <Copy className="w-5 h-5 text-white" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-800">
              {copied ? "Link copiado!" : "Copiar link do Deal"}
            </span>
            {copied
              ? <Check className="w-4 h-4 text-[#4A4AFF]" />
              : <Copy className="w-4 h-4 text-gray-400" />}
          </button>
        </div>

        {/* Suggested text */}
        <div className="mt-6 p-4 rounded-xl"
          style={{ background: "rgba(74,74,255,0.08)", border: "1px solid rgba(74,74,255,0.15)" }}>
          <p className="text-xs font-semibold text-gray-600 mb-2">Texto sugerido para post</p>
          <p className="text-xs text-gray-500 leading-relaxed">{shareText}</p>
        </div>
      </div>

      {/* Bottom CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4"
        style={{
          background: "linear-gradient(to top, rgba(255,255,255,0.92) 60%, transparent 100%)",
          backdropFilter: "blur(12px)",
        }}
      >
        <button
          onClick={() => router.push("/")}
          className="w-full py-4 rounded-2xl font-semibold text-white transition-all duration-300 active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg,#16A34A,#22C55E)",
            boxShadow: "0 8px 32px rgba(22,163,74,0.4)",
          }}
        >
          Ir para Home
        </button>
      </div>
    </div>
  )
}