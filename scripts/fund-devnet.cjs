/**
 * Fund devnet: mint or transfer 1000 USDC to a target wallet.
 * Usage: APP_FEE_PAYER_KEY=... SOLANA_RPC_URL=... node scripts/fund-devnet.cjs <recipient>
 *
 * If the fee payer IS the USDC mint authority → mintTo (create tokens from thin air).
 * If NOT the mint authority → transfer from fee payer's own USDC ATA (treasury).
 */

"use strict"

const { Connection, Keypair, PublicKey, clusterApiUrl } = require("@solana/web3.js")
const {
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
  getAssociatedTokenAddress,
  getAccount,
} = require("@solana/spl-token")
const fs = require("fs")
const path = require("path")

// ── Load .env.local ───────────────────────────────────────────────────────────
const envPath = path.join(__dirname, "..", ".env.local")
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8")
    .split("\n")
    .forEach((line) => {
      const [key, ...rest] = line.split("=")
      if (key && rest.length && !process.env[key.trim()]) {
        process.env[key.trim()] = rest.join("=").trim()
      }
    })
}

const USDC_MINT_DEVNET = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU")
const AMOUNT_USDC = 1_000          // 1000 USDC
const DECIMALS   = 6
const AMOUNT_RAW = BigInt(AMOUNT_USDC) * BigInt(10 ** DECIMALS)

async function main() {
  const recipientArg = process.argv[2]
  if (!recipientArg) {
    console.error("Usage: node scripts/fund-devnet.cjs <recipient_pubkey>")
    process.exit(1)
  }

  const b64 = process.env.APP_FEE_PAYER_KEY
  if (!b64) {
    console.error("APP_FEE_PAYER_KEY is not set in .env.local")
    process.exit(1)
  }

  const feePayer  = Keypair.fromSecretKey(new Uint8Array(Buffer.from(b64, "base64")))
  const recipient = new PublicKey(recipientArg)
  const rpcUrl    = process.env.SOLANA_RPC_URL ?? clusterApiUrl("devnet")
  const connection = new Connection(rpcUrl, "confirmed")

  console.log("Fee payer :", feePayer.publicKey.toBase58())
  console.log("Recipient :", recipient.toBase58())
  console.log("RPC       :", rpcUrl)
  console.log("")

  // ── Check fee payer SOL balance ───────────────────────────────────────────
  const solBalance = await connection.getBalance(feePayer.publicKey)
  console.log(`Fee payer SOL balance: ${(solBalance / 1e9).toFixed(4)} SOL`)
  if (solBalance < 10_000_000) {  // < 0.01 SOL
    console.error("Fee payer has insufficient SOL. Run: solana airdrop 2 " + feePayer.publicKey.toBase58() + " --url devnet")
    console.error("Or hit: https://faucet.solana.com/ with address " + feePayer.publicKey.toBase58())
    process.exit(1)
  }

  // ── Check USDC mint authority ─────────────────────────────────────────────
  const mintInfo = await getMint(connection, USDC_MINT_DEVNET)
  const isMintAuthority = mintInfo.mintAuthority?.toBase58() === feePayer.publicKey.toBase58()
  console.log(`USDC mint authority : ${mintInfo.mintAuthority?.toBase58() ?? "none"}`)
  console.log(`Fee payer is authority: ${isMintAuthority}`)
  console.log("")

  // ── Get or create recipient ATA ───────────────────────────────────────────
  const recipientATA = await getOrCreateAssociatedTokenAccount(
    connection, feePayer, USDC_MINT_DEVNET, recipient
  )
  console.log(`Recipient ATA: ${recipientATA.address.toBase58()}`)

  if (isMintAuthority) {
    // ── Path A: mint directly ─────────────────────────────────────────────
    console.log(`Minting ${AMOUNT_USDC} USDC to ${recipient.toBase58()} ...`)
    const sig = await mintTo(
      connection, feePayer, USDC_MINT_DEVNET, recipientATA.address, feePayer, AMOUNT_RAW
    )
    console.log(`✓ Minted! TX: ${sig}`)
  } else {
    // ── Path B: transfer from fee payer treasury ──────────────────────────
    const feePayerATA = await getOrCreateAssociatedTokenAccount(
      connection, feePayer, USDC_MINT_DEVNET, feePayer.publicKey
    )
    let feePayerBalance
    try {
      const account = await getAccount(connection, feePayerATA.address)
      feePayerBalance = account.amount
    } catch {
      feePayerBalance = BigInt(0)
    }

    console.log(`Fee payer USDC balance: ${Number(feePayerBalance) / 10 ** DECIMALS} USDC`)

    if (feePayerBalance < AMOUNT_RAW) {
      console.error(`\nFee payer is NOT the mint authority and has insufficient USDC.`)
      console.error(`The USDC at 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU is Circle's devnet token.`)
      console.error(`Fund the treasury manually at: https://faucet.circle.com/`)
      console.error(`Treasury address: ${feePayer.publicKey.toBase58()}`)
      process.exit(1)
    }

    console.log(`Transferring ${AMOUNT_USDC} USDC from treasury to ${recipient.toBase58()} ...`)
    const sig = await transfer(
      connection, feePayer, feePayerATA.address, recipientATA.address, feePayer, AMOUNT_RAW
    )
    console.log(`✓ Transferred! TX: ${sig}`)
  }
}

main().catch((err) => {
  console.error("Error:", err.message ?? err)
  process.exit(1)
})
