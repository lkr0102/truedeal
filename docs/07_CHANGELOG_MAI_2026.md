# TrueDeal — Changelog · Maio 2026

**Período coberto:** 16–25 de Maio de 2026  
**Responsável:** Lukas (Frontend / Product)  
**Branch:** `main` — todos os commits estão na produção (Vercel auto-deploy)

---

## Resumo Executivo

Neste ciclo de sprints foram entregues **melhorias de UX em toda a plataforma** e **correção de bugs críticos no motor de liquidação (DealGuard Engine)**, com foco em:

1. Filtro de deals no home redesenhado (Notion-style)
2. Modais de confirmação de depósito (Create e Join)
3. Sistema de compartilhamento social com card visual e integração X + WhatsApp
4. Correção de navegação pós-criação de deal
5. Banners de home com navegação e identidade visual
6. **Correção de 5 bugs críticos no DealGuard Engine** — deals não eram liquidados e compliance era avaliado incorretamente
7. **Validação por período (daily/weekly)** — um post no dia 1 não cobre o dia 2

---

## Detalhamento por Commit

---

### `[22–25/05]` — Fix: DealGuard Engine — 5 bugs críticos de liquidação + validação por período

**Contexto:** Deal `B9EFC0F4` ("1 post por day for 3 days.", `end_date = 2026-05-24`) permaneceu em `status = ativo` após o encerramento, sem liquidação e sem distribuição do pot. Diagnóstico revelou 5 bugs compondo o problema.

---

#### Bug 1 — RLS bloqueava `deal_participants` e `social_connections` no cron (CRÍTICO)

**Arquivo:** `lib/integrations/polling-service.ts`

`auditDeal` usava `createClient()` (cliente com sessão do usuário). O cron não tem sessão; `auth.uid() = null` → RLS retornava zero linhas de `deal_participants` e `social_connections`. O loop de auditoria nunca executava (`results = []`), e o settlement encerrava o deal sem nenhum vencedor ou atualização de status de participante.

**Fix:** `createClient()` → `createServiceClient()`.

---

#### Bug 2 — Tokens OAuth do X expiravam sem refresh (CRÍTICO)

**Arquivo:** `lib/integrations/polling-service.ts` + `lib/integrations/x.ts`

Tokens X de ambos os participantes expiraram antes do final do deal (3–4 dias antes). Não havia lógica de refresh para X — ao contrário do Strava, que já tinha. `fetchXUserPosts` recebia 401 e retornava `[]` silenciosamente; participantes eram marcados como falha mesmo tendo postado.

**Fix:** Adicionado `refreshXToken()` em `x.ts` (espelho do padrão Strava já existente: `POST /oauth2/token` com Basic auth + `grant_type=refresh_token`). Chamado em `polling-service.ts` antes de cada request à X API quando `token_expires_at` está a menos de 5 minutos do vencimento.

---

#### Bug 3 — `endTime` do X API excluía o dia final inteiro (SIGNIFICATIVO)

**Arquivo:** `lib/integrations/polling-service.ts`

```typescript
// Antes (errado):
new Date(deal.end_date).toISOString()  // "2026-05-24T00:00:00.000Z"
// X API end_time é exclusivo → todos os posts do dia 24 eram excluídos

// Depois (correto):
new Date(deal.end_date + "T23:59:59.999Z").toISOString()  // "2026-05-24T23:59:59.999Z"
```

---

#### Bug 4 — Cron comparava timestamp com coluna `date`, liquidando deals no meio do dia (MODERADO)

**Arquivo:** `app/api/cron/settle-deals/route.ts`

```typescript
// Antes: comparava ISO timestamp com coluna date → deal com end_date=hoje era liquidado às 12h UTC
const now = new Date().toISOString()
.lt("end_date", now)

// Depois: comparação date-to-date → deal end_date=hoje só é liquidado no cron de amanhã
const today = new Date().toISOString().split("T")[0]
.lt("end_date", today)
```

---

#### Bug 5 — Validação de compliance ignorava frequência; total substituía por-período (SIGNIFICATIVO)

**Arquivos:** `lib/integrations/x.ts`, `lib/integrations/strava.ts`, `lib/integrations/polling-service.ts`

