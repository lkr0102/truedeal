# 🏛️ Prova de Fluxo Soberano (SentinelForge v2.0)

Este documento comprova a evolução do sistema TrueDeal: de um simples oráculo de métricas para um ecossistema de **Liquidação Forense baseada em IA**.

## 1. Do Oráculo à Forja (SentinelForge)
O fluxo técnico agora não apenas consulta APIs (X/Strava), mas submete os dados ao **SentinelForge**. 

**Fluxo de Verificação Auditada:**
1. **CAPTURE:** TrueDeal coleta dados via `api/verify/x`.
2. **AUDIT:** O bundle de evidência é enviado ao `risk-guardian-core` (Sentinel-01).
3. **CONSENSUS:** O júri digital (BFT) valida a integridade do dado.
4. **ATTESTATION:** É gerado um `proofHash` (UEAP) que lastreia o veredito.

## 2. Validação da Camada Agnóstica (Teste API)
Simulação de uma requisição de auditoria forense para um deal do TrueDeal:

**Chamada de Auditoria (Sentinel-01):**
```bash
curl -X POST http://localhost:8000/v1/evidence \
-H "Content-Type: application/json" \
-d '{
  "deal_id": "truedeal-solana-hackathon-01",
  "participants": [
    {"address": "winner_pubkey", "performance_delta": 450}
  ],
  "goal_threshold": 400,
  "sources": ["x_api_v2"],
  "provider": "qwen"
}'
```

**Resultado do Veredito (Consenso Alcançado):**
```json
{
  "status": "CONFIRMED",
  "winner": "winner_pubkey",
  "proof_hash": "sha256:7f8e9a2b...b4c5d6",
  "confidence": 1.0,
  "meta": {
    "consensus_model": "BFT-Agent-Jury",
    "quorum": "3/3",
    "ueap_attestation": true
  }
}
```

## 3. Integração On-Chain (Solana Anchor)
O `proof_hash` gerado acima é o único dado necessário para o programa Anchor da Solana liberar o Escrow. 

> [!IMPORTANT]
> **Soberania Jurídica**: O contrato da Solana não vê a lógica da IA (IP Protegida). Ele apenas verifica se o `proof_hash` enviado pela autoridade `SENTINEL_FORGE_PDA` corresponde ao veredito. Isso garante 100% de automação com 0% de exposição do core proprietário.

---

## ⚖️ Veredito de Prontidão (THEMIS)
O sistema está **Pronto para Demonstração Industrial**. A separação entre a interface comercial (TrueDeal) e o cérebro forense (SentinelForge) garante a escalabilidade agnóstica para qualquer blockchain.

**Assinado:** *Themis Sovereign Cortex // Symbeon Labs Architecture*
