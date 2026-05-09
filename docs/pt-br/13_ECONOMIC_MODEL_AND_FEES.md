# Modelo Econômico e Lógica de Taxas (The "Slacker Tax")

Este documento formaliza a arquitetura econômica da TrueDeal, focando na sustentabilidade do protocolo, mecânicas de crescimento de rede (Network Effects) e Acordos Adaptativos.

## 1. A Regra dos "3% sobre a Falha" (The Slacker Tax)

A regra de negócio solicitada estabelece que a plataforma não cobra taxa sobre o *Pool Total*, mas **apenas sobre o montante daqueles que perderam o desafio**.

### 📊 Exemplo Matemático
- **Cenário:** Desafio de Perda de Peso (30 Dias)
- **Participantes:** 10 usuários
- **Garantia (Stake):** $10 USDC por pessoa
- **Pool Total no Escrow:** $100 USDC
- **Resultado Pós-Auditoria (DealGuard):** 6 pessoas atingiram a meta (Vencedores), 4 pessoas falharam (Perdedores).

**A Matemática da Liquidação:**
1. **Capital Protegido:** Os 6 vencedores recebem seus $60 originais de volta imediatamente. Ninguém que cumpriu a meta é penalizado.
2. **O "Slacker Pool" (Fundo dos Perdedores):** Sobram $40 USDC.
3. **Taxa da Plataforma (3%):** A TrueDeal extrai 3% do Slacker Pool. ($40 * 0.03 = **$1.20 USDC** vão para a Tesouraria).
4. **Prêmio Proporcional:** O restante ($38.80 USDC) é dividido entre os 6 vencedores.
   - Lucro puro por vencedor: ~$6.46.
   - Retorno final do vencedor: $16.46 (ROI de 64%).

### 🚀 Efeito de Rede (Por que isso viraliza?)
Isso cria um loop de crescimento agressivo:
- **Zero Atrito Psicológico para Vencedores:** Em apps normais de apostas, a casa tira 10% do total. O usuário sente que "pagou para jogar". Na TrueDeal, a casa só lucra sobre a *falta de comprometimento alheio*.
- **Incentivo a Convites (Sharks):** Usuários altamente comprometidos são incentivados a convidar amigos "preguiçosos" para inflar o Slacker Pool.
- **Narrativa Institucional:** A TrueDeal não lucra com apostas, lucra com a quebra de contratos de performance. Somos um auditor.

---

## 2. Lógicas Alternativas para Acordos Adaptativos

Para tornar o protocolo mais elástico e atrair diferentes nichos (do corporativo ao social), sugerimos as seguintes engrenagens adaptativas no Smart Contract:

### Alternativa A: O "Zero-Fee Yield Escrow" (DeFi Integration)
Em vez de cobrar 3% dos perdedores, o acordo tem **Zero Taxa** nominal.
- **Como a TrueDeal ganha dinheiro?** O capital bloqueado no PDA (ex: $1.000.000 USDC globais presos por 30 dias) é roteado pelo Anchor para um protocolo de Liquidez na Solana (ex: Kamino ou MarginFi).
- **O Retorno:** A TrueDeal embolsa os juros (Yield) gerados durante os 30 dias. Os usuários sacam exatamente o que disputaram, sem taxas visíveis. Isso atrai investidores institucionais que odeiam taxas de plataforma.

### Alternativa B: O "Charity Escalator" (Impacto Social)
O criador do acordo pode definir uma regra adaptativa:
- A TrueDeal fica com 1% do Slacker Pool para cobrir custos de oráculo/gas.
- Os Vencedores dividem 49% do Slacker Pool.
- **50% do Slacker Pool é doado automaticamente** on-chain para a carteira de uma ONG (ex: Médicos Sem Fronteiras).
- **Vantagem:** Viralidade em Relações Públicas (PR) e aceitação em hackathons (Tech for Good).

### Alternativa C: The "Sovereign Tier" (Taxa Dinâmica via Token TDP)
Integrar o Token de Reputação (TDP) na precificação:
- Se o criador do acordo segurar 1.000 TDP Tokens na carteira, a taxa da TrueDeal cai de 3% para 1%.
- Cria demanda compradora para o nosso token e prende os baleias (high-rollers) no nosso ecossistema.

## 3. Implementação Técnica Necessária (Anchor)
Para codificar o "Slacker Tax", o contrato Anchor precisa de uma instrução `settle_performance_agreement` evoluída que:
1. Receba um vetor `[Pubkey]` dos perdedores e `[Pubkey]` dos vencedores, provido pelo Oráculo.
2. Calcule o `slacker_pool` = `(num_losers * guarantee_amount)`.
3. Transfira `slacker_pool * 0.03` para a `treasury_wallet`.
4. Divida o restante e faça CPI (Cross-Program Invocation) para as Token Accounts dos vencedores.
