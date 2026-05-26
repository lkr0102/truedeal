# On-Chain Logic & State Machine — TrueDeal

> **Última atualização:** 2026-05-26 — Migração de infraestrutura de rede para Mantle Network (L2 EVM); transações ERC-20; managed wallets EVM; preparação para Hackathon Mantle.

---

## 1. Estado Atual da Arquitetura On-Chain

> **Decisão arquitetural (2026-05-26):** A infraestrutura blockchain foi migrada para a rede **Mantle L2**. O fluxo financeiro acontece via contratos inteligentes em Solidity ou transferências diretas de tokens ERC-20 entre as managed wallets gerenciadas pelo backend.

**O que mudou:**
- Antes: Fluxo Solana (Anchor e SPL transfers)
- Agora: Fluxo EVM (Contratos em Solidity e transferências ERC-20 na Mantle Network)

**O que permanece:**
- State machine de negócio (formacao → ativo → liquidando → encerrado)
- Lógica econômica (Slacker Tax 3%)
- Provas criptográficas (SHA-256 proof hash)
- Multi-oracle consensus (lógica off-chain via API de Atestação)

---

## 2. Máquina de Estados do Acordo

```mermaid
stateDiagram-v2
    [*] --> formacao: createDeal()
    formacao --> ativo: Scheduler 00h GMT-3 (≥ 2 participantes)
    formacao --> cancelado: Scheduler 00h GMT-3 (< 2 participantes)
    ativo --> liquidando: Oráculo de IA inicia auditoria
    liquidando --> encerrado: settle() — fundos distribuídos
    cancelado --> [*]: Refund via ERC-20 transfer
    encerrado --> [*]
```

### Detalhes dos Estados

| Estado | Descrição | Transição |
|:-------|:----------|:----------|
| `formacao` | Aceita participantes; stake coletado via transferência ERC-20 | Scheduler automático |
| `ativo` | Período de performance em curso | Oráculo de IA |
| `cancelado` | Quórum não atingido; refund total via ERC-20 | Automático |
| `liquidando` | Auditoria em execução; fundos retidos | Oráculo → settle |
| `encerrado` | Payout executado; protocolo encerrado | Final |

---

## 3. Regras de Compliance por Janela (Strict Window Model)

O Oráculo de IA avalia cumprimento de forma **estrita por janela de frequência**:

```
Para cada janela de frequência no período do deal:
  SE cumprimento_da_janela < quantidade_configurada:
    → participante = PERDEDOR (irreversível naquela janela)
```

Uma janela perdida = eliminado, independente de outras janelas.

### Sub-regras por Tipo de Verificação

| `verification_type` | Canal | Sub-regras de validade |
|:--------------------|:------|:-----------------------|
| `post_feito` | X | Conta pública; post > 100 chars; conteúdo único no período |
| `seguidores_recebidos` | X, Instagram, TikTok, LinkedIn, YouTube | Delta líquido por janela (ganhos − perdas) ≥ N |
| `impressoes` | X, Instagram, TikTok, LinkedIn, YouTube | Total de impressões na janela ≥ N |
| `reposts_recebidos` | X, Instagram, TikTok | Total de reposts na janela ≥ N |
| `comentarios` | X, Instagram, TikTok, LinkedIn, YouTube | Total de comentários recebidos na janela ≥ N |
| `km_corridos` | Strava | Soma de atividades `Run` na janela ≥ N km |
| `horas_exercicio` | Strava | Tempo total de atividades na janela ≥ N horas |
| `checkins` | Strava, Wellhub, TotalPass | Número de check-ins registrados na janela ≥ N |
| `ambientes_diferentes` | Strava, Wellhub, TotalPass | Locais distinctos visitados na janela ≥ N |
| `pace` | Strava | Pace médio das corridas ≤ pace configurado (min/km) |

> **Dados insuficientes**: se o Oráculo de IA não conseguir coletar dados (token expirado, API offline, conta privada), o participante é tratado como não-cumprimento.

---

## 4. Lógica de Liquidação (Slacker Tax)

```
slacker_pool      = n_perdedores × entry_amount
platform_fee      = slacker_pool × 0.03
reward_per_winner = (slacker_pool − platform_fee) / n_vencedores
payout_winner     = entry_amount + reward_per_winner
```

**Implementação atual (ERC-20 direto):**
```typescript
// lib/actions/settlement.ts — settleDealProtocol()
// 1. Calcula vencedores via Oráculo de IA
// 2. Transferência ERC-20 de entry_amount de volta para cada vencedor
// 3. Transferência ERC-20 de reward_per_winner para cada vencedor
// 4. 3% fica retido na protocol wallet (treasury)
```

---

## 5. Segurança e Integridade

### Provas Criptográficas
- **Rule Hash**: SHA-256 das regras capturado no `createDeal`
- **Proof Hash**: SHA-256 do relatório forense gerado pelo Oráculo de IA no `settle`
- Qualquer pessoa pode verificar off-chain se os dados batem com o hash registrado no Mantle Explorer.

### Multi-Oracle (Off-Chain)
O sistema requer consenso de dois oráculos antes de executar qualquer liquidação, garantindo que as assinaturas correspondam aos hashes auditados.

### Managed Wallets
As chaves privadas EVM dos usuários são geradas no servidor, encriptadas com AES-256 e armazenadas de forma segura no Supabase. Nunca expostas ao browser.

---

## 6. Endereços de Referência (Mantle Testnet)

| Recurso | Endereço |
|:--------|:---------|
| ERC-20 USDC (Mantle Testnet) | Endereço do contrato implantado na rede de teste |
| TrueDeal Solidity Contract (v2) | Endereço do contrato inteligente de Escrow implantado |
| Oracle 1 / Fee Payer | Derivado de `APP_FEE_PAYER_KEY` |
| Oracle 2 | Derivado de `ORACLE_2_PRIVATE_KEY` |
