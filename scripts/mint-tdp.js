/**
 * TrueDeal TDP Token Mint Script
 * Mints the TDP (TrueDeal Performance) reputation token on Solana Devnet
 * 
 * Steps:
 * 1. Load keypair from local solana config
 * 2. Request SOL airdrop if balance is low
 * 3. Create SPL Token mint (TDP)
 * 4. Create token account
 * 5. Mint initial supply to treasury wallet
 */

const {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} = require('@solana/web3.js');

const {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getMint,
  TOKEN_PROGRAM_ID,
} = require('@solana/spl-token');

const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────
const KEYPAIR_PATH = path.join(process.env.USERPROFILE || process.env.HOME, '.config', 'solana', 'id.json');
const RPC_ENDPOINT = 'https://api.devnet.solana.com';

// TDP Token parameters
const TDP_DECIMALS = 6;                      // 6 decimal places (like USDC)
const TDP_INITIAL_SUPPLY = 1_000_000;         // 1 million TDP
const TDP_TOKEN_NAME = 'TrueDeal Performance';
const TDP_TOKEN_SYMBOL = 'TDP';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function loadKeypair(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Keypair.fromSecretKey(new Uint8Array(data));
  } catch (e) {
    console.error(`❌ Failed to load keypair from ${filePath}:`, e.message);
    process.exit(1);
  }
}

