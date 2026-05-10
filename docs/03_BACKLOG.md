# Technical Backlog - Phase 1 (Sovereign Sync)

This backlog merges the blocking tasks from the Founder (Lukas) with the Sovereign Architecture requirements from the CTO (João).

## 1. Infrastructure & Environment [URGENT]
- [ ] **Task INF-01**: Apply `003_wallets.sql` migration to Supabase.
- [ ] **Task INF-02**: Configure Vercel Env Vars (`WALLET_MASTER_KEY`, `APP_FEE_PAYER_KEY`, `SOLANA_RPC_URL`).
- [x] **Task INF-03**: Fee-payer SOL Airdrop (2+ SOL on Devnet).

## 2. Blockchain (Solana / Anchor) [CRITICAL]
- [x] **Task SC-01**: Initialize Anchor Project in `/contracts/solana`.
- [x] **Task SC-02**: Implement PDA Logic for Escrow:
    - `init_performance_agreement`: Create state account and guarantee vault.
    - `join_agreement`: Transfer SOL/USDC from managed wallet to the vault.
    - `cancel_agreement`: Refund participants if criteria are not met.
- [x] **Task SC-03**: Implement Performance Settlement:
    - `settle_performance_agreement`: Instruction requiring the proof hash from the **DEALGUARD Engine**.
- [x] **Task SC-04**: Royalty Distributor (3% platform fee / Slacker Tax implemented).

## 3. Orchestration and Intelligence (The "Arsenal")
- [x] **Task RG-01**: **Risk Guardian Core**: Integrity Audit Engine (Sentinel-01) implemented in its own repo.
- [x] **Task DG-01**: **DEALGUARD Engine**: BFT consensus logic and OpenClaw agnostic interface implemented (Powered by **Risk Guardian Core**).
- [/] **Task EV-01**: Snapshot System: Flow proof logic validated, pending integration with scheduled job.
- [x] **Task IP-01**: **Aethel Foundation**: DNA, Constitution, and Sovereign Thesis ratified and committed.

## 4. Frontend & UX Integration
- [x] **Task FE-01**: Managed Wallets Connection: Ensure frontend signs via server actions.
- [x] **Task FE-02**: Allocation Flow (Join): Real-time feedback for on-chain guarantee deposit.
- [ ] **Task FE-03**: Performance Attestations: Replace placeholders in `/result` with real data from **ValidationArtifact**.
- [x] **Task FE-04**: Creation Consolidation: Unified `/create` and `/deals/create` into a clean single route.

## 5. QA & Deployment
- [ ] **Task QA-01**: Fraud Simulation Test: Verify if the **Integrity Auditor** blocks anomalous signals.
- [ ] **Task QA-02**: Consensus Test: Verify if the **DEALGUARD Engine** demands quorum before escrow settlement.
- [x] **Task QA-03**: End-to-End Walkthrough on Devnet (GitHub Actions CI/CD Active).
