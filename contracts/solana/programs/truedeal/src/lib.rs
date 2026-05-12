use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

// ============================================================================
// TRUE DEAL: SOVEREIGN PERFORMANCE AGREEMENT PROTOCOL
// ============================================================================
// Legal Foundation: This program is an Execution Protocol for Informal
// Agreements. It acts as a trustless digital arbitrator for skill/performance
// based commitments, not chance-based wagers.
// IP: Architecture incorporates DealGuard Engine & Risk Guardian (Symbeon Labs).
// ============================================================================

declare_id!("885scJ15uLUjnG8tfPUFbx4pAS6ZCkHpSuFd9ZUaxFbZ");

#[program]
pub mod truedeal {
    use super::*;

    /// Initializes a new Sovereign Performance Agreement.
    /// Creates a USDC SPL vault PDA to hold all participant stakes.
    pub fn init_performance_agreement(
        ctx: Context<InitPerformanceAgreement>,
        agreement_id: String,
        guarantee_amount: u64,
        rule_hash: [u8; 32],
    ) -> Result<()> {
        let agreement = &mut ctx.accounts.agreement_account;
        agreement.creator           = *ctx.accounts.creator.key;
        agreement.agreement_id      = agreement_id;
        agreement.guarantee_amount  = guarantee_amount;
        agreement.rule_hash         = rule_hash;
        agreement.status            = AgreementStatus::Formation;
        agreement.total_guarantee   = 0;
        agreement.participant_count = 0;
        agreement.winners_count     = 0;
        agreement.vault             = ctx.accounts.vault.key();

        msg!("Sovereign Performance Agreement Initialized: {}", agreement.agreement_id);
        Ok(())
    }

    /// Participants join by transferring USDC from their ATA to the PDA vault.
    pub fn join_agreement(ctx: Context<JoinAgreement>) -> Result<()> {
        let guarantee = ctx.accounts.agreement_account.guarantee_amount;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from:      ctx.accounts.participant_usdc_account.to_account_info(),
                    to:        ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.participant.to_account_info(),
                },
            ),
            guarantee,
        )?;

        let agreement = &mut ctx.accounts.agreement_account;
        agreement.total_guarantee   += guarantee;
        agreement.participant_count += 1;

        msg!("Participant joined. Total USDC in escrow: {}", agreement.total_guarantee);
        Ok(())
    }

    /// Sovereign Payout: settles via DualGuard Consensus.
    /// Slacker Tax: 3% of losers' pool to treasury; remainder split among winners.
    /// Winners are passed as remaining_accounts (their USDC ATAs).
    pub fn settle_performance_agreement(
        ctx: Context<SettlePerformanceAgreement>,
        winners_count: u64,
        proof_hash: [u8; 32],
    ) -> Result<()> {
        let agreement = &mut ctx.accounts.agreement_account;

        require!(
            agreement.status == AgreementStatus::Formation
                || agreement.status == AgreementStatus::Active,
            AgreementError::InvalidStatus
        );
        require!(
            ctx.accounts.oracle_1.is_signer && ctx.accounts.oracle_2.is_signer,
            AgreementError::DealGuardConsensusFailed
        );

        agreement.winners_count = winners_count;
        agreement.status        = AgreementStatus::Settled;
        agreement.proof_hash    = Some(proof_hash);

        let total_guarantee   = agreement.total_guarantee;
        let guarantee_amount  = agreement.guarantee_amount;
        let participant_count = agreement.participant_count;
        let agreement_id      = agreement.agreement_id.clone();
        let bump              = ctx.bumps.agreement_account;
        let seeds             = &[b"agreement".as_ref(), agreement_id.as_bytes(), &[bump]];
        let signer            = &[&seeds[..]];

        if winners_count > 0 {
            let losers_count      = participant_count.saturating_sub(winners_count);
            let slacker_pool      = losers_count.saturating_mul(guarantee_amount);
            let platform_fee      = slacker_pool.saturating_mul(3).checked_div(100).unwrap_or(0);
            let distributable     = slacker_pool.saturating_sub(platform_fee);
            let reward_per_winner = distributable.checked_div(winners_count).unwrap_or(0);
            let total_payout      = guarantee_amount.saturating_add(reward_per_winner);

            // 1. Platform fee (3% of losers' pool) → treasury
            if platform_fee > 0 {
                token::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        Transfer {
                            from:      ctx.accounts.vault.to_account_info(),
                            to:        ctx.accounts.treasury_token_account.to_account_info(),
                            authority: agreement.to_account_info(),
                        },
                        signer,
                    ),
                    platform_fee,
                )?;
            }

            // 2. Payout each winner's USDC ATA (remaining_accounts)
            for winner_ata in ctx.remaining_accounts.iter() {
                token::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        Transfer {
                            from:      ctx.accounts.vault.to_account_info(),
                            to:        winner_ata.clone(),
                            authority: agreement.to_account_info(),
                        },
                        signer,
                    ),
                    total_payout,
                )?;
            }
        } else if total_guarantee > 0 {
            // No winners: 100% of pot → treasury
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from:      ctx.accounts.vault.to_account_info(),
                        to:        ctx.accounts.treasury_token_account.to_account_info(),
                        authority: agreement.to_account_info(),
                    },
                    signer,
                ),
                total_guarantee,
            )?;
        }

        msg!("Agreement Settled. Winners: {}. Platform fee collected.", winners_count);
        Ok(())
    }
}

