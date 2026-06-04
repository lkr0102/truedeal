# TrueDeal — Changelog · Maio 2026

**Período coberto:** 16–26 de Maio de 2026 (última entrada: 26/05 — commit `7193a916`)  
**Responsável:** Lukas (Frontend / Product)  
**Branch:** `main` — todos os commits estão na produção (Vercel auto-deploy)

---

## Resumo Executivo

Neste ciclo de sprints foram entregues **melhorias de UX em toda a plataforma**, **correção de bugs críticos no motor de liquidação (DealGuard Engine)**, **infraestrutura de carteiras reconstruída do zero** e **sistema completo de notificações in-app**, com foco em:

1. Filtro de deals no home redesenhado (Notion-style)
2. Modais de confirmação de depósito (Create e Join)
3. Sistema de compartilhamento social com card visual e integração X + WhatsApp
4. Correção de navegação pós-criação de deal
5. Banners de home com navegação e identidade visual
6. **Correção de 5 bugs críticos no DealGuard Engine** — deals não eram liquidados e compliance era avaliado incorretamente
7. **Validação por período (daily/weekly)** — um post no dia 1 não cobre o dia 2
8. **Modo escuro forçado como light** — app sempre exibe versão clara independente do sistema operacional
9. **Pipeline de carteiras reconstruído** — geração confiável no cadastro + cron retroativo para usuários existentes + migração de chave de criptografia
10. **UX do criador de deal melhorada** — presets curtos (1/2/3 dias), labels de seção, ícone de calendário nos seletores de data e botão "Voltar para tela inicial" na tela de confirmação
11. **Profile drawer redesenhado** — bell/notificações movido para dentro do drawer, dark mode desabilitado com badge "Em breve", header simplificado (sem nome duplicado)
12. **Sistema de notificações in-app completo** — 10 tipos com gatilhos FOMO/greed, entrega em tempo real via Supabase Realtime, badge de não-lidas no avatar, conteúdo bilíngue PT/EN armazenado no INSERT
13. **Profile overhaul** — edição inline de nome/username, email visível no perfil, social cards estilo Galxe (Remover + Trocar), YouTube adicionado, Wellhub removido, fix de redirect de erro do X OAuth

---

## Detalhamento por Commit

---

### `[26/05]` — Feature: Sistema de notificações in-app (Supabase Realtime)

**Commits:** `74090339` (drawer redesign) + `79022ca8` (notification system)

#### Profile Drawer redesenhado

**Problema:** O botão de notificações ficava no top bar, sem contexto. O header do drawer repetia o nome do usuário que já aparecia no subtítulo. O toggle de Dark Mode estava funcional mas o modo escuro não é suportado ainda.

**Mudanças em `app/home-client.tsx`:**

- **Bell removido do top bar** — `NotificationPopover` e botão eliminados do header
- **Bell adicionado como primeiro item do `ProfilePopover`** — ação chama `onOpenNotif()` que abre o popover de notificações
- **Drawer header simplificado** — removida a linha com `displayName` duplicada; ficam apenas `@handle` e saldo de Shakes
- **Dark Mode desabilitado** — substituído por div com `opacity: 0.4`, `cursor: not-allowed`, badge cinza "Em breve" — não clicável

---

#### Sistema de Notificações In-App

**Motivação:** App não tinha nenhuma notificação — `NotificationPopover` mostrava "Nenhuma notificação" hardcoded. O objetivo é estimular **ganância, FOMO e engajamento contínuo** com notificações entregues em tempo real.

**10 tipos de notificação implementados:**

| Tipo | Gatilho | Tom |
|------|---------|-----|
| `deal_join_confirm` | Usuário entra num deal | 🤝 "Você está competindo com X pessoas por $Y" |
| `deal_joined` | Creator: novo participante no seu deal | 🎯 "Novo participante! Pote atual: $X" |
| `deal_milestone` | Deal atinge 5/10/15/20/25/50 participantes | 🔥 "Pote cresceu para $X" |
| `deal_started` | Deal ativado (formacao→ativo) | 🚀 "Começou! Pote: $X" |
| `deal_cancelled` | Deal cancelado por falta de quórum | ❌ "Cancelado, reembolso efetuado" |
| `deal_result_win` | Resultado final: vencedor | 🏆 "Você venceu!" |
| `deal_result_lose` | Resultado final: perdedor | 📉 "Deal encerrado" |
| `deal_eliminated` | Eliminação em deal de academia | ⚡ "Você foi eliminado" |
| `deal_window_update` | Outros eliminados → prêmio do ativo sobe | 💰 "2 caíram. Seu prêmio esperado agora é $X!" |
| `deal_ending_soon` | 24h antes do fim do deal (cron) | ⏰ "Última verificação amanhã!" |

**Fórmula do prêmio esperado:**
```
prêmio_esperado = entry_amount × total_participantes_ever × 0.97 / ativos_restantes
```
Conservadora (assume que todos os ativos ganham) — maximiza o número exibido como teto do prêmio.

---

**Arquitetura implementada:**

