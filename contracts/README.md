# True Deal Smart Contracts

<div align="center">

![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?style=for-the-badge&logo=solidity)
![Hardhat](https://img.shields.io/badge/Hardhat-2.19-FCD404?style=for-the-badge)
![Celo](https://img.shields.io/badge/Celo-42220-Fade44?style=for-the-badge&logo=celo)

Smart contracts for the True Deal protocol on Celo network.

</div>

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Contratos](#contratos)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Compilação](#compilação)
- [Testes](#testes)
- [Deploy](#deploy)
- [Verificação](#verificação)
- [Proof of Ship](#proof-of-ship)
- [Segurança](#segurança)

---

## 👁️ Visão Geral

Este repositório contém os smart contracts do protocolo True Deal, desenvolvidos em Solidity e projetados para deployment na rede Celo.

### Características

- ✅ Padrão OpenZeppelin para segurança
- ✅ Taxa de plataforma de 3%
- ✅ Suporte a múltiplos tipos de deals
- ✅ Sistema de verificação flexível
- ✅ Gestão de stake e distribuição automática

---

## 📄 Contratos

### TrueDeal.sol

Contrato principal que gerencia acordos digitais com stake.

| Parâmetro | Valor |
|-----------|-------|
| **Fee** | 3% |
| **Min Stake** | 0.01 CELO |
| **Max Duration** | 90 dias |
| **OpenZeppelin** | AccessControl, ReentrancyGuard |

#### Funções Principais

- `createDeal()` - Criar novo deal
- `joinDeal()` - Participar de um deal
- `verifyDeal()` - Verificar resultado e distribuir prêmio
- `cancelDeal()` - Cancelar deal e reembolsar
- `withdrawStake()` - Retirar stake se cancelado

---

## 🛠 Pré-requisitos

- Node.js 18+
- npm ou pnpm
- Carteira Celo com funds (Alfajores para teste)

---

## 📦 Instalação

```bash
# Entre no diretório dos contratos
cd contracts

# Instale as dependências
npm install

# ou usando pnpm
pnpm install
```

---

## 🔨 Compilação

```bash
npm run compile
```

---

## 🧪 Testes

```bash
npm run test
```

---

## 🚀 Deploy

### 1. Configure as variáveis de ambiente

```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o arquivo .env com suas chaves
```

### 2. Deploy na Alfajores (Testnet)

```bash
npm run deploy:alfajores
```

### 3. Deploy na Celo Mainnet

```bash
npm run deploy:celo
```

---

## ✅ Verificação

O contrato é automaticamente verificado na CeloScan após o deploy (se a API key estiver configurada).

Para verificar manualmente:

```bash
npx hardhat verify --network celo <CONTRACT_ADDRESS>
```

---

## 🏆 Proof of Ship

Este contrato foi desenvolvido para o programa **Proof of Ship** da Celo.

### Critérios atendidos:

1. ✅ Smart contract funcional em Solidity
2. ✅ Padrão OpenZeppelin implementado
3. ✅ Configuração para rede Celo
4. ✅ Scripts de deploy automatizados
5. ✅ Documentação completa

### Próximos passos:

1. Deploy na Alfajores testnet
2. Adicionar contrato ao [Celo Explorer](https://explorer.celo.org)
3. Submeter ao programa Proof of Ship
4. Verificar código fonte na CeloScan

---

## 🔒 Segurança

### Boas Práticas Implementadas

- **ReentrancyGuard** - Proteção contra ataques de reentrada
- **AccessControl** - Controle de acesso granular
- **Checks-Effects-Interactions** - Padrão de segurança
- **Custom Errors** - Economia de gas e debugging

### Auditoria Recomendada

Antes de usar em produção, recomenda-se:

1. Auditoria por firma especializada
2. Testes abrangentes
3. Bug bounty program

---

## 📞 Suporte

- Twitter: [@lkrcripto](https://twitter.com/lkrcripto)
- GitHub: [lkr0102/truedeal](https://github.com/lkr0102/truedeal)

---

<div align="center">

*Set your goals. Honor your word. Get paid for it.*

</div>