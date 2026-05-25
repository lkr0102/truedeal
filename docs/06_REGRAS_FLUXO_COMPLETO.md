# TrueDeal — Regras do Fluxo Completo

Este documento descreve as regras de negócio, o fluxo técnico e os casos de borda que governam a execução completa de um acordo dentro do TrueDeal. É a fonte de verdade para decisões de produto e engenharia.

---

## 1. Ciclo de Vida de um Acordo (State Machine)

Um acordo percorre os seguintes estados, em ordem:

```
formacao → ativo → liquidando → encerrado
        ↘ cancelado  (< 2 participantes no horário de início)
```

| Estado        | Descrição                                                                        | Quem pode mover?              |
|:--------------|:---------------------------------------------------------------------------------|:------------------------------|
| `formacao`    | Acordo criado; participantes ainda podem entrar até o horário de início          | Sistema (ao criar)            |
| `ativo`       | Iniciado automaticamente às 00h GMT-3 do `start_date`; entradas encerradas      | Scheduler automático          |
| `cancelado`   | Menos de 2 participantes no horário de início; stake devolvido a todos           | Scheduler automático          |
| `liquidando`  | DealGuard Engine em execução; auditoria e prova criptográfica em curso           | DealGuard Engine (automático) |
| `encerrado`   | Liquidação on-chain concluída; fundos distribuídos                               | DealGuard Engine              |
| `finalizado`  | Encerramento manual pelo criador (legado, sem on-chain)                          | Criador                       |

**Regra crítica:** Qualquer instrução on-chain que tente liquidar um acordo fora do estado `ativo` falha com `AgreementError::InvalidStatus`.

---

## 2. Criação do Acordo

### 2.1 Quem pode criar
- Qualquer usuário autenticado (via Supabase Auth).

### 2.2 Campos obrigatórios
| Campo                    | Tipo/Valores                                              | Regra                                                             |
|:-------------------------|:----------------------------------------------------------|:------------------------------------------------------------------|
| `title`                  | string                                                    | Obrigatório                                                       |
| `type`                   | `"publico"` \| `"privado"` \| `"oficial"`                 | Define o modelo de aprovação (ver §2.3)                           |
| `category`               | `"social"` \| `"fitness"` \| `"checkin"` \| `"free"`      | Define canais de verificação disponíveis                          |
| `verification_type`      | string (ex: `"social_followers"`, `"fitness_steps"`)      | Determina a métrica auditada                                      |
| `verification_channels`  | array (ex: `["x"]`, `["strava"]`)                         | Plataformas onde a evidência será coletada                        |
| `entry_amount`           | number (BRL)                                              | Valor do stake por participante                                   |
| `distribution`           | `"proportional"` *(MVP — único disponível)*               | Regra de divisão do pot (ver §6)                                  |
| `max_participants`       | number                                                    | Teto de vagas; entradas bloqueadas ao atingir                     |
| `allow_requests`         | boolean                                                   | Permite solicitações externas de participação                     |
| `start_date`             | ISO date string                                           | **Mínimo: D+1 a partir da data de criação** (ver §2.4)            |
| `end_date`               | ISO date string                                           | Deve ser posterior ao `start_date`                                |

### 2.3 Tipos de Acordo e Modelo de Privacidade

| Tipo       | Quem vê?            | Quem pode entrar?                                     |
|:-----------|:--------------------|:------------------------------------------------------|
| `publico`  | Todos os usuários   | Qualquer um, sem aprovação                            |
| `privado`  | Todos os usuários   | Qualquer um pode *solicitar*; criador precisa aprovar |
| `oficial`  | Todos os usuários   | Definido caso a caso (parceiros institucionais)        |

**Acesso por link compartilhado:** Em acordos `privado`, mesmo quem acessa via link de compartilhamento deve receber aprovação do criador antes de ser confirmado como participante.

### 2.4 Regras de data de início
- O `start_date` informado deve ser **pelo menos 1 dia após a data de criação** (D+1 mínimo). O formulário de criação deve bloquear datas inválidas no frontend.
- O deal inicia **automaticamente às 00h00 (GMT-3)** do dia configurado como `start_date`, via scheduler, sem necessidade de ação do criador ou de um administrador.
- No momento do início automático, o scheduler verifica o número de participantes:
  - **≥ 2 participantes:** deal transita para `ativo`; Shakes são creditados (ver §8).
  - **< 2 participantes:** deal transita para `cancelado`; stake de todos é devolvido integralmente.

