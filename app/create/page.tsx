"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Star, Zap, Info, X,
  Lock, Globe, Smartphone, Activity, MapPin, Target, TrendingUp,
  Sparkles, Copy, Check,
} from "lucide-react"

interface DealTypeItem {
  id: string
  name: string
  desc: string
  kpi: string
}

interface Category {
  id: string
  label: string
  icon: ReactNode
  available: boolean
  types: DealTypeItem[]
}

const CATEGORIES: Category[] = [
  {
    id: "social",
    label: "Redes Sociais",
    icon: <Smartphone className="w-4 h-4" />,
    available: true,
    types: [
      { id: "social_followers", name: "Seguidores",    desc: "Crescimento total no período",  kpi: "Crescimento" },
      { id: "social_posts",     name: "Posts / Vídeos", desc: "Frequência de publicação",      kpi: "Engajamento" },
      { id: "social_views",     name: "Views",          desc: "Alcance das publicações",       kpi: "Alcance"     },
      { id: "social_comments",  name: "Comentários",    desc: "Interações recebidas",          kpi: "Interação"   },
    ],
  },
  {
    id: "fitness",
    label: "Fitness",
    icon: <Activity className="w-4 h-4" />,
    available: true,
    types: [
      { id: "fitness_steps",    name: "Passos diários", desc: "Via Apple Health / Google Fit", kpi: "Atividade"   },
      { id: "fitness_km",       name: "Km percorridos", desc: "Corridas e caminhadas",          kpi: "Distância"   },
      { id: "fitness_workouts", name: "Treinos",         desc: "Sessões de exercício",           kpi: "Consistência"},
      { id: "fitness_calories", name: "Calorias",        desc: "Gasto calórico total",           kpi: "Esforço"     },
    ],
  },
  {
    id: "checkin",
    label: "Check-in",
    icon: <MapPin className="w-4 h-4" />,
    available: true,
    types: [
      { id: "checkin_daily", name: "Presença diária", desc: "Verificação por localização",     kpi: "Local"  },
      { id: "checkin_gym",   name: "Academia",         desc: "Frequência semanal confirmada",   kpi: "Rotina" },
    ],
  },
  {
    id: "free",
    label: "Meta Livre",
    icon: <Target className="w-4 h-4" />,
    available: true,
    types: [
      { id: "free_custom", name: "Meta personalizada", desc: "Verificação manual acordada", kpi: "Manual"    },
      { id: "free_photo",  name: "Desafio foto",        desc: "Prova por imagem",            kpi: "Evidência" },
    ],
  },
  {
    id: "onchain",
    label: "On-chain",
    icon: <TrendingUp className="w-4 h-4" />,
    available: false,
    types: [
      { id: "onchain_volume",  name: "Volume DeFi", desc: "Volume de negociação", kpi: "DeFi"   },
      { id: "onchain_holders", name: "Holders",      desc: "Número de holders",   kpi: "Token"  },
    ],
  },
]

const USER_SUPER_DEAL_AVAILABLE = true
const USER_TDPOINTS = 5800

// ── Sugestões de Deals Prontos ───────────────────────────────────────────────

const DEAL_SUGGESTIONS = [
  {
    id: "sug1",
    title: "30 Dias de Post",
    category: "social",
    type: "social_posts",
    desc: "Postar 1x/dia no X por 30 dias",
    icon: "📱",
  },
  {
    id: "sug2",
    title: "10k Passos Diários",
    category: "fitness",
    type: "fitness_steps",
    desc: "10.000 passos todos os dias",
    icon: "👟",
  },
  {
    id: "sug3",
    title: "Academia 3x/semana",
    category: "checkin",
    type: "checkin_gym",
    desc: "Check-in na academia 3x por semana",
    icon: "🏋️",
  },
  {
    id: "sug4",
    title: "Ler 1 Livro/Mês",
    category: "free",
    type: "free_custom",
    desc: "Livro completo por mês com prova",
    icon: "📚",
  },
]

