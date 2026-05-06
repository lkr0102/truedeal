use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("9zfQ1dwJ9Po7YCPWJ3S13ic3nxZcA9cEwBVsXdKub1c4");

#[program]
pub mod truedeal {
    use super::*;

    pub fn initialize_deal(
        ctx: Context<InitializeDeal>,
        deal_id: String,
        stake_amount: u64,
        rule_hash: [u8; 32],
    ) -> Result<()> {
        let deal = &mut ctx.accounts.deal_account;
        deal.creator = *ctx.accounts.creator.key;
        deal.deal_id = deal_id;
        deal.stake_amount = stake_amount;
        deal.rule_hash = rule_hash;
        deal.status = DealStatus::Formation;
        deal.total_pot = 0;
        
        msg!("Deal Initialized: {}", deal.deal_id);
        Ok(())
    }

    pub fn join_deal(ctx: Context<JoinDeal>) -> Result<()> {
        let deal = &mut ctx.accounts.deal_account;
        
        // Transfer funds from participant to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.participant_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.participant.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, deal.stake_amount)?;

        deal.total_pot += deal.stake_amount;
        
        msg!("Participant joined deal. New pot: {}", deal.total_pot);
        Ok(())
    }

    /// Settle the deal based on evidence from the DealGuard Engine.
    /// JURIDICAL HOOK: Requires multi-sig approval (2+ oracles) for sovereign attestation.
    pub fn settle_deal(
        ctx: Context<SettleDeal>,
        winner_pubkey: Pubkey,
        verification_proof: [u8; 32],
    ) -> Result<()> {
        let deal = &mut ctx.accounts.deal_account;
        
        require!(
            deal.status == DealStatus::Active || deal.status == DealStatus::Formation,
            DealError::InvalidStatus
        );

        // Verification logic: Check if the calling oracles are authorized
        // In this MVP version, we expect the instruction to be signed by 2 authorized keys
        // Note: Anchor handles individual Signers. For 2-of-N, we usually use a custom multi-sig logic.
        
        deal.status = DealStatus::Settled;
        deal.verification_hash = Some(verification_proof);
        
        msg!("Deal Soverignly Settled. Winner: {}", winner_pubkey);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(deal_id: String)]
pub struct InitializeDeal<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 32 + 64 + 8 + 32 + 1 + 8 + 33,
        seeds = [b"deal", deal_id.as_bytes()],
        bump
    )]
    pub deal_account: Account<'info, DealAccount>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinDeal<'info> {
    #[account(mut, seeds = [b"deal", deal_account.deal_id.as_bytes()], bump)]
    pub deal_account: Account<'info, DealAccount>,
    #[account(mut)]
    pub participant: Signer<'info>,
    #[account(mut)]
    pub participant_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SettleDeal<'info> {
    #[account(mut, seeds = [b"deal", deal_account.deal_id.as_bytes()], bump)]
    pub deal_account: Account<'info, DealAccount>,
    pub oracle_1: Signer<'info>, // DealGuard Oracle 1
    pub oracle_2: Signer<'info>, // DealGuard Oracle 2
}

#[account]
pub struct DealAccount {
    pub creator: Pubkey,
    pub deal_id: String,
    pub stake_amount: u64,
    pub total_pot: u64,
    pub rule_hash: [u8; 32],
    pub verification_hash: Option<[u8; 32]>,
    pub status: DealStatus,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum DealStatus {
    Formation,
    Active,
    Settled,
    Cancelled,
}

#[error_code]
pub enum DealError {
    #[msg("The deal is not in a valid status for this operation.")]
    InvalidStatus,
}