### 2.5 Efeitos automáticos ao criar
1. Deal inserido no banco com `status: "formacao"`, `fee_pct: 3`, `mode: "regular"`.
2. Criador entra automaticamente como participante (`deal_participants`, `status: "active"`).
3. Shakes **não são creditados** na criação — somente quando o deal passar para `ativo` (ver §8).

---

## 3. Entrada de Participantes

### 3.1 Pré-condições para `joinDeal`
- Deal deve estar em `status: "formacao"`.
- Vagas disponíveis (`count < max_participants`).
- Usuário autenticado.
- Se o deal exige canal de verificação: usuário deve ter a conta social vinculada e verificada (não `pending`) em `social_connections`.

### 3.2 Canais de verificação suportados
| Chave       | Plataforma  | Tipo de vinculação   |
|:------------|:------------|:---------------------|
| `x`         | X / Twitter | OAuth (access_token) |
| `instagram` | Instagram   | OAuth                |
| `tiktok`    | TikTok      | OAuth                |
| `linkedin`  | LinkedIn    | OAuth                |
| `discord`   | Discord     | OAuth                |
| `youtube`   | YouTube     | OAuth                |
| `strava`    | Strava      | OAuth (access_token) |
| `wellhub`   | Wellhub     | E-mail de membro     |
| `totalpass` | TotalPass   | E-mail de membro     |

### 3.3 Efeitos ao entrar
1. Registro em `deal_participants` com `status: "active"`.
2. `start_snapshot` pode ser preenchido com os dados atuais do canal (ex: `{ followers: 12840 }`) para baseline da auditoria.
3. Shakes **não são creditados** na entrada — somente quando o deal passar para `ativo` (ver §8).

### 3.4 Erro de duplicata
Se o usuário já é participante, o banco retorna código `23505` (unique constraint). A resposta ao usuário é: *"Você já está participando deste acordo."*

---

## 4. Início Automático (Scheduler)

O scheduler é executado às **00h00 GMT-3** de cada dia e avalia todos os deals com `start_date` igual à data corrente e `status: "formacao"`.

```
Para cada deal elegível:
  SE participants.count >= 2:
    → status: "ativo"
    → Creditar 500 Shakes ao criador (reason: "deal_create")
    → Creditar 200 Shakes a cada participante (reason: "deal_join")
    → start_snapshot de cada participante é registrado
  SENÃO:
    → status: "cancelado"
    → Devolver stake a todos os participantes
    → Nenhum Shake é creditado
```

- Durante `ativo`, **nenhuma nova entrada é aceita**.
- O campo `current_snapshot` dos participantes pode ser atualizado periodicamente pela DealGuard Engine para tracking de progresso.

---

## 5. Regras de Cumprimento — Frequência, Período e Sub-regras

### 5.1 Princípio de cumprimento exato

Para ser considerado **vencedor**, o participante deve cumprir a regra definida pelo criador **em todas as janelas de frequência durante todo o período do deal**. O descumprimento em qualquer janela, independentemente do desempenho nas demais, classifica o participante como **perdedor**.

**Exemplo:** Deal com regra de 5 posts semanais durante 1 mês (4 semanas).

| Semana | Posts realizados | Válido? |
|:-------|:-----------------|:--------|
| 1      | 5                | ✅       |
| 2      | 5                | ✅       |
| 3      | 5                | ✅       |
| 4      | 4                | ❌       |

→ Resultado: **perdedor**. O cumprimento das semanas 1–3 não compensa a falha na semana 4.

**Regra geral:**
```
Para cada janela de frequência no período do deal:
  SE cumprimento_da_janela < quantidade_configurada:
    → participante = PERDEDOR (independente das demais janelas)
```

A avaliação é feita ao final do período pelo DealGuard Engine, que cruza os dados coletados por janela com a regra configurada na criação.

---

### 5.2 Regras por canal de verificação e suas sub-regras

#### 5.2.1 Canal: X (Twitter) — Posts

**Regra:** `post_feito` — o participante deve publicar pelo menos N posts dentro de cada janela de frequência.

