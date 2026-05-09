# Economic Model & Fee Logic (The "Slacker Tax")

This document formalizes the economic architecture of TrueDeal, focusing on protocol sustainability, network growth mechanics (Network Effects), and Adaptive Agreements.

## 1. The "3% on Failure" Rule (The Slacker Tax)

The requested business rule establishes that the platform does not charge a fee on the *Total Pool*, but **only on the pool of those who failed the challenge**.

### 📊 Mathematical Example
- **Scenario:** Weight Loss Challenge (30 Days)
- **Participants:** 10 users
- **Guarantee (Stake):** $10 USDC per person
- **Total Pool in Escrow:** $100 USDC
- **Post-Audit Result (DealGuard):** 6 people hit the goal (Winners), 4 people failed (Losers).

**The Settlement Math:**
1. **Protected Capital:** The 6 winners receive their original $60 back immediately. No one who met the goal is penalized.
2. **The "Slacker Pool":** $40 USDC remains.
3. **Platform Fee (3%):** TrueDeal extracts 3% of the Slacker Pool. ($40 * 0.03 = **$1.20 USDC** to the Treasury).
4. **Proportional Reward:** The remainder ($38.80 USDC) is split among the 6 winners.
   - Pure profit per winner: ~$6.46.
   - Total return per winner: $16.46 (64% ROI).

### 🚀 Network Effect (Why does this go viral?)
This creates an aggressive growth loop:
- **Zero Psychological Friction for Winners:** In normal betting apps, the house takes 10% of the total. The user feels they "paid to play". In TrueDeal, the house only profits on *someone else's lack of commitment*.
- **Invitation Incentive (Sharks):** Highly committed users are incentivized to invite "lazy" friends to inflate the Slacker Pool.
- **Institutional Narrative:** TrueDeal does not profit from gambling; it profits from breached performance contracts. We are an auditor.

---

## 2. Alternative Logics for Adaptive Agreements

To make the protocol more elastic and attract different niches (from corporate to social), we suggest the following adaptive gears in the Smart Contract:

### Alternative A: The "Zero-Fee Yield Escrow" (DeFi Integration)
Instead of charging 3% of the losers, the agreement has a nominal **Zero Fee**.
- **How does TrueDeal make money?** The locked capital in the PDA (e.g., $1,000,000 USDC locked for 30 days) is routed by Anchor to a Solana Liquidity protocol (like Kamino or MarginFi).
- **The Return:** TrueDeal pockets the interest (Yield) generated over the 30 days. Users withdraw exactly what they disputed, with no visible fees. This attracts institutional investors who hate platform fees.

### Alternative B: The "Charity Escalator" (Social Impact)
The agreement creator can set an adaptive rule:
- TrueDeal keeps 1% of the Slacker Pool for oracle/gas costs.
- Winners split 49% of the Slacker Pool.
- **50% of the Slacker Pool is automatically donated** on-chain to an NGO's wallet (e.g., Doctors Without Borders).
- **Advantage:** PR virality and strong acceptance in hackathons (Tech for Good).

### Alternative C: The "Sovereign Tier" (Dynamic Fee via TDP Token)
Integrate the Reputation Token (TDP) into pricing:
- If the agreement creator holds 1,000 TDP Tokens in their wallet, the TrueDeal fee drops from 3% to 1%.
- Creates buying pressure for our token and locks whales into our ecosystem.

## 3. Necessary Technical Implementation (Anchor)
To code the "Slacker Tax", the Anchor contract needs an evolved `settle_performance_agreement` instruction that:
1. Receives a `[Pubkey]` array of losers and a `[Pubkey]` array of winners, provided by the Oracle.
2. Calculates the `slacker_pool` = `(num_losers * guarantee_amount)`.
3. Transfers `slacker_pool * 0.03` to the `treasury_wallet`.
4. Splits the remainder and executes a CPI (Cross-Program Invocation) to the winners' Token Accounts.
