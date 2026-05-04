"use client"

import type { CSSProperties, ReactNode, ButtonHTMLAttributes } from "react"

// ── Brand seal icon ───────────────────────────────────────────────────────────

const SEAL_D =
  "M70 10 L78 4 L86 10 L96 8 L101 17 L111 19 L113 29 L122 34 L120 44 L128 51 L122 60 " +
  "L128 70 L122 80 L128 89 L120 96 L122 106 L113 111 L111 121 L101 123 L96 132 L86 130 " +
  "L78 136 L70 130 L62 136 L54 130 L44 132 L39 123 L29 121 L27 111 L18 106 L20 96 L12 89 " +
  "L18 80 L12 70 L18 60 L12 51 L20 44 L18 34 L27 29 L29 19 L39 17 L44 8 L54 10 L62 4 Z"

export function TDIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
      <path d={SEAL_D} fill="#16A34A" />
      <polyline
        points="43,72 60,89 97,52"
        stroke="#fff" strokeWidth="7.5" fill="none"
        strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="43" cy="72" r="5" fill="#fff" />
      <circle cx="97" cy="52" r="5" fill="#fff" />
    </svg>
  )
}

export function TDLockup({ size = 32, dark = true }: { size?: number; dark?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <TDIcon size={size} />
      <span style={{
        fontSize: size * 0.75, fontWeight: 300, letterSpacing: "-0.5px",
        color: dark ? "#EEEEFF" : "#111122", fontFamily: "Inter, sans-serif",
      }}>
        true<span style={{ color: "#16A34A" }}>deal</span>
      </span>
    </div>
  )
}

// ── GlassCard ─────────────────────────────────────────────────────────────────

interface GlassCardProps {
  children: ReactNode
  style?: CSSProperties
  accent?: string
  className?: string
  onClick?: () => void
}

export function GlassCard({ children, style, accent, className, onClick }: GlassCardProps) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: "rgba(255,255,255,0.42)",
        backdropFilter: "blur(30px) saturate(200%)",
        WebkitBackdropFilter: "blur(30px) saturate(200%)",
        border: "1px solid rgba(255,255,255,0.55)",
        borderLeft: accent ? `3.5px solid ${accent}` : undefined,
        borderRadius: 14,
        boxShadow: "0 4px 20px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.6)",
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ── PrimaryBtn ────────────────────────────────────────────────────────────────

interface PrimaryBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  small?: boolean
}

export function PrimaryBtn({ children, style, small, disabled, ...rest }: PrimaryBtnProps) {
  return (
    <button
      disabled={disabled}
      {...rest}
      style={{
        background: disabled ? "rgba(0,0,0,0.08)" : "linear-gradient(135deg,#16A34A,#22C55E)",
        color: disabled ? "#9CA3AF" : "white",
        fontFamily: "Inter, sans-serif",
        fontSize: small ? 11 : 15,
        fontWeight: 600,
        padding: small ? "6px 14px" : "13px 24px",
        borderRadius: small ? 100 : 10,
        border: "none",
        boxShadow: disabled ? "none" : "0 8px 24px rgba(22,163,74,0.35)",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s",
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ── GhostBtn ──────────────────────────────────────────────────────────────────

interface GhostBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  small?: boolean
}

export function GhostBtn({ children, style, small, disabled, ...rest }: GhostBtnProps) {
  return (
    <button
      disabled={disabled}
      {...rest}
      style={{
        background: "rgba(255,255,255,0.6)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        color: disabled ? "#9CA3AF" : "#374151",
        fontFamily: "Inter, sans-serif",
        fontSize: small ? 11 : 15,
        fontWeight: 600,
        padding: small ? "6px 14px" : "13px 24px",
        borderRadius: small ? 100 : 10,
        border: "1px solid rgba(255,255,255,0.8)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s",
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ── PillBtn ───────────────────────────────────────────────────────────────────

export function PillBtn({ children, style, disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      disabled={disabled}
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: disabled ? "rgba(0,0,0,0.06)" : "linear-gradient(135deg,#16A34A,#22C55E)",
        color: disabled ? "#bbb" : "white",
        fontFamily: "Inter, sans-serif",
        fontSize: 11,
        fontWeight: 600,
        padding: "6px 14px",
        borderRadius: 100,
        border: "none",
        boxShadow: disabled ? "none" : "0 3px 10px rgba(22,163,74,0.25)",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s cubic-bezier(0.4,0,0.2,1)",
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ── PillGhostBtn ──────────────────────────────────────────────────────────────

export function PillGhostBtn({ children, style, disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      disabled={disabled}
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: "rgba(22,163,74,0.08)",
        color: "#16A34A",
        fontFamily: "Inter, sans-serif",
        fontSize: 11,
        fontWeight: 600,
        padding: "5px 12px",
        borderRadius: 100,
        border: "1px solid rgba(22,163,74,0.20)",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s cubic-bezier(0.4,0,0.2,1)",
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

type DealStatus = "ativo" | "pendente" | "finalizado"

export function TDStatusBadge({ status }: { status: DealStatus }) {
  const map: Record<DealStatus, { bg: string; color: string; label: string }> = {
    ativo:      { bg: "rgba(22,163,74,0.12)",   color: "#16A34A", label: "Em Jogo"   },
    pendente:   { bg: "rgba(245,158,11,0.12)",  color: "#D97706", label: "Formação"  },
    finalizado: { bg: "rgba(156,163,175,0.14)", color: "#6B7280", label: "Encerrado" },
  }
  const m = map[status]
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "3px 8px",
      borderRadius: 100, background: m.bg, color: m.color,
    }}>
      {m.label}
    </span>
  )
}

// ── PrizeBadge ────────────────────────────────────────────────────────────────

type PrizeType = "proporcional" | "primeiro" | "ranking"

export function TDPrizeBadge({ type }: { type: PrizeType }) {
  const map: Record<PrizeType, { bg: string; color: string; label: string }> = {
    proporcional: { bg: "rgba(139,92,246,0.12)", color: "#7C3AED", label: "Proporcional" },
    primeiro:     { bg: "rgba(245,158,11,0.12)",  color: "#D97706", label: "1º Lugar"    },
    ranking:      { bg: "rgba(59,130,246,0.12)",  color: "#2563EB", label: "Ranking"     },
  }
  const m = map[type]
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "3px 8px",
      borderRadius: 100, background: m.bg, color: m.color,
    }}>
      {m.label}
    </span>
  )
}
