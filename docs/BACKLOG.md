# Technical Backlog - Phase 1 (Sovereign Sync)

This backlog merges the blocking tasks from the Founder (Lukas) with the Sovereign Architecture requirements from the CTO (João).

## 1. Infrastructure & Environment [URGENT]
- [ ] **Task INF-01**: Apply `003_wallets.sql` migration to Supabase.
- [ ] **Task INF-02**: Configure Vercel Env Vars (`WALLET_MASTER_KEY`, `APP_FEE_PAYER_KEY`, `SOLANA_RPC_URL`).
- [ ] **Task INF-03**: Fee-payer SOL Airdrop (2+ SOL on Devnet).

## 2. Blockchain (Solana / Anchor) [CRITICAL]
- [ ] **Task SC-01**: Initialize Anchor Project in `/contracts/solana`.
- [ ] **Task SC-02**: Implement Escrow PDA Logic:
    - `init_deal`: Create state account and vault.
    - `join_deal`: Transfer SOL/USDC from managed wallet to vault.
    - `cancel_deal`: Refund participants if criteria aren't met.
- [ ] **Task SC-03**: Implement Verified Settlement:
    - `settle_deal`: Instruction that requires a **DealGuard Engine** proof hash to release funds.
- [ ] **Task SC-04**: Royalty Distributor (3% platform fee + 20% Symbeon treasury hook).

## 3. Orchestration & Intelligence (The "Arsenal")
- [ ] **Task RG-01**: **Risk Guardian Hook**: Integrate Sentinel-01 logic to pre-audit deals before escrow activation.
- [ ] **Task DG-01**: **DealGuard Engine Interface**: Edge Function to coordinate multi-agent consensus on X/Strava data.
- [ ] **Task EV-01**: Snapshot System: Automated recording of state at `start_date` and `end_date`.

## 4. Frontend & UX Integration
- [ ] **Task FE-01**: Managed Wallet Wiring: Ensure frontend signs via server actions using decrypted keys.
- [ ] **Task FE-02**: Join/Stake Flow: Real-time UI feedback for on-chain deposit.
- [ ] **Task FE-03**: Dynamic Results: Replace placeholders on `/result` with data from the **ValidationArtifact**.
- [ ] **Task FE-04**: Consolidate Creation: Merge `/create` and `/deals/create` into a single, clean route.

## 5. QA & Deployment
- [ ] **Task QA-01**: Simulated Fraud Test: Verify **Risk Guardian** blocks anomalous signals.
- [ ] **Task QA-02**: Consensus Test: Verify **DealGuard Engine** requires 2/3 agreement before payout.
- [ ] **Task QA-03**: Devnet End-to-End Walkthrough.
