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
import { getMyUsdcBalance } from "@/lib/actions/wallet"
import { recordDealCheckin } from "@/lib/actions/checkins"

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

type VerifType  = "x" | "strava" | "gympass" | "youtube" | "totalpass"
type PrizeType  = "proporcional" | "primeiro" | "ranking"
type DealStatus = "ativo" | "pendente" | "finalizado"

interface Participant {
  id: string
  initials: string
  avatarUrl: string | null
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
  shortId: string
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

function PlayerAvatar({ player, size, bg, border, textColor }: {
  player: { initials: string; avatarUrl: string | null }
  size: number; bg: string; border: string; textColor: string
}) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: player.avatarUrl ? "transparent" : bg, border: `1.5px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.33, fontWeight: 700, color: textColor, flexShrink: 0, overflow: "hidden" }}>
      {player.avatarUrl
        ? <img src={player.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : player.initials}
    </div>
  )
}

function getUserTag(username: string) {
  const plain = username.replace(/^@/, "")
  const digits = (plain.match(/\d+/g) ?? []).join("")
  if (digits) return `#${digits}`
  return `#${plain}`
}

function buildPrizeSlices(distribution: Distribution, netPot: number): PrizeSlice[] {
  // netPot is already net of the 3% fee on losers — no additional fee slice here.
  if (distribution === "winner") return [
    { label: "Vencedor", pct: 1.0, color: "#F59E0B", amount: netPot },
  ]
  if (distribution === "top3") return [
    { label: "1º lugar", pct: 0.50, color: "#F59E0B", amount: Math.round(netPot * 0.50) },
    { label: "2º lugar", pct: 0.30, color: "#9CA3AF", amount: Math.round(netPot * 0.30) },
    { label: "3º lugar", pct: 0.20, color: "#D97706", amount: Math.round(netPot * 0.20) },
  ]
  return [{ label: "Proporcional", pct: 1.0, color: "#7C3AED", amount: netPot }]
}

