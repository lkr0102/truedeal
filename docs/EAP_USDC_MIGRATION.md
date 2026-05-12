# EAP — Migração para USDC como Moeda Base (TrueDeal)

> **Status:** Interrompido em 2026-05-12 após Task A concluída e Task B parcialmente executada.  
> **Branch:** `main` — último commit: `f15c5d8a`  
> **Para retomar:** abra este arquivo e siga a seção "Pendente" em ordem.

---

## 1. CONTEXTO DO PROJETO

### Decisão arquitetural
Todos os stakes e liquidações do TrueDeal passam a ser denominados em **USDC** (SPL Token), não em SOL nativo nem BRL.

- **Vault** = conta SPL Token Account (PDA), não SOL nativo
- **Join** = SPL token transfer do participante → vault
- **Settle** = SPL token transfer do vault → vencedores + treasury (3% fee)
- SOL como meio de pagamento → convertido para USDC via Jupiter antes do depósito

### IDs e endereços canônicos
| Recurso | Valor |
|---|---|
| Program ID | `885scJ15uLUjnG8tfPUFbx4pAS6ZCkHpSuFd9ZUaxFbZ` |
| Oracle 1 / Fee Payer (mesmo que program deploy key) | `885scJ15uLUjnG8tfPUFbx4pAS6ZCkHpSuFd9ZUaxFbZ` |
| Oracle 2 | `1ZixuegY1EPvDeybLLGXW29aM2WuC4kA8dcfXbSNoNW` |
| USDC Mint (devnet) | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| USDC Mint (mainnet) | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| Fee | 3% do loser pool (não 5%) |

### PDA Seeds
```
Agreement PDA: [b"agreement", agreement_id.as_bytes()]
Vault PDA:     [b"vault",     agreement_id.as_bytes()]   ← MUDANÇA em relação ao código anterior
```

> **Atenção:** O vault antes era derivado de `[b"vault", agreementPDA.toBuffer()]`. Agora usa `agreement_id` diretamente como seed. Todos os lugares que chamam `deriveVaultPDA` precisam desta nova assinatura.

---

## 2. O QUE FOI CONCLUÍDO

### ✅ Task A — CI/CD Deploy (completo)
**Arquivo:** `.github/workflows/solana-deploy.yml`  
**Commit:** `f15c5d8a`

- Deploy usa `anchor deploy --provider.cluster devnet` (antes era `solana program deploy`)
- Keypair salvo em `~/.config/solana/id.json` (alinha com o `wallet` do `Anchor.toml`)
- Sem flag `--offline` em nenhum lugar
- Step "Verify Deployment" usa `solana program show` para confirmar

**Para ativar o deploy:** O usuário precisa adicionar 2 secrets no GitHub:
1. `SOLANA_PAYER_KEY` = `[78,51,128,112,244,191,131,76,95,2,90,245,210,70,255,131,238,200,108,43,109,146,248,196,43,132,197,177,224,255,51,77,105,210,98,49,157,183,168,72,193,48,212,167,60,176,247,161,21,182,33,163,194,58,135,198,155,209,65,133,33,25,73,84]`
2. `TRUEDEAL_DEPLOY_KEY` = mesmo array acima
3. Ir em: Actions → "Solana Contract Deploy" → Run workflow

### ✅ Task B1 — Constantes USDC (completo)
**Arquivo:** `lib/solana/constants.ts` (novo)  
**Commit:** `f15c5d8a`

Exporta: `USDC_MINT`, `USDC_DECIMALS`, `toUSDCUnits()`, `fromUSDCUnits()`, `formatUSDC()`

### ✅ Teste on-chain (completo)
**Arquivo:** `scripts/test-onchain.js` (novo)  
**Resultado verificado:** Oracle 1 = 2 SOL ✅ | Oracle 2 = 5 SOL ✅ | PDA derivation ✅ | Native SOL transfer ✅

---

## 3. O QUE ESTÁ PENDENTE

### ⏳ Task B2 — Jupiter Swap Helper
**Arquivo a criar:** `lib/solana/jupiter.ts`

