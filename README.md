# True Deal

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)
![Solana](https://img.shields.io/badge/Solana-9945FF?style=for-the-badge&logo=solana&logoColor=white)
![Anchor](https://img.shields.io/badge/Anchor-Framework-9945FF?style=for-the-badge)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=black)

**True Deal** — Gamifique suas metas e conquistas com quem tem os mesmos desejos que você.

*"Don't trust. Make a True Deal."*

[![Colosseum Frontier Hackathon](https://img.shields.io/badge/Colosseum-Frontier%20Hackathon-9945FF?style=flat-square&logo=solana&logoColor=white)](https://www.colosseum.org/)

</div>

---

## 🎯 Missão

**True Deal** te ajuda a gameficar suas metas e conquistas pessoais com outros amigos que têm os mesmos desejos que você.

Chega de combinados que ficam só no papo. No True Deal, você aposta dinheiro real na sua própria evolução, o app verifica o resultado automaticamente, e o Solana distribui a premiação sem intermediários.

> *Gamify your personal goals and achievements with friends who share the same desires.*

---

## ❌ O Problema

Apostas e desafios entre amigos dependem 100% de confiança e boa-fé — e sempre terminam em discussão.

- Não existe prova objetiva e incontestável do início e fim
- Não existe árbitro neutro que guarde e distribua o dinheiro sem favorecer ninguém
- Não existe resolução automática — alguém sempre precisa confiar em alguém

---

## 💡 A Solução

True Deal é o **árbitro digital automatizado** entre você e seus amigos:

| Camada | Tecnologia |
|-------|----------------|
| **Criar** | Configure o deal: nome, canal de verificação (X, Strava…), regra, meta, período, valor e tipo de premiação |
| **Convidar** | Participantes recebem o link e aceitam os termos |
| **Stake** | Todos depositam via PIX (onramp fiat → USDC) ou diretamente em SOL/USDC |
| **Snapshot** | App registra o estado inicial via API (ex: seguidores no momento do início) |
| **Monitorar** | **Risk Guardian** acompanha sinais em busca de anomalias em tempo real |
| **Verificar** | **DealGuard Engine** coleta dados e determina o resultado via consenso multi-agente |
| **Distribuir** | Programa Solana distribui o pot para os vencedores — automático, sem intermediário |

---

## 🏗️ Arquitetura Soberana (3-Layer Model)

TrueDeal não é apenas um app de apostas; é uma **Infraestrutura de Acordos Verificáveis**.

### 1. Camada de Inteligência de Risco (Risk Guardian)
Alimentada por agentes de IA proprietários, monitora a integridade de cada "deal" desde a criação até a liquidação, detectando bots, GPS fake e anomalias estatísticas.

### 2. Camada de Consenso e Atestação (DealGuard Engine)
Um motor de consenso multi-fonte que valida as evidências digitais (APIs, logs, check-ins). O veredito final só é emitido após um quorum de 2/3 de validadores autônomos.

### 3. Camada de Liquidação On-Chain (Solana)
O coração trust-less do protocolo. Programas Anchor gerenciam contas PDA (Escrow) que só liberam fundos mediante a prova criptográfica gerada pela **DealGuard Engine**.

---

## 🛠️ Stack Técnica

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| **Backend / Orchestrator** | Supabase (Postgres, Auth, Edge Functions) |
| **Blockchain** | **Solana** — Anchor framework (Rust), Escrow PDAs |
| **Risk Layer** | **Risk Guardian** (AI-driven monitoring) |
| **Verification Layer** | **DealGuard Engine** (Consensus Attestation) |
| **Managed Wallet** | Solana Account Abstraction (Encrypted server-side keys) |


### Programa Solana (Anchor)

O coração on-chain do True Deal é um programa Anchor que:

- Cria uma **conta PDA** (Program Derived Address) como escrow para cada deal
- Aceita stake em **USDC (SPL Token)** ou **SOL nativo**
- Recebe a resolução do oracle (backend verificador) e distribui o pot automaticamente
- Suporta 3 modos de distribuição: Proporcional · Top-3 Ranking · Winner Takes All
- Taxa de plataforma descontada on-chain (Regular 5% · Super 1%)

```
Fluxo on-chain:

[Usuário] --stake--> [PDA Escrow] --resolução (oracle)--> [Distribuição automática]
                         |
                    [Programa TrueDeal]
                    (Anchor / Rust · Solana Devnet)
```

### Configuração Solana

```bash
# Instalar Solana CLI
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

# Instalar Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install latest && avm use latest

# Configurar rede (Devnet para desenvolvimento)
solana config set --url devnet
solana-keygen new --outfile ~/.config/solana/id.json
solana airdrop 2  # SOL de teste no Devnet

# Build e deploy do programa
cd contracts/
anchor build
anchor deploy --provider.cluster devnet
```

**Program ID (Devnet):** `9zfQ1dwJ9Po7YCPWJ3S13ic3nxZcA9cEwBVsXdKub1c4`

**TDP Reputation Token (Devnet):**
| Campo | Valor |
|-------|-------|
| Mint Address | `3hwgvhV1PBj1N3vrRijqjFmJJLXM7Q2VvpdwLmWeaMbE` |
| Treasury | `EGcwkr3dgXGxpeRdqiWSG8JpNPoeBybp9xCchXKRepJF` |
| Supply | 1,000,000 TDP |
| Decimals | 6 |
| Explorer | [Ver no Solana Explorer](https://explorer.solana.com/address/3hwgvhV1PBj1N3vrRijqjFmJJLXM7Q2VvpdwLmWeaMbE?cluster=devnet) |

---

## 🛠 Setup Local (Frontend)

### Pré-requisitos

- Node.js 20+
- pnpm

### Instalação

```bash
# Clone o repositório
git clone https://github.com/lkr0102/truedeal.git
cd truedeal

# Instale dependências
pnpm install

# Configure as variáveis de ambiente
cp .env.example .env.local
# Preencha: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
# e NEXT_PUBLIC_SOLANA_NETWORK=devnet

# Inicie o servidor de desenvolvimento
pnpm dev
```

Acesse `http://localhost:3000`

### Variáveis de Ambiente

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Solana
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
TRUEDEAL_PROGRAM_ID=your_program_id

# APIs de verificação
X_API_BEARER_TOKEN=your_x_api_token
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
```

---

## 🗺️ Roadmap

| Fase | Status | Entregas |
|------|--------|----------|
| **MVP Frontend** | ✅ Pronto | Deal creation, detail, result, auth, onboarding |
| **Supabase Backend** | ✅ Pronto | Auth, DB schema, server actions |
| **Programa Solana** | ✅ Deployed (Scaffold) | Escrow PDA, multi-sig settlement, on-chain lock |
| **TDP Token** | ✅ Minted | SPL Token `3hwgvhV1PBj...` · 1M TDP na devnet |
| **DealGuard Oracle** | ✅ Implementado | Endpoint `/api/verify/x` com snapshots forenses |
| **Solana Explorer** | ✅ Integrado | Link de auditoria on-chain em todos os deals |
| **X API** | 🔄 Em progresso | OAuth, snapshot inicial, verificação de métricas |
| **Strava API** | 📋 Planejado | OAuth, km, check-ins, horas de treino |
| **PIX Onramp** | 📋 Planejado | Fiat → USDC via NoxPay |
| **Phantom Auth** | 📋 Planejado | Wallet-based login + Supabase Auth |
| **Wellhub / TotalPass** | 📋 Planejado | OAuth + check-ins |
| **Mobile (React Native)** | 📋 Fase 2 | iOS/Android nativo |
| **AI Oracle** | 📋 Fase 3 | Agente que cria deals via conversas nas redes |

---

## 🏆 Colosseum Frontier Hackathon

True Deal foi desenvolvido como projeto para o **[Colosseum Frontier Hackathon](https://www.colosseum.org/)** — a principal competição de builders do ecossistema Solana.

**Track:** Consumer Apps

**Por que Solana?**
- Fees de transação ~$0,00025 por operação — viável para stakes de qualquer tamanho
- Finalidade em ~400ms — UX sem espera perceptível
- USDC nativo como SPL Token — sem bridges, sem fricção
- Ecossistema de carteiras mobile maduro (Phantom, Backpack)
- Anchor framework permite contratos auditáveis e testáveis em Rust

**Diferenciais para o hackathon:**
- Consumer app real com UX polida para público não-nativo Web3
- Verificação automática via APIs externas + resolução on-chain
- Modelo de receita sustentável (fee por deal)
- Mercado LatAm sub-atendido + integração fiat (PIX) como onramp

---

## 📊 Concorrentes

| App | Stake | Verificação | Público |
|-----|-------|-------------|---------|
| Moonwalk | Pot coletivo | Passos (iOS Health) | Fitness |
| Beeminder | Stake pessoal | 50+ integrações | Power users |
| StickK | Stake + árbitro | Manual / humano | Geral |
| Polymarket | Cripto | Eventos globais | Cripto nativo |

**Nenhum combina:** accordos livres entre amigos + verificação automática por APIs + UX acessível + on-chain trust-less + mercado LatAm.

---

## 👤 Founder

**Lukas Rocha**  
[@lkrcripto](https://twitter.com/lkrcripto)

- 8 anos em publicidade e estratégia de comunicação (Propeg, SoloED, Humann, Brain Revolution)
- Ex-Marketing & Community Manager — ICP HUB Brasil
- Top 3 Arbitrum Ambassador BR
- Community Manager — TriadMarkets (maior prediction market BR)

---

<div align="center">

Feito com ❤️ por [Lukas Rocha](https://github.com/lkr0102) para o ecossistema Solana.

*Don't trust. Make a True Deal.*

</div>
