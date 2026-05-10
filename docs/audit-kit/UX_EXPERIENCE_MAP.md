# 🎨 TrueDeal UX Experience Map

This document provides a comprehensive mapping of the **TrueDeal** user journey, detailing the visual language, psychological triggers, and technical flows that define the platform's "Sovereign Trust" experience.

> **Última atualização:** 2026-05-10 — Compliance Rules UI, ProfilePopover, countdown timer, correções de bugs.

---

## 🏛️ 1. Landing & Dashboard (The Hook)
**Route**: `/` (`app/home-client.tsx`)
**Goal**: Instant clarity and social proof.

### Visual Architecture
- **Personalized Header**: Greets the user and shows real-time stats (TDP Points).
- **Hero Banner**: High-impact, high-saturation cards for "Official Deals". Uses progress bars and count-down timers to create **FOMO** (Fear Of Missing Out).
- **Glassmorphism Feed**: Each deal card is a "Glass Card" with 48% transparency, 30px blur, and a 3.5px colored border representing its status.
- **Dynamic Filters**: Seamless switching between "Official", "Private", and "Public" deals using pill-shaped toggles.

### Psychological Triggers
- **Live Status Dots**: Pulsing green dots for active deals indicate a "living" system.
- **Financial summary**: Shows "Total at Stake" vs "Potential Win" to keep the user focused on the prize.
- **Live Countdown on Pending DealCards**: Cards com `status = "formacao"` exibem um contador regressivo até o horário de início (00:00 GMT-3). Atualização a cada 10 segundos via `setInterval`. Lógica implementada em `getStartTarget` e `formatCountdown` em `home-client.tsx`.
  - Cores progressivas: padrão → amarelo (< 24h) → vermelho + animação `pulse` (< 1h).
  - Exibe `HH:MM:SS` ou `Xd Xh` dependendo do horizonte.

### ProfilePopover (substituiu o settings balloon)
O ícone de configurações no header foi substituído por um `ProfilePopover` com:
- Link direto para `/profile`
- **Invite and Earn**: copy do referral com ícone de cópia + URL construída como `truedeal.app/invite/[userId]` (guarda contra `null`)
- **Language toggle**: PT ↔ EN persistido via `localStorage`
- **Dark Mode**: toggle animado (sol/lua) com transição suave

---

## 🛠️ 2. The Rule Engine (Creation Flow)
**Route**: `/create` (`app/create/page.tsx`)
**Goal**: Simple configuration of complex on-chain agreements.

### Step-by-Step UX
1. **Category Selection**: Visual icons (🏃 Fitness, 📣 Social) define the verification domain.
2. **Channel Integration**: Multi-select logic (e.g., Strava + Wellhub) using "AND/OR" connectors.
3. **Rule Specification**: Specific metrics (e.g., "Kms run", "Post published") linked to the chosen channel.
4. **Economic Design**: Preset amounts for quick entry + custom entry with minimum safety (R$10).
5. **Review Screen**: A high-fidelity preview of the Deal card as it will appear to others.

### Security UX
- **Transparency Notice**: Prominent display of the "3% Protocol Fee" (corrigido de 5% para 3%).
- **Rule Proofing**: Users can see exactly which channel will audit their performance.
- **VERIFICATION_SUBRULES Checklist**: Para cada `verification_type` selecionado, o formulário exibe as sub-regras aplicáveis como uma checklist com checkmarks visuais. Exemplo para `post_feito` (X): conta pública, +100 caracteres, conteúdo único no período.
- **Aviso de Janela Estrita**: Banner vermelho informando que o descumprimento em qualquer janela (semana/dia) resulta em eliminação permanente, independente do desempenho nas demais.
- **Banner de Início Automático GMT-3**: Na Tela 2 (Período), banner azul informando que o deal inicia automaticamente às `00h00 (Brasília, GMT-3)`. A linha "Período" exibe `"Início: [data] às 00h GMT-3"` explicitamente.
- **Pace UX (Strava)**: Campo renomeado para `"Pace máximo (min/km)"` com hint direcional `"← menor = mais rápido"`, esclarecendo que o valor é um teto, não um alvo mínimo.

---

## 📊 3. Live Accountability (Deal View)
**Route**: `/deal/[id]` (`app/deal/[id]/deal-client.tsx`)
**Goal**: Trust through transparency.

### Core Features
- **Visual Timeline**: A "Journey Map" showing Start, Today, and End dates.
- **Gamified Leaderboard**: Users are ranked by performance, with special badges for "Top 3" and "Winner".
- **Evidence Links**: Clickable links to "Social Connection" or "Strava Profile" allow participants to audit each other.
- **Proof of Stake**: Direct link to the Solana Explorer for the on-chain agreement hash.
- **RULE_SUBRULES Panel**: Card "Regras do Acordo" expandido com checklist de sub-regras por `verification_type`. Exibe cada critério de validade com ícone ✅/❌. Presente tanto na visão de detalhe do deal quanto na página de tracking.
- **Aviso de Janela Estrita**: Bloco de alerta vermelho fixo no topo do card de regras: `"Atenção: o descumprimento em qualquer janela resulta em eliminação permanente."` Garante que todos os participantes entendam a mecânica antes e durante o deal.

---

## 💰 4. Sovereign Finance (Wallet)
**Route**: `/wallet` (`app/wallet/wallet-client.tsx`)
**Goal**: Fearless asset management.

### Key Interactions
- **Privacy Mode**: "Eye" icon to toggle balance visibility.
- **Multi-Currency Support**: Real-time conversion between **SOL**, **USD**, and **BRL**.
- **Asset Split**: Clear distinction between "Available" balance and "Locked in Deals" (escrowed on-chain).
- **Address Management**: One-tap copy for the managed Solana address.

---

## 🏆 5. Retention & Social (Explore)
**Route**: `/explore` (`app/explore/explore-client.tsx`)
**Goal**: Continuous engagement through the "Shakes" economy.

### Mechanics
- **Shakes (🤝)**: Engagement points earned via Daily Check-ins, Streak bonuses, and Referrals.
- **Hall of Fame**: A visual podium (Silver, Gold, Bronze) celebrating the top performers.
- **Retention Loop**: 24h countdown for the next check-in and "Streak Repair" incentives.
- **Global Search**: Find and follow top players to see their deals.

---

## 📐 Design Tokens (Glassmorphism System)
- **Primary Gradient**: `#16A34A` (Green) to `#22C55E`.
- **Blur Density**: `40px` for overlays, `20px` for secondary cards.
- **Typography**: High-contrast black for headers, 600-700 weight for critical numeric values.
- **Interactive States**: Smooth `1.05x` scale on hover, `0.95x` on press.