A lógica anterior multiplicava `ruleTarget × durationDays` para criar um `effectiveTarget` (ex: 3 para um deal "1 post/dia por 3 dias"), depois verificava se `posts.length >= 3`. Isso permitia que 3 posts feitos no mesmo dia passassem.

**Fix:** Validação por janela. Para `rule_frequency = "daily"`, cada dia do período é verificado individualmente; para `"weekly"`, cada semana. Zero posts num dia = falha, independente dos demais dias.

Mudanças técnicas:
- `XPost` agora inclui `created_at` (adicionado a `tweet.fields`)
- `validateXRule(posts, rule, target, frequency, startDate, endDate)` — agrupa posts por dia/semana antes de validar
- `validateStravaRule` — mesma assinatura estendida; atividades agrupadas por `start_date`
- Wellhub/TotalPass — migrou de `count` (total) para fetch de rows, agrupados por `activity_at`
- `effectiveTarget` e `durationDays` removidos de `polling-service.ts`

**Arquivos modificados:**
- `app/api/cron/settle-deals/route.ts`
- `lib/integrations/polling-service.ts`
- `lib/integrations/strava.ts`
- `lib/integrations/x.ts`

---

### `6a4a94f` — Deal share sheet com X/WhatsApp + card OG
**Problema:** O botão de compartilhar abria o share nativo do iOS sem contexto visual, sem destinos específicos e sem card.

**Solução implementada:**
- Novo share sheet bottom-drawer com **card preview visual** que espelha o card do deal (gradiente dinâmico: laranja para formação, verde para ativo, cinza para encerrado)
- Card mostra: título, regra + frequência, entry, players, pote e período
- **Botão X:** abre `twitter.com/intent/tweet` com texto completo pré-preenchido
- **Botão WhatsApp:** tenta `navigator.share({ files: [imageFile] })` com o card como PNG real; fallback para `wa.me/?text=`
- **Botão Mais:** share nativo do sistema (iOS/Android) também com card como arquivo
- **Endpoint `/api/og/deal/[id]`** criado — gera imagem PNG 800×420 via `ImageResponse` (next/og) com as cores e dados do deal
- **OG meta tags** dinâmicas adicionadas ao deal page — cada deal agora tem seu próprio `og:image`, `twitter:card summary_large_image`, título e descrição customizados

**Arquivos modificados:**
- `app/deal/[id]/page.tsx` — `generateMetadata` adicionado
- `app/deal/[id]/deal-client.tsx` — share sheet completo reescrito
- `app/api/og/deal/[id]/route.tsx` — NOVO, runtime nodejs

---

### `1016617c` — Fix: botão "Ver meu deal" após criação
**Problema:** Após criar um deal, o botão de confirmação levava para `/` (home) em vez de abrir o deal recém-criado.

**Solução:** `router.push("/")` → `router.push(\`/deal/${confirmedDeal.deal.id}\`)`

**Arquivo:** `app/create/page.tsx:1505`

---

### `0c6b2d37` — Modais de confirmação de depósito (Create + Join)
**Problema:** Usuário clicava "Publicar" ou "Entrar" e o depósito acontecia sem confirmação. Sem visibilidade do saldo ou do impacto financeiro.

**Solução:** Dois modais bottom-sheet intercalam o fluxo antes de qualquer transação on-chain.

**Modal Create Deal** (`app/create/page.tsx`):
- Dispara ao clicar "Publicar acordo" — busca saldo via `getMyUsdcBalance()` (server action)
- Mostra: valor de entrada, saldo atual na carteira, saldo pós-depósito
- Se saldo insuficiente: linha vermelha + aviso + botão confirmar desabilitado
- Botões: "Sim, publicar acordo" / "Cancelar"

**Modal Join Deal** (`app/deal/[id]/deal-client.tsx`):
- Intercala ambos os botões "Entrar no deal" (hero card + sticky footer)
- Mesma lógica de saldo + warning vermelho
- Mostra título do deal como contexto

**Novo server action adicionado** (`lib/actions/wallet.ts`):
```typescript
export async function getMyUsdcBalance(): Promise<number>
// Combina getMyWallet() + getUsdcBalance() — nunca expõe public key ao client
```

