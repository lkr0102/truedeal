import idl from "./idl.json"

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_TRUEDEAL_PROGRAM_ID ?? "9zfQ1dwJ9Po7YCPWJ3S13ic3nxZcA9cEwBVsXdKub1c4"
)

export function getProvider(wallet: Keypair) {
  const connection = getConnection()
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

export function getProgram(provider: AnchorProvider) {
  return new Program(idl as Idl, provider)
}
