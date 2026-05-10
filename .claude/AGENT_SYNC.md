# TrueDeal: Technical Handover & Agent Sync

Este documento fornece o contexto técnico imediato para agentes de IA operando no repositório TrueDeal.

## 1. Estado Atual da Infraestrutura (Build & Deploy)
- **Toolchain:** Solana 1.17.31 / Anchor 0.29.0 / Rust Edition 2021.
- **Build System:** Sistema de **Vendoring Total** implementado em `contracts/solana/vendor/`.
- **Status:** O build foi estabilizado para ser **100% Offline e Determinístico**, eliminando conflitos com a Rust Edition 2024 de dependências externas.
- **Lockfile:** Fixado na **Versão 3** para compatibilidade com o compilador SBF.

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


