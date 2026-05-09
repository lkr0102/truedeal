# MVP Scope - Solana Frontier Hackathon (TrueDeal)

Este documento define as funcionalidades principais e os limites do MVP do TrueDeal para o hackathon Solana Frontier. O projeto encontra-se em estado **Due Diligence Ready**, com framework institucional consolidado.

## 1. Core Target
- **Plataforma**: Web (Next.js) com Mobile-first UX (Progressive Web App).
- **Blockchain**: Solana (Devnet).
- **Público**: Usuários focados em produtividade e performance (Foco inicial: Brasil).
- **Nomenclatura**: Framework de **Acordos de Performance** (Performance Agreements).

## 2. Funcionalidades Implementadas (In-Scope)

### 2.1 Criação de Acordos de Performance
- [x] **Canais de Auditoria (Mocked/Demo)**: X (Twitter) simulado para aprovação em Demo.
- [ ] **Integração Real de Canais**: Strava, Wellhub, TotalPass via OAuth real.
- [x] **Matriz de Regras**: Utilizar `11_CONTRACT_RULES_TEMPLATE.md` para mapear regras de UX para a lógica soberana on-chain.
- [ ] **Implementação das Regras (Lukas -> João)**: Lukas desenha as regras sociais no template; João codifica as restrições no programa Anchor da Solana.
- [x] **Parâmetros**: Título institucional, vigência definida, valor de garantia (BRL/USDC).
- [x] **Liquidação**: Distribuição Proporcional, Ranking (Top 3) ou Beneficiário Único.

### 2.2 User Experience (Sovereign UX)
- [x] **Custódia Gerenciada**: Criação automática de carteiras Solana vinculadas ao login (Supabase Auth) usando AES-256-GCM.
- [x] **Sovereign Demo Auth Layer**: Fallback automático e bypass de login para o Hackathon (Judge-Proof).
- [x] **Onboarding Institucional**: Configuração de perfil e critérios de auditoria.
- [x] **Dashboard de Auditoria**: Acompanhamento em tempo real da vigência e status de adimplência.
- [x] **Cartões de Performance**: Provas visuais de auditoria e integração com botão de liquidação.

### 2.3 Verificação & Segurança (DealGuard Engine)
- [x] **DealGuard Engine**: Motor de consenso estruturado (Oracle 1 e Oracle 2 multisig).
- [x] **Escrow On-chain (Garantia)**: Smart contract (Anchor) que bloqueia os fundos (`init_performance_agreement` e `join_agreement`).
- [x] **Liquidação Soberana**: Botão "Finalizar Acordo" que aciona o `settle_performance_agreement` on-chain (Fallback Demo ativado se faltar chaves).
- [ ] **Integração Sentinel-01 (Node 3)**: Conexão real com o modelo Qwen para auditoria comportamental de dados reais.

## 3. Próximas Fases (Post-Hackathon)
- [ ] Super Acordos Pagos (Otimização de taxas).
- [ ] Canais Sociais Adicionais (Instagram, TikTok, YouTube).
- [ ] Oráculo de IA Avançado para criação de acordos em linguagem natural.
- [ ] Aplicativo Nativo (iOS/Android).

## 4. Métricas de Sucesso para Demo
- [x] **Tempo de Estabelecimento**: < 30 segundos para criar um acordo.
- [x] **Eficiência de Auditoria**: Validação e liquidação on-chain com fallback garantido para a banca julgadora.
- [x] **Due Diligence Ready**: Interface e arquitetura prontas para parcerias institucionais e investidores.
