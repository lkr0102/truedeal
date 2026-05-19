"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Home, Compass, Wallet, User, Plus,
  Trophy, Search, Bell, Clock, Flame,
  Handshake, TrendingUp, TrendingDown,
} from "lucide-react"
import { doCheckin } from "@/lib/actions/profile"
import type { HofUser } from "@/lib/actions/profile"
import type { Profile } from "@/lib/supabase/types"
import { useLanguageStore, t, type Language } from "@/lib/i18n"

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: "#F0F3F0", surface: "#FFFFFF", surface2: "#E8EDE8",
  border: "#D8E0D8", border2: "#E6EEE6",
  text: "#0B1309", mid: "#4E614E", dim: "#8BA09A",
  brand: "#00B852", brandDark: "#008C3E", forming: "#E8620A",
  activeLight: "rgba(0,184,82,0.08)", activeBorder: "rgba(0,184,82,0.2)",
} as const
const MONO: React.CSSProperties = { fontFamily: "var(--font-dm-mono,'DM Mono',monospace)" }

// ── Bottom Nav (5-col with center FAB) ────────────────────────────────────────

function BottomNav({ activeKey, lang }: { activeKey: string; lang: Language }) {
  const router = useRouter()
  const navItem = (Icon: React.ElementType, key: string, href: string) => {
    const isActive = activeKey === key
    return (
      <button key={key} onClick={() => router.push(href)}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontSize: 9, color: isActive ? C.brand : C.dim, cursor: "pointer", background: "none", border: "none", flex: 1, ...MONO, letterSpacing: "0.04em" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: isActive ? C.brand : "transparent" }}>
          <Icon style={{ width: 20, height: 20, stroke: isActive ? "#fff" : C.dim, fill: "none" }} />
        </div>
        <span style={{ textTransform: "uppercase" as const }}>{t(key as any, lang)}</span>
      </button>
    )
  }
  return (
    <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(240,243,240,0.94)", backdropFilter: "blur(16px)", borderTop: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", padding: "9px 0 26px", zIndex: 20 }}>
      {navItem(Home,    "nav_home",    "/")}
      {navItem(Compass, "nav_explore", "/explore")}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        <button onClick={() => router.push("/create")} style={{ width: 50, height: 50, background: C.brand, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginTop: -14, boxShadow: "0 4px 14px rgba(0,184,82,0.35)", border: `3px solid ${C.bg}`, cursor: "pointer" }}>
          <Plus style={{ width: 22, height: 22, stroke: "#fff", fill: "none" }} />
        </button>
        <span style={{ fontSize: 9, fontWeight: 500, color: C.brand, textTransform: "uppercase" as const, letterSpacing: "0.04em", ...MONO }}>New Deal</span>
      </div>
      {navItem(Wallet, "nav_wallet",  "/wallet")}
      {navItem(User,   "nav_profile", "/profile")}
    </nav>
  )
}

// ── Progressive check-in rewards ──────────────────────────────────────────────

const CHECKIN_REWARDS = [50, 70, 100, 150, 200, 250, 300]

function getCheckinReward(streak: number): number {
  return CHECKIN_REWARDS[Math.min(streak, 6)]
}

function computeNextReward(lastCheckin: string | null, currentStreak: number): number {
  if (!lastCheckin) return CHECKIN_REWARDS[0]
  const lastDate = new Date(lastCheckin).toISOString().split("T")[0]
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0]
  return lastDate === yesterday ? getCheckinReward(currentStreak) : CHECKIN_REWARDS[0]
}

function secondsUntilNextCheckin(lastCheckin: string | null): number {
  if (!lastCheckin) return 0
  const lastDate = new Date(lastCheckin).toISOString().split("T")[0]
  const todayDate = new Date().toISOString().split("T")[0]
  if (lastDate !== todayDate) return 0
  const midnight = new Date(todayDate)
  midnight.setUTCDate(midnight.getUTCDate() + 1)
  return Math.max(0, Math.floor((midnight.getTime() - Date.now()) / 1000))
}

// ── Avatar helpers ────────────────────────────────────────────────────────────

