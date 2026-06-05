import crypto from "crypto"

/**
 * 🔒 Evidence Hashing Utility
 * Gera hashes de prova forense (32 bytes) para submissão on-chain.
 */

/**
 * Rule hash: SHA-256 commitment to the deal's verifiable rules, stored on-chain at init.
 * Encodes the deal's immutable parameters so any external party can verify the oracle
 * audited against the same rules that were committed at creation time.
 */
export function generateRuleHash(deal: {
  id:                    string
  verification_type:     string
  verification_channels: string[]
  rule_target:           number | null
  rule_frequency:        string | null
  entry_amount:          number | string
  start_date:            string | null
  end_date:              string | null
}): string {
  const data = JSON.stringify({
    dealId:                deal.id,
    verification_type:     deal.verification_type,
    verification_channels: [...(deal.verification_channels ?? [])].sort(),
    rule_target:           deal.rule_target,
    rule_frequency:        deal.rule_frequency,
    entry_amount:          String(deal.entry_amount),
    start_date:            deal.start_date,
    end_date:              deal.end_date,
  })
  return crypto.createHash("sha256").update(data).digest("hex")
}

/**
 * Evidence hash: SHA-256 of the DealGuard audit results, stored on-chain at settlement.
 * Proves which participants passed/failed according to the committed rules.
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
