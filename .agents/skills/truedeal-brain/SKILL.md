---
name: truedeal-brain
description: Orientador de EAP e Cérebro Estratégico do projeto TrueDeal. Contém o mapeamento de IP, tese jurídica, estado atual de execução e guias de implementação soberana. Deve ser o primeiro documento lido por qualquer agente de IA que abrir este repositório.
---

# Skill: TrueDeal Brain 🧠
**Versão:** 2.3.0 — **Mantle L2 EVM Architecture (v0.3.0-testnet)**

Esta skill é o repositório central de inteligência para o desenvolvimento do **TrueDeal**. Ela deve ser usada por agentes de IA para garantir consistência arquitetural, proteção da Propriedade Intelectual e alinhamento ao estado atual de execução do projeto.

---

## 🛡️ Proteção de IP (Mapeamento de Fachada)

Ao operar neste projeto, utilize **SEMPRE** os nomes de fachada em qualquer documento público ou código que vá para o GitHub.

| Nome Interno (Proprietário) | Nome de Fachada (Público) | Papel no Projeto |
| :--- | :--- | :--- |
| **Sentinel** | **Oráculo Privado de IA** | Análise comportamental, anti-fraude e integridade forense. |
| **GreenProof + Trinity** | **DealGuard Engine / API de Atestação** | Engine de verificação forense, agregação de provas e consenso de oráculos. |

---

## ⚖️ Tese Jurídica: Performance Agreements

O TrueDeal **NÃO** é uma plataforma de apostas (gambling). Ele é uma infraestrutura para **Acordos de Performance**.
- A liquidação é baseada em **Performance Digital Verificável** (Skill-based).
- O motor de resolução é o **DealGuard Engine** — um "Conselho de Sentença Digital".
- A custódia é feita via **Sovereign Escrow** em contratos Solidity na rede **Mantle L2 (EVM)**.

---

## 🏗️ Estrutura Analítica do Projeto (EAP) — Estado Atual

### 1. Camada Soberana (Blockchain) — 🔄 Migração para Mantle L2
- **Arquitetura alvo:** Transferências ERC-20 e contratos de Escrow em **Solidity (EVM)** na rede **Mantle Network**.
- **Wallet:** Managed wallets EVM geradas no servidor com private keys em formato **hexadecimal** (`0x...`).
- **RPC URL:** `MANTLE_RPC_URL` apontando para `https://rpc.testnet.mantle.xyz` (testnet) ou endpoint Mainnet.
- **Token:** ERC-20 USDC no contrato implantado na Mantle Testnet.
- **Diferencial Hackathon:** Integração com **Mantle LSP (mETH)** para yield-bearing escrow e **Account Abstraction (EIP-4337)** para UX gasless.
- **Histórico:** Arquitetura anterior utilizava SPL transfers diretos na Solana Devnet (v0.2.0, legado).

### 2. Camada de Vault (Backend/Segurança) — ✅ Implementada
- Managed wallets EVM com private keys AES-256 encriptadas no Supabase — **nunca expostas ao browser**.
- Server Actions integradas ao Supabase (sempre `createServiceClient()` para operações privilegiadas).
- **Testnet Faucet:** Tokens de teste creditados automaticamente no cadastro de cada usuário.

### 3. Camada de Evidência (Integrações) — 🔄 Em Escalonamento
- Oráculos de API: X e Strava (OAuth flows em refinamento).
- **Audit Consensus:** Pipeline de 5 etapas em `lib/actions/settlement.ts` conectado ao contrato Solidity na Mantle.

### 4. Camada de Interface (Frontend) — ✅ Implementada (Lukas)
- Design System Premium (Flat Design + Glassmorphism).
- Web3: Wagmi + RainbowKit + Viem para integração com Mantle EVM.

---

## 🚦 Regras de Ouro para o Agente

1. **Nunca** suba chaves privadas ou segredos (`.env.local` está no `.gitignore`).
2. **Nunca** revele os nomes internos (`Sentinel`, `GreenProof`, `Trinity`) em arquivos públicos — use sempre os nomes de fachada.
3. **Nunca** use `createClient()` em server actions privilegiadas (crons, settlement, wallet) — sempre `createServiceClient()`.
4. **Solana é legado:** Não integrar código Solana/Anchor sem aprovação explícita. A arquitetura atual migrou para Mantle L2 EVM.
5. **Formato de private key EVM:** `APP_FEE_PAYER_KEY` deve ser uma string hexadecimal (`0x...`) do private key da carteira EVM — nunca base64 ou JSON array.
6. **Compliance por janela:** O DealGuard valida cada janela individualmente (diária/semanal) — nunca o total acumulado.
7. **Não expor caminhos locais:** Jamais mencione caminhos absolutos do sistema de arquivos local em documentos públicos ou no GitHub.

---

## 📄 Documentos de Referência Chave

| Arquivo | Propósito |
| :--- | :--- |
| `docs/audit-kit/SYSTEM_MAP_MASTER.md` | Mapa completo da stack técnica atual (Mantle L2 EVM). |
| `docs/audit-kit/CONTRACT_STATE_MACHINE.md` | State machine de acordos e lógica de liquidação ERC-20. |
| `docs/00_DELIVERY_REPORT.md` | Resumo executivo da entrega final e status de deploy. |
| `docs/01_ARCHITECTURE.md` | Arquitetura de sistema e componentes (Mantle L2). |
| `contracts/TrueDeal.sol` | Contrato inteligente de Escrow em Solidity para a Mantle. |
