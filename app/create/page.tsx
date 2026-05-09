"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Star, Lock, Globe, ChevronLeft, ChevronRight,
  Plus, Minus, Check, Info, X,
} from "lucide-react"
import { createDeal } from "@/lib/actions/deals"
import type { DealCategory, DealType } from "@/lib/supabase/types"

// ── Data ──────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "social",   label: "Social",   icon: "📣", available: true  },
  { id: "fitness",  label: "Fitness",  icon: "🏃", available: true  },
  { id: "gaming",   label: "Gaming",   icon: "🎮", available: false },
  { id: "learning", label: "Learning", icon: "📚", available: false },
  { id: "onchain",  label: "On-Chain", icon: "⛓", available: false },
  { id: "free",     label: "Free",     icon: "✨", available: false },
]

const CHANNELS: Record<string, { id: string; label: string; available: boolean; color: string }[]> = {
  social: [
    { id: "x",         label: "X",        available: true,  color: "#000000" },
    { id: "instagram", label: "Instagram", available: false, color: "#E1306C" },
    { id: "tiktok",    label: "TikTok",    available: false, color: "#ff0050" },
    { id: "linkedin",  label: "LinkedIn",  available: false, color: "#0077B5" },
    { id: "discord",   label: "Discord",   available: false, color: "#5865F2" },
    { id: "youtube",   label: "YouTube",   available: false, color: "#FF0000" },
  ],
  fitness: [
    { id: "strava",    label: "Strava",    available: true,  color: "#FC4C02" },
    { id: "wellhub",   label: "Wellhub",   available: true,  color: "#00A878" },
    { id: "totalpass", label: "TotalPass", available: true,  color: "#FF6B35" },
  ],
}

const CHANNEL_ICONS: Record<string, string> = {
  x: "𝕏", instagram: "IG", tiktok: "TK", linkedin: "in",
  discord: "D", youtube: "▶", strava: "S", wellhub: "W", totalpass: "T",
}

