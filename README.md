# True Deal — Honor your word. Get paid for it.

![True Deal Hero Banner](docs/assets/truedeal_hero_banner.png)

<div align="center">
  <img src="public/brand/app-icon-logo.png" width="80" height="80" alt="True Deal Logo" />
  <p><strong>"Don't trust. Make a Deal."</strong></p>
</div>

Most goals die in group chats. You promise to run, study, or work out, and weeks later, no one remembers. **True Deal** is the accountability layer the world was missing. 

Define your rules, stake your commitment, and let our automated oracles verify your progress via Strava, X (Twitter), and more. Built on **Solana**, the protocol ensures that at the end of the deal, the pot goes to those who truly delivered. No excuses, just proof.

---

## 🚀 Key Features

- **Sovereign Escrow**: Funds are locked in a deterministic Program Derived Address (PDA) on Solana. No middleman, just the code.
- **Automated Verification**: Integration with real-world oracles (Strava, Apple Health, X) to verify goal completion.
- **Slacker Tax**: A flat **3% protocol fee** on losers ensures the ecosystem remains sustainable while rewarding those with discipline.
- **Institutional-Grade UI**: A "Shakes" social interface that hides the complexity of Web3 under a premium, user-friendly experience.

## 🛠 Tech Stack

- **Blockchain**: Solana (Anchor Framework, Rust)
- **Frontend**: Next.js 15, TailwindCSS, Lucide Icons
- **Backend/Auth**: Supabase (PostgreSQL, Auth, Storage)
- **State Management**: React Context + Solana Wallet Adapter

## 📂 Documentation

- [Project Architecture](docs/01_ARCHITECTURE.md)
- [MVP Scope](docs/02_MVP_SCOPE.md)
- [Smart Contract Audit](docs/strategy/1_SMART_CONTRACT_AUDIT.md)
- [Technical Proof of Work (Devnet)](docs/10_TECHNICAL_PROOF_OF_WORK.md)
- [On-Chain Rules Engine](docs/strategy/3_ONCHAIN_RULES_ENGINE.md)

## ⚡ Quick Start

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
```

### 3. Run Locally
```bash
npm run dev
```

---

Built with ⚡ by the **TrueDeal Team** for the Solana Global Hackathon.
