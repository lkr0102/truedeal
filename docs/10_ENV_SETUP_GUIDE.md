# 🔑 Guia de Configuração do Ambiente (.env.local)

Este documento descreve as variáveis de ambiente necessárias para rodar o TrueDeal localmente e em produção, especificando como preenchê-las e quais segredos devem ser compartilhados de forma segura (e nunca enviados por chat ou commitados).

> [!WARNING]
> **Segurança em Primeiro Lugar:** Nunca envie chaves privadas (`APP_FEE_PAYER_KEY`, `ORACLE_2_PRIVATE_KEY`, `WALLET_MASTER_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`) por e-mail, chats abertos ou commits do Git. Utilize um gerenciador de senhas seguro (como 1Password) ou canais criptografados ponta-a-ponta (Signal/Telegram Secret Chat) para compartilhar essas chaves entre a equipe.

---

## 📋 Resumo das Variáveis

Abaixo está a lista completa de variáveis que devem estar presentes no arquivo `.env.local` (que já está configurado no `.gitignore`).

### 1. Banco de Dados (Supabase)
Essas variáveis conectam o app à base de dados.
* `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto no painel do Supabase.
* `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Chave anônima para requisições do lado do cliente.
* `SUPABASE_SERVICE_ROLE_KEY`: **[SEGREDO]** Chave de serviço de bypass de RLS (Row Level Security). Deve ser mantida privada e compartilhada de forma segura.

### 2. Infraestrutura Solana (Devnet)
* `NEXT_PUBLIC_SOLANA_NETWORK`: Configurado como `devnet`.
* `NEXT_PUBLIC_SOLANA_RPC_URL`: Endereço do RPC da Solana (`https://api.devnet.solana.com`).
* `NEXT_PUBLIC_TRUEDEAL_PROGRAM_ID`: ID do programa implantado na Solana (`7sb3HQQbaCPYiT2x3tZZGMJyn5qRNiy4PgvCvb2BzZS8`).

### 3. Oráculos & Segurança On-Chain
Estas chaves de oráculos e encriptação foram geradas e provisionadas. Elas garantem que a liquidação com assinatura dual-oracle funcione corretamente on-chain.
* `APP_FEE_PAYER_KEY`: **[SEGREDO]** Chave privada em formato JSON array ou string codificada em base64 do **Oracle 1 (Fee Payer)**.
  * Public Key correspondente: `9ex39hdoBJQ1xjhikjUZLQaSxTXqtHAhGfd3UsayYfaZ` (financiada com SOL de teste no Devnet).
* `ORACLE_2_PRIVATE_KEY`: **[SEGREDO]** Chave privada do **Oracle 2 (Signing Oracle)**.
  * Public Key correspondente: `12W1WU43n83kFimpMvZw7YzpdvDkBMuFVQvDPjN7nSfb`.
* `WALLET_MASTER_KEY`: **[SEGREDO]** Chave mestra de 32 bytes (em HEX) utilizada pelo servidor para encriptar e desencriptar chaves privadas de carteiras custodiais de usuários (AES-256-GCM).
* `CRON_SECRET`: **[SEGREDO]** Segredo em HEX para validar requisições nos endpoints de cron jobs e settlements manuais (usado no header `Authorization: Bearer CRON_SECRET`).

### 4. USDC Mock (Devnet)
* `NEXT_PUBLIC_USDC_MINT_DEVNET`: O token mint do USDC simulado na Devnet.
  * Valor atual configurado: `9P7QpjYFj3jBheoAbwqdPRe2iQQFxGivtoSwtgfhSzZi` (com 1M USDC cunhado para a tesouraria).

### 5. Provedores OAuth (Mídias Sociais & Apis)
Estas chaves dependem da criação de aplicações nos portais de desenvolvedores de cada plataforma.
* `NEXT_PUBLIC_APP_URL`: URL base do projeto (geralmente `http://localhost:3000` em desenvolvimento).
* `X_CLIENT_ID` & `X_CLIENT_SECRET`: Credenciais criadas no Twitter Developer Portal com o escopo de OAuth 2.0 ativado (certificado de que `offline.access` está habilitado).
* `STRAVA_CLIENT_ID`: Credencial do painel de desenvolvedor do Strava para verificação de atividades físicas (corrida/ciclismo).

---

## 🔒 Como Compartilhar os Segredos com o Lukas?

1. **Recomendado:** Criar um cofre compartilhado em um gerenciador de credenciais (como 1Password, Bitwarden ou LastPass) e salvar as variáveis do `.env.local` correspondentes ao ambiente de desenvolvimento.
2. **Alternativa Segura (Ad-hoc):** Compartilhar o conteúdo das chaves criptografadas (ou o `.env.local` inteiro) via um chat criptografado (Signal ou chat secreto do Telegram) ou através de uma ferramenta de notas seguras temporárias (como o Privnote ou SendSecure) com expiração rápida.
3. **Template de .env.local:** No repositório, utilize o `.env.example` atualizado para preencher as variáveis compartilhadas.

---

## 🛠️ Próximos Passos no Fluxo do Lukas

Para rodar a aplicação localmente com sucesso, o Lukas precisará:
1. Copiar o `.env.example` para `.env.local`.
2. Substituir as chaves Supabase temporárias por chaves reais do projeto criado no painel do Supabase.
3. Inserir os segredos de oráculo e chaves mestras compartilhadas por você de forma segura.
4. Criar as credenciais OAuth nos portais do X e Strava e preenchê-las localmente.
