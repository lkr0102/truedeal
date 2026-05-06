# Technical Backlog - Phase 1 (Sovereign Sync)

This backlog merges the blocking tasks from the Founder (Lukas) with the Sovereign Architecture requirements from the CTO (João).

## 1. Infrastructure & Environment [URGENT]
- [ ] **Task INF-01**: Apply `003_wallets.sql` migration to Supabase.
- [ ] **Task INF-02**: Configure Vercel Env Vars (`WALLET_MASTER_KEY`, `APP_FEE_PAYER_KEY`, `SOLANA_RPC_URL`).
- [ ] **Task INF-03**: Fee-payer SOL Airdrop (2+ SOL on Devnet).

## 2. Blockchain (Solana / Anchor) [CRITICAL]
- [ ] **Task SC-01**: Inicializar Projeto Anchor em `/contracts/solana`.
- [ ] **Task SC-02**: Implementar Lógica de PDA para Escrow:
    - `init_performance_agreement`: Criar conta de estado e vault de garantia.
    - `join_agreement`: Transferir SOL/USDC da carteira gerenciada para o vault.
    - `cancel_agreement`: Reembolsar participantes caso critérios não sejam atingidos.
- [ ] **Task SC-03**: Implementar Liquidação de Performance:
    - `settle_performance_agreement`: Instrução que exige o proof hash do **DEALGUARD Engine**.
- [ ] **Task SC-04**: Distribuidor de Royalties (3% taxa plataforma + 20% Symbeon treasury).

## 3. Orquestração e Inteligência (The "Arsenal")
- [x] **Task RG-01**: **Risk Guardian Core**: Motor de Auditoria de Integridade (Sentinel-01) implementado em repo próprio.
- [x] **Task DG-01**: **DEALGUARD Engine**: Lógica de consenso BFT e interface agnóstica OpenClaw implementadas (Powered by **Risk Guardian Core**).
- [/] **Task EV-01**: Sistema de Snapshots: Lógica de prova de fluxo validada, pendente integração com job agendado.
- [x] **Task IP-01**: **Fundação Aethel**: DNA, Constituição e Tese de Soberania ratificadas e comitadas.

## 4. Frontend & Integração de UX
- [ ] **Task FE-01**: Conexão de Managed Wallets: Garantir que o frontend assine via server actions.
- [ ] **Task FE-02**: Fluxo de Alocação (Join): Feedback em tempo real para depósito on-chain de garantia.
- [ ] **Task FE-03**: Atestações de Performance: Substituir placeholders em `/result` por dados reais do **ValidationArtifact**.
- [ ] **Task FE-04**: Consolidação de Criação: Unificar `/create` e `/deals/create` em uma rota única e limpa.

## 5. QA & Deployment
- [ ] **Task QA-01**: Teste de Simulação de Fraude: Verificar se o **Auditor de Integridade** bloqueia sinais anômalos.
- [ ] **Task QA-02**: Teste de Consenso: Verificar se o **DEALGUARD Engine** exige quorum antes da liquidação de escrow.
- [ ] **Task QA-03**: Walkthrough End-to-End em Devnet (Nomenclatura Institucional).
