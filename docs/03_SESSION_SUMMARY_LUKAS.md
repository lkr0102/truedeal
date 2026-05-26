# 🏛️ Relatório de Consolidação: Sessões de Maio 2026

**Última atualização:** 26 de Maio de 2026  
**De:** João (TrueDeal Architecture)  
**Para:** Lukas (Frontend / Product Engineer)  
**Assunto:** Resumo de arquitetura atual — v0.2.0-devnet

---

## 1. Visão Geral
Após 10 dias de sprints intensos (16–26/mai), o TrueDeal passou de MVP de blockchain para produto funcional em produção. Este documento serve como mapa de orientação rápida para retomar o contexto.

## 2. Mudança Arquitetural Crítica (v0.2.0)

### ⛓️ Anchor Program → SPL Transfers Diretos (DEPRECATED)
- **O Anchor Program `HdMnEf...7mp` existe no Devnet mas NÃO é chamado em produção.**
- **Decisão tomada em 19/05:** O programa foi substituído por SPL token transfers diretos entre managed wallets, via `@solana/spl-token`.
- **Motivo:** IDs dinâmicos via CI tornavam a integração instável. SPL direto entrega o mesmo resultado com menos pontos de falha.
- **Referência completa:** `docs/EAP_USDC_MIGRATION.md`

### 💳 Arquitetura Atual (v0.2.0)
```
JOIN:   user USDC ATA → (SPL transfer) → protocol/treasury ATA
SETTLE: protocol/treasury ATA → (SPL transfer × n_winners) → winner ATAs
```
- **USDC Mint (devnet):** `BpXHCSnxhbzSjzWeaTHG14g1zETtcZeDGk772Nvwjb99`
- **Fee Payer Key:** `APP_FEE_PAYER_KEY` — formato **JSON array** (não base64)
- **Faucet:** 1000 USDC creditados automaticamente no cadastro

### 🔧 DealGuard Engine (5 Bugs Corrigidos — 22-25/mai)
O motor de liquidação estava quebrado. Os fixes principais:
1. `createClient()` → `createServiceClient()` no cron (RLS bloqueava tudo)
2. Refresh automático de tokens OAuth do X antes de expirar
3. Validação por janela de frequência (não total acumulado)

## 3. Estado dos Pendentes

| Item | Status |
|---|---|
| Strava end-to-end | ⏳ Bloqueado por limite de athlete |
| X OAuth test completo | ⏳ Pendente |
| i18n PT/EN | ⏳ Strings hardcoded ainda |
| Mainnet prep | 🔜 Pós-hackathon |
| Reintroduzir Anchor (v2) | 🔜 Pós-MVP, com auditoria |

---

**Ratificado por:**  
*TrueDeal Architecture Team* ⚖️🏛️
