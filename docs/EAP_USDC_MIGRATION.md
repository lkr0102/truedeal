# EAP — Migração para USDC como Moeda Base (TrueDeal)

> **Status:** ✅ CONCLUÍDO via caminho alternativo (2026-05-19).
> As Tasks B2–B6 (Anchor SPL Vault) foram **arquivadas**. A migração USDC foi completada via **SPL transfers diretos** entre managed wallets — abordagem mais simples e sem dependência de programa Anchor deployado.

---

## 1. DECISÃO FINAL

**Caminho escolhido:** SPL Token transfers diretos (não Anchor PDAs)

**Motivo:** O programa Anchor não estava deployado em um estado confiável no devnet (IDs dinâmicos via CI, keys não sincronizadas). A abordagem de managed wallets com SPL direto entrega o mesmo resultado financeiro com menos pontos de falha.

**O que foi preservado do EAP original:**
- ✅ USDC como moeda base (não SOL nativo)
- ✅ Taxa 3% do loser pool
- ✅ Multi-oracle consensus (via DealGuard off-chain)
- ✅ SHA-256 proof hash
- ✅ Managed wallets com keypairs encriptados

**O que foi abandonado:**
- ❌ Anchor PDAs como vault
- ❌ Tasks B2–B6 (Rust rewrite, IDL update, anchor-client.ts rewrite)
- ❌ Jupiter swap SOL→USDC (fora do escopo MVP)

---

## 2. ESTADO FINAL DAS TASKS

| Task | Status | Resolução |
|:-----|:-------|:----------|
| Task A — CI/CD Deploy | ✅ Concluído | Deploy automático via Vercel (não Anchor CI) |
| Task B1 — Constantes USDC | ✅ Concluído | `lib/solana/constants.ts` com USDC_MINT, decimals, helpers |
| Task B2 — Jupiter Swap | ❌ Arquivado | Fora do escopo MVP |
| Task B3 — Rust SPL Vault | ❌ Arquivado | Substituído por SPL direto |
| Task B4 — IDL Update | ❌ Arquivado | Sem Anchor em uso |
| Task B5 — anchor-client.ts | 🔄 Parcial | `joinAgreementUSDC` implementado via SPL direto |
| Task B6 — deals.ts + settlement.ts | ✅ Concluído | SPL transfers diretos funcionais |

---

## 3. ARQUITETURA ATUAL (SPL Direto)

### Endereços Canônicos

| Recurso | Valor |
|:--------|:------|
| USDC Mint (devnet) | `BpXHCSnxhbzSjzWeaTHG14g1zETtcZeDGk772Nvwjb99` |
| USDC Mint (mainnet) | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| Fee Payer / Oracle 1 | Derivado de `APP_FEE_PAYER_KEY` (JSON array no Vercel) |
| Mint Authority (devnet) | Derivado de `USDC_MINT_AUTHORITY_KEY` (JSON array no Vercel) |

### Fluxo Financeiro

```
JOIN DEAL:
  user_managed_wallet USDC ATA
    → (SPL transfer)
    → protocol/treasury USDC ATA

SETTLE (winners):
  protocol/treasury USDC ATA
    → (SPL transfer × n_winners)
    → winner managed wallets USDC ATAs

SETTLE (platform fee):
  3% do slacker_pool fica na protocol wallet (treasury)
```

---

## 4. ENV VARS NECESSÁRIAS (Vercel)

```
# Solana
APP_FEE_PAYER_KEY=<JSON array — 64 bytes>
USDC_MINT_AUTHORITY_KEY=<JSON array — 64 bytes>  ← mesma chave que APP_FEE_PAYER_KEY em devnet
ORACLE_2_PRIVATE_KEY=<JSON array ou base64 — 64 bytes>
SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# USDC (devnet usa o mint customizado do protocolo)
# mainnet: adicionar NEXT_PUBLIC_USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

---

## 5. PRÓXIMA ITERAÇÃO (v2 — pós-MVP)

Quando houver necessidade de trustless escrow sem custódia central:
1. Deploy de programa Anchor auditado
2. Vault PDA: `[b"vault", deal_id]`
3. Join: `SPL transfer → vault PDA`
4. Settle: `vault PDA → winners` via multi-sig oracle

*Documento original gerado em 2026-05-12. Arquivado e atualizado em 2026-05-19.*
