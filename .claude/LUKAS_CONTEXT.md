# 🧠 LUKAS_CONTEXT_SYNC: TrueDeal Super-Scope

> **Para Claude:** Leia este documento atentamente. Ele contém o estado atual, as decisões arquiteturais e o DNA jurídico do projeto TrueDeal. O seu usuário é o **Lukas**, o desenvolvedor Frontend/Produto do projeto. O objetivo dele é finalizar a aplicação para o **Colosseum Hackathon**.

---

## 1. Identidade e Tese do Projeto (O DNA)
- **O que é o TrueDeal?** É um "Sovereign Performance Agreement Protocol" (Protocolo Soberano de Acordos de Performance).
- **O que NÃO é?** Não é uma plataforma de apostas (Gambling). O foco é em **Skill e Performance**, não em sorte.
- **Arquitetura (Symbeon Labs IP):**
  - **Risk Guardian AI:** Motor de inteligência artificial (Qwen 3B) para auditar provas do mundo real e detectar fraudes (GPS spoofing, fake followers).
  - **DealGuard Engine:** O conselho de sentença digital. Agentes validadores que assinam a prova antes do dinheiro ser liberado.
  - **Sovereign Escrow:** Smart contract na Solana (Anchor) que segura o capital (USDC/SOL) de forma trustless.

---

## 2. O que o Engenheiro de IA (João/SH1W4) acabou de fazer?
Para garantir que a apresentação no hackathon seja à prova de falhas ("Judge-Proof"), as seguintes intervenções cirúrgicas foram implementadas na base de código que o Lukas criou:

### 🛡️ A. Sovereign Demo Auth Layer (Bypass de Juízes)
- **O Problema:** O arquivo `.env.local` está com chaves falsas (`seu-projeto.supabase.co`). Isso estava quebrando a tela de login.
- **A Solução:** Criamos o botão **"Protocol Override"** na tela de login. 
- **Como funciona:** Se o sistema detecta que a URL do Supabase é um placeholder, ele **não faz a requisição de rede**. Em vez disso, ele injeta um cookie local (`truedeal-demo-session=true`). 
- **No Servidor (`lib/supabase/server.ts`):** O servidor lê esse cookie e injeta um usuário fantasma chamado *"Judge Performance"*. Isso permite que os juízes entrem no Dashboard e testem a UI perfeitamente sem precisar de um banco de dados real.
- **Zero Retrabalho:** A lógica de login original do Lukas (Google/Email) continua **intacta**. Assim que variáveis reais forem colocadas no `.env`, o Bypass se desliga sozinho.

### 🎨 B. Polimento UI/UX Institucional
- A tela de login (`app/login/page.tsx`) foi remodelada para o tema "Sovereign Dark" (Fundo ultra-preto, acentos em verde `#00D26A`, e glassmorphism).

### 🛠️ C. Estabilização de Build (Turbopack)
- **O Problema:** Erros no build do Next.js ao tentar gerar estaticamente páginas que dependiam do usuário logado.
- **A Solução:** Injetamos `export const dynamic = "force-dynamic"` no topo de `app/explore/page.tsx` e `app/profile/page.tsx`. O build agora está estável.

### ⚖️ D. Alinhamento Legal no Smart Contract (`lib.rs`)
- O contrato em Rust foi atualizado via **DOCSYNC** para usar a nomenclatura jurídica correta.
- A função de liquidação agora exige explicitamente a assinatura dos nós de consenso do DealGuard (`oracle_1` e `oracle_2`) e emite um erro `DealGuardConsensusFailed` se a atestação falhar. As variáveis mantiveram os nomes originais para não quebrar o Frontend do Lukas.

---

## 3. Próximos Passos (O que o Claude e o Lukas devem focar agora)

1. **Testar o Fluxo "Protocol Override":** Rodar o app localmente, clicar no "Protocol Override" e navegar pelo Dashboard do "Judge Performance".
2. **Integração Real na Solana (Frontend):** Conectar os botões "Stake" e "Finalizar Deal" do Frontend aos métodos do Anchor Client (`@coral-xyz/anchor`) para fazer a transação de Escrow rodar na Devnet.
3. **Refino de UI dos Acordos:** Garantir que a exibição dos "Deals" no Dashboard mostre os avatares dos amigos e o status de verificação do DealGuard.

> **Claude:** Confirme para o Lukas que você compreendeu o "Super-Scope" e pergunte em qual arquivo do Frontend vocês devem focar agora.
