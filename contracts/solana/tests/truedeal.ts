import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Truedeal } from "../target/types/truedeal";
import { 
  TOKEN_PROGRAM_ID, 
  createMint, 
  createAccount, 
  mintTo, 
  getAccount 
} from "@solana/spl-token";
import { expect } from "chai";

describe("truedeal_full_workflow_validation", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Truedeal as Program<Truedeal>;
  
  // Test Data
  const agreementId = "test-deal-" + Math.random().toString(36).slice(2);
  const guaranteeAmount = new anchor.BN(1000000); // 1 unit (e.g. 1 USDC)
  const ruleHash = Array(32).fill(1); // Mock rule hash

  let mint: anchor.web3.PublicKey;
  let treasuryTokenAccount: anchor.web3.PublicKey;
  let creatorTokenAccount: anchor.web3.PublicKey;
  let participant2TokenAccount: anchor.web3.PublicKey;
  
  const creator = provider.wallet;
  const participant2 = anchor.web3.Keypair.generate();

  it("0. Setup: Mint and Token Accounts", async () => {
    // 1. Create Mint
    mint = await createMint(
      provider.connection,
      (creator as any).payer,
      creator.publicKey,
      null,
      6
    );

    // 2. Create Treasury Account (Owned by creator for testing)
    treasuryTokenAccount = await createAccount(
      provider.connection,
      (creator as any).payer,
      mint,
      creator.publicKey
    );

    // 3. Create Creator Token Account
    creatorTokenAccount = await createAccount(
      provider.connection,
      (creator as any).payer,
      mint,
      creator.publicKey
    );

    // 4. Create Participant 2 Token Account and fund it
    participant2TokenAccount = await createAccount(
      provider.connection,
      (creator as any).payer,
      mint,
      participant2.publicKey
    );

    // 5. Mint tokens to both
    await mintTo(provider.connection, (creator as any).payer, mint, creatorTokenAccount, creator.publicKey, 10000000);
    await mintTo(provider.connection, (creator as any).payer, mint, participant2TokenAccount, creator.publicKey, 10000000);

    // Airdrop SOL to participant 2
    const signature = await provider.connection.requestAirdrop(participant2.publicKey, 1000000000);
    await provider.connection.confirmTransaction(signature);
  });

  it("1. Initialize Agreement", async () => {
    const [agreementPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("agreement"), Buffer.from(agreementId)],
      program.programId
    );

    const [vaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), agreementPDA.toBuffer()],
      program.programId
    );

    await program.methods
      .initPerformanceAgreement(agreementId, guaranteeAmount, ruleHash)
      .accounts({
        creator: creator.publicKey,
        agreement: agreementPDA,
        mint: mint,
        vault: vaultPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const account = await program.account.agreementAccount.fetch(agreementPDA);
    expect(account.agreementId).to.equal(agreementId);
    expect(account.guaranteeAmount.toString()).to.equal(guaranteeAmount.toString());
    expect(account.status).to.deep.equal({ formation: {} });
  });

  it("2. Participants Join (João and Mock-Lukas)", async () => {
    const [agreementPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("agreement"), Buffer.from(agreementId)],
      program.programId
    );

    const [vaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), agreementPDA.toBuffer()],
      program.programId
    );

    // Join 1: Creator (João)
    await program.methods
      .joinAgreement()
      .accounts({
        participant: creator.publicKey,
        participantTokenAccount: creatorTokenAccount,
        agreement: agreementPDA,
        vault: vaultPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    // Join 2: Participant 2 (Lukas)
    await program.methods
      .joinAgreement()
      .accounts({
        participant: participant2.publicKey,
        participantTokenAccount: participant2TokenAccount,
        agreement: agreementPDA,
        vault: vaultPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([participant2])
      .rpc();

    const account = await program.account.agreementAccount.fetch(agreementPDA);
    expect(account.participantCount.toNumber()).to.equal(2);
    expect(account.totalGuarantee.toString()).to.equal(guaranteeAmount.muln(2).toString());
  });

  it("3. Settle Agreement: João Wins, Lukas Loses (Slacker Tax Applied)", async () => {
    const [agreementPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("agreement"), Buffer.from(agreementId)],
      program.programId
    );

    const [vaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), agreementPDA.toBuffer()],
      program.programId
    );

    const proofHash = Array(32).fill(9); // Mock proof hash

    // Settle with 1 winner (Creator)
    await program.methods
      .settlePerformanceAgreement(proofHash, new anchor.BN(1))
      .accounts({
        oracle: creator.publicKey, // In test, creator is also oracle
        agreement: agreementPDA,
        vault: vaultPDA,
        treasuryTokenAccount: treasuryTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts([
        { pubkey: creatorTokenAccount, isWritable: true, isSigner: false },
      ])
      .rpc();

    const account = await program.account.agreementAccount.fetch(agreementPDA);
    expect(account.status).to.deep.equal({ settled: {} });

    // Verify balances
    // Total Pool: 2,000,000
    // Winner (João): 1,000,000 (his stake back) + 1,000,000 (Lukas' stake) - 3% Slacker Tax
    // Slacker Tax (3% of 1,000,000): 30,000
    // Final João Reward: 1,970,000
    // Final Treasury: 30,000

    const joaoBalance = await getAccount(provider.connection, creatorTokenAccount);
    const treasuryBalance = await getAccount(provider.connection, treasuryTokenAccount);

    console.log("💰 JOAO Final Balance:", joaoBalance.amount.toString());
    console.log("🏛️ TREASURY Final Balance:", treasuryBalance.amount.toString());

    expect(treasuryBalance.amount.toString()).to.equal("30000");
    // Joo started with 10M, paid 1M, received 1.97M -> 10.97M
    expect(joaoBalance.amount.toString()).to.equal("10970000");
  });
});