```typescript
// Conteúdo esperado:
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js"

const SOL_MINT  = "So11111111111111111111111111111111111111112"
const USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"

export async function swapSOLtoUSDC(
  userPublicKey: PublicKey,
  solAmountLamports: number
): Promise<{ transaction: VersionedTransaction; usdcReceived: number }> {
  const quote = await fetch(
    `https://quote-api.jup.ag/v6/quote?inputMint=${SOL_MINT}&outputMint=${USDC_MINT}&amount=${solAmountLamports}&slippageBps=50`
  ).then(r => r.json())

  const swap = await fetch("https://quote-api.jup.ag/v6/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: userPublicKey.toString(),
      wrapAndUnwrapSol: true,
    }),
  }).then(r => r.json())

  const tx = VersionedTransaction.deserialize(Buffer.from(swap.swapTransaction, "base64"))
  return { transaction: tx, usdcReceived: Number(quote.outAmount) }
}
```

---

### ⏳ Task B3 — Reescrever Rust com USDC SPL Vault
**Arquivo:** `contracts/solana/programs/truedeal/src/lib.rs`

**Imports a adicionar:**
```rust
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
```
(`Mint` é novo — estava faltando)

**Mudança 1: `InitPerformanceAgreement` struct**
```rust
#[derive(Accounts)]
#[instruction(agreement_id: String)]
pub struct InitPerformanceAgreement<'info> {
    #[account(
        init, payer = creator,
        space = 8 + 32 + 68 + 8 + 8 + 8 + 8 + 32 + 32 + 33 + 1,  // 238 bytes (corrigido: 64→68 para String)
        seeds = [b"agreement", agreement_id.as_bytes()], bump
    )]
    pub agreement_account: Account<'info, AgreementAccount>,

    #[account(
        init, payer = creator,
        token::mint = usdc_mint,
        token::authority = agreement_account,
        seeds = [b"vault", agreement_id.as_bytes()], bump
    )]
    pub vault: Account<'info, TokenAccount>,          // ← NOVO: vault SPL criado no init

    #[account(mut)]
    pub creator: Signer<'info>,
    pub usdc_mint: Account<'info, Mint>,              // ← NOVO
    pub token_program: Program<'info, Token>,         // ← NOVO
    pub system_program: Program<'info, System>,
}
```

**Mudança 2: `JoinAgreement` struct**
```rust
#[derive(Accounts)]
pub struct JoinAgreement<'info> {
    #[account(mut, seeds = [b"agreement", agreement_account.agreement_id.as_bytes()], bump)]
    pub agreement_account: Account<'info, AgreementAccount>,
    #[account(mut)]
    pub participant: Signer<'info>,
    #[account(
        mut,
        constraint = participant_usdc_account.owner == *participant.key @ AgreementError::InvalidTokenAccount,
        constraint = participant_usdc_account.mint == usdc_mint.key()  @ AgreementError::InvalidTokenAccount,
    )]
    pub participant_usdc_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"vault", agreement_account.agreement_id.as_bytes()], bump,
        token::mint = usdc_mint,
        token::authority = agreement_account,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}
```

**Mudança 3: `SettlePerformanceAgreement` struct**
```rust
#[derive(Accounts)]
pub struct SettlePerformanceAgreement<'info> {
    #[account(mut, seeds = [b"agreement", agreement_account.agreement_id.as_bytes()], bump)]
    pub agreement_account: Account<'info, AgreementAccount>,
    pub oracle_1: Signer<'info>,
    pub oracle_2: Signer<'info>,
    #[account(
        mut,
        seeds = [b"vault", agreement_account.agreement_id.as_bytes()], bump,
        token::mint = usdc_mint,
        token::authority = agreement_account,
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = treasury_token_account.mint == usdc_mint.key() @ AgreementError::InvalidTokenAccount)]
    pub treasury_token_account: Account<'info, TokenAccount>,
    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}
