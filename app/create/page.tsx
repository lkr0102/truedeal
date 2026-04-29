"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Star, Lock, Globe, X, Info,
  ChevronLeft, ChevronRight, Plus, Minus,
} from "lucide-react"
import { createDeal } from "@/lib/actions/deals"
import type { DealCategory, DealType } from "@/lib/supabase/types"

// ── Data ────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "social",   label: "Social",   available: true  },
  { id: "fitness",  label: "Fitness",  available: true  },
  { id: "gaming",   label: "Gaming",   available: false },
  { id: "learning", label: "Learning", available: false },
  { id: "onchain",  label: "On-Chain", available: false },
  { id: "free",     label: "Free",     available: false },
]

const CHANNELS: Record<string, { id: string; label: string; available: boolean }[]> = {
  social: [
    { id: "x",         label: "X",        available: true  },
    { id: "instagram", label: "Instagram", available: false },
    { id: "tiktok",    label: "TikTok",    available: false },
    { id: "linkedin",  label: "LinkedIn",  available: false },
    { id: "discord",   label: "Discord",   available: false },
    { id: "youtube",   label: "YouTube",   available: false },
  ],
  fitness: [
    { id: "strava",    label: "Strava",    available: true },
    { id: "wellhub",   label: "Wellhub",   available: true },
    { id: "totalpass", label: "TotalPass", available: true },
  ],
}

const RULES: Record<string, { id: string; label: string }[]> = {
  x: [
    { id: "post",             label: "Post"                },
    { id: "comment_received", label: "Comentário recebido" },
    { id: "repost_received",  label: "Repost recebido"     },
    { id: "follower_gained",  label: "Seguidor recebido"   },
    { id: "impressions",      label: "Impressões"          },
  ],
  strava:    [
    { id: "km_run",        label: "Kms percorridos" },
    { id: "pace",          label: "Pace"            },
    { id: "workout_hours", label: "Horas de treino" },
  ],
  wellhub:   [
    { id: "checkin",          label: "Check-ins"            },
    { id: "different_venues", label: "Diferentes ambientes" },
  ],
  totalpass: [
    { id: "checkin",          label: "Check-ins"            },
    { id: "different_venues", label: "Diferentes ambientes" },
  ],
}

const FREQUENCIES = [
  { id: "daily",   label: "Dia"    },
  { id: "weekly",  label: "Semana" },
  { id: "monthly", label: "Mês"    },
  { id: "yearly",  label: "Ano"    },
]

const AMOUNT_PRESETS = [25, 50, 100, 200, 500]

const DISTRIBUTION_TYPES = [
  { id: "proportional", label: "Proporcional", desc: "Pote dividido entre todos que cumprirem a regra."       },
  { id: "top3",         label: "Ranking",       desc: "1º (60%) · 2º (30%) · 3º (10%) do pote final."         },
  { id: "winner",       label: "1º Lugar",      desc: "O líder do desafio leva tudo."                         },
]

const PERIOD_PRESETS = [
  { id: "1w", label: "1 sem",   days: 7  },
  { id: "2w", label: "2 sem",   days: 14 },
  { id: "1m", label: "1 mês",   days: 30 },
  { id: "2m", label: "2 meses", days: 60 },
]

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
const TODAY = new Date(2026, 3, 27)

