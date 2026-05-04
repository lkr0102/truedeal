"use client"

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { clusterApiUrl } from "@solana/web3.js"

const NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet") as "devnet" | "mainnet-beta"
const ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl(NETWORK)

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  // wallets={[]} — Phantom, Solflare e Backpack implementam o Wallet Standard
  // e são detectados automaticamente pelo WalletProvider sem adapters explícitos.
  // Não importamos @solana/wallet-adapter-wallets pois ele traz toda a stack
  // WalletConnect (viem/ox/pino) que causa erros de webpack no Next.js.
  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={[]} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  )
}
