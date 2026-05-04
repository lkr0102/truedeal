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

| Etapa | O que acontece |
|-------|----------------|
| **Criar** | Configure o deal: nome, canal de verificação (X, Strava…), regra, meta, período, valor e tipo de premiação |
| **Convidar** | Participantes recebem o link e aceitam os termos |
| **Stake** | Todos depositam via PIX (onramp fiat → USDC) ou diretamente em SOL/USDC |
| **Snapshot** | App registra o estado inicial via API (ex: seguidores no momento do início) |
| **Monitorar** | Durante o período, o app acompanha automaticamente via APIs conectadas |
| **Verificar** | No fim, o app coleta dados e determina o resultado com provas digitais |
| **Distribuir** | Programa Solana distribui o pot para os vencedores — automático, sem intermediário |

---

## ✅ Features Disponíveis Hoje (MVP)

### Deal Creation — 2-step flow
- **Nome** personalizado do deal
- **Tipo** Regular (fee 5%) ou Super (fee 1%)
- **Categorias:** Social e Fitness ativos; Gaming, Learning, On-Chain e Free em breve
- **Canais sociais:** X (Twitter) ativo; Instagram, TikTok, LinkedIn, Discord, YouTube em breve
- **Canais fitness:** Strava, Wellhub e TotalPass ativos com seleção multi-canal e conector E/OU
- **Regra:** seleção da métrica verificável por canal (posts, seguidores, km, check-ins…)
- **Meta:** quantidade + frequência (por dia / semana / mês / ano)
- **Período:** presets (1 sem, 2 sem, 1 mês, 2 meses) + calendário customizável
- **Pagamento:** presets R$25/50/100/200/500 ou valor livre, pot estimado em tempo real
- **Premiação:** Proporcional 🤝 · Ranking 🏅 · Winner Takes All 👑
- **Visibilidade:** Privado ou Público
- **Tela de confirmação:** preview hero + resumo de todos os parâmetros + fee info

### Deal Detail
- Hero card com gradiente verde, status, progresso e chips de verificação
- Grid de stats (pote, entrada, participantes, dias)
- Minha posição + ganho potencial em tempo real
- Tabs: Participantes (aprovados / pagamento / pedidos) · Cronograma · Distribuição do pote
- Footer sticky com CTA contextual (tracking / entrar / resultado)

### Deal Result & Share
- Confetti animado ao entrar na tela
- Result hero com gradiente escuro→verde e prêmio em destaque
- Payout banner com confirmação de pagamento
- Ranking final com linha "você" destacada
- Distribuição do pote com barras de progresso
- Share card pronto para story (WhatsApp, Instagram, X, Telegram)
- Copiar link do deal

### Auth & Onboarding
- Login social (Google, Apple, X) via Supabase Auth
- Onboarding de perfil e survey de interesses
- Suporte a OAuth para vinculação de contas (X API, Strava)

### Explore & Home
- Lista de deals ativos, pendentes e finalizados
- Filtros por status e categoria

---

## 🏗️ Arquitetura Técnica

### Stack

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Shadcn UI |
| **Backend / BaaS** | Supabase (Postgres, Auth, Realtime, Storage, Server Actions) |
| **Blockchain** | **Solana** — Anchor framework (Rust), Devnet para dev, Mainnet-Beta para produção |
| **Token de stake** | USDC (SPL Token) + SOL nativo |
| **Carteira Web3** | Phantom / Backpack (Solana-native) |
| **Pagamento Fiat** | PIX → USDC via onramp (NoxPay / integrações BR) |
| **Verificação** | OAuth + REST APIs (X API, Strava, Wellhub, TotalPass) |
| **Autenticação** | Supabase Auth (social login) + Phantom wallet |

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

**Program ID (Devnet):** `TBD — deploy em andamento para o Hackathon`

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
| **Programa Solana** | 🔄 Em progresso | Escrow PDA, stake USDC/SOL, distribuição automática |
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
