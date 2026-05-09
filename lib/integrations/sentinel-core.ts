/**
 * 🛡️ Sentinel-01 AI Core: Behavioral Anomaly Detection
 * Analisa evidências sociais e físicas para identificar tentativas de fraude.
 */

export interface SentinelAnalysis {
  riskScore: number; // 0.0 to 1.0
  isFraudulent: boolean;
  reason: string | null;
  fingerprint: string;
}

export async function analyzeEvidence(channel: string, data: any[]): Promise<SentinelAnalysis> {
  console.log(`[Sentinel] Analisando evidências do canal: ${channel}...`);
  
  // No mundo real, aqui chamaríamos o modelo Qwen-3B/Sentinal-Core
  // Para a Demo, implementamos uma lógica de heurística forense

  let riskScore = 0.05;
  let reason = null;

  if (channel === "strava") {
    // Detectar atividades muito curtas ou com velocidades impossíveis
    const tooFast = data.some(a => (a.average_speed * 3.6) > 40); // > 40km/h em corrida?
    if (tooFast) {
      riskScore = 0.95;
      reason = "Velocidade média acima do limite biológico humano.";
    }
  } else if (channel === "x") {
    // Detectar padrões de bot ou posts idênticos
    const postTexts = data.map(p => p.text);
    const duplicates = new Set(postTexts).size !== postTexts.length;
    if (duplicates) {
      riskScore = 0.88;
      reason = "Padrão de postagem duplicada detectado (Bot behavior).";
    }
  }

  return {
    riskScore,
    isFraudulent: riskScore > 0.7,
    reason,
    fingerprint: `sentinel-${Math.random().toString(36).substring(7)}`
  };
}
