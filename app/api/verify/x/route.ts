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

    // SIMULAÇÃO: No hackathon, usaremos um mock ou uma chamada real se a API Key estiver disponível
    // Para a demo, vamos gerar um número realista baseado no username
    const mockFollowers = Math.floor(Math.random() * 5000) + 100
    
    const snapshotData = {
      followers: mockFollowers,
      captured_at: new Date().toISOString(),
      source: "x_api_v2_mock"
    }

    // 1. Buscar a participação do usuário no deal
    const { data: participant, error: fetchError } = await supabase
      .from("deal_participants")
      .select("id, initial_snapshot")
      .eq("deal_id", dealId)
      .eq("user_id", userId)
      .single()

    if (fetchError || !participant) {
      return NextResponse.json({ error: "Participante não encontrado" }, { status: 404 })
    }

    // 2. Se for o primeiro snapshot, salva como initial_snapshot
    if (!participant.initial_snapshot) {
      await supabase
        .from("deal_participants")
        .update({ 
          initial_snapshot: snapshotData,
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