function userColor(id: string): string {
  const colors = ["#4AABFF", "#BF4ADF", C.brand, "#F59E0B", "#EF4444", "#10B981", "#8B5CF6", "#EC4899"]
  let hash = 0
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return colors[Math.abs(hash) % colors.length]
}
function userBg(id: string): string {
  const bgs = ["#1A2E3A", "#2E1A2E", "#1A2E1A", "#2E2A1A", "#2E1A1A", "#1A2E26", "#1A1A2E", "#2A1A2E"]
  let hash = 0
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return bgs[Math.abs(hash) % bgs.length]
}
function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
}

// ── Check-in Card ─────────────────────────────────────────────────────────────

function CheckInCard({
  totalCheckins: initialTotal,
  streak: initialStreak,
  lastCheckin,
  lang,
}: {
  totalCheckins: number
  streak: number
  lastCheckin: string | null
  lang: Language
}) {
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntilNextCheckin(lastCheckin))
  const [done,        setDone]        = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [total,       setTotal]       = useState(initialTotal)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (secondsLeft <= 0) return
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(intervalRef.current!); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const canCheckIn = secondsLeft === 0 && !done
  const hh = String(Math.floor(secondsLeft / 3600)).padStart(2, "0")
  const mm = String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, "0")
  const ss = String(secondsLeft % 60).padStart(2, "0")

  const nextReward = computeNextReward(lastCheckin, initialStreak)

  async function handleCheckIn() {
    if (!canCheckIn || loading) return
    setLoading(true)
    const result = await doCheckin()
    if (!result.error) {
      setDone(true)
      setTotal(c => c + 1)
      setSecondsLeft(24 * 3600)
    }
    setLoading(false)
  }

  return (
    <div style={{ borderRadius: 18, overflow: "hidden", background: C.surface, border: `${canCheckIn ? "1.5px" : "1px"} solid ${canCheckIn ? C.activeBorder : C.border}` }}>
      <div className="px-4 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: canCheckIn ? "rgba(22,163,74,0.12)" : "rgba(59,130,246,0.12)" }}>
            <Handshake className="w-4 h-4" style={{ color: canCheckIn ? C.brand : "#3B82F6" }} />
          </div>
          <div>
            <p className="font-bold text-gray-800 text-sm">{t("explore_checkin_title", lang)}</p>
            <p className="text-[10px] text-gray-500">{total} {t("explore_checkin_done", lang)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-bold text-gray-800">{initialStreak}🔥</span>
        </div>
      </div>

      {/* Progressive reward track */}
      <div className="px-4 pt-3 pb-0">
        <div className="flex items-center gap-1">
          {CHECKIN_REWARDS.map((reward, i) => {
            const isCurrentOrPast = initialStreak >= i + 1
            const isNext = initialStreak === i
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full h-1 rounded-full transition-all"
                  style={{ background: isCurrentOrPast ? C.brand : isNext ? "rgba(0,184,82,0.2)" : "rgba(0,0,0,0.08)" }} />
                <span className="text-[8px] font-bold" style={{ color: isCurrentOrPast ? C.brand : isNext ? C.brand : "#D1D5DB" }}>
                  {reward}
                </span>
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-0.5 mb-2">
          <span className="text-[8px] text-gray-400">{t("explore_day_1", lang)}</span>
          <span className="text-[8px] text-gray-400">{t("explore_day_7plus", lang)}</span>
        </div>
      </div>

      <div className="px-4 pb-4">
        {canCheckIn ? (
          <p style={{ fontSize: 13, fontWeight: 600, color: C.brand, textAlign: "center", marginBottom: 12 }}>✅ {t("explore_available_now", lang)}</p>
        ) : (
          <div className="flex items-center justify-center gap-1 mb-3">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-xs text-gray-500">{t("explore_next_checkin", lang)}</p>
            <span className="font-mono font-bold text-gray-700 text-sm">{hh}:{mm}:{ss}</span>
          </div>
        )}
        <button onClick={handleCheckIn} disabled={!canCheckIn || loading}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300"
          style={{
            background: canCheckIn ? C.brand : "rgba(0,0,0,0.05)",
            color: canCheckIn ? "white" : "#9CA3AF",
            boxShadow: canCheckIn ? "0 4px 16px rgba(22,163,74,0.35)" : "none",
            cursor: canCheckIn ? "pointer" : "not-allowed",
          }}>
          {done
            ? `✅ ${t("explore_checked_in", lang)} +${nextReward} 🤝`
            : loading
            ? t("explore_saving", lang)
            : canCheckIn
            ? `${t("explore_do_checkin", lang)} · +${nextReward} 🤝`
            : t("explore_unavail", lang)}
        </button>
        <button disabled className="w-full py-2.5 rounded-xl font-medium text-xs mt-2 flex items-center justify-center gap-2"
          style={{ background: "rgba(0,0,0,0.04)", color: "#C4C4C4", border: "1px dashed rgba(0,0,0,0.1)", cursor: "not-allowed" }}>
          <Flame className="w-3.5 h-3.5 text-gray-300" />
          {t("explore_repair_streak", lang)}
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: "rgba(0,0,0,0.06)", color: "#C4C4C4" }}>
            {t("explore_label_unavailable", lang)}
          </span>
        </button>
      </div>
    </div>
  )
}

// ── Compact Shakes Ranking (Points tab) ───────────────────────────────────────

function ShakesRankingList({
  users,
  userId,
  lang,
}: {
  users: HofUser[]
  userId: string | null
  lang: Language
}) {
  const sorted = [...users].sort((a, b) => b.tdp_points - a.tdp_points)

  return (
    <div>
      <p className="text-sm font-bold text-gray-700 mb-3">{t("explore_shakes_ranking", lang)}</p>
      <div className="space-y-2">
        {sorted.map((u, idx) => {
          const rank = idx + 1
          const isMe = u.id === userId
          const color = userColor(u.id)
          const bg = userBg(u.id)
          const initials = getInitials(u.display_name || u.username)
          return (
            <div key={u.id} style={{ borderRadius: 18, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, background: isMe ? C.activeLight : C.surface, border: `${isMe ? "1.5px" : "1px"} solid ${isMe ? C.activeBorder : C.border}` }}>
              <p className="w-6 text-center font-black text-sm flex-shrink-0"
                style={{ color: rank <= 3 ? C.brand : "#9CA3AF" }}>
                {rank}
              </p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `linear-gradient(135deg,${bg},${bg}CC)` }}>
                <span className="font-bold text-[10px]" style={{ color }}>{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="font-bold text-gray-800 text-sm truncate">{u.display_name || u.username}</p>
                  {isMe && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: C.activeLight, color: C.brand }}>
                      {t("hof_you", lang)}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400">@{u.username}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-sm" style={{ color: C.brand }}>
                  {u.tdp_points.toLocaleString()} 🤝
                </p>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <Flame className="w-3 h-3 text-orange-400" />
                  <span className="text-[10px] text-gray-400">{u.streak_days}d</span>
                </div>
              </div>
            </div>
          )
        })}
        {sorted.length === 0 && (
          <div className="text-center py-8">
            <Bell className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-400">{t("hof_no_results", lang)}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Points Tab ────────────────────────────────────────────────────────────────

function PointsTab({
  profile,
  totalCheckins,
  hofUsers,
  userId,
  lang,
}: {
  profile: Profile | null
  totalCheckins: number
  hofUsers: HofUser[]
  userId: string | null
  lang: Language
}) {
  const shakesPoints = profile?.tdp_points  ?? 0
  const streak       = profile?.streak_days ?? 0
  const lastCheckin  = profile?.last_checkin ?? null

  return (
    <div className="px-5 pb-8 space-y-4">
      {/* Hero */}
      <div style={{ borderRadius: 26, padding: 24, textAlign: "center", background: `linear-gradient(135deg,#003D22,${C.brandDark} 60%,${C.brand})`, boxShadow: "0 12px 40px rgba(0,184,82,0.35)" }}>
        <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">
          {t("explore_your_shakes", lang)}
        </p>
        <div className="flex items-center justify-center gap-2 mb-1">
          <p className="text-white text-5xl font-black">{shakesPoints.toLocaleString()}</p>
          <Handshake className="w-8 h-8 text-white/70 mt-1" />
        </div>
        <div className="flex justify-center gap-4 mt-4">
          <div className="text-center">
            <p className="text-white text-base font-bold">{streak} 🔥</p>
            <p className="text-white/60 text-[10px]">{t("explore_streak", lang)}</p>
          </div>
          <div className="w-px bg-white/20" />
          <div className="text-center">
            <p className="text-white text-base font-bold">{totalCheckins}</p>
            <p className="text-white/60 text-[10px]">{t("explore_checkins_label", lang)}</p>
          </div>
          <div className="w-px bg-white/20" />
          <div className="text-center">
            <p className="text-white text-base font-bold">{profile?.referral_count ?? 0}</p>
            <p className="text-white/60 text-[10px]">{t("explore_referrals", lang)}</p>
          </div>
        </div>
      </div>

      <CheckInCard totalCheckins={totalCheckins} streak={streak} lastCheckin={lastCheckin} lang={lang} />

      <ShakesRankingList users={hofUsers} userId={userId} lang={lang} />
    </div>
  )
}

// ── Hall of Fame Tab ──────────────────────────────────────────────────────────

type HofFilter = "deals" | "wins" | "winrate" | "pnl"

function HallOfFameTab({
  hofUsers,
  userId,
  lang,
}: {
  hofUsers: HofUser[]
  userId: string | null
  lang: Language
}) {
  const [filter, setFilter] = useState<HofFilter>("deals")
  const [search, setSearch] = useState("")

  const FILTERS: { key: HofFilter; labelKey: string }[] = [
    { key: "deals",   labelKey: "hof_filter_deals"   },
    { key: "wins",    labelKey: "hof_filter_wins"     },
    { key: "winrate", labelKey: "hof_filter_winrate"  },
    { key: "pnl",     labelKey: "hof_filter_pnl"      },
  ]

  const sorted = [...hofUsers].sort((a, b) => {
    if (filter === "deals")   return b.total_deals - a.total_deals
    if (filter === "wins")    return b.wins - a.wins
    if (filter === "winrate") return b.win_rate - a.win_rate
    return b.pnl_amount - a.pnl_amount
  })

  const filtered = sorted.filter(u =>
    (u.display_name || u.username).toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="px-5 pb-8 space-y-4">
      {/* Filter row */}
      <div className="grid grid-cols-4 gap-1.5">
        {FILTERS.map(({ key, labelKey }) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{
              padding: "8px 4px", borderRadius: 12, fontSize: 10, fontWeight: filter === key ? 700 : 500, textAlign: "center",
              background: filter === key ? C.brand : C.surface,
              color: filter === key ? "#fff" : C.mid,
              border: `1px solid ${filter === key ? C.brand : C.border}`,
              cursor: "pointer", transition: "all 0.15s",
            }}>
            {t(labelKey as any, lang)}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t("hof_search", lang)}
          style={{ width: "100%", paddingLeft: 44, paddingRight: 16, paddingTop: 12, paddingBottom: 12, borderRadius: 12, fontSize: 13, background: C.surface, border: `1px solid ${C.border}`, color: C.text, outline: "none" }} />
      </div>

      {/* Ranking list */}
      <div className="space-y-2">
        {filtered.map((u) => {
          const rank   = sorted.indexOf(u) + 1
          const isMe   = u.id === userId
          const color  = userColor(u.id)
          const bg     = userBg(u.id)
          const initials = getInitials(u.display_name || u.username)
          const pnlPos = u.pnl_amount >= 0

          return (
            <div key={u.id} style={{ borderRadius: 18, padding: 16, background: isMe ? C.activeLight : C.surface, border: `${isMe ? "1.5px" : "1px"} solid ${isMe ? C.activeBorder : C.border}` }}>
              {/* Top row: rank + avatar + name + Shakes */}
              <div className="flex items-center gap-3 mb-3">
                <p className="w-6 text-center font-black text-base flex-shrink-0"
                  style={{ color: rank <= 3 ? C.brand : "#9CA3AF" }}>
                  {rank}
                </p>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg,${bg},${bg}CC)` }}>
                  <span className="font-bold text-xs" style={{ color }}>{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-gray-800 text-sm">{u.display_name || u.username}</p>
                    {isMe && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: C.activeLight, color: C.brand }}>
                        {t("hof_you", lang)}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400">@{u.username}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold" style={{ color: C.brand }}>{u.tdp_points.toLocaleString()} 🤝</p>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <Flame className="w-3 h-3 text-orange-400" />
                    <span className="text-[10px] text-gray-400">{u.streak_days}d</span>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="rounded-xl px-3 py-2 grid grid-cols-4 gap-1 text-center"
                style={{ background: "rgba(0,0,0,0.04)" }}>
                <div>
                  <p className="text-[9px] text-gray-400 font-medium">{t("hof_deals", lang)}</p>
                  <p className="text-xs font-bold text-gray-700">{u.total_deals}</p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-400 font-medium">{t("hof_wins", lang)}</p>
                  <p className="text-xs font-bold" style={{ color: C.brand }}>{u.wins}</p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-400 font-medium">{t("hof_losses", lang)}</p>
                  <p className="text-xs font-bold" style={{ color: "#EF4444" }}>{u.losses}</p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-400 font-medium">{t("hof_win_rate", lang)}</p>
                  <p className="text-xs font-bold text-gray-700">{u.win_rate}%</p>
                </div>
              </div>

              {/* PnL row */}
              <div className="flex items-center justify-between mt-2 px-1">
                <div className="flex items-center gap-1">
                  {pnlPos
                    ? <TrendingUp className="w-3.5 h-3.5" style={{ color: C.brand }} />
                    : <TrendingDown className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />}
                  <span className="text-[10px] font-bold" style={{ color: "#6B7280" }}>{t("hof_pnl", lang)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: pnlPos ? C.brand : "#EF4444" }}>
                    {pnlPos ? "+" : ""}${Math.abs(u.pnl_amount).toFixed(2)}
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: pnlPos ? C.activeLight : "rgba(239,68,68,0.1)", color: pnlPos ? C.brand : "#EF4444" }}>
                    {pnlPos ? "+" : ""}{u.pnl_pct}%
                  </span>
                </div>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-8">
            <Trophy className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-400">{t("hof_no_results", lang)}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

type SubTab = "points" | "halloffame"

export default function ExploreClient({
  profile,
  totalCheckins,
  hofUsers,
  userId,
}: {
  profile: Profile | null
  totalCheckins: number
  hofUsers: HofUser[]
  userId: string | null
}) {
  const lang = useLanguageStore(s => s.language)
  const [subTab, setSubTab] = useState<SubTab>("points")

  const SUB_TABS: { key: SubTab; labelKey: string; Icon: React.FC<{ className?: string; style?: React.CSSProperties }> }[] = [
    { key: "points",     labelKey: "explore_tab_points", Icon: Handshake },
    { key: "halloffame", labelKey: "explore_tab_hof",    Icon: Trophy    },
  ]

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", paddingBottom: 90 }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 8px" }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.03em", color: C.text }}>{t("explore_title", lang)}</h1>
          <p style={{ fontSize: 12, color: C.mid }}>{t("explore_subtitle", lang)}</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ padding: "8px 20px 14px" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {SUB_TABS.map((tab) => {
            const Icon     = tab.Icon
            const isActive = subTab === tab.key
            return (
              <button key={tab.key} onClick={() => setSubTab(tab.key)}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", borderRadius: 12, fontSize: 12, fontWeight: isActive ? 700 : 500, background: isActive ? C.brand : C.surface, color: isActive ? "#fff" : C.mid, border: `1px solid ${isActive ? C.brand : C.border}`, cursor: "pointer", transition: "all 0.15s" }}>
                <Icon style={{ width: 14, height: 14, stroke: "currentColor", fill: "none" }} />
                {t(tab.labelKey as any, lang)}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {subTab === "points"
          ? <PointsTab profile={profile} totalCheckins={totalCheckins} hofUsers={hofUsers} userId={userId} lang={lang} />
          : <HallOfFameTab hofUsers={hofUsers} userId={userId} lang={lang} />}
      </div>

      <BottomNav activeKey="nav_explore" lang={lang} />
    </div>
  )
}
