# Sovereign Agent Synchronization Protocol (TrueDeal)

**Atenção IA (Claude / Antigravity / Outros Agentes):** Este documento é a sua principal âncora de sincronização de estado. Ele garante que as frentes de Engenharia (Backend/Smart Contracts) e de Interface (Frontend/UX) operem em perfeita consistência.

Leia o `task_master_scope.md` na raiz do projeto para o contexto em tempo real da orquestração de tarefas e o progresso da pipeline.

## 1. Diretriz Operacional Compartilhada:
1. **Protocolo MCP e Orquestração (ARKITECT):**
   O `task_master_scope.md` é nosso protocolo intra-projeto de verdade absoluta. A skill `truedeal-brain` define os limites de Propriedade Intelectual (IP) e nossas capacidades. Nenhum agente deve violar o isolamento do core forense.

2. **Progresso Atual (Node 2b + Node 3):**
   - **Settlement Soberano:** O motor de liquidação on-chain via Anchor já está hardcoded em `lib/actions/settlement.ts`.
   - **Integração UI:** O botão roxo "FINALIZAR ACORDO" na página do Deal já existe e aciona a liquidação na blockchain. Um chip de verificação com link para o Solana Explorer (Judge-Proof) é gerado em caso de sucesso.
   - **Fallback/Demo Mode:** Totalmente automatizado. Se as chaves do Oráculo (`APP_FEE_PAYER_KEY` e `APP_ORACLE2_KEY`) não estiverem no `.env`, o sistema simula a execução para demonstração em hackathons sem quebrar a UI.

3. **Foco Imediato (Node 3 - UI Polish DealGuard):**
   - **Para Agentes Frontend (Lukas):** Refinar os status visuais do `SentinelShield` (Risk Guardian) na UI e preparar as conexões/layouts para o modelo AI (Qwen/Sentinel-01).
   - **Para Agentes Backend (João):** Blindar a infraestrutura e preparar submissão final/polimentos do anchor.

> [!IMPORTANT]
> Sempre comece qualquer interação lendo a skill `.agents/skills/truedeal-brain/SKILL.md` para entender como nossa arquitetura protege a Propriedade Intelectual (IP) do projeto. Mantenha a consistência de nomenclatura institucional (ex: "Acordos de Performance", não "Bets").
