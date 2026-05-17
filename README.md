# TrueDeal — Set your goals. Honor your word. Get paid for it.

<div align="center">
  <img src="public/brand/app-icon-logo.png" width="80" height="80" alt="True Deal Logo" />
  <p><strong>"Set your goals. Honor your word. Get paid for it."</strong></p>
  <p>
    <a href="https://truedeal.vercel.app">
      <img src="https://img.shields.io/badge/Demo-Vercel-black?style=for-the-badge&logo=vercel" alt="TrueDeal Demo" />
    </a>
  </p>
</div>

---

**TrueDeal is a goal-staking protocol that gamifies personal achievement by adding real financial consequences to the commitments people already make — but never keep.**

Users set a measurable rule, stake USDC alongside friends, and let TrueDeal handle everything else. Verification runs automatically through native API integrations — Strava, X (Twitter), and fitness networks like Wellhub and TotalPass. When the deadline hits, **DealGuard** — our proprietary dual-oracle consensus engine backed by Sentinel AI — validates every result before triggering instant settlement on Solana.

Winners recover their stake plus a share of the losers' pool. A **3% Slacker Tax** applies only to those who didn't deliver.

No middlemen. No disputes. Just proof.

---

## Why We Built This

Most people don't fail their goals because they lack motivation. They fail because there are no real stakes. No reward for showing up. No consequence for quitting. Just intention, which costs nothing to break.

Prediction markets proved something useful: when people put real money on a belief, they become more committed and more honest with themselves. The same logic applies to any personal goal. We built TrueDeal to be that missing stimulus.

The timing is right because Solana makes everything easier: fast settlement, a growing user base, and one of the most consistent builder ecosystems in crypto. Features like Blinks bring TrueDeal directly into X, turning a social post into a live, joinable deal. Together with account abstraction, this brings the experience to Web2 users with zero friction. Consumer apps on Solana are still underbuilt. TrueDeal is here for everyone else.

---

## Who It's For

TrueDeal targets anyone with a goal and a digital trail to prove it.

- **Athletes** — run more, train harder, and get rewarded for consistency
- **Content creators** — stake your posting schedule and earn from those who drop off
- **Fitness communities** — gym check-ins, workout hours, and multi-venue challenges
- **Crypto projects & brands** — run custom engagement deals, measuring real on-chain user activity and rewarding it automatically

Any commitment with a verifiable proof can become a True Deal.

---

## Market Validation

Moonwalk Fitness is the clearest proof of concept. They built a gamified fitness platform on the same core premise — that social and financial incentives drive goal completion — and have attracted a meaningful user base. That validation tells us the behavior is real.

But Moonwalk is limited to fitness and works exclusively with step counting. Their verification is a single metric on a single category. TrueDeal is built for any goal that leaves an auditable digital trail: fitness, content creation, language learning, gaming, on-chain activity. The same mechanism, applied to every dimension of personal development. The demand exists. The existing solution is too narrow. That is the gap we are filling.

---

## How It Works

1. **Create a Deal** — Set the rule (e.g., "5 posts/week for 1 month"), the stake amount, the start date, and the verification channel.
2. **Participants join** — Anyone can join a public deal before it starts. Private deals require creator approval.
3. **Automatic start** — At 00:00 GMT-3 on the configured start date, the deal activates automatically. If fewer than 2 participants are confirmed, the deal is cancelled and stakes are returned.
4. **DealGuard verifies** — At the end of the period, the DealGuard Engine audits every participant's real-world data across all configured frequency windows.
5. **Slacker Tax settles** — Winners get their stake back plus a share of the losers' pool. TrueDeal takes a 3% fee — only on the losers.

---

## Key Features

- **Sovereign Escrow** — Funds are locked in a deterministic Program Derived Address (PDA) on Solana. No middleman, just code.
- **Strict Compliance Rules** — Participants must meet the exact rule in every frequency window. One missed window = loser, regardless of other periods.
- **Automated Verification** — Real-world oracles (Strava, X/Twitter, Wellhub, TotalPass) verify goal completion. Sub-rules ensure authenticity: public accounts, unique content, minimum character counts, fraud detection via Sentinel AI.
- **Slacker Tax** — A 3% protocol fee on the loser pool. Winners are never charged.
- **Auto-Scheduler** — Deals start automatically at 00:00 GMT-3 on the configured date. No admin action required.
- **Shakes** — TrueDeal's reputation system. Earn Shakes when your deal activates (500 for creators, 200 for participants). Future utility: fee discounts, Sovereign tier.
- **Account Abstraction** — Users get a managed Solana wallet on signup. No browser extension needed.

