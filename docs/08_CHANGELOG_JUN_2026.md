# TrueDeal — Changelog · Junho 2026

**Período coberto:** 01–03 de Junho de 2026  
**Responsável:** Lukas (Frontend / Product)  
**Branch:** `main` — todos os commits estão na produção (Vercel auto-deploy)

---

## Resumo Executivo

1. **Bug crítico — DealGuard não propagava erros de DB** — updates Supabase retornam `{ data, error }`, nunca lançam exceção; erros eram descartados silenciosamente → deal permanecia `ativo` para sempre
2. **Bug crítico — null crash em `auditDeal`** — acesso a `participant.profile.social_connections` sem optional chaining podia lançar TypeError se `profile` fosse null
3. **Bug de display — "Day 6 de 1"** — `daysGone` não era clamped ao `totalDays`, exibindo contador além do máximo em deals expirados
4. **Admin endpoint de reembolso** — rota `/api/admin/refund-deal` para reembolsar participantes via Solana USDC em deals cancelados
5. **Fix Strava OAuth** — após conectar Strava pelo perfil, callback voltava para `/onboarding/profile`; agora volta para `/profile`
6. **Deal cards legíveis** — canal de verificação exibido como pill com ícone + nome; Entrada e Pote com tipografia mais destacada
7. **X OAuth via popup** — fluxo abre em janela popup para preservar sessão TrueDeal; sucesso comunicado via `postMessage`; erros silenciosos eliminados
8. **Notificações de join para todos** — todos os participantes ativos recebem notificação a cada novo membro, não apenas nos milestones

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

## Arquivos Modificados — Sprint 02/06

| Arquivo | Mudança |
|---------|---------|
| `lib/actions/settlement.ts` | Error checking nos dois `update()` do pipeline de liquidação |
| `lib/integrations/polling-service.ts` | Optional chaining em `participant.profile` |
| `app/home-client.tsx` | Clamp de `daysGone` com `Math.min(goneDays, totalDays)` |
| `app/api/cron/settle-deals/route.ts` | Correção do comentário de schedule |
| `app/api/admin/refund-deal/route.ts` | **NOVO** — endpoint admin de reembolso USDC |

---

### `[03/06]` — Fix: Strava OAuth redireciona de volta ao `/profile`

**Commit:** `a2fa77d0`

#### Problema

Ao clicar "Conectar Strava" na página de perfil, após o usuário autorizar no Strava, o callback redirecionava para `/onboarding/profile` — a tela de onboarding — em vez de voltar ao perfil. O usuário tinha de navegar manualmente de volta ao `/profile` para ver a conexão ativa.

#### Causa raiz

`app/api/auth/strava/callback/route.ts` tinha o destino hardcoded como `/onboarding/profile`, sem nenhum mecanismo para customizar o retorno conforme o contexto de origem.

#### Solução

Padrão `?next` com cookie de curta duração — compatível com todos os caminhos de saída (sucesso, negação, erro de token):

**`app/api/auth/strava/route.ts`**
```typescript
// Lê ?next e guarda em cookie httpOnly (sameSite=lax, 5 min)
const nextPath = url.searchParams.get("next") ?? "/onboarding/profile"
res.cookies.set("strava_oauth_next", nextPath, { httpOnly: true, sameSite: "lax", maxAge: 300, path: "/" })
```

**`app/api/auth/strava/callback/route.ts`**
```typescript
// Lê o cookie para determinar destino; deleta em todos os caminhos de saída
const nextPath = request.cookies.get("strava_oauth_next")?.value ?? "/onboarding/profile"
const redirectBase = `${base}${nextPath}`
// ...sucesso:
const res = NextResponse.redirect(`${redirectBase}?social_connected=strava`)
res.cookies.delete("strava_oauth_next")
return res
```

