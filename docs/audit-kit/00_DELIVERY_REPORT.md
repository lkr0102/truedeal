# Delivery Report — TrueDeal

**Versão:** v0.2.0-devnet
**Data:** 2026-05-19
**Protocolo:** Sovereign Settlement — SPL Token direto (pós-migração Anchor)

---

## 1. Executive Summary

TrueDeal está estabilizado e operacional no devnet Solana. A arquitetura evoluiu de Anchor PDAs para **SPL token transfers diretos** entre managed wallets — uma abordagem mais simples, sem dependência de programa Anchor deployado. O DealGuard Engine, o sistema de managed wallets e o faucet de devnet estão funcionais.

---

## 2. Estado Atual da Infraestrutura

| Componente | Status | Observação |
|:-----------|:-------|:-----------|
| Frontend (Next.js 15) | ✅ Produção | Vercel — `truedeal-lkr0102s-projects.vercel.app` |
| Supabase (DB + Auth) | ✅ Produção | PostgreSQL + Row Level Security |
| Managed Wallets | ✅ Funcional | AES-256 encrypted keypairs |
| USDC SPL Transfers | ✅ Funcional | Depósito e saque via `@solana/spl-token` |
| Devnet Faucet (1000 USDC) | ✅ Funcional | `mintTo` via `USDC_MINT_AUTHORITY_KEY` (JSON array) |
| DealGuard Engine | ✅ Funcional | Auditoria + proof hash SHA-256 |
| Strava OAuth | ✅ Configurado | Domínio registrado no portal Strava |
| X OAuth | ✅ Configurado | `X_CLIENT_ID` + `X_CLIENT_SECRET` no Vercel |
| Anchor Program | ⚠️ Deprecated | Existe no devnet, não chamado em produção |

---

## 3. Mudanças Arquiteturais desde v0.1.0

### v0.2.0 (2026-05-19)
- **[BREAK]** Anchor program substituído por SPL transfers diretos
- **[FIX]** Faucet: `USDC_MINT_AUTHORITY_KEY` separado de `APP_FEE_PAYER_KEY`; formato JSON array para evitar corrupção de `+` na CLI
- **[FIX]** Filtro "Em deals": status `"active"` reconhecido (estava usando `"staked"` que não existia no DB)
- **[FEAT]** X OAuth 2.0 PKCE configurado
- **[FIX]** Strava OAuth: redirect URI via `NEXT_PUBLIC_APP_URL`
- **[FIX]** `maxDuration = 60` na wallet page (timeout Vercel Hobby)
- **[FIX]** Erro de faucet exibido no UI (antes era mensagem genérica)

### v0.1.0-alpha.1 (2026-05-16)
- Deploy inicial do Anchor program no devnet
- Frontend estabilizado com DealGuard Engine
- Design system migrado para DM Sans + DM Mono

---

## 4. Entregáveis Confirmados

- [x] **Frontend**: Deploy contínuo no Vercel com CI automático
- [x] **Managed Wallets**: Criação, criptografia e leitura de keypairs
- [x] **USDC Flow**: Depósito (join) + saque (settle) via SPL direto
- [x] **Devnet Faucet**: 1000 USDC via mintTo para novos usuários
- [x] **DealGuard Engine**: Auditoria + proof hash SHA-256
- [x] **Audit Kit**: Documentação de state machines, system maps, UX flows
- [x] **OAuth**: X (Twitter) + Strava integrados

---

## 5. Endereços de Referência

| Recurso | Valor |
|:--------|:------|
| USDC Mint (devnet) | `BpXHCSnxhbzSjzWeaTHG14g1zETtcZeDGk772Nvwjb99` |
| USDC Mint (mainnet) | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| Anchor Program (legacy) | `HdMnEf5jc3q6tws2vYLZgFgwFWKkKpNaK5CRKnF3a7mp` |
| Vercel | `truedeal-lkr0102s-projects.vercel.app` |

---

## 6. Próximos Passos (Roadmap)

| Prioridade | Item | Dependência |
|:-----------|:-----|:------------|
| P0 | Testar faucet após fix `USDC_MINT_AUTHORITY_KEY` JSON format | Deploy atual |
| P0 | Verificar "Em deals" mostra valor correto | Deploy atual |
| P1 | Verificar X OAuth end-to-end | X Developer Portal configurado |
| P1 | Verificar Strava OAuth end-to-end | Domínio registrado |
| P2 | Internacionalização (i18n PT/EN) | — |
| P2 | Migração para mainnet (Circle USDC) | Auditoria de segurança |
| P3 | Reintroduzir Anchor escrow (v2) | Programa auditado |

---

*TrueDeal Protocol — Sovereign Engineering. Code is Law.*