```

**Mudança 4: Novo erro**
```rust
#[error_code]
pub enum AgreementError {
    InvalidStatus,
    DealGuardConsensusFailed,
    #[msg("Token account inválido: mint ou owner não corresponde.")]
    InvalidTokenAccount,   // ← NOVO (código 6002)
}
```

**Mudança 5: `account space` corrigido**
```
// Antes: 8 + 32 + 64 + 8 + 8 + 8 + 8 + 32 + 32 + 33 + 1 = 234
// Depois: 8 + 32 + 68 + 8 + 8 + 8 + 8 + 32 + 32 + 33 + 1 = 238
//                 ↑ String precisa de 4 bytes de prefixo de tamanho + 64 bytes de dados
```

**A lógica econômica do `settle_performance_agreement` permanece igual** (Slacker Tax 3%).  
O PDA signer para transferências DO vault continua:
```rust
let seeds = &[b"agreement", agreement_id.as_bytes(), &[ctx.bumps.agreement_account]];
let signer = &[&seeds[..]];
```

---

### ⏳ Task B4 — Sincronizar IDL com novo Rust
**Arquivo:** `lib/solana/idl.json`

Atualizar os campos `accounts` de cada instrução para refletir as mudanças do Rust:

```json
// init_performance_agreement — accounts:
[
  { "name": "agreement_account", "writable": true,  "signer": false },
  { "name": "vault",             "writable": true,  "signer": false },
  { "name": "creator",           "writable": true,  "signer": true  },
  { "name": "usdc_mint",         "writable": false, "signer": false },
  { "name": "token_program",     "writable": false, "signer": false },
  { "name": "system_program",    "writable": false, "signer": false }
]

// join_agreement — accounts:
[
  { "name": "agreement_account",        "writable": true,  "signer": false },
  { "name": "participant",              "writable": true,  "signer": true  },
  { "name": "participant_usdc_account", "writable": true,  "signer": false },
  { "name": "vault",                    "writable": true,  "signer": false },
  { "name": "usdc_mint",                "writable": false, "signer": false },
  { "name": "token_program",            "writable": false, "signer": false }
]