**`app/profile/profile-client.tsx`**
```typescript
// OAuth iniciado com ?next=/profile
window.location.href = `${platform.oauthPath}?next=/profile`
// Mensagens de erro específicas adicionadas:
strava_denied: "Autorização negada. Aceite as permissões no Strava para conectar."
strava_token:  "Falha ao obter token do Strava. Tente conectar novamente."
```

#### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `app/api/auth/strava/route.ts` | Aceita `?next`, guarda cookie `strava_oauth_next` |
| `app/api/auth/strava/callback/route.ts` | Lê cookie e deleta em todos os exit paths |
| `app/profile/profile-client.tsx` | Passa `?next=/profile`, mensagens de erro Strava |

---

### `[03/06]` — Feature + Fix: Deal cards legíveis, X OAuth popup, notificações de join

**Commit:** `2bc80d96`

#### 1. Deal cards — canal de verificação legível

**Problema relatado por usuários:** Os ícones de canal de verificação eram círculos sobrepostos de 20 px no canto superior direito, sem nenhum texto. Era impossível distinguir os canais rapidamente.

**Antes:**
```
[● ● ●]  ← círculos de 20px sobrepostos, sem label
#SHORTID
```

**Depois:**
- Canal exibido como pill colorida abaixo da descrição da regra do deal
- Estrutura: `[ícone 20px] [Nome da plataforma]`
- Exemplos: `⚡ Strava` (laranja), `𝕏 Twitter` (preto), `▶ YouTube` (vermelho)
- Background e borda usam a cor da plataforma com opacidade reduzida (não glassmorphism)

```
FORMAÇÃO · Proporcional                           #SBMZVZ5U
correr 5k
1 × km corridos · Diário
[⚡ Strava]                    ← novo
Inicia em 4h 09m
─────────────────────────────────────────
Entrada $50 · Players 3 · Período 4/06–11/06 · Pote $150
```

**Valores de Entrada e Pote** passaram de `fontWeight: 600` / `fontSize: 11px` para `fontWeight: 800` / `fontSize: 13–14px` — mais destaque financeiro imediato sem alterar a estrutura do card.

**Mudanças em `app/home-client.tsx`:**
- `VERIF` expandido com campo `label` por plataforma
- Círculos sobrepostos removidos do header (topo direito)
- Bloco de pills adicionado entre description e countdown/progress
- Stats row: labels PT (`Entrada`, `Período`, `Pote`) + tamanhos aumentados

---

#### 2. X OAuth — fluxo via popup (bug crítico reportado por usuários)

**Problema reportado:**
> "Quando o X já é logado no navegador, ele pede pra fazer login no X como se eu tivesse deslogado. Depois de entrar, fico na tela do X normal, sem conexão concluída."

**Causa raiz:** `window.location.href` substituía a tab inteira pela URL do X OAuth. Quando o X não detectava a sessão ativa (ex: ITP do Safari, sessão X diferente do browser usado para acessar TrueDeal) e exibia a tela de login, após o login o X às vezes não encadeava corretamente de volta para a URL de autorização, deixando o usuário na timeline do X. Nesse caso:
- Cookie `oauth_state` podia ter expirado (TTL era 5 min)
- Sessão Supabase do TrueDeal eventualmente perdida durante a cadeia de redirects
- O `if (user) { upsert }` no callback era silenciosamente saltado sem nenhum erro visível

**Solução — três camadas:**

**Camada 1 — Popup window**

```typescript
// app/profile/profile-client.tsx — onOAuth handler
const popup = window.open(platform.oauthPath, "truedeal_oauth", "width=560,height=720,left=200,top=80")
if (!popup || popup.closed) {
  window.location.href = platform.oauthPath  // fallback se popup bloqueado
}
```

A sessão TrueDeal nunca é interrompida. Mesmo que o X mostre login e o usuário navegue dentro do X, a tab principal fica intacta.

**Camada 2 — `/oauth-success` (nova página)**

```
/oauth-success?provider=x          → sucesso
/oauth-success?provider=x&error=… → erro
```

