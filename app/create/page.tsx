"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Lock, Globe, ChevronLeft, ChevronRight, ChevronDown,
  Plus, Minus, Check, Info, X, AlertCircle, ShieldCheck,
} from "lucide-react"
import { createDeal } from "@/lib/actions/deals"
import type { DealCategory, DealType } from "@/lib/supabase/types"
import { useLanguageStore, t, type Language } from "@/lib/i18n"

// ── Data ──────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "social",   label: "cat_social",   icon: "📣", available: true  },
  { id: "fitness",  label: "cat_fitness",  icon: "🏃", available: true  },
  { id: "gaming",   label: "cat_gaming",   icon: "🎮", available: false },
  { id: "learning", label: "cat_learning", icon: "📚", available: false },
  { id: "onchain",  label: "cat_onchain",  icon: "⛓", available: false },
  { id: "free",     label: "cat_free",     icon: "✨", available: false },
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

const RULES: Record<string, { id: string; label: string; desc: string; descEn: string; available: boolean }[]> = {
  x: [
    { id: "post",       label: "Post diário",  desc: "Postar qualquer conteúdo no X uma vez por dia", descEn: "Post any content on X once a day",   available: true  },
    { id: "engagement", label: "Engagement",   desc: "Atingir meta de curtidas/reposts",              descEn: "Reach likes/reposts goal",            available: false },
  ],
  strava: [
    { id: "km_run",   label: "Distância acumulada", desc: "Correr X km durante o período",               descEn: "Run X km during the period",               available: true  },
    { id: "activity", label: "Frequência",           desc: "Registrar X atividades na semana",             descEn: "Register X activities per week",            available: false },
  ],
  wellhub: [
    { id: "checkin", label: "Check-in diário", desc: "Fazer check-in na academia via Wellhub",   descEn: "Check-in at the gym via Wellhub",   available: true },
  ],
  totalpass: [
    { id: "checkin", label: "Check-in diário", desc: "Fazer check-in na academia via TotalPass", descEn: "Check-in at the gym via TotalPass", available: true },
  ],
}

const FREQUENCIES = [
  { id: "daily",   label: "Dia",    labelEn: "Day" },
  { id: "weekly",  label: "Semana", labelEn: "Week" },
  { id: "monthly", label: "Mês",    labelEn: "Month" },
  { id: "yearly",  label: "Ano",    labelEn: "Year" },
]

const AMOUNT_PRESETS = [25, 50, 100, 200, 500]

const CHANNEL_LABELS: Record<string, string> = {
  x: "X (Twitter)", instagram: "Instagram", tiktok: "TikTok", linkedin: "LinkedIn",
  discord: "Discord", youtube: "YouTube", strava: "Strava", wellhub: "Wellhub", totalpass: "TotalPass",
}

const DISTRIBUTION_TYPES = [
  { id: "proportional", label: "Proporcional", labelEn: "Proportional", icon: "🤝", desc: "Pote final dividido entre todos que cumprirem o acordo.", descEn: "Final pot divided among all who comply.", available: true  },
  { id: "top3",         label: "Ranking",       labelEn: "Ranking",      icon: "🏅", desc: "1º 60% · 2º 30% · 3º 10% do pote",                       descEn: "1st 60% · 2nd 30% · 3rd 10% of pot", available: false },
  { id: "winner",       label: "1º Lugar",      labelEn: "1st Place",    icon: "👑", desc: "Winner takes all",                                        descEn: "Winner takes all", available: false },
]

const PERIOD_PRESETS = [
  { id: "1w", label: "1 sem",    labelEn: "1 wk",  days: 7  },
  { id: "2w", label: "2 sem",    labelEn: "2 wk",  days: 14 },
  { id: "1m", label: "1 mês",    labelEn: "1 mo",  days: 30 },
  { id: "2m", label: "2 meses",  labelEn: "2 mo",  days: 60 },
]

