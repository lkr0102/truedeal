"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  Shield,
  Calendar,
  DollarSign,
  Users,
  Lock,
  Sparkles,
  Plus,
  Minus,
  Trophy,
} from "lucide-react"

const CATEGORIES = [
  { id: "social", icon: "📣", label: "Social", available: true },
  { id: "fitness", icon: "🏃", label: "Fitness", available: true },
  { id: "gaming", icon: "🎮", label: "Gaming", available: false },
  { id: "learning", icon: "📚", label: "Learning", available: false },
  { id: "onchain", icon: "⛓", label: "On-Chain", available: false },
  { id: "free", icon: "✨", label: "Free", available: false },
]

const CHANNELS = [
  { id: "x", label: "X", color: "#000000", active: true },
  { id: "instagram", label: "Instagram", color: "#E1306C", active: false },
  { id: "tiktok", label: "TikTok", color: "#ff0050", active: false },
  { id: "linkedin", label: "LinkedIn", color: "#0077B5", active: false },
  { id: "discord", label: "Discord", color: "#5865F2", active: false },
  { id: "youtube", label: "YouTube", color: "#FF0000", active: false },
  { id: "strava", label: "Strava", color: "#FC4C02", active: true },
  { id: "wellhub", label: "Wellhub", color: "#00A878", active: true },
  { id: "totalpass", label: "TotalPass", color: "#FF6B35", active: true },
]

const RULES: Record<string, Array<{ id: string; label: string }>> = {
  x: [
    { id: "post", label: "Post publicado" },
    { id: "comment", label: "Comentário recebido" },
    { id: "repost", label: "Repost recebido" },
    { id: "follower", label: "Seguidor recebido" },
    { id: "impression", label: "Impressões" },
  ],
  strava: [
    { id: "km", label: "Kms percorridos" },
    { id: "pace", label: "Pace médio" },
    { id: "hours", label: "Horas de treino" },
    { id: "checkin", label: "Check-ins" },
  ],
  wellhub: [
    { id: "checkin", label: "Check-ins" },
    { id: "spaces", label: "Espaços diferentes" },
    { id: "hours", label: "Horas de treino" },
  ],
  totalpass: [
    { id: "checkin", label: "Check-ins" },
    { id: "spaces", label: "Espaços diferentes" },
    { id: "hours", label: "Horas de treino" },
  ],
}

const PERIOD_PRESETS = [
  { id: "1w", label: "1 sem", days: 7 },
  { id: "2w", label: "2 sem", days: 14 },
  { id: "1m", label: "1 mês", days: 30 },
  { id: "2m", label: "2 meses", days: 60 },
  { id: "custom", label: "Personalizado", days: 0 },
]

const AMOUNT_PRESETS = [25, 50, 100, 200, 500]

const DISTRIBUTIONS = [
  { id: "proporcional", label: "Proporcional", desc: "Pote dividido entre todos que cumprirem" },
  { id: "ranking", label: "Ranking", desc: "1º 60% · 2º 30% · 3º 10%" },
  { id: "primeiro", label: "1º Lugar", desc: "Winner takes all" },
]

function fmtDate(date: Date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function BlockHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(22,163,74,0.12)" }}>
        {icon}
      </div>
      <div>
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{sub}</p>
      </div>
    </div>
  )
}

