import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor"
import { Connection, Keypair, PublicKey } from "@solana/web3.js"
import { getConnection } from "./fee-payer"

// We will need the IDL. For now, we'll define a minimal one or load it from a JSON.
// Since we just created the program, I'll provide a placeholder or wait for build.
// For the sake of unblocking, I'll use the generated IDL if I can, but I can't build yet.
// I'll define the Program ID and use a Proxy pattern for now.

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_TRUEDEAL_PROGRAM_ID ?? "TrDeaL1111111111111111111111111111111111111"
)

export function getProvider(wallet: Keypair) {
  const connection = getConnection()
  // Mock wallet for AnchorProvider
  const anchorWallet = {
    publicKey: wallet.publicKey,
    signTransaction: async (tx: any) => {
      tx.partialSign(wallet)
      return tx
    },
    signAllTransactions: async (txs: any[]) => {
      txs.forEach(tx => tx.partialSign(wallet))
      return txs
    }
  }

  return new AnchorProvider(connection, anchorWallet as any, {
    commitment: "confirmed",
  })
}

// Note: In a real scenario, we'd import the actual IDL JSON.
export function getProgram(provider: AnchorProvider) {
  // This is a placeholder until the IDL is properly generated and imported
  return new Program({} as Idl, PROGRAM_ID, provider)
}
