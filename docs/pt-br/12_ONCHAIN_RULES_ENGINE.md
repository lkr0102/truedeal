# Motor de Regras On-Chain (TrueDeal Sovereign Escrow)

Este documento atua como o **livro-razão das leis imutáveis** governando o ecossistema TrueDeal na blockchain Solana. Nenhuma interface gráfica (UI) ou script backend pode contornar essas regras.

## 1. Identidade do Protocolo
- **Framework:** Anchor (Rust)
- **Program ID:** `9zfQ1dwJ9Po7YCPWJ3S13ic3nxZcA9cEwBVsXdKub1c4`
- **Tipologia Legal:** Escrow Trustless para Acordos de Performance

## 2. Máquina de Estados (State Machine)
Um Acordo de Performance on-chain só pode existir em um de quatro estados mutuamente exclusivos (`AgreementStatus`):
1. **Formation (Formação):** Acordo criado, regras travadas, aguardando participantes fazerem o depósito da garantia.
2. **Active (Ativo):** Acordo iniciado e valendo. O capital no Escrow está congelado.
3. **Settled (Liquidado):** Performance verificada. Capital liberado ao Beneficiário.
4. **Cancelled (Cancelado):** Abortado por fraude detectada pelo Risk Guardian ou expiração sem resolução. Fundos liberados para *Refund*.

## 3. Regras de Inicialização (`init_performance_agreement`)
- O Criador deve pagar a taxa de aluguel (rent) da Solana para abrir o cofre.
- Um **PDA (Program Derived Address)** é gerado usando a seed `[b"agreement", agreement_id]`. Ninguém (nem o Criador, nem o Admin da TrueDeal) possui a chave privada deste cofre.
- As regras combinadas fora da rede são transformadas em um **Hash Criptográfico de 32 bytes (`rule_hash`)**. Este hash é "tatuado" no contrato, tornando impossível qualquer mudança de regras após a assinatura.

## 4. Regras de Adesão e Custódia (`join_agreement`)
- **Imutabilidade Financeira:** Todo participante deve depositar exatamente a `guarantee_amount` definida na criação. A blockchain rejeita depósitos parciais ou divergentes.
- A custódia sai completamente do usuário e entra no PDA Vault.
- O campo `total_guarantee` cresce deterministicamente, sem depender de bancos de dados Web2.

## 5. Regras de Liquidação de Performance (`settle_performance_agreement`)
A instrução mais crítica e blindada do projeto.

- **Filtro de Estado:** O contrato *pânic* (falha) com o erro `AgreementError::InvalidStatus` se tentarem liquidar um acordo já `Settled` ou `Cancelled`. Não há dupla-liquidação (Double-Spend).
- **A Regra do DealGuard Consensus (Multi-Sig):**
  Para que o contrato envie o dinheiro do cofre para o Beneficiário, **DUAS** chaves privadas distintas (Oráculo 1 e Oráculo 2) devem assinar a transação na mesma fração de segundo.
  `require!(ctx.accounts.oracle_1.is_signer && ctx.accounts.oracle_2.is_signer)`
- **Proof Hash:** A liquidação só ocorre mediante a anexação de um `proof_hash`, que é o atestado final da IA (Risk Guardian) provando que os requisitos do mundo real foram cumpridos. Se a assinatura não bater, erro `AgreementError::DealGuardConsensusFailed`.

## 6. Precedentes de Arbitragem
Em nenhuma circunstância o capital do Escrow pode ser movido sem a permissão expressa do consenso BFT (Byzantine Fault Tolerance) dos nós do DealGuard. Isso garante que a TrueDeal não atue como um banco não licenciado, mas puramente como uma infraestrutura de código-como-lei (Code-is-Law).

---
*TrueDeal Protocol: Trust is good, cryptographic verification is better.*