function getRuleSubrules(lang: Language): Record<string, { title: string; items: string[]; hint?: string }> {
  return {
    post: {
      title: lang === "pt" ? "Regras do post verificado" : "Verified post rules",
      items: lang === "pt" ? [
        "Conta pública no X no momento da verificação",
        "Mínimo de 100 caracteres por post",
        "Conteúdo original — o DealGuard usa análise semântica para rejeitar repetições",
        "Posts deletados antes da verificação não são contabilizados",
      ] : [
        "Public X account at the time of verification",
        "Minimum 100 characters per post",
        "Original content — DealGuard uses semantic analysis to reject duplicates",
        "Posts deleted before verification are not counted",
      ],
      hint: lang === "pt" ? "🔍 Qualidade importa tanto quanto quantidade" : "🔍 Quality matters as much as quantity",
    },
    follower_gained: {
      title: lang === "pt" ? "Regras — Seguidores recebidos" : "Rules — Followers gained",
      items: lang === "pt" ? [
        "Baseline registrada no início do deal (start_snapshot)",
        "DealGuard calcula o ganho líquido em cada janela (novos − perdidos)",
        "Requisito é sobre ganho líquido por janela, não total acumulado",
        "Conta deve permanecer pública durante todo o período",
      ] : [
        "Baseline recorded at deal start (start_snapshot)",
        "DealGuard calculates net gain per window (new − lost)",
        "Requirement is net gain per window, not cumulative total",
        "Account must remain public throughout the period",
      ],
    },
    impressions: {
      title: lang === "pt" ? "Regras — Impressões" : "Rules — Impressions",
      items: lang === "pt" ? [
        "Total de impressões das publicações feitas dentro da janela",
        "Impressões de publicações anteriores ao deal não contam",
        "Verificado via API da plataforma com access token do participante",
      ] : [
        "Total impressions from posts published within the frequency window",
        "Impressions from pre-deal posts are not counted",
        "Verified via platform API using the participant's access token",
      ],
    },
    comment_received: {
      title: lang === "pt" ? "Regras — Comentários recebidos" : "Rules — Comments received",
      items: lang === "pt" ? [
        "Total de comentários recebidos nas publicações da janela",
        "O DealGuard filtra comentários spam ou automatizados",
        "Conta deve permanecer pública durante todo o período",
      ] : [
        "Total comments received on posts published within the window",
        "DealGuard filters spam or automated comments",
        "Account must remain public throughout the period",
      ],
    },
    repost_received: {
      title: lang === "pt" ? "Regras — Reposts recebidos" : "Rules — Reposts received",
      items: lang === "pt" ? [
        "Total de reposts recebidos nas publicações da janela",
        "Auto-reposts do próprio participante não contam",
        "Verificado via API da plataforma com access token do participante",
      ] : [
        "Total reposts received on posts published within the window",
        "Self-reposts by the participant do not count",
        "Verified via platform API using the participant's access token",
      ],
    },
    km_run: {
      title: lang === "pt" ? "Regras — Kms percorridos" : "Rules — Kms run",
      items: lang === "pt" ? [
        "Apenas atividades com tipo Corrida (Run) são contabilizadas",
        "Distâncias de todas as corridas da janela são somadas",
        "DealGuard valida via API do Strava com o access token do participante",
        "Atividades manuais sem GPS podem ser desconsideradas",
      ] : [
        "Only Run-type activities are counted",
        "All run distances within the window are summed",
        "DealGuard validates via Strava API using the participant's access token",
        "Manual activities without GPS may be disregarded",
      ],
      hint: lang === "pt" ? "🏃 Registre suas corridas normalmente no Strava" : "🏃 Record your runs normally in Strava",
    },
    pace: {
      title: lang === "pt" ? "Regras — Pace médio" : "Rules — Average pace",
      items: lang === "pt" ? [
        "DealGuard calcula o pace médio das corridas na janela (min/km)",
        "Condição: pace_médio ≤ pace configurado pelo criador",
        "Quanto menor o valor, mais rápido (ex: 5:30 é mais rápido que 6:00)",
        "Exemplo: criador configura 6:00 → 5:45 cumpre; 6:10 não cumpre",
      ] : [
        "DealGuard calculates average pace of runs in the window (min/km)",
        "Compliance: avg_pace ≤ pace configured by creator",
        "Lower value means faster (5:30 is faster than 6:00)",
        "Example: creator sets 6:00 → 5:45 passes; 6:10 fails",
      ],
      hint: lang === "pt" ? "⏱ Pace mais baixo = você correu mais rápido" : "⏱ Lower pace = you ran faster",
    },
    workout_hours: {
      title: lang === "pt" ? "Regras — Horas de exercício" : "Rules — Workout hours",
      items: lang === "pt" ? [
        "Tempo total de atividades no Strava durante a janela",
        "Todas as modalidades contam (não apenas corrida)",
        "Medido em horas — ex: 1h30 = 1,5",
        "DealGuard valida via API do Strava",
      ] : [
        "Total workout time recorded on Strava during the window",
        "All activity types count (not just running)",
        "Measured in hours — e.g., 1h30 = 1.5",
        "DealGuard validates via Strava API",
      ],
    },
    checkin: {
      title: lang === "pt" ? "Como funciona — Check-in em Academia" : "How it works — Gym Check-in",
      items: lang === "pt" ? [
        "Check-in presencial em academia parceira Wellhub ou TotalPass",
        "Verificação automática via API — sem ação manual necessária",
        "Apenas academias credenciadas na rede parceira são aceitas",
        "Prazo: até 23h59 (horário de Brasília) de cada janela",
        "Máximo 1 check-in válido por dia — múltiplos não acumulam",
      ] : [
        "In-person check-in at a Wellhub or TotalPass partner gym",
        "Automatic verification via API — no manual action required",
        "Only credentialed partner network gyms are accepted",
        "Deadline: by 11:59 PM (Brasília time) of each window",
        "Max 1 valid check-in per day — multiple at same location don't stack",
      ],
      hint: lang === "pt" ? "📍 Basta fazer check-in pelo Wellhub ou TotalPass — sincronizamos automaticamente" : "📍 Just check in via Wellhub or TotalPass — we sync automatically",
    },
    different_venues: {
      title: lang === "pt" ? "Regras — Ambientes diferentes" : "Rules — Different venues",
      items: lang === "pt" ? [
        "Número de academias ou espaços distintos visitados na janela",
        "Mesmo local múltiplas vezes = 1 ambiente único",
        "Apenas locais credenciados na rede Wellhub ou TotalPass",
      ] : [
        "Number of distinct gyms or venues visited within the window",
        "Visiting the same location multiple times counts as 1 venue",
        "Only credentialed Wellhub or TotalPass network locations",
      ],
      hint: lang === "pt" ? "🏋️ Varie as academias para acumular ambientes diferentes" : "🏋️ Switch gyms to stack different venues",
    },
  }
}

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
function getSharedRules(ids: string[], lang: Language): { id: string; label: string; desc: string; descEn: string; available: boolean }[] {
  if (ids.length === 0) return []
  if (ids.length === 1) return RULES[ids[0]] ?? []
  // Multiple channels: union of all rules (no duplicate ids)
  const seen = new Set<string>()
  const result: { id: string; label: string; desc: string; descEn: string; available: boolean }[] = []
  for (const id of ids) {
    for (const r of RULES[id] ?? []) {
      if (!seen.has(r.id)) { seen.add(r.id); result.push(r) }
    }
  }
  return result
}

// ── Section block ─────────────────────────────────────────────────────────────

