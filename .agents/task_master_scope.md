# MCP INTRA-PROJECT PROTOCOL: TrueDeal Super-Scope

**Protocol Version:** 2.0.0 — 2026-05-19
**Target Agents:** Claude Code, Cursor, Windsurf, TaskMesh Orchestrators

> **[SYS_INSTRUCTION]** Qualquer agente ou dev lendo este documento DEVE aderir à arquitetura atual. Não reverter decisões marcadas como FINAL sem consentimento explícito de Lukas.

---

## <project_dna>

**Identidade:** Sovereign Performance Agreement Protocol (TrueDeal)
**Tese:** "Don't trust. Make a True Deal." Transformamos "I will" em "I did" via execução verificável.
**Legal:** Protocolo de Execução de Acordos Informais de Performance/Habilidade — NÃO é uma plataforma de apostas.

**Componentes IP Symbeon Labs:**
- **Risk Guardian AI:** Anti-fraude (Qwen 3B) — detecta anomalias em provas reais
- **DealGuard Engine:** Conselho de sentença digital (consenso multi-sig + prova SHA-256)
- **Managed Wallet Layer:** Keypairs encriptados (AES-256) por usuário, sem custódia de chaves pelo front
- **SPL Sovereign Payout:** Transferências SPL diretas entre managed wallets (sem Anchor)

</project_dna>

---

## <architecture_decisions>

### FINAL: SPL Token Direto (não Anchor PDAs)
**Decisão:** O Anchor Program foi substituído por SPL transfers diretos entre managed wallets.
**Motivo:** Menor complexidade, sem dependência de programa deployado, mesmo resultado financeiro.
**Agente Rule:** *NUNCA reconstruir o fluxo via Anchor sem aprovação explícita. O SPL direto é o padrão atual.*

### FINAL: Managed Wallets
**Decisão:** Cada usuário tem um keypair gerado server-side, encrypted (AES-256), armazenado no Supabase.
**Agente Rule:** *Nunca expor secretKey ao browser. Toda operação on-chain é feita server-side via Server Actions.*

### FINAL: USDC como moeda base
**Decisão:** Entry amounts são em USDC (não SOL nativo, não BRL).
**Devnet mint:** `BpXHCSnxhbzSjzWeaTHG14g1zETtcZeDGk772Nvwjb99`
**Agente Rule:** *Usar `USDC_MINT` de `lib/solana/constants.ts`. Não hardcodar endereço de mint.*

### FINAL: Design System sem glassmorphism
**Decisão:** UI usa DM Sans + DM Mono, cards com `bg-card border border-border`, sem `backdrop-filter: blur`.
**Agente Rule:** *Não adicionar glassmorphism, efeitos de blur, ou `bg-white/40`. Usar tokens do Tailwind v4.*

### FINAL: ENV VARS como JSON array
**Decisão:** Chaves Solana (APP_FEE_PAYER_KEY, USDC_MINT_AUTHORITY_KEY, ORACLE_2_PRIVATE_KEY) devem ser armazenadas como JSON array `[1,2,3,...]` no Vercel para evitar corrupção de caracteres `+` e `/` da base64 na CLI.
**Agente Rule:** *Sempre usar JSON array ao setar keypairs via CLI. O código aceita ambos os formatos.*

</architecture_decisions>

---

## <current_state>

### Infraestrutura (2026-05-19)
| Componente | Status |
|:-----------|:-------|
| Frontend Vercel | ✅ Prod — truedeal-lkr0102s-projects.vercel.app |
| Supabase | ✅ Prod |
| USDC SPL Transfers (join/settle) | ✅ Funcional |
| Devnet Faucet (1000 USDC) | 🔄 Deploy em validação |
| "Em deals" tracking | ✅ Corrigido (status "active", não "staked") |
| X OAuth | ✅ Configurado |
| Strava OAuth | ✅ Configurado |
| Anchor Program | ⚠️ Deprecated (existe no devnet, não em uso) |

</current_state>

---

## <execution_nodes>

### Node 1 — Verificação Devnet ✅ DONE
Managed wallets criadas, USDC creditado automaticamente no signup.

### Node 2 — Blockchain Integration ✅ DONE
SPL transfers diretos via `joinAgreementUSDC` e `withdrawFromEscrow`.
`settleDealProtocol` retorna `{ txSignature, explorerUrl }`.

### Node 2b — Frontend Settlement Hook ✅ DONE
DealGuard auto-settlement via `lib/actions/settlement.ts`. Prova on-chain linkada no deal view.

### Node 2c — Infrastructure Maintenance ✅ DONE
Fee payer com saldo SOL adequado no devnet. `USDC_MINT_AUTHORITY_KEY` separado do fee payer.

### Node 3 — UI Polish ✅ DONE
Risk Guardian chip, DealGuard status por participante. Design system DM Sans + DM Mono.

### Node 4 — OAuth Integrations ✅ DONE
X OAuth 2.0 PKCE + Strava OAuth configurados. Callback URLs registrados.

### Node 5 — Internacionalização (i18n) ⏳ PENDENTE
Implementar dicionário centralizado `lib/i18n.ts`. Default PT-BR, toggle PT/EN no ProfilePopover.
Trocar strings hardcoded por `t('key')`.

### Node 6 — Validação End-to-End ⏳ PENDENTE
Testar fluxo completo: criar deal → join → DealGuard → settle → verificar Explorer.
Testar X e Strava OAuth com contas reais.

### Node 7 — Mainnet Prep ⏳ FUTURO
- Trocar USDC mint para `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- Auditoria de segurança dos Server Actions e managed wallet layer
- Rate limiting no faucet (mainnet não tem faucet)

</execution_nodes>

---

## <agent_rules>

1. **Nunca rodar `cargo update` ou `cargo vendor`** sem re-aplicar os scripts de patch do `vendor/`
2. **Nunca expor `secretKey` ao browser** — toda operação on-chain é server-side
3. **Nunca usar glassmorphism** — usar tokens do Tailwind v4
4. **Sempre usar JSON array** para keypairs no Vercel CLI
5. **Verificar `NEXT_PUBLIC_SOLANA_NETWORK`** antes de qualquer operação on-chain — devnet vs mainnet
6. **`USDC_MINT`** vem de `lib/solana/constants.ts` — não hardcodar
7. **`ensureUserWallet()`** é idempotente — seguro chamar a cada login

</agent_rules>
