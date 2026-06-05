import crypto from "crypto"

/**
 * 🔒 Evidence Hashing Utility
 * Gera hashes de prova forense (32 bytes) para submissão on-chain.
 */

export function generateEvidenceHash(dealId: string, results: any[]): string {
  const data = JSON.stringify({
    dealId,
    results: results.map(r => ({
      user_id:    r.user_id,
      is_success: r.is_success,
      risk_score: r.risk_score ?? 0,
    })).sort((a, b) => a.user_id.localeCompare(b.user_id)),
  })

  return crypto.createHash("sha256").update(data).digest("hex")
}

export function verifyEvidenceHash(hash: string, dealId: string, results: any[]): boolean {
  const calculatedHash = generateEvidenceHash(dealId, results)
  return hash === calculatedHash
}