**`supabase/migrations/018_notifications.sql`** (NOVO — aplicado em produção):
```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  title_pt TEXT NOT NULL, title_en TEXT NOT NULL,
  body_pt TEXT NOT NULL, body_en TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Índice por usuário+data para fetch do popover
-- Índice parcial WHERE is_read = false para badge
-- RLS: SELECT e UPDATE apenas para o próprio usuário (service role bypassa)
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications
```

**`lib/actions/notifications.ts`** (NOVO):
- Helper `createNotification(supabase, input)` — recebe service client como parâmetro para reutilizar a instância do caller
- Fire-and-forget: erros são logados mas nunca propagam para o caller
- Bilíngue no INSERT: `title_pt`, `title_en`, `body_pt`, `body_en` — client renderiza a coluna correta via `useLanguageStore()`

**Gatilhos nos server actions:**

| Arquivo | Onde | Tipos enviados |
|---------|------|----------------|
| `lib/actions/deals.ts` → `joinDeal()` | Após INSERT em `deal_participants` | `deal_join_confirm`, `deal_joined`, `deal_milestone` |
| `lib/actions/deals.ts` → `sweepStaleDeals()` | Após ativação e cancelamento | `deal_started`, `deal_cancelled` |
| `lib/actions/settlement.ts` → `settleDealProtocol()` | Após classificação de vencedores/perdedores | `deal_result_win`, `deal_result_lose` |
| `lib/actions/checkins.ts` → `evaluateGymDealCompliance()` | Após eliminação por janela | `deal_eliminated`, `deal_window_update` |
| `app/api/cron/settle-deals/route.ts` | Query extra: deals com `end_date = amanhã` | `deal_ending_soon` |

**Frontend (`app/home-client.tsx`):**

- Interface `AppNotification` + mapa `NOTIF_ICONS` (emoji por tipo)
- `NotificationPopover` reescrito com 3 `useEffect`s:
  - #1: fetch das últimas 20 notificações ao abrir
  - #2: UPDATE em massa `is_read = true` ao abrir → zera badge
  - #3: Realtime `postgres_changes` INSERT — prepend em tempo real, sem polling
- Unread badge no avatar (vermelho, top-left, `top: -3, left: -3`) — não conflita com level badge (bottom-right)
- Badge count via fetch inicial + Realtime subscription separado (`notif-badge:${userId}`)
- Click em notificação → `router.push(\`/deal/${n.deal_id}\`)` se `deal_id` existe

---

### `[26/05]` — UX: Melhorias no criador de deal (período + tela de confirmação)

**Contexto:** Testes com usuários revelaram dois pontos de atrito: (1) o seletor de período não tinha opções curtas para deals de 1–3 dias e não deixava claro que as datas eram clicáveis; (2) a tela pós-criação não oferecia saída para quem não queria ver o deal imediatamente.

**Mudanças em `app/create/page.tsx`:**

- **Novos presets curtos:** `1 dia`, `2 dias`, `3 dias` adicionados ao início da lista `PERIOD_PRESETS` (antes só havia 1 sem / 2 sem / 1 mês / 2 meses)
- **Label "Sugestões mais comuns"** acima da grade de presets — deixa claro que os botões são atalhos editáveis
- **Label "Ou escolha as datas"** acima dos seletores de data — separa visualmente as duas formas de definir o período
- **Ícone de calendário** (Lucide `Calendar`) em cada botão de data, indicando interatividade
- **Botão "Voltar para tela inicial"** adicionado abaixo de "Ver meu deal" na tela de confirmação — estilo outline/ghost, `router.push("/")`

---

### `[25–26/05]` — Fix: Modo escuro forçado + pipeline de geração de carteiras

**Commit:** `0d71415f`

#### Modo escuro (dark mode) forçado como light

**Problema:** Usuários com sistema operacional em dark mode (iOS, Android) viam o app completamente diferente — cores invertidas, backgrounds escuros — porque o browser aplicava estilos UA de dark mode.

**Fix:**
- `app/globals.css` — `color-scheme: light` adicionado como primeira propriedade do `:root`. Bloqueia aplicação de UA dark styles em elementos nativos (inputs, scrollbars, etc.)
- `app/layout.tsx` — `colorScheme: "light"` adicionado ao export `viewport`. Emite `<meta name="color-scheme" content="light">` para cobertura completa cross-browser (especialmente iOS Safari)

**Resultado:** Todos os acessos — independente da preferência do sistema — exibem a versão light do app.

---

#### Pipeline de geração de carteiras reconstruído

**Problema:** Usuários novos ficavam com status "Gerando..." eternamente na tela de carteira. Três causas raiz identificadas:

1. **`WALLET_MASTER_KEY` nomeada incorretamente** no Vercel (docs anteriores listavam `WALLET_ENCRYPTION_KEY`; código usa `WALLET_MASTER_KEY`) → `encryptSecret()` nunca era chamada
2. **Guard silencioso no auth callback:** `if (!existingWallet && process.env.WALLET_MASTER_KEY)` — se a env var estava ausente/errada, criação era pulada sem log
3. **Cliente com sessão de usuário (`createClient()`)** sujeito a edge cases de RLS no auth callback (cookies ainda não propagados após `exchangeCodeForSession`)

