# 🚀 TrueDeal EAP v2: Integração de Infraestrutura Soberana

## 🎯 Objetivo
Finalizar a integração do core forense **Risk Guardian Core** no fluxo de **Acordos de Performance** do TrueDeal para o Colosseum Hackathon.

## 🗓️ Phase 1: Infraestrutura de Ponte (Semanas 1-2)
- **Task B1.1**: Deploy do **Risk Guardian Core** como microserviço independente (Nó Soberano).
- **Task B1.2**: Implementação do `SentinelClient` no backend TrueDeal para consumo da API agnóstica.
- **Task B1.3**: Configuração de handshake seguro entre TrueDeal (Vercel) e **Risk Guardian Core** (Hardware Local).

## 🗓️ Phase 2: Fluxo de Auditoria de Integridade (Semana 2)
- **Task F2.1**: **Hook de Pré-Auditoria**: Integrar Sentinel-01 no fluxo de "Criação de Acordo" para validar histórico dos proponentes.
- **Task F2.2**: **Monitoramento de Anomalias**: Implementar job de envio periódico de snapshots para o **Risk Guardian Core**.
- **Task F2.3**: **DEALGUARD Engine Dashboard**: Criar painel de verificação no app TrueDeal exibindo o status do consenso (ex: "3/3 Validadores Confirmados").

## 🗓️ Phase 3: Execução de Liquidação (Semana 3)
- **Task S3.1**: Integração do `proofHash` retornado pelo **Risk Guardian Core** na instrução Anchor `settle_performance_agreement`.
- **Task S3.2**: Teste ponta-a-ponta do gatilho de **Liquidação de Escrow** automático após atingimento de metas.
- **Task S3.3**: Deployment do programa Solana com verificação de autoridade da `RISK_GUARDIAN_PDA`.

## 🗓️ Phase 4: Pitch & Demonstração (Semana 4)
- **Task P4.1**: Gravação da demo "Proof of Flow Sovereign" usando nomenclatura institucional.
- **Task P4.2**: Finalização do **Relatório Técnico Executivo** focando na convergência AI-Cripto para governança.
- **Task P4.3**: Submissão ao Colosseum Frontier Hackathon.

---
*Status: Aprovado pela Symbeon Labs Architecture.*
