# TrueDeal Architecture

This document describes the high-level architecture of TrueDeal, an infrastructure for verifiable digital agreements on the Solana blockchain.

## 1. Overview

TrueDeal operates on a three-tier architecture that decouples user interaction from objective verification and on-chain settlement.

```mermaid
graph TD
    User[User/Mobile App] -->|1. Create/Join Deal| Backend[Orchestration Layer]
    Backend -->|2. Register Stake| Solana[Solana Escrow Program]
    
    Backend -->|3. Feed Signals| Risk[Risk Guardian]
    Backend -->|4. Request Resolution| DG[DealGuard Engine]
    
    Risk -->|Alert/Audit| Backend
    DG -->|Consensus Veredict + Proof| Solana
    
    Solana -->|5. Auto-Payout| User
```

## 2. Components

### 2.1 Frontend (React Native / Next.js)
The primary interface for users to:
- Configure agreement parameters (Rule, Goal, Period, Stake).
- Connect Solana wallets (Phantom/Backpack) via **Managed Wallet** abstraction.
- Track real-time progress and receive "Risk Alerts".

### 2.2 Orchestration Layer (Supabase)
Acts as the central hub connecting off-chain data with verification engines:
- **State Management**: Keeps track of deal lifecycles (Formation, Active, Verifying, Settled).
- **Signal Aggregator**: Ingests data from external APIs (X, Strava, Apple Health).
- **Engine Connector**: Forwards sanitized signals to the Risk Guardian and DealGuard Engine.

### 2.3 Risk Guardian (Proprietary Layer)
An AI-driven monitoring module that:
- Analyzes deal creation patterns to detect potential "bad actors" or impossible goals.
- Monitors incoming signals for anomalies (e.g., bot activity on social metrics or GPS spoofing).
- Tags deals with risk levels, triggering additional verification steps if necessary.

### 2.4 DealGuard Engine (Proprietary Consensus Layer)
The "Digital Jury" of the protocol. It handles the objective resolution of every deal:
- **Consensus Protocol**: Coordinates multiple autonomous validators to verify the truth of a signal.
- **Evidence Attestation**: Generates a cryptographically signed artifact (**ValidationArtifact**) containing the result.
- **Proof Generation**: Produces the necessary hash to unlock the escrow on Solana.

### 2.5 Solana Layer (Anchor Program)
The trustless settlement layer:
- **Escrow PDAs**: Program Derived Addresses that hold stakes securely for each deal ID.
- **Verification Hook**: The program only releases funds when presented with a valid proof-of-resolution from the DealGuard Engine.
- **Automated Payout**: Immediate distribution of the pot to the winner(s) without human intermediaries.

## 3. Data Flow

1. **Deal Initiation**: User stakes SOL/USDC -> Solana PDA locks funds.
2. **Monitoring**: Signals are fed to the **Risk Guardian**; anomalies are flagged.
3. **Maturity**: At the end of the deal period, the **DealGuard Engine** collects all evidence.
4. **Resolution**: Engine reaches consensus -> proof is submitted to Solana.
5. **Settlement**: Solana program verifies the proof and executes the payout.
