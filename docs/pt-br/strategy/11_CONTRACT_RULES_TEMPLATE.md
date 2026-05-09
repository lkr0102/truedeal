# Template: Framework de Lógica de Acordos e Regras (TrueDeal)

Este documento é um modelo vivo (living document) projetado para capturar a visão de engajamento do Lukas (Social/Gamification), cruzá-la com o benchmark do mercado (DietBet, Strava Challenges, Fantasy Sports) e traduzir tudo para uma Lógica de Contrato Inteligente infalível (Sovereign Escrow).

## 1. Visão do Fundador (Lukas - Social & UX)
*Instrução: Lukas, preencha abaixo como você enxerga a jornada do usuário e as regras "divertidas" ou "punitivas" que geram engajamento.*
- **Tipos de Acordo Favoritos:** (Ex: Perda de Peso em 30 dias, Chegar no horário por 1 semana)
- **Regras de Desistência/Falha:** (Ex: Quem perde paga o jantar, ou o dinheiro vai para doação?)
- **Mecânicas de Engajamento:** (Ex: Notificações de "Você está perdendo", possibilidade de dar "Taunt" no adversário?)

## 2. Benchmark de Mercado (Absorção Competitiva)
*Instrução: Engenharia e Estratégia preenchem aqui com base em aplicativos bilionários.*
- **DietBet / StepBet:** 
  - *Lógica de Risco:* O "Pote" é dividido apenas entre os vencedores. A casa (plataforma) tira sua taxa (10 a 20%) antes da divisão.
  - *Casos Limites (Edge Cases):* Se todos ganharem, a casa zera sua taxa para ninguém perder dinheiro. Se ninguém ganhar, o dinheiro rola para um próximo desafio ou é devolvido.
- **Strava / Apple Fitness Challenges:**
  - *Lógica de Validação:* APIs fechadas, tolerância a dados de saúde inseridos manualmente vs. capturados via GPS/Watch.
- **Predição/Wagering Web3 (Polymarket):**
  - *Lógica de Oráculo:* Resolução por oráculos descentralizados, períodos de disputa de 24h.

## 3. Lógica do Contrato Soberano (Sovereign Logic)
*Instrução: Como o Smart Contract (Anchor) vai interpretar as regras acima.*
- **Alocação Padrão:** Taxa Plataforma (Ex: 5% Social, 1% Pro) extraída no momento da liquidação (Settle).
- **Edge Case de Falha Coletiva:** Se a data de validade (Deadline) expirar e *nenhum* Oráculo assinar a vitória, o contrato libera a função `refund_all()`.
- **Edge Case de Empate:** Distribuição Proporcional (Split) entre os elegíveis.

## 4. Matriz de Mapeamento de Regras (Preenchimento Contínuo)

| Nome da Regra | Condição de Vitória (UX) | Ponto de Falha (Edge Case) | Resolução no Smart Contract (Backend) |
| :--- | :--- | :--- | :--- |
| Ex: *Strava 5KM* | Correr 5km em menos de 30m | GPS falhar ou usuário editar manualmente | Risk Guardian cruza métricas. Se fraude, `cancel_agreement` |
| [Sua Regra Aqui] | ... | ... | ... |
| [Sua Regra Aqui] | ... | ... | ... |
| [Sua Regra Aqui] | ... | ... | ... |

---
*Status: Aguardando Preenchimento e Reunião de Sincronização.*