Página client-side que age como bridge:
- Se `window.opener` existe (popup): envia `postMessage({ type: "OAUTH_SUCCESS", provider })` → fecha popup
- Se não existe (fallback redirect): redireciona para `/profile?social_success=x`

```typescript
// DashboardTab — listener de postMessage
useEffect(() => {
  function handleMessage(e: MessageEvent) {
    if (e.origin !== window.location.origin) return
    if (e.data?.type === "OAUTH_SUCCESS") refreshConnections()
  }
  window.addEventListener("message", handleMessage)
  return () => window.removeEventListener("message", handleMessage)
}, [])
```

Após fechar o popup, o perfil atualiza o estado das conexões sem reload.

**Camada 3 — Guards no callback**

```typescript
// app/api/auth/callback/[provider]/route.ts
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  console.error("[OAuth/x] No authenticated user found — session lost during redirect")
  return NextResponse.redirect(`${baseUrl}/oauth-success?provider=x&error=session_lost`)
}
```

`state_mismatch` e `oauth_exception` também encaminham via `/oauth-success?error=...` para que o popup receba feedback mesmo em caso de erro.

**Cookies OAuth hardened:**

| Propriedade | Antes | Depois |
|-------------|-------|--------|
| `maxAge` | 300 s (5 min) | 600 s (10 min) |
| `secure` | não definido | `true` em produção |

---

#### 3. Notificações de join — todos os participantes ativos

**Problema:** Ao entrar num deal, apenas o criador e o novo participante (confirmação) recebiam notificação. Os outros participantes activos só eram notificados em contagens específicas (milestones: 5, 10, 15, 20, 25, 50).

**Exemplo concreto:** Deal com 3 participantes (usuário A, B, C). D entra. A e B recebem zero notificação a não ser que o total chegue a 5.

**Antes (`lib/actions/deals.ts`):**
```typescript
const MILESTONES = [5, 10, 15, 20, 25, 50]
if (MILESTONES.includes(total)) {
  // notifica apenas em milestones
}
```

**Depois:**
```typescript
// Notifica TODOS os participantes activos (exceto joiner e creator) em CADA join
const { data: others } = await (svc.from("deal_participants") as any)
  .select("user_id")
  .eq("deal_id", dealId)
  .neq("user_id", user.id)         // exclui quem acabou de entrar
  .neq("user_id", deal.creator_id) // exclui creator (tem mensagem própria)
  .eq("status", "active")

for (const p of others ?? []) {
  await createNotification(svc, {
    user_id: p.user_id, type: "deal_joined", deal_id: dealId,
    title_pt: "Novo participante! 🎯", title_en: "New participant! 🎯",
    body_pt: `${joinerName} entrou no deal "${deal.title}". Agora são ${total} competindo por $${pot}.`,
    body_en: `${joinerName} joined deal "${deal.title}". Now ${total} people competing for $${pot}.`,
  })
}
```

---

## Arquivos Modificados — Sprint 03/06

| Arquivo | Mudança |
|---------|---------|
| `app/api/auth/strava/route.ts` | Aceita `?next`, cookie `strava_oauth_next` |
| `app/api/auth/strava/callback/route.ts` | Lê cookie de destino, deleta em todos os exits |
| `app/api/auth/[provider]/route.ts` | Cookies OAuth: maxAge 300→600s, `secure: true` em prod |
| `app/api/auth/callback/[provider]/route.ts` | Guard null-user, todos os erros X via `/oauth-success` |
| `app/oauth-success/page.tsx` | **NOVO** — bridge popup↔main via postMessage |
| `app/home-client.tsx` | Pills de canal verificação, tipografia Entry/Pot |
| `app/profile/profile-client.tsx` | Popup OAuth, listener postMessage, refresh sem reload |
| `lib/actions/deals.ts` | Notificação de join para todos os participantes ativos |

---

### `[05/06]` — Fix crítico: DealGuard não rastreava corretamente quem cumpriu a regra

