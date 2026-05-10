# MVP Scope — TrueDeal

This document defines the implemented features, boundaries, and roadmap for the TrueDeal MVP targeting the Solana ecosystem launch. The project is **production-ready for demo and early access**, with a consolidated institutional architecture.

---

## 1. Core Target

- **Platform**: Web (Next.js 15) with Mobile-first UX (Progressive Web App)
- **Blockchain**: Solana (Devnet)
- **Audience**: Productivity and performance-focused users (Initial focus: Brazil)
- **Framework**: Performance Agreements — stake-based accountability with automated verification

---

## 2. Implemented Features

### 2.1 Deal Creation & Configuration
- [x] Deal creation with title, category, verification channel, rule, frequency, period, stake amount
- [x] Start date validation: minimum D+1 from creation date (frontend-enforced)
- [x] Privacy types: `publico` (open) and `privado` (creator approval required)
- [x] Private deal: approval required for all participants, including share-link access
- [x] Single fee model: 3% flat fee on loser pool only (Slacker Tax)
- [x] Distribution: **Proportional** (only available for MVP)
- [x] Distribution options `top3` and `winner` displayed as "em breve" (non-selectable)

### 2.2 Participant Management
- [x] Creator auto-joins as first participant on deal creation
- [x] Join deal with pre-condition checks (status, capacity, social account linked)
- [x] Social account verification gate: participant must have linked and verified account on required channel
- [x] Duplicate entry prevention (unique constraint + user-facing error)
- [x] `start_snapshot` recording for baseline at deal activation

### 2.3 Automatic Lifecycle Management
- [x] Deal activates automatically at **00:00 GMT-3** on configured `start_date` — no admin action needed
- [x] Quorum check at activation: ≥ 2 participants → `ativo`; < 2 → `cancelado` + full stake refund
- [x] State machine: `formacao → ativo → liquidando → encerrado` / `cancelado`

### 2.4 Shakes (Reputation System)
- [x] Shakes credited **only when deal transitions to `ativo`** (not on creation or join)
- [x] Creator: **+500 Shakes** on deal activation
- [x] Each participant: **+200 Shakes** on deal activation
- [x] No Shakes credited for cancelled deals

### 2.5 Verification & DealGuard Engine
- [x] DealGuard Engine: structured audit pipeline with per-window compliance evaluation
- [x] Strava integration: `km_corridos`, `horas_exercicio`, `checkins`, `pace`
- [x] X (Twitter) integration: `post_feito` with sub-rules (public account, >100 chars, unique content)
- [x] Sentinel AI: fraud detection per participant per window (risk score + `isFraudulent`)
- [x] Forensic SHA-256 proof hash generated over audit results
- [x] Dual-oracle multi-sig settlement (`oracle_1` + `oracle_2`)
- [x] Demo Mode: full UX simulation without gas when oracle keys are absent

### 2.6 On-Chain Escrow (Solana / Anchor)
- [x] Program ID: `9zfQ1dwJ9Po7YCPWJ3S13ic3nxZcA9cEwBVsXdKub1c4`
- [x] Deterministic PDA vault: `[b"agreement", deal_id]`
- [x] `join_agreement`: exact stake amount enforced on-chain with participant tracking
- [x] `settle_performance_agreement`: **Full On-chain Settlement**
    - [x] Automatic Slacker Tax calculation (3% on loser pool)
    - [x] Multi-winner payout orchestration using Remaining Accounts
    - [x] Dual-oracle multi-sig attestation required for execution
- [x] Account Abstraction: managed wallets (AES-256-GCM) — no browser extension needed
- [x] Sovereign CI/CD: Automated build & deploy pipeline via GitHub Actions for Devnet

### 2.7 User Experience
- [x] Institutional onboarding with social account linking
- [x] Deal discovery (Explore), tracking (Tracking), deal detail pages
- [x] Privacy info bottom sheet (public vs. private deal model explained)
- [x] Deal result page with on-chain tx link
- [x] Profile page with Shakes balance and deal history

---

## 3. Compliance Rules (MVP)

All compliance evaluation follows the **strict frequency model**: every window must meet the minimum; one failure = loser status.

| Rule                  | Channel(s)                        | MVP |
|:----------------------|:----------------------------------|:----|
| `post_feito`          | X                                 | ✅  |
| `seguidores_recebidos`| X, Instagram, TikTok, LinkedIn, YouTube | ✅ (X only for MVP) |
| `impressoes`          | X, Instagram, TikTok, LinkedIn, YouTube | ✅ (X only for MVP) |
| `reposts_recebidos`   | X, Instagram, TikTok              | ✅ (X only for MVP) |
| `comentarios`         | X, Instagram, TikTok, LinkedIn, YouTube | ✅ (X only for MVP) |
| `km_corridos`         | Strava                            | ✅  |
| `horas_exercicio`     | Strava                            | ✅  |
| `checkins`            | Strava, Wellhub, TotalPass        | ✅  |
| `ambientes_diferentes`| Strava, Wellhub, TotalPass        | ✅  |
| `pace`                | Strava                            | ✅  |

> **Pending UI**: Pace field in deal creation needs a UX update to clearly communicate "maximum pace" (lower = faster) rather than a minimum target.

---

## 4. Out of Scope for MVP

| Feature                                          | Status        |
|:-------------------------------------------------|:--------------|
| Distribution: `top3`, `winner`                   | Em breve      |
| Channels: Instagram, TikTok, LinkedIn, Discord, YouTube | Em breve |
| Shakes utility: fee discounts, Sovereign tier    | Em breve      |
| Real on-chain settlement (Mainnet)               | Em breve      |
| Native app (iOS / Android)                       | Em breve      |
| DeFi Yield Escrow (Kamino / MarginFi)            | Roadmap       |
| Advanced AI oracle (natural language rules)      | Roadmap       |
| Dispute period / arbitration window              | Roadmap       |
| `refund_all()` on settlement timeout             | Roadmap       |

---

## 5. Success Metrics for Demo / Early Access

- [x] Deal creation to activation: < 30 seconds
- [x] Zero browser extension required for end-to-end flow
- [x] Full UX demo without on-chain gas (Demo Mode fallback)
- [x] Automatic deal start — no admin intervention
- [x] Compliance audit with fraud detection and proof hash
- [x] Due Diligence Ready: architecture and interface ready for partnerships and investors
