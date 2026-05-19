"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { differenceInCalendarDays, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ArrowLeft, Share2, Activity,
  ChevronDown, AlertCircle, X, Loader2, ShieldCheck,
  MoreHorizontal, BookOpen, FileCheck,
} from "lucide-react"
import type { DealWithParticipants, Distribution } from "@/lib/supabase/types"
import { useLanguageStore } from "@/lib/i18n"
import { joinDeal } from "@/lib/actions/deals"

// ── Design tokens (inline — not yet in globals.css) ───────────────────────────
const C = {
  bg:           "#F0F3F0",
  surface:      "#FFFFFF",
  surface2:     "#E8EDE8",
  border:       "#D8E0D8",
  border2:      "#E6EEE6",
  text:         "#0B1309",
  mid:          "#4E614E",
  dim:          "#8BA09A",
  brand:        "#00B852",
  brandDark:    "#008C3E",
  forming:      "#E8620A",
  formingLight: "rgba(232,98,10,0.08)",
  formingBorder:"rgba(232,98,10,0.2)",
  activeLight:  "rgba(0,184,82,0.08)",
  activeBorder: "rgba(0,184,82,0.2)",
  closedLight:  "rgba(139,160,154,0.08)",
  closedBorder: "rgba(139,160,154,0.2)",
  teal:         "#3B8F8A",
} as const

// ── Types ─────────────────────────────────────────────────────────────────────

type VerifType  = "x" | "strava" | "gympass"
type PrizeType  = "proporcional" | "primeiro" | "ranking"
type DealStatus = "ativo" | "pendente" | "finalizado"

interface Participant {
  id: string
  initials: string
  name: string
  username: string
  socialHandle?: string
  userTag?: string
  color: string
  bg: string
  rank: number
  isMe: boolean
  value: number
  currentValue: number
  startValue: number
  hasData: boolean
  approved: boolean
  paid: boolean
  joinedDaysAgo: number
}

interface TimelineEvent {
  date: string
  label: string
  done: boolean
  current?: boolean
}

interface PrizeSlice {
  label: string
  pct: number
  color: string
  amount: number
}

interface SocialConnection {
  platform: string
  status: string
  username?: string | null
  member_email?: string | null
  external_id?: string | null
}

interface DealView {
  id: string
  title: string
  subtitle: string
  status: DealStatus
  prizeType: PrizeType
  verifications: VerifType[]
  verificationChannels: string[]
  pot: number
  valuePerPerson: number
  participants: number
  progress: number
  daysGone: number
  daysTotal: number
  startDate: string
  endDate: string
  description: string
  rules: string[]
  participants_list: Participant[]
  timeline: TimelineEvent[]
  prizeSlices: PrizeSlice[]
  myRank?: number
  potentialWin?: number
  statusBorder: string
}

// ── Color palette ─────────────────────────────────────────────────────────────

const PLAYER_COLORS = ["#2563EB", "#16A34A", "#D97706", "#7C3AED", "#DC2626", "#059669"]
const PLAYER_BG = [
  "rgba(37,99,235,0.12)", "rgba(22,163,74,0.12)", "rgba(217,119,6,0.12)",
  "rgba(124,58,237,0.12)", "rgba(220,38,38,0.12)", "rgba(5,150,105,0.12)",
]

// ── Data mapping ──────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
}

function getUserTag(username: string) {
  const plain = username.replace(/^@/, "")
  const digits = (plain.match(/\d+/g) ?? []).join("")
  if (digits) return `#${digits}`
  return `#${plain}`
}

function buildPrizeSlices(distribution: Distribution, netPot: number): PrizeSlice[] {
  if (distribution === "winner") return [
    { label: "Vencedor",  pct: 0.95, color: "#F59E0B", amount: Math.round(netPot * 0.95) },
    { label: "True Deal", pct: 0.05, color: "#16A34A", amount: Math.round(netPot * 0.05) },
  ]
  if (distribution === "top3") return [
    { label: "1º lugar", pct: 0.50, color: "#F59E0B", amount: Math.round(netPot * 0.50) },
    { label: "2º lugar", pct: 0.30, color: "#9CA3AF", amount: Math.round(netPot * 0.30) },
    { label: "3º lugar", pct: 0.20, color: "#D97706", amount: Math.round(netPot * 0.20) },
  ]
  return [{ label: "Proporcional", pct: 1.0, color: "#7C3AED", amount: netPot }]
}

function buildPotentialWin(distribution: Distribution, netPot: number, myRank: number): number | undefined {
  if (distribution === "winner") return myRank === 1 ? Math.round(netPot * 0.95) : undefined
  if (distribution === "top3" && myRank <= 3) {
    const pcts = [0.50, 0.30, 0.20]
    return pcts[myRank - 1] ? Math.round(netPot * pcts[myRank - 1]) : undefined
  }
  if (distribution === "proportional") return Math.round(netPot / 3)
  return undefined
}

function mapDeal(d: DealWithParticipants, userId: string | null, lang: "pt" | "en"): DealView {
  const now       = new Date()
  const startDate = new Date(d.start_date)
  const endDate   = new Date(d.end_date)
  const daysTotal = Math.max(1, differenceInCalendarDays(endDate, startDate))
  const daysGone  = Math.max(0, Math.min(daysTotal, differenceInCalendarDays(now, startDate)))
  const progress  = daysGone / daysTotal

  const statusMap: Record<string, DealStatus> = { formacao: "pendente", ativo: "ativo", finalizado: "finalizado" }
  const status    = statusMap[d.status] ?? "pendente"
  const prizeMap: Record<string, PrizeType> = { winner: "primeiro", top3: "ranking", proportional: "proporcional" }
  const prizeType = prizeMap[d.distribution] ?? "primeiro"

  const knownVerifs = ["x", "strava", "gympass"]
  const verifications = (d.verification_channels ?? []).filter(c => knownVerifs.includes(c)) as VerifType[]

  const participants_list: Participant[] = d.participants.map((p, i) => {
    const name     = p.profile.display_name || p.profile.username
    const startVal = p.start_snapshot   ? (Object.values(p.start_snapshot)[0]   as number ?? 0) : 0
    const currVal  = p.current_snapshot ? (Object.values(p.current_snapshot)[0] as number ?? 0) : 0
    const joinedAt = new Date(p.joined_at)
    return {
      id:           p.id,
      initials:     getInitials(name),
      name,
      username:     `@${p.profile.username}`,
      userTag:      getUserTag(p.profile.username),
      color:        PLAYER_COLORS[i % PLAYER_COLORS.length],
      bg:           PLAYER_BG[i % PLAYER_BG.length],
      rank:         p.rank ?? (i + 1),
      isMe:         p.user_id === userId,
      value:        currVal,
      currentValue: currVal,
      startValue:   startVal,
      hasData:      p.start_snapshot !== null || p.current_snapshot !== null,
      approved:     p.status !== "eliminated",
      paid:         true,
      joinedDaysAgo: Math.max(0, differenceInCalendarDays(now, joinedAt)),
    }
  })

  const myParticipant = userId ? d.participants.find(p => p.user_id === userId) : null
  const myRank        = myParticipant?.rank ?? undefined
  const prizeSlices   = buildPrizeSlices(d.distribution, d.net_pot)
  const potentialWin  = myRank != null ? buildPotentialWin(d.distribution, d.net_pot, myRank) : undefined

  const locale       = lang === "pt" ? ptBR : undefined
  const startDateStr = format(startDate, "dd MMM yyyy", { locale })
  const endDateStr   = format(endDate,   "dd MMM yyyy", { locale })
  const todayStr     = format(now,       "dd MMM yyyy", { locale })

  const timeline: TimelineEvent[] = [
    { date: startDateStr, label: lang === "pt" ? "Início do deal" : "Deal start", done: status !== "pendente" },
    { date: todayStr,     label: lang === "pt" ? "Hoje" : "Today", done: true, current: status === "ativo" },
    { date: endDateStr,   label: lang === "pt" ? "Fim do deal" : "Deal end", done: status === "finalizado" },
    ...(status === "finalizado" ? [{ date: endDateStr, label: lang === "pt" ? "Resultado final" : "Final result", done: true }] : []),
  ]

  const borderMap: Record<DealStatus, string> = { ativo: "#00B852", pendente: "#E8620A", finalizado: "#8BA09A" }

  return {
    id:                  d.id,
    title:               d.title,
    subtitle:            lang === "pt"
      ? `${d.participant_count} participante${d.participant_count !== 1 ? "s" : ""}`
      : `${d.participant_count} participant${d.participant_count !== 1 ? "s" : ""}`,
    status,
    prizeType,
    verifications,
    verificationChannels: d.verification_channels ?? [],
    pot:                 d.pot_total,
    valuePerPerson:      d.entry_amount,
    participants:        d.participant_count,
    progress,
    daysGone,
    daysTotal,
    startDate:           startDateStr,
    endDate:             endDateStr,
    description:         d.description ?? "",
    rules:               d.description?.split("\n").map(l => l.trim()).filter(Boolean) ?? [],
    participants_list,
    timeline,
    prizeSlices,
    myRank,
    potentialWin,
    statusBorder:        borderMap[status],
  }
}