Sub-regras para que um post seja considerado **válido**:
- A conta deve ser **pública** no momento da verificação.
- O post deve ter **mais de 100 caracteres**.
- O conteúdo deve ser **único** dentro do período do deal: nenhuma outra publicação do mesmo usuário durante o deal pode ter conteúdo idêntico ou substancialmente semelhante (verificado pelo DealGuard Engine via análise semântica).

Posts que violem qualquer sub-regra são desconsiderados da contagem da janela.

---

#### 5.2.2 Canal: X / Instagram / TikTok / LinkedIn / YouTube — Seguidores recebidos

**Regra:** `seguidores_recebidos` — a conta verificada deve **ganhar** pelo menos N seguidores dentro de cada janela de frequência.

- A baseline de seguidores é registrada no `start_snapshot` no momento em que o deal passa para `ativo`.
- A cada janela, o DealGuard Engine compara o total atual com o total da janela anterior para calcular o delta.
- O requisito é sobre **ganho líquido** na janela (novos seguidores menos perdidos), não sobre o total acumulado.

A mesma lógica de verificação (baseline → delta por janela → comparação com mínimo configurado) aplica-se às regras abaixo:

| Regra                | Métrica verificada                              | Canal(is)                              |
|:---------------------|:------------------------------------------------|:---------------------------------------|
| `impressoes`         | Total de impressões nas publicações da janela   | X, Instagram, TikTok, LinkedIn, YouTube|
| `reposts_recebidos`  | Total de reposts/compartilhamentos na janela    | X, Instagram, TikTok                  |
| `comentarios`        | Total de comentários recebidos na janela        | X, Instagram, TikTok, LinkedIn, YouTube|

---

#### 5.2.3 Canal: Strava — Km corridos

**Regra:** `km_corridos` — o participante deve registrar pelo menos N km em corridas dentro de cada janela de frequência.

- Apenas atividades com tipo `Run` (corrida) são contabilizadas.
- Distâncias são somadas dentro da janela.
- O DealGuard Engine valida os dados via API do Strava com o `access_token` do participante.

A mesma lógica de soma por janela aplica-se às regras:

| Regra                  | Métrica verificada                                               | Canal(is)                     |
|:-----------------------|:-----------------------------------------------------------------|:------------------------------|
| `horas_exercicio`      | Tempo total de atividade registrado na janela (em horas)         | Strava                        |
| `checkins`             | Número de check-ins realizados em academias/espaços na janela    | Strava, Wellhub, TotalPass    |
| `ambientes_diferentes` | Número de locais/academias distintos visitados na janela         | Strava, Wellhub, TotalPass    |

---

#### 5.2.4 Canal: Strava — Pace

**Regra:** `pace` — o participante deve manter um pace **igual ou menor** ao valor configurado pelo criador em suas corridas, dentro de cada janela de frequência.

- O pace é calculado em min/km a partir das atividades de corrida do período.
- O DealGuard Engine calcula o **pace médio** das corridas registradas na janela.
- A condição de cumprimento é: `pace_médio_da_janela ≤ pace_configurado`.
- Exemplo: criador configura pace de 6:00 min/km → participante com média de 5:45 cumpre; participante com média de 6:10 não cumpre.

> **Pendência de UI:** A interface de configuração do pace deve ser atualizada para deixar a regra mais didática — exibindo claramente que o valor configurado é o **limite máximo** (quanto menor, mais rápido), e não um alvo mínimo.

---

### 5.3 Comportamento em caso de dados insuficientes

Se o DealGuard Engine não conseguir coletar dados de um participante em uma janela, o participante é tratado como **não-cumprimento** naquela janela, resultando em status de perdedor.

**Tokens OAuth expirados são renovados automaticamente** pelo DealGuard Engine antes de cada request à API da plataforma (Strava e X). Se o refresh falhar (token revogado, permissões removidas pelo usuário), aí sim o participante é marcado como não-cumprimento.

Razões que resultam em não-cumprimento:
- Token OAuth revogado pelo usuário ou expirado sem refresh token válido.
- Conta alterada para privada após o início do deal.
- Falha permanente na API da plataforma (registrada em `audit_logs`).

Razões que **não** resultam em não-cumprimento (tratadas automaticamente):
- Token OAuth expirado mas refresh token válido → renovado silenciosamente antes da coleta.

---

## 6. Auditoria e Liquidação (DealGuard Engine)

O settlement é disparado pelo backend via `settleDealProtocol(dealId, beneficiaryWalletAddress)`.

