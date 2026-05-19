"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronLeft, ChevronRight, ChevronDown,
  Plus, Minus, Check, Info, X, AlertCircle, ShieldCheck, Lock, Globe,
} from "lucide-react"
import { createDeal } from "@/lib/actions/deals"
import type { DealCategory, DealType } from "@/lib/supabase/types"
import { useLanguageStore, t, type Language } from "@/lib/i18n"

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: "#F0F3F0", surface: "#FFFFFF", surface2: "#E8EDE8",
  border: "#D8E0D8", border2: "#E6EEE6",
  text: "#0B1309", mid: "#4E614E", dim: "#8BA09A",
  brand: "#00B852", brandDark: "#008C3E", forming: "#E8620A",
  activeLight: "rgba(0,184,82,0.08)", activeBorder: "rgba(0,184,82,0.2)",
} as const

// ── Data ──────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "social",   label: "cat_social",   desc: "Consistência em redes sociais",   descEn: "Consistency on social media",  icon: "📱", available: true  },
  { id: "fitness",  label: "cat_fitness",  desc: "Atividades físicas e corridas",   descEn: "Fitness activities and runs",  icon: "🏃", available: true  },
  { id: "gaming",   label: "cat_gaming",   desc: "Conquistas e rankings",           descEn: "Achievements and rankings",    icon: "🎮", available: false },
  { id: "learning", label: "cat_learning", desc: "Streaks de aprendizado",          descEn: "Learning streaks",             icon: "📚", available: false },
  { id: "onchain",  label: "cat_onchain",  desc: "Atividade na blockchain",         descEn: "On-chain activity",            icon: "⛓", available: false },
  { id: "free",     label: "cat_free",     desc: "Personalizado com prova digital", descEn: "Custom with digital proof",    icon: "✨", available: false },
]

const CHANNELS: Record<string, { id: string; label: string; desc: string; descEn: string; available: boolean; color: string }[]> = {
  social: [
    { id: "x",         label: "X (Twitter)", desc: "Posts e crescimento de seguidores",    descEn: "Posts and follower growth",          available: true,  color: "#000000" },
    { id: "instagram", label: "Instagram",   desc: "Fotos, reels e alcance",               descEn: "Photos, reels and reach",            available: false, color: "#E1306C" },
    { id: "tiktok",    label: "TikTok",      desc: "Vídeos e alcance",                     descEn: "Videos and reach",                   available: false, color: "#ff0050" },
    { id: "linkedin",  label: "LinkedIn",    desc: "Posts e conexões profissionais",       descEn: "Posts and professional connections", available: false, color: "#0077B5" },
    { id: "discord",   label: "Discord",     desc: "Mensagens e atividade em servidor",    descEn: "Server messages and activity",       available: false, color: "#5865F2" },
    { id: "youtube",   label: "YouTube",     desc: "Vídeos e crescimento de inscritos",    descEn: "Videos and subscriber growth",       available: false, color: "#FF0000" },
  ],
  fitness: [
    { id: "strava",    label: "Strava",    desc: "Km corridos, horas de exercício e pace", descEn: "Km run, workout hours and pace",   available: true,  color: "#FC4C02" },
    { id: "wellhub",   label: "Wellhub",   desc: "Check-ins em academias parceiras",       descEn: "Check-ins at partner gyms",        available: true,  color: "#00A878" },
    { id: "totalpass", label: "TotalPass", desc: "Check-ins em academias parceiras",       descEn: "Check-ins at partner gyms",        available: true,  color: "#FF6B35" },
  ],
}

const CHANNEL_ICONS: Record<string, string> = {
  x: "𝕏", instagram: "IG", tiktok: "TK", linkedin: "in",
  discord: "D", youtube: "▶", strava: "S", wellhub: "W", totalpass: "T",
}

