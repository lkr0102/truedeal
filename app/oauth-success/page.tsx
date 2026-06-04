"use client"

import { useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"

function OAuthSuccessInner() {
  const params   = useSearchParams()
  const router   = useRouter()
  const provider = params.get("provider") ?? "unknown"
  const error    = params.get("error")

  useEffect(() => {
    if (typeof window === "undefined") return

    if (window.opener && !window.opener.closed) {
      // Opened as a popup — send result to opener and close
      window.opener.postMessage(
        { type: error ? "OAUTH_ERROR" : "OAUTH_SUCCESS", provider, error },
        window.location.origin,
      )
      window.close()
    } else {
      // Full-page flow — redirect to profile with the result
      const dest = error
        ? `/profile?social_error=${encodeURIComponent(error)}`
        : `/profile?social_success=${provider}`
      router.replace(dest)
    }
  }, [provider, error, router])

  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#F0F3F0", gap: 12,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: error ? "rgba(239,68,68,0.1)" : "rgba(0,184,82,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 24,
      }}>
        {error ? "⚠" : "✓"}
      </div>
      <p style={{ fontSize: 13, color: "#4E614E", fontWeight: 600 }}>
        {error ? "Algo deu errado…" : "Conectado! Fechando…"}
      </p>
    </div>
  )
}

export default function OAuthSuccessPage() {
  return (
    <Suspense fallback={null}>
      <OAuthSuccessInner />
    </Suspense>
  )
}
