"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Star, X, Check } from "lucide-react"
import { createDeal } from "@/lib/actions/deals"
import type { DealCategory, DealType } from "@/lib/supabase/types"

// ── Constants ───────────────────────────────────────────────────────────────────

const AMOUNT_PRESETS = [25, 50, 100, 200, 500]

const DISTRIBUTION_TYPES = [
  { id: "proportional", label: "Proporcional", desc: "Baseado no desempenho de cada um" },
  { id: "top3",         label: "Ranking",       desc: "Top 3: 60% · 30% · 10%"         },
  { id: "winner",       label: "1º Lugar",      desc: "100% para quem chegar na frente" },
]

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, "0")} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

// ── Component ───────────────────────────────────────────────────────────────────

export default function ConfigureDealPage() {
  const router = useRouter()

  // Draft from step 1
  const [dealName,   setDealName]   = useState("")
  const [dealMode,   setDealMode]   = useState<"regular" | "super">("regular")
  const [privacy,    setPrivacy]    = useState("private")
  const [category,   setCategory]   = useState<DealCategory>("free")
  const [channel,    setChannel]    = useState("")
  const [rule,       setRule]       = useState("")
  const [quantity,   setQuantity]   = useState(1)
  const [frequency,  setFrequency]  = useState("")
  const [startIso,   setStartIso]   = useState("")
  const [endIso,     setEndIso]     = useState("")

  // Step 2 state
  const [amount,       setAmount]       = useState(50)
  const [customAmtStr, setCustomAmtStr] = useState("")
  const [isCustomAmt,  setIsCustomAmt]  = useState(false)
  const [distribution, setDistribution] = useState("winner")

  // Submit
  const [showReview,   setShowReview]   = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError,  setSubmitError]  = useState<string | null>(null)

  useEffect(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem("dealDraft") ?? "{}")
      if (draft.dealName)  setDealName(draft.dealName)
      if (draft.dealMode)  setDealMode(draft.dealMode)
      if (draft.privacy)   setPrivacy(draft.privacy)
      if (draft.category)  setCategory(draft.category as DealCategory)
      if (draft.channel)   setChannel(draft.channel)
      if (draft.rule)      setRule(draft.rule)
      if (draft.quantity)  setQuantity(draft.quantity)
      if (draft.frequency) setFrequency(draft.frequency)
      if (draft.startDate) setStartIso(draft.startDate)
      if (draft.endDate)   setEndIso(draft.endDate)
    } catch { /* ignore */ }
  }, [])

  const effectiveAmount = isCustomAmt ? (parseFloat(customAmtStr) || 0) : amount
  const feeRate = dealMode === "super" ? 1 : 5
  const isValid = effectiveAmount >= 10

  async function handleConfirm() {
    if (!isValid || isSubmitting) return
    setIsSubmitting(true)
    setSubmitError(null)

    const privacyMap: Record<string, DealType> = { private: "privado", public: "publico" }

    const result = await createDeal({
      title:                 dealName || "Deal sem nome",
      type:                  privacyMap[privacy] ?? "privado",
      mode:                  dealMode,
      category,
      verification_type:     rule,
      verification_channels: [channel],
      entry_amount:          effectiveAmount,
      distribution:          distribution as "winner" | "top3" | "proportional",
      payment_method:        "pix",
      max_participants:      999999,
      allow_requests:        true,
      start_date:            startIso ? new Date(startIso).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      end_date:              endIso   ? new Date(endIso).toISOString().split("T")[0]   : new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    })

    setIsSubmitting(false)

    if (result.error) {
      setSubmitError(result.error)
      return
    }

    sessionStorage.removeItem("dealDraft")
    setShowReview(false)
    router.push("/")
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: "url('/images/gradient-background.jpg')",
        backgroundSize: "cover", backgroundPosition: "center",
        backgroundRepeat: "no-repeat", backgroundAttachment: "fixed",
      }}
    >
      {/* Header */}
      <header className="px-5 pt-12 pb-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Configuração</span>
        </button>
        {dealMode === "super" ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(255,170,0,0.12)", border: "1px solid rgba(255,170,0,0.3)" }}>
            <Star className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-xs font-bold text-yellow-600">Super Deal · 1%</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.25)" }}>
            <span className="text-xs font-bold text-[#16A34A]">Regular · 5%</span>
          </div>
        )}
      </header>

      {/* Steps */}
      <div className="flex items-center justify-center gap-2 pb-4">
        <div className="w-8 h-2 rounded-full" style={{ background: "rgba(22,163,74,0.3)" }} />
        <div className="w-8 h-2 rounded-full" style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)" }} />
      </div>

      {/* Form */}
      <div className="flex-1 px-5 pb-36 overflow-y-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Valor & Premiação</h1>
        <p className="text-sm text-gray-500 mb-6">Passo 2 de 2 — Finalize o deal</p>

        {/* Deal summary card */}
        {dealName && (
          <div
            className="mb-6 p-4 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.65)" }}
          >
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Deal</p>
            <p className="text-base font-bold text-gray-800">{dealName}</p>
            {startIso && endIso && (
              <p className="text-xs text-gray-500 mt-1">
                {fmtDate(startIso)} → {fmtDate(endIso)}
              </p>
            )}
            {channel && rule && (
              <p className="text-xs text-gray-500 mt-0.5">
                {quantity}× {rule.replace(/_/g, " ")} por {frequency} · {channel}
              </p>
            )}
          </div>
        )}

        {/* ── 5. Valor de entrada ─────────────────────────────────────────── */}
        <Section label="Valor de entrada">
          <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
            {AMOUNT_PRESETS.map(v => (
              <button
                key={v}
                onClick={() => { setAmount(v); setIsCustomAmt(false) }}
                className="flex-shrink-0 px-3.5 py-2 rounded-full text-sm font-semibold transition-all"
                style={pill(!isCustomAmt && amount === v)}
              >
                R${v}
              </button>
            ))}
            <button
              onClick={() => setIsCustomAmt(true)}
              className="flex-shrink-0 px-3.5 py-2 rounded-full text-sm font-semibold transition-all"
              style={pill(isCustomAmt)}
            >
              Outro
            </button>
          </div>

          {isCustomAmt && (
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-semibold text-sm">R$</span>
              <input
                type="number"
                value={customAmtStr}
                onChange={e => setCustomAmtStr(e.target.value)}
                placeholder="0,00"
                className="w-full pl-10 pr-4 py-3 rounded-xl outline-none text-gray-800 placeholder-gray-400 text-sm"
                style={{
                  background: "rgba(255,255,255,0.6)",
                  backdropFilter: "blur(20px)",
                  border: parseFloat(customAmtStr) >= 10
                    ? "2px solid rgba(22,163,74,0.35)"
                    : "2px solid rgba(255,80,80,0.3)",
                }}
              />
              {customAmtStr && parseFloat(customAmtStr) < 10 && (
                <p className="text-xs text-red-400 mt-1 ml-1">Valor mínimo: R$10</p>
              )}
            </div>
          )}

          {/* Fee note */}
          <div
            className="mt-3 p-3 rounded-xl flex items-start gap-2"
            style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)" }}
          >
            <Check className="w-3.5 h-3.5 text-[#16A34A] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-600">
              Taxa de <strong className="text-[#16A34A]">{feeRate}%</strong> só é cobrada se houver perdedor.
              Se todos cumprirem o desafio, o valor integral é devolvido.
            </p>
          </div>
        </Section>

        {/* ── 6. Premiação ────────────────────────────────────────────────── */}
        <Section label="Premiação">
          <div className="space-y-2">
            {DISTRIBUTION_TYPES.map(d => (
              <button
                key={d.id}
                onClick={() => setDistribution(d.id)}
                className="w-full flex items-center justify-between p-4 rounded-2xl transition-all"
                style={{
                  background: distribution === d.id ? "rgba(22,163,74,0.08)" : "rgba(255,255,255,0.45)",
                  border:     distribution === d.id ? "1.5px solid rgba(22,163,74,0.3)" : "1px solid rgba(255,255,255,0.6)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: distribution === d.id ? "#16A34A" : "#D1D5DB" }}
                  >
                    {distribution === d.id && <div className="w-2 h-2 rounded-full bg-[#16A34A]" />}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-800">{d.label}</p>
                    <p className="text-xs text-gray-500">{d.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Section>

        {/* Entry preview */}
        {isValid && (
          <div
            className="p-5 rounded-2xl text-center"
            style={{
              background: dealMode === "super"
                ? "linear-gradient(135deg,rgba(255,170,0,0.1),rgba(255,107,0,0.07))"
                : "linear-gradient(135deg,rgba(22,163,74,0.1),rgba(123,123,255,0.07))",
              border: dealMode === "super"
                ? "1px solid rgba(255,170,0,0.3)"
                : "1px solid rgba(22,163,74,0.25)",
            }}
          >
            <p className="text-[10px] font-bold text-gray-500 tracking-widest mb-1">SEU DEPÓSITO</p>
            <p className="text-3xl font-bold" style={{ color: dealMode === "super" ? "#FFAA00" : "#16A34A" }}>
              R$ {effectiveAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              O pote cresce com cada participante que entrar
            </p>
          </div>
        )}
      </div>

      {/* ── CTA fixo ────────────────────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4"
        style={{
          background: "linear-gradient(to top, rgba(255,255,255,0.96) 65%, transparent 100%)",
          backdropFilter: "blur(12px)",
        }}
      >
        <button
          onClick={() => isValid && setShowReview(true)}
          disabled={!isValid}
          className={`w-full py-4 rounded-2xl font-bold text-white text-sm transition-all duration-300 tracking-wide ${isValid ? "active:scale-[0.98]" : "opacity-40 cursor-not-allowed"}`}
          style={{
            background: dealMode === "super"
              ? "linear-gradient(135deg,#FFAA00,#FF6B00)"
              : "linear-gradient(135deg,#16A34A,#22C55E)",
            boxShadow: isValid
              ? dealMode === "super" ? "0 8px 32px rgba(255,170,0,0.4)" : "0 8px 32px rgba(22,163,74,0.4)"
              : "none",
            letterSpacing: "0.04em",
          }}
        >
          PAGAR ENTRADA E INICIAR O DEAL
        </button>
        {!isValid && (
          <p className="text-center text-xs text-gray-400 mt-2">Valor mínimo por pessoa: R$10</p>
        )}
      </div>

      {/* ── Modal de revisão ────────────────────────────────────────────────── */}
      {showReview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowReview(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl p-6"
            style={{ background: "rgba(255,255,255,0.98)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">Revisar Deal</h2>
              <button
                onClick={() => setShowReview(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.06)" }}
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              {[
                ["Nome",        dealName],
                ["Modalidade",  dealMode === "super" ? "⭐ Super Deal" : "Regular"],
                ["Visibilidade",privacy === "private" ? "🔒 Privado" : "🌐 Público"],
                ["Canal",       channel],
                ["Regra",       `${quantity}× ${rule?.replace(/_/g, " ")} por ${frequency}`],
                ["Período",     startIso && endIso ? `${fmtDate(startIso)} → ${fmtDate(endIso)}` : "—"],
                ["Entrada",     `R$ ${effectiveAmount.toFixed(2)}`],
                ["Premiação",   DISTRIBUTION_TYPES.find(d => d.id === distribution)?.label ?? ""],
                ["Taxa",        `${feeRate}% (só se houver perdedor)`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-start gap-4">
                  <span className="text-sm text-gray-500 flex-shrink-0">{k}</span>
                  <span className="text-sm font-semibold text-gray-800 text-right">{v}</span>
                </div>
              ))}
            </div>

            {submitError && (
              <p className="text-xs text-red-500 text-center mb-3 px-1">{submitError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowReview(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm"
                style={{ background: "rgba(0,0,0,0.06)", color: "#374151" }}
              >
                Ajustar
              </button>
              <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-60"
                style={{
                  background: dealMode === "super"
                    ? "linear-gradient(135deg,#FFAA00,#FF6B00)"
                    : "linear-gradient(135deg,#16A34A,#22C55E)",
                }}
              >
                {isSubmitting ? "Criando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <label className="text-sm font-semibold text-gray-600 block mb-2">{label}</label>
      {children}
    </div>
  )
}

function pill(active: boolean): React.CSSProperties {
  return {
    background: active ? "rgba(22,163,74,0.12)" : "rgba(255,255,255,0.45)",
    color:      active ? "#16A34A"               : "#6B7280",
    border:     active ? "1.5px solid rgba(22,163,74,0.35)" : "1px solid rgba(255,255,255,0.55)",
  }
}
