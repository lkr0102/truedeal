"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Star, Zap, Info, X,
  Lock, Globe, Smartphone, Activity, MapPin, Target, TrendingUp,
  Sparkles, Copy, Check, ChevronLeft, ChevronRight, Calendar,
} from "lucide-react"

// ── Types & data ───────────────────────────────────────────────────────────────

interface DealTypeItem { id: string; name: string; desc: string; kpi: string }
interface Category {
  id: string; label: string; icon: ReactNode; available: boolean; types: DealTypeItem[]
}

const CATEGORIES: Category[] = [
  {
    id: "social", label: "Redes Sociais", icon: <Smartphone className="w-4 h-4" />, available: true,
    types: [
      { id: "social_followers", name: "Seguidores",     desc: "Crescimento total no período", kpi: "Crescimento" },
      { id: "social_posts",     name: "Posts / Vídeos", desc: "Frequência de publicação",     kpi: "Engajamento" },
      { id: "social_views",     name: "Views",           desc: "Alcance das publicações",      kpi: "Alcance"     },
      { id: "social_comments",  name: "Comentários",     desc: "Interações recebidas",         kpi: "Interação"   },
    ],
  },
  {
    id: "fitness", label: "Fitness", icon: <Activity className="w-4 h-4" />, available: true,
    types: [
      { id: "fitness_steps",    name: "Passos diários", desc: "Via Apple Health / Google Fit", kpi: "Atividade"    },
      { id: "fitness_km",       name: "Km percorridos", desc: "Corridas e caminhadas",          kpi: "Distância"    },
      { id: "fitness_workouts", name: "Treinos",         desc: "Sessões de exercício",           kpi: "Consistência" },
      { id: "fitness_calories", name: "Calorias",        desc: "Gasto calórico total",           kpi: "Esforço"      },
    ],
  },
  {
    id: "checkin", label: "Check-in", icon: <MapPin className="w-4 h-4" />, available: true,
    types: [
      { id: "checkin_daily", name: "Presença diária", desc: "Verificação por localização",   kpi: "Local"  },
      { id: "checkin_gym",   name: "Academia",         desc: "Frequência semanal confirmada", kpi: "Rotina" },
    ],
  },
  {
    id: "free", label: "Meta Livre", icon: <Target className="w-4 h-4" />, available: true,
    types: [
      { id: "free_custom", name: "Meta personalizada", desc: "Verificação manual acordada", kpi: "Manual"    },
      { id: "free_photo",  name: "Desafio foto",        desc: "Prova por imagem",            kpi: "Evidência" },
    ],
  },
  {
    id: "onchain", label: "On-chain", icon: <TrendingUp className="w-4 h-4" />, available: false,
    types: [
      { id: "onchain_volume",  name: "Volume DeFi", desc: "Volume de negociação", kpi: "DeFi"  },
      { id: "onchain_holders", name: "Holders",      desc: "Número de holders",   kpi: "Token" },
    ],
  },
]

const DEAL_SUGGESTIONS = [
  { id: "sug1", title: "30 Dias de Post",    category: "social",   type: "social_posts",  desc: "Postar 1x/dia no X por 30 dias",        icon: "📱", defaultPeriod: "1m" },
  { id: "sug2", title: "10k Passos Diários", category: "fitness",  type: "fitness_steps", desc: "10.000 passos todos os dias",             icon: "👟", defaultPeriod: "2w" },
  { id: "sug3", title: "Academia 3x/semana", category: "checkin",  type: "checkin_gym",   desc: "Check-in na academia 3x por semana",      icon: "🏋️", defaultPeriod: "1m" },
  { id: "sug4", title: "Ler 1 Livro/Mês",   category: "free",     type: "free_custom",   desc: "Livro completo por mês com prova",        icon: "📚", defaultPeriod: "1m" },
  { id: "sug5", title: "5k Corrida",         category: "fitness",  type: "fitness_km",    desc: "Correr 5km por semana durante 30 dias",   icon: "🏃", defaultPeriod: "1m" },
  { id: "sug6", title: "Crescer Seguidores", category: "social",   type: "social_followers", desc: "Quem ganha mais seguidores no período", icon: "📈", defaultPeriod: "2w" },
]

const USER_SUPER_DEAL_AVAILABLE = true
const USER_TDPOINTS = 5800