export default function CreateDealPage() {
  const router = useRouter()

  const [privacy,       setPrivacy]       = useState<"private" | "public">("private")
  const [dealMode,      setDealMode]      = useState<"regular" | "super">("regular")
  const [activeCat,     setActiveCat]     = useState("social")
  const [selected,      setSelected]      = useState<string | null>(null)
  const [showSuperInfo, setShowSuperInfo] = useState(false)
  const [useSuggestion, setUseSuggestion] = useState(false)
  const [customDeal,    setCustomDeal]    = useState(false)

  const currentCat   = CATEGORIES.find(c => c.id === activeCat)!
  const superDealCost = USER_SUPER_DEAL_AVAILABLE ? "free" : USER_TDPOINTS >= 5000 ? "points" : "locked"

  function handleContinue() {
    if (!selected) return
    sessionStorage.setItem(
      "dealDraft",
      JSON.stringify({ privacy, dealMode, selectedType: selected }),
    )
    router.push("/configure")
  }

  const selectedTypeName = CATEGORIES.flatMap(c => c.types).find(t => t.id === selected)?.name

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
      <header className="px-5 pt-12 pb-3">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Voltar</span>
        </button>
      </header>

      {/* Steps */}
      <div className="flex items-center justify-center gap-2 pb-4">
        <div className="w-8 h-2 rounded-full" style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)" }} />
        <div className="w-8 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.4)" }} />
        <div className="w-8 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.4)" }} />
      </div>

      {/* Scrollable body */}
      <div className="flex-1 px-5 pb-32 overflow-y-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-5">Novo Deal</h1>

        {/* Toggle: Usar sugestão vs Personalizado */}
        <div className="flex items-center gap-3 mb-5 p-1 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.35)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.5)" }}>
          <button
            onClick={() => { setUseSuggestion(true); setCustomDeal(false); setSelected(null) }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300"
            style={{
              background: useSuggestion && !customDeal ? "linear-gradient(135deg,#16A34A,#22C55E)" : "transparent",
              color: useSuggestion && !customDeal ? "white" : "#6B7280",
            }}
          >
            <Sparkles className="w-4 h-4 inline mr-1.5" />
            Sugestões
          </button>
          <button
            onClick={() => { setCustomDeal(true); setUseSuggestion(false); setSelected(null) }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300"
            style={{
              background: customDeal ? "linear-gradient(135deg,#4A4AFF,#7B7BFF)" : "transparent",
              color: customDeal ? "white" : "#6B7280",
            }}
          >
            <Copy className="w-4 h-4 inline mr-1.5" />
            Personalizar
          </button>
        </div>

        {/* Sugestões de Deals Prontos */}
        {useSuggestion && !customDeal && (
          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-600 mb-3">Escolha uma sugestão</p>
            <div className="space-y-2">
              {DEAL_SUGGESTIONS.map((sug) => (
                <button
                  key={sug.id}
                  onClick={() => { setActiveCat(sug.category); setSelected(sug.type) }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 hover:scale-[1.01]"
                  style={{
                    background: selected === sug.type ? "rgba(22,163,74,0.12)" : "rgba(255,255,255,0.45)",
                    border: selected === sug.type ? "1.5px solid rgba(22,163,74,0.4)" : "1px solid rgba(255,255,255,0.5)",
                  }}
                >
                  <span className="text-2xl">{sug.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm">{sug.title}</p>
                    <p className="text-xs text-gray-500">{sug.desc}</p>
                  </div>
                  {selected === sug.type && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)" }}>
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Personalizar mode - show category/type selection */}
        {customDeal && !useSuggestion && (
          <>
            {/* Privacy toggle — minimal pill */}
            <div className="flex items-center gap-2 mb-5">
              {(["private", "public"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setPrivacy(v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200"
                  style={{
                    background: privacy === v ? "rgba(22,163,74,0.12)" : "rgba(255,255,255,0.45)",
                    color:      privacy === v ? "#16A34A"              : "#6B7280",
                    border:     privacy === v ? "1.5px solid rgba(22,163,74,0.35)" : "1px solid rgba(255,255,255,0.5)",
                  }}
                >
                  {v === "private"
                    ? <><Lock  className="w-3.5 h-3.5" /> Privado</>
                    : <><Globe className="w-3.5 h-3.5" /> Público</>}
                </button>
              ))}
            </div>

            {/* Modalidade — minimal pill */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-600">Modalidade</span>
                <button
                  onClick={() => setShowSuperInfo(true)}
                  className="flex items-center gap-1 text-xs text-[#16A34A]"
                >
                  <Info className="w-3.5 h-3.5" /> O que é Super Deal?
                </button>
              </div>
              <div className="flex gap-2">
                {/* Regular */}
                <button
                  onClick={() => setDealMode("regular")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200"
                  style={{
                    background: dealMode === "regular" ? "rgba(22,163,74,0.12)" : "rgba(255,255,255,0.45)",
                    color:      dealMode === "regular" ? "#16A34A"              : "#6B7280",
                    border:     dealMode === "regular" ? "1.5px solid rgba(22,163,74,0.35)" : "1px solid rgba(255,255,255,0.5)",
                  }}
                >
                  <Zap className="w-3.5 h-3.5" /> Regular · 1%
                </button>

                {/* Super */}
                <button
                  onClick={() => superDealCost !== "locked" && setDealMode("super")}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200"
                  style={{
                    background: dealMode === "super" ? "rgba(255,170,0,0.12)" : "rgba(255,255,255,0.45)",
                    color:      dealMode === "super" ? "#FFAA00"              : superDealCost === "locked" ? "#D1D5DB" : "#6B7280",
                    border:     dealMode === "super" ? "1.5px solid rgba(255,170,0,0.4)" : "1px solid rgba(255,255,255,0.5)",
                    opacity:    superDealCost === "locked" ? 0.5 : 1,
                    cursor:     superDealCost === "locked" ? "not-allowed" : "pointer",
                  }}
                >
                  <Star className="w-3.5 h-3.5" />
                  Super · 0%
                  {superDealCost === "free"   && <span className="text-[10px] font-bold text-[#3DBF6A]">FREE</span>}
                  {superDealCost === "points" && <span className="text-[10px] font-bold">5k TDP</span>}
                </button>
              </div>

              {dealMode === "super" && (
                <div
                  className="mt-2.5 px-3 py-2 rounded-xl flex items-center gap-2"
                  style={{
                    background: superDealCost === "free" ? "rgba(61,191,106,0.07)" : "rgba(255,170,0,0.07)",
                    border:     superDealCost === "free" ? "1px solid rgba(61,191,106,0.2)" : "1px solid rgba(255,170,0,0.2)",
                  }}
                >
                  <Star className="w-3.5 h-3.5 flex-shrink-0" style={{ color: superDealCost === "free" ? "#3DBF6A" : "#FFAA00" }} />
                  <p className="text-xs text-gray-600">
                    {superDealCost === "free"
                      ? "Slot gratuito disponível — pote vai 100% ao vencedor."
                      : `Slot em uso. Custa 5.000 TDP (você tem ${USER_TDPOINTS.toLocaleString("pt-BR")} TDP).`}
                  </p>
                </div>
              )}
            </div>

            {/* Category tabs — horizontal scroll */}
            <div className="mb-4">
              <span className="text-sm font-semibold text-gray-600 mb-3 block">Categoria</span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setActiveCat(cat.id); setSelected(null) }}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200"
                    style={{
                      background: activeCat === cat.id
                        ? cat.available ? "rgba(22,163,74,0.12)" : "rgba(0,0,0,0.06)"
                        : "rgba(255,255,255,0.45)",
                      color: activeCat === cat.id
                        ? cat.available ? "#16A34A" : "#9CA3AF"
                        : cat.available ? "#6B7280" : "#9CA3AF",
                      border: activeCat === cat.id
                        ? cat.available ? "1.5px solid rgba(22,163,74,0.35)" : "1px solid rgba(0,0,0,0.1)"
                        : "1px solid rgba(255,255,255,0.5)",
                      opacity: !cat.available && activeCat !== cat.id ? 0.6 : 1,
                    }}
                  >
                    {cat.icon}
                    {cat.label}
                    {!cat.available && (
                      <span className="text-[9px] font-bold text-gray-400 leading-none">EM BREVE</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Deal type grid */}
            {currentCat.available ? (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {currentCat.types.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setSelected(type.id)}
                    className="p-4 rounded-2xl text-left transition-all duration-200 active:scale-[0.97]"
                    style={{
                      background:    selected === type.id ? "rgba(22,163,74,0.12)" : "rgba(255,255,255,0.5)",
                      backdropFilter: "blur(20px)",
                      border:        selected === type.id ? "1.5px solid rgba(22,163,74,0.4)" : "1px solid rgba(255,255,255,0.55)",
                      boxShadow:     selected === type.id ? "0 4px 20px rgba(22,163,74,0.15)" : "none",
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-gray-800 text-sm leading-tight">{type.name}</p>
                      {selected === type.id && (
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ml-1"
                          style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)" }}
                        >
                          <span className="text-white text-[8px] font-bold">✓</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed mb-2.5">{type.desc}</p>
                    <span
                      className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(22,163,74,0.09)", color: "#16A34A" }}
                    >
                      {type.kpi}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              /* Em breve placeholder */
              <div className="mb-6">
                <div
                  className="p-5 rounded-2xl"
                  style={{
                    background: "rgba(255,255,255,0.3)",
                    border: "1px dashed rgba(200,200,200,0.5)",
                  }}
                >
                  <p className="text-sm font-semibold text-gray-400 mb-1 text-center">Em breve</p>
                  <p className="text-xs text-gray-400 text-center mb-4">Esta categoria estará disponível em breve.</p>
                  <div className="grid grid-cols-2 gap-2 opacity-40 pointer-events-none">
                    {currentCat.types.map(type => (
                      <div
                        key={type.id}
                        className="p-3 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.4)" }}
                      >
                        <p className="font-semibold text-gray-600 text-xs mb-1">{type.name}</p>
                        <span
                          className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(0,0,0,0.06)", color: "#9CA3AF" }}
                        >
                          {type.kpi}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Fixed bottom CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4"
        style={{
          background: "linear-gradient(to top, rgba(255,255,255,0.92) 60%, transparent 100%)",
          backdropFilter: "blur(12px)",
        }}
      >
        {selected && (
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-xs text-gray-500">
              {currentCat.label} · {selectedTypeName}
            </span>
            <span className="text-xs font-bold" style={{ color: dealMode === "super" ? "#FFAA00" : "#16A34A" }}>
              {dealMode === "super" ? "Super · 0%" : "Regular · 1%"}
            </span>
          </div>
        )}
        <button
          onClick={handleContinue}
          disabled={!selected}
          className={`w-full py-4 rounded-2xl font-semibold text-white transition-all duration-300 ${selected ? "active:scale-[0.98]" : "opacity-40 cursor-not-allowed"}`}
          style={{
            background: !selected
              ? "linear-gradient(135deg,#16A34A,#22C55E)"
              : dealMode === "super"
              ? "linear-gradient(135deg,#FFAA00,#FF6B00)"
              : "linear-gradient(135deg,#16A34A,#22C55E)",
            boxShadow: selected
              ? dealMode === "super"
                ? "0 8px 32px rgba(255,170,0,0.4)"
                : "0 8px 32px rgba(22,163,74,0.4)"
              : "none",
          }}
        >
          Continuar →
        </button>
      </div>

      {/* Super Deal info bottom sheet */}
      {showSuperInfo && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowSuperInfo(false)}
        >
          <div
            className="w-full rounded-t-3xl p-6 pb-10"
            style={{ background: "rgba(255,255,255,0.97)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                <h2 className="text-lg font-bold text-gray-800">Super Deal</h2>
              </div>
              <button
                onClick={() => setShowSuperInfo(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.06)" }}
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {[
                { badge: "0%", bg: "rgba(61,191,106,0.12)", color: "#3DBF6A",  title: "Sem taxa de plataforma",  desc: "O pote inteiro vai para o vencedor, sem desconto." },
                { badge: "1",  bg: "rgba(22,163,74,0.1)",   color: "#16A34A",  title: "1 gratuito por conta",    desc: "Cada usuário tem 1 Super Deal ativo por vez. Quando encerrar, o slot volta." },
              ].map(row => (
                <div key={row.badge} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: row.bg }}>
                    <span className="font-bold text-sm" style={{ color: row.color }}>{row.badge}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{row.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{row.desc}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,170,0,0.12)" }}>
                  <Star className="w-4 h-4 text-yellow-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Extra com TDPoints</p>
                  <p className="text-xs text-gray-500 mt-0.5">Slot em uso? Crie outro Super Deal gastando 5.000 TDPoints.</p>
                </div>
              </div>
              <div
                className="p-3 rounded-xl"
                style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)" }}
              >
                <p className="text-xs text-gray-600">
                  <span className="font-semibold text-[#16A34A]">Seu status: </span>
                  {USER_SUPER_DEAL_AVAILABLE
                    ? "✅ Slot gratuito disponível"
                    : `Slot em uso · ${USER_TDPOINTS.toLocaleString("pt-BR")} TDP`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
