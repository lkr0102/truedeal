"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, ArrowLeft, ChevronDown, X } from "lucide-react"
import { saveSurveyResponses } from "@/lib/actions/survey"

// ── Lista completa de países ──────────────────────────────────────────────────
const ALL_COUNTRIES = [
  "Afeganistão","África do Sul","Albânia","Alemanha","Andorra","Angola",
  "Antígua e Barbuda","Arábia Saudita","Argentina","Armênia","Austrália",
  "Áustria","Azerbaijão","Bahamas","Bahrein","Bangladesh","Barbados","Bélgica",
  "Belize","Benin","Bolívia","Bósnia e Herzegovina","Botsuana","Brasil","Brunei",
  "Bulgária","Burkina Faso","Burundi","Butão","Cabo Verde","Camarões","Camboja",
  "Canadá","Cazaquistão","Chile","China","Chipre","Colômbia","Comores","Congo",
  "Coreia do Norte","Coreia do Sul","Costa Rica","Costa do Marfim","Croácia",
  "Cuba","Dinamarca","Djibuti","Dominica","Egito","El Salvador",
  "Emirados Árabes Unidos","Equador","Eritreia","Eslováquia","Eslovênia",
  "Espanha","Estados Unidos","Estônia","Etiópia","Fiji","Filipinas","Finlândia",
  "França","Gabão","Gâmbia","Gana","Geórgia","Granada","Grécia","Guatemala",
  "Guiana","Guiné","Guiné-Bissau","Guiné Equatorial","Haiti","Honduras",
  "Hungria","Iêmen","Índia","Indonésia","Iraque","Irã","Irlanda","Islândia",
  "Israel","Itália","Jamaica","Japão","Jordânia","Kuwait","Laos","Lesoto",
  "Letônia","Líbano","Libéria","Líbia","Liechtenstein","Lituânia","Luxemburgo",
  "Madagascar","Malásia","Malawi","Maldivas","Mali","Malta","Marrocos",
  "Mauritânia","Maurício","México","Moçambique","Moldova","Mônaco","Mongólia",
  "Montenegro","Myanmar","Namíbia","Nepal","Nicarágua","Níger","Nigéria",
  "Noruega","Nova Zelândia","Omã","Países Baixos","Palau","Palestina","Panamá",
  "Papua Nova Guiné","Paquistão","Paraguai","Peru","Polônia","Portugal","Qatar",
  "Reino Unido","República Dominicana","Romênia","Rússia","Ruanda","Samoa",
  "San Marino","Senegal","Serra Leoa","Sérvia","Seychelles","Singapura",
  "Somália","Sri Lanka","Sudão","Suécia","Suíça","Suriname","Tailândia",
  "Tanzânia","Togo","Trinidad e Tobago","Tunísia","Turquia","Ucrânia","Uganda",
  "Uruguai","Uzbequistão","Venezuela","Vietnã","Zâmbia","Zimbábue",
].sort((a, b) => a.localeCompare(b, "pt"))

// ── Definição das perguntas ───────────────────────────────────────────────────
type Question =
  | { id: string; type: "single";    text: string; options: string[] }
  | { id: string; type: "country";   text: string }
  | { id: string; type: "text";      text: string; placeholder: string }
  | { id: string; type: "multiple";  text: string; subtitle: string; options: string[] }

const questions: Question[] = [
  {
    id: "age",
    type: "single",
    text: "Qual é a sua faixa etária?",
    options: ["Menos de 18", "18–24", "25–34", "35–44", "45 ou mais"],
  },
  {
    id: "country",
    type: "country",
    text: "Em qual país você mora?",
  },
  {
    id: "source",
    type: "text",
    text: "Como você conheceu o True Deal?",
    placeholder: "Ex: vi no TikTok, um amigo me indicou…",
  },
  {
    id: "motivation",
    type: "multiple",
    text: "O que você espera do True Deal?",
    subtitle: "Pode escolher mais de um",
    options: [
      "Desafios fitness",
      "Apostas e desafios entre amigos",
      "Motivação extra para metas pessoais",
      "Gamificar os compromissos",
    ],
  },
]

type Answers = Record<string, string | string[]>

