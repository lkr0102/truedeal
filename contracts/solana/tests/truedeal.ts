import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Truedeal } from "../target/types/truedeal";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { expect } from "chai";

describe("truedeal_full_workflow_validation", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Truedeal as Program<Truedeal>;

  // IDs without dashes so they fit the 32-byte PDA seed limit directly
  const agreementId       = "testdeal" + Math.random().toString(36).slice(2, 10);
  const cancelAgreementId = "testcancel" + Math.random().toString(36).slice(2, 8);

  const guaranteeAmount = new anchor.BN(1_000_000); // 1 USDC (6 decimals)
  const ruleHash        = Array(32).fill(1);

  let mint: anchor.web3.PublicKey;
  let treasuryTokenAccount: anchor.web3.PublicKey;
  let creatorTokenAccount: anchor.web3.PublicKey;
  let participant2TokenAccount: anchor.web3.PublicKey;

  const creator      = provider.wallet;
  const participant2 = anchor.web3.Keypair.generate();

  // Dual-oracle: two distinct keypairs required by the contract
  const oracle1 = (creator as any).payer as anchor.web3.Keypair;
  const oracle2 = anchor.web3.Keypair.generate();

  // ── Helpers ────────────────────────────────────────────────────────────────

  function agreementPDA(id: string): [anchor.web3.PublicKey, number] {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("agreement"), Buffer.from(id)],
      program.programId,
    );
  }

  function vaultPDA(id: string): [anchor.web3.PublicKey, number] {
    // Seeds: [b"vault", agreement_id.as_bytes()] — matches lib.rs
    return anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(id)],
      program.programId,
    );
  }

  // ── Setup ──────────────────────────────────────────────────────────────────

  it("0. Setup: Mint and Token Accounts", async () => {
    mint = await createMint(
      provider.connection,
      (creator as any).payer,
      creator.publicKey,
      null,
      6,
    );

    treasuryTokenAccount = await createAccount(
      provider.connection, (creator as any).payer, mint, creator.publicKey,
    );

    creatorTokenAccount = await createAccount(
      provider.connection, (creator as any).payer, mint, creator.publicKey,
    );

    participant2TokenAccount = await createAccount(
      provider.connection, (creator as any).payer, mint, participant2.publicKey,
    );

    await mintTo(provider.connection, (creator as any).payer, mint, creatorTokenAccount,       creator.publicKey, 10_000_000);
    await mintTo(provider.connection, (creator as any).payer, mint, participant2TokenAccount,   creator.publicKey, 10_000_000);

    // Fund participant2 and oracle2 with SOL for tx fees
    for (const kp of [participant2, oracle2]) {
      const sig = await provider.connection.requestAirdrop(kp.publicKey, 1_000_000_000);
      await provider.connection.confirmTransaction(sig);
    }
  });

  // ── Test 1: Init ───────────────────────────────────────────────────────────

  it("1. Initialize Agreement", async () => {
    const [agrPDA] = agreementPDA(agreementId);
    const [vltPDA] = vaultPDA(agreementId);

    await program.methods
      .initPerformanceAgreement(agreementId, guaranteeAmount, ruleHash)
      .accounts({
        agreementAccount: agrPDA,
        vault:            vltPDA,
        creator:          creator.publicKey,
        usdcMint:         mint,
        tokenProgram:     TOKEN_PROGRAM_ID,
        systemProgram:    anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const acc = await program.account.agreementAccount.fetch(agrPDA);
    expect(acc.agreementId).to.equal(agreementId);
    expect(acc.guaranteeAmount.toString()).to.equal(guaranteeAmount.toString());
    expect(acc.status).to.deep.equal({ formation: {} });
  });

  // ── Test 2: Join ───────────────────────────────────────────────────────────

  it("2. Participants Join (João and Mock-Lukas)", async () => {
    const [agrPDA] = agreementPDA(agreementId);
    const [vltPDA] = vaultPDA(agreementId);

    // Creator joins
    await program.methods
      .joinAgreement()
      .accounts({
        agreementAccount:       agrPDA,
        participant:            creator.publicKey,
        participantUsdcAccount: creatorTokenAccount,
        vault:                  vltPDA,
        usdcMint:               mint,
        tokenProgram:           TOKEN_PROGRAM_ID,
      })
      .rpc();

    // Participant 2 joins
    await program.methods
      .joinAgreement()
      .accounts({
        agreementAccount:       agrPDA,
        participant:            participant2.publicKey,
        participantUsdcAccount: participant2TokenAccount,
        vault:                  vltPDA,
        usdcMint:               mint,
        tokenProgram:           TOKEN_PROGRAM_ID,
      })
      .signers([participant2])
      .rpc();

    const acc = await program.account.agreementAccount.fetch(agrPDA);
    expect(acc.participantCount.toNumber()).to.equal(2);
    expect(acc.totalGuarantee.toString()).to.equal(guaranteeAmount.muln(2).toString());
  });

  // ── Test 3: Settle ─────────────────────────────────────────────────────────

  it("3. Settle Agreement: João Wins, Lukas Loses (Slacker Tax Applied)", async () => {
    const [agrPDA] = agreementPDA(agreementId);
    const [vltPDA] = vaultPDA(agreementId);

    const proofHash    = Array(32).fill(9);
    const winnersCount = new anchor.BN(1);

    // oracle1 = creator (provider wallet); oracle2 = separate keypair
    await program.methods
      .settlePerformanceAgreement(winnersCount, proofHash)
      .accounts({
        agreementAccount:     agrPDA,
        oracle1:              oracle1.publicKey,
        oracle2:              oracle2.publicKey,
        vault:                vltPDA,
        treasuryTokenAccount: treasuryTokenAccount,
        usdcMint:             mint,
        tokenProgram:         TOKEN_PROGRAM_ID,
      })
      .remainingAccounts([
        { pubkey: creatorTokenAccount, isWritable: true, isSigner: false },
      ])
      .signers([oracle2])
      .rpc();

    const acc = await program.account.agreementAccount.fetch(agrPDA);
    expect(acc.status).to.deep.equal({ settled: {} });

    // Math:
    // Total pot:       2,000,000
    // Loser pool:      1,000,000 (participant2)
    // Platform fee 3%:    30,000
    // Distributable:     970,000
    // Winner payout:   1,970,000 (1M stake back + 970k reward)
    // Treasury:           30,000
    const joaoBalance    = await getAccount(provider.connection, creatorTokenAccount);
    const treasuryBalance = await getAccount(provider.connection, treasuryTokenAccount);

    console.log("💰 JOAO Final Balance:", joaoBalance.amount.toString());
    console.log("🏛️ TREASURY Final Balance:", treasuryBalance.amount.toString());

    expect(treasuryBalance.amount.toString()).to.equal("30000");
    // Started with 10M, paid 1M, received 1.97M → 10.97M
    expect(joaoBalance.amount.toString()).to.equal("10970000");
  });

  // ── Test 4: Cancel ─────────────────────────────────────────────────────────

  it("4. Cancel Agreement: refunds participant when quorum not reached", async () => {
    const [agrPDA] = agreementPDA(cancelAgreementId);
    const [vltPDA] = vaultPDA(cancelAgreementId);

    // Create a new cancel-specific token account for the participant
    const cancelParticipantATA = await createAccount(
      provider.connection, (creator as any).payer, mint, creator.publicKey,
    );
    await mintTo(provider.connection, (creator as any).payer, mint, cancelParticipantATA, creator.publicKey, 5_000_000);

    // Init
    await program.methods
      .initPerformanceAgreement(cancelAgreementId, guaranteeAmount, ruleHash)
      .accounts({
        agreementAccount: agrPDA,
        vault:            vltPDA,
        creator:          creator.publicKey,
        usdcMint:         mint,
        tokenProgram:     TOKEN_PROGRAM_ID,
        systemProgram:    anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // One participant joins (quorum not reached — only 1)
    await program.methods
      .joinAgreement()
      .accounts({
        agreementAccount:       agrPDA,
        participant:            creator.publicKey,
        participantUsdcAccount: cancelParticipantATA,
        vault:                  vltPDA,
        usdcMint:               mint,
        tokenProgram:           TOKEN_PROGRAM_ID,
      })
      .rpc();

    const balBefore = await getAccount(provider.connection, cancelParticipantATA);
    console.log("Balance before cancel:", balBefore.amount.toString()); // 4_000_000

    // Cancel — refunds participant
    await program.methods
      .cancelAgreement()
      .accounts({
        agreementAccount: agrPDA,
        oracle1:          oracle1.publicKey,
        vault:            vltPDA,
        usdcMint:         mint,
        tokenProgram:     TOKEN_PROGRAM_ID,
      })
      .remainingAccounts([
        { pubkey: cancelParticipantATA, isWritable: true, isSigner: false },
      ])
      .rpc();

    const acc         = await program.account.agreementAccount.fetch(agrPDA);
    const balAfter    = await getAccount(provider.connection, cancelParticipantATA);

    console.log("Balance after cancel:", balAfter.amount.toString()); // 5_000_000

    expect(acc.status).to.deep.equal({ cancelled: {} });
    expect(balAfter.amount.toString()).to.equal("5000000"); // full refund
  });
});