async function ensureSolBalance(connection, keypair, minSol = 0.5) {
  const balance = await connection.getBalance(keypair.publicKey);
  const solBalance = balance / LAMPORTS_PER_SOL;
  console.log(`💰 Current balance: ${solBalance} SOL`);

  if (solBalance < minSol) {
    console.log(`⚡ Balance too low. Requesting airdrop of 2 SOL...`);
    
    // Try multiple times with exponential backoff
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const sig = await connection.requestAirdrop(keypair.publicKey, 2 * LAMPORTS_PER_SOL);
        console.log(`   Airdrop requested, signature: ${sig}`);
        await connection.confirmTransaction(sig, 'confirmed');
        const newBalance = await connection.getBalance(keypair.publicKey);
        console.log(`✅ New balance: ${newBalance / LAMPORTS_PER_SOL} SOL`);
        return true;
      } catch (e) {
        const wait = Math.pow(2, attempt) * 3000;
        console.log(`   Attempt ${attempt}/${maxAttempts} failed: ${e.message}`);
        if (attempt < maxAttempts) {
          console.log(`   Waiting ${wait/1000}s before retry...`);
          await new Promise(r => setTimeout(r, wait));
        }
      }
    }
    
    console.error('❌ Could not get airdrop. Please visit https://faucet.solana.com');
    console.error(`   Wallet: ${keypair.publicKey.toBase58()}`);
    return false;
  }
  return true;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     TrueDeal TDP Token Mint — Devnet         ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  // 1. Load keypair
  const payer = loadKeypair(KEYPAIR_PATH);
  console.log(`🔑 Wallet: ${payer.publicKey.toBase58()}`);
  console.log(`🌐 RPC: ${RPC_ENDPOINT}`);
  console.log('');

  // 2. Connect
  const connection = new Connection(RPC_ENDPOINT, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
  });

  // 3. Ensure SOL balance
  const hasBalance = await ensureSolBalance(connection, payer, 0.1);
  if (!hasBalance) {
    console.log('');
    console.log('⚠️  MANUAL STEP REQUIRED:');
    console.log(`   1. Go to: https://faucet.solana.com`);
    console.log(`   2. Select: Devnet`);
    console.log(`   3. Paste wallet: ${payer.publicKey.toBase58()}`);
    console.log(`   4. Request SOL`);
    console.log(`   5. Re-run this script`);
    process.exit(1);
  }

  console.log('');
  console.log('🪙 Creating TDP SPL Token mint...');

  // 4. Create mint
  let mintAddress;
  try {
    mintAddress = await createMint(
      connection,
      payer,                    // Payer of the transaction fees
      payer.publicKey,          // Mint authority
      payer.publicKey,          // Freeze authority (can disable freeze later)
      TDP_DECIMALS,             // Decimals
      undefined,                // Keypair (auto-generated)
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    );
    console.log(`✅ Mint created: ${mintAddress.toBase58()}`);
  } catch (e) {
    console.error('❌ Failed to create mint:', e.message);
    process.exit(1);
  }

  console.log('');
  console.log('🏦 Creating treasury token account...');

  // 5. Create token account for payer (treasury)
  let treasuryAccount;
  try {
    treasuryAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mintAddress,
      payer.publicKey,
      false,
      'confirmed'
    );
    console.log(`✅ Treasury account: ${treasuryAccount.address.toBase58()}`);
  } catch (e) {
    console.error('❌ Failed to create token account:', e.message);
    process.exit(1);
  }

  console.log('');
  console.log(`💎 Minting ${TDP_INITIAL_SUPPLY.toLocaleString()} TDP tokens...`);

  // 6. Mint initial supply
  const mintAmount = TDP_INITIAL_SUPPLY * Math.pow(10, TDP_DECIMALS);
  try {
    const mintSig = await mintTo(
      connection,
      payer,
      mintAddress,
      treasuryAccount.address,
      payer.publicKey,          // Mint authority
      mintAmount,
      [],
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    );
    console.log(`✅ Minted! Signature: ${mintSig}`);
  } catch (e) {
    console.error('❌ Failed to mint:', e.message);
    process.exit(1);
  }

  // 7. Verify
  const mintInfo = await getMint(connection, mintAddress, 'confirmed');
  const finalBalance = Number(mintInfo.supply) / Math.pow(10, TDP_DECIMALS);

  console.log('');
  console.log('══════════════════════════════════════════════════');
  console.log('🏆 TDP TOKEN SUCCESSFULLY MINTED ON DEVNET!');
  console.log('══════════════════════════════════════════════════');
  console.log('');
  console.log(`  Token Name:      ${TDP_TOKEN_NAME}`);
  console.log(`  Symbol:          ${TDP_TOKEN_SYMBOL}`);
  console.log(`  Mint Address:    ${mintAddress.toBase58()}`);
  console.log(`  Decimals:        ${TDP_DECIMALS}`);
  console.log(`  Total Supply:    ${finalBalance.toLocaleString()} TDP`);
  console.log(`  Treasury:        ${treasuryAccount.address.toBase58()}`);
  console.log(`  Authority:       ${payer.publicKey.toBase58()}`);
  console.log('');
  console.log('🔍 Explorer Links:');
  console.log(`  Mint:    https://explorer.solana.com/address/${mintAddress.toBase58()}?cluster=devnet`);
  console.log(`  Account: https://explorer.solana.com/address/${treasuryAccount.address.toBase58()}?cluster=devnet`);
  console.log('');

  // 8. Save results to file
  const results = {
    timestamp: new Date().toISOString(),
    network: 'devnet',
    token: {
      name: TDP_TOKEN_NAME,
      symbol: TDP_TOKEN_SYMBOL,
      mintAddress: mintAddress.toBase58(),
      decimals: TDP_DECIMALS,
      totalSupply: finalBalance,
      treasuryAccount: treasuryAccount.address.toBase58(),
      mintAuthority: payer.publicKey.toBase58(),
    },
    explorerUrls: {
      mint: `https://explorer.solana.com/address/${mintAddress.toBase58()}?cluster=devnet`,
      treasury: `https://explorer.solana.com/address/${treasuryAccount.address.toBase58()}?cluster=devnet`,
    }
  };

  const outputPath = path.join(__dirname, '..', '.agents', 'tdp-token-devnet.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`💾 Results saved to: .agents/tdp-token-devnet.json`);
  console.log('');
}

main().catch(e => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
