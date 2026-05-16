# TrueDeal: Technical Handover & Agent Sync

Este documento fornece o contexto técnico imediato para agentes de IA operando no repositório TrueDeal.

## 1. Estado Atual da Infraestrutura (Build & Deploy)
- **Toolchain:** Solana 1.18.26 / Anchor 0.29.0 / Rust Edition 2021 (SBF Legacy).
- **Build System:** **Sovereign Build Pipeline** estável. Dependências transitivas (`indexmap`, `hashbrown`, `toml_datetime`) patcheadas cirurgicamente no `vendor/` para compatibilidade com o compilador SBF (Rust 1.75/1.79).
- **Deploy:** Sistema de **ID Dinâmico Autônomo**. O CI gera uma chave nova, injeta o ID no código e faz o deploy.
- **Release Oficial:** `v0.1.0-alpha.1` (Contém o binário `.so` e o `idl.json` auditáveis).
- **Program ID Atual:** `HdMnEf5jc3q6tws2vYLZgFgwFWKkKpNaK5CRKnF3a7mp` (Devnet).

## 2. Componentes Principais e Localização
- **Smart Contract:** `contracts/solana/programs/truedeal/src/lib.rs` (Lógica de Escrow e Liquidação).
- **Frontend Core:** `app/` e `components/` (Interface Next.js).
- **Escopo Técnico:** `task_master_scope.md` (O guia definitivo de regras e intervenções institucionais).

## 3. Comandos de Verificação e Sincronia
- **Build do Contrato:** `cd contracts/solana && anchor build` (Use o script `zero_checksums.py` se alterar o vendor).
- **Sincronia de ID:** Sempre verifique o ID mais recente no último GitHub Release antes de atualizar o frontend.
- **Saldo da Carteira:** A carteira pagadora `1ZixuegY1EPvDeybLLGXW29aM2WuC4kA8dcfXbSNoNW` deve estar abastecida na Devnet.

## 4. Handover para Lukas (Frontend Engineer)
1. **Blockchain Integration:** Use o `idl.json` anexado ao Release `v0.1.0-alpha.1` para regenerar os tipos se necessário.
2. **Program ID:** O ID oficial para o frontend é `HdMnEf5jc3q6tws2vYLZgFgwFWKkKpNaK5CRKnF3a7mp`.
3. **Settle Hook:** Lukas deve garantir que a chamada para `settleDealProtocol` no frontend aponte para este ID e use os oráculos corretos definidos no contrato.

> [!IMPORTANT]
> **Soberania de ID:** O ID do programa no repositório local é temporário. O **ID Verdadeiro** é o que o CI gera e injeta. **NUNCA** tente fixar um ID manualmente sem sincronizar com o workflow de deploy.
> **Manutenção:** Mantenha a Fee Payer Wallet abastecida para evitar falhas de deploy por "insufficient funds".
