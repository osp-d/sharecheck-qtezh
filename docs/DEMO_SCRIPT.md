# Two-minute judge walkthrough

Use the default synthetic scenario. Start from **Reset demo**.

| Time      | Action                                                          | Say                                                                                                                                                                                             |
| --------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:15 | Overview → **Check my building**                                | “Your neighbours’ bills are the evidence. We check whether a building applies its shared utility formula consistently.”                                                                         |
| 0:15–0:35 | Review the pre-filled sample → **Confirm figures**              | “The sample water charge is $112.50, plus a separate $3.95 fee. PDF text extraction is available locally; manual entry always works.”                                                           |
| 0:35–0:50 | Review 50% area, 50% occupants → **Continue to building**       | “A household’s share depends on its apartment and occupants. This is not an equal-split comparison.”                                                                                            |
| 0:50–1:05 | Show the alone state, check consent → **Add demo neighbours**   | “One statement cannot check the building. This demo adds five synthetic neighbours. Individual rows stay out of the room view.”                                                                 |
| 1:05–1:25 | **Run building check**                                          | “The median implied pool is $2,160. My share points to $90, but I was billed $112.50: 25% above consensus, or $22.50 this month. No master bill was needed.”                                    |
| 1:25–1:45 | **See your report** → **Unlock full report** → free demo unlock | “The basic result and contributions are free. The proposed $9.99 report explains the arithmetic and provides a letter asking the manager to confirm the account inputs.”                        |
| 1:45–2:00 | Show calculation and letter, optionally **Save as PDF**         | “This is evidence for a conversation, not a legal conclusion. An evenly inflated pool still needs the master bill. Real multi-user rooms and extraction services are the next pilot milestone.” |

If asked about the annual $270: it is `$22.50 × 12`, **only if the difference continues**, not a promised refund.

If asked about AI: this version uses deterministic browser PDF text extraction, not a model. The architecture describes a future typed, server-only LLM extraction adapter; arithmetic will remain deterministic.

If asked about privacy: the demo contains synthetic fixtures and shows only own data plus aggregates. Real privacy requires server-side authorization and protections against small-sample inference; those are explicitly scoped to the pilot.

Backup scenario: change the water charge to $90.00, confirm, continue, and rerun. It should show a consistent split. The master-bill toggle should confirm $2,400 minus 10% = $2,160 under the default formula.