### 6.1 Pipeline de liquidação

```
1. DealGuard Audit
   └─ Para cada participante:
      └─ Busca dados da API (Strava, X, etc.)
      └─ Valida regra de desempenho (ex: correu 10km? postou 1x?)
      └─ Sentinel AI analisa evidências → risk score + isFraudulent

2. Geração de Prova Forense (SHA-256)
   └─ Hash determinístico de dealId + resultados de auditoria
   └─ 32 bytes gravados on-chain como `proof_hash`

3. Supabase: deal → status "liquidando"
   └─ proof_hash e audit_logs persistidos

4. Liquidação On-Chain (Solana / Anchor)
   └─ Modo produção: dois keypairs de oráculo assinam (Multi-Sig)
   └─ Modo demo: simula tx sem gas real

5. Supabase: deal → status "encerrado"
   └─ solana_tx_signature persistida
   └─ URL do Solana Explorer disponível
```

### 6.2 Modos de execução

| Condição                                         | Modo     | Comportamento                             |
|:-------------------------------------------------|:---------|:------------------------------------------|
| `APP_FEE_PAYER_KEY` e `APP_ORACLE2_KEY` ausentes | Demo     | Simula TX; banco atualizado normalmente   |
| `NEXT_PUBLIC_SUPABASE_URL` placeholder           | Demo     | Idem                                      |
| Ambas as chaves presentes + Supabase real        | Produção | Executa instrução Anchor no Solana Devnet |

### 6.3 Regra de fraude
Se o Sentinel AI detectar fraude (`isFraudulent: true`), o participante é marcado como não-sucesso independentemente da métrica bruta. O `fraud_reason` é registrado no `audit_logs`.

---

## 7. Modelo Econômico — "Slacker Tax" (Taxa dos Perdedores)

A taxa de 3% incide **apenas sobre o pool dos participantes que falharam**, nunca sobre o total.

### 7.1 Cálculo

```
Pool total          = entry_amount × total_participantes
Pool dos perdedores = entry_amount × num_perdedores
Taxa plataforma     = pool_perdedores × 0.03
Pool distribuível   = pool_perdedores − taxa_plataforma + pool_vencedores
```

*(Os vencedores recebem o stake de volta + sua fatia do pool distribuível.)*

### 7.2 Exemplo numérico

| Item                                       | Valor           |
|:-------------------------------------------|:----------------|
| Participantes                              | 10              |
| Stake por pessoa                           | R$ 10           |
| Pool total em escrow                       | R$ 100          |
| Resultado: 6 vencedores, 4 perdedores      | —               |
| Pool dos perdedores                        | R$ 40           |
| **Taxa TrueDeal (3%)**                     | **R$ 1,20**     |
| Pool distribuível                          | R$ 38,80        |
| Retorno por vencedor                       | R$ 16,47 (+64%) |

### 7.3 Por que funciona
- Vencedores **nunca pagam taxa** — a plataforma só lucra no descumprimento alheio.
- Usuários comprometidos são incentivados a convidar perfis menos disciplinados (Network Effect).
- Narrativa institucional: TrueDeal audita contratos de performance, não aposta.

### 7.4 Modos de distribuição (MVP vs. roadmap)

| Modo           | Disponibilidade | Descrição                                              |
|:---------------|:----------------|:-------------------------------------------------------|
| `proportional` | ✅ MVP           | Pote final dividido entre todos que cumprirem o acordo |
| `top3`         | 🔜 Em breve      | Top 3: 60% · 30% · 10%                                 |
| `winner`       | 🔜 Em breve      | 100% para quem chegar na frente                        |

---

## 8. Regras On-Chain (Solana / Anchor)

### 8.1 Identidade do protocolo
- **Framework:** Anchor (Rust)
- **Program ID:** `9zfQ1dwJ9Po7YCPWJ3S13ic3nxZcA9cEwBVsXdKub1c4`
- **Rede atual:** Solana Devnet

### 8.2 PDA (Program Derived Address)
```
Seeds: [b"deal", deal_id_bytes]
```
Nenhuma chave privada controla este vault. Somente a lógica do programa move os fundos.

### 8.3 Instrução `join_agreement`
- Usuário deposita exatamente `entry_amount` (SOL/USDC).
- Blockchain rejeita depósito divergente.
- Custody transferida do wallet do usuário para o PDA Vault.

