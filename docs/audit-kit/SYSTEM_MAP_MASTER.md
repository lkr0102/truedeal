# System Map Master — TrueDeal

> **Última atualização:** 2026-05-19 — Anchor program substituído por SPL transfers diretos; managed wallet; design system atualizado; estado de devnet atual.

---

## 1. Stack Tecnológica

| Camada | Tecnologia | Versão |
|:-------|:-----------|:-------|
| Frontend | Next.js (App Router) | 15 |
| Estilização | Tailwind CSS v4 + Shadcn/ui | — |
| Auth & Database | Supabase (PostgreSQL + Auth) | — |
| Blockchain | Solana (SPL Token direto) | Devnet |
| Wallet | Managed keypairs (AES-256 encrypted) | — |
| AI/Verificação | Risk Guardian (Sentinel AI) + DealGuard Engine | — |

> **Nota arquitetural (2026-05-19):** O Anchor Program (`HdMnEf5jc3q6tws2vYLZgFgwFWKkKpNaK5CRKnF3a7mp`) foi substituído por **transferências SPL diretas** entre managed wallets. O programa ainda existe no devnet mas não é chamado em produção.

---

## 2. Arquitetura de Wallet

Cada usuário possui um **managed wallet** — um keypair Solana gerado e gerenciado pelo protocolo:

```
┌─────────────────────────────────────────────┐
│                 Supabase DB                 │
│  user_wallets                               │
│  ├── user_id        → auth.users.id         │
│  ├── public_key     → Solana pubkey (base58)│
│  └── encrypted_secret → AES-256(secretKey)  │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│           Fee Payer (Oracle 1)              │
│  APP_FEE_PAYER_KEY (base64)                 │
│  ├── Paga taxas SOL de todas as TXs         │
│  ├── USDC_MINT_AUTHORITY_KEY → minta USDC   │
│  └── Armazena USDC da treasury              │
└─────────────────────────────────────────────┘
```

**Fluxo de depósito (Join Deal):**
`User USDC ATA → (SPL transfer) → Treasury/Protocol ATA`

**Fluxo de saque (Settle):**
`Treasury/Protocol ATA → (SPL transfer) → Winners' USDC ATAs`

---

## 3. Fluxos do Usuário

| # | Rota | Objetivo |
|:--|:-----|:---------|
| 1 | `/` (Dashboard) | Visualizar deals, ver saldo, filtrar por tipo |
| 2 | `/create` | Configurar regras de um novo deal |
| 3 | `/deal/[id]` | Acompanhar deal ativo, ver prova on-chain |
| 4 | `/wallet` | Gerenciar saldo USDC/SOL, ver stake em deals |
| 5 | `/explore` | Ranking, Shakes, check-in diário |
| 6 | `/profile` | Conectar redes sociais (X, Strava), editar perfil |
| 7 | `/onboarding` | Setup inicial — nome, avatar, wallet auto-criada |

---

## 4. Ciclo de Vida On-Chain

```
Usuário join deal
       │
       ▼
SPL Transfer: user USDC → protocol wallet
       │
       ▼
Deal ativado (00h GMT-3 auto-scheduler)
       │
       ▼
DealGuard Engine: verifica janelas de compliance
       │
       ├── Vencedores: SPL transfer de volta + reward
       └── Perdedores: 3% fee retido, resto distribuído
```

---

## 5. Motor Econômico (Slacker Tax)

```
slacker_pool     = (n_perdedores × entry_amount)
platform_fee     = slacker_pool × 0.03          ← 3% protocol fee
reward_per_winner = (slacker_pool − platform_fee) / n_vencedores
payout_winner     = entry_amount + reward_per_winner
```

---

## 6. Gamificação (Shakes)

| Evento | Shakes |
|:-------|:-------|
| Deal ativado (criador) | +500 |
| Deal ativado (participante) | +200 |
| Daily check-in | progressivo |
| Referral | bônus fixo |

---

## 7. Segurança e Infraestrutura

| Aspecto | Implementação |
|:--------|:--------------|
| Keypairs de usuário | AES-256 encrypted no Supabase |
| Fee payer key | `APP_FEE_PAYER_KEY` env var (JSON array format) |
| Mint authority | `USDC_MINT_AUTHORITY_KEY` env var (JSON array format) |
| USDC mint (devnet) | `BpXHCSnxhbzSjzWeaTHG14g1zETtcZeDGk772Nvwjb99` |
| USDC mint (mainnet) | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| RPC | `SOLANA_RPC_URL` env var (fallback: `clusterApiUrl("devnet")`) |
| OAuth X | `X_CLIENT_ID` + `X_CLIENT_SECRET` (PKCE, sem refresh token) |
| OAuth Strava | `STRAVA_CLIENT_ID` + `STRAVA_CLIENT_SECRET` |

---

## 8. Diagnóstico Rápido (Devnet)

```bash
# Verificar saldo do fee payer
solana balance <APP_FEE_PAYER_PUBKEY> --url devnet

# Verificar USDC mint authority
spl-token display BpXHCSnxhbzSjzWeaTHG14g1zETtcZeDGk772Nvwjb99 --url devnet

# Testar faucet localmente
node -e "require('./lib/solana/devnet-faucet').grantDevnetUSDC('<pubkey>').then(console.log)"
```
