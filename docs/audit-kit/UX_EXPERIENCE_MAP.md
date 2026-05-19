# UX Experience Map — TrueDeal

> **Última atualização:** 2026-05-19 — Remoção de referências a glassmorphism; alinhamento com design system DM Sans + DM Mono; adição de Wallet/Faucet e OAuth.

---

## 1. Dashboard (The Hook)

**Rota:** `/` → `app/home-client.tsx`
**Objetivo:** Clareza imediata e prova social.

### Arquitetura Visual
- **Header personalizado**: Saudação + TDP Points em tempo real. Avatar abre ProfilePopover.
- **Cards de deal**: Grid de cards com StatusBadge colorido por estado. Nenhum glassmorphism — fundo `bg-card`, borda `border-border`.
- **Filtros dinâmicos**: Pills para "Oficial", "Privado", "Público".
- **Resumo financeiro**: "Disponível" vs "Em deals" — calculado a partir dos deals ativos do usuário.

### Gatilhos Psicológicos
- **Live Status Dots**: Ponto verde pulsante indica deal ativo.
- **Countdown em cards de formação**: `HH:MM:SS` ou `Xd Xh` até 00h GMT-3.
  - Padrão (> 24h): cinza. Urgente (< 24h): âmbar. Crítico (< 1h): vermelho + pulse.
  - Lógica: `getStartTarget()` + `formatCountdown()` em `home-client.tsx`, `setInterval` 10s.

### ProfilePopover
- Link para `/profile`
- **Invite and Earn**: copy do referral (`truedeal.app/invite/[userId]`)
- **Toggle de idioma**: PT ↔ EN persistido via `localStorage`
- **Dark Mode**: toggle sol/lua com transição 300ms

---

## 2. Criação de Deal (The Rule Engine)

**Rota:** `/create` → `app/create/page.tsx`
**Objetivo:** Configuração simples de acordos complexos.

### Fluxo em Etapas
1. **Categoria**: Fitness, Social — define canal de verificação disponível
2. **Canal + Regra**: Strava, X, etc. + métrica auditada (km_corridos, post_feito...)
3. **Frequência e Período**: janela semanal/diária + datas início/fim
4. **Stake**: preset amounts ou custom (mínimo $10 USDC)
5. **Review Screen**: preview do card como aparecerá para outros

### UX de Segurança
- **Taxa 3%**: exibida explicitamente no review screen (sobre o loser pool)
- **VERIFICATION_SUBRULES**: checklist de sub-regras por `verification_type` com ✅ por critério
- **Aviso de Janela Estrita**: banner vermelho — "1 janela perdida = eliminação permanente"
- **Banner GMT-3**: banner azul na tela de período — "O deal inicia automaticamente às 00h00 (Brasília)"
- **Pace UX (Strava)**: campo "Pace máximo (min/km)" com hint "← menor = mais rápido"

---

## 3. Tracking / Deal Ativo (Live Accountability)

**Rota:** `/deal/[id]` → `app/deal/[id]/deal-client.tsx`
**Objetivo:** Confiança via transparência.

### Funcionalidades
- **Timeline Visual**: marcadores de Início, Hoje e Fim do período
- **Leaderboard Gamificado**: ranking por performance, badges para Top 3
- **Evidence Links**: links para perfil Strava / conta X para auditoria peer
- **Proof of Stake**: link para Solana Explorer com TX hash do depósito
- **RULE_SUBRULES Panel**: card "Regras do Acordo" expandido com checklist por `verification_type`
- **Aviso de Janela Estrita**: alerta vermelho fixo no topo do card de regras

---

## 4. Wallet (Sovereign Finance)

**Rota:** `/wallet` → `app/wallet/wallet-client.tsx`
**Objetivo:** Gestão de assets sem fricção.

### Interações Principais
- **Privacy Mode**: ícone de olho para esconder/revelar saldos
- **Multi-Currency**: conversão em tempo real SOL ↔ USD ↔ BRL
- **Separação de Assets**: "Disponível" vs "Em deals" (escrow ativo)
- **Managed Wallet**: endereço Solana gerenciado pelo protocolo — copy one-tap
- **Devnet Faucet**: botão "Claim 1000 USDC" para testers (apenas devnet)
  - Usa `mintTo` via `USDC_MINT_AUTHORITY_KEY` (chave separada do fee payer)
  - Mostra erro real se falhar (não mensagem genérica)

### Arquitetura de Wallet
- Cada usuário tem um keypair gerado server-side, encrypted (AES-256) e armazenado no Supabase
- Fee payer (`APP_FEE_PAYER_KEY`) cobre taxas SOL de todas as transações
- USDC: SPL Token — devnet mint `BpXHCSnxhbzSjzWeaTHG14g1zETtcZeDGk772Nvwjb99`

---

## 5. Explore (Retention & Social)

**Rota:** `/explore` → `app/explore/explore-client.tsx`
**Objetivo:** Engajamento contínuo via economia de Shakes.

### Mecânicas
- **Shakes**: pontos de reputação via check-ins diários, streaks, referrals
- **Hall of Fame**: pódio visual (Ouro, Prata, Bronze) — top performers
- **Retention Loop**: countdown 24h para próximo check-in, incentivo "Streak Repair"
- **Busca Global**: encontrar e seguir outros players e ver seus deals

---

## 6. Perfil & OAuth

**Rota:** `/profile` → `app/profile/profile-client.tsx`
**Objetivo:** Identidade verificada e conexões sociais.

### Conexões Suportadas
| Canal | Provider | Status OAuth | Dados Usados |
|:------|:---------|:------------|:-------------|
| X (Twitter) | OAuth 2.0 PKCE | ✅ Configurado | `post_feito` verification |
| Strava | OAuth 2.0 | ✅ Configurado | `km_corridos`, `pace`, `checkins` |

> X requer `X_CLIENT_ID` + `X_CLIENT_SECRET` no Vercel. Strava usa `NEXT_PUBLIC_APP_URL` para callback determinístico.

---

## 7. Onboarding

**Rota:** `/onboarding` → Steps: profile → survey
**Objetivo:** Ativação do usuário em < 2 minutos.
- Captura nome, avatar, esporte preferido
- Wallet gerenciada criada automaticamente no primeiro login
- 1000 USDC de devnet creditados automaticamente (non-blocking)

---

## 8. Tokens de Design (Resumo)

| Elemento | Valor |
|:---------|:------|
| Font principal | DM Sans |
| Font numérica | DM Mono |
| Verde primário | `#16A34A` / `green-600` |
| Background | `oklch(var --background)` — Tailwind v4 |
| Cards | `bg-card border border-border rounded-2xl` |
| Glassmorphism | ❌ Removido |
| Border radius padrão | 16px (`rounded-2xl`) |
| Escala de hover | `hover:scale-[1.02]` — sutil |
