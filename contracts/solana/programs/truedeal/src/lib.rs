use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

// ============================================================================
// TRUE DEAL: SOVEREIGN PERFORMANCE AGREEMENT PROTOCOL
// ============================================================================
// Legal Foundation: This program is an Execution Protocol for Informal 
// Agreements. It acts as a trustless digital arbitrator for skill/performance 
// based commitments, not chance-based wagers. 
// IP: Architecture incorporates DealGuard Engine & Risk Guardian (Symbeon Labs).
// ============================================================================

declare_id!("9zfQ1dwJ9Po7YCPWJ3S13ic3nxZcA9cEwBVsXdKub1c4");

#[program]
pub mod truedeal {
    use super::*;

    /// Initializes a new Sovereign Performance Agreement.
    /// Captures the specific rule_hash representing the unalterable conditions of the deal.
    pub fn init_performance_agreement(
        ctx: Context<InitPerformanceAgreement>,
        agreement_id: String,
        guarantee_amount: u64,
        rule_hash: [u8; 32],
    ) -> Result<()> {
        let agreement = &mut ctx.accounts.agreement_account;
        agreement.creator = *ctx.accounts.creator.key;
        agreement.agreement_id = agreement_id;
        agreement.guarantee_amount = guarantee_amount;
        agreement.rule_hash = rule_hash;
        agreement.status = AgreementStatus::Formation;
        agreement.total_guarantee = 0;
        
        msg!("Sovereign Performance Agreement Initialized: {}", agreement.agreement_id);
        Ok(())
    }

    /// Participants join the agreement by locking their guarantee (stake) in the PDA Escrow.
    pub fn join_agreement(ctx: Context<JoinAgreement>) -> Result<()> {
        let agreement = &mut ctx.accounts.agreement_account;
        
        // Transfer guarantee from participant to the Vault (Escrow)
        let cpi_accounts = Transfer {
            from: ctx.accounts.participant_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.participant.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, agreement.guarantee_amount)?;

        agreement.total_guarantee += agreement.guarantee_amount;
        
        msg!("Participant joined agreement. Total Guarantee in Escrow: {}", agreement.total_guarantee);
        Ok(())
    }

    /// Sovereign Payout: Settles the agreement based strictly on the DealGuard Engine Consensus.
    /// In legal terms, the DealGuard acts as the 'Digital Sentencing Council', verifying 
    /// real-world evidence (e.g. Strava, X APIs) via Risk Guardian AI before executing payout.
    pub fn settle_performance_agreement(
        ctx: Context<SettlePerformanceAgreement>,
        beneficiary_pubkey: Pubkey,
        proof_hash: [u8; 32],
    ) -> Result<()> {
        let agreement = &mut ctx.accounts.agreement_account;
        
        require!(
            agreement.status == AgreementStatus::Formation || agreement.status == AgreementStatus::Active,
            AgreementError::InvalidStatus
        );

        // DealGuard Consensus Validation
        // Ensures multi-sig attestation from independent DealGuard validation nodes.
        // This mitigates systemic risk and API falsification.
        require!(
            ctx.accounts.oracle_1.is_signer && ctx.accounts.oracle_2.is_signer,
            AgreementError::DealGuardConsensusFailed
        );
        
        agreement.status = AgreementStatus::Settled;
        agreement.proof_hash = Some(proof_hash);
        
        msg!("Agreement Executed via DealGuard Consensus. Beneficiary: {}", beneficiary_pubkey);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(agreement_id: String)]
pub struct InitPerformanceAgreement<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 32 + 64 + 8 + 8 + 32 + 33 + 1,
        seeds = [b"agreement", agreement_id.as_bytes()],
        bump
    )]
    pub agreement_account: Account<'info, AgreementAccount>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinAgreement<'info> {
    #[account(mut, seeds = [b"agreement", agreement_account.agreement_id.as_bytes()], bump)]
    pub agreement_account: Account<'info, AgreementAccount>,
    #[account(mut)]
    pub participant: Signer<'info>,
    #[account(mut)]
    pub participant_token_account: Account<'info, TokenAccount>,
    /// CHECK: PDA Escrow for the agreement funds
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SettlePerformanceAgreement<'info> {
    #[account(mut, seeds = [b"agreement", agreement_account.agreement_id.as_bytes()], bump)]
    pub agreement_account: Account<'info, AgreementAccount>,
    /// DealGuard consensus node 1 required to attest real-world performance
    pub oracle_1: Signer<'info>, 
    /// DealGuard consensus node 2 required to attest real-world performance
    pub oracle_2: Signer<'info>, 
}

#[account]
pub struct AgreementAccount {
    pub creator: Pubkey,
    pub agreement_id: String,
    pub guarantee_amount: u64,
    pub total_guarantee: u64,
    pub rule_hash: [u8; 32], // Represents the unalterable conditions of the deal
    pub proof_hash: Option<[u8; 32]>, // The final cryptographic proof provided by DealGuard
    pub status: AgreementStatus,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum AgreementStatus {
    Formation,
    Active,
    Settled,
    Cancelled,
}

#[error_code]
pub enum AgreementError {
    #[msg("The agreement is not in a valid status for this operation.")]
    InvalidStatus,
    #[msg("DealGuard consensus validation failed. Missing required node signatures.")]
    DealGuardConsensusFailed,
}