export default function SurveyPage() {
  const router = useRouter()

  const [step, setStep]       = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [countrySearch, setCountrySearch] = useState("")
  const [showCountryModal, setShowCountryModal] = useState(false)

  const current = questions[step]
  const isLast  = step === questions.length - 1

  // ── Helpers de resposta ──
  function getAnswer(id: string) { return answers[id] }

  function setAnswer(id: string, value: string | string[]) {
    setAnswers((a) => ({ ...a, [id]: value }))
  }

  function toggleMultiple(id: string, option: string) {
    const prev = (getAnswer(id) as string[]) ?? []
    const next = prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    setAnswer(id, next)
  }

  function isSelected(id: string, option: string): boolean {
    const a = getAnswer(id)
    if (Array.isArray(a)) return a.includes(option)
    return a === option
  }

  function canAdvance(): boolean {
    const a = getAnswer(current.id)
    if (current.type === "multiple") return Array.isArray(a) && a.length > 0
    if (current.type === "text") return typeof a === "string" && a.trim().length > 0
    return !!a
  }

  async function handleNext() {
    if (!canAdvance()) return
    if (isLast) {
      await saveSurveyResponses(answers)
      router.push("/")
    } else {
      setStep((s) => s + 1)
    }
  }

  const progress = ((step + 1) / questions.length) * 100

  const filteredCountries = ALL_COUNTRIES.filter((c) =>
    c.toLowerCase().includes(countrySearch.toLowerCase())
  )

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
      <header className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => step > 0 && setStep((s) => s - 1)}
            className={`flex items-center gap-1 text-gray-600 transition-opacity ${step === 0 ? "opacity-0 pointer-events-none" : ""}`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Voltar</span>
          </button>
          <span className="text-sm text-gray-500 font-medium">{step + 1} / {questions.length}</span>
          <button onClick={() => router.push("/")} className="text-sm text-gray-400 hover:text-gray-600">
            Pular
          </button>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.3)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: "#00D26A" }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">Etapa 2 de 2 — Pesquisa rápida</p>
      </header>

      {/* Conteúdo */}
      <div className="flex-1 px-5 pb-8 flex flex-col">
        <div className="mb-6 mt-4">
          <h1 className="text-xl font-bold text-white leading-snug">{current.text}</h1>
          {current.type === "multiple" && (
            <p className="text-sm text-gray-400 mt-1">{current.subtitle}</p>
          )}
        </div>

        <div className="flex-1 space-y-3">

          {/* ── Single choice ── */}
          {current.type === "single" &&
            current.options.map((option) => {
              const sel = isSelected(current.id, option)
              return (
                <OptionButton key={option} label={option} selected={sel}
                  onClick={() => setAnswer(current.id, option)} />
              )
            })
          }

          {/* ── País (3 botões + Outro modal) ── */}
          {current.type === "country" && (
            <>
              {["Brasil", "Argentina"].map((c) => (
                <OptionButton key={c} label={c} selected={isSelected(current.id, c)}
                  onClick={() => setAnswer(current.id, c)} />
              ))}
              <button
                onClick={() => setShowCountryModal(true)}
                className="w-full p-4 rounded-2xl text-left flex items-center justify-between transition-all duration-300 hover:scale-[1.01]"
                style={{
                  background: getAnswer(current.id) && !["Brasil","Argentina"].includes(getAnswer(current.id) as string)
                    ? "rgba(0,210,106,0.12)" : "rgba(255,255,255,0.05)",
                  backdropFilter: "blur(20px) saturate(200%)",
                  border: getAnswer(current.id) && !["Brasil","Argentina"].includes(getAnswer(current.id) as string)
                    ? "2px solid rgba(0,210,106,0.5)" : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{
                      background: getAnswer(current.id) && !["Brasil","Argentina"].includes(getAnswer(current.id) as string)
                        ? "#00D26A" : "rgba(255,255,255,0.2)",
                      border: "2px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    {getAnswer(current.id) && !["Brasil","Argentina"].includes(getAnswer(current.id) as string) && (
                      <svg className="w-3 h-3 text-black" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="font-medium text-sm text-white">
                    {getAnswer(current.id) && !["Brasil","Argentina"].includes(getAnswer(current.id) as string)
                      ? getAnswer(current.id) as string
                      : "Outro país"}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
            </>
          )}

          {/* ── Texto livre ── */}
          {current.type === "text" && (
            <textarea
              value={(getAnswer(current.id) as string) ?? ""}
              onChange={(e) => setAnswer(current.id, e.target.value)}
              placeholder={current.placeholder}
              rows={4}
              className="w-full p-4 rounded-2xl outline-none text-white placeholder-gray-500 resize-none text-sm"
              style={{
                background: "rgba(255,255,255,0.05)",
                backdropFilter: "blur(20px) saturate(200%)",
                border: getAnswer(current.id) ? "2px solid rgba(0,210,106,0.4)" : "1px solid rgba(255,255,255,0.1)",
              }}
            />
          )}

          {/* ── Múltipla escolha ── */}
          {current.type === "multiple" &&
            current.options.map((option) => {
              const sel = isSelected(current.id, option)
              return (
                <OptionButton key={option} label={option} selected={sel}
                  onClick={() => toggleMultiple(current.id, option)} />
              )
            })
          }
        </div>

        {/* Botão avançar */}
        <div className="mt-8">
          <button
            onClick={handleNext}
            disabled={!canAdvance()}
            className={`w-full py-4 rounded-2xl font-bold text-black flex items-center justify-center gap-2 transition-all duration-300 ${
              canAdvance() ? "hover:scale-[1.02] active:scale-[0.98]" : "opacity-40 cursor-not-allowed"
            }`}
            style={{
              background: "#00D26A",
              boxShadow: canAdvance() ? "0 8px 32px rgba(0,210,106,0.3)" : "none",
            }}
          >
            {isLast ? "Entrar no True Deal" : "Próximo"}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Modal lista de países ── */}
      {showCountryModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowCountryModal(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl flex flex-col"
            style={{
              background: "rgba(255,255,255,0.97)",
              backdropFilter: "blur(40px)",
              boxShadow: "0 -16px 64px rgba(0,0,0,0.2)",
              maxHeight: "75vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do modal */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-800">Selecione seu país</h3>
              <button onClick={() => setShowCountryModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.08)" }}>
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Busca */}
            <div className="px-6 pb-3 flex-shrink-0">
              <input
                autoFocus
                type="text"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                placeholder="Buscar país…"
                className="w-full px-4 py-3 rounded-xl outline-none text-gray-800 placeholder-gray-400 text-sm"
                style={{ background: "rgba(0,0,0,0.05)", border: "1.5px solid rgba(22,163,74,0.2)" }}
              />
            </div>

            {/* Lista scrollável */}
            <div className="overflow-y-auto flex-1 px-6 pb-6">
              {filteredCountries.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">Nenhum país encontrado</p>
              ) : (
                <div className="space-y-1">
                  {filteredCountries.map((country) => (
                    <button
                      key={country}
                      onClick={() => {
                        setAnswer(current.id, country)
                        setShowCountryModal(false)
                        setCountrySearch("")
                      }}
                      className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all hover:scale-[1.01]"
                      style={{
                        background: getAnswer(current.id) === country
                          ? "rgba(22,163,74,0.1)" : "transparent",
                        color: getAnswer(current.id) === country ? "#16A34A" : "#374151",
                      }}
                    >
                      {country}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Componente reutilizável de opção ─────────────────────────────────────────
function OptionButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full p-4 rounded-2xl text-left transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
      style={{
        background: selected ? "rgba(0,210,106,0.12)" : "rgba(255,255,255,0.05)",
        backdropFilter: "blur(20px) saturate(200%)",
        border: selected ? "2px solid rgba(0,210,106,0.5)" : "1px solid rgba(255,255,255,0.1)",
        boxShadow: selected ? "0 4px 20px rgba(0,210,106,0.15)" : "0 4px 16px rgba(0,0,0,0.1)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all"
          style={{
            background: selected ? "#00D26A" : "rgba(255,255,255,0.2)",
            border: selected ? "none" : "2px solid rgba(255,255,255,0.1)",
          }}
        >
          {selected && (
            <svg className="w-3 h-3 text-black" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <span className="font-medium text-sm" style={{ color: selected ? "#00D26A" : "#FFFFFF" }}>
          {label}
        </span>
      </div>
    </button>
  )
}
