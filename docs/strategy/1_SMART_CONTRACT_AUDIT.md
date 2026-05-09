# Smart Contract Audit & Test Guide (TrueDeal)

This document attests to the analysis of the Solana smart contracts (`programs/truedeal/src/lib.rs`) and establishes the guidelines for executing a real settlement test between the founders (João and Lukas).

## 1. On-Chain Architecture Status

The on-chain architecture (Program ID: `9zfQ1dwJ9Po7YCPWJ3S13ic3nxZcA9cEwBVsXdKub1c4`) has been consolidated as a **Sovereign Execution Protocol**. It features the following security primitives:

- **`init_performance_agreement`**: Creates the deterministic vault (PDA), locks the guarantee amount, and immortalizes the rules via a cryptographic `rule_hash`. Status is set to `Formation`.
- **`join_agreement`**: Executes the transfer of custody (SOL/USDC) from the user's wallet to the on-chain Escrow PDA.
- **`settle_performance_agreement`**: The final instruction. Protected by the **DealGuard Consensus (Multi-Sig)**. It will explicitly fail if the two specific oracle keys (`oracle_1` and `oracle_2`) do not sign the transaction proving the veracity of the real-world data.

## 2. Paths for End-to-End Testing (João & Lukas)

We have two environments configured to validate the thesis:

### Path A: Sovereign Demo Auth Layer (Institutional Bypass)
Ideal for testing UX, button flows, and interface animations without spending network gas.
1. **How it Works:** If the real Oracle keys are not configured in the `.env` (e.g., running locally without secret keys).
2. **Result:** The backend (`lib/actions/settlement.ts`) intercepts the call, bypasses the blockchain transaction, updates the database via Supabase Admin, and triggers success on the UI (Purple Card / Simulated Solana Explorer Link).

### Path B: Hardcore On-Chain Execution (Solana Devnet)
The definitive test of the infrastructure, locking and releasing actual funds on the testnet.
1. **Financial Prerequisites:** Both João's and Lukas's Managed Wallets must have a balance (SOL Devnet). Use a faucet to inject funds into each Supabase wallet.
2. **Security Prerequisites:** The `.env` file of the machine running the test *must* contain:
   - `APP_FEE_PAYER_KEY`: Base64 of Oracle 1's private key.
   - `APP_ORACLE2_KEY`: Base64 of Oracle 2's private key.
3. **Execution:**
   - João or Lukas creates the agreement and performs the Join (on-chain deposit).
   - The creator clicks the "Finalize Agreement" button.
   - The backend signs with the two Oracle keys. Anchor releases the funds from the PDA directly to the Beneficiary on the blockchain.

---
*Signed: Antigravity - Sovereign Engineering Agent*
