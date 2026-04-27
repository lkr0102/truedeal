"use client"

import type { ChangeEvent } from "react"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Camera, AtSign, Hash, ArrowRight } from "lucide-react"

function generateHandle(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12)
  const num = Math.floor(1000 + Math.random() * 9000)
  return `${base || "user"}#${num}`
}

export default function ProfileSetupPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState("")
  const [handle, setHandle] = useState("")
  const [photo, setPhoto] = useState<string | null>(null)
  const [socials, setSocials] = useState({ x: "", instagram: "", tiktok: "", strava: "" })
  const [handleEdited, setHandleEdited] = useState(false)

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?"

  function handleNameChange(value: string) {
    setName(value)
    if (!handleEdited) {
      setHandle(generateHandle(value))
    }
  }

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPhoto(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function handleSocialChange(network: keyof typeof socials, value: string) {
    setSocials((prev) => ({ ...prev, [network]: value }))
  }

  function handleContinue() {
    if (!name.trim()) return
    // TODO: salvar perfil no backend
    router.push("/onboarding/survey")
  }

  const isValid = name.trim().length >= 2

  const socialFields: { key: keyof typeof socials; label: string; prefix: string; color: string }[] = [
    { key: "x", label: "X (Twitter)", prefix: "@", color: "#111111" },
    { key: "instagram", label: "Instagram", prefix: "@", color: "#E4405F" },
    { key: "tiktok", label: "TikTok", prefix: "@", color: "#010101" },
    { key: "strava", label: "Strava", prefix: "", color: "#FC4C02" },
  ]

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
      {/* Barra de progresso: etapa 1 de 2 do onboarding */}
      <div className="px-5 pt-12 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.3)" }}>
            <div className="h-full rounded-full" style={{ width: "50%", background: "linear-gradient(90deg, #16A34A, #22C55E)" }} />
          </div>
        </div>
        <p className="text-xs text-gray-500">Etapa 1 de 2 — Perfil</p>
      </div>

      <div className="flex-1 px-5 pb-8 overflow-y-auto">
        <div className="text-center mb-8 mt-4">
          <h1 className="text-2xl font-bold text-gray-800">Crie seu perfil</h1>
          <p className="text-gray-600 mt-1 text-sm">Como os outros te verão no True Deal</p>
        </div>

        {/* Avatar */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative w-24 h-24 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105"
            style={{
              background: photo
                ? "transparent"
                : "linear-gradient(135deg, #1A2E3A 0%, #2A4E5A 100%)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              border: "2px solid rgba(255,255,255,0.5)",
            }}
          >
            {photo ? (
              <img src={photo} alt="Foto de perfil" className="w-full h-full object-cover" />
            ) : (
              <span className="text-blue-300 font-bold text-2xl">{initials}</span>
            )}
            <div
              className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 hover:opacity-100 transition-opacity"
              style={{ background: "rgba(0,0,0,0.4)" }}
            >
              <Camera className="w-5 h-5 text-white" />
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>

        {/* Nome */}
        <div className="mb-5">
          <label className="text-sm font-semibold text-gray-600 mb-2 block">Nome completo</label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Seu nome"
            className="w-full p-4 rounded-xl outline-none text-gray-800 placeholder-gray-400 font-medium"
            style={{
              background: "rgba(255,255,255,0.6)",
              backdropFilter: "blur(20px)",
              border: name ? "2px solid rgba(22,163,74,0.4)" : "1px solid rgba(255,255,255,0.6)",
            }}
          />
        </div>

        {/* # ID */}
        <div className="mb-5">
          <label className="text-sm font-semibold text-gray-600 mb-2 block">
            Seu identificador <span className="text-gray-400 font-normal">(como amigos te encontram)</span>
          </label>
          <div
            className="flex items-center rounded-xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.6)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.6)",
            }}
          >
            <div className="px-3 py-4 flex items-center gap-1" style={{ borderRight: "1px solid rgba(255,255,255,0.5)" }}>
              <Hash className="w-4 h-4 text-[#16A34A]" />
            </div>
            <input
              type="text"
              value={handle.replace(/^[^#]*#?/, "").replace("#", "")}
              onChange={(e) => {
                setHandleEdited(true)
                const base = name
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[̀-ͯ]/g, "")
                  .replace(/\s+/g, "")
                  .replace(/[^a-z0-9]/g, "")
                  .slice(0, 12) || "user"
                setHandle(`${base}#${e.target.value.replace(/\D/g, "").slice(0, 4)}`)
              }}
              placeholder="0000"
              className="flex-1 px-3 py-4 outline-none text-gray-800 font-medium bg-transparent"
              maxLength={4}
            />
            <span className="px-3 text-sm text-gray-400">{handle.split("#")[0] || "user"}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1 ml-1">
            Identificador único: <span className="text-[#16A34A] font-medium">{handle || "user#0000"}</span>
          </p>
        </div>

        {/* Redes sociais */}
        <div className="mb-8">
          <label className="text-sm font-semibold text-gray-600 mb-3 block">
            Suas redes sociais <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <div className="space-y-3">
            {socialFields.map((field) => (
              <div
                key={field.key}
                className="flex items-center rounded-xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.5)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.5)",
                }}
              >
                <div
                  className="w-10 h-10 m-2 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: field.color }}
                >
                  <AtSign className="w-4 h-4 text-white" />
                </div>
                <div
                  className="px-2 py-3 text-gray-400 text-sm flex-shrink-0"
                  style={{ borderRight: "1px solid rgba(255,255,255,0.4)" }}
                >
                  {field.label}
                </div>
                <input
                  type="text"
                  value={socials[field.key]}
                  onChange={(e) => handleSocialChange(field.key, e.target.value)}
                  placeholder={`${field.prefix}username`}
                  className="flex-1 px-3 py-3 outline-none text-gray-700 text-sm bg-transparent"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2 ml-1">
            Vinculados para verificação automática nos seus Deals
          </p>
        </div>

        {/* Botão continuar */}
        <button
          onClick={handleContinue}
          disabled={!isValid}
          className={`w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300 ${
            isValid ? "hover:scale-[1.02] active:scale-[0.98]" : "opacity-40 cursor-not-allowed"
          }`}
          style={{
            background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
            boxShadow: isValid ? "0 8px 32px rgba(22,163,74,0.4)" : "none",
          }}
        >
          Continuar
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
