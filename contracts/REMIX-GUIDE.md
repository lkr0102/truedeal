# Guia de Deploy - Remix IDE

## Problema
O erro `_context7.t3.error.indexOf is not a function` ocorre porque o Remix não consegue resolver automaticamente as importações da OpenZeppelin.

## Solução
Use o arquivo `TrueDeal-Minimal.sol` que não tem dependências externas.

---

## Passo a Passo

### 1. Acesse o Remix
Vá para: https://remix.ethereum.org

### 2. Crie um novo arquivo
- No painel **File Explorer**, clique com botão direito em **contracts**
- Selecione **New File**
- Nomeie como `TrueDeal.sol`

### 3. Copie o código
Copie todo o conteúdo do arquivo `contracts/TrueDeal-Minimal.sol` e cole no Remix.

### 4. Compile o contrato
- Vá para a aba **Solidity Compiler** (ícone de azul no menu esquerdo)
- Selecione a versão do compilador: `0.8.20`
- Clique em **Compile TrueDeal.sol**

### 5. Configure o ambiente
- Vá para a aba **Deploy & Run Transactions** (ícone de deploy)
- No dropdown **Environment**, selecione:
  - **Injected Provider - MetaMask** (para Celo Mainnet)
  - **Injected Provider - MetaMask** (para Celo Alfajores Testnet)

### 6. Conecte sua carteira
- Clique em **Connect** para conectar sua MetaMask
- Certifique-se de estar na rede Celo (ou Alfajores para teste)

### 7. Deploy
- Clique no botão **Deploy**
- Confirme a transação na MetaMask

---

## Rede Celo - Configuração

### Alfajores (Testnet)
1. Adicione a rede Alfajores à MetaMask:
   - **Network Name**: Celo Alfajores Testnet
   - **RPC URL**: https://alfajores-forno.celo-testnet.org
   - **Chain ID**: 44787
   - **Symbol**: CELO
   - **Block Explorer**: https://alfajores.celoscan.io

### Celo Mainnet
1. Adicione a rede Celo à MetaMask:
   - **Network Name**: Celo Mainnet
   - **RPC URL**: https://forno.celo.org
   - **Chain ID**: 42220
   - **Symbol**: CELO
   - **Block Explorer**: https://explorer.celo.org

---

## Como usar o contrato

### Criar Deal
```solidity
createDeal(
    "Nome do Deal",           // string
    "Descrição",              // string
    1000000000000000000,     // uint256 (1 CELO em wei)
    10,                       // uint8 (max participantes)
    86400,                    // uint256 (duração em segundos = 1 dia)
    0                         // uint8 (tipo: 0=Social, 1=Check-in, etc)
)
```

### Participar de Deal
```solidity
joinDeal{value: 1 ether}(dealId)
```

### Verificar Deal
```solidity
verifyDeal(dealId, enderecoDoVencedor)
```

---

## Contratos Alternativos

| Arquivo | Descrição | Uso |
|---------|-----------|-----|
| `TrueDeal-Minimal.sol` | Versão sem dependências externas | ✅ Remix |
| `TrueDeal-Remix.sol` | Versão com proteções inline | Remix |
| `TrueDeal.sol` | Versão com OpenZeppelin | Hardhat/Truffle |

---

## Problemas Comuns

### "Contract creation error"
- Verifique se tem CELO suficiente na carteira
- Aumente o gas limit na MetaMask

### "Insufficient stake"
- O stake mínimo é 0.01 CELO (10000000000000000 wei)

### "Deal not found"
- O deal ID começa em 1, não em 0

---

## Proof of Ship - Próximos Passos

1. ✅ Deploy na rede Celo
2. ✅ Adicionar contrato ao [Celo Explorer](https://explorer.celo.org)
3. ✅ Verificar código fonte na [CeloScan](https://celoscan.io)
4. 📝 Submeter ao [Proof of Ship](https://celo.org/developers/proof-of-ship)

---

## Contato
- Twitter: [@lkrcripto](https://twitter.com/lkrcripto)
- GitHub: [lkr0102/truedeal](https://github.com/lkr0102/truedeal)