# TrueDeal: Technical Handover & Agent Sync

Este documento fornece o contexto técnico imediato para agentes de IA operando no repositório TrueDeal.

## 1. Estado Atual da Infraestrutura (Build & Deploy)
- **Toolchain:** Solana 1.17.31 / Anchor 0.30.1 / Rust Edition 2021 (SBF Legacy).
- **Build System:** Sistema de **Vendoring Total** patcheado cirurgicamente em `contracts/solana/vendor/`.
- **Status:** Estabilização v5 (Build #39). O lockfile foi sanitizado de blocos órfãos e as dependências Edition 2024 (toml_edit 0.25) foram neutralizadas.
- **Lockfile:** Fixado na **Versão 3** e limpo via script para parsing determinístico.


## 2. Componentes Principais e Localização
- **Smart Contract:** `contracts/solana/programs/truedeal/src/lib.rs` (Lógica de Escrow e Liquidação).
- **Frontend Core:** `app/` e `components/` (Interface Next.js).
- **Relatório de Auditoria:** `docs/audit-kit/00_DELIVERY_REPORT.md` (Resumo executivo do que foi entregue).
- **Mapas de Interface:** `docs/audit-kit/03_UI_UX_MAP.md` (Fluxos de tela e lógica de estados).

## 3. Comandos de Verificação
- **Build do Contrato:** `cd contracts/solana && anchor build -- --offline`
- **Deploy Manual (Se necessário):** `solana program deploy target/deploy/truedeal.so`

## 4. Próximos Passos Imediatos
1. **Monitoramento de CI:** Validar a conclusão do Build #34 no GitHub Actions.
2. **Entrega Final:** Utilizar o script em `docs/audit-kit/DEMO_SCRIPT.md` para a apresentação final.
3. **Handover de UI:** Garantir que o componente `SentinelShield` esteja exibindo corretamente os dados on-chain após o deploy.

> [!IMPORTANT]
> **NÃO** execute `cargo update` sem necessidade, pois isso pode corromper o vendoring sanitizado. O ambiente está em "congelamento técnico" para garantir a entrega.


