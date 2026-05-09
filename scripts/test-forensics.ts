import { generateEvidenceHash, verifyEvidenceHash } from "../lib/integrations/crypto-proof"

/**
 * 🧪 Teste de Integridade Forense
 * Valida a geração e verificação de hashes de prova.
 */

async function runTests() {
  console.log("🧪 Iniciando testes de integridade forense...")

  const dealId = "deal_12345"
  const results = [
    { user_id: "user_A", is_success: true },
    { user_id: "user_B", is_success: false }
  ]

  const hash = generateEvidenceHash(dealId, results)
  console.log(`✅ Hash gerado: ${hash}`)

  const isValid = verifyEvidenceHash(hash, dealId, results)
  if (isValid) {
    console.log("✅ Verificação de hash: SUCESSO")
  } else {
    console.log("❌ Verificação de hash: FALHA")
    process.exit(1)
  }

  // Testar ordenação (o hash deve ser determinístico independente da ordem dos resultados)
  const resultsReordered = [
    { user_id: "user_B", is_success: false },
    { user_id: "user_A", is_success: true }
  ]
  const hash2 = generateEvidenceHash(dealId, resultsReordered)
  
  if (hash === hash2) {
    console.log("✅ Determinismo de ordenação: SUCESSO")
  } else {
    console.log("❌ Determinismo de ordenação: FALHA")
    process.exit(1)
  }

  console.log("\n✨ Todos os testes forenses passaram!")
}

runTests().catch(err => {
  console.error(err)
  process.exit(1)
})
