"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Star, Search, X, Plus, Minus, Check,
  ChevronLeft, ChevronRight,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────────

interface Participant {
  id: string
  name: string
  handle: string
  initials: string
  color: string
}

interface SocialFactor {
  id: string
  label: string
  type: "toggle" | "number" | "handle"
  placeholder?: string
}

// ── Static data ────────────────────────────────────────────────────────────────

const MOCK_USERS: Participant[] = [
  { id: "u1", name: "Maria C.",     handle: "@mariaca",   initials: "MC", color: "#BF4ADF" },
  { id: "u2", name: "Pedro J.",     handle: "@pedro.js",  initials: "PJ", color: "#4AABFF" },
  { id: "u3", name: "Ana Lima",     handle: "@ana_fit",   initials: "AL", color: "#3DBF6A" },
  { id: "u4", name: "Guilherme T.", handle: "@tech_gui",  initials: "GT", color: "#FF6B6B" },
]

const PERIOD_PRESETS = [
  { id: "1w", label: "1 sem" },
  { id: "2w", label: "2 sem" },
  { id: "1m", label: "1 mês" },
  { id: "2m", label: "2 meses" },
  { id: "custom", label: "Personalizado" },
]

const AMOUNT_PRESETS = [25, 50, 100, 200, 500]

const VERIF_METHODS = [
  { id: "x",            label: "X",            isSocial: true  },
  { id: "instagram",    label: "Instagram",    isSocial: true  },
  { id: "tiktok",       label: "TikTok",       isSocial: true  },
  { id: "strava",       label: "Strava",       isSocial: false },
  { id: "apple_health", label: "Apple Health", isSocial: false },
  { id: "google_fit",   label: "Google Fit",   isSocial: false },
  { id: "manual",       label: "Manual",       isSocial: false },
]

const SOCIAL_FACTORS: SocialFactor[] = [
  { id: "post_daily",       label: "Postar diariamente",          type: "toggle"              },
  { id: "impressions_min",  label: "Impressões mínimas/dia",    type: "number", placeholder: "Ex: 1.000" },
  { id: "comment_recv",    label: "Receber comentários",         type: "toggle"              },
  { id: "engagement_min",  label: "Engajamento mínimo/post",    type: "number", placeholder: "Ex: 5"     },
]

const DISTRIBUTION_TYPES = [
  { id: "winner",       label: "Winner takes all", desc: "100% para o 1º lugar" },
  { id: "top3",         label: "Top 3",            desc: "60% · 30% · 10%"      },
  { id: "proportional", label: "Proporcional",     desc: "Baseado no desempenho" },
]

const PAYMENT_METHODS = ["Pix", "Cripto", "Cartão"]

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]

// ── Date helpers ───────────────────────────────────────────────────────────────

const TODAY = new Date(2026, 3, 27) // 27 Apr 2026 (months are 0-indexed)

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function addMonths(d: Date, n: number): Date {
  const r = new Date(d); r.setMonth(r.getMonth() + n); return r
}
function fmtDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}
function sameDay(a: Date, b: Date): boolean {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}
function isPast(d: Date): boolean {
  const t = new Date(TODAY); t.setHours(0,0,0,0)
  const x = new Date(d);     x.setHours(0,0,0,0)
  return x < t
}

// ── Calendar helper ────────────────────────────────────────────────────────────

