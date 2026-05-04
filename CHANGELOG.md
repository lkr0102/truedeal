# Changelog

All notable changes to True Deal are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.4.0] - 2026-05-03 — Colosseum Frontier Hackathon Build

### Added
- Deal creation 2-step flow: category, channel, rule, goal, period, payment, visibility
- Social channels: X (Twitter) active; Instagram, TikTok, LinkedIn, Discord, YouTube coming soon
- Fitness channels: Strava, Wellhub, TotalPass active with multi-channel selection and E/OU connector
- Shared rule intersection logic for multi-channel fitness deals
- Distribution types: Proportional 🤝 · Ranking 🏅 · Winner Takes All 👑
- Deal types: Regular (5% fee) and Super (1% fee)
- Period presets (1w, 2w, 1m, 2m) + custom calendar picker
- Amount presets (R$25/50/100/200/500) + free input with real-time pot estimate
- Confirmation screen (screen 2) with slide-in animation and deal preview hero
- Deal Detail page: hero card, stats grid, participant tabs, timeline, pot distribution
- Deal Result & Share page: confetti animation, ranking, payout banner, share buttons (WhatsApp, Instagram, X, Telegram)
- Copy link functionality on result page
- Supabase Auth with social login (Google, Apple, X OAuth)
- Onboarding flow: profile setup + interests survey
- Explore page for deal discovery
- Wallet page
- `components/td-ui.tsx`: GlassCard, PrimaryBtn, GhostBtn, PillBtn, TDIcon, TDLockup, TDStatusBadge, TDPrizeBadge
- Full True Deal brand token system in `globals.css` (colors, glass FX, shadows, spacing, radii)
- `confettiFall` keyframe animation + `glass-card`, `hero-gradient`, `text-gradient` utilities

### Changed
- Blockchain target: Ethereum / Celo / Arbitrum → **Solana** (Anchor + Rust, PDA escrow)
- Payment layer: raw Pix → PIX → USDC onramp (SPL Token)
- Wallet support: MetaMask → Phantom / Backpack
- README fully rewritten: Solana stack, Colosseum Frontier context, accurate feature list

### Stack (current)
- Next.js 15, React 19, TypeScript, Tailwind CSS v4, Shadcn UI
- Supabase (Auth, Postgres, Server Actions, SSR)
- Solana · Anchor framework · Devnet (program deploy in progress)

---

## [0.3.0] - 2026-04 — UI Design System v1

### Added
- True Deal Design System: glass card base, brand tokens, button variants, typography scale
- Deal Detail page with hero gradient, tabbed sections, participant management
- Tracking dashboard
- Initial result and share pages

---

## [0.2.0] - 2026-03 — Supabase Integration

### Added
- Supabase project setup (Auth + Postgres + SSR)
- `createDeal` server action with full field mapping
- OAuth callback routes for social providers
- Database schema: deals, participants, verifications
- Login page with social auth flow

---

## [0.1.0] - 2024-04 — Project Scaffolding

### Added
- Next.js 14 project with App Router
- TypeScript, Tailwind CSS, Shadcn UI
- Initial page structure: home, login, create, configure, tracking, result
