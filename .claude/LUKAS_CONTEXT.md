# Lukas Context & Synch (TrueDeal)

Lukas, este documento garante o sincronismo entre a engenharia do nosso agente e o seu frontend no Claude. 
Leia o `task_master_super_scope.md` na raiz do projeto para o contexto em tempo real e orquestração.

## O Que Você Precisa Saber Agora (Node 2b + Node 3):

1. **Protocolo MCP e Orquestração (ARKITECT):**
   Implementamos o `task_master_super_scope.md` como protocolo intra-projeto e atualizamos a skill `truedeal-brain` com as capacidades do ARKITECT (nosso orquestrador de tarefas baseado em DAG). O agente de IA e o seu Claude devem seguir o `task_master_super_scope.md` estritamente.

2. **Settlement e Botão "Finalizar Acordo" (deal-client.tsx):**
   - O settlement Soberano foi "hardcoded" em `lib/actions/settlement.ts`.
   - Incluímos o botão roxo "FINALIZAR ACORDO" na página do Deal (visível só para o creator quando status='ativo').
   - Após finalizar, um chip roxo com link direto para o Solana Explorer é exibido na UI.
   - O fallback "Demo Mode" está automatizado se as chaves do Oráculo faltarem. (Documentamos as env vars `APP_FEE_PAYER_KEY` e `APP_ORACLE2_KEY` no `.env.example`).

3. **Próximo Passo (Node 3 - UI Polish DealGuard):**
   - O backend e os ganchos on-chain estão prontos e blindados.
   - Agora é com você: O foco deve ir para refinar os status do `SentinelShield` (Risk Guardian) na UI e preparar as integrações de tela para o modelo Qwen (Sentinel-01).

Sempre comece lendo as skills do `.agents/skills/truedeal-brain/SKILL.md` para entender como nossa arquitetura não vaza Propriedade Intelectual (IP).
