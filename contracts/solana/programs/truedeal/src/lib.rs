use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("9zfQ1dwJ9Po7YCPWJ3S13ic3nxZcA9cEwBVsXdKub1c4");

#[program]
pub mod truedeal {
    use super::*;

    /// Initializes a new Performance Agreement (Acordo).
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
        
        msg!("Performance Agreement Initialized: {}", agreement.agreement_id);
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

    /// Settle the agreement based on the DEALGUARD Engine consensus.
    /// Requires signatures from authorized oracles (Multi-sig Attestation).
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

        // TODO: Implement multi-sig verification for DEALGUARD Oracles (oracle_1 and oracle_2)
        
        agreement.status = AgreementStatus::Settled;
        agreement.proof_hash = Some(proof_hash);
        
        msg!("Agreement Settled via DEALGUARD. Beneficiary: {}", beneficiary_pubkey);
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
    pub oracle_1: Signer<'info>, // DEALGUARD Oracle 1
    pub oracle_2: Signer<'info>, // DEALGUARD Oracle 2
}

#[account]
pub struct AgreementAccount {
    pub creator: Pubkey,
    pub agreement_id: String,
    pub guarantee_amount: u64,
    pub total_guarantee: u64,
    pub rule_hash: [u8; 32],
    pub proof_hash: Option<[u8; 32]>,
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
}
