# MVP Scope - Solana Frontier Hackathon (TrueDeal)

This document defines the core features and boundaries for the TrueDeal MVP submission.

## 1. Core Target
- **Platform**: Web (Next.js 15) with Mobile-first UX / React Native (TBD).
- **Blockchain**: Solana (Devnet).
- **Target Audience**: Non-Web3 native users (Brazil focus).

## 2. Included Features

### 2.1 Performance Agreement Creation (Acordos)
- **Categories**: 
  - **Social**: X (Twitter) - followers, posts.
  - **Fitness**: Strava, Wellhub, TotalPass - km run, check-ins.
- **Rules**: Multi-channel selection with AND/OR connectors (Fitness).
- **Parameters**: Custom name, duration (presets or calendar), guarantee amount (BRL/USDC).
- **Yield Distribution**: Proportional, Ranking (Top 3), or Single Performance.

### 2.2 User Experience
- **Managed Wallets**: Automatic creation of Solana wallets linked to social login (Supabase Auth).
- **Onboarding**: Simple profile setup and interest survey.
- **Tracking Dashboard**: Real-time progress updates and status badges.
- **Atestações de Performance**: Visual proof of achievement and "Share to Stories" cards.

### 2.3 Verification & Safety (DEALGUARD)
- **Risk Guardian Core Integration**: Real-time monitoring for bot activity and signal anomalies.
- **DEALGUARD Engine**: Consensus-based resolution (Digital Jury) powered by Risk Guardian Core.
- **On-chain Escrow (Garantia)**: Automated fund locking and verified release via Anchor program.

## 3. Out of Scope (Post-Hackathon)
- Paid "Super Agreements" (beyond initial logic).
- Non-X social channels (Instagram, TikTok, YouTube).
- Advanced AI Oracle (conversational agreement creation).
- Native Mobile App (Phase 2).

## 4. Success Metrics for Demo
- **Time to Create**: < 30 seconds.
- **Fraud Rejection**: Demo of **Risk Guardian Core** blocking a spoofed signal.
- **Settlement Speed**: < 1 second on-chain payout.
