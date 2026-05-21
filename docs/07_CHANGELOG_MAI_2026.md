# TrueDeal — Changelog · Maio 2026

**Período coberto:** 16–21 de Maio de 2026  
**Responsável:** Lukas (Frontend / Product)  
**Branch:** `main` — todos os commits estão na produção (Vercel auto-deploy)

---

## Resumo Executivo

Neste ciclo de sprints foram entregues **melhorias de UX em toda a plataforma**, com foco em:

1. Filtro de deals no home redesenhado (Notion-style)
2. Modais de confirmação de depósito (Create e Join)
3. Sistema de compartilhamento social com card visual e integração X + WhatsApp
4. Correção de navegação pós-criação de deal
5. Banners de home com navegação e identidade visual

---

## Detalhamento por Commit

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
