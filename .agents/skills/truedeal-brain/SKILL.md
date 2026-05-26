---
name: truedeal-brain
description: Orientador de EAP e Cérebro Estratégico do projeto TrueDeal. Contém o mapeamento de IP, tese jurídica, estado atual de execução e guias de implementação soberana. Deve ser o primeiro documento lido por qualquer agente de IA que abrir este repositório.
---

# Skill: TrueDeal Brain 🧠
**Versão:** 2.2.0 — **SPL Direct Architecture (v0.2.0-devnet)**

Esta skill é o repositório central de inteligência para o desenvolvimento do **TrueDeal**. Ela deve ser usada por agentes de IA para garantir consistência arquitetural, proteção da Propriedade Intelectual e alinhamento ao estado atual de execução do projeto.

---

## 🛡️ Proteção de IP (Mapeamento de Fachada)

Ao operar neste projeto, utilize **SEMPRE** os nomes de fachada em qualquer documento público ou código que vá para o GitHub.

| Nome Interno (Proprietário) | Nome de Fachada (Público) | Papel no Projeto |
| :--- | :--- | :--- |
| **Sentinel** | **Risk Guardian** | Monitoramento de risco, anti-fraude e integridade. |
| **GreenProof + Trinity** | **DealGuard Engine** | Engine de verificação forense, agregação de provas e consenso. |

---

## ⚖️ Tese Jurídica: Performance Agreements

O TrueDeal **NÃO** é uma plataforma de apostas (gambling). Ele é uma infraestrutura para **Acordos de Performance**.
- A liquidação é baseada em **Performance Digital Verificável** (Skill-based).
- O motor de resolução é o **DealGuard Engine** — um "Conselho de Sentença Digital".
- A custódia é feita via **Sovereign Escrow** na rede Solana.

---

## 🏗️ Estrutura Analítica do Projeto (EAP) — Estado Atual

### 1. Camada Soberana (Blockchain) — ✅ CONCLUÍDA v0.2.0 (SPL Direto)
- **Arquitetura atual:** SPL Token transfers diretos entre managed wallets — **NÃO usa Anchor PDAs**.
- **Anchor Program (legacy):** `HdMnEf5jc3q6tws2vYLZgFgwFWKkKpNaK5CRKnF3a7mp` — existe no Devnet mas **não é chamado em produção**.
- **USDC Mint (devnet):** `BpXHCSnxhbzSjzWeaTHG14g1zETtcZeDGk772Nvwjb99`
- **Fee Payer:** `APP_FEE_PAYER_KEY` — formato **JSON array** obrigatório (não base64).
- **Decisão documentada em:** `docs/EAP_USDC_MIGRATION.md`

### 2. Camada de Vault (Backend/Segurança) — ✅ Implementada
- Managed wallets com keypairs AES-256 encriptados no Supabase — **nunca expostos ao browser**.
- Server Actions integradas ao Supabase (sempre `createServiceClient()` para operações privilegiadas).
- **Devnet Faucet:** 1000 USDC creditados automaticamente no cadastro de cada usuário.

### 3. Camada de Evidência (Integrações) — 🔄 Em Escalonamento
- Oráculos de API: X e Strava (OAuth flows pendentes).
- **Audit Consensus:** Pipeline de 5 etapas em `lib/actions/settlement.ts` agora conectado ao contrato real on-chain.

### 4. Camada de Interface (Frontend) — ✅ Implementada (Lukas)
- Design System Premium (Glassmorphism).
- Integração Anchor: Usar o IDL do Release oficial para manter sincronia com o contrato `HdMnEf...7mp`.

---

## 🚦 Regras de Ouro para o Agente

1. **Nunca** suba chaves privadas ou segredos (`.env.local` está no `.gitignore`).
2. **Nunca** revele os nomes internos (`Sentinel`, `GreenProof`, `Trinity`) em arquivos públicos.
3. **Nunca** use `createClient()` em server actions privilegiadas (crons, settlement, wallet) — sempre `createServiceClient()`.
4. **Anchor é legacy:** Não integrar o Anchor Program sem aprovação explícita. A arquitetura atual usa SPL transfers diretos.
5. **Formato de keypair:** `APP_FEE_PAYER_KEY` e `USDC_MINT_AUTHORITY_KEY` devem ser JSON array `[1,2,3...]` — nunca base64.
6. **Compliance por janela:** O DealGuard valida cada janela individualmente (diária/semanal) — nunca o total acumulado.
7. **Nunca** altere o diretório `contracts/solana/vendor/` sem re-aplicar `zero_checksums.py`.

---

## 📄 Documentos de Referência Chave

| Arquivo | Propósito |
| :--- | :--- |
| `task_master_super_scope.md` | Protocolo MCP intra-projeto. Estado atual + próximos nodes. |
| `docs/00_DELIVERY_REPORT.md` | Resumo executivo da entrega final e status de deploy. |
| `docs/04_TECHNICAL_PROOF_OF_WORK.md` | Memorial técnico detalhado da estabilização do build. |
| `lib/solana/anchor-client.ts` | Client Anchor completo sincronizado com o ID `HdMnEf...7mp`. |
