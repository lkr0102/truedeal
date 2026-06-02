# TrueDeal — Changelog · Junho 2026

**Período coberto:** 01–02 de Junho de 2026  
**Responsável:** Lukas (Frontend / Product)  
**Branch:** `main` — todos os commits estão na produção (Vercel auto-deploy)

---

## Resumo Executivo

Sprint de correção de bugs críticos no motor de liquidação (DealGuard Engine), identificados após deal "FAZER UM POST NO X" (27/05–28/05) não ser liquidado automaticamente pelo cron após expirar.

1. **Bug crítico — DealGuard não propagava erros de DB** — updates Supabase retornam `{ data, error }`, nunca lançam exceção; erros eram descartados silenciosamente → deal permanecia `ativo` para sempre
2. **Bug crítico — null crash em `auditDeal`** — acesso a `participant.profile.social_connections` sem optional chaining podia lançar TypeError se `profile` fosse null
3. **Bug de display — "Day 6 de 1"** — `daysGone` não era clamped ao `totalDays`, exibindo contador além do máximo em deals expirados
4. **Admin endpoint de reembolso** — rota `/api/admin/refund-deal` para reembolsar participantes via Solana USDC em deals cancelados

---

## Detalhamento por Commit

---

### `[02/06]` — Fix: DealGuard settlement engine + admin refund endpoint

#### Bug 1 — `settlement.ts`: Erros Supabase descartados silenciosamente (CRÍTICO)

**Problema:** O cliente Supabase nunca lança exceção — retorna sempre `{ data, error }`. Os dois `.update()` do pipeline de liquidação não verificavam o retorno. Qualquer falha de DB (coluna inexistente, enum inválido, RLS) era descartada silenciosamente. O deal permanecia `ativo` para sempre, mas o cron reportava "settled" com sucesso falso.

**Mudanças em `lib/actions/settlement.ts`:**

Step 3 (pré-settlement) — era:
```typescript
await (supabase.from("deals") as any)
  .update({ status: "liquidando", proof_hash: proofHashHex, audit_logs: audit.results })
  .eq("id", dealId)
```

Step 3 — agora:
```typescript
const { error: preUpdateErr } = await (supabase.from("deals") as any)
  .update({ status: "liquidando", proof_hash: proofHashHex, audit_logs: audit.results })
  .eq("id", dealId)
if (preUpdateErr) throw new Error(`[DealGuard] Pre-settlement DB update failed: ${preUpdateErr.message}`)
```

Step 5 (pós-settlement) — mesma correção:
```typescript
const { error: postUpdateErr } = await (supabase.from("deals") as any)
  .update({ status: "encerrado", solana_tx_signature: txSignature })
  .eq("id", dealId)
if (postUpdateErr) throw new Error(`[DealGuard] Post-settlement DB update failed: ${postUpdateErr.message}`)
```

Agora qualquer falha de DB é propagada ao `try-catch` do cron e logada corretamente nos Vercel logs.

---

#### Bug 2 — `polling-service.ts`: null crash em `auditDeal`

**Problema:** `participant.profile.social_connections` podia causar TypeError se `profile` fosse null (ex: participante sem perfil completo).

**Mudança em `lib/integrations/polling-service.ts`:**
```typescript
// era:
const connections = participant.profile.social_connections || []
// agora:
const connections = participant.profile?.social_connections || []
```

---

#### Bug 3 — `home-client.tsx`: "Day 6 de 1" em deals expirados

**Problema:** `daysGone` não era clamped ao `totalDays`. Para um deal de 1 dia expirado há 5 dias, exibia "Day 6 de 1".

**Mudança em `app/home-client.tsx`:**
```typescript
// era:
progress: Math.min(1, goneDays / totalDays), daysGone: goneDays, daysTotal: totalDays,
// agora:
progress: Math.min(1, goneDays / totalDays), daysGone: Math.min(goneDays, totalDays), daysTotal: totalDays,
```

---

#### Fix — `settle-deals/route.ts`: comentário de schedule incorreto

**Mudança em `app/api/cron/settle-deals/route.ts`:**
```typescript
// era: "Vercel Cron calls this route every hour"
// agora: "Vercel Cron calls this route daily at 12:00 UTC"
```

---

#### Feature — Admin endpoint de reembolso USDC

**Novo arquivo:** `app/api/admin/refund-deal/route.ts`

Rota `POST /api/admin/refund-deal` protegida por `CRON_SECRET` (mesma auth do cron).

**Fluxo:**
1. Lê `entry_amount` do deal
2. Busca pubkeys de todos os participantes em `user_wallets`
3. Chama `refundUsdcDirect(feePayer, pubkeys, stakeAmountMicro)` — transfere USDC da conta custodial de volta para cada ATA
4. Loga tx signatures em `audit_logs` do deal

**Uso:**
```bash
curl -X POST https://<dominio>/api/admin/refund-deal \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"deal_id":"<uuid>"}'
```

---

#### Resolução manual — Deal stuck `2054b3ed`

Deal "FAZER UM POST NO X NAS PRÓXIMAS 24H" (27/05–28/05, 2 participantes, $400 pote) permaneceu `ativo` por 5+ dias após expirar devido ao Bug 1.

**Causa raiz adicional:** Ambos os participantes tinham tokens X OAuth expirados antes do início do deal (mai/19 e mai/21), sem refresh token. X API retornava 401 → verificação falhava silenciosamente → participantes seriam marcados como `eliminated`. Settlement não chegava a falhar por isso, mas o bug de DB o bloqueava.

**Resolução:**
- Deal marcado manualmente como `encerrado` via Supabase admin com motivo em `audit_logs`
- Notificações enviadas aos dois participantes (`matheussousa2274`, `lkr3640`) sobre cancelamento e reembolso pendente
- Reembolso Solana de $200 cada executado via `/api/admin/refund-deal` após deploy

---

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `lib/actions/settlement.ts` | Error checking nos dois `update()` do pipeline de liquidação |
| `lib/integrations/polling-service.ts` | Optional chaining em `participant.profile` |
| `app/home-client.tsx` | Clamp de `daysGone` com `Math.min(goneDays, totalDays)` |
| `app/api/cron/settle-deals/route.ts` | Correção do comentário de schedule |
| `app/api/admin/refund-deal/route.ts` | **NOVO** — endpoint admin de reembolso USDC |
| `DOCS/08_CHANGELOG_JUN_2026.md` | **NOVO** — este arquivo |
