import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * DealGuard Engine — X Performance Oracle
 * 
 * Este endpoint é o oráculo que captura o snapshot de seguidores do X (Twitter).
 * Em produção, ele deve usar a X API v2 com OAuth2.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { dealId, userId, xUsername } = await req.json()

    if (!dealId || !userId || !xUsername) {
      return NextResponse.json({ error: "Parâmetros ausentes" }, { status: 400 })
    }

    let followersCount = 0;
    let source = "x_api_v2_mock";

    // Integração Real com a X API v2
    if (process.env.X_API_BEARER_TOKEN) {
      try {
        const xResponse = await fetch(
          `https://api.twitter.com/2/users/by/username/${xUsername.replace('@', '')}?user.fields=public_metrics`,
          {
            headers: {
              Authorization: `Bearer ${process.env.X_API_BEARER_TOKEN}`,
            },
          }
        );

        if (xResponse.ok) {
          const xData = await xResponse.json();
          if (xData.data && xData.data.public_metrics) {
            followersCount = xData.data.public_metrics.followers_count;
            source = "x_api_v2_real";
          }
        } else {
          console.error("X API Error:", await xResponse.text());
        }
      } catch (err) {
        console.error("Failed to fetch from X API:", err);
      }
    }

    // Fallback: Se a API falhar ou não tivermos o token (hackathon demo mode)
    if (followersCount === 0) {
      followersCount = Math.floor(Math.random() * 5000) + 100;
    }
    
    const snapshotData = {
      followers: followersCount,
      captured_at: new Date().toISOString(),
      source: source
    }

    // 1. Buscar a participação do usuário no deal
    const { data: participant, error: fetchError } = await supabase
      .from("deal_participants")
      .select("id, start_snapshot")
      .eq("deal_id", dealId)
      .eq("user_id", userId)
      .single()

    if (fetchError || !participant) {
      return NextResponse.json({ error: "Participante não encontrado" }, { status: 404 })
    }

    // 2. Se for o primeiro snapshot, salva como start_snapshot
    if (!participant.start_snapshot) {
      await supabase
        .from("deal_participants")
        .update({
          start_snapshot: snapshotData,
          current_snapshot: snapshotData
        })
        .eq("id", participant.id)
    } else {
      // Caso contrário, apenas atualiza o snapshot atual
      await supabase
        .from("deal_participants")
        .update({ current_snapshot: snapshotData })
        .eq("id", participant.id)
    }

    return NextResponse.json({
      success: true,
      snapshot: snapshotData,
      proof_hash: "dg_" + Math.random().toString(36).substring(7) // Mock do hash forense do DealGuard
    })

  } catch (error) {
    console.error("X Verification Error:", error)
    return NextResponse.json({ error: "Falha na verificação forense" }, { status: 500 })
  }
}