// ── Static data ───────────────────────────────────────────────────────────────

const VERIF_META: Record<VerifType, { bg: string; label: string; text?: string; Icon?: React.FC<{ className?: string }> }> = {
  x:       { bg: "#000000", label: "X",       text: "𝕏" },
  strava:  { bg: "#FC4C02", label: "Strava",  Icon: Activity },
  gympass: { bg: "#00A651", label: "Gympass", text: "GP" },
}

const CHANNEL_LABELS: Record<string, string> = {
  x: "X", instagram: "Instagram", tiktok: "TikTok", linkedin: "LinkedIn",
  discord: "Discord", youtube: "YouTube", strava: "Strava",
  wellhub: "Wellhub", totalpass: "TotalPass", gympass: "Gympass",
}

const getRuleLabels = (lang: "pt" | "en"): Record<string, string> => ({
  post: lang === "pt" ? "Post publicado" : "Published post",
  comment_received: lang === "pt" ? "Comentário recebido" : "Comment received",
  repost_received: lang === "pt" ? "Repost recebido" : "Repost received",
  follower_gained: lang === "pt" ? "Seguidor recebido" : "Follower gained",
  impressions: lang === "pt" ? "Impressões" : "Impressions",
  km_run: lang === "pt" ? "Kms percorridos" : "Kms run",
  pace: lang === "pt" ? "Pace médio" : "Average pace",
  workout_hours: lang === "pt" ? "Horas de treino" : "Workout hours",
  checkin: lang === "pt" ? "Check-ins" : "Check-ins",
  different_venues: lang === "pt" ? "Diferentes ambientes" : "Different venues",
})

const getVerificationSubrules = (lang: "pt" | "en"): Record<string, { title: string; items: Array<{ text: string; valid: boolean }>; pinNote?: string }> => ({
  post: {
    title: lang === "pt" ? "Como funciona — Posts no X" : "How it works — X posts",
    items: [
      { text: lang === "pt" ? "A conta X deve estar pública no momento da verificação" : "X account must be public at verification time", valid: true },
      { text: lang === "pt" ? "O post deve ter mais de 100 caracteres" : "Post must have more than 100 characters", valid: true },
      { text: lang === "pt" ? "Conteúdo único no período — sem posts idênticos ou semanticamente iguais (verificado por IA)" : "Unique content during the period — no identical or semantically similar posts (AI-verified)", valid: true },
      { text: lang === "pt" ? "Verificação automática via X API — nenhuma ação manual necessária" : "Automatic verification via X API — no manual action needed", valid: true },
      { text: lang === "pt" ? "Reposts e quotes não contam como post válido" : "Reposts and quotes do not count as valid posts", valid: false },
      { text: lang === "pt" ? "Posts publicados antes da data de início não são contados" : "Posts published before the deal start date are not counted", valid: false },
      { text: lang === "pt" ? "Posts deletados antes da auditoria são considerados não publicados" : "Posts deleted before audit are considered not published", valid: false },
    ],
    pinNote: lang === "pt" ? "Publique normalmente no X — o True Deal sincroniza via API automaticamente." : "Post normally on X — True Deal syncs via API automatically.",
  },
  follower_gained: {
    title: lang === "pt" ? "Como funciona — Seguidores recebidos" : "How it works — Followers gained",
    items: [
      { text: lang === "pt" ? "A baseline de seguidores é registrada no início do deal (start_snapshot)" : "Follower baseline is recorded at deal start (start_snapshot)", valid: true },
      { text: lang === "pt" ? "DealGuard calcula o ganho líquido por janela (novos − perdidos)" : "DealGuard calculates net gain per window (new − lost)", valid: true },
      { text: lang === "pt" ? "Conta deve permanecer pública durante todo o período" : "Account must remain public throughout the period", valid: true },
      { text: lang === "pt" ? "Seguidores bot detectados pelo Sentinel AI são excluídos" : "Bot followers detected by Sentinel AI are excluded", valid: false },
    ],
  },
  km_run: {
    title: lang === "pt" ? "Como funciona — Kms corridos" : "How it works — Kms run",
    items: [
      { text: lang === "pt" ? "Apenas atividades do tipo Corrida (Run) são contabilizadas" : "Only Run-type activities count", valid: true },
      { text: lang === "pt" ? "Distâncias são somadas dentro da janela de frequência" : "Distances are summed within the frequency window", valid: true },
      { text: lang === "pt" ? "Verificação via Strava API com o access token do participante" : "Verified via Strava API with participant access token", valid: true },
      { text: lang === "pt" ? "Atividades inseridas manualmente são excluídas" : "Manually entered activities are excluded", valid: false },
    ],
    pinNote: lang === "pt" ? "Registre normalmente no Strava — o True Deal sincroniza via API automaticamente." : "Record normally in Strava — True Deal syncs via API automatically.",
  },
  workout_hours: {
    title: lang === "pt" ? "Como funciona — Horas de exercício" : "How it works — Workout hours",
    items: [
      { text: lang === "pt" ? "Tempo total de todas as atividades rastreadas por GPS na janela" : "Total time from all GPS-tracked activities in the window", valid: true },
      { text: lang === "pt" ? "Qualquer modalidade de atividade conta" : "Any activity type counts", valid: true },
      { text: lang === "pt" ? "Verificação via Strava API com o access token do participante" : "Verified via Strava API with participant access token", valid: true },
    ],
  },
  checkin: {
    title: lang === "pt" ? "Como funciona — Check-in em Academia" : "How it works — Gym Check-in",
    items: [
      { text: lang === "pt" ? "Check-in presencial em academia parceira Wellhub ou TotalPass" : "In-person check-in at a Wellhub or TotalPass partner gym", valid: true },
      { text: lang === "pt" ? "Verificação automática via API — sem nenhuma ação manual no app" : "Automatic verification via API — no manual action needed", valid: true },
      { text: lang === "pt" ? "Apenas academias credenciadas na rede parceira são aceitas" : "Only credentialed partner network gyms are accepted", valid: true },
      { text: lang === "pt" ? "Prazo: até 23h59 (horário de Brasília) de cada janela" : "Deadline: by 11:59 PM (Brasília time) of each window", valid: true },
      { text: lang === "pt" ? "Máximo 1 check-in válido por dia — múltiplos na mesma unidade não acumulam" : "Max 1 valid check-in per day — multiple at same location don't stack", valid: false },
      { text: lang === "pt" ? "Check-ins de dias anteriores à data de início não são contabilizados" : "Check-ins from before deal start date are not counted", valid: false },
    ],
    pinNote: lang === "pt" ? "Basta se exercitar e fazer check-in normalmente pelo Wellhub ou TotalPass — o True Deal sincroniza via API automaticamente." : "Just work out and check in normally via Wellhub or TotalPass — True Deal syncs via API automatically.",
  },
})

