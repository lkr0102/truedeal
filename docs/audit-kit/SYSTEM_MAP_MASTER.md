# System Map Master — TrueDeal

> **Última atualização:** 2026-05-26 — Migração de infraestrutura de rede para Mantle Network (L2 EVM); transações ERC-20; managed wallets EVM; preparação para Hackathon Mantle.

---

## 1. Stack Tecnológica

| Camada | Tecnologia | Versão |
| :------- | :----------- | :------- |
| Frontend | Next.js (App Router) | 15 |
| Estilização | Vanilla CSS + Tailwind v4 + Shadcn/ui | — |
| Auth & Database | Supabase (PostgreSQL + Auth) | — |
| Blockchain | Mantle Network (EVM L2) | Testnet / Mainnet |
| Web3 Integrations | Wagmi + RainbowKit + Viem | — |
| Wallet | Managed EVM Wallets (AES-256 encrypted) | — |
| AI/Verificação | Oráculo Privado de IA + API de Atestação | — |

> **Nota arquitetural (2026-05-26):** A infraestrutura blockchain foi migrada para a rede **Mantle L2**. As operações financeiras de stake (join) e payout (settle) acontecem via **transferências ERC-20 (USDC/MNT)** gerenciadas pelo backend através de carteiras EVM.

---

## 2. Arquitetura de Wallet

Cada usuário possui uma **managed wallet** EVM gerada programaticamente no servidor:

```text
┌─────────────────────────────────────────────┐
│                 Supabase DB                 │
│  user_wallets                               │
│  ├── user_id        → auth.users.id         │
│  ├── public_key     → EVM Address (0x...)   │
│  └── encrypted_secret → AES-256(privateKey)  │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│           Treasury / Protocol Wallet        │
│  APP_FEE_PAYER_KEY (Mantle Gas & Treasury)  │
│  ├── Paga taxas MNT de transações de oráculo│
│  ├── ERC20_USDC_MINT → USDC na Mantle       │
│  └── Armazena tokens ERC-20 da treasury     │
└─────────────────────────────────────────────┘
⚠️  Formato obrigatório do secretKey: String hexadecimal do privateKey do EVM.
```

**Fluxo de depósito (Join Deal):**
`User ERC-20 Account → (ERC-20 transfer) → Treasury/Protocol Account`

**Fluxo de saque (Settle):**
`Treasury/Protocol Account → (ERC-20 transfer) → Winners' Accounts`

---

## 3. Fluxos do Usuário

| # | Rota | Objetivo |
| :-- | :----- | :--------- |
| 1 | `/` (Dashboard) | Visualizar deals, ver saldo, filtrar por tipo |
| 2 | `/create` | Configurar regras de um novo deal |
| 3 | `/deal/[id]` | Acompanhar deal ativo, ver prova on-chain |
| 4 | `/wallet` | Gerenciar saldo MNT/USDC, ver stake em deals |
| 5 | `/explore` | Ranking, Shakes, check-in diário |
| 6 | `/profile` | Conectar redes sociais (X, Strava), editar perfil |
| 7 | `/onboarding` | Setup inicial — nome, avatar, wallet EVM auto-criada |

---

## 4. Ciclo de Vida On-Chain

```text
Usuário join deal
       │
       ▼
ERC-20 Transfer: user USDC → protocol wallet
       │
       ▼
Deal ativado (00h GMT-3 auto-scheduler)
       │
       ▼
Oráculo de IA: verifica janelas de compliance
       │
       ├── Vencedores: ERC-20 transfer de volta + reward
       └── Perdedores: 3% fee retido, resto distribuído
```

---

## 5. Motor Econômico (Slacker Tax)

```text
slacker_pool     = (n_perdedores × entry_amount)
platform_fee     = slacker_pool × 0.03          ← 3% protocol fee
reward_per_winner = (slacker_pool − platform_fee) / n_vencedores
payout_winner     = entry_amount + reward_per_winner
```

---

## 6. Gamificação (Shakes)

| Evento | Shakes |
| :------- | :------- |
| Deal ativado (criador) | +500 |
| Deal ativado (participante) | +200 |
| Daily check-in | progressivo |
| Referral | bônus fixo |

---

## 7. Segurança e Infraestrutura

| Aspecto | Implementação |
| :-------- | :-------------- |
| Private keys de usuário | AES-256 encrypted no Supabase |
| Fee payer key | `APP_FEE_PAYER_KEY` (Hexadecimal private key da carteira EVM do protocolo) |
| USDC Token (Mantle Testnet) | Endereço do contrato ERC-20 USDC na Mantle |
| RPC | `MANTLE_RPC_URL` (Mantle Testnet / Mainnet) |
| OAuth X | `X_CLIENT_ID` + `X_CLIENT_SECRET` (PKCE com suporte a refresh token) |
| OAuth Strava | `STRAVA_CLIENT_ID` + `STRAVA_CLIENT_SECRET` |

---

## 8. Diagnóstico Rápido (Mantle Testnet)

```bash
# Verificar saldo MNT do fee payer usando cast (Foundry)
cast balance <APP_FEE_PAYER_ADDRESS> --rpc-url https://rpc.testnet.mantle.xyz

# Verificar saldo de ERC-20 USDC
cast call <USDC_CONTRACT_ADDRESS> "balanceOf(address)(uint256)" <USER_ADDRESS> --rpc-url https://rpc.testnet.mantle.xyz

# Testar chamada do oráculo localmente
node -e "require('./lib/mantle/oracle-bridge').verifyVerdict('<deal_id>').then(console.log)"
```
