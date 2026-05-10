import { Keypair, PublicKey } from "@solana/web3.js";
import { initPerformanceAgreement, settlePerformanceAgreement } from "../lib/solana/anchor-client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Use the master wallet identified from ~/.config/solana/id.json
const masterSecret = new Uint8Array([35,221,217,57,2,244,54,251,68,139,241,13,86,53,83,83,48,196,180,198,39,43,84,228,192,160,233,126,42,211,183,239,10,170,208,185,172,88,147,27,225,178,186,26,81,164,166,92,81,193,6,226,134,144,54,38,132,167,215,18,251,152,46,198]);
const masterWallet = Keypair.fromSecretKey(masterSecret);

async function runFullValidation() {
  console.log("🛠️ Starting Full On-Chain Validation...");
  console.log("👤 Master Wallet:", masterWallet.publicKey.toBase58());

  const agreementId = "val-test-" + Math.random().toString(36).slice(2, 7);
  const guaranteeAmount = BigInt(1000000); // 1.0 USDC (assuming 6 decimals)
  const ruleHash = new Uint8Array(32).fill(7);

  try {
    // 1. Initialize
    console.log("1️⃣ Initializing Agreement on Devnet...");
    const initTx = await initPerformanceAgreement(
      masterWallet,
      agreementId,
      guaranteeAmount,
      ruleHash
    );
    console.log("✅ Init Success! TX:", initTx);

    // 2. Settle (Winner: Master Wallet)
    // We simulate oracle consensus using the same wallet for simplicity in validation
    const proofHash = new Uint8Array(32).fill(9);
    console.log("2️⃣ Settling Agreement (Slacker Tax Distribution)...");
    const settleTx = await settlePerformanceAgreement(
      masterWallet,
      masterWallet, // Oracle 2 = Oracle 1 for test
      agreementId,
      masterWallet.publicKey, // Beneficiary
      proofHash,
      BigInt(1) // winnersCount
    );
    console.log("✅ Settlement Success! TX:", settleTx);

    console.log("\n🚀 Validation Completed Successfully!");
    console.log(`🔗 Link do Explorer: https://explorer.solana.com/address/${masterWallet.publicKey.toBase58()}?cluster=devnet`);

  } catch (err) {
    console.error("❌ Validation Failed:", err);
  }
}

runFullValidation();