// ── Helpers ─────────────────────────────────────────────────────────────────────

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function fmtShort(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")} ${MONTH_NAMES[d.getMonth()]}`
}
function fmtFull(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}
function isPast(d: Date): boolean {
  const t = new Date(TODAY); t.setHours(0, 0, 0, 0)
  const x = new Date(d);     x.setHours(0, 0, 0, 0)
  return x < t
}
function sameDay(a: Date, b: Date): boolean {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}
function calendarCells(year: number, month: number): (Date | null)[] {
  const total = new Date(year, month + 1, 0).getDate()
  const start = new Date(year, month, 1).getDay()
  const cells: (Date | null)[] = Array(start).fill(null)
  for (let d = 1; d <= total; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

// ── Page ─────────────────────────────────────────────────────────────────────────

export default function CreateDealPage() {
  const router = useRouter()

  const [name,     setName]     = useState("")
  const [dealMode, setDealMode] = useState<"regular" | "super">("regular")
  const [privacy,  setPrivacy]  = useState<"private" | "public">("private")

  const [category,  setCategory]  = useState<string | null>(null)
  const [channel,   setChannel]   = useState<string | null>(null)
  const [rule,      setRule]      = useState<string | null>(null)
  const [quantity,  setQuantity]  = useState(1)
  const [qtyStr,    setQtyStr]    = useState("1")
  const [frequency, setFrequency] = useState<string | null>(null)

  const [periodPreset, setPeriodPreset] = useState("1m")
  const [startDate,    setStartDate]    = useState<Date>(TODAY)
  const [endDate,      setEndDate]      = useState<Date>(addDays(TODAY, 30))
  const [showCal,      setShowCal]      = useState<"start" | "end" | null>(null)
  const [calMonth,     setCalMonth]     = useState(new Date(2026, 3, 1))

  const [amount,       setAmount]       = useState(50)
  const [isCustomAmt,  setIsCustomAmt]  = useState(false)
  const [customAmtStr, setCustomAmtStr] = useState("")
  const [distribution, setDistribution] = useState("winner")

  const [showSuperInfo, setShowSuperInfo] = useState(false)
  const [showInfo,      setShowInfo]      = useState(false)
  const [showReview,    setShowReview]    = useState(false)
  const [isSubmitting,  setIsSubmitting]  = useState(false)
  const [submitError,   setSubmitError]   = useState<string | null>(null)

  // ── Derived ──

  const channels        = category ? (CHANNELS[category] ?? []) : []
  const rules           = channel  ? (RULES[channel]    ?? []) : []
  const effectiveAmount = isCustomAmt ? (parseFloat(customAmtStr) || 0) : amount
  const feeRate         = dealMode === "super" ? 1 : 5
  const diffDays        = Math.round((endDate.getTime() - startDate.getTime()) / 86400000)
  const channelLabel    = channel ? (CHANNELS[category ?? ""]?.find(c => c.id === channel)?.label ?? channel) : null
  const ruleLabel       = rule    ? (RULES[channel ?? ""]?.find(r => r.id === rule)?.label ?? rule) : null
  const freqLabel       = frequency ? (FREQUENCIES.find(f => f.id === frequency)?.label ?? frequency) : null
  const ruleDesc        = ruleLabel && freqLabel && channelLabel
    ? `${quantity}× ${ruleLabel} / ${freqLabel} · ${channelLabel}`
    : null

  const isValid =
    name.trim().length >= 3 &&
    category !== null && channel !== null && rule !== null && frequency !== null &&
    effectiveAmount >= 10

  // ── Handlers ──

  function selectCategory(id: string) { setCategory(id); setChannel(null); setRule(null) }
  function selectChannel(id: string)  { setChannel(id);  setRule(null) }

  function selectPreset(id: string) {
    const p = PERIOD_PRESETS.find(x => x.id === id)
    if (!p) return
    setPeriodPreset(id)
    setEndDate(addDays(startDate, p.days))
  }

  function pickCalDay(date: Date) {
    if (showCal === "start") {
      setStartDate(date)
      const p = PERIOD_PRESETS.find(x => x.id === periodPreset)
      if (p) setEndDate(addDays(date, p.days))
    } else {
      if (date <= startDate) return
      setEndDate(date)
      setPeriodPreset("custom")
    }
    setShowCal(null)
  }

  function handleQtyChange(val: string) {
    setQtyStr(val)
    const n = parseInt(val)
    if (!isNaN(n) && n >= 1) setQuantity(n)
  }

  async function handleConfirm() {
    if (!isValid || isSubmitting) return
    setIsSubmitting(true)
    setSubmitError(null)
    const privacyMap: Record<string, DealType> = { private: "privado", public: "publico" }
    const result = await createDeal({
      title:                 name.trim(),
      type:                  privacyMap[privacy] ?? "privado",
      mode:                  dealMode,
      category:              category as DealCategory,
      verification_type:     rule ?? "",
      verification_channels: channel ? [channel] : [],
      entry_amount:          effectiveAmount,
      distribution:          distribution as "winner" | "top3" | "proportional",
      payment_method:        "pix",
      max_participants:      999999,
      allow_requests:        true,
      start_date:            startDate.toISOString().split("T")[0],
      end_date:              endDate.toISOString().split("T")[0],
    })
    setIsSubmitting(false)
    if (result.error) { setSubmitError(result.error); return }
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
          <span className="font-medium">Voltar</span>
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

      {/* Content */}
      <div className="flex-1 px-5 pb-36 overflow-y-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Criar Deal</h1>
        <p className="text-sm text-gray-500 mb-6">Configure tudo e inicie</p>

        {/* ── 1. Nome ──────────────────────────────────────────────────────── */}
        <Section label="Nome do Deal">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Desafio Creators 30 dias"
            className="w-full p-4 rounded-xl outline-none text-gray-800 placeholder-gray-400 text-sm"
            style={{
              background: "rgba(255,255,255,0.6)",
              backdropFilter: "blur(20px)",
              border: name.length === 0 ? "1px solid rgba(255,255,255,0.6)"
                    : name.length < 3   ? "2px solid rgba(255,80,80,0.35)"
                    : "2px solid rgba(22,163,74,0.35)",
            }}
          />
          {name.length > 0 && name.length < 3 && (
            <p className="text-xs text-red-400 mt-1 ml-1">Mínimo 3 caracteres</p>
          )}
        </Section>

        {/* ── 2. Tipo ──────────────────────────────────────────────────────── */}
        <Section label="Tipo">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.45)" }}>
              <button
                onClick={() => setDealMode("regular")}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: dealMode === "regular" ? "linear-gradient(135deg,#16A34A,#22C55E)" : "transparent",
                  color: dealMode === "regular" ? "white" : "#9CA3AF",
                }}
              >
                Regular
              </button>
              <button
                onClick={() => { setDealMode("super"); setShowSuperInfo(true) }}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                style={{
                  background: dealMode === "super" ? "linear-gradient(135deg,#FFAA00,#FF6B00)" : "transparent",
                  color: dealMode === "super" ? "white" : "#9CA3AF",
                }}
              >
                <Star className="w-3 h-3" /> Super
              </button>
            </div>
            <div className="h-9 w-px bg-gray-200 flex-shrink-0" />
            <div className="flex flex-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.45)" }}>
              <button
                onClick={() => setPrivacy("private")}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                style={{
                  background: privacy === "private" ? "rgba(0,0,0,0.07)" : "transparent",
                  color: privacy === "private" ? "#374151" : "#9CA3AF",
                }}
              >
                <Lock className="w-3 h-3" /> Privado
              </button>
              <button
                onClick={() => setPrivacy("public")}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                style={{
                  background: privacy === "public" ? "rgba(0,0,0,0.07)" : "transparent",
                  color: privacy === "public" ? "#374151" : "#9CA3AF",
                }}
              >
                <Globe className="w-3 h-3" /> Público
              </button>
            </div>
          </div>
        </Section>

        {/* ── 3. Regras + Período (mesmo scroll horizontal) ────────────────── */}
        <Section label="Regras do Deal">
          <div className="overflow-x-auto -mx-5 px-5">
            <div className="flex gap-2.5 pb-2" style={{ minWidth: "max-content" }}>

              <PickerCol title="Categoria" width={82}>
                {CATEGORIES.map(c => (
                  <PickerItem key={c.id} label={c.label} selected={category === c.id}
                    available={c.available} onSelect={() => c.available && selectCategory(c.id)} />
                ))}
              </PickerCol>

              <PickerCol title="Canal" width={96} locked={!category}>
                {channels.map(ch => (
                  <PickerItem key={ch.id} label={ch.label} selected={channel === ch.id}
                    available={ch.available} onSelect={() => ch.available && selectChannel(ch.id)} />
                ))}
              </PickerCol>

              <PickerCol title="Regra" width={116} locked={!channel}>
                {rules.map(r => (
                  <PickerItem key={r.id} label={r.label} selected={rule === r.id}
                    available={true} onSelect={() => setRule(r.id)} />
                ))}
              </PickerCol>

              <PickerCol title="Qtd." width={82} locked={!rule}>
                <div className="flex flex-col items-center gap-2 py-1.5">
                  <button
                    onClick={() => { const n = quantity + 1; setQuantity(n); setQtyStr(String(n)) }}
                    disabled={!rule}
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(22,163,74,0.12)", color: "#16A34A" }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number" value={qtyStr} min={1}
                    onChange={e => handleQtyChange(e.target.value)}
                    disabled={!rule}
                    className="w-11 text-center text-sm font-bold text-gray-800 rounded-lg outline-none py-1"
                    style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.25)" }}
                  />
                  <button
                    onClick={() => { const n = Math.max(1, quantity - 1); setQuantity(n); setQtyStr(String(n)) }}
                    disabled={!rule}
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(22,163,74,0.12)", color: "#16A34A" }}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </PickerCol>

              <PickerCol title="Frequência" width={82} locked={!rule}>
                {FREQUENCIES.map(f => (
                  <PickerItem key={f.id} label={f.label} selected={frequency === f.id}
                    available={true} onSelect={() => setFrequency(f.id)} />
                ))}
              </PickerCol>

              {/* Separador visual */}
              <div className="w-px self-stretch flex-shrink-0 mx-0.5" style={{ background: "rgba(0,0,0,0.1)" }} />

              {/* Bloco Período */}
              <PeriodBlock
                startDate={startDate} endDate={endDate}
                periodPreset={periodPreset} diffDays={diffDays}
                onOpenCal={(mode) => {
                  setShowCal(mode)
                  const d = mode === "start" ? startDate : endDate
                  setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1))
                }}
                onSelectPreset={selectPreset}
              />

              {/* Separador visual */}
              <div className="w-px self-stretch flex-shrink-0 mx-0.5" style={{ background: "rgba(0,0,0,0.1)" }} />

              {/* Coluna Valor */}
              <PickerCol title="Valor / pessoa" width={100}>
                {AMOUNT_PRESETS.map(v => (
                  <PickerItem key={v} label={`R$ ${v}`}
                    selected={!isCustomAmt && amount === v} available={true}
                    onSelect={() => { setAmount(v); setIsCustomAmt(false) }} />
                ))}
                <PickerItem label="Outro" selected={isCustomAmt} available={true}
                  onSelect={() => setIsCustomAmt(true)} />
              </PickerCol>

              {/* Coluna Premiação */}
              <PickerCol title="Premiação" width={156}>
                {DISTRIBUTION_TYPES.map(d => (
                  <PickerItem key={d.id} label={d.label} desc={d.desc}
                    selected={distribution === d.id} available={true}
                    onSelect={() => setDistribution(d.id)} />
                ))}
              </PickerCol>

            </div>
          </div>

          {/* Campo valor customizado (aparece fora do scroll) */}
          {isCustomAmt && (
            <div className="mt-2 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-semibold text-sm">R$</span>
              <input
                type="number" value={customAmtStr} placeholder="0,00"
                onChange={e => setCustomAmtStr(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl outline-none text-gray-800 placeholder-gray-400 text-sm"
                style={{
                  background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)",
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

          {ruleDesc && (
            <div className="mt-3 px-4 py-2.5 rounded-xl flex items-center gap-2"
              style={{ background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.2)" }}>
              <div className="w-2 h-2 rounded-full bg-[#16A34A] flex-shrink-0" />
              <p className="text-xs font-medium text-[#16A34A]">{ruleDesc}</p>
            </div>
          )}
        </Section>

        {/* ── 5. Linha final: Entrada + Resumo + Info ───────────────────────── */}
        <div className="flex gap-2.5 items-stretch mb-6">

          {/* Entrada */}
          <div
            className="flex flex-col justify-center items-center px-3 py-4 rounded-2xl text-center flex-shrink-0"
            style={{
              minWidth: "88px",
              background: dealMode === "super"
                ? "linear-gradient(135deg,rgba(255,170,0,0.12),rgba(255,107,0,0.07))"
                : "linear-gradient(135deg,rgba(22,163,74,0.1),rgba(34,197,94,0.06))",
              border: dealMode === "super"
                ? "1px solid rgba(255,170,0,0.3)"
                : "1px solid rgba(22,163,74,0.25)",
            }}
          >
            <p className="text-[9px] font-bold text-gray-500 tracking-widest mb-0.5">ENTRADA</p>
            <p className="text-xl font-extrabold leading-tight"
              style={{ color: dealMode === "super" ? "#FFAA00" : "#16A34A" }}>
              {effectiveAmount > 0 ? `R$${effectiveAmount.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` : "—"}
            </p>
            <p className="text-[9px] text-gray-400 mt-0.5">por pessoa</p>
          </div>

          {/* Resumo do deal */}
          <div
            className="flex-1 min-w-0 px-3 py-3 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.7)" }}
          >
            <p className="text-[9px] font-bold text-gray-400 tracking-widest mb-0.5">DEAL</p>
            <p className="text-sm font-bold text-gray-800 truncate">{name || "—"}</p>
            <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
              {fmtShort(startDate)} → {fmtShort(endDate)} · {diffDays}d
            </p>
            {ruleDesc && (
              <p className="text-[10px] text-gray-400 truncate mt-0.5">{ruleDesc}</p>
            )}
            {distribution && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                {DISTRIBUTION_TYPES.find(d => d.id === distribution)?.label}
              </p>
            )}
          </div>

          {/* Botão de info */}
          <button
            onClick={() => setShowInfo(true)}
            className="w-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
            style={{
              background: "rgba(22,163,74,0.1)",
              border: "1px solid rgba(22,163,74,0.2)",
              color: "#16A34A",
            }}
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── CTA fixo ─────────────────────────────────────────────────────────── */}
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
          className={`w-full py-4 rounded-2xl font-bold text-white text-sm transition-all duration-300 ${isValid ? "active:scale-[0.98]" : "opacity-40 cursor-not-allowed"}`}
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
          <p className="text-center text-xs text-gray-400 mt-2">
            {name.trim().length < 3    ? "Defina um nome com pelo menos 3 caracteres"
              : !category              ? "Escolha uma categoria"
              : !channel               ? "Escolha um canal"
              : !rule                  ? "Escolha uma regra"
              : !frequency             ? "Escolha a frequência"
              : effectiveAmount < 10   ? "Valor mínimo por pessoa: R$10"
              : "Preencha todos os campos"}
          </p>
        )}
      </div>

      {/* ── Calendário ────────────────────────────────────────────────────────── */}
      {showCal && (
        <div className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowCal(null)}>
          <div className="w-full rounded-t-3xl px-5 pt-5 pb-8"
            style={{ background: "rgba(255,255,255,0.98)" }}
            onClick={e => e.stopPropagation()}>
            <p className="text-sm font-bold text-center text-gray-800 mb-4">
              {showCal === "start" ? "Data de início" : "Data de fim"}
            </p>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.05)" }}>
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <p className="font-bold text-gray-800">{MONTH_NAMES[calMonth.getMonth()]} {calMonth.getFullYear()}</p>
              <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.05)" }}>
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="grid grid-cols-7 mb-2">
              {["D","S","T","Q","Q","S","S"].map((d, i) => (
                <div key={i} className="text-center text-[11px] font-semibold text-gray-400">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1.5">
              {calendarCells(calMonth.getFullYear(), calMonth.getMonth()).map((date, i) => {
                if (!date) return <div key={i} />
                const disabled = showCal === "start" ? isPast(date) : date <= startDate
                const active   = showCal === "start" ? sameDay(date, startDate) : sameDay(date, endDate)
                return (
                  <button key={i} onClick={() => !disabled && pickCalDay(date)} disabled={disabled}
                    className="flex items-center justify-center h-9 w-9 mx-auto rounded-full text-sm"
                    style={{
                      background: active ? "#16A34A" : "transparent",
                      color: active ? "white" : disabled ? "#D1D5DB" : "#374151",
                      fontWeight: active ? "700" : "400",
                    }}>
                    {date.getDate()}
                  </button>
                )
              })}
            </div>
            <button onClick={() => setShowCal(null)}
              className="w-full mt-5 py-3 rounded-2xl font-semibold text-[#16A34A] text-sm"
              style={{ background: "rgba(22,163,74,0.07)", border: "1px solid rgba(22,163,74,0.15)" }}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ── Modal revisão ─────────────────────────────────────────────────────── */}
      {showReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowReview(false)}>
          <div className="w-full max-w-md rounded-3xl p-6"
            style={{ background: "rgba(255,255,255,0.98)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">Revisar Deal</h2>
              <button onClick={() => setShowReview(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.06)" }}>
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3 mb-6">
              {([
                ["Nome",        name],
                ["Modalidade",  dealMode === "super" ? "⭐ Super Deal" : "Regular"],
                ["Visibilidade",privacy === "private" ? "🔒 Privado" : "🌐 Público"],
                ["Canal",       channelLabel ?? "—"],
                ["Regra",       ruleDesc ?? "—"],
                ["Período",     `${fmtFull(startDate)} → ${fmtFull(endDate)}`],
                ["Entrada",     `R$ ${effectiveAmount.toFixed(2)}`],
                ["Premiação",   DISTRIBUTION_TYPES.find(d => d.id === distribution)?.label ?? ""],
                ["Taxa",        `${feeRate}% (só se houver perdedor)`],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between items-start gap-4">
                  <span className="text-sm text-gray-500 flex-shrink-0">{k}</span>
                  <span className="text-sm font-semibold text-gray-800 text-right">{v}</span>
                </div>
              ))}
            </div>
            {submitError && <p className="text-xs text-red-500 text-center mb-3">{submitError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowReview(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm"
                style={{ background: "rgba(0,0,0,0.06)", color: "#374151" }}>
                Ajustar
              </button>
              <button onClick={handleConfirm} disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-60"
                style={{
                  background: dealMode === "super"
                    ? "linear-gradient(135deg,#FFAA00,#FF6B00)"
                    : "linear-gradient(135deg,#16A34A,#22C55E)",
                }}>
                {isSubmitting ? "Criando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Info bottom sheet ──────────────────────────────────────────────────── */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowInfo(false)}>
          <div className="w-full rounded-t-3xl px-5 pt-5 pb-8"
            style={{ background: "rgba(255,255,255,0.98)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#16A34A]" />
                <h3 className="text-base font-bold text-gray-800">Como funciona</h3>
              </div>
              <button onClick={() => setShowInfo(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.06)" }}>
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="p-4 rounded-2xl"
                style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)" }}>
                <p className="text-xs font-bold text-[#16A34A] mb-1.5">💸 Taxa de {feeRate}% — só se houver perdedor</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  A taxa é cobrada pelo app apenas se algum participante não cumprir o desafio. Se todos cumprirem, o valor integral é devolvido a cada um.
                </p>
              </div>
              <div className="p-4 rounded-2xl"
                style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}>
                <p className="text-xs font-bold text-blue-500 mb-1.5">👥 Mínimo de 2 participantes</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Para o deal entrar em vigor, pelo menos 2 participantes precisam confirmar a entrada antes do prazo de formação. Se esse mínimo não for atingido, o deal é cancelado e os valores são devolvidos.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Super Deal info ────────────────────────────────────────────────────── */}
      {showSuperInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowSuperInfo(false)}>
          <div className="w-full max-w-sm rounded-3xl p-6"
            style={{ background: "rgba(255,255,255,0.98)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                <h2 className="text-lg font-bold text-gray-800">Super Deal</h2>
              </div>
              <button onClick={() => setShowSuperInfo(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.06)" }}>
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Taxa reduzida de <strong className="text-yellow-600">1%</strong> vs 5% do Regular.
            </p>
            <p className="text-sm text-gray-600 mb-5">
              Cobrada apenas se houver perdedor. Se todos cumprirem, o valor integral é devolvido.
            </p>
            <button onClick={() => setShowSuperInfo(false)}
              className="w-full py-3 rounded-2xl font-semibold text-sm text-white"
              style={{ background: "linear-gradient(135deg,#FFAA00,#FF6B00)" }}>
              Entendido
            </button>
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

function PickerCol({
  title, width, locked = false, children,
}: {
  title: string; width: number; locked?: boolean; children: React.ReactNode
}) {
  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden flex-shrink-0 transition-opacity"
      style={{
        width: `${width}px`,
        background: locked ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.55)",
        border: "1px solid rgba(255,255,255,0.65)",
        opacity: locked ? 0.4 : 1,
        pointerEvents: locked ? "none" : "auto",
      }}
    >
      <div className="px-2 py-1.5 text-center border-b"
        style={{ borderColor: "rgba(0,0,0,0.07)", background: "rgba(0,0,0,0.04)" }}>
        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{title}</p>
      </div>
      <div className="flex flex-col gap-0.5 p-1.5 min-h-[72px]">
        {locked ? <p className="text-[10px] text-gray-400 text-center py-4">—</p> : children}
      </div>
    </div>
  )
}

function PickerItem({
  label, desc, selected, available, onSelect,
}: {
  label: string; desc?: string; selected: boolean; available: boolean; onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      disabled={!available}
      className="w-full text-left px-2 rounded-lg transition-all"
      style={{
        paddingTop: desc ? "6px" : "6px",
        paddingBottom: desc ? "6px" : "6px",
        background: selected ? "rgba(22,163,74,0.15)" : "transparent",
      }}
    >
      {available ? (
        <>
          <p style={{
            fontSize: "11px",
            fontWeight: selected ? "700" : "500",
            color: selected ? "#16A34A" : "#374151",
            lineHeight: "1.3",
          }}>
            {label}
          </p>
          {desc && (
            <p style={{
              fontSize: "9px",
              color: selected ? "rgba(22,163,74,0.65)" : "#9CA3AF",
              lineHeight: "1.35",
              marginTop: "2px",
            }}>
              {desc}
            </p>
          )}
        </>
      ) : (
        <span className="flex items-center gap-1 flex-wrap">
          <span style={{ fontSize: "11px", fontWeight: "500", color: "#C4C4C4" }}>{label}</span>
          <span className="text-[8px] px-1 py-0.5 rounded-full flex-shrink-0"
            style={{ background: "rgba(0,0,0,0.06)", color: "#BABABA" }}>
            em breve
          </span>
        </span>
      )}
    </button>
  )
}

function PeriodBlock({
  startDate, endDate, periodPreset, diffDays, onOpenCal, onSelectPreset,
}: {
  startDate: Date; endDate: Date; periodPreset: string; diffDays: number
  onOpenCal: (mode: "start" | "end") => void
  onSelectPreset: (id: string) => void
}) {
  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden flex-shrink-0"
      style={{
        width: "214px",
        background: "rgba(255,255,255,0.55)",
        border: "1px solid rgba(255,255,255,0.65)",
      }}
    >
      <div className="px-3 py-1.5 text-center border-b"
        style={{ borderColor: "rgba(0,0,0,0.07)", background: "rgba(0,0,0,0.04)" }}>
        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Período</p>
      </div>
      <div className="p-2 space-y-1.5">
        {/* Date cards */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onOpenCal("start")}
            className="flex-1 p-2 rounded-xl text-left transition-all active:scale-95"
            style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.9)" }}
          >
            <p className="text-[8px] font-bold text-gray-400 tracking-wider">INÍCIO</p>
            <p className="text-[11px] font-bold text-gray-800 mt-0.5 leading-tight">{fmtShort(startDate)}</p>
          </button>
          <p className="text-[10px] font-bold text-gray-400 flex-shrink-0">{diffDays}d</p>
          <button
            onClick={() => onOpenCal("end")}
            className="flex-1 p-2 rounded-xl text-left transition-all active:scale-95"
            style={{ background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.25)" }}
          >
            <p className="text-[8px] font-bold text-[#16A34A] tracking-wider">FIM</p>
            <p className="text-[11px] font-bold text-[#16A34A] mt-0.5 leading-tight">{fmtShort(endDate)}</p>
          </button>
        </div>
        {/* Presets 2×2 */}
        <div className="grid grid-cols-2 gap-1">
          {PERIOD_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => onSelectPreset(p.id)}
              className="py-1.5 rounded-lg text-[10px] font-semibold transition-all"
              style={{
                background: periodPreset === p.id ? "rgba(22,163,74,0.12)" : "rgba(255,255,255,0.55)",
                color:      periodPreset === p.id ? "#16A34A"               : "#6B7280",
                border:     periodPreset === p.id ? "1.5px solid rgba(22,163,74,0.3)" : "1px solid rgba(255,255,255,0.6)",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
