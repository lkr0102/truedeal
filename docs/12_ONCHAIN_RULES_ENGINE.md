# On-Chain Rules Engine (TrueDeal Sovereign Escrow)

This document acts as the **ledger of immutable laws** governing the TrueDeal ecosystem on the Solana blockchain. No graphical interface (UI) or backend script can bypass these rules.

## 1. Protocol Identity
- **Framework:** Anchor (Rust)
- **Program ID:** `9zfQ1dwJ9Po7YCPWJ3S13ic3nxZcA9cEwBVsXdKub1c4`
- **Legal Typology:** Trustless Escrow for Performance Agreements

## 2. State Machine
An on-chain Performance Agreement can only exist in one of four mutually exclusive states (`AgreementStatus`):
1. **Formation:** Agreement created, rules locked in, awaiting participants to deposit their guarantee.
2. **Active:** Agreement started and running. The capital in the Escrow is frozen.
3. **Settled:** Performance verified. Capital released to the Beneficiary.
4. **Cancelled:** Aborted due to fraud detected by the Risk Guardian or expiration without resolution. Funds unlocked for *Refund*.

## 3. Initialization Rules (`init_performance_agreement`)
- The Creator must pay the Solana rent fee to open the vault.
- A **PDA (Program Derived Address)** is generated using the seed `[b"agreement", agreement_id]`. No one (not the Creator, nor TrueDeal Admin) owns the private key to this vault.
- The rules agreed upon off-chain are transformed into a **32-byte Cryptographic Hash (`rule_hash`)**. This hash is "tattooed" into the contract, making it impossible to change rules after signing.

## 4. Join and Custody Rules (`join_agreement`)
- **Financial Immutability:** Every participant must deposit exactly the `guarantee_amount` defined at creation. The blockchain rejects partial or divergent deposits.
- Custody moves completely from the user into the PDA Vault.
- The `total_guarantee` field grows deterministically, independent of any Web2 database.

## 5. Performance Settlement Rules (`settle_performance_agreement`)
The most critical and shielded instruction in the project.

- **State Filter:** The contract will panic (fail) with the error `AgreementError::InvalidStatus` if an attempt is made to settle an already `Settled` or `Cancelled` agreement. There is no double-spend.
- **The DealGuard Consensus Rule (Multi-Sig):**
  For the contract to send the money from the vault to the Beneficiary, **TWO** distinct private keys (Oracle 1 and Oracle 2) must sign the transaction in the exact same fraction of a second.
  `require!(ctx.accounts.oracle_1.is_signer && ctx.accounts.oracle_2.is_signer)`
- **Proof Hash:** Settlement only occurs upon the attachment of a `proof_hash`, which is the final attestation from the AI (Risk Guardian) proving that real-world requirements were met. If the signatures don't match, it triggers `AgreementError::DealGuardConsensusFailed`.

## 6. Arbitration Precedents
Under no circumstances can Escrow capital be moved without the express permission of the BFT (Byzantine Fault Tolerance) consensus from the DealGuard nodes. This ensures TrueDeal does not act as an unlicensed bank, but purely as a Code-is-Law infrastructure.

---
*TrueDeal Protocol: Trust is good, cryptographic verification is better.*