// settle_performance_agreement — accounts (igual ao anterior + usdc_mint):
[
  { "name": "agreement_account",      "writable": true,  "signer": false },
  { "name": "oracle_1",               "writable": false, "signer": true  },
  { "name": "oracle_2",               "writable": false, "signer": true  },
  { "name": "vault",                  "writable": true,  "signer": false },
  { "name": "treasury_token_account", "writable": true,  "signer": false },
  { "name": "usdc_mint",              "writable": false, "signer": false },
  { "name": "token_program",          "writable": false, "signer": false }
]
```

Adicionar no `errors`:
```json
{ "code": 6002, "name": "InvalidTokenAccount", "msg": "Token account inválido: mint ou owner não corresponde." }
```

Os **discriminators** permanecem iguais (são baseados no nome da instrução, não nas contas).

---

### ⏳ Task B5 — Atualizar anchor-client.ts
**Arquivo:** `lib/solana/anchor-client.ts`

**Novos imports:**
```typescript
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount } from "@solana/spl-token"
import { USDC_MINT } from "./constants"
```

**Remover:**
- Constante `LAMPORTS_PER_BRL`
- Função `joinAgreementNativeSOL`
- Função `payoutNativeSOL`
- Imports de `Transaction, sendAndConfirmTransaction` (não usados mais)

**Atualizar `deriveVaultPDA`:**
```typescript
// ANTES: recebia agreementPDA: PublicKey, usava agreementPDA.toBuffer()
// DEPOIS:
export function deriveVaultPDA(agreementId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), Buffer.from(agreementId)],
    PROGRAM_ID
  )
}
```

**Atualizar `initPerformanceAgreement`:**
```typescript
export async function initPerformanceAgreement(
  signer: Keypair,
  agreementId: string,
  guaranteeAmountUSDC: bigint,   // ← era "lamports", agora USDC micro-units
  ruleHash: Uint8Array,
): Promise<string> {
  const provider = getProvider(signer)
  const program  = getProgram(provider)
  const [agreementAccount] = deriveAgreementPDA(agreementId)
  const [vault]            = deriveVaultPDA(agreementId)   // ← usa nova assinatura

  return await program.methods
    .initPerformanceAgreement(agreementId, new BN(guaranteeAmountUSDC.toString()), Array.from(ruleHash))
    .accounts({
      agreementAccount,
      vault,
      creator:       signer.publicKey,
      usdcMint:      USDC_MINT,
      tokenProgram:  TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc()
}
```

**Nova função `joinAgreementUSDC`:**
```typescript
export async function joinAgreementUSDC(
  participant: Keypair,
  feePayer: Keypair,      // oracle1 — paga criação da ATA se necessário
  agreementId: string,
): Promise<string> {
  const connection = getConnection()
  const provider   = getProvider(participant)
  const program    = getProgram(provider)
  const [agreementAccount] = deriveAgreementPDA(agreementId)
  const [vault]            = deriveVaultPDA(agreementId)

  // Garante que a ATA USDC do participante existe (oracle1 paga se precisar criar)
  const participantUsdcAccount = await getOrCreateAssociatedTokenAccount(
    connection, feePayer, USDC_MINT, participant.publicKey
  )

  return await program.methods
    .joinAgreement()
    .accounts({
      agreementAccount,
      participant:            participant.publicKey,
      participantUsdcAccount: participantUsdcAccount.address,
      vault,
      usdcMint:               USDC_MINT,
      tokenProgram:           TOKEN_PROGRAM_ID,
    })
    .rpc()
}
```

**Atualizar `settlePerformanceAgreement`:**
```typescript
export async function settlePerformanceAgreement(
  oracle1: Keypair,
  oracle2: Keypair,
  agreementId: string,
  winnerPubkeys: PublicKey[],   // ← era um único beneficiaryPubkey
  treasuryPubkey: PublicKey,    // ← USDC ATA da treasury (oracle1)
  proofHash: Uint8Array,
  winnersCount: bigint,
): Promise<string> {
  const connection = getConnection()
  const provider   = getProvider(oracle1)
  const program    = getProgram(provider)
  const [agreementAccount] = deriveAgreementPDA(agreementId)
  const [vault]            = deriveVaultPDA(agreementId)

  // Deriva USDC ATAs de cada vencedor
  const winnerATAs = await Promise.all(
    winnerPubkeys.map(pk => getAssociatedTokenAddress(USDC_MINT, pk))
  )

  return await program.methods
    .settlePerformanceAgreement(new BN(winnersCount.toString()), Array.from(proofHash))
    .accounts({
      agreementAccount,
      oracle1:               oracle1.publicKey,
      oracle2:               oracle2.publicKey,
      vault,
      treasuryTokenAccount:  treasuryPubkey,
      usdcMint:              USDC_MINT,
      tokenProgram:          TOKEN_PROGRAM_ID,
    })
    .remainingAccounts(winnerATAs.map(pk => ({ pubkey: pk, isWritable: true, isSigner: false })))
    .signers([oracle2])
    .rpc()
}
```

---

### ⏳ Task B6 — Atualizar deals.ts e settlement.ts
**Arquivos:** `lib/actions/deals.ts`, `lib/actions/settlement.ts`

**Em `deals.ts` — `createDeal`:**
```typescript
// ANTES:
const { initPerformanceAgreement, deriveAgreementPDA, LAMPORTS_PER_BRL } = await import("@/lib/solana/anchor-client")
const lamports = BigInt(Math.round(input.entry_amount * LAMPORTS_PER_BRL))
const txSig = await initPerformanceAgreement(feePayer, deal.id, lamports, ruleHash)

// DEPOIS:
const { initPerformanceAgreement, deriveAgreementPDA } = await import("@/lib/solana/anchor-client")
const { toUSDCUnits } = await import("@/lib/solana/constants")
const guaranteeUSDC = toUSDCUnits(input.entry_amount)  // entry_amount tratado como USD
const txSig = await initPerformanceAgreement(feePayer, deal.id, guaranteeUSDC, ruleHash)
```

**Em `deals.ts` — `joinDeal`:**
```typescript
// ANTES:
const { joinAgreementNativeSOL, LAMPORTS_PER_BRL } = await import("@/lib/solana/anchor-client")
txSignature = await joinAgreementNativeSOL(userKeypair, treasury.publicKey, lamports)

// DEPOIS:
const { joinAgreementUSDC } = await import("@/lib/solana/anchor-client")
txSignature = await joinAgreementUSDC(userKeypair, treasury, dealId)
```

**Em `deals.ts` — `depositToEscrow`:** mesma troca acima.

**Em `deals.ts` — `withdrawFromEscrow`:**
```typescript
// ANTES: loop de payoutNativeSOL para cada vencedor
// DEPOIS:
const { getAssociatedTokenAddress } = await import("@solana/spl-token")
const { settlePerformanceAgreement } = await import("@/lib/solana/anchor-client")
const { USDC_MINT } = await import("@/lib/solana/constants")

const { createHash } = await import("crypto")
const proofHash = createHash("sha256").update(proofHash).digest()

const winnerPubkeys = winners
  .filter((w: any) => w.user_wallets?.pubkey)
  .map((w: any) => new PublicKey(w.user_wallets.pubkey))

const treasuryUsdcATA = await getAssociatedTokenAddress(USDC_MINT, oracle1.publicKey)

const lastTxSig = await settlePerformanceAgreement(
  oracle1, oracle2, dealId, winnerPubkeys, treasuryUsdcATA, proofHash, BigInt(winners.length)
)
```

**Em `settlement.ts` — `settleDealProtocol`:**  
Atualizar a chamada de `settlePerformanceAgreement` para incluir `winnerPubkeys` e `treasuryUsdcATA`.  
Buscar vencedores no Supabase antes de chamar (query em `deal_participants WHERE status = 'winner'`).

---

## 4. SETUP PÓS-DEPLOY (checklist do usuário)

Após concluir as Tasks B2–B6 e fazer deploy via CI:

- [ ] Adicionar GitHub Secrets: `SOLANA_PAYER_KEY` e `TRUEDEAL_DEPLOY_KEY` (mesmo JSON array)
- [ ] Trigger CI: Actions → "Solana Contract Deploy" → Run workflow
- [ ] Verificar em Solana Explorer: `executable = true` para `885scJ...`
- [ ] Oracle 1: obter devnet USDC em **faucet.circle.com** (selecionar Solana devnet)
- [ ] Adicionar Vercel env vars:
  ```
  NEXT_PUBLIC_TRUEDEAL_PROGRAM_ID=885scJ15uLUjnG8tfPUFbx4pAS6ZCkHpSuFd9ZUaxFbZ
  NEXT_PUBLIC_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
  APP_FEE_PAYER_KEY=TjOAcPS/g0xfAlr10kb/g+7IbCttkvjEK4TFseD/M01p0mIxnbeoSMEw1Kc8sPehFbYho8I6h8ab0UGFIRlJVA==
  ORACLE_2_PRIVATE_KEY=30D/3EsUWY07aJwsd1/17EnWpBj8tWEr/HKp2g8zhzUAJQAnKAEj1sTyBzvyqS4rAk8rC7Qzxm5hiVfa1V4V7w==
  NEXT_PUBLIC_SOLANA_NETWORK=devnet
  SOLANA_RPC_URL=https://api.devnet.solana.com
  ```
- [ ] Usuários novos: obter devnet USDC em **faucet.circle.com** para o managed wallet
- [ ] Rodar `node scripts/test-onchain.js` → deve mostrar `Anchor program: ✅ DEPLOYED`
- [ ] Testar fluxo completo: criar deal → join → settle → verificar no Explorer

---

## 5. VALIDAÇÃO FINAL (checklist técnico)

- [ ] `anchor program show 885scJ...` retorna `Executable: true`
- [ ] `createDeal` gera TX com instrução `init_performance_agreement` + vault SPL criado
- [ ] Vault PDA visível no Explorer como SPL token account (USDC)
- [ ] `joinDeal` transfere USDC do participante para o vault
- [ ] `settleDeal` envia USDC do vault para vencedores + 3% para treasury
- [ ] Botão "Ver on-chain" abre TX real no Explorer
- [ ] Todos os valores na UI exibem em USDC ($), não em SOL (◎) ou BRL (R$)

---

*Documento gerado em 2026-05-12. Retomar pelas Tasks B2→B6 em ordem.*
