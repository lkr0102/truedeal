import { ImageResponse } from "next/og"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

const RULE_LABELS: Record<string, string> = {
  post:             "post",
  checkin:          "check-in",
  km_run:           "km run",
  follower_gained:  "follower",
  impressions:      "impressions",
  workout_hours:    "workout hrs",
  comment_received: "comment",
  repost_received:  "repost",
  different_venues: "venues",
}
const FREQ_LABELS: Record<string, string> = {
  daily: "daily", weekly: "weekly", monthly: "monthly",
}

function fmt(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00Z")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: d } = await (supabase.from("deals") as any)
    .select("title, status, entry_amount, verification_type, rule_target, rule_frequency, start_date, end_date, participant_count, type")
    .eq("id", id)
    .single()

  if (!d) return new Response("Not found", { status: 404 })

  const pot   = Math.round((d.entry_amount ?? 0) * (d.participant_count ?? 1) * 100) / 100
  const rule  = `${d.rule_target ?? "?"} ${RULE_LABELS[d.verification_type] ?? d.verification_type ?? ""}${d.rule_frequency ? ` · ${FREQ_LABELS[d.rule_frequency] ?? d.rule_frequency}` : ""}`

  const grad =
    d.status === "ativo"    ? ["#00523A", "#00875A", "#00B852"] :
    d.status === "formacao" ? ["#9E3700", "#C94C0A", "#E8620A"] :
                              ["#3A4A3A", "#5A6A5A", "#8BA09A"]

  const statusBadge =
    d.status === "ativo"    ? "ACTIVE"    :
    d.status === "formacao" ? "FORMATION" : "ENDED"

  const stats = [
    { label: "ENTRY",   value: `$${d.entry_amount}` },
    { label: "PLAYERS", value: String(d.participant_count ?? 0) },
    { label: "POT",     value: `$${pot}` },
    { label: "PERIOD",  value: `${fmt(d.start_date)} → ${fmt(d.end_date)}` },
  ]

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "44px 48px",
        background: `linear-gradient(135deg, ${grad[0]} 0%, ${grad[1]} 55%, ${grad[2]} 100%)`,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        position: "relative",
      }}>
        {/* background glow blobs */}
        <div style={{ position: "absolute", top: "-20%", right: "-5%", width: 360, height: 360, background: "rgba(255,255,255,0.08)", borderRadius: "50%", filter: "blur(80px)" }} />
        <div style={{ position: "absolute", bottom: "-20%", left: "30%", width: 240, height: 240, background: "rgba(0,0,0,0.12)", borderRadius: "50%", filter: "blur(60px)" }} />

        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ padding: "8px 20px", borderRadius: 100, background: "rgba(0,0,0,0.28)", color: "#fff", fontSize: 20, fontWeight: 800, letterSpacing: 2 }}>
              • {statusBadge}
            </div>
            <div style={{ padding: "8px 20px", borderRadius: 100, background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 20, fontWeight: 700, letterSpacing: 1 }}>
              {d.type === "privado" ? "PRIVATE" : "PUBLIC"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.18)", border: "2.5px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 18, fontWeight: 800, letterSpacing: 3 }}>TRUEDEAL</span>
          </div>
        </div>

        {/* Title + rule */}
        <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
          <div style={{ fontSize: 60, fontWeight: 900, color: "#fff", letterSpacing: -1.5, lineHeight: 1.15, marginBottom: 12 }}>
            {d.title}
          </div>
          <div style={{ fontSize: 24, color: "rgba(255,255,255,0.70)", fontWeight: 500 }}>
            {rule}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 14, position: "relative" }}>
          {stats.map(({ label, value }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", flex: 1, background: "rgba(0,0,0,0.28)", borderRadius: 18, padding: "18px 22px" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.48)", letterSpacing: 1.5, marginBottom: 8, textTransform: "uppercase" as const }}>{label}</span>
              <span style={{ fontSize: 26, fontWeight: 800, color: "#fff" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 800, height: 420 },
  )
}