function buildPotentialWin(distribution: Distribution, netPot: number, myRank: number): number | undefined {
  if (distribution === "winner") return myRank === 1 ? netPot : undefined
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

  const statusMap: Record<string, DealStatus> = {
    formacao:   "pendente",
    ativo:      "ativo",
    finalizado: "finalizado",
    liquidando: "finalizado",
    encerrado:  "finalizado",
  }
  const status    = statusMap[d.status] ?? "pendente"
  const prizeMap: Record<string, PrizeType> = { winner: "primeiro", top3: "ranking", proportional: "proporcional" }
  const prizeType = prizeMap[d.distribution] ?? "primeiro"

  const knownVerifs = ["x", "strava", "gympass", "youtube", "totalpass"]
  const verifications = (d.verification_channels ?? []).filter(c => knownVerifs.includes(c)) as VerifType[]

  const participants_list: Participant[] = d.participants.map((p, i) => {
    const name     = p.profile.display_name || p.profile.username
    const startVal = p.start_snapshot   ? (Object.values(p.start_snapshot)[0]   as number ?? 0) : 0
    const currVal  = p.current_snapshot ? (Object.values(p.current_snapshot)[0] as number ?? 0) : 0
    const joinedAt = new Date(p.joined_at)
    return {
      id:           p.id,
      initials:     getInitials(name),
      avatarUrl:    p.profile.avatar_url ?? null,
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
    shortId:             (d.short_id ?? d.id.replace(/-/g, "").slice(-8)).toUpperCase(),
  }
}

// ── Static data ───────────────────────────────────────────────────────────────

const VERIF_META: Record<VerifType, { bg: string; label: string; text?: string; Icon?: React.FC<{ className?: string }> }> = {
  x:         { bg: "#000000", label: "X",         text: "𝕏"  },
  strava:    { bg: "#FC4C02", label: "Strava",     Icon: Activity },
  gympass:   { bg: "#00A651", label: "Gympass",    text: "GP" },
  youtube:   { bg: "#FF0000", label: "YouTube",    text: "▶"  },
  totalpass: { bg: "#0047AB", label: "TotalPass",  text: "T"  },
}

const CHANNEL_LABELS: Record<string, string> = {
  x: "X", instagram: "Instagram", tiktok: "TikTok", linkedin: "LinkedIn",
  discord: "Discord", youtube: "YouTube", strava: "Strava",
  totalpass: "TotalPass", gympass: "Gympass",
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
      { text: lang === "pt" ? "Vá à academia e registre seu check-in no botão dentro do deal no app" : "Go to the gym and tap the check-in button inside the deal in the app", valid: true },
      { text: lang === "pt" ? "Máximo 1 check-in por dia — o sistema bloqueia duplicatas automaticamente" : "Max 1 check-in per day — duplicates are blocked automatically", valid: true },
      { text: lang === "pt" ? "Vinculação com conta TotalPass obrigatória antes de participar" : "TotalPass account must be linked before joining", valid: true },
      { text: lang === "pt" ? "Prazo: registre antes de meia-noite (horário de Brasília)" : "Deadline: register before midnight (Brasília time)", valid: true },
      { text: lang === "pt" ? "Check-ins fora do período do deal não são contabilizados" : "Check-ins outside the deal period do not count", valid: false },
      { text: lang === "pt" ? "Check-ins de dias anteriores à data de início não são válidos" : "Check-ins before the deal start date are not valid", valid: false },
    ],
    pinNote: lang === "pt" ? "Vá à academia → abra o app → toque em 'Registrar check-in'. Simples assim." : "Go to the gym → open the app → tap 'Record check-in'. Simple as that.",
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
          {language === "pt" ? "Exemplo: 7 posts/semana · 4 semanas" : "Example: 7 posts/week · 4 weeks"}
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

type TabId = "overview" | "progress" | "participants" | "rules"

interface CheckinStats {
  count: number
  checkedInToday: boolean
}

export default function DealClient({
  deal: dealData,
  userId,
  userSocialConnections,
  checkinStats: initialCheckinStats,
  allCheckins = {},
}: {
  deal: DealWithParticipants
  userId: string | null
  userSocialConnections?: SocialConnection[]
  checkinStats?: CheckinStats | null
  allCheckins?: Record<string, { date: string; activityAt: string }[]>
}) {
  const router             = useRouter()
  const { language }       = useLanguageStore()
  const deal               = mapDeal(dealData, userId, language)
  const [activeTab,        setActiveTab]        = useState<TabId>("overview")
  const [joinLoading,      setJoinLoading]      = useState(false)
  const [joinError,        setJoinError]        = useState<string | null>(null)
  const [showJoinConfirm,  setShowJoinConfirm]  = useState(false)
  const [walletBalance,    setWalletBalance]    = useState<number | null>(null)
  const [showSocialPopup,  setShowSocialPopup]  = useState<string[] | null>(null)
  const [showShareSheet,   setShowShareSheet]   = useState(false)
  const [showMoreMenu,     setShowMoreMenu]     = useState(false)
  const [linkCopied,       setLinkCopied]       = useState(false)
  const [joinedDeal,       setJoinedDeal]       = useState<{ amount: number; txSignature?: string } | null>(null)
  const [checkinStats,     setCheckinStats]     = useState<CheckinStats>(initialCheckinStats ?? { count: 0, checkedInToday: false })
  const [checkinLoading,   setCheckinLoading]   = useState(false)
  const [checkinFeedback,  setCheckinFeedback]  = useState<string | null>(null)

  // ── Gym check-in helpers ────────────────────────────────────────────────────
  const GYM_CHANNELS = ["totalpass"]
  const isGymDeal = (dealData.verification_channels ?? []).some(c => GYM_CHANNELS.includes(c))

  async function handleCheckin() {
    if (!userId) { router.push("/login"); return }
    setCheckinLoading(true)
    setCheckinFeedback(null)
    const res = await recordDealCheckin(dealData.id)
    setCheckinLoading(false)
    if (res.alreadyDone) {
      setCheckinStats(s => ({ ...s, checkedInToday: true }))
      setCheckinFeedback(language === "pt" ? "Você já fez check-in hoje!" : "You already checked in today!")
    } else if (res.success) {
      setCheckinStats(s => ({ count: s.count + 1, checkedInToday: true }))
      setCheckinFeedback(language === "pt" ? "✓ Check-in registrado!" : "✓ Check-in recorded!")
    } else {
      setCheckinFeedback(res.error ?? (language === "pt" ? "Erro ao registrar check-in" : "Failed to record check-in"))
    }
    setTimeout(() => setCheckinFeedback(null), 3000)
  }

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
  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/deal/${dealData.id}`

  const sharePot  = Math.round(entryAmount * (dealData.participant_count ?? 1))
  const shareRule = `${dealData.rule_target ?? "?"} ${getRuleLabels(language)[dealData.verification_type] ?? dealData.verification_type}${freqLabel ? ` · ${freqLabel}` : ""}`
  const shareStartFmt = format(new Date(dealData.start_date), language === "pt" ? "dd MMM" : "MMM dd", { locale: language === "pt" ? ptBR : undefined })
  const shareEndFmt   = format(new Date(dealData.end_date),   language === "pt" ? "dd MMM" : "MMM dd", { locale: language === "pt" ? ptBR : undefined })

  const shareText = language === "pt"
    ? `🤝 Entrei em um desafio no TrueDeal!\n\n"${dealData.title}"\n🎯 Regra: ${shareRule}\n💰 Entrada: $${entryAmount} · Pote: $${sharePot}\n📅 ${shareStartFmt} → ${shareEndFmt}\n\nVem entrar também 👉`
    : `🤝 I joined a deal on TrueDeal!\n\n"${dealData.title}"\n🎯 Rule: ${shareRule}\n💰 Entry: $${entryAmount} · Pot: $${sharePot}\n📅 ${shareStartFmt} → ${shareEndFmt}\n\nJoin here 👉`

  function handleCopyLink() {
    navigator.clipboard.writeText(shareUrl).catch(() => {})
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  function handleShareX() {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`, "_blank")
  }

  async function handleShareWhatsApp() {
    const cardEndpoint = `${window.location.origin}/api/og/deal/${dealData.id}`
    try {
      const res  = await fetch(cardEndpoint)
      const blob = await res.blob()
      const file = new File([blob], "truedeal-card.png", { type: "image/png" })
      if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${shareText}\n${shareUrl}` })
        return
      }
    } catch { /* fallback below */ }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`, "_blank")
  }

  async function handleNativeShare() {
    const cardEndpoint = `${window.location.origin}/api/og/deal/${dealData.id}`
    try {
      const res  = await fetch(cardEndpoint)
      const blob = await res.blob()
      const file = new File([blob], "truedeal-card.png", { type: "image/png" })
      if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${shareText}\n${shareUrl}` })
        return
      }
    } catch { /* fallback below */ }
    if (typeof navigator.share === "function") {
      try { await navigator.share({ title: dealData.title, text: shareText, url: shareUrl }) } catch { /* cancelled */ }
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
  const emailOnlyPlatforms = new Set(["totalpass"])
  const hasRequiredConnection = requiredChannel
    ? !!userSocialConnections?.some(c => {
        if (c.platform !== requiredChannel) return false
        if (!c.username && !c.member_email && !c.external_id) return false
        return emailOnlyPlatforms.has(c.platform) || c.status !== "pending"
      })
    : true

  const isParticipant = userId ? dealData.participants.some(p => p.user_id === userId) : false

  // ── Join confirm ────────────────────────────────────────────────────────────
  async function openJoinConfirm() {
    if (!userId) { router.push("/login"); return }
    setWalletBalance(null)
    setShowJoinConfirm(true)
    const bal = await getMyUsdcBalance()
    setWalletBalance(bal)
  }

  // ── Join handler ────────────────────────────────────────────────────────────
  async function handleJoin() {
    if (!userId) { router.push("/login"); return }
    setShowJoinConfirm(false)
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
    { id: "overview",     label: language === "pt" ? "Geral"      : "Overview"  },
    { id: "progress",     label: language === "pt" ? "Progresso"  : "Progress"  },
    { id: "participants", label: language === "pt" ? "Players"    : "Players"   },
    { id: "rules",        label: language === "pt" ? "Regras"     : "Rules"     },
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
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginBottom: 4, position: "relative" }}>
            {deal.description || deal.subtitle}
          </p>
          <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", letterSpacing: "0.1em", display: "block", marginBottom: 14, position: "relative" }}>
            #{deal.shortId}
          </span>

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
              onClick={openJoinConfirm}
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

          {/* Active: time progress block (non-gym) */}
          {deal.status === "ativo" && isParticipant && !isGymDeal && (
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

          {/* Active: gym check-in block */}
          {deal.status === "ativo" && isParticipant && isGymDeal && (
            <div style={{ background: C.activeLight, border: `1px solid ${C.activeBorder}`, borderRadius: 18, padding: 14, marginBottom: 7 }}>
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 9, fontFamily: "monospace", color: C.brand, textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: 3 }}>
                    {language === "pt" ? "Seus check-ins" : "Your check-ins"}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: C.brand, lineHeight: 1 }}>
                    {checkinStats.count}
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.mid, marginLeft: 4 }}>
                      / {dealData.rule_target ?? "?"}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: "right" as const }}>
                  <div style={{ fontSize: 9, fontFamily: "monospace", color: C.mid, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 3 }}>
                    {language === "pt" ? "Hoje" : "Today"}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: checkinStats.checkedInToday ? C.brand : C.dim }}>
                    {checkinStats.checkedInToday ? "✓" : "—"}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: 5, background: "rgba(0,184,82,0.15)", borderRadius: 100, overflow: "hidden", marginBottom: 10 }}>
                <div style={{
                  height: "100%", background: C.brand, borderRadius: 100,
                  width: `${Math.min(100, Math.max(3, (checkinStats.count / (dealData.rule_target ?? 1)) * 100))}%`,
                  transition: "width 0.4s ease",
                }} />
              </div>

              {/* Time progress sub-line */}
              <div style={{ fontSize: 10, color: C.mid, fontFamily: "monospace", marginBottom: 12 }}>
                {language === "pt" ? `Dia ${deal.daysGone} de ${deal.daysTotal} · ${daysLeft}d restantes` : `Day ${deal.daysGone} of ${deal.daysTotal} · ${daysLeft}d left`}
              </div>

              {/* Check-in button */}
              <button
                onClick={handleCheckin}
                disabled={checkinLoading || checkinStats.checkedInToday}
                style={{
                  width: "100%", padding: "11px", borderRadius: 100, fontSize: 13, fontWeight: 700, border: "none", cursor: checkinStats.checkedInToday ? "default" : "pointer",
                  background: checkinStats.checkedInToday ? "rgba(0,184,82,0.15)" : C.brand,
                  color: checkinStats.checkedInToday ? C.brand : "#fff",
                  opacity: checkinLoading ? 0.7 : 1,
                  transition: "all 0.2s",
                }}
              >
                {checkinLoading
                  ? (language === "pt" ? "Registrando..." : "Recording...")
                  : checkinStats.checkedInToday
                    ? (language === "pt" ? "✓ Check-in de hoje feito" : "✓ Today's check-in done")
                    : (language === "pt" ? "Registrar check-in de hoje" : "Record today's check-in")}
              </button>

              {/* Feedback message */}
              {checkinFeedback && (
                <div style={{ fontSize: 11, fontWeight: 600, color: checkinFeedback.startsWith("✓") ? C.brand : C.forming, textAlign: "center" as const, marginTop: 8 }}>
                  {checkinFeedback}
                </div>
              )}
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

      {/* ── PROGRESS TAB ── */}
      {activeTab === "progress" && (() => {
        const startDate = new Date(dealData.start_date)
        const endDate   = new Date(dealData.end_date)
        const freq      = dealData.rule_frequency ?? "daily"
        const now       = new Date()

        // Build compliance windows from start to end based on frequency
        type Window = { label: string; start: Date; end: Date; completed: boolean; current: boolean }
        const windows: Window[] = []
        let cur = new Date(startDate)
        let n   = 1
        while (cur < endDate) {
          const next = new Date(cur)
          if (freq === "daily")        next.setDate(next.getDate() + 1)
          else if (freq === "weekly")  next.setDate(next.getDate() + 7)
          else if (freq === "monthly") next.setMonth(next.getMonth() + 1)
          else                         next.setTime(endDate.getTime())
          const windowEnd = next > endDate ? new Date(endDate) : next
          windows.push({
            label:     freq === "daily"   ? (language === "pt" ? `Dia ${n}`     : `Day ${n}`)     :
                       freq === "weekly"  ? (language === "pt" ? `Semana ${n}`  : `Week ${n}`)   :
                                           (language === "pt" ? `Mês ${n}`     : `Month ${n}`),
            start:     new Date(cur),
            end:       new Date(windowEnd),
            completed: windowEnd <= now,
            current:   cur <= now && windowEnd > now,
          })
          cur = new Date(windowEnd)
          n++
        }

        const completedWindows = windows.filter(w => w.completed)
        const locale = language === "pt" ? ptBR : undefined

        return (
          <div style={{ padding: "14px 20px" }}>

            {/* Summary stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, marginBottom: 14 }}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.brand }}>{completedWindows.length}</div>
                <div style={{ fontSize: 8, fontFamily: "monospace", color: C.dim, textTransform: "uppercase" as const, letterSpacing: "0.1em", marginTop: 2 }}>
                  {language === "pt" ? "Períodos" : "Periods"}
                </div>
              </div>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.brand }}>{aliveCount}</div>
                <div style={{ fontSize: 8, fontFamily: "monospace", color: C.dim, textTransform: "uppercase" as const, letterSpacing: "0.1em", marginTop: 2 }}>
                  {language === "pt" ? "Em dia" : "On track"}
                </div>
              </div>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.forming }}>{eliminatedCount}</div>
                <div style={{ fontSize: 8, fontFamily: "monospace", color: C.dim, textTransform: "uppercase" as const, letterSpacing: "0.1em", marginTop: 2 }}>
                  {language === "pt" ? "Falhou" : "Failed"}
                </div>
              </div>
            </div>

            {/* Per-participant progress cards */}
            {deal.participants_list.map(player => {
              const playerCheckins = allCheckins[player.id] ?? []
              const checkinDates   = new Set(playerCheckins.map(c => c.date))
              const isAlive        = player.approved
              const statusColor    = isAlive ? C.brand : C.forming
              const statusBg       = isAlive ? C.activeLight : C.formingLight
              const statusBorder   = isAlive ? C.activeBorder : C.formingBorder

              return (
                <div key={player.id} style={{ background: C.surface, border: `1px solid ${player.isMe ? C.activeBorder : C.border}`, borderRadius: 16, marginBottom: 10, overflow: "hidden" }}>
                  {/* Card header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: player.isMe ? C.activeLight : "transparent", borderBottom: `1px solid ${C.border2}` }}>
                    <PlayerAvatar player={player} size={34} bg={statusBg} border={statusBorder} textColor={statusColor} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 5 }}>
                        {player.name}
                        {player.isMe && (
                          <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 100, background: C.activeLight, color: C.brand, fontFamily: "monospace" }}>
                            {language === "pt" ? "Você" : "You"}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: C.dim, fontFamily: "monospace", marginTop: 1 }}>
                        {player.isMe && myChannelHandle ? myChannelHandle : player.username}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 100, background: statusBg, border: `1px solid ${statusBorder}` }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: statusColor }} />
                      <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "monospace", color: statusColor, letterSpacing: "0.06em" }}>
                        {isAlive
                          ? (language === "pt" ? "Em dia" : "On track")
                          : (language === "pt" ? "Eliminado" : "Eliminated")}
                      </span>
                    </div>
                  </div>

                  {/* Window dots (only show first 14 to avoid overflow) */}
                  {windows.length > 0 && (
                    <div style={{ padding: "10px 14px 8px" }}>
                      <div style={{ fontSize: 8, fontFamily: "monospace", color: C.dim, textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: 6 }}>
                        {language === "pt" ? "Histórico de períodos" : "Period history"}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5 }}>
                        {windows.slice(0, 28).map((w, wi) => {
                          const hasCheckin = isGymDeal ? checkinDates.has(w.start.toISOString().split("T")[0]) : null
                          const dot = w.current
                            ? { bg: "rgba(232,98,10,0.15)", border: C.forming, color: C.forming, symbol: "…" }
                            : !w.completed
                            ? { bg: C.surface2, border: C.border, color: C.dim, symbol: String(wi + 1) }
                            : isGymDeal
                            ? hasCheckin
                              ? { bg: C.activeLight, border: C.activeBorder, color: C.brand, symbol: "✓" }
                              : { bg: C.formingLight, border: C.formingBorder, color: C.forming, symbol: "✗" }
                            : dealData.status === "ativo"
                            ? { bg: C.surface2, border: C.border, color: C.dim, symbol: "?" }
                            : isAlive
                            ? { bg: C.activeLight, border: C.activeBorder, color: C.brand, symbol: "✓" }
                            : wi === completedWindows.length - 1
                            ? { bg: C.formingLight, border: C.formingBorder, color: C.forming, symbol: "✗" }
                            : { bg: C.activeLight, border: C.activeBorder, color: C.brand, symbol: "✓" }
                          return (
                            <div
                              key={wi}
                              title={`${w.label} · ${format(w.start, "dd MMM", { locale })}${w.completed ? "" : w.current ? " · Em andamento" : ""}`}
                              style={{ width: 26, height: 26, borderRadius: 6, background: dot.bg, border: `1px solid ${dot.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: dot.color, fontFamily: "monospace" }}
                            >
                              {dot.symbol}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Gym deal: show actual checkin list */}
                  {isGymDeal && playerCheckins.length > 0 && (
                    <div style={{ margin: "0 14px 12px", borderRadius: 10, border: `1px solid ${C.border2}`, overflow: "hidden" }}>
                      <div style={{ padding: "7px 10px", background: C.surface2, fontSize: 8, fontFamily: "monospace", color: C.dim, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>
                        {language === "pt" ? "Check-ins registrados" : "Recorded check-ins"} · {playerCheckins.length}
                      </div>
                      {playerCheckins.slice(-5).reverse().map((ck, ci) => (
                        <div key={ci} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", borderTop: `1px solid ${C.border2}`, fontSize: 11 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontWeight: 700, color: C.brand, fontSize: 12 }}>✓</span>
                            <span style={{ fontWeight: 600, color: C.text }}>
                              {format(new Date(ck.date), "dd MMM", { locale })}
                            </span>
                          </div>
                          <span style={{ fontSize: 10, color: C.dim, fontFamily: "monospace" }}>
                            {format(new Date(ck.activityAt), "HH:mm")}
                          </span>
                        </div>
                      ))}
                      {playerCheckins.length > 5 && (
                        <div style={{ padding: "6px 10px", borderTop: `1px solid ${C.border2}`, fontSize: 9, color: C.dim, fontFamily: "monospace", textAlign: "center" as const }}>
                          +{playerCheckins.length - 5} {language === "pt" ? "anteriores" : "more"}
                        </div>
                      )}
                    </div>
                  )}

                  {/* No data state for non-gym deals */}
                  {!isGymDeal && completedWindows.length === 0 && (
                    <div style={{ padding: "10px 14px 12px", fontSize: 11, color: C.dim, fontFamily: "monospace" }}>
                      {language === "pt" ? "Deal ainda não iniciou os períodos de verificação." : "Deal verification periods haven't started yet."}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* ── PARTICIPANTS TAB ── */}
      {activeTab === "participants" && (
        <div style={{ padding: "14px 20px" }}>

          {/* 2-col counts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 12 }}>
            <div style={{ background: C.activeLight, border: `1px solid ${C.activeBorder}`, borderRadius: 10, padding: 10, textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.brand }}>{aliveCount}</div>
              <div style={{ fontSize: 8, fontFamily: "monospace", color: C.brand, textTransform: "uppercase" as const, letterSpacing: "0.1em", marginTop: 2, opacity: 0.7 }}>
                {language === "pt" ? "Em dia" : "On track"}
              </div>
            </div>
            <div style={{ background: C.formingLight, border: `1px solid ${C.formingBorder}`, borderRadius: 10, padding: 10, textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.forming }}>{eliminatedCount}</div>
              <div style={{ fontSize: 8, fontFamily: "monospace", color: C.forming, textTransform: "uppercase" as const, letterSpacing: "0.1em", marginTop: 2, opacity: 0.7 }}>
                {language === "pt" ? "Eliminados" : "Eliminated"}
              </div>
            </div>
          </div>

          {/* Active list */}
          <div style={{ fontSize: 10, fontFamily: "monospace", color: C.brand, textTransform: "uppercase" as const, letterSpacing: "0.12em", marginBottom: 7, fontWeight: 700 }}>
            {language === "pt" ? "Em dia" : "On track"}
          </div>
          {aliveList.length === 0 && (
            <div style={{ textAlign: "center", padding: "12px 0", fontSize: 11, color: C.dim }}>
              {language === "pt" ? "Nenhum participante ativo ainda." : "No active participants yet."}
            </div>
          )}
          {aliveList.map((player, i) => (
            <div key={player.id} style={{ background: player.isMe ? C.activeLight : C.surface, border: `1px solid ${player.isMe ? C.activeBorder : C.border}`, borderRadius: 12, padding: "10px 12px", marginBottom: 6, display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ fontSize: 12, width: 18, textAlign: "center", flexShrink: 0, color: C.dim, fontFamily: "monospace", fontWeight: 600 }}>{i + 1}</div>
              <PlayerAvatar player={player} size={32} bg={C.activeLight} border={C.activeBorder} textColor={C.brand} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 2, display: "flex", alignItems: "center", gap: 5 }}>
                  {player.name}
                  {player.isMe && <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 100, background: C.activeLight, color: C.brand, fontFamily: "monospace" }}>{language === "pt" ? "Você" : "You"}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.brand, flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: C.brand, fontFamily: "monospace", fontWeight: 600 }}>
                    {language === "pt" ? "Cumprindo" : "Complying"}
                  </span>
                  <span style={{ fontSize: 9, color: C.dim, fontFamily: "monospace" }}>
                    · {player.isMe && myChannelHandle ? myChannelHandle : player.username}
                  </span>
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
              <div style={{ fontSize: 10, fontFamily: "monospace", color: C.forming, textTransform: "uppercase" as const, letterSpacing: "0.12em", marginTop: 12, marginBottom: 7, fontWeight: 700 }}>
                {language === "pt" ? "Eliminados" : "Eliminated"}
              </div>
              {eliminatedList.map(player => (
                <div key={player.id} style={{ background: C.formingLight, border: `1px solid ${C.formingBorder}`, borderRadius: 12, padding: "10px 12px", marginBottom: 6, display: "flex", alignItems: "center", gap: 9 }}>
                  <PlayerAvatar player={player} size={32} bg="rgba(139,160,154,0.12)" border={C.formingBorder} textColor={C.dim} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 2, color: C.mid, textDecoration: "line-through" }}>
                      {player.name}
                      {player.isMe && <span style={{ fontSize: 8, fontWeight: 700, marginLeft: 6, padding: "1px 5px", borderRadius: 100, background: C.formingLight, color: C.forming, fontFamily: "monospace", textDecoration: "none" as const }}>{language === "pt" ? "Você" : "You"}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 100, background: C.formingLight, color: C.forming, fontFamily: "monospace", border: `1px solid ${C.formingBorder}` }}>
                        {language === "pt" ? "Eliminado" : "Eliminated"}
                      </span>
                      <span style={{ fontSize: 9, color: C.dim, fontFamily: "monospace" }}>
                        · {player.isMe && myChannelHandle ? myChannelHandle : player.username}
                      </span>
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
              onClick={openJoinConfirm}
              disabled={joinLoading}
              style={{ padding: "13px 20px", borderRadius: 100, fontSize: 12, fontWeight: 700, background: C.forming, color: "#fff", border: "none", cursor: "pointer", opacity: joinLoading ? 0.7 : 1 }}
            >
              {joinLoading ? "..." : `${language === "pt" ? "Entrar" : "Join"} · $${entryAmount}`}
            </button>
          )}
          {deal.status === "ativo" && isParticipant && isGymDeal && (
            <button
              onClick={handleCheckin}
              disabled={checkinLoading || checkinStats.checkedInToday}
              style={{
                padding: "13px 20px", borderRadius: 100, fontSize: 12, fontWeight: 700, border: "none",
                cursor: checkinStats.checkedInToday ? "default" : "pointer",
                background: checkinStats.checkedInToday ? C.activeLight : C.brand,
                color: checkinStats.checkedInToday ? C.brand : "#fff",
                opacity: checkinLoading ? 0.7 : 1,
              }}
            >
              {checkinLoading ? "..." : checkinStats.checkedInToday ? (language === "pt" ? "✓ Feito" : "✓ Done") : (language === "pt" ? "Check-in" : "Check-in")}
            </button>
          )}
          {deal.status === "ativo" && !isGymDeal && (
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
            style={{ width: "100%", maxWidth: 430, margin: "0 auto", borderRadius: "28px 28px 0 0", padding: "0 0 44px", background: C.surface, boxShadow: "0 -16px 56px rgba(0,0,0,0.22)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div style={{ width: 36, height: 4, borderRadius: 100, background: C.border, margin: "14px auto 0" }} />

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 12px" }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: C.text, letterSpacing: "-0.02em" }}>
                {language === "pt" ? "Compartilhar deal" : "Share deal"}
              </p>
              <button onClick={() => setShowShareSheet(false)} style={{ width: 30, height: 30, borderRadius: "50%", background: C.surface2, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X style={{ width: 14, height: 14, stroke: C.mid, fill: "none" }} />
              </button>
            </div>

            {/* ── Card preview ── */}
            <div style={{ margin: "0 20px 14px", borderRadius: 20, overflow: "hidden", background: statusGradient, padding: "18px 18px 14px", position: "relative" }}>
              {/* glow blob */}
              <div style={{ position: "absolute", top: "-40%", right: "-8%", width: 160, height: 160, background: "rgba(255,255,255,0.08)", borderRadius: "50%", filter: "blur(40px)", pointerEvents: "none" }} />

              {/* status + type pills */}
              <div style={{ display: "flex", gap: 7, marginBottom: 12, position: "relative" }}>
                <div style={{ padding: "4px 10px", borderRadius: 100, background: "rgba(0,0,0,0.26)", color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: "1px" }}>
                  • {statusLabel.toUpperCase()}
                </div>
                <div style={{ padding: "4px 10px", borderRadius: 100, background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 10, fontWeight: 700 }}>
                  {dealData.type === "privado" ? (language === "pt" ? "PRIVADO" : "PRIVATE") : (language === "pt" ? "PÚBLICO" : "PUBLIC")}
                </div>
              </div>

              {/* title */}
              <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px", lineHeight: 1.2, marginBottom: 5, position: "relative" }}>
                {dealData.title}
              </div>

              {/* rule */}
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.68)", marginBottom: 14, position: "relative" }}>
                {shareRule}
              </div>

              {/* stats row */}
              <div style={{ display: "flex", gap: 7, position: "relative" }}>
                {[
                  { label: "ENTRY",   value: `$${entryAmount}` },
                  { label: "PLAYERS", value: String(dealData.participant_count ?? 0) },
                  { label: "POT",     value: `$${sharePot}` },
                  { label: "PERIOD",  value: `${shareStartFmt} → ${shareEndFmt}` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ flex: 1, background: "rgba(0,0,0,0.26)", borderRadius: 10, padding: "8px 9px" }}>
                    <div style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.48)", letterSpacing: "1px", marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* watermark */}
              <div style={{ marginTop: 12, fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "1.5px", position: "relative" }}>
                TRUEDEAL.APP
              </div>
            </div>

            {/* URL row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 20px 14px", padding: "10px 14px", borderRadius: 14, background: C.surface2, border: `1px solid ${C.border}` }}>
              <span style={{ flex: 1, fontSize: 12, color: C.mid, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shareUrl}</span>
              <button onClick={handleCopyLink} style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: linkCopied ? C.brand : C.mid, background: "none", border: "none", cursor: "pointer", fontFamily: "monospace", letterSpacing: "0.04em" }}>
                {linkCopied ? (language === "pt" ? "Copiado!" : "Copied!") : (language === "pt" ? "Copiar" : "Copy")}
              </button>
            </div>

            {/* Share buttons */}
            <div style={{ display: "flex", gap: 10, padding: "0 20px" }}>
              {/* X */}
              <button onClick={handleShareX}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, padding: "14px 8px", borderRadius: 18, background: "#000", border: "none", cursor: "pointer" }}>
                <span style={{ fontSize: 20, fontWeight: 900, color: "#fff", lineHeight: 1, fontFamily: "serif" }}>𝕏</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>
                  {language === "pt" ? "Post no X" : "Post on X"}
                </span>
              </button>

              {/* WhatsApp */}
              <button onClick={handleShareWhatsApp}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, padding: "14px 8px", borderRadius: 18, background: "#25D366", border: "none", cursor: "pointer" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>WhatsApp</span>
              </button>

              {/* More / native */}
              <button onClick={handleNativeShare}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, padding: "14px 8px", borderRadius: 18, background: C.surface2, border: `1px solid ${C.border}`, cursor: "pointer" }}>
                <Share2 style={{ width: 20, height: 20, stroke: C.mid, fill: "none" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: C.mid }}>{language === "pt" ? "Mais" : "More"}</span>
              </button>
            </div>
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
            {(() => {
              const myTx = dealData.participants.find(p => p.user_id === userId)?.transaction_hash
              const txSig = dealData.solana_tx_signature ?? myTx ?? null
              const cluster = process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta" ? "" : "?cluster=devnet"
              return txSig ? (
                <a
                  href={`https://solscan.io/tx/${txSig}${cluster}`}
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
                    <div style={{ fontSize: 11, color: C.dim, marginTop: 2, fontFamily: "monospace" }}>Solscan · {txSig.slice(0, 8)}…</div>
                  </div>
                  <span style={{ color: C.dim, fontSize: 16 }}>→</span>
                </a>
              ) : (
                <div style={{ padding: "16px", borderRadius: 14, background: C.surface2, border: `1px solid ${C.border}`, textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: C.dim }}>{language === "pt" ? "Transação blockchain não disponível." : "Blockchain transaction not available."}</p>
                </div>
              )
            })()}
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
                  <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#fff", background: ch === "x" ? "#000" : ch === "strava" ? "#FC4C02" : ch === "youtube" ? "#FF0000" : ch === "totalpass" ? "#0055BB" : C.dim }}>
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

      {/* ── Join Deal — Deposit Confirmation Modal ──────────────────────────── */}
      {showJoinConfirm && (() => {
        const after = walletBalance !== null ? walletBalance - entryAmount : null
        const mono  = "'DM Mono', monospace"
        const row = (label: string, value: string, valueColor?: string) => (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13, color: C.mid }}>{label}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: valueColor ?? C.text, fontFamily: mono }}>{value}</span>
          </div>
        )
        return (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowJoinConfirm(false)}
          >
            <div
              style={{ width: "100%", maxWidth: 430, margin: "0 auto", borderRadius: "28px 28px 0 0", background: C.surface, boxShadow: "0 -16px 60px rgba(0,0,0,0.18)", padding: "0 0 40px" }}
              onClick={e => e.stopPropagation()}
            >
              {/* Handle */}
              <div style={{ width: 36, height: 4, borderRadius: 100, background: C.border, margin: "14px auto 0" }} />

              {/* Header */}
              <div style={{ padding: "20px 24px 4px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.forming, fontFamily: mono, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 6 }}>
                  {language === "pt" ? "Entrar no acordo" : "Join deal"}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: C.text, marginBottom: 4, lineHeight: 1.2 }}>
                  {dealData.title}
                </div>
                <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.5 }}>
                  {language === "pt"
                    ? "Ao confirmar, seu depósito é reservado como garantia do seu compromisso com esse acordo."
                    : "By confirming, your deposit is locked as a guarantee of your commitment to this deal."}
                </div>
              </div>

              {/* Amount rows */}
              <div style={{ padding: "4px 24px 0" }}>
                {row(language === "pt" ? "Valor de entrada" : "Entry amount", `$${entryAmount.toFixed(2)}`)}
                {row(
                  language === "pt" ? "Saldo na carteira" : "Wallet balance",
                  walletBalance === null ? "—" : `$${walletBalance.toFixed(2)}`,
                  walletBalance === null ? C.dim : undefined,
                )}
                {row(
                  language === "pt" ? "Saldo após depósito" : "Balance after deposit",
                  after === null ? "—" : after < 0 ? `-$${Math.abs(after).toFixed(2)}` : `$${after.toFixed(2)}`,
                  after === null ? C.dim : after < 0 ? "#EF4444" : C.brand,
                )}
              </div>

              {/* Warning if insufficient */}
              {after !== null && after < 0 && (
                <div style={{ margin: "12px 24px 0", padding: "10px 12px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <p style={{ fontSize: 11, color: "#EF4444", fontWeight: 600 }}>
                    {language === "pt" ? "Saldo insuficiente. Adicione USDC à sua carteira antes de entrar." : "Insufficient balance. Add USDC to your wallet before joining."}
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: "flex", gap: 10, padding: "20px 24px 0" }}>
                <button
                  onClick={() => setShowJoinConfirm(false)}
                  style={{ flex: 1, padding: "14px", borderRadius: 100, fontSize: 13, fontWeight: 600, background: C.surface2, border: `1px solid ${C.border}`, color: C.mid, cursor: "pointer" }}
                >
                  {language === "pt" ? "Cancelar" : "Cancel"}
                </button>
                <button
                  onClick={handleJoin}
                  disabled={joinLoading || (after !== null && after < 0)}
                  style={{ flex: 2, padding: "14px", borderRadius: 100, fontSize: 13, fontWeight: 700, background: joinLoading || (after !== null && after < 0) ? C.border : C.forming, color: "#fff", border: "none", cursor: joinLoading || (after !== null && after < 0) ? "default" : "pointer" }}
                >
                  {joinLoading ? (language === "pt" ? "Entrando..." : "Joining...") : (language === "pt" ? "Sim, quero entrar" : "Yes, join deal")}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
