# MVP Scope - Solana Frontier Hackathon (TrueDeal)

Este documento define as funcionalidades principais e os limites do MVP do TrueDeal para o hackathon Solana Frontier. O projeto encontra-se em estado **Due Diligence Ready**, com framework institucional consolidado.

## 1. Core Target
- **Plataforma**: Web (Next.js) com Mobile-first UX (Progressive Web App).
- **Blockchain**: Solana (Devnet).
- **Público**: Usuários focados em produtividade e performance (Foco inicial: Brasil).
- **Nomenclatura**: Framework de **Acordos de Performance** (Performance Agreements).

## 2. Funcionalidades Implementadas (In-Scope)

### 2.1 Criação de Acordos de Performance
- **Canais de Auditoria**: 
  - **Social**: X (Twitter) — métricas de engajamento e posts.
  - **Fitness**: Strava, Wellhub, TotalPass — kms percorridos, check-ins e sessões.
- **Regras**: Conectores lógicos para validação multicanal.
- **Parâmetros**: Título institucional, vigência definida, valor de garantia (BRL/USDC).
- **Liquidação**: Distribuição Proporcional, Ranking (Top 3) ou Beneficiário Único.

### 2.2 User Experience (Sovereign UX)
- **Custódia Gerenciada**: Criação automática de carteiras Solana vinculadas ao login (Supabase Auth).
- **Onboarding Institucional**: Configuração de perfil e critérios de auditoria.
- **Dashboard de Auditoria**: Acompanhamento em tempo real da vigência e status de adimplência.
- **Cartões de Performance**: Provas visuais de auditoria e cards de compartilhamento social.

### 2.3 Verificação & Segurança (TrueDeal Oracle)
- **TrueDeal Guard Engine**: Monitoramento em tempo real contra anomalias e atividade sintética (bots).
- **Escrow On-chain (Garantia)**: Bloqueio automatizado de ativos e liberação via programa Anchor após auditoria.
- **Adimplência Garantida**: Algoritmo de resolução baseado em consenso de sinais auditáveis.

## 3. Próximas Fases (Post-Hackathon)
- Super Acordos Pagos (Otimização de taxas).
- Canais Sociais Adicionais (Instagram, TikTok, YouTube).
- Oráculo de IA Avançado para criação de acordos em linguagem natural.
- Aplicativo Nativo (iOS/Android).

## 4. Métricas de Sucesso para Demo
- **Tempo de Estabelecimento**: < 30 segundos para criar um acordo.
- **Eficiência de Auditoria**: Validação e liquidação on-chain em < 2 segundos após o fim da vigência.
- **Due Diligence Ready**: Interface e arquitetura prontas para parcerias institucionais.
