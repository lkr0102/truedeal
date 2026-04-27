# True Deal

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?style=for-the-badge&logo=typescript)
![React Native](https://img.shields.io/badge/React_Native-2024a-black?style=for-the-badge&logo=react)
![Supabase](https://img.shields.io/badge/Supabase-3-181818?style=for-the-badge&logo=supabase)
![Solidity](https://img.shields.io/badge/Solidity-363636?style=for-the-badge&logo=solidity)

**True Deal** — O app que faz o seu combinado valer de verdade.

*"Don't trust. Make a True Deal."*

</div>

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [A Visão](#a-visão)
- [O Problema](#o-problema)
- [A Solução](#a-solução)
- [Tipos de Deal](#tipos-de-deal)
- [Telas do App](#telas-do-app)
- [Arquitetura Técnica](#arquitetura-técnica)
- [Análise de Concorrentes](#análise-de-concorrentes)
- [Roadmap](#roadmap)
- [Escopo do MVP](#escopo-do-mvp)
- [Stack Tecnológico](#stack-tecnológico)
- [Getting Started](#getting-started)
- [Contribuição](#contribuição)
- [Licença](#licença)

---

## 📖 Sobre o Projeto

**True Deal** é um aplicativo mobile (iOS/Android) que atua como árbitro digital automatizado em acordos entre duas ou mais pessoas. Usa provas digitais verificáveis — APIs de redes sociais, apps de saúde, GPS, check-ins — combinadas com smart contracts para garantir que o dinheiro fique bloqueado, a verificação seja automática e a distribuição aconteça sem intervenção humana.

### Identidade

| Atributo | Valor |
|----------|-------|
| **Nome** | True Deal |
| **Handle** | @truedeal |
| **Domínio** | truedeal.app |
| **Tagline Principal** | "Don't trust. Make a True Deal." |
| **Taglines Alternativas** | "The real deal." / "Make a true Deal." / "True Deal with it." |

---

## 👁️ A Visão

True Deal é um aplicativo mobile que atua como **árbitro digital automatizado** em acordos entre duas ou mais pessoas.

> **Posicionamento em uma linha:** O app que faz o seu combinado valer de verdade.

### Diferenciais

- ✅ Provas digitais verificáveis (APIs de redes sociais, saúde, GPS)
- ✅ Smart contracts para garantir distribuição automática
- ✅ Pagamento dual (Fiat + Cripto)
- ✅ UX acessível para público não-nativo Web3

---

## ❌ O Problema

Apostas e combinados entre pessoas dependem 100% de confiança e boa-fé. **Não existe mecanismo que:**

- ❌ Prove o estado inicial e final de forma objetiva e incontestável
- ❌ Guarde e distribua o dinheiro sem favorecer nenhuma parte
- ❌ Resolva o resultado automaticamente sem depender de julgamento humano

As soluções existentes ou são centralizadas demais, ou restritas a uma única métrica, ou voltadas exclusivamente para usuários cripto nativos — afastando o público geral.

---

## 💡 A Solução

### Fluxo de um Deal

| Etapa | O que acontece |
|-------|----------------|
| **01 — Criar** | Founder define: nome, tipo de deal, participantes, valor por pessoa, datas de início e fim, fator(es) de verificação |
| **02 — Convidar** | Participantes recebem link e aceitam os termos do deal |
| **03 — Pagar stake** | Todos pagam via Pix ou cripto — fundos ficam custodiados pelo app |
| **04 — Snapshot inicial** | App registra o estado inicial via API (ex: contagem de seguidores no momento do início) |
| **05 — Monitorar** | Durante o período, app acompanha automaticamente via APIs vinculadas |
| **06 — Verificar** | Na data final, app coleta dados e determina os resultados com base em provas digitais |
| **07 — Distribuir** | Smart contract distribui o pot para os vencedores |

### Modelo de Receita

- **Taxa de 3%** sobre o pot de cada Deal
- Exibida de forma transparente na tela de configuração
- Ex: 2 participantes × R$50 = R$100 pot · True Deal fee 3%

---

## 🎯 Tipos de Deal

### MVP — 4 Tipos Principais

| Tipo | Exemplos | Fonte de verificação |
|------|----------|---------------------|
| **Redes sociais** | Quem ganha mais seguidores em X, Instagram, TikTok em N dias | X API, Meta API, TikTok API (OAuth) |
| **Check-in diário** | Grupo faz check-in na academia todo dia; quem falha paga pro caixa | GPS + timestamp manual |
| **Atividade física** | Quem corre mais km em 4 semanas | Apple Health / Google Fit API |
| **Meta livre** | Quem perde mais peso em 60 dias | Check-in manual com foto verificada |

### Tipos: Oficial vs. Privado

| Tipo | Descrição |
|------|-----------|
| **Oficial / Plataforma** | Deals criados pelo app ou parceiros. Templates validados, APIs garantidas, identificação visual azul |
| **Privado / Grupo** | Deals criados entre amigos. Configuração livre, identificação visual verde |

### Fatores de Verificação Múltiplos

Um Deal pode combinar mais de um fator de verificação. O usuário seleciona via abas (Redes sociais, Fitness, Check-in, On-chain) e adiciona os fatores disponíveis conforme as contas que já vinculou no perfil.

---

## 🏗️ Arquitetura Técnica

### Stack MVP

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| **Frontend Mobile** | React Native | Cross-platform iOS/Android, grande ecossistema, compatível com vibe coding |
| **Backend / BaaS** | Supabase | DB + Auth + Realtime + Storage em uma plataforma. Open source |
| **Pagamento Fiat** | NoxPay / Efí Bank | Pix nativo, custódia de valores, API de webhooks |
| **Smart Contracts** | Solidity (Arbitrum L2) | Baixo custo de gas, segurança Ethereum |
| **Custódia** | Centralizada (Supabase) | Para agilizar o MVP. Migrar para on-chain na Fase 2 |
| **Provas Digitais** | OAuth + REST APIs | X API, Meta API, Apple Health, Google Fit, TikTok API |
| **Autenticação** | Supabase Auth + WalletConnect | Social login + Web3 wallet em um só fluxo |
| **Dev Tooling** | Cursor AI + Claude | Vibe coding para acelerar MVP solo |

---

## 📊 Análise de Concorrentes

| App | Categoria | Stake | Diferencial |
|-----|-----------|-------|-------------|
| Moonwalk | Fitness / Hábito | Pot coletivo | UX simples, foco em passos diários |
| Beeminder | Compromisso pessoal | Stake pessoal | 50+ integrações de dados |
| StickK | Compromisso | Stake + árbitro humano | Arbitragem humana opcional |
| Polymarket | Prediction market | Bet em eventos | Líder global, alta liquidez |
| Kalshi | Prediction market | Bet regulado | Regulado CFTC (EUA) |
| Kleros | Resolução de disputas | Stake em jurados | Arbitragem descentralizada |
| TriadMarkets | Prediction market | Bet em eventos | Maior prediction market BR |

### Oportunidade de Mercado

**Nenhum concorrente combina:**
1. ✅ Acordos livres entre amigos — não só eventos globais
2. ✅ Verificação automática por APIs reais com múltiplos fatores
3. ✅ Pagamento dual Pix + cripto
4. ✅ UX desenhada para público não-nativo com opção Web3 para nativos

---

## 🗺️ Roadmap

| Fase | Período | Entregas principais |
|------|---------|---------------------|
| **Fase 0 — Conceito** | Doc de projeto v0.2, benchmarks, definição de stack |
| **Fase 1 — MVP** | App funcional: 4 tipos de deal, X API integrada, check-in manual, pagamento Pix, early testers |
| **Fase 2 — Validação** | 50 deals realizados, NPS, ajustes de UX, todas APIs centralizadas integradas |
| **Fase 3 — Expansão** | Smart contracts auditados, sistema de grupos & parceiros, marketplace de desafios |
| **Fase 4 — Escala** | SDK para terceiros, AI agent nas redes sociais confirmando e criando True Deals no app por conversas na rede, expansão LatAm |

---

## 🛠 Stack Tecnológico

### Frontend
- [Next.js 14](https://nextjs.org/) - Framework React full-stack (Web)
- [React Native](https://reactnative.dev/) - Mobile (iOS/Android)
- [TypeScript](https://www.typescriptlang.org/) - Tipagem estática
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS utilitário
- [Shadcn UI](https://ui.shadcn.com/) - Componentes UI acessíveis

### Backend
- [Supabase](https://supabase.com/) - Backend as a Service
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/api-routes) - API integrada
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions) - Ações server-side

### Blockchain
- [Solidity](https://soliditylang.org/) - Smart contracts
- [Arbitrum](https://arbitrum.io/) - L2 Ethereum para baixo custo
- [WalletConnect](https://walletconnect.com/) - Conexão com carteiras Web3

### Pagamentos
- [NoxPay](https://noxpay.com.br/) - Pix nativo brasileiro
- [MetaMask](https://metamask.io/) - Carteira Web3
- [Phantom](https://phantom.app/) - Carteira Web3 (Solana)

---

## 🚀 Getting Started

### Pré-requisitos

- Node.js 18+
- pnpm (gerenciador de pacotes)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/lkr0102/truedeal.git

# Entre no diretório
cd truedeal

# Instale as dependências
pnpm install

# Inicie o servidor de desenvolvimento
pnpm dev
```

A aplicação estará disponível em 

---

## 👤 Founder

**Lukas Rocha** (LKR)
[@lkrcripto](https://twitter.com/lkrcripto)

### Experiência

- **8 anos** de publicidade e comunicação estratégica (Propeg BA, SoloED, Humann, Brain Revolution, OneTarget)
- **Ex-Marketing & Community Manager** ICP HUB Brasil
- **Top 3 Arbitrum Ambassador** brasileiro (maior L2 da Ethereum)
- **Community Manager & Ambassador** TriadMarkets (maior prediction market BR)

---

<div align="center">

Desenvolvido com ❤️ por [Lukas Rocha](https://github.com/lkr0102)

*Don't trust. Make a True Deal.*

</div>
