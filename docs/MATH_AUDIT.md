# Calculation audit

Checked against the current source and the supplied final business plan on 15 November 2026. This verifies arithmetic and internal consistency; it does not authenticate bills, allocation rules, market sources, or legal conclusions.

## App calculations

- **Disclosed share:** sum of `weight × apartment factor ÷ building factor total` across active factors. Weights must total 100%. Billing fees are excluded.
- **Eligible master pool:** master bill less the disclosed common-area percentage, rounded to cents. The own-document check then rounds `share × eligible pool` to cents.
- **Neighbour comparison:** each statement implies `charge ÷ share`; the median implied pool is the comparison base. A resident is flagged when the unrounded difference from that base exceeds 2% of the expected charge. A supplied master bill is checked separately against the median. A mismatch beyond 2% now makes the overall building result inconsistent even if all neighbours agree.
- **Formula Detective:** candidate rates are fitted to charges. Relative error uses the _predicted_ charge as its denominator; rates are a likely pattern, not proof of the disclosed rule.

| Fictional building | Eligible pool | Sample share | Expected charge | Sample charge | Difference |
| ------------------ | ------------: | -----------: | --------------: | ------------: | ---------: |
| Maple Court        |     $2,160.00 |         1/24 |          $90.00 |       $112.50 |    +$22.50 |
| Birch Gardens      |     $1,800.00 |         1/18 |         $100.00 |       $115.00 |    +$15.00 |
| Riverstone Lofts   |     $3,000.00 |           4% |         $120.00 |       $120.00 |      $0.00 |
| Cedar Point        |     $2,000.00 |           5% |         $100.00 |       $125.00 |    +$25.00 |

For Maple Court, the 50/50 rule gives `$1,080 ÷ 21,600 = $0.05/sq ft` and `$1,080 ÷ 48 = $22.50/occupant`. The sample renter's 900 sq ft and two occupants give `$45 + $45 = $90`; `$112.50 ÷ $90 − 1 = 25%`.

The vacancy scenario is internally consistent. Three empty 900 sq ft apartments contribute `50% × 2,700 ÷ 21,600 = 6.25%` of the nominal allocation. If that share is redistributed, the implied pool becomes `$2,160 ÷ (1 − 0.0625) = $2,304`. The vacant share of the _original_ pool is `$2,160 × 0.0625 = $135`. The gap between implied pools is `$144`; for a renter with a 1/24 nominal share, the modeled increase is `$144 ÷ 24 = $6`. The $144 is **not** the collective extra paid: the occupied nominal shares sum to 93.75%, and `93.75% × $144 = $135`.

The displayed Maple bill-change example is `$10` building-pool movement + `$0` share movement + `$1` fee movement + `$12.50` change in off-formula residual = **$23.50**. November is modeled from October, not a second observed bill.

## Business-plan arithmetic to correct

- The plan's **~11.3 million TAM** is approximately `26.9m × 58% × 72% = 11.23m`. Its target also specifies **company-owned** properties and cites a 62% company-owned share. Applying that filter yields `26.9m × 62% × 58% × 72% = 6.96m`. Clarify whether the 26.9m starting figure already excludes non-company owners; if it does not, revise TAM and downstream SAM/SOM.
- The plan says **2% pay within three years**, leading to about 22,500 payers from a ~1.1m SAM. At a first-purchase average of `$0.70 × $9.99 + $0.30 × $29 = $15.693`, that is about **$353,000 over three years**. Calling it **$353,000 per year** requires an annual conversion assumption. Evenly spread first purchases would be about **$118,000 per year**, before renewals.
- The plan's scenario revenue table uses the rounded $15.69 average. This explains its $22,594 / $112,968 / $564,840 figures; using the unrounded $15.693 gives $22,597.92 / $112,989.60 / $564,948. The small differences are rounding, not a model error.
- The report/pass card fees, approximately 12% weighted variable-cost ratio, $13.80 weighted first-purchase contribution, and $4.18 room-acquisition ceiling reconcile to the plan's stated rounded assumptions.

## Limits

Three statements and a median do not establish that the building's actual cost is correct; a bad majority can distort the comparison. The master bill and allocation records must be authentic and from the same service period for a real-world conclusion. The 2% tolerance is a product choice, not a legal standard. The vacancy finding is a scenario compatible with the figures, not proof of where a charge originated.
