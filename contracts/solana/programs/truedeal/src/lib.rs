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
        agreement.participant_count = 0;
        agreement.winners_count = 0;
        agreement.vault = ctx.accounts.vault.key();
        
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
        agreement.participant_count += 1;
        
        msg!("Participant joined agreement. Total Guarantee in Escrow: {}", agreement.total_guarantee);
        Ok(())
    }

    /// Sovereign Payout: Settles the agreement based strictly on the DealGuard Engine Consensus.
    /// Implements the 'Slacker Tax': 3% fee on losers' pool, proportional reward for winners.
    pub fn settle_performance_agreement(
        ctx: Context<SettlePerformanceAgreement>,
        winners_count: u64,
        proof_hash: [u8; 32],
    ) -> Result<()> {
        let agreement = &mut ctx.accounts.agreement_account;
        
        require!(
            agreement.status == AgreementStatus::Formation || agreement.status == AgreementStatus::Active,
            AgreementError::InvalidStatus
        );

        // DealGuard Consensus Validation
        require!(
            ctx.accounts.oracle_1.is_signer && ctx.accounts.oracle_2.is_signer,
            AgreementError::DealGuardConsensusFailed
        );

        agreement.winners_count = winners_count;
        agreement.status = AgreementStatus::Settled;
        agreement.proof_hash = Some(proof_hash);

        // Economic Logic: Slacker Tax
        if winners_count > 0 {
            let losers_count = agreement.participant_count.saturating_sub(winners_count);
            let slacker_pool = losers_count.saturating_mul(agreement.guarantee_amount);
            
            // 3% Platform Fee
            let platform_fee = slacker_pool.saturating_mul(3).checked_div(100).unwrap_or(0);
            let distributable_reward = slacker_pool.saturating_sub(platform_fee);
            let reward_per_winner = distributable_reward.checked_div(winners_count).unwrap_or(0);
            let total_payout_per_winner = agreement.guarantee_amount.saturating_add(reward_per_winner);

            // 1. Transfer Platform Fee to Treasury
            if platform_fee > 0 {
                let cpi_accounts = Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.treasury_token_account.to_account_info(),
                    authority: agreement.to_account_info(),
                };
                // PDA Signer seeds for the agreement
                let agreement_id = agreement.agreement_id.clone();
                let seeds = &[
                    b"agreement",
                    agreement_id.as_bytes(),
                    &[ctx.bumps.agreement_account],
                ];
                let signer = &[&seeds[..]];
                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    cpi_accounts,
                    signer,
                );
                token::transfer(cpi_ctx, platform_fee)?;
            }

            // 2. Transfer Payouts to Winners (using remaining accounts)
            // Expecting winners_count TokenAccounts in remaining_accounts
            for winner_info in ctx.remaining_accounts.iter() {
                let cpi_accounts = Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: winner_info.clone(),
                    authority: agreement.to_account_info(),
                };
                let agreement_id = agreement.agreement_id.clone();
                let seeds = &[
                    b"agreement",
                    agreement_id.as_bytes(),
                    &[ctx.bumps.agreement_account],
                ];
                let signer = &[&seeds[..]];
                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    cpi_accounts,
                    signer,
                );
                token::transfer(cpi_ctx, total_payout_per_winner)?;
            }
        }
        
        msg!("Agreement Settled. Winners: {}, Platform Fee collected.", winners_count);
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
    /// CHECK: The token vault that will hold the funds
    pub vault: AccountInfo<'info>,
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
    /// DealGuard consensus node 1
    pub oracle_1: Signer<'info>, 
    /// DealGuard consensus node 2
    pub oracle_2: Signer<'info>, 
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct AgreementAccount {
    pub creator: Pubkey,
    pub agreement_id: String,
    pub guarantee_amount: u64,
    pub total_guarantee: u64,
    pub participant_count: u64,
    pub winners_count: u64,
    pub vault: Pubkey,
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