export default function DealCreatePage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState("Deal Nº 0001")
  const [category, setCategory] = useState("social")
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["x"])
  const [visibility, setVisibility] = useState<"private" | "public">("private")
  const [dealMode, setDealMode] = useState<"regular" | "super">("regular")
  const [amount, setAmount] = useState(100)
  const [customAmount, setCustomAmount] = useState("")
  const [distribution, setDistribution] = useState("proporcional")
  const [periodPreset, setPeriodPreset] = useState("1m")
  const [startDate, setStartDate] = useState(new Date())
  const [endDate, setEndDate] = useState(addDays(new Date(), 30))
  const [ruleQuantities, setRuleQuantities] = useState<Record<string, string>>({})
  const [ruleFrequency, setRuleFrequency] = useState<Record<string, string>>({})
  const [fitnessMode, setFitnessMode] = useState<"e" | "ou">("e")

  const selectedRuleKeys = useMemo(() => {
    const rules = selectedChannels.flatMap((channel) => RULES[channel] ?? [])
    const unique = Array.from(new Map(rules.map((item) => [item.id, item])).values())
    return unique
  }, [selectedChannels])

  const activeChannels = CHANNELS.filter((channel) => selectedChannels.includes(channel.id))
  const totalPot = amount
  const isStep1Valid = name.trim().length >= 3 && selectedChannels.length > 0 && amount >= 10

  const summaryRows = [
    { label: "Canal", value: activeChannels.map((channel) => channel.label).join(" · ") || "Nenhum" },
    { label: "Regras", value: selectedRuleKeys.map((rule) => rule.label).join(" · ") || "Nenhuma" },
    { label: "Meta", value: selectedRuleKeys.length ? `${selectedRuleKeys.length} métricas` : "-" },
    { label: "Período", value: `${fmtDate(startDate)} → ${fmtDate(endDate)} (${periodPreset === "custom" ? "Custom" : periodPreset})` },
    { label: "Valor", value: `R$${amount} por pessoa` },
    { label: "Visibilidade", value: visibility === "private" ? "Privado" : "Público" },
  ]

  function toggleChannel(id: string) {
    if (!CHANNELS.find((item) => item.id === id)?.active) return
    setSelectedChannels((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  function adjustAmount(value: number) {
    setAmount(value)
    setCustomAmount("")
  }

  function pickPeriod(id: string) {
    setPeriodPreset(id)
    const preset = PERIOD_PRESETS.find((item) => item.id === id)
    if (preset && preset.days > 0) {
      setEndDate(addDays(startDate, preset.days))
    }
  }

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
      <header className="px-5 pt-12 pb-4">
        <button onClick={() => router.push("/")} className="flex items-center gap-2 text-gray-600">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Voltar</span>
        </button>
      </header>

      <div className="flex-1 px-5 pb-20 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col gap-3 mb-6">
            <div className="text-sm text-gray-500">Passo {step} de 2</div>
            <h1 className="text-3xl font-bold text-gray-900">Criar novo Deal</h1>
            <p className="text-sm text-gray-500 max-w-2xl">Defina nome, canais, regras, período e pagamento com a nova interface de criação.</p>
          </div>

          <div className="relative overflow-hidden rounded-[30px] bg-white/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]" style={{ backdropFilter: "blur(25px)" }}>
            <div className="absolute inset-x-0 top-0 h-1 rounded-b-full bg-gradient-to-r from-[#16A34A] via-[#22C55E] to-[#4ADE80]" />

            <div className="relative">
              <div className="flex items-center gap-4 mb-8">
                {[1, 2].map((value) => (
                  <div key={value} className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${step === value ? "bg-[#16A34A] text-white" : "bg-gray-100 text-gray-500"}`}>
                      {value}
                    </div>
                    <span className={`text-sm font-semibold ${step === value ? "text-gray-900" : "text-gray-500"}`}>
                      {value === 1 ? "Configuração" : "Confirmação"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="relative min-h-[680px]">
                <div className={`transition-transform duration-500 ${step === 1 ? "translate-x-0" : "-translate-x-full"}`}>
                  <div className="space-y-6">
                    <section>
                      <BlockHeader icon={<Sparkles className="w-5 h-5 text-[#16A34A]" />} title="Nome do deal" sub="Comece com um título claro e editável." />
                      <input
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-4 text-gray-900 outline-none shadow-sm"
                      />
                    </section>

                    <section>
                      <BlockHeader icon={<Users className="w-5 h-5 text-[#16A34A]" />} title="Categoria" sub="Escolha a categoria do desafio." />
                      <div className="grid grid-cols-3 gap-3">
                        {CATEGORIES.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => item.available && setCategory(item.id)}
                            className={`rounded-3xl border p-4 text-left transition ${item.available ? "hover:border-[#16A34A]" : "opacity-50 cursor-not-allowed"}`}
                            style={{
                              borderColor: category === item.id ? "#16A34A" : "rgba(229,231,235,1)",
                              background: category === item.id ? "rgba(22,163,74,0.08)" : "rgba(255,255,255,0.9)",
                            }}
                          >
                            <div className="text-2xl mb-3">{item.icon}</div>
                            <p className="font-semibold text-gray-900">{item.label}</p>
                            {!item.available && <span className="mt-2 inline-block rounded-full bg-gray-100 px-3 py-1 text-[10px] font-bold uppercase text-gray-500">Em breve</span>}
                          </button>
                        ))}
                      </div>
                    </section>

                    <section>
                      <BlockHeader icon={<Shield className="w-5 h-5 text-[#16A34A]" />} title="Canais de verificação" sub="Selecione os canais ativos para este deal." />
                      <div className="grid grid-cols-3 gap-3">
                        {CHANNELS.map((channel) => (
                          <button
                            key={channel.id}
                            onClick={() => toggleChannel(channel.id)}
                            className="rounded-3xl p-4 text-left transition"
                            style={{
                              opacity: channel.active ? 1 : 0.45,
                              border: selectedChannels.includes(channel.id) ? "2px solid #16A34A" : "1px solid rgba(229,231,235,1)",
                              background: selectedChannels.includes(channel.id) ? "rgba(22,163,74,0.08)" : "rgba(255,255,255,0.9)",
                            }}
                            disabled={!channel.active}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xl">{channel.label}</span>
                              {selectedChannels.includes(channel.id) && (
                                <div className="w-8 h-8 rounded-2xl bg-[#16A34A] flex items-center justify-center text-white">
                                  <Check className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{channel.active ? "Ativo" : "Em breve"}</p>
                          </button>
                        ))}
                      </div>
                    </section>

                    {selectedChannels.includes("wellhub") && selectedChannels.includes("totalpass") && (
                      <section>
                        <BlockHeader
                          icon={<ChevronRight className="w-5 h-5 text-[#16A34A]" />}
                          title="Modo fitness"
                          sub="Escolha se as regras devem ser combinadas (E) ou alternativas (OU)."
                        />
                        <div className="flex gap-3">
                          {[
                            { id: "e", label: "E" },
                            { id: "ou", label: "OU" },
                          ].map((option) => (
                            <button
                              key={option.id}
                              onClick={() => setFitnessMode(option.id as "e" | "ou")}
                              className="flex-1 rounded-3xl px-4 py-3 font-semibold transition"
                              style={{
                                background: fitnessMode === option.id ? "#16A34A" : "rgba(243,244,246,0.9)",
                                color: fitnessMode === option.id ? "white" : "#374151",
                                border: fitnessMode === option.id ? "1px solid #16A34A" : "1px solid rgba(229,231,235,1)",
                              }}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </section>
                    )}

                    <section>
                      <BlockHeader icon={<Calendar className="w-5 h-5 text-[#16A34A]" />} title="Período" sub="Escolha a duração do desafio." />
                      <div className="flex flex-wrap gap-2 mb-4">
                        {PERIOD_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => pickPeriod(preset.id)}
                            className="rounded-full px-4 py-2 text-sm font-semibold transition"
                            style={{
                              background: periodPreset === preset.id ? "#16A34A" : "rgba(243,244,246,0.9)",
                              color: periodPreset === preset.id ? "white" : "#475569",
                            }}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-3xl border border-gray-200 bg-white/90 p-4">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Início</p>
                          <p className="mt-2 font-semibold text-gray-900">{fmtDate(startDate)}</p>
                        </div>
                        <div className="rounded-3xl border border-gray-200 bg-white/90 p-4">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Fim</p>
                          <p className="mt-2 font-semibold text-[#16A34A]">{fmtDate(endDate)}</p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <BlockHeader icon={<DollarSign className="w-5 h-5 text-[#16A34A]" />} title="Pagamento" sub="Defina o valor e o tipo de distribuição." />
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {AMOUNT_PRESETS.map((value) => (
                          <button
                            key={value}
                            onClick={() => adjustAmount(value)}
                            className="rounded-3xl p-4 text-left transition"
                            style={{
                              border: amount === value ? "2px solid #16A34A" : "1px solid rgba(229,231,235,1)",
                              background: amount === value ? "rgba(22,163,74,0.08)" : "rgba(255,255,255,0.9)",
                            }}
                          >
                            <p className="text-lg font-bold">R${value}</p>
                            <p className="text-[11px] text-gray-500">por pessoa</p>
                          </button>
                        ))}
                        <div className="rounded-3xl border border-gray-200 bg-white/90 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">Outro</p>
                          <input
                            type="number"
                            min={10}
                            value={customAmount}
                            onChange={(event) => {
                              setCustomAmount(event.target.value)
                              const parsed = Number(event.target.value)
                              if (!Number.isNaN(parsed) && parsed > 0) setAmount(parsed)
                            }}
                            placeholder="R$"
                            className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none"
                          />
                        </div>
                      </div>
                      <div className="rounded-3xl border border-[#D1FAE5] bg-[#F0FBF4] p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#16A34A] mb-2">Estimativa de pot</p>
                        <p className="text-lg font-bold text-gray-900">R${totalPot}</p>
                        <p className="text-sm text-gray-500">Pot inicial para um criador. Cresce com participantes.</p>
                      </div>
                    </section>

                    <section>
                      <BlockHeader icon={<Lock className="w-5 h-5 text-[#16A34A]" />} title="Visibilidade" sub="Escolha se o deal é privado ou público." />
                      <div className="flex gap-3">
                        {(["private", "public"] as const).map((option) => (
                          <button
                            key={option}
                            onClick={() => setVisibility(option)}
                            className="flex-1 rounded-3xl px-4 py-3 font-semibold transition"
                            style={{
                              background: visibility === option ? "#16A34A" : "rgba(243,244,246,0.9)",
                              color: visibility === option ? "white" : "#475569",
                            }}
                          >
                            {option === "private" ? "Privado" : "Público"}
                          </button>
                        ))}
                      </div>
                    </section>

                    <section>
                      <BlockHeader icon={<Sparkles className="w-5 h-5 text-[#16A34A]" />} title="Regras e métricas" sub="Ajuste quantidade e frequência para cada métrica." />
                      <div className="space-y-3">
                        {selectedRuleKeys.map((rule) => (
                          <div key={rule.id} className="grid grid-cols-[1.6fr_1fr_1fr] gap-3 rounded-3xl border border-gray-200 bg-white/90 p-4">
                            <div>
                              <p className="font-semibold text-gray-900">{rule.label}</p>
                              <p className="text-xs text-gray-500">Defina meta e frequência</p>
                            </div>
                            <input
                              type="number"
                              value={ruleQuantities[rule.id] ?? "1"}
                              onChange={(event) => setRuleQuantities((current) => ({ ...current, [rule.id]: event.target.value }))}
                              className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none"
                            />
                            <select
                              value={ruleFrequency[rule.id] ?? "Dia"}
                              onChange={(event) => setRuleFrequency((current) => ({ ...current, [rule.id]: event.target.value }))}
                              className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none"
                            >
                              <option>Dia</option>
                              <option>Semana</option>
                              <option>Mês</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>

                <div className={`absolute inset-0 transition-transform duration-500 ${step === 2 ? "translate-x-0" : "translate-x-full"}`}>
                  <div className="space-y-6">
                    <div className="rounded-3xl bg-[#0D2E1A] p-6 text-white shadow-[0_16px_48px_rgba(22,163,74,0.35)]">
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] opacity-80">Resumo do Deal</p>
                          <h2 className="text-2xl font-bold">{name}</h2>
                        </div>
                        <span className="rounded-2xl bg-white/15 px-3 py-1 text-xs uppercase tracking-[0.2em]">{visibility === "private" ? "Privado" : "Público"}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm text-white/80">
                        <div className="rounded-3xl bg-white/10 p-4">
                          <p className="font-semibold">Período</p>
                          <p className="mt-2">{fmtDate(startDate)} → {fmtDate(endDate)}</p>
                        </div>
                        <div className="rounded-3xl bg-white/10 p-4">
                          <p className="font-semibold">Pot inicial</p>
                          <p className="mt-2">R${totalPot}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {summaryRows.map((row) => (
                        <div key={row.label} className="rounded-3xl border border-gray-200 bg-white/90 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{row.label}</p>
                          <p className="mt-2 text-sm font-semibold text-gray-900">{row.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {DISTRIBUTIONS.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setDistribution(option.id)}
                          className="rounded-3xl p-4 text-left transition"
                          style={{
                            border: distribution === option.id ? "2px solid #16A34A" : "1px solid rgba(229,231,235,1)",
                            background: distribution === option.id ? "rgba(22,163,74,0.08)" : "rgba(255,255,255,0.9)",
                          }}
                        >
                          <p className="font-semibold text-gray-900">{option.label}</p>
                          <p className="text-xs text-gray-500 mt-1">{option.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  onClick={() => setStep(1)}
                  disabled={step === 1}
                  className="inline-flex items-center justify-center gap-2 rounded-3xl border border-gray-200 bg-white px-6 py-4 text-sm font-semibold text-gray-700 transition disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </button>
                {step === 1 ? (
                  <button
                    onClick={() => setStep(2)}
                    disabled={!isStep1Valid}
                    className="inline-flex items-center justify-center gap-2 rounded-3xl bg-[#16A34A] px-6 py-4 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(22,163,74,0.22)] transition disabled:opacity-50"
                  >
                    Continuar para confirmar <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => router.push("/deals/0001/result")}
                    className="inline-flex items-center justify-center gap-2 rounded-3xl bg-[#16A34A] px-6 py-4 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(22,163,74,0.22)] transition"
                  >
                    Confirmar Deal <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