// ── Date helpers ───────────────────────────────────────────────────────────────

const TODAY = new Date(2026, 3, 27)
const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]

function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function addMonths(d: Date, n: number): Date { const r = new Date(d); r.setMonth(r.getMonth() + n); return r }
function fmtShort(d: Date): string { return `${String(d.getDate()).padStart(2,"0")} ${MONTH_NAMES[d.getMonth()]}` }
function isPast(d: Date): boolean {
  const t = new Date(TODAY); t.setHours(0,0,0,0)
  const x = new Date(d); x.setHours(0,0,0,0)
  return x < t
}
function calendarCells(year: number, month: number): (Date | null)[] {
  const total = new Date(year, month + 1, 0).getDate()
  const start = new Date(year, month, 1).getDay()
  const cells: (Date | null)[] = Array(start).fill(null)
  for (let d = 1; d <= total; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}
function sameDay(a: Date, b: Date): boolean {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}

const PERIOD_PRESETS = [
  { id: "1w",  label: "1 sem",   days: 7  },
  { id: "2w",  label: "2 sem",   days: 14 },
  { id: "1m",  label: "1 mês",   days: 30 },
  { id: "2m",  label: "2 meses", days: 60 },
  { id: "custom", label: "Custom", days: 0 },
]

function pillStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? "rgba(22,163,74,0.12)" : "rgba(255,255,255,0.45)",
    color:      active ? "#16A34A"               : "#6B7280",
    border:     active ? "1.5px solid rgba(22,163,74,0.35)" : "1px solid rgba(255,255,255,0.55)",
  }
}

// ── Common fields (shown in both suggestion and custom modes) ──────────────────

