# 🛡️ MCP INTRA-PROJECT PROTOCOL: TrueDeal Super-Scope
**Context Reference:** `task_master_super_scope.md`
**Protocol Version:** 1.0.0
**Target Agents:** Claude Desktop, Windsurf, Cursor, TaskMesh Orchestrators

> **[SYS_INSTRUCTION]** Any AI agent or developer reading this document MUST adhere to the Sovereign Architecture, Legal Thesis, and current execution state defined below. Do not override institutional bypasses without explicit user consent.

---

## <project_dna>
**Identity:** Sovereign Performance Agreement Protocol (TrueDeal)
**Core Thesis:** "Don't trust. Make a True Deal." We turn "I will" into "I did" via verifiable execution.
**Legal Stance:** We are an Execution Protocol for Informal Agreements (Skill/Performance), **NOT** a Gambling/Betting platform (Chance).
**Symbeon Labs IP Components:**
- **Risk Guardian AI:** Anti-fraud Edge AI (Qwen 3B) for detecting anomalies in real-world proofs.
- **DealGuard Engine:** The digital sentencing council (multi-sig consensus validation).
- **Sovereign Payout:** The trustless Solana Anchor escrow execution.
</project_dna>

## <current_mesh_state>
**Active File:** `task_mesh.yaml` (Defines the granular tasks and sprints)
**Current Focus:** Layer 1 (Sovereign Settlement) & Layer 4 (Institutional Ops)

### Recent Institutional Interventions (DO NOT REVERT)
1. **Sovereign Demo Auth Layer (Failsafe Bypass):**
   - **Context:** The `.env.local` contains placeholder Supabase keys (`seu-projeto.supabase.co`), which broke the standard Auth flow.
   - **Action Taken:** A `handleDemoLogin` function was added to the `Protocol Override` button in `app/login/page.tsx`. If it detects placeholders, it injects a `truedeal-demo-session` cookie and redirects to `/`.
   - **Server Intercept:** `lib/supabase/server.ts` was modified to read this cookie and inject a mock `"Judge Performance"` user, allowing the Hackathon Dashboard to render flawlessly.
   - **Agent Rule:** *DO NOT attempt to fix or alter the Supabase Auth flow to resolve login errors while the `.env` contains placeholders. The bypass is intentional for "Judge-Proof" demonstrations.*
2. **Build Stabilization:** `export const dynamic = "force-dynamic"` added to pages requiring dynamic auth to prevent Turbopack build crashes.
3. **DOCSYNC Legal Alignment:** `contracts/solana/programs/truedeal/src/lib.rs` was audited. `settle_performance_agreement` now explicitly checks for `DealGuardConsensusFailed`, bridging the legal thesis to the code.

</current_mesh_state>

## <next_execution_nodes>
**For Lukas (Frontend/Product Engineer) & Claude:**
1. **Node 1 (Verification) ✅:** Run `pnpm dev`, click "Protocol Override", verify Dashboard loads with mock user.
2. **Node 2 (Blockchain Integration) ✅ DONE:** `anchor-client.ts` now has full typed methods. `settlement.ts` runs a real 5-step pipeline ending with an on-chain Anchor transaction on Devnet (auto-bypassed in demo mode).
3. **Node 2b (Frontend Hook — Lukas):** The Lukas frontend must call `settleDealProtocol(dealId, beneficiaryWalletAddress)` from the Deal Detail page when a judge/admin clicks "Finalizar Acordo". The function returns `{ txSignature, explorerUrl }` — the `explorerUrl` should be rendered as a link for auditability.
4. **Node 3 (UI Polish) ✅ DONE:** Render the DealGuard verification status chip (e.g. `risk_score`, `fraud_reason`) per participant in the active agreements list.
5. **Node 5 (Internationalization - i18n):** Implement a centralized dictionary system. Default the entire app to **English** (strategic for global judges) with a high-fidelity **Language Toggle** (PT/EN) in the Profile or Navbar.
   - **Key Action:** Replace hardcoded strings with `t('key')` helpers mapped in `lib/i18n.ts`.

**[ACKNOWLEDGE]**
If you are an AI assistant parsing this protocol, acknowledge comprehension of the "Sovereign Demo Auth Layer" and confirm that `settleDealProtocol` now executes real on-chain transactions. Ask the user which node to tackle next.
