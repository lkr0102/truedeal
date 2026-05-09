# MVP Scope - Solana Frontier Hackathon (TrueDeal)

This document defines the core functionalities and boundaries of the TrueDeal MVP for the Solana Frontier hackathon. The project is currently **Due Diligence Ready**, with a consolidated institutional framework.

## 1. Core Target
- **Platform**: Web (Next.js) with Mobile-first UX (Progressive Web App).
- **Blockchain**: Solana (Devnet).
- **Audience**: Users focused on productivity and performance (Initial focus: Brazil).
- **Nomenclature**: **Performance Agreements** framework.

## 2. Implemented Features (In-Scope)

### 2.1 Performance Agreement Creation
- [x] **Audit Channels (Mocked/Demo)**: X (Twitter) simulated for Demo approval.
- [ ] **Real Channel Integration**: Strava, Wellhub, TotalPass via real OAuth.
- [x] **Rules Matrix**: Use `11_CONTRACT_RULES_TEMPLATE.md` to map UX rules into on-chain sovereign logic.
- [ ] **Rules Implementation (Lukas -> João)**: Lukas designs the social rules via template; João encodes them into the Solana Anchor program.
- [x] **Parameters**: Institutional title, defined period, guarantee value (BRL/USDC).
- [x] **Settlement**: Proportional Distribution, Ranking (Top 3), or Single Beneficiary.

### 2.2 User Experience (Sovereign UX)
- [x] **Managed Custody**: Automatic creation of Solana wallets linked to login (Supabase Auth) using AES-256-GCM.
- [x] **Sovereign Demo Auth Layer**: Automatic fallback and login bypass for the Hackathon (Judge-Proof).
- [x] **Institutional Onboarding**: Profile and audit criteria configuration.
- [x] **Audit Dashboard**: Real-time tracking of term validity and compliance status.
- [x] **Performance Cards**: Visual audit proofs and integration with settlement button.

### 2.3 Verification & Security (DealGuard Engine)
- [x] **DealGuard Engine**: Structured consensus engine (Oracle 1 and Oracle 2 multisig).
- [x] **On-chain Escrow (Guarantee)**: Smart contract (Anchor) that locks funds (`init_performance_agreement` and `join_agreement`).
- [x] **Sovereign Settlement**: "Finalize Agreement" button triggering `settle_performance_agreement` on-chain (Demo Fallback activated if keys are missing).
- [ ] **Sentinel-01 Integration (Node 3)**: Real connection with the Qwen model for behavioral audit of real data.

## 3. Next Phases (Post-Hackathon)
- [ ] Super Paid Agreements (Fee optimization).
- [ ] Additional Social Channels (Instagram, TikTok, YouTube).
- [ ] Advanced AI Oracle for natural language agreement creation.
- [ ] Native Application (iOS/Android).

## 4. Success Metrics for Demo
- [x] **Establishment Time**: < 30 seconds to create an agreement.
- [x] **Audit Efficiency**: On-chain validation and settlement with guaranteed fallback for the judging panel.
- [x] **Due Diligence Ready**: Interface and architecture ready for institutional partnerships and investors.
