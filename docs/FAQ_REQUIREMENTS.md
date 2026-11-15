# Business Cup 2.0 FAQ audit

Source: `Business Cup 2.0 _ FAQ по кейсу.pdf` supplied with the task. This file records project decisions, not instructions to the visitor.

| FAQ                                | Requirement                                                                  | SHARECHECK status                                                                                                                                                                                         |
| ---------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1, Q16, Q46–47, Q73               | Public web product and public GitHub source, usable without login            | Public Site and linked repository; static guest flow                                                                                                                                                      |
| Q2, Q6, Q29, Q42                   | B2C consumer pain for US adults aged 25–45, one main track                   | Money track; resident paying personally to check shared housing costs. Pitch should use this segment explicitly.                                                                                          |
| Q3, Q66, Q69, Q84, Q94, Q96        | Core works on edited inputs; seeds are allowed if clearly labeled            | Calculation, formula inference, letters and verification run on inputs. All seed records and historical samples are labeled synthetic.                                                                    |
| Q20, Q37, Q51, Q55, Q67, Q95, Q115 | Clear price and a working paywall; real payment optional; judges can proceed | Report gate displays proposed $4.99 one-time price. A simulated checkout accepts the visible `DEMO100` code, shows $0 due, and unlocks the report. No payment is real. Price is a hypothesis to validate. |
| Q23, Q26, Q48                      | Readable code, setup notes, no secrets or unnecessary personal data          | README, TypeScript checks, tests, no API secrets; only optional saved building ID in browser storage                                                                                                      |
| Q40, Q60                           | Browser product, including mobile-friendly use                               | Responsive web interface; no install required                                                                                                                                                             |
| Q85                                | Main-flow buttons work; hide dead actions                                    | Main check, report, verification, moving preview and save/remove flow are functional                                                                                                                      |
| Q100, Q135                         | At least one working return mechanism; browser storage allowed               | Saved building opens its sample history on a later visit to the same browser                                                                                                                              |
| Q8, Q24, Q53, Q83, Q86, Q141       | English PDF deck, at most 10 slides, plus production link and public GitHub  | **Deck remains to be prepared and submitted by the team.** The deployed product and public source do not replace it.                                                                                      |

## Product scope

Water remains the complete core scenario. For a later pilot, sewer and trash may use the same shared-allocation engine only when billed as allocated common costs; keep a separate `(building, period, utility)` cohort and rule for each. Metered electricity needs its own model and evidence. Do not mix utility charges to manufacture a larger sample.

The moving preview is an inference from the product idea: a renter may want to inspect a candidate building before signing. Its current three-month history is entirely fictional and computed from distinct synthetic monthly statements. It cannot predict actual future charges. Production moving history would require consent, a publication threshold stronger than the calculation minimum, and protection against small-group inference.

## Submission items to verify manually

1. Prepare an English PDF deck of no more than 10 slides covering US 25–45 renter pain, the working flow, proposed price, return behavior, business assumptions with sources, and differentiation.
2. Open the live link and public GitHub repository in a logged-out browser before submission.
3. Validate the $4.99 price and moving use case with the target audience; present them as hypotheses until then.