function CommonFields({
  privacy, setPrivacy,
  dealMode, setDealMode,
  startPreset, setStartPreset,
  startDate, setStartDate,
  periodPreset, setPeriodPreset,
  endDate, setEndDate,
  superDealCost,
  onShowSuperInfo,
}: {
  privacy: "private" | "public"
  setPrivacy: (v: "private" | "public") => void
  dealMode: "regular" | "super"
  setDealMode: (v: "regular" | "super") => void
  startPreset: string
  setStartPreset: (v: string) => void
  startDate: Date
  setStartDate: (v: Date) => void
  periodPreset: string
  setPeriodPreset: (v: string) => void
  endDate: Date | null
  setEndDate: (v: Date | null) => void
  superDealCost: "free" | "points" | "locked"
  onShowSuperInfo: () => void
}) {
  const [showStartCal, setShowStartCal] = useState(false)
  const [showEndCal, setShowEndCal]     = useState(false)
  const [calMonth, setCalMonth]         = useState(new Date(2026, 3, 1))

  const START_PRESETS = [
    { id: "today",    label: "Hoje",      date: TODAY },
    { id: "tomorrow", label: "Amanhã",    date: addDays(TODAY, 1) },
    { id: "3days",    label: "+3 dias",   date: addDays(TODAY, 3) },
    { id: "custom",   label: "Escolher",  date: null },
  ]

  function pickEndPreset(id: string) {
    setPeriodPreset(id)
    if (id === "custom") { setShowEndCal(true); return }
    const preset = PERIOD_PRESETS.find(p => p.id === id)
    if (preset) setEndDate(addDays(startDate, preset.days))
  }

  function pickStartPreset(id: string) {
    setStartPreset(id)
    const preset = START_PRESETS.find(p => p.id === id)
    if (preset?.date) {
      setStartDate(preset.date)
      if (periodPreset !== "custom" && endDate) {
        const pp = PERIOD_PRESETS.find(p => p.id === periodPreset)
        if (pp) setEndDate(addDays(preset.date, pp.days))
      }
    } else {
      setShowStartCal(true)
    }
  }

  return (
    <div className="space-y-5">
      {/* Privacy */}
      <div>
        <p className="text-sm font-semibold text-gray-600 mb-2">Visibilidade</p>
        <div className="flex gap-2">
          {(["private", "public"] as const).map(v => (
            <button key={v} onClick={() => setPrivacy(v)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all flex-1 justify-center"
              style={pillStyle(privacy === v)}>
              {v === "private" ? <><Lock className="w-3.5 h-3.5" /> Privado</> : <><Globe className="w-3.5 h-3.5" /> Público</>}
            </button>
          ))}
        </div>
      </div>

      {/* Deal mode */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-600">Modalidade</p>
          <button onClick={onShowSuperInfo} className="flex items-center gap-1 text-xs text-[#16A34A]">
            <Info className="w-3.5 h-3.5" /> O que é Super Deal?
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setDealMode("regular")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all flex-1 justify-center"
            style={pillStyle(dealMode === "regular")}>
            <Zap className="w-3.5 h-3.5" /> Regular · 5%
          </button>
          <button
            onClick={() => superDealCost !== "locked" && setDealMode("super")}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all flex-1 justify-center"
            style={{
              background: dealMode === "super" ? "rgba(255,170,0,0.12)" : "rgba(255,255,255,0.45)",
              color:      dealMode === "super" ? "#FFAA00" : superDealCost === "locked" ? "#D1D5DB" : "#6B7280",
              border:     dealMode === "super" ? "1.5px solid rgba(255,170,0,0.4)" : "1px solid rgba(255,255,255,0.55)",
              opacity:    superDealCost === "locked" ? 0.5 : 1,
              cursor:     superDealCost === "locked" ? "not-allowed" : "pointer",
            }}>
            <Star className="w-3.5 h-3.5" /> Super · 1%
            {superDealCost === "free" && <span className="text-[10px] font-bold text-[#3DBF6A]">FREE</span>}
          </button>
        </div>
        {dealMode === "super" && (
          <div className="mt-2 px-3 py-2 rounded-xl flex items-center gap-2"
            style={{ background: "rgba(61,191,106,0.07)", border: "1px solid rgba(61,191,106,0.2)" }}>
            <Star className="w-3.5 h-3.5 text-[#3DBF6A]" />
            <p className="text-xs text-gray-600">Slot gratuito disponível — apenas 1% de taxa ao vencedor.</p>
          </div>
        )}
      </div>

      {/* Period */}
      <div>
        <p className="text-sm font-semibold text-gray-600 mb-2">Período</p>

        {/* Start date */}
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Início</p>
        <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
          {START_PRESETS.map(p => (
            <button key={p.id} onClick={() => pickStartPreset(p.id)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all"
              style={pillStyle(startPreset === p.id)}>
              {p.label}
            </button>
          ))}
        </div>

        {/* End date */}
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Duração</p>
        <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
          {PERIOD_PRESETS.map(p => (
            <button key={p.id} onClick={() => pickEndPreset(p.id)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all"
              style={pillStyle(periodPreset === p.id)}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Start → End summary */}
        <div className="flex gap-3">
          <div className="flex-1 p-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.6)" }}>
            <p className="text-[10px] font-bold text-gray-400 mb-0.5">INÍCIO</p>
            <p className="text-sm font-bold text-gray-800">{fmtShort(startDate)}</p>
          </div>
          <div className="flex items-center text-gray-300 text-lg">→</div>
          <div className="flex-1 p-3 rounded-xl cursor-pointer transition-all"
            onClick={() => setShowEndCal(true)}
            style={{ background: endDate ? "rgba(22,163,74,0.08)" : "rgba(255,255,255,0.5)", border: endDate ? "1.5px solid rgba(22,163,74,0.3)" : "1px solid rgba(255,255,255,0.6)" }}>
            <p className="text-[10px] font-bold text-gray-400 mb-0.5">FIM</p>
            <p className="text-sm font-bold" style={{ color: endDate ? "#16A34A" : "#D1D5DB" }}>
              {endDate ? fmtShort(endDate) : "Selecionar"}
            </p>
          </div>
        </div>
      </div>

      {/* Start date calendar */}
      {showStartCal && (
        <CalendarSheet
          selected={startDate}
          calMonth={calMonth}
          setCalMonth={setCalMonth}
          onPick={(d) => { setStartDate(d); setStartPreset("custom"); setShowStartCal(false) }}
          onClose={() => setShowStartCal(false)}
        />
      )}

      {/* End date calendar */}
      {showEndCal && (
        <CalendarSheet
          selected={endDate}
          calMonth={calMonth}
          setCalMonth={setCalMonth}
          onPick={(d) => { setEndDate(d); setPeriodPreset("custom"); setShowEndCal(false) }}
          onClose={() => setShowEndCal(false)}
        />
      )}
    </div>
  )
}

// ── Calendar sheet ─────────────────────────────────────────────────────────────

function CalendarSheet({
  selected, calMonth, setCalMonth, onPick, onClose
}: {
  selected: Date | null
  calMonth: Date
  setCalMonth: (d: Date) => void
  onPick: (d: Date) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div className="w-full rounded-t-3xl px-5 pt-5 pb-8"
        style={{ background: "rgba(255,255,255,0.98)" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
            className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.05)" }}>
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <p className="font-bold text-gray-800">
            {["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][calMonth.getMonth()]} {calMonth.getFullYear()}
          </p>
          <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
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
            const past = isPast(date)
            const isSel = selected ? sameDay(date, selected) : false
            const isToday = sameDay(date, TODAY)
            return (
              <button key={i} onClick={() => !past && onPick(date)} disabled={past}
                className="flex items-center justify-center h-9 w-9 mx-auto rounded-full text-sm transition-all"
                style={{
                  background: isSel ? "#16A34A" : isToday ? "rgba(22,163,74,0.1)" : "transparent",
                  color: isSel ? "white" : past ? "#D1D5DB" : isToday ? "#16A34A" : "#374151",
                  fontWeight: isSel || isToday ? "700" : "400",
                  cursor: past ? "not-allowed" : "pointer",
                }}>
                {date.getDate()}
              </button>
            )
          })}
        </div>
        <button onClick={onClose} className="w-full mt-5 py-3 rounded-2xl font-semibold text-[#16A34A] text-sm"
          style={{ background: "rgba(22,163,74,0.07)", border: "1px solid rgba(22,163,74,0.15)" }}>
          Fechar
        </button>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CreateDealPage() {
  const router = useRouter()

  // Tab
  const [useSuggestion, setUseSuggestion] = useState(true)
  const [customDeal, setCustomDeal]       = useState(false)

  // Suggestion selection
  const [selectedSug, setSelectedSug] = useState<string | null>(null)

  // Custom category/type
  const [activeCat, setActiveCat]   = useState("social")
  const [selected, setSelected]     = useState<string | null>(null)

  // Common fields
  const [privacy,      setPrivacy]      = useState<"private" | "public">("private")
  const [dealMode,     setDealMode]     = useState<"regular" | "super">("regular")
  const [startPreset,  setStartPreset]  = useState("today")
  const [startDate,    setStartDate]    = useState<Date>(TODAY)
  const [periodPreset, setPeriodPreset] = useState("1m")
  const [endDate,      setEndDate]      = useState<Date | null>(addMonths(TODAY, 1))

  const [showSuperInfo, setShowSuperInfo] = useState(false)

  const currentCat = CATEGORIES.find(c => c.id === activeCat)!
  const superDealCost: "free" | "points" | "locked" = USER_SUPER_DEAL_AVAILABLE ? "free" : USER_TDPOINTS >= 5000 ? "points" : "locked"

  const isReady = useSuggestion ? !!selectedSug : !!selected

  function handleContinue() {
    if (!isReady) return
    const sug = DEAL_SUGGESTIONS.find(s => s.id === selectedSug)
    sessionStorage.setItem("dealDraft", JSON.stringify({
      privacy,
      dealMode,
      startDate: startDate.toISOString(),
      endDate: endDate?.toISOString() ?? null,
      selectedType: useSuggestion ? sug?.type ?? null : selected,
      category: useSuggestion ? sug?.category ?? "free" : activeCat,
      sugTitle: sug?.title ?? null,
    }))
    router.push("/configure")
  }

  const commonProps = {
    privacy, setPrivacy,
    dealMode, setDealMode,
    startPreset, setStartPreset,
    startDate, setStartDate,
    periodPreset, setPeriodPreset,
    endDate, setEndDate,
    superDealCost,
    onShowSuperInfo: () => setShowSuperInfo(true),
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ backgroundImage: "url('/images/gradient-background.jpg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundAttachment: "fixed" }}>

      {/* Header */}
      <header className="px-5 pt-12 pb-3">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Voltar</span>
        </button>
      </header>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 pb-4">
        <div className="w-8 h-2 rounded-full" style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)" }} />
        <div className="w-8 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.4)" }} />
      </div>

      {/* Body */}
      <div className="flex-1 px-5 pb-32 overflow-y-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Novo Deal</h1>
        <p className="text-sm text-gray-500 mb-5">Passo 1 de 2 — Tipo e período</p>

        {/* Tab toggle */}
        <div className="flex gap-1 p-1 rounded-2xl mb-6"
          style={{ background: "rgba(255,255,255,0.35)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.5)" }}>
          <button
            onClick={() => { setUseSuggestion(true); setCustomDeal(false) }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300"
            style={{ background: useSuggestion ? "linear-gradient(135deg,#16A34A,#22C55E)" : "transparent", color: useSuggestion ? "white" : "#6B7280" }}>
            <Sparkles className="w-4 h-4" /> Sugestões
          </button>
          <button
            onClick={() => { setCustomDeal(true); setUseSuggestion(false) }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300"
            style={{ background: customDeal ? "linear-gradient(135deg,#4A4AFF,#7B7BFF)" : "transparent", color: customDeal ? "white" : "#6B7280" }}>
            <Copy className="w-4 h-4" /> Personalizar
          </button>
        </div>

        {/* ── Sugestões ── */}
        {useSuggestion && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-3">Escolha um modelo</p>
              <div className="grid grid-cols-2 gap-2">
                {DEAL_SUGGESTIONS.map((sug) => (
                  <button key={sug.id}
                    onClick={() => setSelectedSug(sug.id)}
                    className="p-3.5 rounded-2xl text-left transition-all active:scale-[0.97]"
                    style={{
                      background:    selectedSug === sug.id ? "rgba(22,163,74,0.1)" : "rgba(255,255,255,0.5)",
                      backdropFilter:"blur(20px)",
                      border:        selectedSug === sug.id ? "1.5px solid rgba(22,163,74,0.4)" : "1px solid rgba(255,255,255,0.55)",
                    }}>
                    <span className="text-2xl mb-1.5 block">{sug.icon}</span>
                    <p className="font-bold text-gray-800 text-sm leading-tight mb-0.5">{sug.title}</p>
                    <p className="text-[11px] text-gray-500 leading-snug">{sug.desc}</p>
                    {selectedSug === sug.id && (
                      <div className="mt-2 flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)" }}>
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                        <span className="text-[10px] font-bold text-[#16A34A]">Selecionado</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">Configurações do deal</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <CommonFields {...commonProps} />
          </div>
        )}

        {/* ── Personalizar ── */}
        {customDeal && (
          <div className="space-y-5">
            {/* Category tabs */}
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-3">Categoria</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => { setActiveCat(cat.id); setSelected(null) }}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all"
                    style={{
                      background: activeCat === cat.id ? (cat.available ? "rgba(22,163,74,0.12)" : "rgba(0,0,0,0.06)") : "rgba(255,255,255,0.45)",
                      color:      activeCat === cat.id ? (cat.available ? "#16A34A" : "#9CA3AF") : (cat.available ? "#6B7280" : "#9CA3AF"),
                      border:     activeCat === cat.id ? (cat.available ? "1.5px solid rgba(22,163,74,0.35)" : "1px solid rgba(0,0,0,0.1)") : "1px solid rgba(255,255,255,0.5)",
                      opacity:    !cat.available && activeCat !== cat.id ? 0.6 : 1,
                    }}>
                    {cat.icon}
                    {cat.label}
                    {!cat.available && <span className="text-[9px] font-bold text-gray-400">EM BREVE</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Deal type grid */}
            {currentCat.available ? (
              <div className="grid grid-cols-2 gap-3">
                {currentCat.types.map(type => (
                  <button key={type.id} onClick={() => setSelected(type.id)}
                    className="p-4 rounded-2xl text-left transition-all active:scale-[0.97]"
                    style={{
                      background:    selected === type.id ? "rgba(22,163,74,0.12)" : "rgba(255,255,255,0.5)",
                      backdropFilter:"blur(20px)",
                      border:        selected === type.id ? "1.5px solid rgba(22,163,74,0.4)" : "1px solid rgba(255,255,255,0.55)",
                    }}>
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-gray-800 text-sm leading-tight">{type.name}</p>
                      {selected === type.id && (
                        <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ml-1"
                          style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)" }}>
                          <span className="text-white text-[8px] font-bold">✓</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed mb-2.5">{type.desc}</p>
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(22,163,74,0.09)", color: "#16A34A" }}>{type.kpi}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.3)", border: "1px dashed rgba(200,200,200,0.5)" }}>
                <p className="text-sm font-semibold text-gray-400 text-center mb-1">Em breve</p>
                <p className="text-xs text-gray-400 text-center mb-4">Esta categoria estará disponível em breve.</p>
                <div className="grid grid-cols-2 gap-2 opacity-40 pointer-events-none">
                  {currentCat.types.map(type => (
                    <div key={type.id} className="p-3 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.4)" }}>
                      <p className="font-semibold text-gray-600 text-xs mb-1">{type.name}</p>
                      <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(0,0,0,0.06)", color: "#9CA3AF" }}>{type.kpi}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">Configurações do deal</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <CommonFields {...commonProps} />
          </div>
        )}
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4"
        style={{ background: "linear-gradient(to top,rgba(255,255,255,0.92) 60%,transparent 100%)", backdropFilter: "blur(12px)" }}>
        {isReady && endDate && (
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-xs text-gray-500">
              {useSuggestion
                ? DEAL_SUGGESTIONS.find(s => s.id === selectedSug)?.title
                : `${currentCat.label} · ${CATEGORIES.flatMap(c => c.types).find(t => t.id === selected)?.name}`}
            </span>
            <span className="text-xs font-bold" style={{ color: dealMode === "super" ? "#FFAA00" : "#16A34A" }}>
              {dealMode === "super" ? "Super · 1%" : "Regular · 5%"}
            </span>
          </div>
        )}
        <button onClick={handleContinue} disabled={!isReady || !endDate}
          className={`w-full py-4 rounded-2xl font-semibold text-white transition-all duration-300 ${isReady && endDate ? "active:scale-[0.98]" : "opacity-40 cursor-not-allowed"}`}
          style={{
            background: !isReady || !endDate
              ? "linear-gradient(135deg,#16A34A,#22C55E)"
              : dealMode === "super"
              ? "linear-gradient(135deg,#FFAA00,#FF6B00)"
              : "linear-gradient(135deg,#16A34A,#22C55E)",
            boxShadow: isReady && endDate
              ? dealMode === "super" ? "0 8px 32px rgba(255,170,0,0.4)" : "0 8px 32px rgba(22,163,74,0.4)"
              : "none",
          }}>
          {!endDate ? "Defina o período →" : "Continuar →"}
        </button>
      </div>

      {/* Super Deal info sheet */}
      {showSuperInfo && (
        <div className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowSuperInfo(false)}>
          <div className="w-full rounded-t-3xl p-6 pb-10"
            style={{ background: "rgba(255,255,255,0.97)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                <h2 className="text-lg font-bold text-gray-800">Super Deal</h2>
              </div>
              <button onClick={() => setShowSuperInfo(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.06)" }}>
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              {[
                { badge: "1%",  bg: "rgba(61,191,106,0.12)", color: "#3DBF6A", title: "Taxa reduzida de 1%",     desc: "Deals regulares cobram 5%. Super Deals cobram apenas 1% — mais dinheiro vai ao vencedor." },
                { badge: "1",   bg: "rgba(22,163,74,0.1)",   color: "#16A34A", title: "1 gratuito por conta",   desc: "Cada usuário tem 1 Super Deal ativo por vez. Quando encerrar, o slot volta automaticamente." },
                { badge: "★",   bg: "rgba(255,170,0,0.12)",  color: "#FFAA00", title: "Extra com TDPoints",     desc: "Slot em uso? Crie outro Super Deal gastando 5.000 TDPoints." },
              ].map(row => (
                <div key={row.badge} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: row.bg }}>
                    <span className="font-bold text-sm" style={{ color: row.color }}>{row.badge}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{row.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{row.desc}</p>
                  </div>
                </div>
              ))}
              <div className="p-3 rounded-xl" style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)" }}>
                <p className="text-xs text-gray-600">
                  <span className="font-semibold text-[#16A34A]">Seu status: </span>
                  {USER_SUPER_DEAL_AVAILABLE ? "✅ Slot gratuito disponível" : `Slot em uso · ${USER_TDPOINTS.toLocaleString("pt-BR")} TDP`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