**Commits desta sessão** — motivo: deal expirou, não fechou automaticamente e participantes que postaram foram marcados como `eliminated`.

**Diagnóstico completo:** o pipeline de auditoria falhou em **três camadas independentes**, cada uma capaz de gerar resultado incorreto sozinha.

---

#### Bug 1 — `x.ts`: Env var errada bloqueava refresh de token X (CRÍTICO)

**Problema:** O token OAuth 2.0 do X expira após 2 horas. `refreshXToken()` lia `process.env.TWITTER_CLIENT_ID` e `TWITTER_CLIENT_SECRET` — variáveis que não existem no projeto (o padrão é `X_CLIENT_ID` / `X_CLIENT_SECRET`). O refresh sempre retornava `null` silenciosamente. Após expirar o token, a X API retornava 401 → `fetchXUserPosts()` capturava o erro e retornava `[]` → `validateXRule([], ...)` retornava `false` → **todos os participantes com canal X eram marcados `eliminated` independente de terem postado**.

**Mudança em `lib/integrations/x.ts`:**
```typescript
// era (quebrado):
Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`)

// agora (correto):
Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`)
```

---

#### Bug 2 — Pipeline inteiro: janelas de tempo em UTC excluíam posts feitos no horário BRT (CRÍTICO com UTC-3)

**Problema:** O fuso padrão da plataforma é UTC-3 (BRT). Os posts feitos entre **21:00 e 23:59:59 BRT** de qualquer dia de deal correspondem ao dia seguinte em UTC (`T00:00Z` → `T02:59:59Z`). O código anterior usava `end_date + "T23:59:59.999Z"` como janela de fim, cortando exatamente esses posts — nunca eram buscados da API do X nem validados.

O mesmo problema afetava o Strava (epoch unix) e o totalpass (query ISO no Supabase).

**Padrão UTC-3 adotado em todo o pipeline:**
- Início de dia: `dateStr + "T03:00:00Z"` (= 00:00 BRT)
- Fim de dia: `(endDate+1) + "T02:59:59.999Z"` (= 23:59:59.999 BRT)

**Mudanças em `lib/integrations/polling-service.ts`:**
```typescript
// Strava — epoch unix
const afterEpoch = deal.start_date
  ? Math.floor(new Date(deal.start_date + "T03:00:00Z").getTime() / 1000)
  : undefined
let beforeEpoch: number | undefined
if (deal.end_date) {
  const dt = new Date(deal.end_date + "T02:59:59Z")
  dt.setUTCDate(dt.getUTCDate() + 1)   // 23:59:59 BRT = 02:59:59Z do dia seguinte
  beforeEpoch = Math.floor(dt.getTime() / 1000)
}

// X — ISO 8601
const startTime = deal.start_date
  ? new Date(deal.start_date + "T03:00:00Z").toISOString()
  : undefined
let endTime: string | undefined
if (deal.end_date) {
  const endDt = new Date(deal.end_date + "T02:59:59.999Z")
  endDt.setUTCDate(endDt.getUTCDate() + 1)
  endTime = endDt.toISOString()
}
```

**Mudanças em `lib/integrations/x.ts` — `validateXRule`:**

Substituído `p.created_at?.startsWith(day)` (compara string de data UTC) por comparação de timestamp:
```typescript
const DAY_MS = 24 * 60 * 60 * 1000

function dayWindowBRT(dateStr: string): [number, number] {
  const start = new Date(dateStr + "T03:00:00Z").getTime()
  return [start, start + DAY_MS - 1]
}

// frequency === "daily":
const [wStart, wEnd] = dayWindowBRT(day)
const dayPosts = posts.filter(p => {
  if (!p.created_at) return false
  const t = new Date(p.created_at).getTime()
  return t >= wStart && t <= wEnd
})

// frequency === "weekly":
const windowStart = new Date(wStart + "T03:00:00Z").getTime()
const endDt = new Date(wEnd + "T02:59:59.999Z")
endDt.setUTCDate(endDt.getUTCDate() + 1)
const windowEnd = endDt.getTime()
```

