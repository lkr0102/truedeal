import { NextRequest, NextResponse } from "next/server"
import { settleDealProtocol } from "@/lib/actions/settlement"

// Admin endpoint to manually trigger settlement for a specific deal.
// Used to recover deals stuck in "ativo" when the Vercel Cron fails.
// Protected by the same CRON_SECRET used by the automated cron job.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const dealId = params.id
  if (!dealId) {
    return NextResponse.json({ error: "Deal ID required" }, { status: 400 })
  }

  try {
    const result = await settleDealProtocol(dealId)
    console.log(`[admin/settle-deal] Manually settled deal ${dealId}: ${result.txSignature}`)
    return NextResponse.json({ ok: true, ...result })
  } catch (err: any) {
    console.error(`[admin/settle-deal] Failed to settle deal ${dealId}:`, err.message)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