---

### `91ec1cc6` — Filter bar Notion-style
**Problema:** Filtros (Public/Private + botão Filters) estavam fora da tela em scroll horizontal, sem indicador visual. Usuários não encontravam os filtros.

**Solução:** Single-row scrollável com ordem fixa e divisores visuais:
```
[Filtros] | [🔍] | [Forming] [Active] [Closed] | [Public] [Private] | [Sort chip — só quando ativo]
```

- Botão "Filtros" sempre o primeiro (leftmost), com badge de contador quando filtros avançados aplicados
- Chips retangulares (borderRadius: 7), estilo Notion — não pílulas
- Divisores verticais de 1px entre seções
- Sort chip aparece só quando um ordenamento está ativo

**Arquivo:** `app/home-client.tsx`

---

### `6d4413a4` e `6765d70b` — Banners do home
- Banner 1 (Brand): gradiente verde escuro → verde TrueDeal, logo + tagline "Set your goals. Honor your word. Get paid for it." + CTA
- Banner 2 (Social): convite a trazer amigos + botão "Convidar amigos agora" com feedback de cópia de link
- Setas de navegação nos dois lados dos banners
- Dot indicators de posição

---

### `2c7ff2af` — Strava + Wellhub/TotalPass check-in
- Fix na integração Strava (blocked por limite de athlete em devnet)
- Sistema de self-report check-in para Wellhub e TotalPass
- Botão de check-in manual no deal detail quando canal é gym

---

## Arquitetura de Carteiras (Referência)

Todos os depósitos usam **SPL Token transfers diretos** (não o programa Anchor legado):

```
Usuário → Server Action → fee-payer keypair assina → SPL transfer USDC
                                                    → registra tx_signature no Supabase
```

- `lib/actions/wallet.ts` — provisiona carteiras, busca saldo SOL/USDC
- `lib/solana/fee-payer.ts` — decripta keypair do fee payer (Vercel env)
- `lib/solana/constants.ts` — USDC_MINT (devnet: `4zMMC9...`, mainnet: `EPjFWd...`)
- `USDC_MINT` nunca é hardcoded fora de `constants.ts`

---

## Variáveis de Ambiente Necessárias (Vercel)

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente Supabase público |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente Supabase público |
| `SUPABASE_SERVICE_ROLE_KEY` | Server actions privilegiadas |
| `APP_FEE_PAYER_KEY` | Keypair JSON do fee payer (assina transações) |
| `WALLET_ENCRYPTION_KEY` | AES-256-GCM para carteiras de usuários |
| `NEXT_PUBLIC_SOLANA_NETWORK` | `devnet` ou `mainnet-beta` |

---

## Pendentes / Próximas Sprints

- [ ] Strava end-to-end (bloqueado por limite de athlete na conta devnet)
- [ ] X OAuth test completo
- [ ] i18n completo PT/EN (há strings hardcoded ainda)
- [ ] Wellhub/TotalPass: validação server-side do check-in
- [ ] Mainnet prep: trocar USDC mint, security audit, rate limiting
- [ ] Faucet "Claim 1000 USDC" — testar fluxo completo
- [ ] OG image: adicionar logo SVG renderizado no card (atualmente usa path inline)

---

## Regras Permanentes de Desenvolvimento

1. **Nunca expor `secretKey` ao browser** — Server Actions apenas
2. **Keypairs no Vercel = JSON array** — não base64 (risco de corrupção do `+`)
3. **Glassmorphism proibido** — usar tokens do design system (objeto `C`)
4. **Anchor program é legacy** — não integrar sem aprovação explícita
5. **USDC_MINT** sempre de `lib/solana/constants.ts` — não hardcodar
6. **Um tipo de deal, taxa flat 3%** — apenas sobre perdedores (decisão João+Lukas)
7. **Fonte: DM Sans** (corpo) + **DM Mono** (valores numéricos/hashes)

---

*Documento gerado em 21/05/2026 — para dúvidas, ver commits individuais no GitHub: `github.com/lkr0102/truedeal`*
