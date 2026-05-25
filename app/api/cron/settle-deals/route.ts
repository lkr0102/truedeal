import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { settleDealProtocol } from "@/lib/actions/settlement"

// Vercel Cron calls this route every hour (see vercel.json).
// Finds all deals with status='ativo' whose end_date has passed
// and runs the full DealGuard settlement pipeline on each one.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createServiceClient()

  // Use today's calendar date so deals with end_date = today are settled
  // only after the day is fully over (next cron run), not mid-day.
  const today = new Date().toISOString().split("T")[0]

  const { data: expired, error } = await (supabase.from("deals") as any)
    .select("id, title")
    .eq("status", "ativo")
    .lt("end_date", today)

  if (error) {
    console.error("[settle-deals] Failed to query expired deals:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!expired?.length) {
    return NextResponse.json({ ok: true, settled: 0, ts: today })
  }

  console.log(`[settle-deals] Found ${expired.length} expired deal(s) to settle`)

  const results: Array<{ id: string; title: string; ok: boolean; txSignature?: string; error?: string }> = []

  for (const deal of expired) {
    try {
      const result = await settleDealProtocol(deal.id)
      console.log(`[settle-deals] Settled deal ${deal.id}: ${result.txSignature}`)
      results.push({ id: deal.id, title: deal.title, ok: true, txSignature: result.txSignature })
    } catch (err: any) {
      console.error(`[settle-deals] Failed to settle deal ${deal.id}:`, err.message)
      results.push({ id: deal.id, title: deal.title, ok: false, error: err.message })
    }
  }

  const allOk = results.every((r) => r.ok)
  return NextResponse.json(
    { ok: allOk, settled: results.filter((r) => r.ok).length, results, ts: today },
    { status: allOk ? 200 : 207 },
  )
}