**Fixes aplicados:**

- `app/auth/callback/route.ts` — substituído `createClient()` por `createServiceClient()` para operações de DB; removido guard condicional; adicionado check de erro no INSERT com log descritivo
- `lib/actions/wallet.ts` (`ensureUserWallet`) — mesma troca para service client; keypair/encrypt envolvido em try/catch com retorno de erro tipado
- `app/wallet/page.tsx` + `app/wallet/wallet-client.tsx` — captura e exibição de `walletError`; tela mostra "Erro ao gerar carteira" em vez de "Gerando..." infinito

**Cron retroativo criado:** `app/api/cron/provision-wallets/route.ts`
- Roda diariamente às 06h UTC (configurado em `vercel.json`)
- Busca todos os perfis sem linha em `user_wallets` e provisiona wallets para cada um
- Autenticado via `Authorization: Bearer CRON_SECRET`
- Primeira execução manual provisionou **16 wallets** para usuários existentes

**Migração de chave:** Chaves antigas deletadas do Vercel; nova `WALLET_MASTER_KEY` (AES-256-GCM, 32 bytes) gerada e configurada; todas as linhas de `user_wallets` e `solana_public_key` em `profiles` zeradas para recriação limpa com a nova chave.

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

### `[26/05]` — Feature: Profile overhaul — edição inline, YouTube, remoção Wellhub, fix X OAuth

**Commit:** `7193a916`

Sprint de maturação do perfil do usuário: edição in-page de nome/username, cards de plataformas social estilo Galxe, adição do YouTube como canal OAuth, remoção definitiva do Wellhub e correção do redirect de erro do X.

#### 1. Edição inline de username e nome de exibição

**Antes:** Sem forma de editar username ou nome no perfil — campos somente-leitura.

**Agora:** Botão de lápis ao lado do nome abre um formulário inline (sem modal separado):
- **Nome de exibição** — input livre
- **Username** — apenas o prefixo é editável; o sufixo `#XXXX` (4 dígitos gerados no cadastro) fica fixo, estilo Discord/Galxe
- Validação client-side antes de chamar a server action `updateProfile`

#### 2. Email exibido abaixo do handle

O email da conta autenticada (Supabase Auth) é mostrado abaixo do username no cabeçalho do perfil — referência visual para o usuário confirmar de qual conta está usando.

#### 3. Social cards estilo Galxe

Quando uma plataforma já está conectada, os botões mudam:

| Estado | Botões |
|--------|--------|
| `idle` | `[Conectar]` |
| `connected` | `[Remover]` + `[Trocar]` |
| `pending` | ícone de relógio + label "Pendente" |

- **"Remover"** chama `removeSocialConnection(platform)` — server action com guard: bloqueia remoção se o usuário tiver deals ativos que usam esse canal de verificação
- **"Trocar"** reinicia o fluxo OAuth para reconectar com conta diferente

#### 4. `removeSocialConnection` server action

**Novo em `lib/actions/profile.ts`:**

```typescript
export async function removeSocialConnection(platform: string)
// 1. Busca deals ativos do usuário
// 2. Se algum deal usa este canal → retorna { error: "..." }
// 3. DELETE em social_connections WHERE user_id = auth.uid() AND platform = ?
```

Guard evita situação em que usuário remove o X durante um deal que exige X para verificação, tornando a validação impossível.

#### 5. YouTube adicionado como plataforma OAuth

YouTube aparece na lista de plataformas do perfil com fluxo OAuth via `/api/auth/youtube` (mesmo provider handler genérico).

#### 6. Wellhub removido definitivamente

Wellhub era placeholder sem parceria real. Removido de todos os pontos:

| Arquivo | Mudança |
|---------|---------|
| `app/create/page.tsx` | Removido do seletor de canais de verificação |
| `app/deal/[id]/deal-client.tsx` | Removido da lista de canais suportados |
| `app/home-client.tsx` | Removido dos filtros do home |
| `lib/integrations/polling-service.ts` | Removido do polling de verificação |

TotalPass mantém-se como alternativa de academia (via e-mail de membership, sem OAuth).

#### 7. Fix: X OAuth error redirect

**Antes:** Erros no callback do X OAuth (ex: `state_mismatch`, `no_verifier`) redirecionavam para `/login?error=...` — o usuário perdia a sessão e tinha de fazer login novamente.

**Agora:** Erros do X redirecionam para `/profile?social_error=...` — sessão preservada, mensagem de erro exibida no perfil.

**Arquivo:** `app/api/auth/callback/[provider]/route.ts`

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

- [ ] Strava end-to-end (bloqueado por limite de athlete na conta devnet) — redirect fix entregue em 03/06
- [x] X OAuth — redirect de erro corrigido (26/05), popup flow entregue (03/06)
- [ ] i18n completo PT/EN (há strings hardcoded ainda)
- [x] Wellhub removido definitivamente (26/05 — commit `7193a916`)
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
