# True Deal

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?style=for-the-badge&logo=typescript)
![React Native](https://img.shields.io/badge/React_Native-2024a-black?style=for-the-badge&logo=react)
![Supabase](https://img.shields.io/badge/Supabase-3-181818?style=for-the-badge&logo=supabase)
![Solidity](https://img.shields.io/badge/Solidity-363636?style=for-the-badge&logo=solidity)

**True Deal** ÔÇö O app que faz o seu combinado valer de verdade.

*"Don't trust. Make a Deal."*

</div>

## ­ƒôï ├ìndice

- [Sobre o Projeto](#sobre-o-projeto)
- [A Vis├úo](#a-vis├úo)
- [O Problema](#o-problema)
- [A Solu├º├úo](#a-solu├º├úo)
- [Tipos de Deal](#tipos-de-deal)
- [Telas do App](#telas-do-app)
- [Arquitetura T├®cnica](#arquitetura-t├®cnica)
- [An├ílise de Concorrentes](#an├ílise-de-concorrentes)
- [Roadmap](#roadmap)
- [Escopo do MVP](#escopo-do-mvp)
- [Stack Tecnol├│gico](#stack-tecnol├│gico)
- [Getting Started](#getting-started)
- [Contribui├º├úo](#contribui├º├úo)
- [Licen├ºa](#licen├ºa)

---

## ­ƒôû Sobre o Projeto

**True Deal** ├® um aplicativo mobile (iOS/Android) que atua como ├írbitro digital automatizado em acordos entre duas ou mais pessoas. Usa provas digitais verific├íveis ÔÇö APIs de redes sociais, apps de sa├║de, GPS, check-ins ÔÇö combinadas com smart contracts para garantir que o dinheiro fique bloqueado, a verifica├º├úo seja autom├ítica e a distribui├º├úo aconte├ºa sem interven├º├úo humana.

### Identidade

| Atributo | Valor |
|----------|-------|
| **Nome** | True Deal |
| **Handle** | @truedeal |
| **Dom├¡nio** | truedeal.app |
| **Tagline Principal** | "Don't trust. Make a Deal." |
| **Taglines Alternativas** | "Make a Deal." / "Make a true Deal." / "Deal with it." |

### Por que True Deal?

"Deal" puro se perde na amplitude da l├¡ngua inglesa. O adjetivo "True" qualifica e posiciona: n├úo ├® qualquer acordo, ├® um acordo verdadeiro. Refer├¬ncia impl├¡cita ao "Don't trust, verify" do Bitcoin ÔÇö que vira tagline sem alienar o p├║blico n├úo-nativo.

---

## ­ƒæü´©Å A Vis├úo

True Deal ├® um aplicativo mobile que atua como **├írbitro digital automatizado** em acordos entre duas ou mais pessoas.

> **Posicionamento em uma linha:** O app que faz o seu combinado valer de verdade.

### Diferenciais

- Ô£à Provas digitais verific├íveis (APIs de redes sociais, sa├║de, GPS)
- Ô£à Smart contracts para garantir distribui├º├úo autom├ítica
- Ô£à Pagamento dual (Pix + Cripto)
- Ô£à UX acess├¡vel para p├║blico n├úo-nativo Web3

---

## ÔØî O Problema

Apostas e combinados entre pessoas dependem 100% de confian├ºa e boa-f├®. **N├úo existe mecanismo que:**

- ÔØî Prove o estado inicial e final de forma objetiva e incontest├ível
- ÔØî Guarde e distribua o dinheiro sem favorecer nenhuma parte
- ÔØî Resolva o resultado automaticamente sem depender de julgamento humano

As solu├º├Áes existentes ou s├úo centralizadas demais, ou restritas a uma ├║nica m├®trica, ou voltadas exclusivamente para usu├írios cripto nativos ÔÇö afastando o p├║blico geral.

---

## ­ƒÆí A Solu├º├úo

### Fluxo de um Deal

| Etapa | O que acontece |
|-------|----------------|
| **01 ÔÇö Criar** | Founder define: nome, tipo de deal, participantes, valor por pessoa, datas de in├¡cio e fim, fator(es) de verifica├º├úo |
| **02 ÔÇö Convidar** | Participantes recebem link e aceitam os termos do deal |
| **03 ÔÇö Pagar stake** | Todos pagam via Pix ou cripto ÔÇö fundos ficam custodiados pelo app |
| **04 ÔÇö Snapshot inicial** | App registra o estado inicial via API (ex: contagem de seguidores no momento do in├¡cio) |
| **05 ÔÇö Monitorar** | Durante o per├¡odo, app acompanha automaticamente via APIs vinculadas |
| **06 ÔÇö Verificar** | Na data final, app coleta dados e determina os resultados com base em provas digitais |
| **07 ÔÇö Distribuir** | Smart contract distribui o pot para os vencedores |

### Modelo de Receita

- **Taxa de 3%** sobre o pot de cada Deal
- Exibida de forma transparente na tela de configura├º├úo
- Ex: 2 participantes ├ù R$50 = R$100 pot ┬À True Deal fee 3%

---

## ­ƒÄ» Tipos de Deal

### MVP ÔÇö 4 Tipos Principais

| Tipo | Exemplos | Fonte de verifica├º├úo |
|------|----------|---------------------|
| **Redes sociais** | Quem ganha mais seguidores em X, Instagram, TikTok em N dias | X API, Meta API, TikTok API (OAuth) |
| **Check-in di├írio** | Grupo faz check-in na academia todo dia; quem falha paga pro caixa | GPS + timestamp manual |
| **Atividade f├¡sica** | Quem corre mais km em 4 semanas | Apple Health / Google Fit API |
| **Meta livre** | Quem perde mais peso em 60 dias | Check-in manual com foto verificada |

### Tipos: Oficial vs. Privado

| Tipo | Descri├º├úo |
|------|-----------|
| **Oficial / Plataforma** | Deals criados pelo app ou parceiros. Templates validados, APIs garantidas, identifica├º├úo visual azul |
| **Privado / Grupo** | Deals criados entre amigos. Configura├º├úo livre, identifica├º├úo visual verde |

### Fatores de Verifica├º├úo M├║ltiplos

Um Deal pode combinar mais de um fator de verifica├º├úo. O usu├írio seleciona via abas (Redes sociais, Fitness, Check-in, On-chain) e adiciona os fatores dispon├¡veis conforme as contas que j├í vinculou no perfil.

---

## ­ƒô▒ Telas do App

O app possui **7 telas principais** no fluxo:

| Tela | Descri├º├úo |
|------|-----------|
| **Tela 0 ÔÇö Login / Onboarding** | M├║ltiplas op├º├Áes de entrada: Google, Apple, Telegram, Instagram, X, WalletConnect (Web3), Email |
| **Tela 0b ÔÇö Perfil** | Gerenciamento de contas e carteiras vinculadas (X, Google, Instagram, Telegram, MetaMask, Phantom, Apple Health) |
| **Tela 1 ÔÇö Home** | Dashboard com todos os deals ativos, pendentes e hist├│rico. Filtros por status, cards de deal com identifica├º├úo Oficial/Privado |
| **Tela 2 ÔÇö Criar Deal (Tipo)** | Grid 2├ù2 com os 4 tipos do MVP + se├º├úo 'Em breve' para tipos futuros |
| **Tela 3 ÔÇö Criar Deal (Configura├º├úo)** | Formul├írio completo: nome, participantes, per├¡odo, valor, fatores de verifica├º├úo, pagamento |
| **Tela 4 ÔÇö Deal ativo** | Tracking com countdown, placar, verifica├º├úo audit├ível, compartilhar placar |
| **Tela 5 ÔÇö Pagamento Pix** | QR Code din├ómico, timer de expira├º├úo (15 min), chave Pix copi├ível |
| **Tela 6 ÔÇö Resultado Final** | Card de resultado compartilh├ível, vencedor em destaque, stats do deal, link on-chain |

---

## ­ƒÅù´©Å Arquitetura T├®cnica

### Stack MVP

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| **Frontend Mobile** | React Native | Cross-platform iOS/Android, grande ecossistema, compat├¡vel com vibe coding |
| **Backend / BaaS** | Supabase | DB + Auth + Realtime + Storage em uma plataforma. Open source |
| **Pagamento Fiat** | NoxPay / Ef├¡ Bank | Pix nativo, cust├│dia de valores, API de webhooks |
| **Smart Contracts** | Solidity (Arbitrum L2) | Baixo custo de gas, seguran├ºa Ethereum |
| **Cust├│dia** | Centralizada (Supabase) | Para agilizar o MVP. Migrar para on-chain na Fase 2 |
| **Provas Digitais** | OAuth + REST APIs | X API, Meta API, Apple Health, Google Fit, TikTok API |
| **Autentica├º├úo** | Supabase Auth + WalletConnect | Social login + Web3 wallet em um s├│ fluxo |
| **Dev Tooling** | Cursor AI + Claude | Vibe coding para acelerar MVP solo |

---

## ­ƒôè An├ílise de Concorrentes

| App | Categoria | Stake | Diferencial |
|-----|-----------|-------|-------------|
| Moonwalk | Fitness / H├íbito | Pot coletivo | UX simples, foco em passos di├írios |
| Beeminder | Compromisso pessoal | Stake pessoal | 50+ integra├º├Áes de dados |
| StickK | Compromisso | Stake + ├írbitro humano | Arbitragem humana opcional |
| Polymarket | Prediction market | Bet em eventos | L├¡der global, alta liquidez |
| Kalshi | Prediction market | Bet regulado | Regulado CFTC (EUA) |
| Kleros | Resolu├º├úo de disputas | Stake em jurados | Arbitragem descentralizada |
| TriadMarkets | Prediction market | Bet em eventos | Maior prediction market BR |

### Oportunidade de Mercado

**Nenhum concorrente combina:**
1. Ô£à Acordos livres entre amigos ÔÇö n├úo s├│ eventos globais
2. Ô£à Verifica├º├úo autom├ítica por APIs reais com m├║ltiplos fatores
3. Ô£à Pagamento dual Pix + cripto
4. Ô£à UX desenhada para p├║blico n├úo-nativo com op├º├úo Web3 para nativos

---

## ­ƒù║´©Å Roadmap

| Fase | Per├¡odo | Entregas principais |
|------|---------|---------------------|
| **Fase 0 ÔÇö Conceito** | AbrÔÇôMai 2026 | Doc de projeto v0.2, benchmarks, wireframes 7 telas, defini├º├úo de stack |
| **Fase 1 ÔÇö MVP** | JunÔÇôAgo 2026 | App funcional: 2 tipos de deal, X API integrada, check-in manual, pagamento Pix, early testers |
| **Fase 2 ÔÇö Valida├º├úo** | SetÔÇôNov 2026 | 50 deals realizados, NPS, ajustes de UX, Meta API e Apple Health integradas |
| **Fase 3 ÔÇö Expans├úo** | Dez 2026ÔÇôFev 2027 | Pagamento cripto on-chain (Arbitrum), smart contracts auditados, sistema de grupos |
| **Fase 4 ÔÇö Escala** | 2027+ | SDK para terceiros, marketplace de desafios, token pr├│prio, expans├úo LatAm |

---

## ­ƒôª Escopo do MVP

### Ô£à Entra no MVP

- Telas 0 a 6 conforme wireframes v0.2
- Cria├º├úo de deals entre 2+ usu├írios
- 2 tipos de deal: Redes sociais (X API) + Check-in manual com foto
- Fatores de verifica├º├úo m├║ltiplos ÔÇö sele├º├úo em abas
- Pagamento via Pix (NoxPay) ÔÇö cust├│dia centralizada
- Distribui├º├úo autom├ítica ao vencedor
- Login social (Google + Apple) + WalletConnect b├ísico
- Notifica├º├Áes push para eventos do deal
- Card de resultado compartilh├ível (Tela 6)
- Identifica├º├úo visual Oficial vs. Privado

### ÔÅ│ Fica para depois do MVP

- Integra├º├úo com Meta API, TikTok, Apple Health, Google Fit
- Smart contracts on-chain e cust├│dia descentralizada
- Pagamento cripto completo
- Sistema de resolu├º├úo de disputas
- Deals oficiais com parceiros
- Token pr├│prio e SDK para terceiros

---

## ­ƒøá Stack Tecnol├│gico

### Frontend
- [Next.js 14](https://nextjs.org/) - Framework React full-stack (Web)
- [React Native](https://reactnative.dev/) - Mobile (iOS/Android)
- [TypeScript](https://www.typescriptlang.org/) - Tipagem est├ítica
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS utilit├írio
- [Shadcn UI](https://ui.shadcn.com/) - Componentes UI acess├¡veis

### Backend
- [Supabase](https://supabase.com/) - Backend as a Service
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/api-routes) - API integrada
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions) - A├º├Áes server-side

### Blockchain
- [Solidity](https://soliditylang.org/) - Smart contracts
- [Arbitrum](https://arbitrum.io/) - L2 Ethereum para baixo custo
- [WalletConnect](https://walletconnect.com/) - Conex├úo com carteiras Web3

### Pagamentos
- [NoxPay](https://noxpay.com.br/) - Pix nativo brasileiro
- [MetaMask](https://metamask.io/) - Carteira Web3
- [Phantom](https://phantom.app/) - Carteira Web3 (Solana)

---

## ­ƒÜÇ Getting Started

### Pr├®-requisitos

- Node.js 18+
- pnpm (gerenciador de pacotes)

### Instala├º├úo

```bash
# Clone o reposit├│rio
git clone https://github.com/lkr0102/truedeal.git

# Entre no diret├│rio
cd truedeal

# Instale as depend├¬ncias
pnpm install

# Inicie o servidor de desenvolvimento
pnpm dev
```

A aplica├º├úo estar├í dispon├¡vel em [http://localhost:3000](http://localhost:3000)

### Vari├íveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Exemplo de vari├íveis (ajuste conforme necess├írio)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## ­ƒæñ Founder

**Lukas Rocha** (S├úo Pedro, LKR)

- ­ƒôì Salvador, BA
- ­ƒîÉ Twitter: [@lkrcripto](https://twitter.com/lkrcripto)
- ­ƒùú´©Å Ingl├¬s C1/C2

### Experi├¬ncia

- **8 anos** de publicidade e comunica├º├úo estrat├®gica (Propeg BA, SoloED, Humann, Brain Revolution, OneTarget)
- **Ex-Marketing & Community Manager** ICP HUB Brasil
- **Top 3 Arbitrum Ambassador** brasileiro (maior L2 da Ethereum)
- **Community Manager & Ambassador** TriadMarkets (maior prediction market BR)

O projeto une vis├úo de produto e comunica├º├úo do founder com sua rede ativa em Web3, permitindo valida├º├úo acelerada com comunidades j├í engajadas na Tr├¡ade, Arbitrum e ICP.

---

## ­ƒñØ Contribui├º├úo

Contribui├º├Áes s├úo bem-vindas! Siga os passos abaixo:

1. Fork este reposit├│rio
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudan├ºas (`git commit -m 'Add nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

Consulte o arquivo [CONTRIBUTING.md](CONTRIBUTING.md) para mais detalhes.

---

## ­ƒôä Licen├ºa

Este projeto est├í sob a licen├ºa MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<div align="center">

Desenvolvido com ÔØñ´©Å por [Lukas Rocha](https://github.com/lkr0102)

*Don't trust. Make a Deal.*

</div>
