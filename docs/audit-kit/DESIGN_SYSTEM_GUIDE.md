# Design System Guide — TrueDeal

> **Última atualização:** 2026-05-19 — Migração para DM Sans + DM Mono, remoção de glassmorphism, alinhamento com token object C do Tailwind v4.

---

## 1. Princípios

- **Clareza sobre ornamento**: UI clean, sem efeitos de blur excessivos. Informação financeira deve ser imediatamente legível.
- **Tipografia como hierarquia**: DM Sans para texto de interface; DM Mono para valores numéricos e hashes.
- **Status como linguagem**: Cada estado do deal tem cor e badge únicos — o usuário nunca precisa ler texto para saber o que está acontecendo.
- **Mobile-first**: Todos os componentes são desenhados para 375px e escalam para desktop.

---

## 2. Tipografia

| Papel | Fonte | Peso | Uso |
|:------|:------|:-----|:----|
| Display / Títulos | DM Sans | 700 | Títulos de página, nome do deal |
| Body | DM Sans | 400–500 | Parágrafos, labels, descrições |
| Valores numéricos | DM Mono | 500–600 | Balances USDC/SOL, timestamps, hashes |
| Código / TxID | DM Mono | 400 | Endereços Solana, transaction signatures |

```css
/* globals.css */
font-family: 'DM Sans', system-ui, sans-serif;
font-family: 'DM Mono', 'Courier New', monospace; /* valores e hashes */
```

---

## 3. Paleta de Cores

| Token | Valor | Aplicação |
|:------|:------|:----------|
| `brand-green` | `#16A34A` | Botões primários, sucesso, deals ativos |
| `brand-green-light` | `#22C55E` | Hover states, badges de sucesso |
| `alert-red` | `#EF4444` | Erros, fraude (Risk Guardian), janela estrita perdida |
| `warning-amber` | `#F59E0B` | Countdown urgente (< 24h), avisos |
| `info-blue` | `#3B82F6` | Banners informativos (ex: GMT-3 auto-start) |
| `muted` | `oklch(var --muted)` | Texto secundário, labels |
| `background` | `oklch(var --background)` | Fundo de página (Tailwind v4 oklch) |
| `card` | `oklch(var --card)` | Fundo de cards e painéis |

> Tokens seguem o sistema oklch do Tailwind v4 definido em `styles/globals.css`. Evitar valores hex hardcoded fora desse arquivo.

---

## 4. Componentes Principais

### Card (base)
Contêiner padrão para grupos de informação. Usa variável `--card` do Tailwind. Sem blur/glassmorphism.
- Border-radius: `rounded-2xl` (16px)
- Border: `border border-border`
- Background: `bg-card`

### PrimaryButton
Botão de ação principal.
- Background: `bg-green-600` → hover `bg-green-700`
- Texto: `text-white font-semibold`
- Uso: "Criar Deal", "Participar", "Confirmar"

### StatusBadge
Indica estado atual do deal/participante. Cores padronizadas:
- `formacao`: âmbar (`bg-amber-100 text-amber-800`)
- `ativo`: verde (`bg-green-100 text-green-800`)
- `liquidando`: azul (`bg-blue-100 text-blue-800`)
- `encerrado`: cinza (`bg-gray-100 text-gray-600`)
- `cancelado`: vermelho (`bg-red-100 text-red-700`)

### CountdownBadge
Exibido em cards com `status = "formacao"`. Atualiza a cada 10s via `setInterval`.
- > 24h: `text-muted-foreground`
- < 24h: `text-amber-500`
- < 1h: `text-red-500 animate-pulse`

### ProfilePopover
Menu de usuário no header. Abre ao clicar no avatar.
- Itens: Link para `/profile`, Invite & Earn (copy referral), Toggle idioma PT/EN, Toggle dark mode
- Background: `bg-card border border-border rounded-2xl shadow-lg`

### ComplianceCard
Card de sub-regras em `/create`, `/deal/[id]` e `/tracking`.
- Lista de critérios com ✅ por critério
- Banner de alerta (borda vermelha): "Atenção: 1 janela perdida = eliminação permanente."

---

## 5. Iconografia

Biblioteca: Lucide React. Usar ícones semânticos:
- `Wallet` — saldo e carteira
- `TrendingUp` — deals em formação / crescimento
- `Shield` — DealGuard / segurança
- `Zap` — Shakes / reputação
- `ExternalLink` — links para Solana Explorer

---

## 6. Como Estender

1. Criar novo componente em `components/ui/` (baseado em Shadcn/ui quando disponível)
2. Usar tokens CSS do `globals.css` — nunca hardcodar hex fora da paleta
3. Usar DM Mono para qualquer valor numérico financeiro ou endereço on-chain
4. Manter border-radius consistente (`rounded-2xl` para cards, `rounded-full` para badges)
5. Não usar `backdrop-filter: blur` — a UI é clean, não glassmorphism

---

## 7. Design Debt & Pendências

| Item | Status | Nota |
|:-----|:-------|:-----|
| Migração glassmorphism → tokens | ✅ Concluído | commit b56c3062 |
| DM Sans + DM Mono | ✅ Aplicado | Fontes carregadas via next/font |
| Dark mode | ✅ Funcional | Toggle no ProfilePopover, persiste localStorage |
| Internacionalização (i18n) | ⏳ Pendente | Strings hardcoded em PT-BR; inglês como próxima etapa |
