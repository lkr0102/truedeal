# 🗺️ Master System Map: TrueDeal App

Este documento é o guia definitivo para desenvolvedores e auditores entenderem a anatomia do TrueDeal, desde a interface premium até a liquidação on-chain.

> **Última atualização:** 2026-05-10 — Compliance Rules UI, ProfilePopover, countdown timer, correções de bugs.

---

## 1. Stack Tecnológica
- **Frontend**: Next.js 15 (App Router) + TypeScript.
- **Styling**: Tailwind CSS + Glassmorphism Custom System (`td-ui.tsx`).
- **Backend/Orquestração**: Supabase (PostgreSQL, Auth, Realtime).
- **Blockchain**: Solana (Anchor Framework 0.30.1).
- **IA/Monitoramento**: Risk Guardian (Sentinel AI) + DealGuard Engine.

---

## 2. Anatomia da Interface (UI/UX)

A interface foi desenhada por Lukas com foco em **fidelidade visual e confiança**.

### Diretórios de UI:
- `/app`: Contém as rotas da aplicação.
- `/components/ui`: Componentes base (Shadcn/UI).
- `/components/td-ui.tsx`: O **Coração Visual**. Contém os componentes customizados (GlassCard, StatusBadge, TDIcon).
- `/styles/globals.css`: Variáveis de cor e efeitos de blur.

### Fluxos do Usuário (User Journey):
1. **The Hook (Dashboard)**: `page.tsx` (Home) -> Uso de **Hero Banners** saturados, **Live Status Dots** e **Countdown Timer** (regressivo até 00h GMT-3) para criar urgência e FOMO.
2. **The Rule Engine (Creation)**: `/create` -> Configuração modular de regras (Fitness/Social) com conectores lógicos (E/OU) + **VERIFICATION_SUBRULES** checklist por tipo de verificação + banner GMT-3.
3. **Engagement Loop (Explore)**: `/explore` -> Sistema de **Shakes (🤝)** (Pontos de engajamento) + **Hall of Fame** (Podium visual) para retenção.
4. **Live Accountability**: `/deal/[id]` -> Timeline visual da jornada + **RULE_SUBRULES** panel + aviso de janela estrita + links de evidência auditáveis.
5. **Sovereign Finance**: `/wallet` -> Gestão de saldo multi-moeda (SOL/USD/BRL) com foco em privacidade (Hide Balance).

### Novo Componente: ProfilePopover
Substituiu o balloon de configurações no header. Localizado em `app/home-client.tsx`.

| Funcionalidade | Implementação |
|:---|:---|
| Link para `/profile` | Navegação direta |
| Referral copy | `truedeal.app/invite/[userId]` + guard null |
| Language toggle | PT ↔ EN via `localStorage` |
| Dark Mode toggle | Animação sol/lua, persiste em `localStorage` |

### Sistema de Compliance Rules UI (2026-05-10)

O mapa de sub-regras (`RULE_SUBRULES` / `VERIFICATION_SUBRULES`) é uma estrutura de dados front-end que espelha as regras de negócio definidas em `docs/06_REGRAS_FLUXO_COMPLETO.md §5.2`. Está presente em três telas:

| Tela | Arquivo | Propósito |
|:-----|:--------|:----------|
| Criação | `app/create/page.tsx` | Mostrar ao criador o que será auditado |
| Detalhe do deal | `app/deal/[id]/deal-client.tsx` | Lembrar participantes das regras vigentes |
| Tracking | `app/tracking/tracking-client.tsx` | Visibilidade contínua durante o período ativo |

**Tipos cobertos (10 total):**
`post_feito`, `seguidores_recebidos`, `impressoes`, `reposts_recebidos`, `comentarios`, `km_corridos`, `horas_exercicio`, `pace`, `checkins`, `ambientes_diferentes`


---

## 3. Lógica de Contratos (On-Chain)

O contrato `truedeal` na Solana gerencia o estado financeiro e a verdade dos acordos.

### Máquina de Estados (AgreementStatus):
- `Formation`: Deal aberto para entrada de participantes.
- `Active`: Deal em andamento (pós-quórum).
- `Settled`: Deal encerrado e fundos distribuídos.
- `Cancelled`: Deal falhou no quórum e fundos foram devolvidos.

### Security Primitives:
- **PDA Vaults**: Cada acordo tem seu próprio cofre isolado.
- **Dual-Oracle Multi-Sig**: A liquidação exige assinaturas do `DealGuard Node 1` e `Node 2`.
- **Rule/Proof Hashing**: O contrato guarda hashes (SHA-256) das regras e das provas de auditoria, permitindo verificação offline.

---

## 4. O "Slacker Tax" (Motor Econômico)

Localizado em `contracts/solana/programs/truedeal/src/lib.rs`:
1. O sistema identifica os **Perdedores** (quem não atingiu a meta).
2. O montante dos perdedores forma o `slacker_pool`.
3. **3%** desse pool é enviado para a `treasury_token_account` (Taxa do Protocolo).
4. O restante é dividido igualmente entre os **Ganhadores**.

---

## 5. Gamificação e Retenção (A Economia de Shakes)

O TrueDeal utiliza o conceito de **Sovereign Reputation**:
- **Daily Check-ins**: Recompensas progressivas (Dia 1 -> Dia 7) em Shakes.
- **Streak Repair**: Mecanismo de retenção via queima de pontos acumulados.
- **Social Proof**: O Hall of Fame utiliza deltas de ranking para incentivar a competitividade saudável.

---

## 6. Manutenção e Extensibilidade


- **Para novos desenvolvedores**: Sempre utilize os componentes de `td-ui.tsx` para manter a estética de vidro.
- **Para novos contratos**: Siga o `Sovereign Rule Engine Framework` localizado na pasta de templates.

---
**AETHEL CORE - Mantendo a integridade do código e a soberania dos acordos.** 🖖
