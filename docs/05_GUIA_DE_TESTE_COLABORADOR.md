# Guia de Teste: Sincronização e Liquidação Soberana (Lukas)

Este documento descreve os passos que o Lukas deve seguir para validar as novas regras de **Slacker Tax** e o **DealGuard Engine** no ambiente de desenvolvimento.

---

## 1. Sincronização de Ambiente
Antes de iniciar, é vital garantir que o código local do Lukas esteja alinhado com o núcleo institucional:

```bash
git pull --rebase origin main
npm install
```

## 2. Configuração de Perfil
Para o teste funcionar, o Lukas precisa de uma identidade válida no app:
1.  **Login**: Acessar o sistema via `/login`.
2.  **Social Link**: Ir até o Perfil e vincular uma conta do **X** ou **Strava**.
    *   *Nota*: O sistema de auditoria agora exige um link social real (mesmo que em modo dev) para validar as regras do deal.

## 3. Entrada no Deal de Teste
O João criou um deal específico para este teste. O Lukas deve:
1.  Acessar o link enviado pelo João (ex: `/deal/[id]`).
2.  Clicar em **"Participar"**.
3.  Confirmar o depósito do Stake (Simulado/Devnet).

## 4. Fluxo de Ativação e Prova
Assim que o Lukas entrar, o João (Criador) terá o botão **"Iniciar Deal"** habilitado.
*   **Ativação**: Ao clicar, o sistema valida o quórum (João + Lukas) e concede os **Shakes (+500 João, +200 Lukas)**.
*   **Liquidação**: O João pode disparar a liquidação manual. O DealGuard vai rodar a auditoria, gerar o Hash SHA-256 e executar o Smart Contract na Devnet.

## 5. O que observar no teste?
- [ ] O saldo de **Shakes** no perfil atualizou após a ativação?
- [ ] O status do deal mudou corretamente (`formacao -> ativo -> liquidando -> encerrado`)?
- [ ] O link da transação Solana no final do processo abre o Explorer com o Program ID correto?

---
**Objetivo**: Validar que a "Taxa do Preguiçoso" (3%) foi calculada corretamente e que o vencedor recebeu o bônus do pote.
