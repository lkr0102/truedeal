# 🤖 On-Chain Logic: Contract State Machine

Este documento detalha o fluxo lógico e financeiro do Smart Contract TrueDeal na Solana, servindo de base para auditorias técnicas e integrações de backend.

> **Última atualização:** 2026-05-10 — Regras de compliance por janela documentadas; UX de sub-regras sincronizado com a máquina de estados.

---

## 1. Fluxo de Vida do Acordo (State Machine)

```mermaid
stateDiagram-v2
    [*] --> Formation: init_performance_agreement
    Formation --> Active: Scheduler (Quorum Reached)
    Formation --> Cancelled: Scheduler (Quorum Failed)
    Active --> Settled: settle_performance_agreement (Success/Audit)
    Cancelled --> [*]
    Settled --> [*]
```

### Detalhes dos Estados:
- **Formation**: O contrato aceita `join_agreement`. Os fundos ficam travados no PDA.
- **Active**: O período de performance começou. Nenhum novo participante pode entrar.
- **Settled**: A auditoria foi concluída. O Slacker Tax foi retido e os prêmios distribuídos.
- **Cancelled**: Fundos devolvidos integralmente aos participantes.

---

## 1b. Regras de Compliance por Janela (Strict Window Model)

O DealGuard Engine avalia o cumprimento de forma **estrita por janela de frequência**. A UI de todas as telas de deal espelha esta lógica desde 2026-05-10.

### Princípio
```
Para cada janela de frequência no período do deal:
  SE cumprimento_da_janela < quantidade_configurada:
    → participante = PERDEDOR (irreversível)
```
Uma janela perdida = eliminado, independente de qualquer outra janela.

### Sub-regras por Tipo de Verificação

| `verification_type` | Canal | Sub-regras de validade |
|:--------------------|:------|:-----------------------|
| `post_feito` | X | Conta pública; post > 100 chars; conteúdo único no período |
| `seguidores_recebidos` | X, Instagram, TikTok, LinkedIn, YouTube | Delta líquido por janela (ganhos − perdas) ≥ N |
| `impressoes` | X, Instagram, TikTok, LinkedIn, YouTube | Total de impressões das publicações da janela ≥ N |
| `reposts_recebidos` | X, Instagram, TikTok | Total de reposts/compartilhamentos na janela ≥ N |
| `comentarios` | X, Instagram, TikTok, LinkedIn, YouTube | Total de comentários recebidos na janela ≥ N |
| `km_corridos` | Strava | Soma de distâncias de atividades `Run` na janela ≥ N km |
| `horas_exercicio` | Strava | Tempo total de atividades na janela ≥ N horas |
| `checkins` | Strava, Wellhub, TotalPass | Número de check-ins registrados na janela ≥ N |
| `ambientes_diferentes` | Strava, Wellhub, TotalPass | Locais/academias distintos visitados na janela ≥ N |
| `pace` | Strava | Pace médio das corridas da janela ≤ pace configurado (min/km) |

> **Nota Pace**: O valor configurado é o **limite máximo** — quanto menor o número, mais rápido. A UI exibe `"Pace máximo (min/km) — ← menor = mais rápido"` para deixar isso explícito.

### Dados insuficientes
Se o DealGuard não conseguir coletar dados de um participante em uma janela (token expirado, API indisponível, conta privada), o participante é tratado como **não-cumprimento** naquela janela.

---

## 2. Lógica de Liquidação e Slacker Tax

A liquidação é o momento onde a "Lei do Código" é aplicada.

### Algoritmo de Distribuição:
1. **Identificação**: O DealGuard fornece o `winners_count`.
2. **Cálculo do Slacker Pool**:
   `slacker_pool = (total_participants - winners_count) * guarantee_amount`
3. **Taxa de Sustentabilidade (3%)**:
   `platform_fee = slacker_pool * 0.03`
4. **Prêmio Líquido**:
   `reward_per_winner = (slacker_pool - platform_fee) / winners_count`
5. **Payout Final**:
   `total_payout = guarantee_amount + reward_per_winner`

---

## 3. Segurança e Consenso (DealGuard)

O contrato implementa uma camada de **Consenso Off-Chain para Execução On-Chain**.

### Multi-Sig de Oráculos:
Para que a função `settle_performance_agreement` execute, o contrato verifica:
- `require!(ctx.accounts.oracle_1.is_signer && ctx.accounts.oracle_2.is_signer)`
Isso garante que mesmo que uma chave de oráculo seja comprometida, o hacker não consegue liquidar o contrato sozinho.

### Integridade dos Dados (Hashing):
- **Rule Hash**: Hash SHA-256 das regras (Markdown/PDF) capturado no `init`.
- **Proof Hash**: Hash SHA-256 do relatório forense da auditoria capturado no `settle`.
Qualquer pessoa pode validar off-chain se os dados da auditoria batem com o que foi registrado no contrato.

---

## 4. Estrutura de Contas (PDAs)

O TrueDeal utiliza Program Derived Addresses para máxima segurança:
- **Agreement Account**: `seeds = [b"agreement", agreement_id]`
- **Vault Account**: A conta de token (SPL Token) que pertence ao PDA do acordo.

---
**"A confiança não é dada ao código; ela é extraída através de provas matemáticas de integridade."** 🖖
