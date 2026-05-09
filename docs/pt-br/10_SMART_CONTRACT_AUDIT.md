# Auditoria de Smart Contracts & Guia de Teste (TrueDeal)

Este documento atesta a análise dos contratos inteligentes da Solana (`programs/truedeal/src/lib.rs`) e estabelece as diretrizes para execução de um teste real de liquidação entre os fundadores (João e Lukas).

## 1. Status da Arquitetura On-Chain

A arquitetura on-chain (Program ID: `9zfQ1dwJ9Po7YCPWJ3S13ic3nxZcA9cEwBVsXdKub1c4`) foi consolidada como um **Protocolo Soberano de Execução**. Ela possui as seguintes primitivas de segurança:

- **`init_performance_agreement`**: Cria o cofre (PDA) determinístico, trava a quantia da garantia e imortaliza as regras através de um `rule_hash` criptográfico. Status setado para `Formation`.
- **`join_agreement`**: Executa a transferência de custódia (SOL/USDC) da carteira do usuário para o Escrow PDA on-chain.
- **`settle_performance_agreement`**: A instrução final. Protegida pelo **DealGuard Consensus (Multi-Sig)**. Falha obrigatoriamente se as duas chaves de oráculo específicas (`oracle_1` e `oracle_2`) não assinarem a transação garantindo a veracidade do dado no mundo real.

## 2. Caminhos para Teste End-to-End (João & Lukas)

Temos dois ambientes configurados para validar a tese:

### Caminho A: Sovereign Demo Auth Layer (Bypass Institucional)
Ideal para testar o UX, fluxos de botões e animações da interface sem gastar gás da rede.
1. **Como Funciona:** Se as chaves reais dos Oráculos não estiverem configuradas no `.env` (ex: rodando local sem as chaves secretas).
2. **Resultado:** O backend (`lib/actions/settlement.ts`) intercepta a chamada, ignora a transação na blockchain, atualiza o banco de dados via Supabase Admin e aciona o sucesso na UI (Cartão Roxo / Solana Explorer Link simulado).

### Caminho B: Hardcore On-Chain Execution (Solana Devnet)
O teste definitivo da infraestrutura, bloqueando e liberando fundos reais na rede de testes.
1. **Pré-requisitos Financeiros:** Tanto a Managed Wallet do João quanto a do Lukas precisam ter saldo (SOL Devnet). Usem um faucet para injetar na wallet do Supabase de cada um.
2. **Pré-requisitos de Segurança:** O arquivo `.env` da máquina que vai rodar o teste *deve* conter:
   - `APP_FEE_PAYER_KEY`: Base64 da private key do Oráculo 1.
   - `APP_ORACLE2_KEY`: Base64 da private key do Oráculo 2.
3. **Execução:**
   - João ou Lukas cria o acordo e faz o Join (depósito on-chain).
   - O criador clica no botão "Finalizar Acordo".
   - O backend assina com as duas chaves de Oráculo. O Anchor libera os fundos do PDA diretamente para o Beneficiário na blockchain.

---
*Assinado: Antigravity - Sovereign Engineering Agent*