**Mudanças em `lib/integrations/strava.ts` — `validateStravaRule`:**

Mesma lógica — `dayWindowBRT()` + comparação de timestamp substituindo `a.start_date.startsWith(day)`.

**Mudanças em `lib/integrations/polling-service.ts` — bloco `totalpass`:**

Query Supabase e filtros inline também convertidos para janelas UTC-3.

---

#### Bug 3 — `settlement.ts`: update de status dos participantes sem error handling (MODERADO)

**Problema:** O loop que marca participantes como `winner` / `eliminated` não verificava o retorno do Supabase. Se o update falhasse (ex: RLS, enum inválido), o deal aparecia como `encerrado` mas participantes ficavam em `active` para sempre, com potencial de inconsistência no pote.

**Mudança em `lib/actions/settlement.ts`:**
```typescript
for (const result of audit.results) {
  const { error: participantErr } = await supabase
    .from("deal_participants")
    .update({ status: result.is_success ? "winner" : "eliminated" })
    .eq("deal_id", dealId)
    .eq("user_id", result.user_id)
  if (participantErr) {
    console.error(`[DealGuard] Failed to update participant ${result.user_id}:`, participantErr.message)
  }
}
```

---

#### Feature — Endpoint admin de liquidação manual (Fix Bug 2: cron como único mecanismo)

**Novo arquivo:** `app/api/admin/settle-deal/[id]/route.ts`

**Problema:** O único mecanismo de fechamento era o Vercel Cron (12:00 UTC diário). Se falhasse por qualquer razão (CRON_SECRET ausente no dashboard, preview branch, cold start), nenhum deal era encerrado — sem alerta, sem fallback.

Rota `POST /api/admin/settle-deal/{deal_id}` protegida por `CRON_SECRET`, chama `settleDealProtocol()` diretamente:

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const result = await settleDealProtocol(params.id)
  return NextResponse.json({ ok: true, ...result })
}
```

**Uso para deals presos:**
```bash
curl -X POST https://<dominio>/api/admin/settle-deal/<deal_id> \
  -H "Authorization: Bearer <CRON_SECRET>"
```

---

#### Estrutural — `fetchXUserPostsSafe`: distingue erro de API de "usuário não postou"

**Problema:** `fetchXUserPosts()` retornava `[]` em qualquer falha — indistinguível de "usuário não fez nenhum post". Erros de infra (401, 429, timeout) eliminavam participantes injustamente.

**Novo export em `lib/integrations/x.ts`:**
```typescript
export async function fetchXUserPostsSafe(
  accessToken: string, userId: string, options: XFetchOptions = {},
): Promise<{ data: XPost[]; error: string | null }> { ... }
```

`fetchXUserPosts()` mantido como wrapper de compatibilidade. No `polling-service.ts`, erros de fetch são logados e propagados como campo `api_error` no resultado da auditoria. Padrão replicável para Strava e canais futuros.

---

## Arquivos Modificados — Sprint 05/06

| Arquivo | Mudança |
|---------|---------|
| `lib/integrations/x.ts` | Bug 1: `TWITTER_CLIENT_ID` → `X_CLIENT_ID`; `validateXRule` UTC-3; `fetchXUserPostsSafe` |
| `lib/integrations/strava.ts` | `validateStravaRule` UTC-3 com `dayWindowBRT()` |
| `lib/integrations/polling-service.ts` | Janelas de fetch UTC-3 (Strava epoch + X ISO); totalpass UTC-3; `api_error` tracking |
| `lib/actions/settlement.ts` | Error handling no loop de update de `deal_participants` |
| `app/api/admin/settle-deal/[id]/route.ts` | **NOVO** — trigger manual de settlement protegido por `CRON_SECRET` |
