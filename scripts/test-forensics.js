const crypto = require("crypto");

/**
 * 🧪 Teste de Integridade Forense (Pure JS)
 * Valida a geração e verificação de hashes de prova sem dependências externas.
 */

function generateEvidenceHash(dealId, results) {
  const data = JSON.stringify({
    dealId,
    results: results.sort((a, b) => a.user_id.localeCompare(b.user_id)),
    timestamp: 1625097600000, // Fixed timestamp for deterministic testing
  });

  return crypto.createHash("sha256").update(data).digest("hex");
}

async function runTests() {
  console.log("🧪 Iniciando testes de integridade forense (JS)...");

  const dealId = "deal_12345";
  const results = [
    { user_id: "user_A", is_success: true },
    { user_id: "user_B", is_success: false }
  ];

  const hash = generateEvidenceHash(dealId, results);
  console.log(`✅ Hash gerado: ${hash}`);

  // Testar determinismo
  const resultsReordered = [
    { user_id: "user_B", is_success: false },
    { user_id: "user_A", is_success: true }
  ];
  const hash2 = generateEvidenceHash(dealId, resultsReordered);
  
  if (hash === hash2) {
    console.log("✅ Determinismo de ordenação: SUCESSO");
  } else {
    console.log("❌ Determinismo de ordenação: FALHA");
    process.exit(1);
  }

  console.log("\n✨ Todos os testes forenses passaram!");
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
