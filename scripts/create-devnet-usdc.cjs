/**
 * Creates a custom devnet USDC token where the fee payer is the mint authority.
 * Then mints an initial supply to the treasury and to an optional recipient.
 *
 * Usage:
 *   node scripts/create-devnet-usdc.cjs [recipient_pubkey]
 *
 * Outputs the new MINT ADDRESS — add it to .env.local as NEXT_PUBLIC_USDC_MINT_DEVNET
 */

"use strict"

const { Connection, Keypair, PublicKey, clusterApiUrl } = require("@solana/web3.js")
const {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} = require("@solana/spl-token")
const fs   = require("fs")
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

const DECIMALS        = 6
const TREASURY_SUPPLY = 1_000_000   // 1M USDC for treasury
const USER_GRANT      = 1_000       // 1k USDC per recipient arg

async function main() {
  const recipientArg = process.argv[2] ?? null

  const b64 = process.env.APP_FEE_PAYER_KEY
  if (!b64) { console.error("APP_FEE_PAYER_KEY not set"); process.exit(1) }

  const feePayer  = Keypair.fromSecretKey(new Uint8Array(Buffer.from(b64, "base64")))
  const rpcUrl    = process.env.SOLANA_RPC_URL ?? clusterApiUrl("devnet")
  const connection = new Connection(rpcUrl, "confirmed")

  console.log("Fee payer  :", feePayer.publicKey.toBase58())
  console.log("RPC        :", rpcUrl)

  // ── SOL balance check ─────────────────────────────────────────────────────
  const solBalance = await connection.getBalance(feePayer.publicKey)
  console.log(`SOL balance: ${(solBalance / 1e9).toFixed(4)} SOL`)
  if (solBalance < 10_000_000) {
    console.error("Not enough SOL. Airdrop first: https://faucet.solana.com/")
    process.exit(1)
  }

  // ── Create mint (fee payer = mint authority + freeze authority) ───────────
  console.log("\nCreating USDC devnet mint...")
  const mintAddress = await createMint(
    connection,
    feePayer,             // payer
    feePayer.publicKey,   // mint authority
    feePayer.publicKey,   // freeze authority
    DECIMALS,
  )
  console.log("✓ Mint address:", mintAddress.toBase58())

  // ── Mint treasury supply to fee payer ─────────────────────────────────────
  const treasuryATA = await getOrCreateAssociatedTokenAccount(
    connection, feePayer, mintAddress, feePayer.publicKey
  )
  await mintTo(
    connection, feePayer, mintAddress, treasuryATA.address, feePayer,
    BigInt(TREASURY_SUPPLY) * BigInt(10 ** DECIMALS)
  )
  console.log(`✓ Minted ${TREASURY_SUPPLY.toLocaleString()} USDC to treasury (${feePayer.publicKey.toBase58()})`)

  // ── Mint to optional recipient ─────────────────────────────────────────────
  if (recipientArg) {
    const recipient    = new PublicKey(recipientArg)
    const recipientATA = await getOrCreateAssociatedTokenAccount(
      connection, feePayer, mintAddress, recipient
    )
    await mintTo(
      connection, feePayer, mintAddress, recipientATA.address, feePayer,
      BigInt(USER_GRANT) * BigInt(10 ** DECIMALS)
    )
    console.log(`✓ Minted ${USER_GRANT} USDC to recipient (${recipient.toBase58()})`)
  }

  // ── Write mint address to .env.local ──────────────────────────────────────
  const mintLine = `NEXT_PUBLIC_USDC_MINT_DEVNET=${mintAddress.toBase58()}`
  let envContent = fs.readFileSync(envPath, "utf-8")
  if (envContent.includes("NEXT_PUBLIC_USDC_MINT_DEVNET=")) {
    envContent = envContent.replace(/NEXT_PUBLIC_USDC_MINT_DEVNET=.*/g, mintLine)
  } else {
    envContent += `\n${mintLine}\n`
  }
  fs.writeFileSync(envPath, envContent)

  console.log("\n─────────────────────────────────────────────────────")
  console.log(`NEXT_PUBLIC_USDC_MINT_DEVNET=${mintAddress.toBase58()}`)
  console.log("Written to .env.local ✓")
  console.log("─────────────────────────────────────────────────────")
  console.log("\nDeploy this env var to Vercel:")
  console.log(`  vercel env add NEXT_PUBLIC_USDC_MINT_DEVNET`)
  console.log(`  (value: ${mintAddress.toBase58()})`)
}

main().catch((e) => { console.error(e); process.exit(1) })
