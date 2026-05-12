import { PublicKey } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"

// Circle's official USDC mints
export const USDC_MINT_DEVNET  = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU")
export const USDC_MINT_MAINNET = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")

export const USDC_MINT =
  process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta"
    ? USDC_MINT_MAINNET
    : USDC_MINT_DEVNET

export const USDC_DECIMALS = 6  // 1 USDC = 1_000_000 micro-units

export { TOKEN_PROGRAM_ID }

// entry_amount (USD) → USDC micro-units (bigint for on-chain use)
export function toUSDCUnits(usdAmount: number): bigint {
  return BigInt(Math.round(usdAmount * 10 ** USDC_DECIMALS))
}

// USDC micro-units → USD display number
export function fromUSDCUnits(units: bigint | number): number {
  return Number(units) / 10 ** USDC_DECIMALS
}

// Format for UI display: 10_000_000 → "$10.00 USDC"
export function formatUSDC(units: number): string {
  return `$${(units / 10 ** USDC_DECIMALS).toFixed(2)} USDC`
}