---

## Tech Stack

| Layer          | Technology                                      |
|:---------------|:------------------------------------------------|
| Blockchain     | Solana · Anchor Framework (Rust)                |
| Frontend       | Next.js 16 · TailwindCSS · Lucide Icons         |
| Backend / Auth | Supabase (PostgreSQL · Auth · Storage)          |
| Verification   | Strava API · X API · Sentinel AI (DealGuard)    |
| Wallet         | Account Abstraction (AES-256-GCM managed keys)  |

---

## Deal State Machine

```
formacao → ativo → liquidando → encerrado
        ↘ cancelado  (< 2 participants at start time)
```

| State        | Description                                                  |
|:-------------|:-------------------------------------------------------------|
| `formacao`   | Deal created; participants can join until start time         |
| `ativo`      | Running; no new entries; compliance tracking active          |
| `cancelado`  | Cancelled by scheduler due to insufficient participants      |
| `liquidando` | DealGuard Engine auditing and generating cryptographic proof |
| `encerrado`  | On-chain settlement complete; funds distributed              |

---

## Compliance Rules

A participant is a **winner** only if they meet the configured rule in **every frequency window** throughout the entire deal period. Failing any single window results in loser status, regardless of other periods.

| Rule                  | Logic                                                                               |
|:----------------------|:------------------------------------------------------------------------------------|
| Posts (X)             | Must be public, >100 chars, unique content within deal period                       |
| Impressions (X)       | Total impressions on posts within the window ≥ configured minimum                   |
| Followers received    | Net gain per window ≥ configured minimum                                            |
| KM run (Strava)       | Sum of `Run` activities per window ≥ configured minimum                             |
| Pace (Strava)         | Average pace per window ≤ configured maximum (lower = faster)                       |
| Exercise hours        | Total activity time per window ≥ configured minimum                                 |
| Check-ins             | Number of gym/space check-ins per window ≥ configured minimum                       |

---

## Economic Model

```
loser_pool        = entry_amount × num_losers
platform_fee      = loser_pool × 0.03
distributable     = loser_pool − platform_fee + winners' stakes
return_per_winner = distributable ÷ num_winners
```

Winners always recover their original stake plus a proportional share of the loser pool. The platform only profits from those who break their commitment.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env.local` based on `.env.example`:
```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
APP_ENCRYPTION_KEY=your-32-byte-hex-key
# Optional: enables real on-chain settlement
APP_FEE_PAYER_KEY=base64-oracle1-private-key
APP_ORACLE2_KEY=base64-oracle2-private-key
```

> Without oracle keys, the app runs in **Demo Mode** — all UX flows work, settlement is simulated without gas.

### 3. Run Locally
```bash
npm run dev
```

---

## Documentation

| Document | Description |
|:---------|:------------|
| [REGRAS_FLUXO_COMPLETO.md](docs/REGRAS_FLUXO_COMPLETO.md) | Complete business rules, state machine, compliance sub-rules, economic model |
| [01_ARCHITECTURE.md](docs/01_ARCHITECTURE.md) | System architecture and component breakdown |
| [02_MVP_SCOPE.md](docs/02_MVP_SCOPE.md) | MVP scope, implemented features, and roadmap |
| [Economic Model & Fees](docs/strategy/4_ECONOMIC_MODEL_AND_FEES.md) | Slacker Tax deep-dive and alternative fee models |
| [On-Chain Rules Engine](docs/strategy/3_ONCHAIN_RULES_ENGINE.md) | Solana smart contract rules and security model |
| [Smart Contract Audit](docs/strategy/1_SMART_CONTRACT_AUDIT.md) | On-chain architecture status and test paths |

---

Built with ⚡ by the **TrueDeal Team**.
