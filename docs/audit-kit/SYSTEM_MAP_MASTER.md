# 🗺️ Master System Map: TrueDeal App

Este documento é o guia definitivo para desenvolvedores e auditores entenderem a anatomia do TrueDeal, desde a interface premium até a liquidação on-chain.

> **Última atualização:** 2026-05-16 — **Sovereign Build Stabilization**, Devnet Deployment, CI/CD Autônomo.

---

## 1. Stack Tecnológica
- **Frontend**: Next.js 15 (App Router) + TypeScript.
- **Styling**: Tailwind CSS + Glassmorphism Custom System (`td-ui.tsx`).
- **Backend/Orquestração**: Supabase (PostgreSQL, Auth, Realtime).
- **Blockchain**: Solana (**Anchor Framework 0.29.0**).
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
1. **The Hook (Dashboard)**: `page.tsx` (Home) -> Uso de **Hero Banners** saturados, **Live Status Dots** e **Countdown Timer** para criar urgência.
2. **The Rule Engine (Creation)**: `/create` -> Configuração modular de regras com conectores lógicos + checklist de verificação.
3. **Engagement Loop (Explore)**: `/explore` -> Sistema de **Shakes (🤝)** + **Hall of Fame** visual.
4. **Live Accountability**: `/deal/[id]` -> Timeline visual da jornada + links de evidência auditáveis.
5. **Sovereign Finance**: `/wallet` -> Gestão de saldo multi-moeda (SOL/USD/BRL).

---

## 3. Lógica de Contratos (On-Chain)

O contrato `truedeal` na Solana gerencia o estado financeiro e a verdade dos acordos.

### Deployment (Devnet):
- **Program ID:** `HdMnEf5jc3q6tws2vYLZgFgwFWKkKpNaK5CRKnF3a7mp`
- **Audit Info:** [Solscan Link](https://solscan.io/account/HdMnEf5jc3q6tws2vYLZgFgwFWKkKpNaK5CRKnF3a7mp?cluster=devnet)

### Máquina de Estados (AgreementStatus):
- `Formation`: Deal aberto para entrada de participantes.
- `Active`: Deal em andamento (pós-quórum).
- `Settled`: Deal encerrado e fundos distribuídos.
- `Cancelled`: Deal falhou no quórum e fundos foram devolvidos.

### Sovereign Build Pipeline (CI/CD):
O projeto utiliza um pipeline de deploy autônomo que:
1. Aplica patches cirúrgicos no diretório `vendor/` para compatibilidade com o compilador SBF (Legacy Rust).
2. Gera uma identidade única (Keypair) por build, injetando o ID dinamicamente no código-fonte.

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
- **Daily Check-ins**: Recompensas progressivas em Shakes.
- **Social Proof**: O Hall of Fame utiliza deltas de ranking para incentivar a competitividade.

---

## 6. Manutenção e Extensibilidade

- **Para novos desenvolvedores**: Sempre utilize os componentes de `td-ui.tsx` para manter a estética de vidro.
- **Sincronia de ID**: O ID do contrato no repositório local é gerenciado pelo CI. Consulte sempre o último Release para o ID real de produção.

---
**TrueDeal Protocol - Mantendo a integridade do código e a soberania dos acordos.** 🖖