### 8.4 Instrução `settle_performance_agreement`
- Exige assinatura simultânea de **dois oráculos distintos** (`oracle_1` e `oracle_2`).
- Requer `proof_hash` (32 bytes) gerado pela DealGuard Engine.
- Falha com `AgreementError::DealGuardConsensusFailed` se assinaturas não corresponderem.
- Falha com `AgreementError::InvalidStatus` se deal não estiver em `ativo`.

### 8.5 Abstração de conta (Account Abstraction)
Para MVP, cada usuário possui uma **carteira gerenciada** (`user_wallets.encrypted_secret`) cujo segredo é criptografado no servidor. O usuário não precisa instalar wallet. O backend assina transações em nome do usuário.

---

## 9. Sistema de Reputação — Shakes

Shakes são os pontos de reputação do TrueDeal. **Nenhum Shake é creditado no momento da criação ou da entrada** — todos os créditos abaixo dependem do deal transitar de `formacao` para `ativo` (ou seja, ter ≥ 2 participantes confirmados no horário de início).

| Evento                              | Razão           | Shakes |
|:------------------------------------|:----------------|:-------|
| Deal passa para `ativo` — criador   | `deal_create`   | +500   |
| Deal passa para `ativo` — cada participante | `deal_join` | +200 |
| Vencer um acordo                    | `deal_win`      | +?     |
| Check-in diário                     | `daily_checkin` | +?     |
| Streak 7 dias                       | `streak_7d`     | +?     |
| Streak 30 dias                      | `streak_30d`    | +?     |
| Indicação de usuário                | `referral`      | +?     |
| Vincular rede social                | `social_link`   | +?     |

> Shakes não têm valor monetário no MVP. Uso futuro: desconto de taxa, tier Sovereign (1.000 Shakes → taxa 1%), acesso antecipado a funcionalidades.

---

## 10. Casos de Borda e Tratamentos

| Cenário                                        | Tratamento                                                                 |
|:-----------------------------------------------|:---------------------------------------------------------------------------|
| **< 2 participantes no horário de início**     | Deal cancelado automaticamente; stake devolvido; nenhum Shake creditado    |
| **Todos os participantes vencem**              | Pool de perdedores = R$0; taxa = R$0; todos recebem o stake de volta       |
| **Ninguém vence**                              | Pool total refundado a todos; deal encerrado sem distribuição de prêmio    |
| **Fraude detectada pelo Sentinel**             | Participante fraudador marcado como perdedor; stake retido no pool         |
| **Deal lotado**                                | `joinDeal` retorna "Acordo lotado"; nenhuma entrada permitida              |
| **Deal já iniciado**                           | `joinDeal` retorna "Este acordo já iniciou" se status ≠ `formacao`         |
| **`start_date` = hoje na criação**             | Frontend bloqueia; data mínima é D+1                                       |
| **Usuário sem conta social vinculada**         | `joinDeal` retorna erro pedindo vinculação do canal exigido                |
| **Participante duplicado**                     | Banco retorna `23505`; resposta: "Você já está participando deste acordo"  |
| **Oracle keys ausentes**                       | DealGuard executa em modo demo (simulação de TX)                           |
| **Timeout de resolução**                       | A ser implementado: `refund_all()` desbloqueado no smart contract          |

---

## 11. Escopo MVP vs. Roadmap

### Disponível no MVP
- Criação de deals com distribuição proporcional
- Tipos: público, privado (com aprovação do criador)
- Verificação via Strava e X (Twitter)
- Account Abstraction (carteira gerenciada)
- DealGuard Engine em modo demo (sem gas real)
- Sistema de Shakes (pontos de reputação)
- Referral code por usuário
- Início automático via scheduler (00h GMT-3)
- Cancelamento automático por quórum insuficiente (< 2 participantes)

### Em breve (pós-MVP)
- Distribuição `top3` e `winner`
- Liquidação on-chain real (Solana Devnet → Mainnet)
- Suporte a Instagram, TikTok, LinkedIn, Discord, YouTube
- Valores de Shakes para vitória, streaks e referrals
- Modo DeFi (Zero-Fee Yield Escrow via Kamino/MarginFi)
- Tier Sovereign via Shakes

---

*Documento gerado com base no código-fonte, schema Supabase, contratos Anchor e decisões de produto documentadas. Atualizar sempre que houver mudança de regra de negócio.*