const RULES: Record<string, { id: string; label: string; icon: string }[]> = {
  x: [
    { id: "post",             label: "Post publicado",      icon: "📝" },
    { id: "comment_received", label: "Comentário recebido", icon: "💬" },
    { id: "repost_received",  label: "Repost recebido",     icon: "🔁" },
    { id: "follower_gained",  label: "Seguidor recebido",   icon: "👥" },
    { id: "impressions",      label: "Impressões",          icon: "👁️" },
  ],
  strava: [
    { id: "km_run",        label: "Kms percorridos", icon: "🏃" },
    { id: "pace",          label: "Pace médio",      icon: "⏱️" },
    { id: "workout_hours", label: "Horas de treino", icon: "🕐" },
    { id: "checkin",       label: "Check-ins",       icon: "✅" },
  ],
  wellhub: [
    { id: "checkin",          label: "Check-ins",            icon: "✅" },
    { id: "different_venues", label: "Diferentes ambientes", icon: "🏢" },
    { id: "workout_hours",    label: "Horas de treino",      icon: "🕐" },
  ],
  totalpass: [
    { id: "checkin",          label: "Check-ins",            icon: "✅" },
    { id: "different_venues", label: "Diferentes ambientes", icon: "🏢" },
    { id: "workout_hours",    label: "Horas de treino",      icon: "🕐" },
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
  { id: "proportional", label: "Proporcional", icon: "🤝", desc: "Garantia ÷ todos os adimplentes"         },
  { id: "top3",         label: "Ranking",       icon: "🏅", desc: "1º 60% · 2º 30% · 3º 10% da garantia" },
  { id: "winner",       label: "Beneficiário Único", icon: "👑", desc: "Acordo de performance total"      },
]

const PERIOD_PRESETS = [
  { id: "1w", label: "1 sem",    days: 7  },
  { id: "2w", label: "2 sem",    days: 14 },
  { id: "1m", label: "1 mês",    days: 30 },
  { id: "2m", label: "2 meses",  days: 60 },
]

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
const TODAY = new Date()

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function getSharedRules(ids: string[]): { id: string; label: string; icon: string }[] {
  if (ids.length === 0) return []
  if (ids.length === 1) return RULES[ids[0]] ?? []
  const sets = ids.map(c => RULES[c] ?? [])
  return sets.reduce((a, b) => a.filter(r => b.some(x => x.id === r.id)))
}

function SectionBlock({
  icon, iconBg, title, sub, children,
}: {
  icon: React.ReactNode; iconBg: string; title: string; sub?: string; children: React.ReactNode
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg }}
        >
          {icon}
        </div>
        <div>
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-1">{title}</p>
          {sub && <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">{sub}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CreateAgreementPage() {
  const router = useRouter()

  // ── State ──
  const [name,     setName]     = useState("")
  const [dealMode, setDealMode] = useState<"regular" | "sovereign">("regular")
  const [privacy,  setPrivacy]  = useState<"private" | "public">("private")

  const [category,         setCategory]         = useState<string | null>(null)
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [fitnessConnector, setFitnessConnector] = useState<"e" | "ou">("e")
  const [rule,             setRule]             = useState<string | null>(null)
  const [quantity,         setQuantity]         = useState(1)
  const [qtyStr,           setQtyStr]           = useState("1")
  const [frequency,        setFrequency]        = useState<string | null>(null)

  const [periodPreset, setPeriodPreset] = useState("1m")
  const [startDate,    setStartDate]    = useState<Date>(TODAY)
  const [endDate,      setEndDate]      = useState<Date>(addDays(TODAY, 30))
  const [showCal,      setShowCal]      = useState<"start" | "end" | null>(null)
  const [calMonth,     setCalMonth]     = useState(new Date(2026, 3, 1))

  const [amount,       setAmount]       = useState(50)
  const [isCustomAmt,  setIsCustomAmt]  = useState(false)
  const [customAmtStr, setCustomAmtStr] = useState("")
  const [distribution, setDistribution] = useState("winner")

  const [screen,        setScreen]        = useState<1 | 2>(1)
  const [showSuperInfo, setShowSuperInfo] = useState(false)
  const [showInfo,      setShowInfo]      = useState(false)
  const [isSubmitting,  setIsSubmitting]  = useState(false)
  const [submitError,   setSubmitError]   = useState<string | null>(null)

  // ── Derived ──
  const channels        = category ? (CHANNELS[category] ?? []) : []
  const availableRules  = getSharedRules(selectedChannels)
  const effectiveAmount = isCustomAmt ? (parseFloat(customAmtStr) || 0) : amount
  const feeRate         = dealMode === "sovereign" ? 1 : 5
  const diffDays        = Math.round((endDate.getTime() - startDate.getTime()) / 86400000)

  const channelLabel = selectedChannels.length === 1
    ? (channels.find(c => c.id === selectedChannels[0])?.label ?? null)
    : selectedChannels.length > 1
    ? selectedChannels.map(id => channels.find(c => c.id === id)?.label ?? id).join(` ${fitnessConnector.toUpperCase()} `)
    : null

  const ruleLabel  = rule      ? (availableRules.find(r => r.id === rule)?.label ?? rule) : null
  const freqLabel  = frequency ? (FREQUENCIES.find(f => f.id === frequency)?.label ?? frequency) : null

  const isValid =
    name.trim().length >= 3 &&
    category !== null &&
    selectedChannels.length > 0 &&
    rule !== null &&
    frequency !== null &&
    effectiveAmount >= 10

  // ── Handlers ──

  function selectCategory(id: string) {
    setCategory(id)
    setSelectedChannels([])
    setRule(null)
  }

  function toggleChannel(id: string) {
    const isFitness = category === "fitness"
    if (isFitness) {
      setSelectedChannels(prev =>
        prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
      )
    } else {
      setSelectedChannels(prev => (prev[0] === id ? [] : [id]))
    }
    setRule(null)
  }

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
      mode:                  dealMode === "sovereign" ? "super" : "regular",
      category:              category as DealCategory,
      verification_type:     rule ?? "",
      verification_channels: selectedChannels,
      entry_amount:          effectiveAmount,
      distribution:          distribution as "winner" | "top3" | "proportional",
      payment_method:        "pix",
      max_participants:      100,
      allow_requests:        true,
      start_date:            startDate.toISOString().split("T")[0],
      end_date:              endDate.toISOString().split("T")[0],
    })
    setIsSubmitting(false)
    if (result.error) { setSubmitError(result.error); return }
    setScreen(1)
    router.push("/")
  }

  // ── Confirmation rows ──
  const confirmRows = [
    {
      icon: "🛡️", iconBg: "rgba(0,210,106,0.1)",
      key: "Regra",
      val: channelLabel && ruleLabel ? `${channelLabel} · ${ruleLabel}` : "—",
    },
    {
      icon: "📊", iconBg: "rgba(168,85,247,0.1)",
      key: "Meta",
      val: ruleLabel && freqLabel ? `${quantity}× ${ruleLabel} / ${freqLabel}` : "—",
    },
    {
      icon: "📅", iconBg: "rgba(239,68,68,0.08)",
      key: "Período",
      val: `${fmtShort(startDate)} → ${fmtShort(endDate)} (${diffDays}d)`,
    },
    {
      icon: "💰", iconBg: "rgba(0,210,106,0.1)",
      key: "Financeiro",
      val: effectiveAmount > 0 ? `R$${effectiveAmount}/pessoa · ${DISTRIBUTION_TYPES.find(d => d.id === distribution)?.label}` : "—",
    },
    {
      icon: "🔒", iconBg: "rgba(10,15,13,0.1)",
      key: "Acesso",
      val: privacy === "private" ? "Privado" : "Público",
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        backgroundImage: "url('/images/gradient-background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {/* ── Screen 1 ─────────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 flex flex-col overflow-y-auto"
        style={{
          transform: screen === 1 ? "translateX(0)" : "translateX(-100%)",
          opacity: screen === 1 ? 1 : 0,
          transition: "transform 0.5s cubic-bezier(0.23,1,0.32,1), opacity 0.5s",
          pointerEvents: screen === 1 ? "auto" : "none",
        }}
      >
        {/* Header */}
        <header className="px-6 pt-12 pb-4 flex items-center justify-between flex-shrink-0">
          <button onClick={() => router.back()} className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/50 border border-white/80 group-active:scale-90 transition-all">
              <ArrowLeft className="w-4 h-4 text-[#0A0F0D]" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Abortar</span>
          </button>
          <div className="flex items-center gap-2">
            {dealMode === "sovereign" ? (
              <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl"
                style={{ background: "#0A0F0D" }}>
                <Star className="w-3.5 h-3.5 text-[#00D26A]" />
                <span className="text-[10px] font-black text-[#00D26A] uppercase tracking-wider">Sovereign · 1%</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl"
                style={{ background: "#00D26A" }}>
                <span className="text-[10px] font-black text-[#0A0F0D] uppercase tracking-wider">Regular · 5%</span>
              </div>
            )}
            <button
              onClick={() => setShowInfo(true)}
              className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90"
              style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.8)", color: "#0A0F0D" }}
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 px-6 pb-32">
          <h1 className="text-3xl font-black text-[#0A0F0D] tracking-tighter uppercase leading-none mb-2">Initialize Protocol</h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-10">Configure as diretrizes de performance</p>

          {/* ── 1. Nome ── */}
          <SectionBlock icon={<span className="text-base">✏️</span>} iconBg="rgba(0,210,106,0.1)" title="Título do Acordo" sub="Identificação on-chain">
            <input
              type="text" value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Q2 GROWTH KPI PROTOCOL"
              className="w-full p-5 rounded-[1.5rem] outline-none text-[#0A0F0D] placeholder-gray-300 font-black text-lg tracking-tight transition-all"
              style={{
                background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)",
                border: name.length === 0 ? "1px solid rgba(255,255,255,0.8)"
                      : name.length < 3   ? "2px solid rgba(255,74,74,0.3)"
                      : "2px solid #00D26A",
              }}
            />
            {name.length > 0 && name.length < 3 && (
              <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mt-2 ml-2">Mínimo 3 caracteres</p>
            )}
          </SectionBlock>

          {/* ── 2. Tipo ── */}
          <SectionBlock icon={<span className="text-base">⚙️</span>} iconBg="rgba(0,210,106,0.1)" title="Modelo de Execução" sub="Fees institucionais reduzidas">
            <div className="flex gap-3">
              {[
                { id: "regular" as const, label: "Regular",   sub: "5% fee", bg: "#00D26A", color: "#0A0F0D" },
                { id: "sovereign" as const, label: "Sovereign",  sub: "1% fee", bg: "#0A0F0D", color: "#00D26A" },
              ].map(opt => (
                <button key={opt.id}
                  onClick={() => { setDealMode(opt.id); if (opt.id === "sovereign") setShowSuperInfo(true) }}
                  className="flex-1 py-5 rounded-[1.5rem] transition-all relative overflow-hidden group active:scale-95"
                  style={{
                    background: dealMode === opt.id ? opt.bg : "rgba(255,255,255,0.5)",
                    border: dealMode === opt.id ? "none" : "1.5px solid rgba(0,0,0,0.05)",
                    color: dealMode === opt.id ? opt.color : "#9CA3AF",
                  }}>
                  {dealMode === opt.id && <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                  <div className="text-xs font-black uppercase tracking-widest mb-1">{opt.label}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">{opt.sub}</div>
                </button>
              ))}
            </div>
          </SectionBlock>

          {/* ── 3. Categoria ── */}
          <SectionBlock icon={<span className="text-base">🗂️</span>} iconBg="rgba(0,210,106,0.1)" title="Categoria de Oráculo" sub="Escopo de verificação social/fitness">
            <div className="grid grid-cols-3 gap-3">
              {CATEGORIES.map(cat => (
                <button key={cat.id}
                  onClick={() => cat.available && selectCategory(cat.id)}
                  disabled={!cat.available}
                  className="relative py-5 px-3 rounded-2xl text-center transition-all active:scale-95"
                  style={{
                    background: category === cat.id ? "rgba(0,210,106,0.08)" : "rgba(255,255,255,0.5)",
                    border: category === cat.id ? "2px solid #00D26A" : "1.5px solid rgba(0,0,0,0.05)",
                    opacity: !cat.available ? 0.4 : 1,
                  }}>
                  <div className="text-2xl mb-2">{cat.icon}</div>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: category === cat.id ? "#00D26A" : "#374151" }}>
                    {cat.label}
                  </p>
                </button>
              ))}
            </div>
          </SectionBlock>

          {/* ── 4. Canal ── */}
          {category && channels.length > 0 && (
            <SectionBlock
              icon={<span className="text-base">📡</span>}
              iconBg="rgba(0,210,106,0.1)"
              title="Interface de Dados"
              sub={category === "fitness" ? "Cross-platform sync" : "Social Oracle Sync"}
            >
              <div className="space-y-3">
                {channels.map((ch, idx) => {
                  const isSelected   = selectedChannels.includes(ch.id)
                  const prevCh       = channels[idx - 1]
                  const prevSelected = prevCh && selectedChannels.includes(prevCh.id)
                  const showConnector = category === "fitness" && idx > 0 && isSelected && prevSelected

                  return (
                    <div key={ch.id}>
                      {showConnector && (
                        <div className="flex items-center gap-3 my-2 px-2">
                          <div className="flex-1 h-px bg-gray-100" />
                          <div
                            className="flex overflow-hidden rounded-full border border-gray-100 bg-white/80 p-1">
                            {(["e", "ou"] as const).map(opt => (
                              <button key={opt}
                                onClick={() => setFitnessConnector(opt)}
                                className="px-5 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all"
                                style={{
                                  background: fitnessConnector === opt ? "#0A0F0D" : "transparent",
                                  color: fitnessConnector === opt ? "#00D26A" : "#D1D5DB",
                                  borderRadius: "100px",
                                }}>
                                {opt === "e" ? "Sincronizado" : "Alternativo"}
                              </button>
                            ))}
                          </div>
                          <div className="flex-1 h-px bg-gray-100" />
                        </div>
                      )}
                      <button
                        onClick={() => ch.available && toggleChannel(ch.id)}
                        disabled={!ch.available}
                        className="w-full flex items-center gap-4 p-4 rounded-[1.5rem] transition-all active:scale-[0.98]"
                        style={{
                          background: isSelected ? "rgba(0,210,106,0.06)" : "rgba(255,255,255,0.5)",
                          border: isSelected ? "2px solid #00D26A" : "1.5px solid rgba(0,0,0,0.05)",
                          opacity: !ch.available ? 0.5 : 1,
                        }}>
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                          style={{ background: ch.color }}>
                          <span className="text-white text-[11px] font-black uppercase">{CHANNEL_ICONS[ch.id]}</span>
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-black text-[#0A0F0D] tracking-tight">{ch.label}</p>
                          {!ch.available && <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Breve</p>}
                        </div>
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                          style={{
                            background: isSelected ? "#00D26A" : "transparent",
                            border: isSelected ? "none" : "1.5px solid rgba(0,0,0,0.1)",
                          }}>
                          {isSelected && <Check className="w-4 h-4 text-[#0A0F0D]" />}
                        </div>
                      </button>
                    </div>
                  )
                })}
              </div>
            </SectionBlock>
          )}

          {/* ── 5. Regra ── */}
          {selectedChannels.length > 0 && availableRules.length > 0 && (
            <SectionBlock icon={<span className="text-base">📋</span>} iconBg="rgba(168,85,247,0.1)" title="Protocolo de Auditoria" sub="Métrica final de adimplemento">
              <div className="space-y-2.5">
                {availableRules.map(r => (
                  <button key={r.id}
                    onClick={() => setRule(r.id)}
                    className="w-full flex items-center gap-4 p-4 rounded-[1.5rem] transition-all active:scale-[0.98]"
                    style={{
                      background: rule === r.id ? "rgba(0,210,106,0.06)" : "rgba(255,255,255,0.5)",
                      border: rule === r.id ? "2px solid #00D26A" : "1.5px solid rgba(0,0,0,0.05)",
                    }}>
                    <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center flex-shrink-0 text-xl">
                      {r.icon}
                    </div>
                    <p className="flex-1 text-sm font-black text-[#0A0F0D] tracking-tight text-left">{r.label}</p>
                    {rule === r.id && (
                      <div className="w-6 h-6 rounded-lg bg-[#00D26A] flex items-center justify-center">
                        <Check className="w-4 h-4 text-[#0A0F0D]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </SectionBlock>
          )}

          {/* ── 6. Meta (Qtd + Frequência) ── */}
          {rule && (
            <SectionBlock icon={<span className="text-base">🎯</span>} iconBg="rgba(59,130,246,0.1)" title="Threshold de Performance" sub="Volume de eventos necessários">
              <div className="p-6 rounded-[2rem] mb-4"
                style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.8)" }}>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 text-center">Intensidade do Acordo</p>
                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={() => { const n = Math.max(1, quantity - 1); setQuantity(n); setQtyStr(String(n)) }}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90"
                    style={{ background: "#F3F4F6", color: "#0A0F0D" }}>
                    <Minus className="w-5 h-5 stroke-[3]" />
                  </button>
                  <input
                    type="number" value={qtyStr} min={1}
                    onChange={e => handleQtyChange(e.target.value)}
                    className="w-20 text-center text-4xl font-black text-[#0A0F0D] rounded-2xl outline-none py-3 tracking-tighter"
                    style={{ background: "transparent" }}
                  />
                  <button
                    onClick={() => { const n = quantity + 1; setQuantity(n); setQtyStr(String(n)) }}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90"
                    style={{ background: "#00D26A", color: "#0A0F0D" }}>
                    <Plus className="w-5 h-5 stroke-[3]" />
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                {FREQUENCIES.map(f => (
                  <button key={f.id}
                    onClick={() => setFrequency(f.id)}
                    className="flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                    style={{
                      background: frequency === f.id ? "#0A0F0D" : "rgba(255,255,255,0.5)",
                      border: frequency === f.id ? "none" : "1.5px solid rgba(0,0,0,0.05)",
                      color: frequency === f.id ? "#00D26A" : "#D1D5DB",
                    }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </SectionBlock>
          )}

          {/* ── 7. Período ── */}
          <SectionBlock icon={<span className="text-base">📅</span>} iconBg="rgba(239,68,68,0.08)" title="Janela de Execução" sub="Duração do smart contract">
            <div className="flex gap-2 mb-4 flex-wrap">
              {PERIOD_PRESETS.map(p => (
                <button key={p.id}
                  onClick={() => selectPreset(p.id)}
                  className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                  style={{
                    background: periodPreset === p.id ? "rgba(0,210,106,0.1)" : "rgba(255,255,255,0.5)",
                    border: periodPreset === p.id ? "1.5px solid #00D26A" : "1.5px solid rgba(0,0,0,0.05)",
                    color: periodPreset === p.id ? "#00D26A" : "#9CA3AF",
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex gap-4 items-stretch">
              <button
                onClick={() => { setShowCal("start"); setCalMonth(new Date(startDate.getFullYear(), startDate.getMonth(), 1)) }}
                className="flex-1 p-5 rounded-[1.5rem] text-left transition-all active:scale-95 group"
                style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.8)" }}>
                <p className="text-[9px] font-black text-gray-400 tracking-[0.2em] uppercase mb-1">Início</p>
                <p className="text-lg font-black text-[#0A0F0D] leading-none group-active:text-[#00D26A]">{fmtShort(startDate)}</p>
              </button>
              <div className="flex items-center">
                <div className="w-1 h-1 rounded-full bg-gray-200" />
              </div>
              <button
                onClick={() => { setShowCal("end"); setCalMonth(new Date(endDate.getFullYear(), endDate.getMonth(), 1)) }}
                className="flex-1 p-5 rounded-[1.5rem] text-right transition-all active:scale-95 group"
                style={{ background: "rgba(0,210,106,0.05)", border: "2px solid #00D26A" }}>
                <p className="text-[9px] font-black text-[#00D26A] tracking-[0.2em] uppercase mb-1">Finalização</p>
                <p className="text-lg font-black text-[#00D26A] leading-none">{fmtShort(endDate)}</p>
              </button>
            </div>
          </SectionBlock>

          {/* ── 8. Pagamento ── */}
          <SectionBlock icon={<span className="text-base">💸</span>} iconBg="rgba(0,210,106,0.1)" title="Garantia Colateral" sub="Alocação e regras de payout">
            {/* Value grid 3×2 */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {AMOUNT_PRESETS.map(v => (
                <button key={v}
                  onClick={() => { setAmount(v); setIsCustomAmt(false) }}
                  className="py-5 px-2 rounded-[1.5rem] text-center transition-all active:scale-95"
                  style={{
                    background: !isCustomAmt && amount === v ? "#0A0F0D" : "rgba(255,255,255,0.5)",
                    border: !isCustomAmt && amount === v ? "none" : "1.5px solid rgba(0,0,0,0.05)",
                    boxShadow: !isCustomAmt && amount === v ? "0 10px 25px rgba(0,0,0,0.15)" : "none",
                  }}>
                  <p className="text-xl font-black tracking-tighter"
                    style={{ color: !isCustomAmt && amount === v ? "#00D26A" : "#0A0F0D" }}>
                    R${v}
                  </p>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40" style={{ color: !isCustomAmt && amount === v ? "#00D26A" : "#0A0F0D" }}>Unitário</p>
                </button>
              ))}
              <button
                onClick={() => setIsCustomAmt(true)}
                className="py-5 px-2 rounded-[1.5rem] text-center transition-all active:scale-95"
                style={{
                  background: isCustomAmt ? "#0A0F0D" : "rgba(255,255,255,0.5)",
                  border: isCustomAmt ? "none" : "1.5px solid rgba(0,0,0,0.05)",
                }}>
                <p className="text-xl font-black tracking-tighter" style={{ color: isCustomAmt ? "#00D26A" : "#0A0F0D" }}>Livre</p>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40" style={{ color: isCustomAmt ? "#00D26A" : "#0A0F0D" }}>Custom</p>
              </button>
            </div>

            {isCustomAmt && (
              <div className="mb-6 relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-black text-lg">$</span>
                <input
                  type="number" value={customAmtStr} placeholder="0,00"
                  onChange={e => setCustomAmtStr(e.target.value)}
                  className="w-full pl-12 pr-6 py-5 rounded-[2rem] outline-none text-[#0A0F0D] placeholder-gray-200 font-black text-xl tracking-tight"
                  style={{
                    background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)",
                    border: parseFloat(customAmtStr) >= 10
                      ? "2px solid #00D26A"
                      : "2px solid rgba(255,74,74,0.3)",
                  }}
                />
              </div>
            )}

            {/* Pot estimate */}
            {effectiveAmount >= 10 && (
              <div className="mb-8 p-6 rounded-[2rem] flex items-center gap-5"
                style={{
                  background: "linear-gradient(135deg, #0A0F0D 0%, #1A2420 100%)",
                  boxShadow: "0 15px 35px rgba(0,0,0,0.2)",
                }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(0,210,106,0.15)" }}>
                  <span className="text-xl">🛡️</span>
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Garantia sob Custódia (10p)</p>
                  <p className="text-2xl font-black text-[#00D26A] tracking-tighter leading-none">
                    R${(effectiveAmount * 10).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            )}

            {/* Prize type */}
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Algoritmo de Distribuição</p>
            <div className="space-y-3">
              {DISTRIBUTION_TYPES.map(d => (
                <button key={d.id}
                  onClick={() => setDistribution(d.id)}
                  className="w-full flex items-center gap-4 p-5 rounded-[1.5rem] transition-all active:scale-[0.98]"
                  style={{
                    background: distribution === d.id ? "rgba(0,210,106,0.06)" : "rgba(255,255,255,0.5)",
                    border: distribution === d.id ? "2px solid #00D26A" : "1.5px solid rgba(0,0,0,0.05)",
                  }}>
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 text-xl">
                    {d.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-black text-[#0A0F0D] tracking-tight uppercase">{d.label}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">{d.desc}</p>
                  </div>
                  {distribution === d.id && (
                    <div className="w-6 h-6 rounded-lg bg-[#00D26A] flex items-center justify-center">
                      <Check className="w-4 h-4 text-[#0A0F0D]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </SectionBlock>

          {/* ── 9. Visibilidade ── */}
          <SectionBlock icon={<span className="text-base">👁️</span>} iconBg="rgba(10,15,13,0.1)" title="Visibilidade de Rede" sub="Configuração de privacidade do protocolo">
            <div className="flex gap-3">
              <button
                onClick={() => setPrivacy("private")}
                className="flex-1 flex items-center justify-center gap-3 py-5 rounded-[1.5rem] transition-all active:scale-95"
                style={{
                  background: privacy === "private" ? "#0A0F0D" : "rgba(255,255,255,0.5)",
                  border: privacy === "private" ? "none" : "1.5px solid rgba(0,0,0,0.05)",
                  color: privacy === "private" ? "#00D26A" : "#D1D5DB",
                }}>
                <Lock className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Privado</span>
              </button>
              <button
                onClick={() => setPrivacy("public")}
                className="flex-1 flex items-center justify-center gap-3 py-5 rounded-[1.5rem] transition-all active:scale-95"
                style={{
                  background: privacy === "public" ? "#0A0F0D" : "rgba(255,255,255,0.5)",
                  border: privacy === "public" ? "none" : "1.5px solid rgba(0,0,0,0.05)",
                  color: privacy === "public" ? "#00D26A" : "#D1D5DB",
                }}>
                <Globe className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Público</span>
              </button>
            </div>
          </SectionBlock>

          <div className="mt-12">
            <button
              onClick={() => isValid && setScreen(2)}
              disabled={!isValid}
              className={`w-full py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] transition-all duration-300 ${isValid ? "active:scale-[0.98]" : "opacity-40 cursor-not-allowed"}`}
              style={{
                background: "#0A0F0D",
                color: "#00D26A",
                boxShadow: isValid ? "0 15px 40px rgba(0,0,0,0.2)" : "none",
              }}
            >
              Review Protocol →
            </button>
            {!isValid && (
              <p className="text-center text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mt-4">
                Preencha todos os campos obrigatórios
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Screen 2 (Review) ── */}
      <div
        className="absolute inset-0 flex flex-col overflow-y-auto"
        style={{
          transform: screen === 2 ? "translateX(0)" : "translateX(100%)",
          opacity: screen === 2 ? 1 : 0,
          transition: "transform 0.5s cubic-bezier(0.23,1,0.32,1), opacity 0.5s",
          pointerEvents: screen === 2 ? "auto" : "none",
        }}
      >
        <header className="px-6 pt-12 pb-4">
          <button onClick={() => setScreen(1)} className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/50 border border-white/80 group-active:scale-90 transition-all">
              <ChevronLeft className="w-4 h-4 text-[#0A0F0D]" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ajustar</span>
          </button>
        </header>

        <div className="flex-1 px-6 pb-32">
          <h1 className="text-3xl font-black text-[#0A0F0D] tracking-tighter uppercase leading-none mb-2">Final Review</h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-10">Verifique os termos do smart contract</p>

          {/* Preview Hero */}
          <div
            className="rounded-[2.5rem] p-8 mb-8 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #0A0F0D 0%, #1A2420 100%)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
              color: "white",
            }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00D26A] opacity-5 blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <p className="text-[9px] font-black text-[#00D26A] uppercase tracking-[0.3em] mb-2">
                    {dealMode === "sovereign" ? "⭐ Sovereign Protocol" : "Standard Deal"}
                  </p>
                  <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">{name || "Unnamed"}</h2>
                </div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  {privacy === "private" ? <Lock className="w-5 h-5 text-[#00D26A]" /> : <Globe className="w-5 h-5 text-[#00D26A]" />}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Alocação",       value: effectiveAmount > 0 ? `R$${effectiveAmount}` : "—" },
                  { label: "Garantia Total", value: effectiveAmount > 0 ? `R$${effectiveAmount * 10}` : "—" },
                  { label: "Duração",        value: `${diffDays} dias` },
                  { label: "Payout",         value: DISTRIBUTION_TYPES.find(d => d.id === distribution)?.label ?? "—" },
                ].map(stat => (
                  <div key={stat.label}>
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className="text-base font-black tracking-tight">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Details list */}
          <div className="space-y-3 mb-10">
            {confirmRows.map(row => (
              <div key={row.key}
                className="flex items-center gap-4 p-5 rounded-[1.5rem]"
                style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.8)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: row.iconBg }}>
                  <span className="text-lg">{row.icon}</span>
                </div>
                <div className="flex-1">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{row.key}</p>
                  <p className="text-sm font-black text-[#0A0F0D] tracking-tight">{row.val}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Legal Disclaimer */}
          <div className="p-6 rounded-[2rem] bg-[#0A0F0D]/5 border border-[#0A0F0D]/10 mb-10">
            <div className="flex gap-3 items-start">
              <Info className="w-4 h-4 text-[#0A0F0D] mt-0.5 shrink-0" />
              <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                Ao inicializar este protocolo, você concorda que o oráculo selecionado será o único mediador de adimplemento. 
                Os fundos serão custodiados em smart contract auditável até a data de liquidação. 
                <span className="text-[#0A0F0D] ml-1 uppercase">Don&apos;t trust. Make a True Deal.</span>
              </p>
            </div>
          </div>

          {/* Action */}
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="w-full py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
            style={{
              background: "#00D26A",
              color: "#0A0F0D",
              boxShadow: "0 20px 50px rgba(0,210,106,0.3)",
            }}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-[#0A0F0D] border-t-transparent rounded-full animate-spin" />
                <span>Syncing Node...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Deploy Protocol</span>
              </>
            )}
          </button>
          
          {submitError && (
            <p className="text-center text-[10px] text-red-500 font-black uppercase tracking-widest mt-4">
              Error: {submitError}
            </p>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showCal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0A0F0D]/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-white rounded-[2.5rem] overflow-hidden p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-[#0A0F0D] uppercase tracking-tighter">
                {showCal === "start" ? "Data de Início" : "Data de Finalização"}
              </h3>
              <button onClick={() => setShowCal(null)} className="p-2 bg-gray-100 rounded-xl">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="flex items-center justify-between mb-6 px-2">
              <p className="font-black text-sm text-[#0A0F0D] uppercase tracking-widest">
                {MONTH_NAMES[calMonth.getMonth()]} {calMonth.getFullYear()}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100">
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100">
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-8">
              {["D","S","T","Q","Q","S","S"].map(d => (
                <div key={d} className="text-[9px] font-black text-gray-300 mb-2">{d}</div>
              ))}
              {calendarCells(calMonth.getFullYear(), calMonth.getMonth()).map((cell, idx) => {
                if (!cell) return <div key={`empty-${idx}`} />
                const disabled = isPast(cell) || (showCal === "end" && cell <= startDate)
                const isSelected = sameDay(cell, showCal === "start" ? startDate : endDate)
                return (
                  <button
                    key={cell.getTime()}
                    disabled={disabled}
                    onClick={() => pickCalDay(cell)}
                    className={`h-10 text-xs font-black rounded-xl transition-all ${
                      isSelected ? "bg-[#00D26A] text-[#0A0F0D]" :
                      disabled   ? "text-gray-200" :
                      "text-[#0A0F0D] hover:bg-gray-50 active:scale-90"
                    }`}>
                    {cell.getDate()}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setShowCal(null)}
              className="w-full py-4 bg-[#0A0F0D] text-[#00D26A] rounded-2xl font-black text-[10px] uppercase tracking-widest">
              Confirmar Seleção
            </button>
          </div>
        </div>
      )}

      {showSuperInfo && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#0A0F0D]/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 pb-10">
            <div className="w-16 h-1 bg-gray-100 rounded-full mx-auto mb-8" />
            <div className="w-16 h-16 rounded-[2rem] bg-[#0A0F0D] flex items-center justify-center mx-auto mb-6">
              <Star className="w-8 h-8 text-[#00D26A]" />
            </div>
            <h3 className="text-2xl font-black text-[#0A0F0D] text-center uppercase tracking-tighter mb-4 leading-none">Sovereign Protocol</h3>
            <p className="text-center text-xs text-gray-500 font-bold leading-relaxed mb-8">
              Você selecionou o modo institucional. A fee de performance é reduzida para <span className="text-[#00D26A]">1%</span> e o acordo ganha o selo <span className="text-[#0A0F0D] tracking-widest uppercase">Verified Sovereign</span> na rede.
            </p>
            <button
              onClick={() => setShowSuperInfo(false)}
              className="w-full py-5 bg-[#00D26A] text-[#0A0F0D] rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em]">
              Prosseguir
            </button>
          </div>
        </div>
      )}

      {showInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0F0D]/90 backdrop-blur-xl p-8">
          <div className="w-full max-w-sm text-white">
            <button onClick={() => setShowInfo(false)} className="mb-10 text-gray-500 flex items-center gap-2 group">
              <X className="w-5 h-5 group-hover:text-white transition-colors" />
              <span className="text-[10px] font-black uppercase tracking-widest">Fechar</span>
            </button>
            <h3 className="text-3xl font-black tracking-tighter uppercase mb-6 leading-none">Security Protocol</h3>
            <div className="space-y-8">
              {[
                { t: "Oráculo Descentralizado", d: "A performance é medida por APIs oficiais, eliminando fraude humana." },
                { t: "Custódia On-Chain", d: "A garantia é travada em um smart contract até o fim do período." },
                { t: "Liquidação Instantânea", d: "O payout ocorre automaticamente em até 24h após a validação." },
              ].map(i => (
                <div key={i.t}>
                  <p className="text-[10px] font-black text-[#00D26A] uppercase tracking-widest mb-2">{i.t}</p>
                  <p className="text-sm font-bold text-gray-400 leading-relaxed">{i.d}</p>
                </div>
              ))}
            </div>
            <div className="mt-16 pt-8 border-t border-white/10 text-center">
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em]">Don&apos;t trust. Make a True Deal.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