function calendarCells(year: number, month: number): (Date | null)[] {
  const total = new Date(year, month + 1, 0).getDate()
  const start = new Date(year, month, 1).getDay()
  const cells: (Date | null)[] = Array(start).fill(null)
  for (let d = 1; d <= total; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ConfigureDealPage() {
  const router = useRouter()

  // From previous step
  const [dealMode, setDealMode] = useState<"regular" | "super">("regular")
  useEffect(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem("dealDraft") ?? "{}")
      if (draft.dealMode) setDealMode(draft.dealMode)
    } catch { /* ignore */ }
  }, [])

  // Deal name
  const [name, setName] = useState("")

  // Participants
  const [query, setQuery] = useState("")
  const [participants, setParticipants] = useState<Participant[]>([
    { id: "me", name: "Lukas R.", handle: "@lukasrocha", initials: "LR", color: "#4AABFF" },
  ])
  const [maxPart, setMaxPart] = useState(2)
  const [allowRequests, setAllowRequests] = useState(false)

  const searchResults =
    query.length >= 2
      ? MOCK_USERS.filter(
          u => !participants.some(p => p.id === u.id) &&
               (u.name.toLowerCase().includes(query.toLowerCase()) ||
                u.handle.toLowerCase().includes(query.toLowerCase())),
        )
      : []

  function addParticipant(u: Participant) {
    if (participants.length >= maxPart) return
    setParticipants(p => [...p, u])
    setQuery("")
  }
  function removeParticipant(id: string) {
    if (id === "me") return
    setParticipants(p => p.filter(x => x.id !== id))
  }

  // Period
  const [periodPreset, setPeriodPreset] = useState("1m")
  const [customEnd,    setCustomEnd]    = useState<Date | null>(null)
  const [showCal,      setShowCal]      = useState(false)
  const [calMonth,     setCalMonth]     = useState(new Date(2026, 3, 1))

  function endDate(): Date | null {
    switch (periodPreset) {
      case "1w": return addDays(TODAY, 7)
      case "2w": return addDays(TODAY, 14)
      case "1m": return addMonths(TODAY, 1)
      case "2m": return addMonths(TODAY, 2)
      case "custom": return customEnd
      default: return null
    }
  }
  const end = endDate()

  function pickPreset(id: string) {
    setPeriodPreset(id)
    if (id === "custom") setShowCal(true)
  }

  function pickCalDay(d: Date) {
    if (isPast(d)) return
    setCustomEnd(d)
    setPeriodPreset("custom")
    setShowCal(false)
  }

  // Amount
  const [amount,       setAmount]       = useState(50)
  const [customAmtStr, setCustomAmtStr] = useState("")
  const [isCustomAmt,  setIsCustomAmt]  = useState(false)

  const effectiveAmount = isCustomAmt ? (parseFloat(customAmtStr) || 0) : amount

  // Verification
  const [verifMethods,       setVerifMethods]       = useState<string[]>([])
  const [socialFactors,      setSocialFactors]       = useState<Record<string, boolean>>({})
  const [socialFactorValues, setSocialFactorValues]  = useState<Record<string, string>>({})

  const hasSocial = verifMethods.some(id => VERIF_METHODS.find(m => m.id === id)?.isSocial)

  function toggleVerif(id: string) {
    setVerifMethods(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }
  function toggleSocialFactor(id: string) {
    setSocialFactors(p => ({ ...p, [id]: !p[id] }))
  }

  // Distribution & payment
  const [distribution, setDistribution] = useState("winner")
  const [payMethod,    setPayMethod]    = useState("Pix")

  // Review balloon
  const [showReview, setShowReview] = useState(false)

  // Pot calculation
  const pot    = effectiveAmount * participants.length
  const fee    = dealMode === "super" ? 0 : pot * 0.01
  const netPot = pot - fee

  // Validation
  const isValid = name.trim().length >= 3 && effectiveAmount >= 10

  // ── Render ───────────────────────────────────────────────────────────────────

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
      <header className="px-5 pt-12 pb-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Tipo de Deal</span>
        </button>
        {dealMode === "super" && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(255,170,0,0.12)", border: "1px solid rgba(255,170,0,0.3)" }}
          >
            <Star className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-xs font-bold text-yellow-600">Super Deal · 0%</span>
          </div>
        )}
      </header>

      {/* Steps */}
      <div className="flex items-center justify-center gap-2 pb-4">
        <div className="w-8 h-2 rounded-full" style={{ background: "rgba(22,163,74,0.3)" }} />
        <div className="w-8 h-2 rounded-full" style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)" }} />
        <div className="w-8 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.4)" }} />
      </div>

      {/* Scrollable form */}
      <div className="flex-1 px-5 pb-36 overflow-y-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Configure o Deal</h1>

        {/* ── Nome ──────────────────────────────────────────────────────────── */}
        <Section label="Nome do deal">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Quem ganha mais seguidores em maio"
            className="w-full p-4 rounded-xl outline-none text-gray-800 placeholder-gray-400 text-sm"
            style={{
              background:    "rgba(255,255,255,0.6)",
              backdropFilter:"blur(20px)",
              border: name.length === 0 ? "1px solid rgba(255,255,255,0.6)"
                    : name.length < 3   ? "2px solid rgba(255,80,80,0.35)"
                    : "2px solid rgba(22,163,74,0.35)",
            }}
          />
          {name.length > 0 && name.length < 3 && (
            <p className="text-xs text-red-400 mt-1 ml-1">Mínimo 3 caracteres</p>
          )}
        </Section>

        {/* ── Participantes ─────────────────────────────────────────────────── */}
        <Section label="Participantes" hint={`${participants.length}/${maxPart}`}>
          {/* Chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {participants.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.6)" }}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: p.color + "22" }}
                >
                  <span className="text-[9px] font-bold" style={{ color: p.color }}>{p.initials}</span>
                </div>
                <span className="text-xs font-medium text-gray-700">{p.name}</span>
                {p.id !== "me" && (
                  <button onClick={() => removeParticipant(p.id)}>
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Search */}
          {participants.length < maxPart && (
            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por nome ou @usuario"
                className="w-full pl-10 pr-4 py-3 rounded-xl outline-none text-gray-800 placeholder-gray-400 text-sm"
                style={{
                  background:    "rgba(255,255,255,0.5)",
                  backdropFilter:"blur(20px)",
                  border:        "1px solid rgba(255,255,255,0.5)",
                }}
              />
              {searchResults.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-10"
                  style={{ background: "rgba(255,255,255,0.97)", boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}
                >
                  {searchResults.map(u => (
                    <button
                      key={u.id}
                      onClick={() => addParticipant(u)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: u.color + "22" }}
                      >
                        <span className="text-xs font-bold" style={{ color: u.color }}>{u.initials}</span>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-800">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.handle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Máximo + solicitações */}
          <div className="flex gap-3">
            {/* Max participants */}
            <div
              className="flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.55)" }}
            >
              <span className="text-xs font-medium text-gray-600">Máximo</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMaxPart(m => Math.max(2, m - 1))}
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.06)" }}
                >
                  <Minus className="w-3 h-3 text-gray-600" />
                </button>
                <span className="text-sm font-bold text-gray-800 w-5 text-center">{maxPart}</span>
                <button
                  onClick={() => setMaxPart(m => Math.min(20, m + 1))}
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.06)" }}
                >
                  <Plus className="w-3 h-3 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Allow requests toggle */}
            <button
              onClick={() => setAllowRequests(r => !r)}
              className="flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl transition-all"
              style={{
                background: allowRequests ? "rgba(22,163,74,0.08)" : "rgba(255,255,255,0.45)",
                border:     allowRequests ? "1px solid rgba(22,163,74,0.3)" : "1px solid rgba(255,255,255,0.55)",
              }}
            >
              <span className="text-xs font-medium" style={{ color: allowRequests ? "#16A34A" : "#6B7280" }}>
                Permitir solicitações
              </span>
              <Toggle on={allowRequests} />
            </button>
          </div>
        </Section>

        {/* ── Período ───────────────────────────────────────────────────────── */}
        <Section label="Período">
          <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
            {PERIOD_PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => pickPreset(p.id)}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all"
                style={pill(periodPreset === p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <div
              className="flex-1 p-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.55)" }}
            >
              <p className="text-[10px] font-semibold text-gray-400 mb-0.5">INÍCIO</p>
              <p className="text-sm font-semibold text-gray-800">{fmtDate(TODAY)}</p>
            </div>
            <button
              onClick={() => setShowCal(true)}
              className="flex-1 p-3 rounded-xl transition-all text-left"
              style={{
                background: end ? "rgba(22,163,74,0.08)" : "rgba(255,255,255,0.45)",
                border:     end ? "1.5px solid rgba(22,163,74,0.3)" : "1px solid rgba(255,255,255,0.55)",
              }}
            >
              <p className="text-[10px] font-semibold text-gray-400 mb-0.5">FIM</p>
              <p className="text-sm font-semibold" style={{ color: end ? "#16A34A" : "#D1D5DB" }}>
                {end ? fmtDate(end) : "Selecionar"}
              </p>
            </button>
          </div>
        </Section>

        {/* ── Valor por pessoa ──────────────────────────────────────────────── */}
        <Section label="Valor por pessoa">
          <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
            {AMOUNT_PRESETS.map(v => (
              <button
                key={v}
                onClick={() => { setAmount(v); setIsCustomAmt(false) }}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all"
                style={pill(!isCustomAmt && amount === v)}
              >
                R${v}
              </button>
            ))}
            <button
              onClick={() => setIsCustomAmt(true)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all"
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
                  background:    "rgba(255,255,255,0.55)",
                  backdropFilter:"blur(20px)",
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
        </Section>

        {/* ── Canais de Verificação ──────────────────────────────────────────── */}
        <Section label="Canais de Verificação">
          <p className="text-xs text-gray-500 mb-3">Selecione onde o deal será verificado</p>
          <div className="flex flex-wrap gap-2">
            {VERIF_METHODS.map(m => (
              <button
                key={m.id}
                onClick={() => toggleVerif(m.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                style={pill(verifMethods.includes(m.id))}
              >
                {verifMethods.includes(m.id) && <Check className="w-3 h-3" />}
                {m.label}
              </button>
            ))}
          </div>
        </Section>

        {/* ── Fatores de Sucesso ──────────────────────────────────────────────── */}
        {hasSocial && (
          <Section label="Fatores de Sucesso">
            <p className="text-xs text-gray-500 mb-3">Defina as métricas para validar o deal</p>
            <div className="space-y-2">
              {SOCIAL_FACTORS.map(f => (
                <div
                  key={f.id}
                  className="p-3 rounded-xl transition-all"
                  style={{
                    background: socialFactors[f.id] ? "rgba(22,163,74,0.06)" : "rgba(255,255,255,0.38)",
                    border:     socialFactors[f.id] ? "1px solid rgba(22,163,74,0.2)" : "1px solid rgba(255,255,255,0.5)",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-gray-700 flex-1">{f.label}</p>
                    <button onClick={() => toggleSocialFactor(f.id)}>
                      <Toggle on={!!socialFactors[f.id]} />
                    </button>
                  </div>
                  {socialFactors[f.id] && (f.type === "number" || f.type === "handle") && (
                    <input
                      type={f.type === "number" ? "number" : "text"}
                      value={socialFactorValues[f.id] ?? ""}
                      onChange={e => setSocialFactorValues(p => ({ ...p, [f.id]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="mt-2 w-full px-3 py-2 rounded-lg text-xs outline-none text-gray-800 placeholder-gray-400"
                      style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(22,163,74,0.2)" }}
                    />
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Distribuição ──────────────────────────────────────────────────── */}
        <Section label="Distribuição do prêmio">
          <div className="space-y-2">
            {DISTRIBUTION_TYPES.map(d => (
              <button
                key={d.id}
                onClick={() => setDistribution(d.id)}
                className="w-full flex items-center justify-between p-3 rounded-xl transition-all"
                style={{
                  background: distribution === d.id ? "rgba(22,163,74,0.08)" : "rgba(255,255,255,0.45)",
                  border:     distribution === d.id ? "1.5px solid rgba(22,163,74,0.3)" : "1px solid rgba(255,255,255,0.55)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: distribution === d.id ? "#16A34A" : "#D1D5DB" }}
                  >
                    {distribution === d.id && <div className="w-2 h-2 rounded-full bg-[#16A34A]" />}
                  </div>
                  <span className="text-sm font-semibold text-gray-800">{d.label}</span>
                </div>
                <span className="text-xs text-gray-500">{d.desc}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* ── Pagamento ─────────────────────────────────────────────────────── */}
        <Section label="Pagamento">
          <div
            className="flex p-1 rounded-xl"
            style={{ background: "rgba(255,255,255,0.45)" }}
          >
            {PAYMENT_METHODS.map(m => (
              <button
                key={m}
                onClick={() => setPayMethod(m)}
                className="flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all"
                style={{
                  background: payMethod === m ? "linear-gradient(135deg,#16A34A,#22C55E)" : "transparent",
                  color:      payMethod === m ? "white" : "#6B7280",
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </Section>

        {/* ── Pot total ─────────────────────────────────────────────────────── */}
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
          <p className="text-[10px] font-bold text-gray-500 tracking-wider mb-1">POTE TOTAL</p>
          <p
            className="text-3xl font-bold"
            style={{ color: dealMode === "super" ? "#FFAA00" : "#16A34A" }}
          >
            R$ {netPot.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {participants.length} participante{participants.length !== 1 ? "s" : ""} × R${effectiveAmount.toFixed(0)}
            {dealMode === "super" ? " · 0% taxa (Super Deal)" : " · 1% taxa"}
          </p>
        </div>
      </div>

      {/* Fixed bottom CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4"
        style={{
          background:    "linear-gradient(to top, rgba(255,255,255,0.96) 65%, transparent 100%)",
          backdropFilter:"blur(12px)",
        }}
      >
        <button
          onClick={() => isValid && setShowReview(true)}
          disabled={!isValid}
          className={`w-full py-4 rounded-2xl font-semibold text-white transition-all duration-300 ${isValid ? "active:scale-[0.98]" : "opacity-40 cursor-not-allowed"}`}
          style={{
            background: dealMode === "super"
              ? "linear-gradient(135deg,#FFAA00,#FF6B00)"
              : "linear-gradient(135deg,#16A34A,#22C55E)",
            boxShadow: isValid
              ? dealMode === "super" ? "0 8px 32px rgba(255,170,0,0.4)" : "0 8px 32px rgba(22,163,74,0.4)"
              : "none",
          }}
        >
          Revisar e criar →
        </button>
        {!isValid && (
          <p className="text-center text-xs text-gray-400 mt-2">
            {name.trim().length < 3
              ? "Defina um nome com pelo menos 3 caracteres"
              : "Valor mínimo por pessoa: R$10"}
          </p>
        )}
      </div>

      {/* ── Review Balloon ──────────────────────────────────────────────────── */}
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Revisar Deal</h2>
              <button
                onClick={() => setShowReview(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.06)" }}
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Deal Summary */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Nome do Deal</span>
                <span className="text-sm font-semibold text-gray-800">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Período</span>
                <span className="text-sm font-semibold text-gray-800">
                  {end ? `${fmtDate(TODAY)} - ${fmtDate(end)}` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Participantes</span>
                <span className="text-sm font-semibold text-gray-800">{participants.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Valor por pessoa</span>
                <span className="text-sm font-semibold text-gray-800">R${effectiveAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Pot total</span>
                <span className="text-sm font-semibold text-gray-800">R${pot.toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Taxa</span>
                <span className="text-sm font-semibold text-gray-800">
                  {dealMode === "super" ? "0%" : "1%"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Verificação</span>
                <span className="text-sm font-semibold text-gray-800">
                  {verifMethods.length > 0 ? verifMethods.map(id => VERIF_METHODS.find(m => m.id === id)?.label).join(", ") : "Nenhuma"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Distribuição</span>
                <span className="text-sm font-semibold text-gray-800">
                  {DISTRIBUTION_TYPES.find(d => d.id === distribution)?.label}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowReview(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-200"
                style={{ background: "rgba(0,0,0,0.06)", color: "#374151" }}
              >
                Ajustar
              </button>
              <button
                onClick={() => { setShowReview(false); router.push("/share") }}
                className="flex-1 py-3 rounded-xl font-semibold text-white text-sm transition-all duration-200"
                style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)" }}
              >
                Confirmar Deal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Calendar bottom sheet ─────────────────────────────────────────── */}
      {showCal && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowCal(false)}
        >
          <div
            className="w-full rounded-t-3xl px-5 pt-5 pb-8"
            style={{ background: "rgba(255,255,255,0.98)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.05)" }}
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <p className="font-bold text-gray-800">
                {MONTH_NAMES[calMonth.getMonth()]} {calMonth.getFullYear()}
              </p>
              <button
                onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.05)" }}
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 mb-2">
              {["D","S","T","Q","Q","S","S"].map((d, i) => (
                <div key={i} className="text-center text-[11px] font-semibold text-gray-400">{d}</div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-y-1.5">
              {calendarCells(calMonth.getFullYear(), calMonth.getMonth()).map((date, i) => {
                if (!date) return <div key={i} />
                const past     = isPast(date)
                const isToday  = sameDay(date, TODAY)
                const isSel    = customEnd ? sameDay(date, customEnd) : false
                return (
                  <button
                    key={i}
                    onClick={() => pickCalDay(date)}
                    disabled={past}
                    className="flex items-center justify-center h-9 w-9 mx-auto rounded-full text-sm transition-all"
                    style={{
                      background: isSel ? "#16A34A" : isToday ? "rgba(22,163,74,0.1)" : "transparent",
                      color:      isSel ? "white" : past ? "#D1D5DB" : isToday ? "#16A34A" : "#374151",
                      fontWeight: isSel || isToday ? "700" : "400",
                      cursor:     past ? "not-allowed" : "pointer",
                    }}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setShowCal(false)}
              className="w-full mt-5 py-3 rounded-2xl font-semibold text-[#16A34A] text-sm"
              style={{ background: "rgba(22,163,74,0.07)", border: "1px solid rgba(22,163,74,0.15)" }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-gray-600">{label}</label>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div
      className="w-9 h-5 rounded-full relative transition-all flex-shrink-0"
      style={{ background: on ? "#16A34A" : "rgba(0,0,0,0.15)" }}
    >
      <div
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200"
        style={{ left: on ? "calc(100% - 18px)" : "2px" }}
      />
    </div>
  )
}

function pill(active: boolean): React.CSSProperties {
  return {
    background: active ? "rgba(22,163,74,0.12)" : "rgba(255,255,255,0.45)",
    color:      active ? "#16A34A"              : "#6B7280",
    border:     active ? "1.5px solid rgba(22,163,74,0.35)" : "1px solid rgba(255,255,255,0.55)",
  }
}