function SectionBlock({
  icon, iconBg, title, sub, children,
}: {
  icon: React.ReactNode; iconBg: string; title: string; sub?: string; children: React.ReactNode
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg }}
        >
          {icon}
        </div>
        <div>
          <p className="text-[13px] font-bold text-gray-800">{title}</p>
          {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CreateDealPage() {
  const router = useRouter()
  const { language } = useLanguageStore()

  // ── State ──
  const [name,    setName]    = useState("")
  const [privacy, setPrivacy] = useState<"private" | "public">("private")

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
  const [calMonth,     setCalMonth]     = useState(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))

  const [amount,       setAmount]       = useState(50)
  const [isCustomAmt,  setIsCustomAmt]  = useState(false)
  const [customAmtStr, setCustomAmtStr] = useState("")
  const [distribution, setDistribution] = useState("proportional")

  const [screen,          setScreen]          = useState<1 | 2>(1)
  const [subrulesOpen,    setSubrulesOpen]    = useState(true)
  const [dealguardOpen,   setDealguardOpen]   = useState(false)
  const [complianceOpen,  setComplianceOpen]  = useState(false)
  const [showInfo,        setShowInfo]        = useState(false)
  const [showPrivacyInfo, setShowPrivacyInfo] = useState<"private" | "public" | null>(null)
  const [isSubmitting,  setIsSubmitting]  = useState(false)
  const [submitError,   setSubmitError]   = useState<string | null>(null)
  const [missingSocial, setMissingSocial] = useState<string[] | null>(null)

  // ── Derived ──
  const channels        = category ? (CHANNELS[category] ?? []) : []
  const availableRules  = getSharedRules(selectedChannels, language)
  const effectiveAmount = isCustomAmt ? (parseFloat(customAmtStr) || 0) : amount
  const feeRate         = 3
  const diffDays        = Math.round((endDate.getTime() - startDate.getTime()) / 86400000)

  const channelLabel = selectedChannels.length === 1
    ? (channels.find(c => c.id === selectedChannels[0])?.label ?? null)
    : selectedChannels.length > 1
    ? selectedChannels.map(id => channels.find(c => c.id === id)?.label ?? id).join(` ${fitnessConnector.toUpperCase()} `)
    : null

  const ruleLabel  = rule      ? (availableRules.find(r => r.id === rule)?.label ?? rule) : null
  const freqLabel  = frequency ? (FREQUENCIES.find(f => f.id === frequency)?.[language === "pt" ? "label" : "labelEn"] ?? frequency) : null

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
      category:              category as DealCategory,
      verification_type:     rule ?? "",
      verification_channels: selectedChannels,
      rule_target:           quantity,
      rule_frequency:        frequency ?? "daily",
      entry_amount:          effectiveAmount,
      distribution:          distribution as "winner" | "top3" | "proportional",
      payment_method:        "pix",
      max_participants:      100,
      allow_requests:        true,
      start_date:            startDate.toISOString().split("T")[0],
      end_date:              endDate.toISOString().split("T")[0],
    })
    setIsSubmitting(false)
    if (result.error) {
      if (result.error.startsWith("MISSING_SOCIAL:")) {
        const channels = result.error.replace("MISSING_SOCIAL:", "").split(",").filter(Boolean)
        setMissingSocial(channels)
        return
      }
      setSubmitError(result.error)
      return
    }
    setScreen(1)
    router.push("/")
  }

  // ── Confirmation rows ──
  const ruleWithFreqLabel = [
    ruleLabel && quantity ? `${quantity} × ${ruleLabel}` : ruleLabel,
    freqLabel,
  ].filter(Boolean).join(" · ")

  const confirmRows = [
    {
      icon: "🛡️", iconBg: "rgba(22,163,74,0.1)",
      key: language === "pt" ? "Regra" : "Rule",
      val: channelLabel ? `${channelLabel} · ${ruleWithFreqLabel || "—"}` : ruleWithFreqLabel || "—",
    },
    {
      icon: "📅", iconBg: "rgba(239,68,68,0.08)",
      key: language === "pt" ? "Período" : "Period",
      val: `${fmtShort(startDate)} 00h GMT-3 → ${fmtShort(endDate)} (${t("date_days", language, { count: diffDays })})`,
    },
    {
      icon: "💰", iconBg: "rgba(22,163,74,0.1)",
      key: language === "pt" ? "Financeiro" : "Financial",
      val: effectiveAmount > 0 ? `R$${effectiveAmount}/${language === "pt" ? "pessoa" : "person"} · ${DISTRIBUTION_TYPES.find(d => d.id === distribution)?.[language === "pt" ? "label" : "labelEn"]}` : "—",
    },
  ]

  const reviewSubrules = rule ? getRuleSubrules(language)[rule] ?? null : null

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
          transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.35s",
          pointerEvents: screen === 1 ? "auto" : "none",
        }}
      >
        {/* Header */}
        <header className="px-5 pt-12 pb-3 flex items-center justify-between flex-shrink-0">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">{language === "pt" ? "Voltar" : "Back"}</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.25)" }}>
              <span className="text-xs font-bold text-[#16A34A]">{language === "pt" ? "Taxa" : "Fee"} · 3%</span>
            </div>
            <button
              onClick={() => setShowInfo(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.2)", color: "#16A34A" }}
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 px-5 pb-32">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">{t("create_title", language)}</h1>
          <p className="text-sm text-gray-500 mb-6">{t("create_subtitle", language)}</p>

          {/* ── 1. Nome ── */}
          <SectionBlock icon={<span className="text-base">✏️</span>} iconBg="rgba(22,163,74,0.1)" title={t("create_name_label", language)} sub={language === "pt" ? "Mínimo 3 caracteres" : "Minimum 3 characters"}>
            <input
              type="text" value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t("create_name_placeholder", language)}
              className="w-full p-4 rounded-xl outline-none text-gray-800 placeholder-gray-400 text-sm"
              style={{
                background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)",
                border: name.length === 0 ? "1px solid rgba(255,255,255,0.6)"
                      : name.length < 3   ? "2px solid rgba(255,80,80,0.35)"
                      : "2px solid rgba(22,163,74,0.35)",
              }}
            />
            {name.length > 0 && name.length < 3 && (
              <p className="text-xs text-red-400 mt-1 ml-1">{language === "pt" ? "Mínimo 3 caracteres" : "Minimum 3 characters"}</p>
            )}
          </SectionBlock>

          {/* ── 2. Categoria ── */}
          <SectionBlock icon={<span className="text-base">🗂️</span>} iconBg="rgba(22,163,74,0.1)" title={t("create_category_title", language)} sub={t("create_category_sub", language)}>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.id}
                  onClick={() => cat.available && selectCategory(cat.id)}
                  disabled={!cat.available}
                  className="relative py-3 px-2 rounded-xl text-center transition-all"
                  style={{
                    background: category === cat.id ? "rgba(22,163,74,0.08)" : "rgba(255,255,255,0.5)",
                    border: category === cat.id ? "1.5px solid #16A34A" : "1.5px solid rgba(0,0,0,0.07)",
                    opacity: !cat.available ? 0.5 : 1,
                    cursor: !cat.available ? "default" : "pointer",
                  }}>
                  {!cat.available && (
                    <span
                      className="absolute top-1 right-1.5 text-[7px] font-bold uppercase tracking-wide"
                      style={{ background: "rgba(0,0,0,0.06)", color: "#9CA3AF", padding: "1px 4px", borderRadius: 4 }}>
                      {t("badge_soon", language)}
                    </span>
                  )}
                  <div className="text-2xl mb-1">{cat.icon}</div>
                  <p className="text-[11px] font-semibold" style={{ color: category === cat.id ? "#16A34A" : "#374151" }}>
                    {t(cat.label, language)}
                  </p>
                </button>
              ))}
            </div>
          </SectionBlock>

          {/* ── 4. Canal ── */}
          {category && channels.length > 0 && (
            <SectionBlock
              icon={<span className="text-base">📡</span>}
              iconBg="rgba(22,163,74,0.1)"
              title={t("create_channel_title", language)}
              sub={category === "fitness" ? (language === "pt" ? "Selecione um ou mais canais" : "Select one or more channels") : (language === "pt" ? "Plataforma de verificação" : "Verification platform")}
            >
              <div className="space-y-2">
                {channels.map((ch, idx) => {
                  const isSelected   = selectedChannels.includes(ch.id)
                  const prevCh       = channels[idx - 1]
                  const prevSelected = prevCh && selectedChannels.includes(prevCh.id)
                  const showConnector = category === "fitness" && idx > 0 && isSelected && prevSelected

                  return (
                    <div key={ch.id}>
                      {showConnector && (
                        <div className="flex items-center gap-2 my-1 mx-1">
                          <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.08)" }} />
                          <div
                            className="flex overflow-hidden"
                            style={{ borderRadius: 100, border: "1.5px solid rgba(22,163,74,0.25)", background: "rgba(255,255,255,0.6)" }}>
                            {(["e", "ou"] as const).map(opt => (
                              <button key={opt}
                                onClick={() => setFitnessConnector(opt)}
                                className="px-4 py-1 text-[10px] font-bold uppercase tracking-wide"
                                style={{
                                  background: fitnessConnector === opt ? "#16A34A" : "transparent",
                                  color: fitnessConnector === opt ? "white" : "#9CA3AF",
                                  border: "none", cursor: "pointer",
                                }}>
                                {opt === "e" ? (language === "pt" ? "E" : "AND") : (language === "pt" ? "OU" : "OR")}
                              </button>
                            ))}
                          </div>
                          <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.08)" }} />
                        </div>
                      )}
                      <button
                        onClick={() => ch.available && toggleChannel(ch.id)}
                        disabled={!ch.available}
                        className="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all"
                        style={{
                          background: isSelected ? "rgba(22,163,74,0.08)" : "rgba(255,255,255,0.5)",
                          border: isSelected ? "1.5px solid #16A34A" : "1.5px solid rgba(0,0,0,0.07)",
                          opacity: !ch.available ? 0.5 : 1,
                          cursor: !ch.available ? "default" : "pointer",
                        }}>
                        <div
                          className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0"
                          style={{ background: ch.color }}>
                          <span className="text-white text-[11px] font-bold">{CHANNEL_ICONS[ch.id]}</span>
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold text-gray-800">{ch.label}</p>
                          {!ch.available && <p className="text-[10px] text-gray-400">Em breve</p>}
                        </div>
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{
                            background: isSelected ? "#16A34A" : "transparent",
                            border: isSelected ? "none" : "1.5px solid rgba(0,0,0,0.12)",
                          }}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
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
            <SectionBlock icon={<span className="text-base">📋</span>} iconBg="rgba(168,85,247,0.1)" title={language === "pt" ? "Regra" : "Rule"} sub={language === "pt" ? "O que será medido e verificado" : "What will be measured and verified"}>
              <div className="space-y-1.5">
                {availableRules.map(r => (
                  <button key={r.id}
                    onClick={() => r.available && setRule(r.id)}
                    disabled={!r.available}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all"
                    style={{
                      background: rule === r.id ? "rgba(22,163,74,0.07)" : "rgba(255,255,255,0.5)",
                      border: rule === r.id ? "1.5px solid #16A34A" : "1.5px solid rgba(0,0,0,0.07)",
                      opacity: !r.available ? 0.55 : 1,
                      cursor: !r.available ? "default" : "pointer",
                    }}>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-800">{r.label}</p>
                        {!r.available && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(0,0,0,0.06)", color: "#9CA3AF" }}>
                            {t("badge_soon", language)}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium">{language === "pt" ? r.desc : r.descEn}</p>
                    </div>
                    {r.available && rule === r.id && <Check className="w-4 h-4 text-[#16A34A] flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </SectionBlock>
          )}

          {/* ── 6. Meta (Qtd + Frequência) ── */}
          {rule && (
            <SectionBlock icon={<span className="text-base">🎯</span>} iconBg="rgba(59,130,246,0.1)" title={t("create_meta_title", language)} sub={t("create_meta_sub", language)}>
              <div className="p-4 rounded-xl mb-3"
                style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.7)" }}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">
                  {rule === "pace" ? t("meta_pace_label", language) : t("meta_qty_label", language)}
                </p>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => { const n = Math.max(1, quantity - 1); setQuantity(n); setQtyStr(String(n)) }}
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(22,163,74,0.12)", color: "#16A34A" }}>
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number" value={qtyStr} min={1}
                    onChange={e => handleQtyChange(e.target.value)}
                    className="w-16 text-center text-2xl font-black text-gray-800 rounded-xl outline-none py-2"
                    style={{ background: "rgba(255,255,255,0.8)", border: "1.5px solid rgba(22,163,74,0.3)" }}
                  />
                  <button
                    onClick={() => { const n = quantity + 1; setQuantity(n); setQtyStr(String(n)) }}
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(22,163,74,0.12)", color: "#16A34A" }}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                {FREQUENCIES.map(f => (
                  <button key={f.id}
                    onClick={() => setFrequency(f.id)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: frequency === f.id ? "rgba(22,163,74,0.12)" : "rgba(255,255,255,0.5)",
                      border: frequency === f.id ? "1.5px solid rgba(22,163,74,0.4)" : "1.5px solid rgba(0,0,0,0.07)",
                      color: frequency === f.id ? "#16A34A" : "#6B7280",
                    }}>
                    {language === "pt" ? f.label : f.labelEn}
                  </button>
                ))}
              </div>
              {rule === "pace" && (
                <p className="text-[11px] text-amber-600 mt-2 text-center font-semibold">
                  {t("meta_pace_help", language)}
                </p>
              )}
              {frequency && (
                <div className="mt-3 p-3 rounded-xl"
                  style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.18)" }}>
                  <p className="text-[11px] text-red-600 font-semibold leading-relaxed">
                    ⚠️ {t("meta_warning", language)}
                  </p>
                </div>
              )}
            </SectionBlock>
          )}

          {/* ── 7. Período ── */}
          <SectionBlock icon={<span className="text-base">📅</span>} iconBg="rgba(239,68,68,0.08)" title={t("create_period_title", language)} sub={t("create_period_sub", language)}>
            <div className="flex gap-2 mb-3 flex-wrap">
              {PERIOD_PRESETS.map(p => (
                <button key={p.id}
                  onClick={() => selectPreset(p.id)}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: periodPreset === p.id ? "rgba(22,163,74,0.12)" : "rgba(255,255,255,0.5)",
                    border: periodPreset === p.id ? "1.5px solid rgba(22,163,74,0.4)" : "1.5px solid rgba(0,0,0,0.07)",
                    color: periodPreset === p.id ? "#16A34A" : "#6B7280",
                  }}>
                  {language === "pt" ? p.label : p.labelEn}
                </button>
              ))}
            </div>
            <div className="flex gap-3 items-stretch">
              <button
                onClick={() => { setShowCal("start"); setCalMonth(new Date(startDate.getFullYear(), startDate.getMonth(), 1)) }}
                className="flex-1 p-3.5 rounded-xl text-left transition-all active:scale-95"
                style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.8)" }}>
                <p className="text-[9px] font-bold text-gray-400 tracking-wider uppercase">{t("date_start", language)}</p>
                <p className="text-base font-bold text-gray-800 mt-0.5">{fmtShort(startDate)}</p>
              </button>
              <div className="flex items-center px-1">
                <span className="text-sm font-bold text-gray-400">{t("date_days", language, { count: diffDays })}</span>
              </div>
              <button
                onClick={() => { setShowCal("end"); setCalMonth(new Date(endDate.getFullYear(), endDate.getMonth(), 1)) }}
                className="flex-1 p-3.5 rounded-xl text-right transition-all active:scale-95"
                style={{ background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.25)" }}>
                <p className="text-[9px] font-bold text-[#16A34A] tracking-wider uppercase">{t("date_end", language)}</p>
                <p className="text-base font-bold text-[#16A34A] mt-0.5">{fmtShort(endDate)}</p>
              </button>
            </div>
            <div className="mt-3 p-3 rounded-xl flex items-center gap-2.5"
              style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)" }}>
              <span className="text-lg flex-shrink-0">⏰</span>
              <div>
                <p className="text-[11px] font-bold text-[#16A34A]">{t("date_auto_start", language)}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {fmtFull(startDate)} · {t("date_timezone", language)}
                </p>
              </div>
            </div>
          </SectionBlock>

          {/* ── 8. Pagamento ── */}
          <SectionBlock icon={<span className="text-base">💸</span>} iconBg="rgba(22,163,74,0.1)" title={t("create_pay_title", language)} sub={t("create_pay_sub", language)}>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {AMOUNT_PRESETS.map(v => (
                <button key={v}
                  onClick={() => { setAmount(v); setIsCustomAmt(false) }}
                  className="py-4 px-2 rounded-[14px] text-center transition-all"
                  style={{
                    background: !isCustomAmt && amount === v ? "rgba(22,163,74,0.08)" : "rgba(255,255,255,0.5)",
                    border: !isCustomAmt && amount === v ? "1.5px solid #16A34A" : "1.5px solid rgba(0,0,0,0.08)",
                    boxShadow: !isCustomAmt && amount === v ? "0 4px 14px rgba(22,163,74,0.15)" : "none",
                  }}>
                  <p className="text-[18px] font-black"
                    style={{ color: !isCustomAmt && amount === v ? "#16A34A" : "#1f2937" }}>
                    R${v}
                  </p>
                  <p className="text-[9px] text-gray-400">{t("pay_per_person", language)}</p>
                </button>
              ))}
              <button
                onClick={() => setIsCustomAmt(true)}
                className="py-4 px-2 rounded-[14px] text-center transition-all"
                style={{
                  background: isCustomAmt ? "rgba(22,163,74,0.08)" : "rgba(255,255,255,0.5)",
                  border: isCustomAmt ? "1.5px solid #16A34A" : "1.5px solid rgba(0,0,0,0.08)",
                }}>
                <p className="text-[18px] font-black" style={{ color: isCustomAmt ? "#16A34A" : "#1f2937" }}>{t("pay_other", language)}</p>
                <p className="text-[9px] text-gray-400">{t("pay_custom", language)}</p>
              </button>
            </div>

            {isCustomAmt && (
              <div className="mb-4 relative">
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
                  <p className="text-xs text-red-400 mt-1 ml-1">{t("err_min_val", language)}</p>
                )}
              </div>
            )}

            {effectiveAmount >= 10 && (
              <div className="mb-4 p-4 rounded-[14px] flex items-center gap-3"
                style={{
                  background: "linear-gradient(135deg, rgba(22,163,74,0.06), rgba(34,197,94,0.04))",
                  border: "1px solid rgba(22,163,74,0.15)",
                }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(22,163,74,0.12)" }}>
                  <span className="text-lg">💰</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{t("pay_pot_estimate", language)}</p>
                  <p className="text-xl font-black text-[#16A34A]">
                    R${(effectiveAmount * 10).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            )}

            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{t("pay_prize_title", language)}</p>
            <div className="space-y-2">
              {DISTRIBUTION_TYPES.map(d => (
                <button key={d.id}
                  onClick={() => d.available && setDistribution(d.id)}
                  disabled={!d.available}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all"
                  style={{
                    background: !d.available ? "rgba(255,255,255,0.3)" : distribution === d.id ? "rgba(22,163,74,0.07)" : "rgba(255,255,255,0.5)",
                    border: !d.available ? "1.5px solid rgba(0,0,0,0.05)" : distribution === d.id ? "1.5px solid #16A34A" : "1.5px solid rgba(0,0,0,0.07)",
                    opacity: !d.available ? 0.55 : 1,
                    cursor: !d.available ? "default" : "pointer",
                  }}>
                  <span className="text-xl flex-shrink-0">{d.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800">{d.label}</p>
                      {!d.available && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(0,0,0,0.06)", color: "#9CA3AF" }}>
                          {t("badge_soon", language)}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{d.desc}</p>
                  </div>
                  {d.available && distribution === d.id && <Check className="w-4 h-4 text-[#16A34A] flex-shrink-0" />}
                </button>
              ))}
            </div>
          </SectionBlock>

          {/* ── 9. Visibilidade ── */}
          <SectionBlock icon={<span className="text-base">👁️</span>} iconBg="rgba(107,114,128,0.1)" title={t("create_visibility_title", language)} sub={t("create_visibility_sub", language)}>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">{t("create_visibility_label", language)}</span>
            <div className="flex gap-2 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.5)" }}>
              <button
                onClick={() => setPrivacy("private")}
                className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${privacy === "private" ? "text-white" : "text-gray-500"}`}
                style={{ background: privacy === "private" ? "linear-gradient(135deg,#16A34A,#22C55E)" : "transparent" }}
              >
                <Lock className="w-4 h-4" />
                <div className="text-left">
                  <p className="text-xs font-bold">{t("priv_private", language)}</p>
                  <p className="text-[9px] opacity-60 font-medium leading-none mt-0.5">{t("priv_private_desc", language)}</p>
                </div>
              </button>
              <button
                onClick={() => setPrivacy("public")}
                className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${privacy === "public" ? "text-white" : "text-gray-500"}`}
                style={{ background: privacy === "public" ? "linear-gradient(135deg,#16A34A,#22C55E)" : "transparent" }}
              >
                <Globe className="w-4 h-4" />
                <div className="text-left">
                  <p className="text-xs font-bold">{t("priv_public", language)}</p>
                  <p className="text-[9px] opacity-60 font-medium leading-none mt-0.5">{t("priv_public_desc", language)}</p>
                </div>
              </button>
            </div>
          </SectionBlock>

          <div className="mt-6">
            <button
              onClick={() => isValid && setScreen(2)}
              disabled={!isValid}
              className={`w-full py-4 rounded-2xl font-bold text-white text-sm transition-all duration-300 ${isValid ? "active:scale-[0.98]" : "opacity-40 cursor-not-allowed"}`}
              style={{
                background: "linear-gradient(135deg,#16A34A,#22C55E)",
                boxShadow: isValid ? "0 8px 32px rgba(22,163,74,0.4)" : "none",
                letterSpacing: "0.04em",
              }}
            >
              {t("btn_review", language)}
            </button>
            {!isValid && (
              <p className="text-center text-xs text-gray-400 mt-2">
                {t("err_fields", language)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Screen 2 (Confirmação) ────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 flex flex-col overflow-y-auto"
        style={{
          transform: screen === 2 ? "translateX(0)" : "translateX(100%)",
          opacity: screen === 2 ? 1 : 0,
          transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.35s",
          pointerEvents: screen === 2 ? "auto" : "none",
        }}
      >
        {/* Header */}
        <header className="px-5 pt-12 pb-3 flex-shrink-0 flex items-center justify-between">
          <button onClick={() => setScreen(1)} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.5)" }}>
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1 text-center pr-10">
            <h1 className="text-xl font-bold text-gray-800">{t("create_title", language)}</h1>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">{t("create_subtitle", language)}</p>
          </div>
        </header>

        <div className="flex-1 px-5 pb-8">
          <div
            className="rounded-[22px] p-5 mb-6 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #0D2E1A, #16A34A 55%, #22C55E)",
              boxShadow: "0 14px 40px rgba(22,163,74,0.42)",
              color: "white",
            }}>
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full"
              style={{ background: "rgba(255,255,255,0.06)" }} />
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">
                    {t("deal_label", language)}
                  </p>
                  <h2 className="text-xl font-bold leading-tight">{name || t("deal_no_name", language)}</h2>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}>
                  {privacy === "private"
                    ? <Lock className="w-3.5 h-3.5 text-white" />
                    : <Globe className="w-3.5 h-3.5 text-white" />}
                  <span className="text-white text-[10px] font-bold uppercase tracking-wide">
                    {privacy === "private" ? t("priv_private", language) : t("priv_public", language)}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: t("stat_entry", language),    value: effectiveAmount > 0 ? `R$${effectiveAmount}` : "—" },
                  { label: language === "pt" ? "Regra" : "Rule", value: ruleWithFreqLabel || "—" },
                  { label: t("stat_duration", language),  value: t("date_days", language, { count: diffDays }) },
                  { label: t("stat_prize", language),     value: DISTRIBUTION_TYPES.find(d => d.id === distribution)?.label ?? "—" },
                ].map(stat => (
                  <div key={stat.label} className="p-2.5 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
                    <p className="text-[9px] opacity-70 uppercase tracking-wider">{stat.label}</p>
                    <p className="text-base font-bold mt-0.5">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Compact info rows */}
          <div className="rounded-xl overflow-hidden mb-3"
            style={{ background: "rgba(255,255,255,0.48)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)" }}>
            {confirmRows.map((row, i, arr) => (
              <div key={row.key}
                className="flex items-center gap-3 px-3.5 py-2.5"
                style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                <span className="text-sm flex-shrink-0">{row.icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 w-16 flex-shrink-0">{row.key}</span>
                <span className="text-[12px] font-semibold text-gray-800 flex-1 min-w-0 truncate">{row.val}</span>
              </div>
            ))}
          </div>

          {/* Subrules — collapsible, starts open */}
          {reviewSubrules && (
            <div className="mb-3 rounded-2xl overflow-hidden"
              style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.18)" }}>
              <button
                onClick={() => setSubrulesOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3"
                style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
              >
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                  {reviewSubrules.title}
                </p>
                {subrulesOpen
                  ? <ChevronDown className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  : <ChevronRight className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
              </button>
              {subrulesOpen && (
                <div className="px-4 pb-4" style={{ borderTop: "1px solid rgba(59,130,246,0.12)" }}>
                  <ul className="space-y-2 pt-3">
                    {reviewSubrules.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[12px] text-gray-700 leading-relaxed">
                        <span className="text-blue-400 mt-0.5 flex-shrink-0 font-bold">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  {reviewSubrules.hint && (
                    <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(59,130,246,0.15)" }}>
                      <p className="text-[11px] text-amber-600 font-semibold leading-relaxed">{reviewSubrules.hint}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* DealGuard — collapsible, starts closed, green */}
          <div className="mb-3 rounded-2xl overflow-hidden"
            style={{ background: "rgba(22,163,74,0.05)", border: "1px solid rgba(22,163,74,0.22)" }}>
            <button
              onClick={() => setDealguardOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3"
              style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest">
                  {language === "pt" ? "Verificação dupla — DealGuard Engine" : "Double verification — DealGuard Engine"}
                </p>
              </div>
              {dealguardOpen
                ? <ChevronDown className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                : <ChevronRight className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
            </button>
            {dealguardOpen && (
              <div className="px-4 pb-4" style={{ borderTop: "1px solid rgba(22,163,74,0.15)" }}>
                <div className="space-y-3 pt-3">
                  {[
                    {
                      step: "1",
                      label: language === "pt" ? "Coleta automática via API" : "Automatic API collection",
                      desc: language === "pt"
                        ? "O DealGuard conecta diretamente nas plataformas e extrai os dados brutos de cada participante ao final de cada janela."
                        : "DealGuard connects directly to platforms and pulls raw data from each participant at the end of each window.",
                    },
                    {
                      step: "2",
                      label: language === "pt" ? "Análise Sentinel (IA)" : "Sentinel analysis (AI)",
                      desc: language === "pt"
                        ? "Uma camada de IA analisa as evidências em busca de padrões suspeitos. Resultados com risco alto são marcados e excluídos da premiação."
                        : "An AI layer reviews the evidence for suspicious patterns. High-risk results are flagged and excluded from the prize pool.",
                    },
                  ].map(({ step, label, desc }) => (
                    <div key={step} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: "rgba(22,163,74,0.12)", border: "1px solid rgba(22,163,74,0.25)" }}>
                        <span style={{ fontSize: 10, fontWeight: 900, color: "#16A34A" }}>{step}</span>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-green-700 mb-0.5">{label}</p>
                        <p className="text-[11px] text-gray-600 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-green-600 mt-3 font-semibold" style={{ borderTop: "1px solid rgba(22,163,74,0.15)", paddingTop: 10 }}>
                  {language === "pt"
                    ? "✓ Só após essa verificação dupla o resultado é finalizado e os fundos liberados."
                    : "✓ Only after this double verification is the result finalized and funds released."}
                </p>
              </div>
            )}
          </div>

          {/* Compliance — collapsible, starts closed */}
          <div className="mb-6 rounded-2xl overflow-hidden"
            style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.22)" }}>
            <button
              onClick={() => setComplianceOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3"
              style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
            >
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                📋 {language === "pt" ? "Como funciona o cumprimento" : "How compliance works"}
              </p>
              {complianceOpen
                ? <ChevronDown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                : <ChevronRight className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
            </button>
            {complianceOpen && (
              <div className="px-4 pb-4" style={{ borderTop: "1px solid rgba(245,158,11,0.15)" }}>
                <p className="text-[12px] text-gray-700 leading-relaxed mb-3 pt-3">
                  {language === "pt"
                    ? "Seu desempenho é avaliado janela por janela — não apenas no final. Para ser vencedor, você precisa atingir a meta em cada janela do período."
                    : "Performance is evaluated window by window — not just at the end. To win, you need to hit the goal in every window of the period."}
                </p>
                <div className="rounded-xl overflow-hidden mb-3" style={{ border: "1px solid rgba(245,158,11,0.2)" }}>
                  <div className="px-3 py-2" style={{ background: "rgba(245,158,11,0.08)" }}>
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">
                      {language === "pt" ? "Exemplo: 5 posts/semana · 4 semanas" : "Example: 5 posts/week · 4 weeks"}
                    </p>
                  </div>
                  {[
                    { window: language === "pt" ? "Semana 1" : "Week 1", value: "5 posts", ok: true },
                    { window: language === "pt" ? "Semana 2" : "Week 2", value: "5 posts", ok: true },
                    { window: language === "pt" ? "Semana 3" : "Week 3", value: "5 posts", ok: true },
                    { window: language === "pt" ? "Semana 4" : "Week 4", value: language === "pt" ? "4 posts — abaixo" : "4 posts — below", ok: false },
                  ].map(({ window, value, ok }) => (
                    <div key={window}
                      className="flex items-center justify-between px-3 py-2"
                      style={{ borderTop: "1px solid rgba(245,158,11,0.1)", background: ok ? "transparent" : "rgba(239,68,68,0.04)" }}>
                      <span className="text-[11px] text-gray-500">{window}</span>
                      <span className="text-[11px] font-semibold" style={{ color: ok ? "#6B7280" : "#EF4444" }}>{value}</span>
                      <span className="text-[11px] font-bold" style={{ color: ok ? "#16A34A" : "#EF4444" }}>{ok ? "✓" : "✗"}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  {language === "pt"
                    ? "O bom desempenho das semanas anteriores não compensa uma janela abaixo da meta."
                    : "Strong performance in previous windows does not make up for a window below the goal."}
                </p>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl mb-4"
            style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)" }}>
            <p className="text-xs text-gray-600 leading-relaxed">
              {t("fee_disclaimer", language, { rate: feeRate })}
            </p>
          </div>

          {submitError && <p className="text-xs text-red-500 text-center mb-3">{submitError}</p>}

          <div className="mt-4 mb-12">
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm transition-all active:scale-[0.98] disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg,#16A34A,#22C55E)",
                boxShadow: "0 8px 32px rgba(22,163,74,0.4)",
                letterSpacing: "0.04em",
              }}
            >
              {isSubmitting ? t("btn_processing", language) : t("btn_pay_start", language)}
            </button>
          </div>
        </div>
      </div>

      {/* ── Calendar ─────────────────────────────────────────────────────────── */}
      {showCal && (
        <div className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowCal(null)}>
          <div className="w-full rounded-t-3xl px-5 pt-5 pb-8"
            style={{ background: "rgba(255,255,255,0.98)" }}
            onClick={e => e.stopPropagation()}>
            <p className="text-sm font-bold text-center text-gray-800 mb-4">
              {showCal === "start" ? (language === "pt" ? "Data de início" : "Start date") : (language === "pt" ? "Data de fim" : "End date")}
            </p>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.05)" }}>
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <p className="font-bold text-gray-800">
                {language === "pt" ? MONTH_NAMES[calMonth.getMonth()] : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][calMonth.getMonth()]} {calMonth.getFullYear()}
              </p>
              <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.05)" }}>
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="grid grid-cols-7 mb-2">
              {(language === "pt" ? ["D","S","T","Q","Q","S","S"] : ["S","M","T","W","T","F","S"]).map((d, i) => (
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
            {showCal === "start" && (
              <div className="mt-4 p-2.5 rounded-xl text-center"
                style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.12)" }}>
                <p className="text-[10px] text-[#16A34A] font-semibold">
                  ⏰ {language === "pt" ? "O deal inicia automaticamente às 00h (Brasília, GMT-3) do dia selecionado" : "The deal starts automatically at 00h (Brasília, GMT-3) on the selected day"}
                </p>
              </div>
            )}
            <button onClick={() => setShowCal(null)}
              className="w-full mt-5 py-3 rounded-2xl font-semibold text-[#16A34A] text-sm"
              style={{ background: "rgba(22,163,74,0.07)", border: "1px solid rgba(22,163,74,0.15)" }}>
              {language === "pt" ? "Fechar" : "Close"}
            </button>
          </div>
        </div>
      )}

      {/* ── Info sheet ────────────────────────────────────────────────────────── */}
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
                <h3 className="text-base font-bold text-gray-800">{language === "pt" ? "Como funciona" : "How it works"}</h3>
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
                <p className="text-xs font-bold text-[#16A34A] mb-1.5">💸 {language === "pt" ? `Taxa de ${feeRate}% — só se houver perdedor` : `Fee of ${feeRate}% — only if there's a loser`}</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {language === "pt" 
                    ? "A taxa é cobrada apenas se algum participante não cumprir o desafio. Se todos cumprirem, o valor integral é devolvido a cada um."
                    : "The fee is charged only if a participant does not meet the challenge. If everyone complies, the full amount is returned to each one."}
                </p>
              </div>
              <div className="p-4 rounded-2xl"
                style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}>
                <p className="text-xs font-bold text-blue-500 mb-1.5">👥 {language === "pt" ? "Mínimo de 2 participantes" : "Minimum of 2 participants"}</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {language === "pt"
                    ? "Para o deal entrar em vigor, pelo menos 2 participantes precisam confirmar antes do prazo."
                    : "For the deal to take effect, at least 2 participants must confirm before the deadline."}
                </p>
              </div>
              <div className="p-4 rounded-2xl"
                style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <p className="text-xs font-bold text-red-500 mb-1.5">⚠️ {language === "pt" ? "Regra estrita por janela de frequência" : "Strict rule per frequency window"}</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {language === "pt"
                    ? "O participante precisa cumprir a meta em cada janela do período configurado. Uma janela perdida = eliminação permanente, mesmo que tenha cumprido todas as outras."
                    : "The participant must meet the goal in each window of the configured period. A missed window = permanent elimination, even if they met all others."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Missing social account popup ──────────────────────────────────────── */}
      {missingSocial && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={() => setMissingSocial(null)}
        >
          <div
            className="w-full rounded-t-3xl px-5 pt-5 pb-10"
            style={{ background: "rgba(255,255,255,0.98)", boxShadow: "0 -16px 64px rgba(0,0,0,0.2)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-base font-bold text-gray-800">
                  {language === "pt" ? "Conta não vinculada" : "Account not linked"}
                </h3>
              </div>
              <button
                onClick={() => setMissingSocial(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.06)" }}
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="rounded-2xl p-4 mb-5" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
              <p className="text-sm text-red-700 font-semibold mb-1">
                {language === "pt"
                  ? `Para criar um deal com ${missingSocial.map(ch => CHANNEL_LABELS[ch] ?? ch).join(" + ")}, você precisa vincular sua conta primeiro.`
                  : `To create a deal with ${missingSocial.map(ch => CHANNEL_LABELS[ch] ?? ch).join(" + ")}, you need to link your account first.`}
              </p>
              <p className="text-xs text-red-500 leading-relaxed">
                {language === "pt"
                  ? "O app usa sua conta para verificar automaticamente se você cumpriu o desafio."
                  : "The app uses your account to automatically verify if you met the challenge."}
              </p>
            </div>

            <div className="space-y-2">
              {missingSocial.map(ch => (
                <div key={ch} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.07)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white"
                    style={{ background: ch === "x" ? "#000" : ch === "strava" ? "#FC4C02" : ch === "wellhub" ? "#00A651" : ch === "totalpass" ? "#0047AB" : "#6B7280" }}>
                    {ch === "x" ? "𝕏" : ch === "strava" ? "S" : ch === "wellhub" ? "W" : ch === "totalpass" ? "TP" : ch[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{CHANNEL_LABELS[ch] ?? ch}</p>
                    <p className="text-xs text-gray-400">{language === "pt" ? "Não vinculado" : "Not linked"}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => router.push("/profile")}
              className="w-full mt-5 py-4 rounded-2xl font-bold text-white text-sm"
              style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)", boxShadow: "0 8px 32px rgba(22,163,74,0.35)" }}
            >
              {language === "pt" ? "Conectar conta agora" : "Connect account now"}
            </button>
            <button
              onClick={() => setMissingSocial(null)}
              className="w-full mt-2.5 py-3 rounded-2xl font-semibold text-gray-500 text-sm"
              style={{ background: "rgba(0,0,0,0.04)" }}
            >
              {language === "pt" ? "Cancelar" : "Cancel"}
            </button>
          </div>
        </div>
      )}

      {/* ── Privacy info sheet ────────────────────────────────────────────────── */}
      {showPrivacyInfo && (
        <div className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowPrivacyInfo(null)}>
          <div className="w-full rounded-t-3xl px-5 pt-5 pb-8"
            style={{ background: "rgba(255,255,255,0.98)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                {showPrivacyInfo === "private"
                  ? <Lock className="w-4 h-4 text-gray-700" />
                  : <Globe className="w-4 h-4 text-[#16A34A]" />}
                <h3 className="text-base font-bold text-gray-800">
                  {showPrivacyInfo === "private" 
                    ? (language === "pt" ? "Deal Privado" : "Private Deal") 
                    : (language === "pt" ? "Deal Público" : "Public Deal")}
                </h3>
              </div>
              <button onClick={() => setShowPrivacyInfo(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.06)" }}>
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {showPrivacyInfo === "private" ? (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl"
                  style={{ background: "rgba(107,114,128,0.06)", border: "1px solid rgba(107,114,128,0.15)" }}>
                  <p className="text-xs font-bold text-gray-700 mb-1.5">🔒 {language === "pt" ? "Acesso por aprovação do criador" : "Access by creator approval"}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {language === "pt"
                      ? "Qualquer usuário pode ver o deal e solicitar participação — mas só o criador pode aceitar ou recusar cada entrada."
                      : "Any user can see the deal and request participation — but only the creator can accept or reject each entry."}
                  </p>
                </div>
                <div className="p-4 rounded-2xl"
                  style={{ background: "rgba(107,114,128,0.06)", border: "1px solid rgba(107,114,128,0.15)" }}>
                  <p className="text-xs font-bold text-gray-700 mb-1.5">🔗 {language === "pt" ? "Link de compartilhamento" : "Sharing link"}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {language === "pt"
                      ? "O link permite que qualquer pessoa encontre e solicite entrar no deal, mas a participação só é confirmada após a aprovação do criador."
                      : "The link allows anyone to find and request to enter the deal, but participation is only confirmed after the creator's approval."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl"
                  style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)" }}>
                  <p className="text-xs font-bold text-[#16A34A] mb-1.5">🌐 {language === "pt" ? "Acesso livre" : "Free access"}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {language === "pt"
                      ? "Qualquer usuário pode entrar no deal diretamente, sem precisar de aprovação. O deal aparece na listagem pública do app."
                      : "Any user can enter the deal directly, without needing approval. The deal appears in the app's public listing."}
                  </p>
                </div>
                <div className="p-4 rounded-2xl"
                  style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)" }}>
                  <p className="text-xs font-bold text-[#16A34A] mb-1.5">🔗 {language === "pt" ? "Link de compartilhamento" : "Sharing link"}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {language === "pt"
                      ? "Quem acessar o link entra diretamente no deal, sem etapas de aprovação."
                      : "Anyone who accesses the link enters the deal directly, without approval steps."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
