"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, ArrowLeft, ChevronDown, X } from "lucide-react"
import { saveSurveyResponses } from "@/lib/actions/survey"

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:           "#F0F3F0",
  surface:      "#FFFFFF",
  surface2:     "#E8EDE8",
  border:       "#D8E0D8",
  text:         "#0B1309",
  mid:          "#4E614E",
  dim:          "#8BA09A",
  brand:        "#00B852",
  activeLight:  "rgba(0,184,82,0.08)",
  activeBorder: "rgba(0,184,82,0.25)",
} as const

const MONO: React.CSSProperties = { fontFamily: "var(--font-dm-mono,'DM Mono',monospace)" }

// ── Countries ─────────────────────────────────────────────────────────────────
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

// ── Questions ─────────────────────────────────────────────────────────────────
type Question =
  | { id: string; type: "single";   text: string; options: string[] }
  | { id: string; type: "country";  text: string }
  | { id: string; type: "text";     text: string; placeholder: string }
  | { id: string; type: "multiple"; text: string; subtitle: string; options: string[] }

const questions: Question[] = [
  { id: "age",        type: "single",   text: "Qual é a sua faixa etária?", options: ["Menos de 18","18–24","25–34","35–44","45 ou mais"] },
  { id: "country",    type: "country",  text: "Em qual país você mora?" },
  { id: "source",     type: "text",     text: "Como você conheceu o True Deal?", placeholder: "Ex: vi no TikTok, um amigo me indicou…" },
  { id: "motivation", type: "multiple", text: "O que você espera do True Deal?", subtitle: "Pode escolher mais de um",
    options: ["Desafios fitness","Apostas e desafios entre amigos","Motivação extra para metas pessoais","Gamificar os compromissos"] },
]

type Answers = Record<string, string | string[]>

// ── Option button ─────────────────────────────────────────────────────────────

function OptionButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", padding: "14px 16px", borderRadius: 14, textAlign: "left",
        background: selected ? C.activeLight : C.surface,
        border: `${selected ? "1.5px" : "1px"} solid ${selected ? C.activeBorder : C.border}`,
        cursor: "pointer", transition: "all 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 20, height: 20, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: selected ? C.brand : "transparent", border: `2px solid ${selected ? C.brand : C.border}`,
        }}>
          {selected && (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <span style={{ fontSize: 14, fontWeight: selected ? 600 : 400, color: selected ? C.brand : C.text }}>
          {label}
        </span>
      </div>
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SurveyPage() {
  const router = useRouter()
  const [step,              setStep]             = useState(0)
  const [answers,           setAnswers]          = useState<Answers>({})
  const [countrySearch,     setCountrySearch]    = useState("")
  const [showCountryModal,  setShowCountryModal] = useState(false)

  const current = questions[step]
  const isLast  = step === questions.length - 1

  function getAnswer(id: string) { return answers[id] }
  function setAnswer(id: string, value: string | string[]) { setAnswers((a) => ({ ...a, [id]: value })) }
  function toggleMultiple(id: string, option: string) {
    const prev = (getAnswer(id) as string[]) ?? []
    setAnswer(id, prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option])
  }
  function isSelected(id: string, option: string): boolean {
    const a = getAnswer(id)
    return Array.isArray(a) ? a.includes(option) : a === option
  }
  function canAdvance(): boolean {
    const a = getAnswer(current.id)
    if (current.type === "multiple") return Array.isArray(a) && a.length > 0
    if (current.type === "text") return typeof a === "string" && a.trim().length > 0
    return !!a
  }
  async function handleNext() {
    if (!canAdvance()) return
    if (isLast) { await saveSurveyResponses(answers); router.push("/") }
    else setStep((s) => s + 1)
  }

  const progress = ((step + 1) / questions.length) * 100
  const filteredCountries = ALL_COUNTRIES.filter((c) => c.toLowerCase().includes(countrySearch.toLowerCase()))
  const otherSelected = current.type === "country" && getAnswer(current.id) && !["Brasil","Argentina"].includes(getAnswer(current.id) as string)

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <header style={{ padding: "48px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <button
            onClick={() => step > 0 && setStep((s) => s - 1)}
            style={{ display: "flex", alignItems: "center", gap: 4, color: C.mid, background: "none", border: "none", cursor: "pointer", opacity: step === 0 ? 0 : 1, pointerEvents: step === 0 ? "none" : "auto" }}
          >
            <ArrowLeft width={16} height={16} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>Voltar</span>
          </button>
          <span style={{ fontSize: 13, color: C.dim, fontWeight: 500, ...MONO }}>{step + 1} / {questions.length}</span>
          <button onClick={() => router.push("/")} style={{ fontSize: 13, color: C.dim, background: "none", border: "none", cursor: "pointer" }}>
            Pular
          </button>
        </div>
        <div style={{ height: 4, borderRadius: 100, background: C.border, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 100, background: C.brand, width: `${progress}%`, transition: "width 0.4s ease" }} />
        </div>
        <p style={{ fontSize: 11, color: C.dim, marginTop: 5, ...MONO, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Etapa 2 de 2 — Pesquisa rápida
        </p>
      </header>

      {/* Content */}
      <div style={{ flex: 1, padding: "0 20px 32px", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: 20, marginTop: 8 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: C.text, lineHeight: 1.3 }}>{current.text}</h1>
          {current.type === "multiple" && (
            <p style={{ fontSize: 13, color: C.dim, marginTop: 4 }}>{current.subtitle}</p>
          )}
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Single choice */}
          {current.type === "single" && current.options.map((option) => (
            <OptionButton key={option} label={option} selected={isSelected(current.id, option)} onClick={() => setAnswer(current.id, option)} />
          ))}

          {/* Country */}
          {current.type === "country" && (
            <>
              {["Brasil","Argentina"].map((c) => (
                <OptionButton key={c} label={c} selected={isSelected(current.id, c)} onClick={() => setAnswer(current.id, c)} />
              ))}
              <button
                onClick={() => setShowCountryModal(true)}
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: 14, textAlign: "left",
                  background: otherSelected ? C.activeLight : C.surface,
                  border: `${otherSelected ? "1.5px" : "1px"} solid ${otherSelected ? C.activeBorder : C.border}`,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    background: otherSelected ? C.brand : "transparent", border: `2px solid ${otherSelected ? C.brand : C.border}`,
                  }}>
                    {otherSelected && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: otherSelected ? 600 : 400, color: otherSelected ? C.brand : C.text }}>
                    {otherSelected ? getAnswer(current.id) as string : "Outro país"}
                  </span>
                </div>
                <ChevronDown width={16} height={16} color={C.dim} />
              </button>
            </>
          )}

          {/* Free text */}
          {current.type === "text" && (
            <textarea
              value={(getAnswer(current.id) as string) ?? ""}
              onChange={(e) => setAnswer(current.id, e.target.value)}
              placeholder={current.placeholder}
              rows={4}
              style={{
                width: "100%", boxSizing: "border-box", padding: "14px 16px", borderRadius: 14,
                fontSize: 14, background: C.surface, color: C.text, outline: "none",
                border: `1px solid ${getAnswer(current.id) ? C.activeBorder : C.border}`,
                resize: "none", lineHeight: 1.5,
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = C.brand }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = getAnswer(current.id) ? C.activeBorder : C.border }}
            />
          )}

          {/* Multiple choice */}
          {current.type === "multiple" && current.options.map((option) => (
            <OptionButton key={option} label={option} selected={isSelected(current.id, option)} onClick={() => toggleMultiple(current.id, option)} />
          ))}
        </div>

        {/* Next button */}
        <div style={{ marginTop: 28 }}>
          <button
            onClick={handleNext}
            disabled={!canAdvance()}
            style={{
              width: "100%", padding: "15px 0", borderRadius: 16,
              fontWeight: 700, fontSize: 15, color: "#fff",
              background: canAdvance() ? C.brand : C.dim,
              border: "none", cursor: canAdvance() ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {isLast ? "Entrar no True Deal" : "Próximo"}
            <ArrowRight width={18} height={18} />
          </button>
        </div>
      </div>

      {/* Country modal */}
      {showCountryModal && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(0,0,0,0.4)" }}
          onClick={() => setShowCountryModal(false)}
        >
          <div
            style={{ width: "100%", maxWidth: 480, background: C.surface, borderRadius: "24px 24px 0 0", display: "flex", flexDirection: "column", maxHeight: "75vh", boxShadow: "0 -16px 64px rgba(0,0,0,0.12)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 20px 16px", flexShrink: 0 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Selecione seu país</h3>
              <button onClick={() => setShowCountryModal(false)} style={{ width: 32, height: 32, borderRadius: "50%", background: C.surface2, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X width={14} height={14} color={C.mid} />
              </button>
            </div>

            <div style={{ padding: "0 20px 14px", flexShrink: 0 }}>
              <input
                autoFocus type="text" value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                placeholder="Buscar país…"
                style={{ width: "100%", boxSizing: "border-box", padding: "12px 16px", borderRadius: 12, fontSize: 14, background: C.surface2, border: `1px solid ${C.border}`, color: C.text, outline: "none" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = C.brand }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = C.border }}
              />
            </div>

            <div style={{ overflowY: "auto", flex: 1, padding: "0 20px 24px" }}>
              {filteredCountries.length === 0 ? (
                <p style={{ textAlign: "center", color: C.dim, padding: "32px 0", fontSize: 13 }}>Nenhum país encontrado</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {filteredCountries.map((country) => {
                    const sel = getAnswer(current.id) === country
                    return (
                      <button key={country}
                        onClick={() => { setAnswer(current.id, country); setShowCountryModal(false); setCountrySearch("") }}
                        style={{
                          textAlign: "left", padding: "12px 16px", borderRadius: 10,
                          fontSize: 14, fontWeight: sel ? 600 : 400,
                          background: sel ? C.activeLight : "transparent",
                          color: sel ? C.brand : C.text, border: "none", cursor: "pointer",
                        }}
                      >
                        {country}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