const RULES: Record<string, { id: string; label: string; labelEn: string; desc: string; descEn: string; available: boolean }[]> = {
  x: [
    { id: "post",             label: "Quantidade de posts",       labelEn: "Post count",           desc: "Publicar pelo menos N posts por janela de frequência",            descEn: "Publish at least N posts per frequency window",         available: true  },
    { id: "follower_gained",  label: "Seguidores recebidos",      labelEn: "Followers gained",     desc: "Ganhar N seguidores líquidos por janela (novos − perdidos)",      descEn: "Gain N net followers per window (new − lost)",          available: false },
    { id: "impressions",      label: "Impressões",                labelEn: "Impressions",          desc: "Atingir N impressões totais nas publicações da janela",           descEn: "Reach N total impressions on posts within the window",  available: true  },
    { id: "repost_received",  label: "Reposts recebidos",         labelEn: "Reposts received",     desc: "Receber N reposts nas publicações da janela",                     descEn: "Receive N reposts on posts within the window",          available: false },
    { id: "comment_received", label: "Comentários recebidos",     labelEn: "Comments received",    desc: "Receber N comentários nas publicações da janela",                 descEn: "Receive N comments on posts within the window",         available: false },
  ],
  strava: [
    { id: "km_run",        label: "Kms corridos",       labelEn: "Km run",        desc: "Correr pelo menos N km durante a janela (apenas atividades Run)",  descEn: "Run at least N km during the window (Run activities only)",   available: true  },
    { id: "pace",          label: "Pace médio",          labelEn: "Average pace",  desc: "Manter pace médio ≤ ao configurado pelo criador por janela",      descEn: "Keep average pace ≤ configured by creator per window",        available: false },
    { id: "workout_hours", label: "Horas de exercício", labelEn: "Workout hours", desc: "Registrar N horas de atividade no Strava por janela",             descEn: "Log N hours of activity in Strava per window",               available: false },
  ],
  wellhub: [
    { id: "checkin",          label: "Check-in diário",      labelEn: "Daily check-in",   desc: "Fazer N check-ins em academia parceira Wellhub por janela",  descEn: "Do N check-ins at a Wellhub partner gym per window",   available: true  },
    { id: "different_venues", label: "Ambientes diferentes", labelEn: "Different venues", desc: "Visitar N academias distintas via Wellhub por janela",       descEn: "Visit N different Wellhub gyms per window",           available: false },
  ],
  totalpass: [
    { id: "checkin",          label: "Check-in diário",      labelEn: "Daily check-in",   desc: "Fazer N check-ins em academia parceira TotalPass por janela", descEn: "Do N check-ins at a TotalPass partner gym per window",  available: true  },
    { id: "different_venues", label: "Ambientes diferentes", labelEn: "Different venues", desc: "Visitar N academias distintas via TotalPass por janela",     descEn: "Visit N different TotalPass gyms per window",          available: false },
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
  { id: "proportional", label: "Proporcional", labelEn: "Proportional", desc: "Vencedores dividem igualmente o pool dos perdedores", descEn: "Winners split the losers' pool equally", available: true  },
  { id: "top3",         label: "Top 3",        labelEn: "Top 3",        desc: "60% · 30% · 10% para o pódio",                       descEn: "60% · 30% · 10% for the podium",         available: false },
  { id: "winner",       label: "Winner Takes All", labelEn: "Winner Takes All", desc: "100% para o melhor colocado",             descEn: "100% for the top performer",             available: false },
]

const PERIOD_PRESETS = [
  { id: "1w", label: "1 sem",   labelEn: "1 wk",  days: 7  },
  { id: "2w", label: "2 sem",   labelEn: "2 wk",  days: 14 },
  { id: "1m", label: "1 mês",   labelEn: "1 mo",  days: 30 },
  { id: "2m", label: "2 meses", labelEn: "2 mo",  days: 60 },
]

function getRuleSubrules(lang: Language): Record<string, { title: string; items: string[]; hint?: string }> {
  return {
    post: {
      title: lang === "pt" ? "Sub-regras automáticas · X posts" : "Automatic sub-rules · X posts",
      items: lang === "pt" ? [
        "A conta X deve estar pública no momento da verificação",
        "O post deve ter mais de 100 caracteres",
        "Conteúdo único no período — sem posts idênticos ou semanticamente iguais (verificado por IA)",
        "Reposts e quotes não contam como post válido",
        "Posts publicados antes da data de início não são contados",
        "Posts deletados antes da auditoria são considerados não publicados",
      ] : [
        "Public X account at the time of verification",
        "Minimum 100 characters per post",
        "Unique content per period — no identical or semantically similar posts (AI-verified)",
        "Reposts and quotes do not count as valid posts",
        "Posts published before the start date are not counted",
        "Posts deleted before the audit are considered unpublished",
      ],
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
      title: lang === "pt" ? "Sub-regras · Kms percorridos" : "Sub-rules · Km run",
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
      title: lang === "pt" ? "Sub-regras · Check-in em Academia" : "Sub-rules · Gym Check-in",
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
function getSharedRules(ids: string[], _lang: Language): { id: string; label: string; labelEn: string; desc: string; descEn: string; available: boolean }[] {
  if (ids.length === 0) return []
  if (ids.length === 1) return RULES[ids[0]] ?? []
  const seen = new Set<string>()
  const result: { id: string; label: string; labelEn: string; desc: string; descEn: string; available: boolean }[] = []
  for (const id of ids) {
    for (const r of RULES[id] ?? []) {
      if (!seen.has(r.id)) { seen.add(r.id); result.push(r) }
    }
  }
  return result
}

// ── Step indicator ─────────────────────────────────────────────────────────────

function Stepper({ step, lang }: { step: 1|2|3|4; lang: Language }) {
  const labels = lang === "pt"
    ? ["Tipo", "Canal", "Regras", "Revisão"]
    : ["Type", "Channel", "Rules", "Review"]
  return (
    <div style={{ display: "flex", alignItems: "flex-start", padding: "0 20px 18px", gap: 0 }}>
      {labels.map((label, i) => {
        const n = (i + 1) as 1|2|3|4
        const done   = n < step
        const active = n === step
        return (
          <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1, position: "relative" }}>
            {i < labels.length - 1 && (
              <div style={{
                position: "absolute", top: 13, left: "50%", width: "100%", height: 2, zIndex: 0,
                background: done ? C.brand : active ? `linear-gradient(90deg,${C.brand},${C.border})` : C.border,
              }} />
            )}
            <div style={{
              width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: done ? 13 : 11, fontWeight: 700, position: "relative", zIndex: 1,
              background: done ? C.brand : active ? C.text : C.bg,
              border: `2px solid ${done ? C.brand : active ? C.text : C.border}`,
              color: done || active ? "#fff" : C.dim,
            }}>
              {done ? "✓" : n}
            </div>
            <div style={{
              fontSize: 8, fontFamily: "var(--font-dm-mono, monospace)", textTransform: "uppercase",
              letterSpacing: "0.06em", textAlign: "center",
              color: done ? C.brand : active ? C.text : C.dim,
              fontWeight: active || done ? 700 : 400,
            }}>
              {label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CreateDealPage() {
  const router = useRouter()
  const { language } = useLanguageStore()

  // ── State ──
  const [screen,   setScreen]   = useState<1|2|3|4>(1)
  const [name,     setName]     = useState("")
  const [privacy,  setPrivacy]  = useState<"private" | "public">("public")

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

  const [dealguardOpen,  setDealguardOpen]  = useState(false)
  const [showInfo,       setShowInfo]       = useState(false)
  const [ruleInfoId,     setRuleInfoId]     = useState<string | null>(null)
  const [isSubmitting,   setIsSubmitting]   = useState(false)
  const [submitError,    setSubmitError]    = useState<string | null>(null)
  const [missingSocial,  setMissingSocial]  = useState<string[] | null>(null)
  const [confirmedDeal,  setConfirmedDeal]  = useState<{ deal: any; amount: number; txSignature?: string } | null>(null)

  // ── Derived ──
  const channels       = category ? (CHANNELS[category] ?? []) : []
  const availableRules = getSharedRules(selectedChannels, language)
  const effectiveAmount = isCustomAmt ? (parseFloat(customAmtStr) || 0) : amount
  const feeRate        = 3
  const diffDays       = Math.round((endDate.getTime() - startDate.getTime()) / 86400000)

  const channelLabel = selectedChannels.length === 1
    ? (channels.find(c => c.id === selectedChannels[0])?.label ?? null)
    : selectedChannels.length > 1
    ? selectedChannels.map(id => channels.find(c => c.id === id)?.label ?? id).join(` ${fitnessConnector.toUpperCase()} `)
    : null

  const ruleObj   = rule ? availableRules.find(r => r.id === rule) : null
  const ruleLabel = ruleObj ? (language === "pt" ? ruleObj.label : ruleObj.labelEn) : null
  const freqLabel = frequency ? (FREQUENCIES.find(f => f.id === frequency)?.[language === "pt" ? "label" : "labelEn"] ?? frequency) : null

  const reviewSubrules = rule ? getRuleSubrules(language)[rule] ?? null : null

  const ruleWithFreqLabel = [
    ruleLabel && quantity ? `${quantity} × ${ruleLabel}` : ruleLabel,
    freqLabel,
  ].filter(Boolean).join(" · ")

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
      setSelectedChannels(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
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
      type:                  privacyMap[privacy] ?? "publico",
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
        const chs = result.error.replace("MISSING_SOCIAL:", "").split(",").filter(Boolean)
        setMissingSocial(chs)
        return
      }
      setSubmitError(result.error)
      return
    }
    setConfirmedDeal({ deal: result.deal, amount: effectiveAmount, txSignature: result.stakeTxSignature })
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const mono = "var(--font-dm-mono, 'DM Mono', monospace)"

  // Header shared across all steps
  const pageHeader = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "52px 20px 0" }}>
      <button
        onClick={() => screen === 1 ? router.back() : setScreen(s => (s - 1) as 1|2|3|4)}
        style={{ fontSize: 18, fontWeight: 600, color: C.mid, background: "none", border: "none", cursor: "pointer", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {screen === 1 ? "✕" : "←"}
      </button>
      <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.01em", color: C.text }}>
        {language === "pt" ? "Criar acordo" : "Create deal"}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontSize: 10, color: C.dim, fontFamily: mono }}>
          {language === "pt" ? `Taxa ${feeRate}%` : `Fee ${feeRate}%`}
        </span>
        <button
          onClick={() => setShowInfo(true)}
          style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: C.surface2, border: `1px solid ${C.border}`, cursor: "pointer" }}
        >
          <Info style={{ width: 14, height: 14, stroke: C.mid }} />
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>

      {/* ── STEP 1: Tipo + Privacidade ─────────────────────────────────────────── */}
      {screen === 1 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {pageHeader}
          <div style={{ padding: "14px 0 0" }}>
            <Stepper step={1} lang={language} />
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 120px" }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.2, marginBottom: 5, color: C.text }}>
              {language === "pt" ? "Que tipo de acordo você quer criar?" : "What type of deal do you want to create?"}
            </div>
            <div style={{ fontSize: 12, color: C.mid, marginBottom: 18, lineHeight: 1.5 }}>
              {language === "pt" ? "Escolha a categoria do seu acordo e defina a privacidade." : "Choose your deal category and set privacy."}
            </div>

            {/* Category grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 10 }}>
              {CATEGORIES.slice(0, 4).map(cat => (
                <button key={cat.id}
                  onClick={() => cat.available && selectCategory(cat.id)}
                  disabled={!cat.available}
                  style={{
                    background: category === cat.id ? C.activeLight : C.surface,
                    border: `2px solid ${category === cat.id ? C.brand : C.border}`,
                    borderRadius: 18, padding: 14, cursor: cat.available ? "pointer" : "default",
                    opacity: !cat.available ? 0.5 : 1, position: "relative", textAlign: "left",
                  }}
                >
                  {!cat.available && (
                    <span style={{ position: "absolute", top: 9, right: 9, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 100, padding: "2px 6px", fontSize: 8, color: C.mid, fontFamily: mono }}>
                      {t("badge_soon", language)}
                    </span>
                  )}
                  {cat.available && category === cat.id && (
                    <div style={{ position: "absolute", top: 9, right: 9, width: 18, height: 18, background: C.brand, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff" }}>✓</div>
                  )}
                  <div style={{ fontSize: 22, marginBottom: 7 }}>{cat.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2, color: category === cat.id ? C.brand : C.text }}>{t(cat.label, language)}</div>
                  <div style={{ fontSize: 11, color: C.mid, lineHeight: 1.4 }}>{language === "pt" ? cat.desc : cat.descEn}</div>
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 18 }}>
              {CATEGORIES.slice(4).map(cat => (
                <button key={cat.id}
                  onClick={() => cat.available && selectCategory(cat.id)}
                  disabled={!cat.available}
                  style={{
                    background: category === cat.id ? C.activeLight : C.surface,
                    border: `2px solid ${category === cat.id ? C.brand : C.border}`,
                    borderRadius: 18, padding: 14, cursor: cat.available ? "pointer" : "default",
                    opacity: 0.5, position: "relative", textAlign: "left",
                  }}
                >
                  <span style={{ position: "absolute", top: 9, right: 9, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 100, padding: "2px 6px", fontSize: 8, color: C.mid, fontFamily: mono }}>
                    {t("badge_soon", language)}
                  </span>
                  <div style={{ fontSize: 22, marginBottom: 7 }}>{cat.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2, color: C.text }}>{t(cat.label, language)}</div>
                  <div style={{ fontSize: 11, color: C.mid, lineHeight: 1.4 }}>{language === "pt" ? cat.desc : cat.descEn}</div>
                </button>
              ))}
            </div>

            {/* Privacy */}
            <div style={{ fontSize: 11, fontWeight: 600, color: C.mid, marginBottom: 9, marginTop: 2 }}>
              {language === "pt" ? "Privacidade" : "Privacy"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(["public", "private"] as const).map(opt => (
                <button key={opt}
                  onClick={() => setPrivacy(opt)}
                  style={{
                    background: privacy === opt ? C.activeLight : C.surface,
                    border: `2px solid ${privacy === opt ? C.brand : C.border}`,
                    borderRadius: 18, padding: 13, cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 8, textAlign: "left",
                  }}
                >
                  <div style={{ width: 32, height: 32, background: privacy === opt ? C.activeLight : C.surface2, border: privacy === opt ? `1px solid ${C.activeBorder}` : "none", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {opt === "public"
                      ? <Globe style={{ width: 16, height: 16, stroke: privacy === opt ? C.brand : C.mid }} />
                      : <Lock style={{ width: 16, height: 16, stroke: privacy === opt ? C.brand : C.mid }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2, color: privacy === opt ? C.brand : C.text }}>
                      {opt === "public" ? (language === "pt" ? "Público" : "Public") : (language === "pt" ? "Privado" : "Private")}
                    </div>
                    <div style={{ fontSize: 10, color: C.mid, lineHeight: 1.4 }}>
                      {opt === "public"
                        ? (language === "pt" ? "Qualquer um pode entrar sem aprovação" : "Anyone can join without approval")
                        : (language === "pt" ? "Você aprova cada pedido de entrada" : "You approve each join request")}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom nav */}
          <div style={{ position: "sticky", bottom: 0, background: "rgba(240,243,240,0.96)", backdropFilter: "blur(16px)", borderTop: `1px solid ${C.border}`, padding: "11px 20px 34px" }}>
            <button
              onClick={() => { if (category) setScreen(2) }}
              disabled={!category}
              style={{ width: "100%", padding: 12, borderRadius: 100, fontSize: 13, fontWeight: 700, background: category ? C.brand : C.border, color: "#fff", border: "none", cursor: category ? "pointer" : "default" }}
            >
              {language === "pt" ? "Continuar" : "Continue"}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Canal + Regra ──────────────────────────────────────────────── */}
      {screen === 2 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {pageHeader}
          <div style={{ padding: "14px 0 0" }}>
            <Stepper step={2} lang={language} />
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 120px" }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.2, marginBottom: 5, color: C.text }}>
              {language === "pt" ? "Por onde vamos verificar?" : "How will we verify?"}
            </div>
            <div style={{ fontSize: 12, color: C.mid, marginBottom: 18, lineHeight: 1.5 }}>
              {language === "pt" ? "Escolha o canal e o tipo de atividade auditada." : "Choose the channel and the type of activity to audit."}
            </div>

            {/* Available channels */}
            {channels.filter(ch => ch.available).length > 0 && (
              <>
                <div style={{ fontSize: 9, fontFamily: mono, color: C.dim, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 6, paddingLeft: 2 }}>
                  {language === "pt" ? "Disponíveis" : "Available"}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
                  {channels.filter(ch => ch.available).map(ch => {
                    const isSelected = selectedChannels.includes(ch.id)
                    return (
                      <button key={ch.id}
                        onClick={() => toggleChannel(ch.id)}
                        style={{
                          background: isSelected ? C.activeLight : C.surface,
                          border: `${isSelected ? 2 : 1}px solid ${isSelected ? C.activeBorder : C.border}`,
                          borderRadius: 10, padding: "11px 13px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left",
                        }}
                      >
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: ch.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                          {CHANNEL_ICONS[ch.id]}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 1, color: C.text }}>{ch.label}</div>
                          <div style={{ fontSize: 11, color: C.mid }}>{language === "pt" ? ch.desc : ch.descEn}</div>
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: isSelected ? C.brand : C.brand }}>
                          {isSelected ? (language === "pt" ? "Selecionado ✓" : "Selected ✓") : (language === "pt" ? "Conectar" : "Connect")}
                        </div>
                      </button>
                    )
                  })}

                  {/* Fitness AND/OR connector */}
                  {category === "fitness" && selectedChannels.length >= 2 && (() => {
                    const sel = channels.filter(ch => selectedChannels.includes(ch.id))
                    if (sel.length < 2) return null
                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 2px" }}>
                        <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.08)" }} />
                        <div style={{ display: "flex", overflow: "hidden", borderRadius: 100, border: `1.5px solid ${C.activeBorder}`, background: C.surface }}>
                          {(["e", "ou"] as const).map(opt => (
                            <button key={opt}
                              onClick={() => setFitnessConnector(opt)}
                              style={{ padding: "4px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", background: fitnessConnector === opt ? C.brand : "transparent", color: fitnessConnector === opt ? "white" : C.dim, border: "none", cursor: "pointer" }}>
                              {opt === "e" ? (language === "pt" ? "E" : "AND") : (language === "pt" ? "OU" : "OR")}
                            </button>
                          ))}
                        </div>
                        <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.08)" }} />
                      </div>
                    )
                  })()}
                </div>
              </>
            )}

            {/* Unavailable channels */}
            {channels.filter(ch => !ch.available).length > 0 && (
              <>
                <div style={{ fontSize: 9, fontFamily: mono, color: C.dim, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 6, paddingLeft: 2, marginTop: 12 }}>
                  {language === "pt" ? "Em breve" : "Coming soon"}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 }}>
                  {channels.filter(ch => !ch.available).map(ch => (
                    <div key={ch.id}
                      style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 13px", display: "flex", alignItems: "center", gap: 10, opacity: 0.45 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: ch.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                        {CHANNEL_ICONS[ch.id]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 1, color: C.text }}>{ch.label}</div>
                        <div style={{ fontSize: 11, color: C.mid }}>{language === "pt" ? ch.desc : ch.descEn}</div>
                      </div>
                      <span style={{ fontSize: 9, fontFamily: mono, color: C.dim, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 100, padding: "2px 7px" }}>
                        {t("badge_soon", language)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Rule type */}
            {selectedChannels.length > 0 && availableRules.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.mid, marginBottom: 8 }}>
                  {language === "pt" ? "O que será verificado?" : "What will be verified?"}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {availableRules.map(r => (
                    <div key={r.id} style={{ display: "flex", alignItems: "stretch", gap: 7 }}>
                      <button
                        onClick={() => r.available && setRule(r.id)}
                        disabled={!r.available}
                        style={{
                          flex: 1, background: rule === r.id ? C.activeLight : C.surface,
                          border: `2px solid ${rule === r.id ? C.brand : C.border}`,
                          borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 9,
                          opacity: !r.available ? 0.5 : 1, cursor: r.available ? "pointer" : "default", textAlign: "left",
                        }}
                      >
                        <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${rule === r.id ? C.brand : C.border}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: rule === r.id ? C.brand : "transparent" }}>
                          {rule === r.id && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff" }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{language === "pt" ? r.label : r.labelEn}</span>
                            {!r.available && <span style={{ fontSize: 9, fontFamily: mono, color: C.dim, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 100, padding: "1px 5px" }}>{t("badge_soon", language)}</span>}
                          </div>
                          <div style={{ fontSize: 10, color: C.mid, marginTop: 1 }}>{language === "pt" ? r.desc : r.descEn}</div>
                        </div>
                      </button>
                      {getRuleSubrules(language)[r.id] && (
                        <button
                          onClick={() => setRuleInfoId(prev => prev === r.id ? null : r.id)}
                          style={{ width: 36, flexShrink: 0, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: ruleInfoId === r.id ? "rgba(59,130,246,0.9)" : "rgba(59,130,246,0.08)", border: `1px solid ${ruleInfoId === r.id ? "rgba(59,130,246,0.5)" : "rgba(59,130,246,0.18)"}`, cursor: "pointer" }}>
                          <Info style={{ width: 14, height: 14, stroke: ruleInfoId === r.id ? "white" : "#60A5FA" }} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div style={{ position: "sticky", bottom: 0, background: "rgba(240,243,240,0.96)", backdropFilter: "blur(16px)", borderTop: `1px solid ${C.border}`, padding: "11px 20px 34px", display: "flex", gap: 9 }}>
            <button onClick={() => setScreen(1)} style={{ flexShrink: 0, padding: "12px 18px", borderRadius: 100, fontSize: 12, fontWeight: 600, background: C.surface, border: `1px solid ${C.border}`, color: C.mid, cursor: "pointer" }}>
              {language === "pt" ? "Voltar" : "Back"}
            </button>
            <button
              onClick={() => { if (selectedChannels.length > 0 && rule) setScreen(3) }}
              disabled={selectedChannels.length === 0 || !rule}
              style={{ flex: 1, padding: 12, borderRadius: 100, fontSize: 12, fontWeight: 700, background: (selectedChannels.length > 0 && rule) ? C.brand : C.border, color: "#fff", border: "none", cursor: (selectedChannels.length > 0 && rule) ? "pointer" : "default", textAlign: "center" }}
            >
              {language === "pt" ? "Continuar" : "Continue"}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Regras (Nome + Meta + Período) ────────────────────────────── */}
      {screen === 3 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {pageHeader}
          <div style={{ padding: "14px 0 0" }}>
            <Stepper step={3} lang={language} />
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 120px" }}>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.2, marginBottom: 5, color: C.text }}>
              {language === "pt" ? "Configure as regras" : "Configure the rules"}
            </div>
            <div style={{ fontSize: 12, color: C.mid, marginBottom: 18, lineHeight: 1.5 }}>
              {language === "pt" ? "Defina o título, meta, frequência e período do acordo." : "Set the title, goal, frequency and period of the deal."}
            </div>

            {/* Title input */}
            <div style={{ marginBottom: 13 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 5, color: C.mid }}>
                {language === "pt" ? "Título do acordo" : "Deal title"}
                <span style={{ float: "right", fontFamily: mono, fontSize: 9, color: C.dim, fontWeight: 400 }}>{name.length}/60</span>
              </label>
              <input
                type="text" value={name} maxLength={60}
                onChange={e => setName(e.target.value)}
                placeholder={t("create_name_placeholder", language)}
                style={{
                  width: "100%", padding: "11px 13px", fontSize: 13, fontFamily: "var(--font-dm-sans, DM Sans, sans-serif)", color: C.text, outline: "none",
                  background: C.surface, border: `1px solid ${name.length === 0 ? C.border : name.length < 3 ? "rgba(255,80,80,0.35)" : C.activeBorder}`,
                  borderRadius: 10, boxSizing: "border-box",
                }}
              />
              {name.length > 0 && name.length < 3 && (
                <p style={{ fontSize: 10, color: "#EF4444", marginTop: 4, marginLeft: 2 }}>{language === "pt" ? "Mínimo 3 caracteres" : "Minimum 3 characters"}</p>
              )}
            </div>

            {/* Qty + Frequency */}
            <div style={{ fontSize: 11, fontWeight: 600, color: C.mid, marginBottom: 8 }}>
              {language === "pt" ? "Meta e frequência" : "Goal and frequency"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 12 }}>
              {/* Quantity */}
              <div>
                <label style={{ fontSize: 11, color: C.dim, marginBottom: 5, display: "block", fontWeight: 500 }}>
                  {rule === "pace" ? t("meta_pace_label", language) : (language === "pt" ? "Quantidade" : "Quantity")}
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 5, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "7px 11px" }}>
                  <button
                    onClick={() => { const n = Math.max(1, quantity - 1); setQuantity(n); setQtyStr(String(n)) }}
                    style={{ width: 26, height: 26, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.mid, flexShrink: 0 }}>
                    <Minus style={{ width: 12, height: 12 }} />
                  </button>
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <input
                      type="number" value={qtyStr} min={1}
                      onChange={e => handleQtyChange(e.target.value)}
                      style={{ width: "100%", textAlign: "center", fontSize: 14, fontWeight: 700, background: "transparent", border: "none", outline: "none", color: C.text }}
                    />
                    {ruleObj && <div style={{ fontSize: 9, color: C.dim, fontFamily: mono, textAlign: "center" }}>
                      {language === "pt" ? ruleObj.label.split(" ")[0].toLowerCase() : ruleObj.labelEn.split(" ")[0].toLowerCase()}
                    </div>}
                  </div>
                  <button
                    onClick={() => { const n = quantity + 1; setQuantity(n); setQtyStr(String(n)) }}
                    style={{ width: 26, height: 26, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.mid, flexShrink: 0 }}>
                    <Plus style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              </div>

              {/* Frequency */}
              <div>
                <label style={{ fontSize: 11, color: C.dim, marginBottom: 5, display: "block", fontWeight: 500 }}>
                  {language === "pt" ? "Por período de" : "Per period of"}
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    {FREQUENCIES.slice(0, 2).map(f => (
                      <button key={f.id}
                        onClick={() => setFrequency(f.id)}
                        style={{ flex: 1, padding: "8px 0", background: frequency === f.id ? C.brand : C.surface, border: `1px solid ${frequency === f.id ? C.brand : C.border}`, borderRadius: 10, textAlign: "center", fontSize: 11, fontWeight: 600, color: frequency === f.id ? "#fff" : C.mid, cursor: "pointer" }}>
                        {language === "pt" ? f.label : f.labelEn}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    {FREQUENCIES.slice(2).map(f => (
                      <button key={f.id}
                        onClick={() => setFrequency(f.id)}
                        style={{ flex: 1, padding: "8px 0", background: frequency === f.id ? C.brand : C.surface, border: `1px solid ${frequency === f.id ? C.brand : C.border}`, borderRadius: 10, textAlign: "center", fontSize: 11, fontWeight: 600, color: frequency === f.id ? "#fff" : C.mid, cursor: "pointer" }}>
                        {language === "pt" ? f.label : f.labelEn}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Inline sub-rules */}
            {reviewSubrules && (
              <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 18, padding: 12, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: C.activeLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ShieldCheck style={{ width: 11, height: 11, stroke: C.brand }} />
                  </div>
                  <span style={{ fontSize: 10, fontFamily: mono, fontWeight: 700, color: C.brand, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {reviewSubrules.title}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {reviewSubrules.items.map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, fontSize: 11, color: C.mid, lineHeight: 1.45, alignItems: "flex-start" }}>
                      <span style={{ color: C.brand, fontFamily: mono, fontWeight: 700, flexShrink: 0, fontSize: 10, marginTop: 2 }}>→</span>
                      {item}
                    </div>
                  ))}
                </div>
                {reviewSubrules.hint && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                    <p style={{ fontSize: 11, color: "#B45309", fontWeight: 600 }}>{reviewSubrules.hint}</p>
                  </div>
                )}
              </div>
            )}

            {/* Period */}
            <div style={{ fontSize: 11, fontWeight: 600, color: C.mid, marginBottom: 8, marginTop: 4 }}>
              {language === "pt" ? "Período do acordo" : "Deal period"}
            </div>
            <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
              {PERIOD_PRESETS.map(p => (
                <button key={p.id}
                  onClick={() => selectPreset(p.id)}
                  style={{ padding: "6px 14px", borderRadius: 10, fontSize: 11, fontWeight: 600, background: periodPreset === p.id ? C.activeLight : C.surface, border: `1px solid ${periodPreset === p.id ? C.brand : C.border}`, color: periodPreset === p.id ? C.brand : C.mid, cursor: "pointer" }}>
                  {language === "pt" ? p.label : p.labelEn}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 7, alignItems: "center", marginBottom: 10 }}>
              <button
                onClick={() => { setShowCal("start"); setCalMonth(new Date(startDate.getFullYear(), startDate.getMonth(), 1)) }}
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 13px", textAlign: "left", cursor: "pointer" }}>
                <div style={{ fontSize: 9, fontFamily: mono, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{t("date_start", language)}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{fmtShort(startDate)}</div>
              </button>
              <div style={{ color: C.dim, textAlign: "center", fontSize: 13 }}>→</div>
              <button
                onClick={() => { setShowCal("end"); setCalMonth(new Date(endDate.getFullYear(), endDate.getMonth(), 1)) }}
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 13px", textAlign: "right", cursor: "pointer" }}>
                <div style={{ fontSize: 9, fontFamily: mono, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{t("date_end", language)}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{fmtShort(endDate)}</div>
              </button>
            </div>
            <div style={{ display: "inline-block", background: C.activeLight, color: C.brand, border: `1px solid ${C.activeBorder}`, borderRadius: 100, padding: "3px 9px", fontSize: 10, fontWeight: 600, marginBottom: 12, fontFamily: mono }}>
              {t("date_days", language, { count: diffDays })}
            </div>

            {/* Compliance example */}
            {frequency && (
              <div style={{ background: `rgba(232,98,10,0.06)`, border: `1px solid rgba(232,98,10,0.2)`, borderRadius: 18, padding: 12, marginTop: 4 }}>
                <div style={{ fontSize: 9, fontFamily: mono, fontWeight: 700, color: C.forming, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                  {language === "pt" ? "Como funciona o compliance" : "How compliance works"}
                </div>
                <p style={{ fontSize: 11, color: C.mid, lineHeight: 1.5, marginBottom: 8 }}>
                  {language === "pt"
                    ? "Seu desempenho é avaliado janela por janela. Uma falha em qualquer período classifica como perdedor, independente do desempenho anterior."
                    : "Your performance is evaluated window by window. A failure in any period classifies you as a loser, regardless of previous performance."}
                </p>
                <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid rgba(232,98,10,0.2)` }}>
                  {[
                    { w: language === "pt" ? "Semana 1" : "Week 1", v: `${quantity} ${ruleLabel ?? "—"}`, ok: true },
                    { w: language === "pt" ? "Semana 2" : "Week 2", v: `${quantity} ${ruleLabel ?? "—"}`, ok: true },
                    { w: language === "pt" ? "Semana 3" : "Week 3", v: `${quantity} ${ruleLabel ?? "—"}`, ok: true },
                    { w: language === "pt" ? "Semana 4" : "Week 4", v: language === "pt" ? `${Math.max(1, quantity - 2)} — abaixo` : `${Math.max(1, quantity - 2)} — below`, ok: false },
                  ].map(({ w, v, ok }) => (
                    <div key={w} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", borderBottom: `1px solid rgba(232,98,10,0.1)`, background: "rgba(255,255,255,0.6)", fontSize: 11 }}>
                      <span style={{ color: C.mid }}>{w}</span>
                      <span style={{ fontWeight: 600, color: ok ? C.mid : C.forming }}>{v}</span>
                      <span style={{ fontWeight: 700, fontSize: 12, color: ok ? C.brand : C.forming }}>{ok ? "✓" : "✗"}</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 10, color: C.mid, marginTop: 7, fontStyle: "italic", lineHeight: 1.4 }}>
                  {language === "pt" ? "Um bom desempenho anterior não compensa uma janela abaixo da meta." : "Strong previous performance does not make up for a window below the goal."}
                </p>
              </div>
            )}
          </div>

          <div style={{ position: "sticky", bottom: 0, background: "rgba(240,243,240,0.96)", backdropFilter: "blur(16px)", borderTop: `1px solid ${C.border}`, padding: "11px 20px 34px", display: "flex", gap: 9 }}>
            <button onClick={() => setScreen(2)} style={{ flexShrink: 0, padding: "12px 18px", borderRadius: 100, fontSize: 12, fontWeight: 600, background: C.surface, border: `1px solid ${C.border}`, color: C.mid, cursor: "pointer" }}>
              {language === "pt" ? "Voltar" : "Back"}
            </button>
            <button
              onClick={() => { if (name.trim().length >= 3 && frequency) setScreen(4) }}
              disabled={name.trim().length < 3 || !frequency}
              style={{ flex: 1, padding: 12, borderRadius: 100, fontSize: 12, fontWeight: 700, background: (name.trim().length >= 3 && frequency) ? C.brand : C.border, color: "#fff", border: "none", cursor: (name.trim().length >= 3 && frequency) ? "pointer" : "default", textAlign: "center" }}
            >
              {language === "pt" ? "Continuar" : "Continue"}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Revisão e economia ─────────────────────────────────────────── */}
      {screen === 4 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {pageHeader}
          <div style={{ padding: "14px 0 0" }}>
            <Stepper step={4} lang={language} />
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 120px" }}>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.2, marginBottom: 5, color: C.text }}>
              {language === "pt" ? "Revisão e economia" : "Review and economics"}
            </div>
            <div style={{ fontSize: 12, color: C.mid, marginBottom: 18, lineHeight: 1.5 }}>
              {language === "pt" ? "Configure o valor de entrada, distribuição e revise o acordo." : "Set entry amount, distribution and review your deal."}
            </div>

            {/* Entry amount */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 12, marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 8, fontFamily: mono, color: C.dim, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 7 }}>
                {language === "pt" ? "Valor de entrada por participante" : "Entry amount per participant"}
              </label>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.03em", color: C.text, marginBottom: 3 }}>
                ${effectiveAmount > 0 ? effectiveAmount : "—"}
              </div>
              <div style={{ fontSize: 11, color: C.mid, marginBottom: 12 }}>
                {language === "pt" ? "Mínimo de 2 participantes para o deal iniciar" : "Minimum 2 participants for the deal to start"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: isCustomAmt ? 10 : 0 }}>
                {AMOUNT_PRESETS.map(v => (
                  <button key={v}
                    onClick={() => { setAmount(v); setIsCustomAmt(false) }}
                    style={{ padding: "10px 4px", borderRadius: 10, textAlign: "center", background: !isCustomAmt && amount === v ? C.activeLight : C.surface2, border: `1px solid ${!isCustomAmt && amount === v ? C.brand : C.border}`, cursor: "pointer" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: !isCustomAmt && amount === v ? C.brand : C.text }}>${v}</div>
                    <div style={{ fontSize: 9, color: C.dim, fontFamily: mono }}>{t("pay_per_person", language)}</div>
                  </button>
                ))}
                <button
                  onClick={() => setIsCustomAmt(true)}
                  style={{ padding: "10px 4px", borderRadius: 10, textAlign: "center", background: isCustomAmt ? C.activeLight : C.surface2, border: `1px solid ${isCustomAmt ? C.brand : C.border}`, cursor: "pointer" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: isCustomAmt ? C.brand : C.text }}>{t("pay_other", language)}</div>
                  <div style={{ fontSize: 9, color: C.dim, fontFamily: mono }}>{t("pay_custom", language)}</div>
                </button>
              </div>
              {isCustomAmt && (
                <div style={{ position: "relative", marginTop: 10 }}>
                  <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: C.mid, fontWeight: 600, fontSize: 13 }}>$</span>
                  <input
                    type="number" value={customAmtStr} placeholder="0,00"
                    onChange={e => setCustomAmtStr(e.target.value)}
                    style={{ width: "100%", paddingLeft: 30, paddingRight: 13, paddingTop: 10, paddingBottom: 10, fontSize: 13, background: C.surface, border: `1px solid ${parseFloat(customAmtStr) >= 10 ? C.activeBorder : "rgba(255,80,80,0.3)"}`, borderRadius: 10, outline: "none", color: C.text, boxSizing: "border-box" }}
                  />
                  {customAmtStr && parseFloat(customAmtStr) < 10 && (
                    <p style={{ fontSize: 10, color: "#EF4444", marginTop: 4 }}>{t("err_min_val", language)}</p>
                  )}
                </div>
              )}
            </div>

            {/* Distribution */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 12, marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 8, fontFamily: mono, color: C.dim, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 9 }}>
                {language === "pt" ? "Distribuição do prêmio" : "Prize distribution"}
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {DISTRIBUTION_TYPES.map(d => (
                  <button key={d.id}
                    onClick={() => d.available && setDistribution(d.id)}
                    disabled={!d.available}
                    style={{ background: distribution === d.id ? C.activeLight : C.surface2, border: `2px solid ${distribution === d.id ? C.brand : C.border}`, borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, cursor: d.available ? "pointer" : "default", opacity: d.available ? 1 : 0.4, textAlign: "left" }}>
                    <div style={{ width: 15, height: 15, borderRadius: "50%", border: `2px solid ${distribution === d.id ? C.brand : C.border}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: distribution === d.id ? C.brand : "transparent" }}>
                      {distribution === d.id && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff" }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 1, color: C.text }}>
                        {language === "pt" ? d.label : d.labelEn}
                        {!d.available && <span style={{ marginLeft: 5, fontSize: 9, fontFamily: mono, color: C.dim, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 100, padding: "1px 5px" }}>{t("badge_soon", language)}</span>}
                      </div>
                      <div style={{ fontSize: 10, color: C.mid }}>{language === "pt" ? d.desc : d.descEn}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 18, padding: 12, marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 8, fontFamily: mono, color: C.dim, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 9 }}>
                {language === "pt" ? "Resumo do acordo" : "Deal summary"}
              </label>
              {[
                { key: language === "pt" ? "Tipo" : "Type",         val: `${t(CATEGORIES.find(c => c.id === category)?.label ?? "", language)} · ${privacy === "public" ? (language === "pt" ? "Público" : "Public") : (language === "pt" ? "Privado" : "Private")}` },
                { key: language === "pt" ? "Canal" : "Channel",     val: channelLabel ?? "—" },
                { key: language === "pt" ? "Regra" : "Rule",        val: ruleLabel ?? "—" },
                { key: language === "pt" ? "Meta" : "Goal",         val: ruleWithFreqLabel || "—" },
                { key: language === "pt" ? "Período" : "Period",    val: `${fmtShort(startDate)} → ${fmtShort(endDate)} (${t("date_days", language, { count: diffDays })})` },
                { key: language === "pt" ? "Entrada" : "Entry",     val: effectiveAmount > 0 ? `$${effectiveAmount} ${language === "pt" ? "por pessoa" : "per person"}` : "—" },
                { key: language === "pt" ? "Taxa" : "Fee",          val: `${feeRate}% ${language === "pt" ? "do pool dos perdedores" : "of losers' pool"}` },
              ].map(({ key, val }, i, arr) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: i < arr.length - 1 ? `1px solid ${C.border2}` : "none" }}>
                  <span style={{ color: C.mid }}>{key}</span>
                  <strong style={{ fontWeight: 600, color: C.text, textAlign: "right", maxWidth: "60%" }}>{val}</strong>
                </div>
              ))}
            </div>

            {/* DealGuard — collapsible */}
            <div style={{ marginBottom: 12, borderRadius: 18, overflow: "hidden", background: "rgba(0,184,82,0.05)", border: "1px solid rgba(0,184,82,0.22)" }}>
              <button
                onClick={() => setDealguardOpen(o => !o)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "none", border: "none", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <ShieldCheck style={{ width: 14, height: 14, stroke: "#16A34A" }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#15803D", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: mono }}>
                    {language === "pt" ? "Verificação dupla — DealGuard Engine" : "Double verification — DealGuard Engine"}
                  </span>
                </div>
                <ChevronDown style={{ width: 14, height: 14, stroke: C.brand, transform: dealguardOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </button>
              {dealguardOpen && (
                <div style={{ padding: "0 14px 14px", borderTop: "1px solid rgba(0,184,82,0.15)" }}>
                  <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                    {[
                      { step: "1", label: language === "pt" ? "Coleta automática via API" : "Automatic API collection", desc: language === "pt" ? "O DealGuard conecta diretamente nas plataformas e extrai os dados brutos de cada participante ao final de cada janela." : "DealGuard connects directly to platforms and pulls raw data from each participant at the end of each window." },
                      { step: "2", label: language === "pt" ? "Análise Sentinel (IA)" : "Sentinel analysis (AI)", desc: language === "pt" ? "Uma camada de IA analisa as evidências em busca de padrões suspeitos. Resultados com risco alto são marcados e excluídos da premiação." : "An AI layer reviews the evidence for suspicious patterns. High-risk results are flagged and excluded from the prize pool." },
                    ].map(({ step, label, desc }) => (
                      <div key={step} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "rgba(0,184,82,0.12)", border: "1px solid rgba(0,184,82,0.25)" }}>
                          <span style={{ fontSize: 10, fontWeight: 900, color: C.brand }}>{step}</span>
                        </div>
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "#15803D", marginBottom: 2 }}>{label}</p>
                          <p style={{ fontSize: 11, color: C.mid, lineHeight: 1.5 }}>{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 10, color: C.brand, marginTop: 10, fontWeight: 600, borderTop: "1px solid rgba(0,184,82,0.15)", paddingTop: 10 }}>
                    {language === "pt" ? "✓ Só após essa verificação dupla o resultado é finalizado e os fundos liberados." : "✓ Only after this double verification is the result finalized and funds released."}
                  </p>
                </div>
              )}
            </div>

            {/* Pin note */}
            <div style={{ background: "rgba(232,98,10,0.06)", border: "1px solid rgba(232,98,10,0.18)", borderRadius: 12, padding: "10px 12px", marginBottom: 10 }}>
              <p style={{ fontSize: 11, color: C.forming, lineHeight: 1.5 }}>
                {language === "pt"
                  ? "Ao publicar, você entra automaticamente como participante e seu stake é reservado para o período do acordo."
                  : "By publishing, you automatically join as a participant and your stake is reserved for the deal period."}
              </p>
            </div>

            {/* Fee note */}
            <div style={{ background: "rgba(0,184,82,0.06)", border: "1px solid rgba(0,184,82,0.15)", borderRadius: 12, padding: "10px 12px", marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: C.mid, lineHeight: 1.5 }}>
                {t("fee_disclaimer", language, { rate: feeRate })}
              </p>
            </div>

            {submitError && <p style={{ fontSize: 12, color: "#EF4444", textAlign: "center", marginBottom: 10 }}>{submitError}</p>}
          </div>

          <div style={{ position: "sticky", bottom: 0, background: "rgba(240,243,240,0.96)", backdropFilter: "blur(16px)", borderTop: `1px solid ${C.border}`, padding: "11px 20px 34px", display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={handleConfirm}
              disabled={!isValid || isSubmitting}
              style={{ width: "100%", padding: 13, borderRadius: 100, fontSize: 13, fontWeight: 700, background: (isValid && !isSubmitting) ? C.forming : C.border, color: "#fff", border: "none", cursor: (isValid && !isSubmitting) ? "pointer" : "default", textAlign: "center" }}
            >
              {isSubmitting ? t("btn_processing", language) : `${language === "pt" ? "Publicar acordo" : "Publish deal"} · $${effectiveAmount}`}
            </button>
            <button onClick={() => setScreen(3)} style={{ padding: "11px", borderRadius: 100, fontSize: 12, fontWeight: 600, background: "transparent", border: "none", color: C.mid, cursor: "pointer", textAlign: "center" }}>
              {language === "pt" ? "Voltar e editar" : "Back and edit"}
            </button>
          </div>
        </div>
      )}

      {/* ── Calendar ─────────────────────────────────────────────────────────── */}
      {showCal && (
        <div className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowCal(null)}>
          <div className="w-full rounded-t-3xl px-5 pt-5 pb-8"
            style={{ background: C.surface }}
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
                {language === "pt" ? MONTH_NAMES[calMonth.getMonth()] : ["January","February","March","April","May","June","July","August","September","October","November","December"][calMonth.getMonth()]} {calMonth.getFullYear()}
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
                    style={{ background: active ? C.brand : "transparent", color: active ? "white" : disabled ? "#D1D5DB" : "#374151", fontWeight: active ? "700" : "400" }}>
                    {date.getDate()}
                  </button>
                )
              })}
            </div>
            {showCal === "start" && (
              <div className="mt-4 p-2.5 rounded-xl text-center"
                style={{ background: "rgba(0,184,82,0.06)", border: "1px solid rgba(0,184,82,0.12)" }}>
                <p className="text-[10px] font-semibold" style={{ color: C.brand }}>
                  ⏰ {language === "pt" ? "O deal inicia automaticamente às 00h (Brasília, GMT-3) do dia selecionado" : "The deal starts automatically at 00h (Brasília, GMT-3) on the selected day"}
                </p>
              </div>
            )}
            <button onClick={() => setShowCal(null)}
              className="w-full mt-5 py-3 rounded-2xl font-semibold text-sm"
              style={{ background: "rgba(0,184,82,0.07)", border: "1px solid rgba(0,184,82,0.15)", color: C.brand }}>
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
            style={{ background: C.surface }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4" style={{ stroke: C.brand }} />
                <h3 className="text-base font-bold text-gray-800">{language === "pt" ? "Como funciona" : "How it works"}</h3>
              </div>
              <button onClick={() => setShowInfo(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.06)" }}>
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="p-4 rounded-2xl" style={{ background: "rgba(0,184,82,0.06)", border: "1px solid rgba(0,184,82,0.15)" }}>
                <p className="text-xs font-bold mb-1.5" style={{ color: C.brand }}>💸 {language === "pt" ? `Taxa de ${feeRate}% — só se houver perdedor` : `Fee of ${feeRate}% — only if there's a loser`}</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {language === "pt" ? "A taxa é cobrada apenas se algum participante não cumprir o desafio. Se todos cumprirem, o valor integral é devolvido a cada um." : "The fee is charged only if a participant does not meet the challenge. If everyone complies, the full amount is returned to each one."}
                </p>
              </div>
              <div className="p-4 rounded-2xl" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}>
                <p className="text-xs font-bold text-blue-500 mb-1.5">👥 {language === "pt" ? "Mínimo de 2 participantes" : "Minimum of 2 participants"}</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {language === "pt" ? "Para o deal entrar em vigor, pelo menos 2 participantes precisam confirmar antes do prazo." : "For the deal to take effect, at least 2 participants must confirm before the deadline."}
                </p>
              </div>
              <div className="p-4 rounded-2xl" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <p className="text-xs font-bold text-red-500 mb-1.5">⚠️ {language === "pt" ? "Regra estrita por janela de frequência" : "Strict rule per frequency window"}</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {language === "pt" ? "O participante precisa cumprir a meta em cada janela do período. Uma janela perdida = eliminação permanente." : "The participant must meet the goal in each window of the period. A missed window = permanent elimination."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Missing social popup ───────────────────────────────────────────────── */}
      {missingSocial && (
        <div className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={() => setMissingSocial(null)}>
          <div className="w-full rounded-t-3xl px-5 pt-5 pb-10"
            style={{ background: C.surface, boxShadow: "0 -16px 64px rgba(0,0,0,0.2)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-base font-bold text-gray-800">{language === "pt" ? "Conta não vinculada" : "Account not linked"}</h3>
              </div>
              <button onClick={() => setMissingSocial(null)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.06)" }}>
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
                {language === "pt" ? "O app usa sua conta para verificar automaticamente se você cumpriu o desafio." : "The app uses your account to automatically verify if you met the challenge."}
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
            <button onClick={() => router.push("/profile")}
              className="w-full mt-5 py-4 rounded-2xl font-bold text-white text-sm"
              style={{ background: `linear-gradient(135deg,${C.brandDark},${C.brand})`, boxShadow: "0 8px 32px rgba(0,184,82,0.35)" }}>
              {language === "pt" ? "Conectar conta agora" : "Connect account now"}
            </button>
            <button onClick={() => setMissingSocial(null)} className="w-full mt-2.5 py-3 rounded-2xl font-semibold text-gray-500 text-sm" style={{ background: "rgba(0,0,0,0.04)" }}>
              {language === "pt" ? "Cancelar" : "Cancel"}
            </button>
          </div>
        </div>
      )}

      {/* ── Deal confirmed — deposit receipt ──────────────────────────────────── */}
      {confirmedDeal && (
        <div className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}>
          <div className="w-full rounded-t-3xl px-5 pt-6 pb-10"
            style={{ background: C.surface, boxShadow: "0 -20px 80px rgba(0,0,0,0.25)", maxHeight: "92vh", overflowY: "auto" }}>

            {/* Icon + title */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 22 }}>
              <div style={{ width: 68, height: 68, borderRadius: "50%", background: "rgba(0,184,82,0.1)", border: "2px solid rgba(0,184,82,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <ShieldCheck style={{ width: 32, height: 32, stroke: C.brand, fill: "none" }} />
              </div>
              <h2 style={{ fontSize: 21, fontWeight: 900, color: C.text, letterSpacing: "-0.03em", textAlign: "center" }}>
                {language === "pt" ? "Depósito confirmado!" : "Deposit confirmed!"}
              </h2>
              <p style={{ fontSize: 13, color: C.dim, marginTop: 4, textAlign: "center" }}>
                {language === "pt" ? "Seu acordo foi registrado na blockchain Solana" : "Your agreement was registered on the Solana blockchain"}
              </p>
            </div>

            {/* Amount hero */}
            <div style={{ padding: "18px 0", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, marginBottom: 18, textAlign: "center" }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                {language === "pt" ? "Valor depositado" : "Amount deposited"}
              </p>
              <p style={{ fontSize: 42, fontWeight: 900, color: C.brand, letterSpacing: "-0.04em", lineHeight: 1 }}>
                ${confirmedDeal.amount.toFixed(2)}
              </p>
              <p style={{ fontSize: 12, color: C.mid, marginTop: 4, fontFamily: mono }}>USDC · Solana devnet</p>
            </div>

            {/* TX signature */}
            {confirmedDeal.txSignature && (
              <div style={{ padding: "10px 14px", borderRadius: 12, background: C.surface2, border: `1px solid ${C.border}`, marginBottom: 16 }}>
                <p style={{ fontSize: 10, color: C.dim, marginBottom: 3, fontFamily: mono }}>
                  {language === "pt" ? "Transação on-chain" : "On-chain transaction"}
                </p>
                <p style={{ fontSize: 11, color: C.text, fontFamily: mono, wordBreak: "break-all", lineHeight: 1.4 }}>
                  {confirmedDeal.txSignature.slice(0, 24)}…{confirmedDeal.txSignature.slice(-10)}
                </p>
              </div>
            )}

            {/* Deal conditions */}
            <div style={{ padding: 14, borderRadius: 16, background: "rgba(0,0,0,0.02)", border: `1px solid ${C.border}`, marginBottom: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.mid, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontFamily: mono }}>
                {language === "pt" ? "Condições do acordo" : "Agreement conditions"}
              </p>
              {[
                { icon: "🎯", label: language === "pt" ? "Acordo"   : "Deal",        value: confirmedDeal.deal.title },
                { icon: "📋", label: language === "pt" ? "Regra"    : "Rule",        value: ruleWithFreqLabel || "—" },
                { icon: "🔗", label: language === "pt" ? "Canal"    : "Channel",     value: selectedChannels.map(ch => CHANNEL_LABELS[ch] ?? ch).join(" + ") },
                { icon: "📅", label: language === "pt" ? "Período"  : "Period",      value: `${fmtShort(startDate)} → ${fmtShort(endDate)}` },
                { icon: "⚡", label: language === "pt" ? "Início"   : "Start",       value: language === "pt" ? `${fmtFull(startDate)} às 00h` : `${fmtFull(startDate)} at 00h` },
                { icon: "👥", label: language === "pt" ? "Mínimo"   : "Minimum",     value: language === "pt" ? "2 participantes para activar" : "2 participants to activate" },
                { icon: "💸", label: language === "pt" ? "Taxa"     : "Fee",         value: "3% (só se houver perdedor)" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, paddingBottom: i < 6 ? 10 : 0, borderBottom: i < 6 ? `1px solid ${C.border2}` : "none", marginBottom: i < 6 ? 10 : 0 }}>
                  <span style={{ fontSize: 14, lineHeight: "20px", flexShrink: 0 }}>{row.icon}</span>
                  <span style={{ fontSize: 11, color: C.dim, minWidth: 54, lineHeight: "20px", flexShrink: 0 }}>{row.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text, flex: 1, textAlign: "right", lineHeight: 1.4 }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Min participants warning */}
            <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.25)", marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: "#92400E", lineHeight: 1.6 }}>
                ⏳ {language === "pt"
                  ? "O deal só entra em vigor quando pelo menos 2 participantes confirmarem antes da data de início. Se não atingir o mínimo, o depósito é devolvido automaticamente."
                  : "The deal only activates when at least 2 participants confirm before the start date. If the minimum isn't reached, the deposit is automatically returned."}
              </p>
            </div>

            <button onClick={() => router.push("/")}
              style={{ width: "100%", padding: "16px 0", borderRadius: 18, fontWeight: 700, fontSize: 15, color: "#fff", background: `linear-gradient(135deg,${C.brandDark},${C.brand})`, border: "none", cursor: "pointer", boxShadow: "0 8px 32px rgba(0,184,82,0.35)" }}>
              {language === "pt" ? "Ver meu deal" : "See my deal"}
            </button>
          </div>
        </div>
      )}

      {/* ── Rule info sheet ───────────────────────────────────────────────────── */}
      {ruleInfoId && (() => {
        const subrules = getRuleSubrules(language)[ruleInfoId]
        if (!subrules) return null
        return (
          <div className="fixed inset-0 z-50 flex items-end"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
            onClick={() => setRuleInfoId(null)}>
            <div className="w-full rounded-t-3xl px-5 pt-5 pb-8"
              style={{ background: C.surface }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,0.1)" }}>
                    <Info className="w-4 h-4 text-blue-500" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-800">{subrules.title}</h3>
                </div>
                <button onClick={() => setRuleInfoId(null)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.06)" }}>
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <ul className="space-y-2.5">
                {subrules.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="text-blue-400 mt-0.5 flex-shrink-0 font-bold text-sm">✓</span>
                    <span className="text-sm text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
              {subrules.hint && (
                <div className="mt-4 p-3 rounded-xl" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <p className="text-sm text-amber-600 font-semibold leading-relaxed">{subrules.hint}</p>
                </div>
              )}
              <button onClick={() => setRuleInfoId(null)} className="w-full mt-5 py-3 rounded-2xl font-semibold text-sm" style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.15)", color: "#3B82F6" }}>
                {language === "pt" ? "Fechar" : "Close"}
              </button>
            </div>
          </div>
        )
      })()}

    </div>
  )
}
