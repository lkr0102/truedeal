# MVP Scope - Solana Frontier Hackathon

This document defines the core features and boundaries for the TrueDeal MVP submission.

## 1. Core Target
- **Platform**: Web (Next.js 15) with Mobile-first UX / React Native (TBD).
- **Blockchain**: Solana (Devnet).
- **Target Audience**: Non-Web3 native users (Brazil focus).

## 2. Included Features

### 2.1 Deal Creation
- **Categories**: 
  - **Social**: X (Twitter) - followers, posts.
  - **Fitness**: Strava, Wellhub, TotalPass - km run, check-ins.
- **Rules**: Multi-channel selection with AND/OR connectors (Fitness).
- **Parameters**: Custom name, duration (presets or calendar), stake amount (BRL/USDC).
- **Prize Distribution**: Proportional, Ranking (Top 3), or Winner Takes All.

### 2.2 User Experience
- **Managed Wallets**: Automatic creation of Solana wallets linked to social login (Supabase Auth).
- **Onboarding**: Simple profile setup and interest survey.
- **Tracking Dashboard**: Real-time progress updates and status badges.
- **Results & Sharing**: Confetti animations and "Share to Stories" cards.

### 2.3 Verification & Safety
- **Risk Guardian Integration**: Real-time monitoring for bot activity and signal anomalies.
- **DealGuard Engine**: Consensus-based resolution with 2/3 validator quorum.
- **On-chain Escrow**: Automated fund locking and verified release via Anchor program.

## 3. Out of Scope (Post-Hackathon)
- Paid "Super Deals" (beyond initial logic).
- Non-X social channels (Instagram, TikTok, YouTube).
- Advanced AI Oracle (conversational deal creation).
- Native Mobile App (Phase 2).

## 4. Success Metrics for Demo
- **Time to Create**: < 30 seconds.
- **Fraud Rejection**: Demo of Risk Guardian blocking a spoofed signal.
- **Settlement Speed**: < 1 second on-chain payout.
