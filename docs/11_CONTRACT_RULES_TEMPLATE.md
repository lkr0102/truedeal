# Template: Agreements and Rules Logic Framework (TrueDeal)

This document is a living template designed to capture Lukas's engagement vision (Social/Gamification), cross-reference it with market benchmarks (DietBet, Strava Challenges, Fantasy Sports), and translate everything into a bulletproof Smart Contract Logic (Sovereign Escrow).

## 1. Founder's Vision (Lukas - Social & UX)
*Instruction: Lukas, fill in below how you envision the user journey and the "fun" or "punitive" rules that drive engagement.*
- **Favorite Agreement Types:** (e.g., Weight loss in 30 days, Arriving on time for 1 week)
- **Forfeiture/Failure Rules:** (e.g., Loser pays for dinner, or does the money go to charity?)
- **Engagement Mechanics:** (e.g., "You are losing" notifications, ability to "Taunt" the opponent?)

## 2. Market Benchmark (Competitive Absorption)
*Instruction: Engineering and Strategy fill this section based on billion-dollar apps.*
- **DietBet / StepBet:** 
  - *Risk Logic:* The "Pot" is divided only among the winners. The house (platform) takes its fee (10 to 20%) before the split.
  - *Edge Cases:* If everyone wins, the house waives its fee so no one loses money. If no one wins, the money rolls over to a new challenge or is refunded.
- **Strava / Apple Fitness Challenges:**
  - *Validation Logic:* Closed APIs, tolerance logic for manually entered health data vs. GPS/Watch captured data.
- **Web3 Prediction/Wagering (Polymarket):**
  - *Oracle Logic:* Resolution via decentralized oracles, 24-hour dispute periods.

## 3. Sovereign Contract Logic
*Instruction: How the Smart Contract (Anchor) will interpret the rules above.*
- **Standard Allocation:** Platform Fee (e.g., 5% Social, 1% Pro) extracted at the time of settlement (`settle_performance_agreement`).
- **Collective Failure Edge Case:** If the deadline expires and *no* Oracle signs the victory, the contract unlocks a `refund_all()` function.
- **Tie Edge Case:** Proportional Distribution (Split) among eligible participants.

## 4. Rule Mapping Matrix (Continuous Fill)

| Rule Name | Victory Condition (UX) | Point of Failure (Edge Case) | Smart Contract Resolution (Backend) |
| :--- | :--- | :--- | :--- |
| Ex: *Strava 5KM* | Run 5km in under 30m | GPS failure or user manual edit | Risk Guardian cross-references metrics. If fraud, `cancel_agreement` |
| [Your Rule Here] | ... | ... | ... |
| [Your Rule Here] | ... | ... | ... |
| [Your Rule Here] | ... | ... | ... |

---
*Status: Awaiting Input and Sync Meeting.*
