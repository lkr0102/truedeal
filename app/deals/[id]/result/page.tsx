"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Copy, Share2, Trophy, Users, Sparkles, ArrowRight, CheckCircle2, Link2 } from "lucide-react"

const participants = [
  { name: "Bruno", action: "Post", reward: "R$150" },
  { name: "Julia", action: "Comment", reward: "R$90" },
  { name: "Pedro", action: "Repost", reward: "R$60" },
]

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array(18)].map((_, index) => (
        <span
          key={index}
          className={`confetti confetti-${index}`}
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 1}s`,
            backgroundColor: ["#22C55E", "#4ADE80", "#86EFAC", "#A7F3D0"][index % 4],
          }}
        />
      ))}
    </div>
  )
}

export default function DealResultPage() {
  const router = useRouter()
  const params = useParams()
  const [copied, setCopied] = useState(false)
  const [shareStatus, setShareStatus] = useState("")

  const dealId = params?.id ?? "0001"
  const dealLink = `${typeof window !== "undefined" ? window.location.origin : "https://true-deal.app"}/deals/${dealId}/result`

  useEffect(() => {
    if (copied) {
      const timer = window.setTimeout(() => setCopied(false), 2000)
      return () => window.clearTimeout(timer)
    }
  }, [copied])

  const totalRevenue = useMemo(() => participants.reduce((sum, participant) => sum + Number(participant.reward.replace("R$", "")), 0), [])

  const resultSummary = [
    { label: "Deal", value: `#${dealId}` },
    { label: "Participantes", value: `${participants.length}` },
    { label: "Pot total", value: `R$${totalRevenue}` },
    { label: "Status", value: "Pago" },
  ]

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(dealLink)
      setCopied(true)
    } catch {
      setShareStatus("Erro ao copiar")
    }
  }

  async function handleShare() {
    if (!navigator.share) {
      setShareStatus("Compartilhamento não disponível")
      return
    }

    try {
      await navigator.share({
        title: `Deal ${dealId} concluído`,
        text: "Confira o resultado do deal e compartilhe com sua comunidade.",
        url: dealLink,
      })
      setShareStatus("Compartilhado com sucesso")
    } catch {
      setShareStatus("Compartilhamento cancelado")
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(42,108,40,0.36),_transparent_32%),linear-gradient(180deg,_#0A1F12_0%,_#08160F_50%,_#050C08_100%)] text-white">
      <Confetti />
      <div className="absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle,_rgba(34,197,94,0.18),_transparent_35%)]" />
      <div className="relative px-5 pt-16 pb-20">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => router.push("/")} className="mb-8 inline-flex items-center gap-2 text-sm text-slate-200 opacity-90 hover:opacity-100">
            <ArrowRight className="w-4 h-4 rotate-180" /> Voltar para Deals
          </button>

          <div className="rounded-[40px] border border-white/10 bg-white/5 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
              <div className="space-y-6">
                <div className="rounded-3xl border border-white/10 bg-[#0F1E13]/80 p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-3xl bg-[#22C55E]/10 p-3 text-[#22C55E]"><Sparkles className="w-5 h-5" /></div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/80">Deal Concluído</p>
                      <h1 className="mt-2 text-3xl font-bold text-white"># {dealId} — Meta alcançada</h1>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-slate-300">O pagamento já foi consolidado e o ganhador recebe o valor do Deal.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {resultSummary.map((item) => (
                    <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                      <p className="mt-3 text-xl font-semibold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">Compartilhar com a equipe</p>
                      <p className="mt-1 text-sm text-slate-300">Monte o link público para divulgar o resultado.</p>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-emerald-200">Público</span>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div className="rounded-3xl border border-white/10 bg-[#0D160F]/90 p-4 text-sm text-slate-200">
                      <p className="truncate">{dealLink}</p>
                    </div>
                    <button
                      onClick={handleCopyLink}
                      className="inline-flex items-center justify-center gap-2 rounded-3xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400"
                    >
                      <Copy className="w-4 h-4" /> {copied ? "Copiado" : "Copiar link"}
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleShare}
                      className="inline-flex items-center gap-2 rounded-3xl bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
                    >
                      <Share2 className="w-4 h-4" /> Compartilhar
                    </button>
                    <button
                      onClick={() => router.push("/deals/create")}
                      className="inline-flex items-center gap-2 rounded-3xl border border-white/10 bg-transparent px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
                    >
                      <Link2 className="w-4 h-4" /> Novo Deal
                    </button>
                    {shareStatus && <span className="text-sm text-emerald-200">{shareStatus}</span>}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-[32px] border border-white/10 bg-[#0F1E13]/80 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Top 3</p>
                      <p className="mt-1 text-xl font-semibold text-white">Ranking de Pagamento</p>
                    </div>
                    <div className="rounded-3xl bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-emerald-200">Final</div>
                  </div>

                  <div className="mt-6 space-y-3">
                    {participants.map((participant, index) => (
                      <div key={participant.name} className="flex items-center justify-between rounded-3xl border border-white/5 bg-white/5 p-4">
                        <div>
                          <p className="text-sm text-slate-300">#{index + 1} • {participant.action}</p>
                          <p className="mt-1 text-lg font-semibold text-white">{participant.name}</p>
                        </div>
                        <p className="text-lg font-bold text-emerald-300">{participant.reward}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 text-slate-200">
                  <p className="text-sm uppercase tracking-[0.2em] text-emerald-200">Destaque de payout</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xl font-semibold text-white">{participants[0].name}</p>
                      <p className="mt-1 text-sm text-slate-300">Recebeu mais engajamento e levou o maior prêmio.</p>
                    </div>
                    <div className="rounded-3xl bg-emerald-500/10 px-4 py-3 text-emerald-200">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="rounded-[32px] border border-white/10 bg-[#0D160F]/80 p-6">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Próximo passo</p>
                  <h2 className="mt-3 text-2xl font-bold text-white">Compartilhe o resultado e marque o vencedor</h2>
                  <p className="mt-3 text-sm text-slate-300">Coloque o link no grupo da campanha e registre o próximo Deal em seguida.</p>
                  <button
                    onClick={() => router.push("/deals/create")}
                    className="mt-6 inline-flex items-center gap-2 rounded-3xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400"
                  >
                    Criar novo Deal
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