// ── Account structs ───────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(agreement_id: String)]
pub struct InitPerformanceAgreement<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 32 + 68 + 8 + 8 + 8 + 8 + 32 + 32 + 33 + 1, // 238 bytes
        seeds = [b"agreement", agreement_id.as_bytes()],
        bump
    )]
    pub agreement_account: Account<'info, AgreementAccount>,

    /// USDC escrow vault — PDA-owned SPL token account, created at init
    #[account(
        init,
        payer = creator,
        token::mint      = usdc_mint,
        token::authority = agreement_account,
        seeds = [b"vault", agreement_id.as_bytes()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub usdc_mint:      Account<'info, Mint>,
    pub token_program:  Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinAgreement<'info> {
    #[account(mut, seeds = [b"agreement", agreement_account.agreement_id.as_bytes()], bump)]
    pub agreement_account: Account<'info, AgreementAccount>,

    #[account(mut)]
    pub participant: Signer<'info>,

    #[account(
        mut,
        constraint = participant_usdc_account.owner == *participant.key  @ AgreementError::InvalidTokenAccount,
        constraint = participant_usdc_account.mint  == usdc_mint.key()   @ AgreementError::InvalidTokenAccount,
    )]
    pub participant_usdc_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault", agreement_account.agreement_id.as_bytes()],
        bump,
        token::mint      = usdc_mint,
        token::authority = agreement_account,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub usdc_mint:     Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SettlePerformanceAgreement<'info> {
    #[account(mut, seeds = [b"agreement", agreement_account.agreement_id.as_bytes()], bump)]
    pub agreement_account: Account<'info, AgreementAccount>,

    pub oracle_1: Signer<'info>,
    pub oracle_2: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", agreement_account.agreement_id.as_bytes()],
        bump,
        token::mint      = usdc_mint,
        token::authority = agreement_account,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Treasury USDC ATA — receives the 3% platform fee
    #[account(
        mut,
        constraint = treasury_token_account.mint == usdc_mint.key() @ AgreementError::InvalidTokenAccount
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub usdc_mint:     Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

// ── State ─────────────────────────────────────────────────────────────────────

#[account]
pub struct AgreementAccount {
    pub creator:           Pubkey,
    pub agreement_id:      String,         // max 64 chars → 4+64 = 68 bytes
    pub guarantee_amount:  u64,
    pub total_guarantee:   u64,
    pub participant_count: u64,
    pub winners_count:     u64,
    pub vault:             Pubkey,
    pub rule_hash:         [u8; 32],
    pub proof_hash:        Option<[u8; 32]>,
    pub status:            AgreementStatus,
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
    #[msg("Token account invalid: mint or owner does not match.")]
    InvalidTokenAccount,
}
