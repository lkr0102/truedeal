# TrueDeal — Honor your word. Get paid for it.


<div align="center">
  <img src="public/brand/app-icon-logo.png" width="80" height="80" alt="True Deal Logo" />
  <p><strong>"Don't trust. Make a Deal."</strong></p>
</div>

Most goals die in group chats. You promise to run, study, or work out — and weeks later, no one remembers. **TrueDeal** is the accountability layer the world was missing.

Define your rules, stake your commitment, and let our automated oracles verify your progress via Strava, X (Twitter), and more. Built on **Solana**, the protocol ensures that at the end of the deal, the pot goes exclusively to those who truly delivered. No excuses — just cryptographic proof.

---

## How it Works

1. **Create a Deal** — Set the rule (e.g., "5 posts/week for 1 month"), the stake amount, the start date, and the verification channel.
2. **Participants join** — Anyone can join a public deal before it starts. Private deals require creator approval.
3. **Automatic start** — At 00:00 GMT-3 on the configured start date, the deal activates automatically. If fewer than 2 participants are confirmed, the deal is cancelled and stakes are returned.
4. **DealGuard verifies** — At the end of the period, the DealGuard Engine audits every participant's real-world data across all configured frequency windows.
5. **Slacker Tax settles** — Winners get their stake back plus a share of the losers' pool. TrueDeal takes a 3% fee — only on the losers.

---

## Key Features

- **Sovereign Escrow** — Funds are locked in a deterministic Program Derived Address (PDA) on Solana. No middleman, just code.
- **Strict Compliance Rules** — Participants must meet the exact rule in every frequency window. One missed window = loser, regardless of other periods.
- **Automated Verification** — Real-world oracles (Strava, X/Twitter) verify goal completion. Sub-rules ensure authenticity: public accounts, unique content, minimum character counts, fraud detection via Sentinel AI.
- **Slacker Tax** — A 3% protocol fee on the loser pool. Winners are never charged.
- **Auto-Scheduler** — Deals start automatically at 00:00 GMT-3 on the configured date. No admin action required.
- **Shakes** — TrueDeal's reputation system. Earn Shakes when your deal activates (500 for creators, 200 for participants). Future utility: fee discounts, Sovereign tier.
- **Account Abstraction** — Users get a managed Solana wallet on signup. No browser extension needed.

---

## Tech Stack

| Layer          | Technology                                      |
|:---------------|:------------------------------------------------|
| Blockchain     | Solana · Anchor Framework (Rust)                |
| Frontend       | Next.js 15 · TailwindCSS · Lucide Icons         |
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

## Compliance Rules (Summary)

A participant is a **winner** only if they meet the configured rule in **every frequency window** throughout the entire deal period. Failing any single window results in loser status, regardless of other periods.

| Rule                  | Logic                                                                       |
|:----------------------|:----------------------------------------------------------------------------|
| Posts (X)             | Must be public, >100 chars, unique content within deal period               |
| Followers received    | Net gain per window ≥ configured minimum (also: impressions, reposts, comments) |
| KM run (Strava)       | Sum of `Run` activities per window ≥ configured minimum                     |
| Pace (Strava)         | Average pace per window ≤ configured maximum (lower = faster)               |
| Exercise hours        | Total activity time per window ≥ configured minimum                         |
| Check-ins             | Number of gym/space check-ins per window ≥ configured minimum               |

---

## Economic Model

```
loser_pool       = entry_amount × num_losers
platform_fee     = loser_pool × 0.03
distributable    = loser_pool − platform_fee + winners' stakes
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