// ── Collapsible section ───────────────────────────────────────────────────────

function RuleSection({
  title, accentColor, accentBg, icon: Icon, defaultOpen = true, children,
}: {
  title: string
  accentColor: string
  accentBg: string
  icon: React.FC<{ style?: React.CSSProperties }>
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, marginTop: 8, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "12px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon style={{ width: 13, height: 13, stroke: accentColor, fill: "none", strokeWidth: 2 }} />
          </div>
          <h4 style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: accentColor, margin: 0 }}>
            {title}
          </h4>
        </div>
        <ChevronDown style={{ width: 16, height: 16, color: C.dim, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ borderTop: `1px solid ${C.border2}`, padding: "12px 14px" }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ── Pin note ──────────────────────────────────────────────────────────────────

function PinNote({ text, color, bg, border }: { text: string; color: string; bg: string; border: string }) {
  return (
    <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 10, fontSize: 11, fontWeight: 600, lineHeight: 1.5, display: "flex", gap: 6, alignItems: "flex-start", background: bg, color, border: `1px solid ${border}` }}>
      {text}
    </div>
  )
}

// ── DealRulesCard ─────────────────────────────────────────────────────────────

function DealRulesCard({ deal, dealData }: { deal: DealView; dealData: DealWithParticipants }) {
  const { language } = useLanguageStore()
  const subrules = getVerificationSubrules(language)[dealData.verification_type]
  const channelName = (dealData.verification_channels ?? [])
    .map(c => CHANNEL_LABELS[c] ?? c).join(" + ")

  const freqMap: Record<string, string> = {
    daily:   language === "pt" ? "Diário"  : "Daily",
    weekly:  language === "pt" ? "Semanal" : "Weekly",
    monthly: language === "pt" ? "Mensal"  : "Monthly",
  }
  const freqLabel = dealData.rule_frequency ? freqMap[dealData.rule_frequency] ?? dealData.rule_frequency : null

  // Section 1: How it works for this channel
  const section1Title = subrules?.title ?? (language === "pt" ? `Como funciona — ${channelName}` : `How it works — ${channelName}`)

  return (
    <div style={{ paddingBottom: 8 }}>
      {/* Section 1: How it works */}
      <RuleSection
        title={section1Title}
        accentColor={C.teal}
        accentBg={`rgba(59,143,138,0.1)`}
        icon={BookOpen}
        defaultOpen={true}
      >
        {subrules ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {subrules.items.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: 12, color: C.mid, lineHeight: 1.45 }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, background: item.valid ? C.activeLight : C.formingLight, color: item.valid ? C.brand : C.forming }}>
                  {item.valid ? "✓" : "✗"}
                </div>
                {item.text}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: C.mid }}>
            {language === "pt" ? "Verificação automática via API da plataforma." : "Automatic verification via platform API."}
          </p>
        )}
        {subrules?.pinNote && (
          <PinNote text={subrules.pinNote} color={C.forming} bg={C.formingLight} border={C.formingBorder} />
        )}
      </RuleSection>

      {/* Section 2: DealGuard Engine */}
      <RuleSection
        title={language === "pt" ? "Verificação dupla — DealGuard Engine" : "Double verification — DealGuard Engine"}
        accentColor={C.brand}
        accentBg={C.activeLight}
        icon={ShieldCheck}
        defaultOpen={false}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 8 }}>
          {[
            {
              step: "1",
              label: language === "pt" ? "Coleta automática via API" : "Automatic API collection",
              desc: language === "pt"
                ? `O DealGuard conecta diretamente ao ${channelName} e coleta os dados brutos de cada participante ao final de cada janela de frequência.`
                : `DealGuard connects directly to ${channelName} and pulls raw data from each participant at the end of each window.`,
            },
            {
              step: "2",
              label: language === "pt" ? "Análise Sentinel AI" : "Sentinel AI analysis",
              desc: language === "pt"
                ? "Uma camada de IA revisa as evidências em busca de padrões suspeitos ou atividade fraudulenta. Resultados de alto risco são sinalizados e excluídos do pool."
                : "An AI layer reviews the evidence for suspicious patterns or fraudulent activity. High-risk results are flagged and excluded from the prize pool.",
            },
          ].map(({ step, label, desc }) => (
            <div key={step} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.activeLight, color: C.brand, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "monospace", border: `1px solid ${C.activeBorder}` }}>
                {step}
              </div>
              <div>
                <strong style={{ fontSize: 12, fontWeight: 700, color: C.brand, display: "block", marginBottom: 2 }}>{label}</strong>
                <p style={{ fontSize: 11, color: C.mid, lineHeight: 1.45, margin: 0 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <PinNote
          text={language === "pt" ? "Somente após essa verificação dupla o resultado é finalizado e os fundos liberados." : "Only after this double verification is the result finalized and funds released."}
          color={C.brand}
          bg={C.activeLight}
          border={C.activeBorder}
        />
      </RuleSection>

      {/* Section 3: Compliance */}
      <RuleSection
        title={language === "pt" ? "Como funciona o compliance" : "How compliance works"}
        accentColor={C.forming}
        accentBg={C.formingLight}
        icon={FileCheck}
        defaultOpen={false}
      >
        <p style={{ fontSize: 12, color: C.mid, lineHeight: 1.5, marginBottom: 10 }}>
          {language === "pt"
            ? "Seu desempenho é avaliado janela por janela — não apenas no final. Para vencer, você precisa cumprir a meta em cada janela do período."
            : "Your performance is evaluated window by window — not just at the end. To win, you need to hit the goal in every window."}
        </p>
        <div style={{ fontSize: 9, fontFamily: "monospace", fontWeight: 700, color: C.forming, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 7 }}>
          {language === "pt" ? "Exemplo: 1 post/dia · 4 semanas" : "Example: 1 post/day · 4 weeks"}
        </div>
        <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}` }}>
          {[
            { window: language === "pt" ? "Semana 1" : "Week 1", value: "7 posts", ok: true },
            { window: language === "pt" ? "Semana 2" : "Week 2", value: "7 posts", ok: true },
            { window: language === "pt" ? "Semana 3" : "Week 3", value: "7 posts", ok: true },
            { window: language === "pt" ? "Semana 4" : "Week 4", value: language === "pt" ? "5 posts — abaixo" : "5 posts — below", ok: false },
          ].map(({ window, value, ok }, i, arr) => (
            <div key={window} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: i < arr.length - 1 ? `1px solid ${C.border2}` : "none", fontSize: 12, background: ok ? "transparent" : "rgba(232,98,10,0.03)" }}>
              <span style={{ color: C.mid }}>{window}</span>
              <span style={{ fontWeight: 600, color: ok ? C.mid : C.forming }}>{value}</span>
              <span style={{ fontWeight: 700, color: ok ? C.brand : C.forming }}>{ok ? "✓" : "✗"}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: C.mid, lineHeight: 1.45, marginTop: 8 }}>
          {language === "pt"
            ? "Um bom desempenho nas semanas anteriores não compensa uma janela abaixo da meta. O DealGuard verifica automaticamente ao final de cada janela."
            : "Strong performance in previous windows does not compensate for a window below the goal. DealGuard verifies automatically at the end of each window."}
        </p>
      </RuleSection>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type TabId = "overview" | "participants" | "rules"

export default function DealClient({
  deal: dealData,
  userId,
  userSocialConnections,
}: {
  deal: DealWithParticipants
  userId: string | null
  userSocialConnections?: SocialConnection[]
}) {
  const router             = useRouter()
  const { language }       = useLanguageStore()
  const deal               = mapDeal(dealData, userId, language)
  const [activeTab,        setActiveTab]        = useState<TabId>("overview")
  const [joinLoading,      setJoinLoading]      = useState(false)
  const [joinError,        setJoinError]        = useState<string | null>(null)
  const [showSocialPopup,  setShowSocialPopup]  = useState<string[] | null>(null)
  const [showShareSheet,   setShowShareSheet]   = useState(false)
  const [showMoreMenu,     setShowMoreMenu]     = useState(false)
  const [linkCopied,       setLinkCopied]       = useState(false)
  const [joinedDeal,       setJoinedDeal]       = useState<{ amount: number; txSignature?: string } | null>(null)

  // ── Computed ────────────────────────────────────────────────────────────────
  const entryAmount    = dealData.entry_amount
  const feePct         = dealData.fee_pct ?? 3
  const aliveList      = deal.participants_list.filter(p => p.approved)
  const eliminatedList = deal.participants_list.filter(p => !p.approved)
  const aliveCount     = aliveList.length
  const eliminatedCount = eliminatedList.length
  const loserPool      = entryAmount * eliminatedCount
  const netLoserPool   = loserPool * (1 - feePct / 100)
  const extraPerWinner = aliveCount > 0 && eliminatedCount > 0 ? netLoserPool / aliveCount : 0
  const totalPerWinner = entryAmount + extraPerWinner
  const daysLeft       = Math.max(0, deal.daysTotal - deal.daysGone)

  // ── Frequency label ─────────────────────────────────────────────────────────
  const FREQ_LABELS: Record<string, Record<"pt"|"en", string>> = {
    daily:   { pt: "Diário",  en: "Daily"   },
    weekly:  { pt: "Semanal", en: "Weekly"  },
    monthly: { pt: "Mensal",  en: "Monthly" },
    yearly:  { pt: "Anual",   en: "Yearly"  },
  }
  const freqLabel = dealData.rule_frequency
    ? (FREQ_LABELS[dealData.rule_frequency]?.[language] ?? dealData.rule_frequency)
    : null

  // ── Channel handle for current user ─────────────────────────────────────────
  const myChannelHandle = (() => {
    const ch = dealData.verification_channels?.[0]
    if (!ch || !userSocialConnections) return null
    const conn = userSocialConnections.find(c => c.platform === ch && c.username)
    return conn?.username ? `@${conn.username}` : null
  })()

  // ── Share link ───────────────────────────────────────────────────────────────
  const shareUrl = `https://truedeal.app/deal/${dealData.id}`

  function handleCopyLink() {
    navigator.clipboard.writeText(shareUrl).catch(() => {})
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: dealData.title, text: language === "pt" ? `Participe do acordo "${dealData.title}" no TrueDeal` : `Join the deal "${dealData.title}" on TrueDeal`, url: shareUrl })
      } catch { /* cancelled */ }
    } else {
      handleCopyLink()
    }
  }

  // ── Status helpers ──────────────────────────────────────────────────────────
  const statusGradient =
    deal.status === "ativo"    ? "linear-gradient(135deg, #00523A, #00875A 60%, #00B852)" :
    deal.status === "pendente" ? "linear-gradient(135deg, #9E3700, #C94C0A 60%, #E8620A)" :
                                 "linear-gradient(135deg, #3A4A3A, #5A6A5A 60%, #8BA09A)"

  const statusColor =
    deal.status === "ativo"    ? C.brand :
    deal.status === "pendente" ? C.forming :
                                 C.dim

  const statusLabel =
    deal.status === "ativo"    ? (language === "pt" ? "Em andamento" : "Active") :
    deal.status === "pendente" ? (language === "pt" ? "Formação"     : "Formation") :
                                 (language === "pt" ? "Encerrado"    : "Ended")

  const activeTabColor = deal.status === "ativo" ? C.brand : deal.status === "pendente" ? C.forming : C.dim

  // ── Social connection check ─────────────────────────────────────────────────
  const requiredChannel = deal.verificationChannels?.[0] ?? null
  const emailOnlyPlatforms = new Set(["wellhub", "totalpass"])
  const hasRequiredConnection = requiredChannel
    ? !!userSocialConnections?.some(c => {
        if (c.platform !== requiredChannel) return false
        if (!c.username && !c.member_email && !c.external_id) return false
        return emailOnlyPlatforms.has(c.platform) || c.status !== "pending"
      })
    : true

  const isParticipant = userId ? dealData.participants.some(p => p.user_id === userId) : false

  // ── Join handler ────────────────────────────────────────────────────────────
  async function handleJoin() {
    if (!userId) { router.push("/login"); return }
    if (!hasRequiredConnection && requiredChannel) {
      setShowSocialPopup(
        deal.verificationChannels.filter(ch => !userSocialConnections?.some(c => {
          if (c.platform !== ch) return false
          if (!c.username && !c.member_email && !c.external_id) return false
          return emailOnlyPlatforms.has(c.platform) || c.status !== "pending"
        }))
      )
      return
    }
    setJoinLoading(true)
    setJoinError(null)
    const result = await joinDeal(dealData.id)
    setJoinLoading(false)
    if (result.error) {
      if (result.error.startsWith("MISSING_SOCIAL:")) {
        const channels = result.error.replace("MISSING_SOCIAL:", "").split(",").filter(Boolean)
        setShowSocialPopup(channels)
        return
      }
      setJoinError(result.error)
      return
    }
    setJoinedDeal({ amount: entryAmount, txSignature: result.txSignature })
  }

  // ── Tabs config ─────────────────────────────────────────────────────────────
  const TABS: { id: TabId; label: string }[] = [
    { id: "overview",     label: language === "pt" ? "Visão geral"    : "Overview" },
    { id: "participants", label: language === "pt" ? "Participantes"  : "Participants" },
    { id: "rules",        label: language === "pt" ? "Regras & Verif.": "Rules & Verif." },
  ]

  return (
    <div style={{ minHeight: "100vh", background: C.bg, maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column", paddingBottom: 100 }}>

      {/* ── TOP BAR ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 10px" }}>
        <button
          onClick={() => router.back()}
          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, color: C.mid, background: "none", border: "none", cursor: "pointer" }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          {language === "pt" ? "Acordos" : "Deals"}
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowShareSheet(true)} style={{ width: 32, height: 32, background: C.surface, border: `1px solid ${C.border}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Share2 style={{ width: 15, height: 15, stroke: C.mid, fill: "none" }} />
          </button>
          <button onClick={() => setShowMoreMenu(true)} style={{ width: 32, height: 32, background: C.surface, border: `1px solid ${C.border}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <MoreHorizontal style={{ width: 15, height: 15, stroke: C.mid, fill: "none" }} />
          </button>
        </div>
      </div>

      {/* ── HERO BLOCK ── */}
      <div style={{ margin: "0 20px", borderRadius: 26, overflow: "hidden" }}>
        <div style={{ background: statusGradient, padding: 20, position: "relative" }}>
          {/* Glow */}
          <div style={{ position: "absolute", top: "-20%", right: "-10%", width: 200, height: 200, background: "rgba(255,255,255,0.1)", borderRadius: "50%", filter: "blur(30px)", pointerEvents: "none" }} />

          {/* Status + privacy chips */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, position: "relative" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,0.2)", borderRadius: 100, padding: "3px 9px", fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.9)", fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: deal.status === "ativo" ? C.brand : "rgba(255,255,255,0.8)", boxShadow: deal.status === "ativo" ? `0 0 4px ${C.brand}` : "none", display: "inline-block", marginRight: 2 }} />
              {statusLabel}
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "rgba(0,0,0,0.2)", borderRadius: 100, padding: "3px 9px", fontSize: 9, color: "rgba(255,255,255,0.65)", fontFamily: "monospace", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
              {dealData.type === "privado" ? (language === "pt" ? "Privado" : "Private") : (language === "pt" ? "Público" : "Public")}
            </div>
          </div>

          {/* Channel icons */}
          <div style={{ display: "flex", gap: 5, marginBottom: 8, position: "relative" }}>
            {deal.verifications.map(v => {
              const m = VERIF_META[v]
              return (
                <div key={v} style={{ width: 22, height: 22, borderRadius: "50%", background: m.bg, border: "2px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>
                  {m.text ? m.text : (m.Icon ? <m.Icon className="w-2.5 h-2.5" /> : v[0].toUpperCase())}
                </div>
              )
            })}
          </div>

          {/* Title + description */}
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.04em", color: "#fff", lineHeight: 1.1, marginBottom: 5, position: "relative" }}>
            {deal.title}
          </h1>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginBottom: 14, position: "relative" }}>
            {deal.description || deal.subtitle}
          </p>

          {/* 4-stat grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 7, position: "relative" }}>
            {[
              { label: language === "pt" ? "Pote"    : "Pot",       value: `$${deal.pot.toLocaleString("en-US")}` },
              { label: "Players",                                     value: String(deal.participants) },
              { label: deal.status === "pendente" ? (language === "pt" ? "Início em" : "Starts in") : (language === "pt" ? "Dia" : "Day"), value: deal.status === "pendente" ? `${daysLeft}d` : `${deal.daysGone}/${deal.daysTotal}` },
              { label: language === "pt" ? "Duração" : "Duration",  value: `${deal.daysTotal}d` },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" as const, letterSpacing: "0.1em", fontFamily: "monospace", display: "block", marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* CTA — forming, non-participant, logged in */}
          {deal.status === "pendente" && !isParticipant && userId && (
            <button
              onClick={handleJoin}
              disabled={joinLoading}
              style={{ width: "100%", background: "rgba(255,255,255,0.9)", borderRadius: 100, padding: "11px", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#9E3700", border: "none", cursor: "pointer", marginTop: 14, position: "relative" }}
            >
              {joinLoading ? <Loader2 style={{ width: 16, height: 16, display: "inline" }} /> : `${language === "pt" ? "Entrar no acordo" : "Join deal"} · $${entryAmount}`}
            </button>
          )}
          {joinError && <p style={{ fontSize: 11, color: "rgba(255,220,0,0.9)", marginTop: 6, textAlign: "center", position: "relative" }}>{joinError}</p>}
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, margin: "14px 0 0", padding: "0 20px" }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "9px 0",
              fontSize: 10,
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? activeTabColor : C.dim,
              fontFamily: "monospace",
              letterSpacing: "0.04em",
              textTransform: "uppercase" as const,
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.id ? `2px solid ${activeTabColor}` : "2px solid transparent",
              marginBottom: -1,
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div style={{ padding: "14px 20px" }}>

          {/* 2x2 info grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 7 }}>
            {/* Entry — status-accented */}
            <div style={{ background: deal.status === "ativo" ? C.activeLight : C.formingLight, border: `1px solid ${deal.status === "ativo" ? C.activeBorder : C.formingBorder}`, borderRadius: 12, padding: 11 }}>
              <div style={{ fontSize: 8, fontFamily: "monospace", color: deal.status === "ativo" ? "rgba(0,184,82,0.55)" : "rgba(232,98,10,0.55)", textTransform: "uppercase" as const, letterSpacing: "0.12em", marginBottom: 3 }}>
                {language === "pt" ? "Entrada" : "Entry"}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", color: statusColor }}>
                ${entryAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </div>
            {/* Channel — status-accented */}
            <div style={{ background: deal.status === "ativo" ? C.activeLight : C.formingLight, border: `1px solid ${deal.status === "ativo" ? C.activeBorder : C.formingBorder}`, borderRadius: 12, padding: 11 }}>
              <div style={{ fontSize: 8, fontFamily: "monospace", color: deal.status === "ativo" ? "rgba(0,184,82,0.55)" : "rgba(232,98,10,0.55)", textTransform: "uppercase" as const, letterSpacing: "0.12em", marginBottom: 3 }}>
                {language === "pt" ? "Canal" : "Channel"}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: statusColor }}>
                {(dealData.verification_channels ?? []).map(c => CHANNEL_LABELS[c] ?? c).join(" + ") || "—"}
              </div>
            </div>
            {/* Goal — neutral */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 11 }}>
              <div style={{ fontSize: 8, fontFamily: "monospace", color: C.dim, textTransform: "uppercase" as const, letterSpacing: "0.12em", marginBottom: 3 }}>
                {language === "pt" ? "Meta" : "Goal"}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {dealData.rule_target ?? "—"} {getRuleLabels(language)[dealData.verification_type] ?? dealData.verification_type}
              </div>
              {freqLabel && (
                <div style={{ fontSize: 9, fontFamily: "monospace", color: C.dim, marginTop: 3, textTransform: "lowercase" as const }}>
                  {freqLabel}
                </div>
              )}
            </div>
            {/* Duration — neutral */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 11 }}>
              <div style={{ fontSize: 8, fontFamily: "monospace", color: C.dim, textTransform: "uppercase" as const, letterSpacing: "0.12em", marginBottom: 3 }}>
                {language === "pt" ? "Duração" : "Duration"}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{deal.daysTotal} {language === "pt" ? "dias" : "days"}</div>
            </div>
          </div>

          {/* Active: my progress block */}
          {deal.status === "ativo" && isParticipant && (
            <div style={{ background: C.activeLight, border: `1px solid ${C.activeBorder}`, borderRadius: 18, padding: 14, marginBottom: 7 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
                <span style={{ fontSize: 12, color: C.mid }}>{language === "pt" ? "Seu progresso" : "Your progress"}</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: C.brand, letterSpacing: "-0.03em" }}>
                  {language === "pt" ? `Dia ${deal.daysGone}` : `Day ${deal.daysGone}`}
                </span>
              </div>
              <div style={{ height: 5, background: "rgba(0,184,82,0.2)", borderRadius: 100, overflow: "hidden" }}>
                <div style={{ height: "100%", background: C.brand, width: `${Math.max(3, Math.round(deal.progress * 100))}%`, borderRadius: 100 }} />
              </div>
              <div style={{ fontSize: 10, color: C.mid, marginTop: 5, fontFamily: "monospace" }}>
                {deal.daysGone} {language === "pt" ? "de" : "of"} {deal.daysTotal} {language === "pt" ? "dias" : "days"} · {daysLeft}d {language === "pt" ? "restantes" : "left"}
              </div>
            </div>
          )}

          {/* Period tracker */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, marginTop: 7 }}>
            <div style={{ fontSize: 8, fontFamily: "monospace", color: C.dim, textTransform: "uppercase" as const, letterSpacing: "0.12em", marginBottom: 9 }}>
              {language === "pt" ? "Período" : "Period"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" as const }}>{deal.startDate}</span>
              <div style={{ flex: 1, height: 3, background: C.surface2, borderRadius: 100, overflow: "hidden" }}>
                <div style={{ height: "100%", background: statusColor, width: `${Math.max(3, Math.round(deal.progress * 100))}%`, borderRadius: 100 }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" as const }}>{deal.endDate}</span>
            </div>
            {deal.status === "pendente" && (
              <div style={{ fontFamily: "monospace", fontSize: 9, color: C.forming, marginTop: 5, textAlign: "center" }}>
                {language === "pt" ? "30 dias · mín. 2 participantes para iniciar" : "30 days · min. 2 participants to start"}
              </div>
            )}
          </div>

          {/* Economic model */}
          <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 18, padding: 12, marginTop: 7 }}>
            <div style={{ fontSize: 8, fontFamily: "monospace", color: C.dim, textTransform: "uppercase" as const, letterSpacing: "0.12em", marginBottom: 9 }}>
              {language === "pt" ? "Modelo econômico" : "Economic model"}
            </div>
            {[
              { label: language === "pt" ? "Entrada por pessoa" : "Entry per person", value: `$${entryAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, color: C.text },
              { label: `${language === "pt" ? "Pote atual" : "Current pot"} (${deal.participants} players)`, value: `$${deal.pot.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, color: C.brand },
              { label: language === "pt" ? "Taxa TrueDeal" : "TrueDeal fee", value: language === "pt" ? "3% do pool dos perdedores" : "3% of losers' pool only", color: C.dim },
              { label: language === "pt" ? "Vencedores recebem" : "Winners receive", value: language === "pt" ? "stake + 97% redistribuído" : "stake + 97% redistributed", color: C.brand },
            ].map((row, i, arr) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < arr.length - 1 ? `1px solid ${C.border2}` : "none", fontSize: 12 }}>
                <span style={{ color: C.mid }}>{row.label}</span>
                <strong style={{ fontWeight: 600, color: row.color }}>{row.value}</strong>
              </div>
            ))}
            <div style={{ fontSize: 10, color: C.dim, marginTop: 7, lineHeight: 1.5, fontFamily: "monospace" }}>
              {language === "pt" ? "A taxa incide apenas sobre quem não cumprir. Vencedores nunca pagam taxa." : "The fee only applies to those who don't comply. Winners never pay a fee."}
            </div>
          </div>
        </div>
      )}

      {/* ── PARTICIPANTS TAB ── */}
      {activeTab === "participants" && (
        <div style={{ padding: "14px 20px" }}>

          {/* 2-col counts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 12 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.brand }}>{aliveCount}</div>
              <div style={{ fontSize: 8, fontFamily: "monospace", color: C.dim, textTransform: "uppercase" as const, letterSpacing: "0.1em", marginTop: 2 }}>
                {language === "pt" ? "Ativos" : "Active"}
              </div>
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.forming }}>{eliminatedCount}</div>
              <div style={{ fontSize: 8, fontFamily: "monospace", color: C.dim, textTransform: "uppercase" as const, letterSpacing: "0.1em", marginTop: 2 }}>
                {language === "pt" ? "Falharam" : "Failed"}
              </div>
            </div>
          </div>

          {/* Active list */}
          <div style={{ fontSize: 10, fontFamily: "monospace", color: C.dim, textTransform: "uppercase" as const, letterSpacing: "0.12em", marginBottom: 7, fontWeight: 600 }}>
            {language === "pt" ? "Ativos" : "Active"}
          </div>
          {aliveList.length === 0 && (
            <div style={{ textAlign: "center", padding: "12px 0", fontSize: 11, color: C.dim }}>
              {language === "pt" ? "Nenhum participante ativo ainda." : "No active participants yet."}
            </div>
          )}
          {aliveList.map((player, i) => (
            <div key={player.id} style={{ background: player.isMe ? C.activeLight : C.surface, border: `1px solid ${player.isMe ? C.activeBorder : C.border}`, borderRadius: 10, padding: "9px 11px", marginBottom: 5, display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ fontSize: 14, width: 18, textAlign: "center", flexShrink: 0, color: C.dim }}>{i + 1}</div>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.surface2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.mid, flexShrink: 0, border: `1px solid ${C.border}` }}>
                {player.initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 1 }}>
                  {player.name}
                  {player.isMe && <span style={{ fontSize: 9, fontWeight: 700, marginLeft: 6, padding: "1px 5px", borderRadius: 100, background: C.activeLight, color: C.brand, fontFamily: "monospace" }}>{language === "pt" ? "Você" : "You"}</span>}
                </div>
                <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace" }}>
                  {player.isMe && myChannelHandle ? myChannelHandle : player.username}
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, textAlign: "right", color: C.brand }}>
                {eliminatedCount > 0
                  ? `+$${totalPerWinner.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                  : `$${entryAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              </div>
            </div>
          ))}

          {/* Failed list */}
          {eliminatedList.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontFamily: "monospace", color: C.forming, textTransform: "uppercase" as const, letterSpacing: "0.12em", marginTop: 10, marginBottom: 7, fontWeight: 600 }}>
                {language === "pt" ? "Falharam" : "Failed"}
              </div>
              {eliminatedList.map(player => (
                <div key={player.id} style={{ background: C.closedLight, border: `1px solid ${C.closedBorder}`, borderRadius: 10, padding: "9px 11px", marginBottom: 5, display: "flex", alignItems: "center", gap: 9, opacity: 0.75 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.surface2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.mid, flexShrink: 0, border: `1px solid ${C.border}` }}>
                    {player.initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 1 }}>{player.name}</div>
                    <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace" }}>
                      {player.isMe && myChannelHandle ? myChannelHandle : player.username}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, textAlign: "right", color: C.forming }}>
                    −${entryAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Projection block */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 12, marginTop: 10 }}>
            <div style={{ fontSize: 8, fontFamily: "monospace", color: C.dim, textTransform: "uppercase" as const, letterSpacing: "0.12em", marginBottom: 10 }}>
              {language === "pt" ? "Projeção se encerrar agora" : "Projection if it ends now"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em", color: C.brand }}>
                  {eliminatedCount > 0
                    ? `+$${totalPerWinner.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                    : `$${entryAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                </div>
                <div style={{ fontSize: 9, color: C.dim, fontFamily: "monospace", marginTop: 2 }}>{language === "pt" ? "por vencedor" : "per winner"}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em", color: C.forming }}>
                  −${entryAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: 9, color: C.dim, fontFamily: "monospace", marginTop: 2 }}>{language === "pt" ? "por perdedor" : "per loser"}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em", color: C.dim }}>
                  ${(loserPool * feePct / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: 9, color: C.dim, fontFamily: "monospace", marginTop: 2 }}>taxa (3%)</div>
              </div>
            </div>
          </div>

          {/* Forming: deal start info */}
          {deal.status === "pendente" && (
            <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 10, fontSize: 11, fontWeight: 600, background: C.formingLight, color: C.forming, border: `1px solid ${C.formingBorder}`, lineHeight: 1.5 }}>
              {language === "pt"
                ? "Deal inicia automaticamente às 00h00 GMT-3. Se houver menos de 2 participantes, o deal é cancelado e o stake devolvido."
                : "Deal starts automatically at midnight GMT-3. If fewer than 2 participants, the deal is cancelled and stakes returned."}
            </div>
          )}
        </div>
      )}

      {/* ── RULES TAB ── */}
      {activeTab === "rules" && (
        <div style={{ padding: "14px 20px" }}>
          <DealRulesCard deal={deal} dealData={dealData} />
        </div>
      )}

      {/* ── STICKY CTA FOOTER ── */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "rgba(240,243,240,0.96)", backdropFilter: "blur(16px)", borderTop: `1px solid ${C.border}`, padding: "11px 20px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.03em", color: statusColor }}>
              ${deal.pot.toLocaleString("en-US")} {language === "pt" ? "pote" : "pot"}
            </div>
            <div style={{ fontSize: 10, color: C.mid }}>
              {deal.status === "pendente"
                ? `$${entryAmount} ${language === "pt" ? "entrada · mín. 2 para iniciar" : "entry · min. 2 to start"}`
                : deal.status === "ativo" && isParticipant
                ? `${language === "pt" ? "Você está dentro" : "You're in"} · ${daysLeft}d ${language === "pt" ? "restantes" : "left"}`
                : `$${entryAmount} ${language === "pt" ? "entrada" : "entry"}`}
            </div>
          </div>
          {deal.status === "pendente" && !isParticipant && userId && (
            <button
              onClick={handleJoin}
              disabled={joinLoading}
              style={{ padding: "13px 20px", borderRadius: 100, fontSize: 12, fontWeight: 700, background: C.forming, color: "#fff", border: "none", cursor: "pointer", opacity: joinLoading ? 0.7 : 1 }}
            >
              {joinLoading ? "..." : `${language === "pt" ? "Entrar" : "Join"} · $${entryAmount}`}
            </button>
          )}
          {deal.status === "ativo" && (
            <button style={{ padding: "13px 20px", borderRadius: 100, fontSize: 12, fontWeight: 700, background: C.brand, color: "#fff", border: "none", cursor: "pointer" }}>
              {language === "pt" ? "Abrir" : "Open"} {deal.verificationChannels[0] ? CHANNEL_LABELS[deal.verificationChannels[0]] : "App"}
            </button>
          )}
          {deal.status === "finalizado" && (
            <button onClick={() => router.push(`/deal/${dealData.id}/result`)} style={{ padding: "13px 20px", borderRadius: 100, fontSize: 12, fontWeight: 700, background: C.surface2, color: C.mid, border: `1px solid ${C.border}`, cursor: "pointer" }}>
              {language === "pt" ? "Resultados" : "Results"}
            </button>
          )}
        </div>
      </div>

      {/* ── SHARE SHEET ── */}
      {showShareSheet && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowShareSheet(false)}
        >
          <div
            style={{ width: "100%", maxWidth: 430, margin: "0 auto", borderRadius: "24px 24px 0 0", padding: "20px 20px 44px", background: C.surface, boxShadow: "0 -12px 48px rgba(0,0,0,0.18)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div style={{ width: 36, height: 4, borderRadius: 100, background: C.border, margin: "0 auto 20px" }} />

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: C.text, letterSpacing: "-0.02em", marginBottom: 2 }}>
                  {language === "pt" ? "Compartilhar acordo" : "Share deal"}
                </p>
                <p style={{ fontSize: 12, color: C.dim }}>{dealData.title}</p>
              </div>
              <button onClick={() => setShowShareSheet(false)} style={{ width: 32, height: 32, borderRadius: "50%", background: C.surface2, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X style={{ width: 16, height: 16, stroke: C.mid, fill: "none" }} />
              </button>
            </div>

            {/* Deal preview pill */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 14, background: deal.status === "pendente" ? C.formingLight : C.activeLight, border: `1px solid ${deal.status === "pendente" ? C.formingBorder : C.activeBorder}`, marginBottom: 18 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: deal.status === "pendente" ? C.forming : C.brand, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Activity style={{ width: 16, height: 16, stroke: "#fff", fill: "none" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dealData.title}</p>
                <p style={{ fontSize: 10, color: C.dim, fontFamily: "monospace" }}>
                  ${dealData.entry_amount} · {dealData.participant_count} {language === "pt" ? "participantes" : "participants"}
                </p>
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: deal.status === "pendente" ? C.forming : C.brand, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>
                {statusLabel}
              </div>
            </div>

            {/* URL row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 14, background: C.surface2, border: `1px solid ${C.border}`, marginBottom: 16 }}>
              <span style={{ flex: 1, fontSize: 12, color: C.mid, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shareUrl}</span>
              <button
                onClick={handleCopyLink}
                style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: linkCopied ? C.brand : C.mid, background: "none", border: "none", cursor: "pointer", fontFamily: "monospace", letterSpacing: "0.04em" }}
              >
                {linkCopied ? (language === "pt" ? "Copiado!" : "Copied!") : (language === "pt" ? "Copiar" : "Copy")}
              </button>
            </div>

            {/* CTA buttons */}
            <button
              onClick={handleNativeShare}
              style={{ width: "100%", padding: 15, borderRadius: 100, fontWeight: 700, fontSize: 14, color: "#fff", background: `linear-gradient(135deg,${C.brandDark},${C.brand})`, border: "none", cursor: "pointer", boxShadow: "0 4px 18px rgba(0,184,82,0.3)" }}
            >
              {language === "pt" ? "Compartilhar" : "Share"}
            </button>
          </div>
        </div>
      )}

      {/* ── MORE MENU ── */}
      {showMoreMenu && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            style={{ width: "100%", maxWidth: 430, margin: "0 auto", borderRadius: "24px 24px 0 0", padding: "20px 20px 44px", background: C.surface, boxShadow: "0 -12px 48px rgba(0,0,0,0.18)" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 36, height: 4, borderRadius: 100, background: C.border, margin: "0 auto 20px" }} />
            {dealData.solana_tx_signature ? (
              <a
                href={`https://solscan.io/tx/${dealData.solana_tx_signature}${process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta" ? "" : "?cluster=devnet"}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 14, background: C.surface2, border: `1px solid ${C.border}`, textDecoration: "none" }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 12, background: C.activeLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${C.activeBorder}` }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{language === "pt" ? "Ver na blockchain" : "View on blockchain"}</div>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 2, fontFamily: "monospace" }}>Solscan · {dealData.solana_tx_signature.slice(0, 8)}…</div>
                </div>
                <span style={{ color: C.dim, fontSize: 16 }}>→</span>
              </a>
            ) : (
              <div style={{ padding: "16px", borderRadius: 14, background: C.surface2, border: `1px solid ${C.border}`, textAlign: "center" }}>
                <p style={{ fontSize: 13, color: C.dim }}>{language === "pt" ? "Transação blockchain não disponível." : "Blockchain transaction not available."}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── JOIN CONFIRMATION MODAL ── */}
      {joinedDeal && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}
        >
          <div
            style={{ width: "100%", maxWidth: 430, margin: "0 auto", borderRadius: "24px 24px 0 0", background: C.surface, boxShadow: "0 -16px 64px rgba(0,0,0,0.22)", padding: "24px 20px 48px" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div style={{ width: 36, height: 4, borderRadius: 100, background: C.border, margin: "0 auto 22px" }} />

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: C.activeLight, border: `1.5px solid ${C.activeBorder}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <ShieldCheck style={{ width: 26, height: 26, stroke: C.brand, fill: "none" }} />
              </div>
              <p style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", color: C.text, marginBottom: 4 }}>
                {language === "pt" ? "Depósito confirmado!" : "Deposit confirmed!"}
              </p>
              <p style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", color: C.brand }}>
                ${joinedDeal.amount.toFixed(2)} USDC
              </p>
            </div>

            {/* TX hash */}
            {joinedDeal.txSignature && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: C.surface2, border: `1px solid ${C.border}`, marginBottom: 16 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: C.dim, fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase", flexShrink: 0 }}>TX</span>
                <span style={{ fontSize: 11, color: C.mid, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                  {joinedDeal.txSignature.slice(0, 20)}…{joinedDeal.txSignature.slice(-8)}
                </span>
              </div>
            )}

            {/* Conditions table */}
            <div style={{ borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 14 }}>
              {[
                { label: language === "pt" ? "Acordo" : "Deal", value: dealData.title },
                {
                  label: language === "pt" ? "Regra" : "Rule",
                  value: [
                    dealData.rule_target,
                    getRuleLabels(language)[dealData.verification_type] ?? dealData.verification_type,
                    freqLabel,
                  ].filter(Boolean).join(" · ") || "—",
                },
                {
                  label: language === "pt" ? "Canal" : "Channel",
                  value: (dealData.verification_channels ?? []).map(c => CHANNEL_LABELS[c] ?? c).join(" + ") || "—",
                },
                { label: language === "pt" ? "Período" : "Period", value: `${deal.startDate} → ${deal.endDate}` },
                { label: language === "pt" ? "Participantes" : "Participants", value: language === "pt" ? "Mín. 2 para ativar" : "Min. 2 to activate" },
                { label: language === "pt" ? "Taxa" : "Fee", value: language === "pt" ? "3% (só perdedores)" : "3% (losers only)" },
              ].map((row, i, arr) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 12px", borderBottom: i < arr.length - 1 ? `1px solid ${C.border2}` : "none", fontSize: 12 }}>
                  <span style={{ color: C.dim, flexShrink: 0, marginRight: 8 }}>{row.label}</span>
                  <span style={{ fontWeight: 600, color: C.text, textAlign: "right", fontFamily: i === 0 ? undefined : "monospace", fontSize: i === 0 ? 12 : 11 }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Warning */}
            <div style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(232,98,10,0.07)", border: `1px solid rgba(232,98,10,0.18)`, fontSize: 11, color: C.forming, fontWeight: 600, lineHeight: 1.5, marginBottom: 18 }}>
              {language === "pt"
                ? "O deal só inicia se atingir 2 participantes antes da data de início. Caso contrário, seu USDC é devolvido automaticamente."
                : "The deal only starts if it reaches 2 participants before the start date. Otherwise, your USDC is returned automatically."}
            </div>

            <button
              onClick={() => { setJoinedDeal(null); router.refresh() }}
              style={{ width: "100%", padding: 16, borderRadius: 100, fontWeight: 700, fontSize: 14, color: "#fff", background: `linear-gradient(135deg,${C.brandDark},${C.brand})`, border: "none", cursor: "pointer", boxShadow: "0 4px 18px rgba(0,184,82,0.3)" }}
            >
              {language === "pt" ? "Ver meu deal" : "View my deal"}
            </button>
          </div>
        </div>
      )}

      {/* ── SOCIAL POPUP ── */}
      {showSocialPopup && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowSocialPopup(null)}
        >
          <div
            style={{ width: "100%", maxWidth: 430, margin: "0 auto", borderRadius: "24px 24px 0 0", padding: "20px 20px 40px", background: "rgba(255,255,255,0.98)", boxShadow: "0 -16px 64px rgba(0,0,0,0.2)" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(232,98,10,0.1)" }}>
                  <AlertCircle style={{ width: 20, height: 20, stroke: C.forming, fill: "none" }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
                  {language === "pt" ? "Conta não vinculada" : "Account not linked"}
                </h3>
              </div>
              <button
                onClick={() => setShowSocialPopup(null)}
                style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,0.06)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X style={{ width: 16, height: 16, stroke: C.mid, fill: "none" }} />
              </button>
            </div>
            <div style={{ borderRadius: 16, padding: 16, marginBottom: 20, background: C.formingLight, border: `1px solid ${C.formingBorder}` }}>
              <p style={{ fontSize: 14, color: "#9E3700", fontWeight: 600, marginBottom: 4, lineHeight: 1.5 }}>
                {language === "pt"
                  ? `Para participar deste deal, vincule sua conta ${showSocialPopup.map(ch => CHANNEL_LABELS[ch] ?? ch).join(" + ")}.`
                  : `To join this deal, link your ${showSocialPopup.map(ch => CHANNEL_LABELS[ch] ?? ch).join(" + ")} account.`}
              </p>
              <p style={{ fontSize: 12, color: C.forming, lineHeight: 1.5 }}>
                {language === "pt"
                  ? "O app usa sua conta para verificar automaticamente se você cumpriu o desafio."
                  : "The app uses your account to automatically verify if you met the challenge."}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {showSocialPopup.map(ch => (
                <div key={ch} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.07)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#fff", background: ch === "x" ? "#000" : ch === "strava" ? "#FC4C02" : ch === "wellhub" ? "#D00020" : ch === "totalpass" ? "#0055BB" : C.dim }}>
                    {ch === "x" ? "𝕏" : ch[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{CHANNEL_LABELS[ch] ?? ch}</div>
                    <div style={{ fontSize: 12, color: C.dim }}>{language === "pt" ? "Não vinculado" : "Not linked"}</div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => router.push("/profile")}
              style={{ width: "100%", padding: 16, borderRadius: 100, fontWeight: 700, color: "#fff", fontSize: 14, background: C.brand, border: "none", cursor: "pointer" }}
            >
              {language === "pt" ? "Vincular conta agora" : "Link account now"}
            </button>
            <button
              onClick={() => setShowSocialPopup(null)}
              style={{ width: "100%", marginTop: 10, padding: 12, borderRadius: 100, fontWeight: 600, color: C.mid, fontSize: 14, background: "rgba(0,0,0,0.04)", border: "none", cursor: "pointer" }}
            >
              {language === "pt" ? "Cancelar" : "Cancel"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
