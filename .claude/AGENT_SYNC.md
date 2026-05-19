# TrueDeal — Technical Handover & Agent Sync

> **Última atualização:** 2026-05-19 — Arquitetura migrada para SPL direto; faucet corrigido; design system atualizado.

---

## 1. Estado Atual da Infraestrutura

| Aspecto | Valor atual |
|:--------|:------------|
| Blockchain | Solana Devnet |
| SPL Runtime | `@solana/spl-token` (sem Anchor) |
| USDC Mint (devnet) | `BpXHCSnxhbzSjzWeaTHG14g1zETtcZeDGk772Nvwjb99` |
| Fee Payer | `APP_FEE_PAYER_KEY` (JSON array no Vercel) |
| Mint Authority | `USDC_MINT_AUTHORITY_KEY` (JSON array no Vercel, mesma key que fee payer em devnet) |
| Oracle 2 | `ORACLE_2_PRIVATE_KEY` (JSON array ou base64) |
| RPC | `SOLANA_RPC_URL` env var (fallback: `clusterApiUrl("devnet")`) |
| Frontend | Vercel — `truedeal-lkr0102s-projects.vercel.app` |
| DB | Supabase PostgreSQL |
| Anchor Program | `HdMnEf5jc3q6tws2vYLZgFgwFWKkKpNaK5CRKnF3a7mp` — DEPRECATED, não em uso |

---

## 2. Componentes Principais

| Função | Arquivo |
|:-------|:--------|
| Smart Contract (SPL direto) | `lib/actions/deals.ts` — `joinDeal`, `createDeal` |
| Settlement Engine | `lib/actions/settlement.ts` — `settleDealProtocol` |
| Managed Wallets | `lib/actions/wallet.ts` + `lib/solana/keypair.ts` |
| Devnet Faucet | `lib/solana/devnet-faucet.ts` — `grantDevnetUSDC` |
| Fee Payer | `lib/solana/fee-payer.ts` — `getFeePayer`, `getConnection` |
| USDC Constants | `lib/solana/constants.ts` — `USDC_MINT`, `toUSDCUnits`, `formatUSDC` |
| DealGuard Engine | `lib/actions/dealguard.ts` |
| Auth / OAuth | `app/api/auth/[provider]/route.ts`, `app/api/auth/callback/[provider]/route.ts` |

---

## 3. Fluxo Financeiro (SPL Direto)

```
CRIAR DEAL:
  Server Action createDeal()
  → SPL transfer: creator USDC ATA → protocol USDC ATA
  → DB insert: deals + deal_participants (status: "active")

ENTRAR EM DEAL:
  Server Action joinDeal()
  → Decrypt user keypair do Supabase
  → SPL transfer: user USDC ATA → protocol USDC ATA
  → DB insert: deal_participants (status: "active")
  → DB update: tx_hash na tabela deal_participants

LIQUIDAR (DealGuard):
  settleDealProtocol(dealId)
  → Coleta winners do DB
  → SPL transfer: protocol ATA → winner ATAs (entry + reward)
  → 3% do slacker_pool fica na protocol wallet
  → DB update: deal status → "encerrado"
```

---

## 4. Keypair Format (IMPORTANTE)

Keypairs Solana são armazenados no Vercel como **JSON array** `[114,111,190,...]` (64 bytes).
O código em `lib/solana/fee-payer.ts` e `lib/solana/devnet-faucet.ts` aceita:
- JSON array: `if (raw.startsWith("[")) Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)))`
- Base64: `Keypair.fromSecretKey(new Uint8Array(Buffer.from(raw, "base64")))`

> **Por que JSON array?** A CLI do Vercel corrompe caracteres `+` e `/` da base64 (URL encoding). JSON array usa apenas dígitos e vírgulas — sem ambiguidade.

---

## 5. Design System

| Elemento | Valor |
|:---------|:------|
| Font principal | DM Sans |
| Font numérica/código | DM Mono |
| Tokens de cor | Tailwind v4 oklch — `globals.css` |
| Verde primário | `#16A34A` / `green-600` |
| Glassmorphism | ❌ Removido — não usar |
| Cards | `bg-card border border-border rounded-2xl` |

---

## 6. Comandos de Verificação

```bash
# Verificar saldo do fee payer no devnet
solana balance <FEE_PAYER_PUBKEY> --url devnet

# Verificar mint authority do USDC devnet
spl-token display BpXHCSnxhbzSjzWeaTHG14g1zETtcZeDGk772Nvwjb99 --url devnet

# Testar faucet localmente (com .env.local configurado)
node -e "
const { grantDevnetUSDC } = require('./lib/solana/devnet-faucet');
grantDevnetUSDC('SEU_PUBKEY').then(console.log).catch(console.error);
"

# Deploy para produção
npx vercel@latest --prod --archive=tgz

# Setar keypair no Vercel (JSON array — sem risco de corrupção)
python3 -c "
import base64, json
key = base64.b64decode(open('.env.local').read().split('APP_FEE_PAYER_KEY=')[1].split('\n')[0])
print(json.dumps(list(key)), end='')
" | npx vercel@latest env add APP_FEE_PAYER_KEY production
```

---

## 7. Regras para Agentes

1. **Nunca expor `secretKey` ao browser** — Server Actions apenas
2. **`USDC_MINT`** sempre de `lib/solana/constants.ts`
3. **Glassmorphism proibido** — usar tokens Tailwind v4
4. **Keypairs no Vercel = JSON array** — não base64 (risco de corrupção de `+`)
5. **`ensureUserWallet()`** é idempotente — seguro no login
6. **`maxDuration = 60`** em páginas que fazem chamadas Solana (evitar timeout Hobby plan)
7. **Anchor program é legacy** — não integrar sem aprovação explícita

---

## 8. Status dos Módulos OAuth

| Provider | Client ID | Callback URL | Status |
|:---------|:----------|:-------------|:-------|
| X (Twitter) | `IYKkci0cdqHinaNX1bXkwrbbe` | `/api/auth/callback/x` | ✅ Configurado |
| Strava | env: `STRAVA_CLIENT_ID` | `/api/auth/strava/callback` | ✅ Configurado |

> X usa PKCE (code_verifier via cookie `x_code_verifier`). Strava usa redirect URI derivado de `NEXT_PUBLIC_APP_URL`.
