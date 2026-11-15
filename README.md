# SHARECHECK

**Check whether your share of a building's water bill adds up.**

[Open the live demo](https://sharecheck-business-cup-2026.loosephlox32.chatgpt.site) · [Download a test statement PDF](https://sharecheck-business-cup-2026.loosephlox32.chatgpt.site/samples/maple-court-statement.pdf)

SHARECHECK helps a renter compare a water charge with other households in the same building. It estimates the expected charge from the building's allocation rule, flags a difference worth asking about, and prepares an editable request to the property manager. The demo works in a browser without an account. **Every building and neighbour statement in it is fictional.**

## Try it

1. Choose **Maple Court Apartments** and confirm the sample statement. To test upload, download the PDF above and select **Choose PDF** on the Statement screen.
2. Continue through **Formula** and **Building room**. Add the synthetic neighbours, then run the check.
3. Open the report. The proposed price is **$4.99 once**; enter the visible code `DEMO100` in the demo checkout to bring the total to **$0** and unlock it. No payment is taken.

The sample goes through the same calculation path as edited inputs. Change the figures and the result changes with them.

You can also choose **Moving** to inspect three months of calculated sample history before considering a building. Saving a building makes it easy to reopen in the same browser. **My building is not listed** shows an empty state with no invented result.

## What the prototype includes

- Guest journey: building chooser → statement → formula → building room → result → report, plus a separate verification screen.
- Four synthetic buildings with six statements each: Maple Court (area and occupants), Birch Gardens (equal split), Riverstone Lofts (area), and Cedar Point (bedrooms). Three sample viewers have flagged differences; Riverstone's is consistent.
- An unlisted-building state with no fabricated comparison or notification signup.
- A Moving preview with three synthetic months per listed building. Save one building for a later visit in the same browser.
- Editable charges, fees, apartment details, building totals, and weighted area, occupant, bedroom, and unit formulas.
- Browser-local text-PDF extraction with file-size and page limits. It is deterministic text extraction, not OCR or AI. The resident must review the fields; manual entry remains available.
- A building median check with a three-household minimum, a >2% difference threshold, and an optional master-bill cross-check. Billing fees stay outside the utility pool.
- Formula Detective, which infers a likely rule from at least four contributed bills and reports insufficient or ambiguous evidence instead of guessing.
- Vacancy Shift Check, which compares the observed pool with the eligible master bill and offers a clearly marked what-if scenario.
- A modeled October-to-November bill-change explanation whose displayed parts add to the cent.
- A report with the calculation trail, evidence counts, editable personal and anonymous building letters, text download, and print-to-PDF.
- A deterministic report code and paste-and-verify JSON bundle. The bundle includes the viewer's row and a fingerprint of the cohort, not neighbour rows.
- Synthetic neighbours added after explicit demo participation consent; session reset and withdrawal are available. Other residents' rows are never rendered in the interface.
- A $4.99 one-time report gate. The visible `DEMO100` code makes the simulated checkout total $0; completing that demo order unlocks the detailed report.

For Maple Court, the **$112.50** utility charge compares with a **$90.00** estimate: a **$22.50**, or **25%**, difference. The **$3.95** fee is separate. A fictional $2,400 master bill, less a 10% common-area deduction, supports the $2,160 building pool.

The comparison identifies a **calculation discrepancy**, not proof of unfair or unlawful billing. A small agreeing sample cannot verify the building's actual utility cost. The report explains these limits.

## Demo limits

This is a **single-browser demo**, not a live resident service. Refresh clears bill edits and the current selection. Only a saved fictional building ID persists in localStorage, and it can be removed in the Moving view. No bill or contact details are persisted. Invitation links open independent synthetic sessions. The moving history is fictional and does not update from residents.

Uploads are parsed in the browser and are not sent to a backend. The downloadable statement, addendum, and master bill PDFs belong to the Maple Court example; the other buildings have prefilled synthetic figures. Evidence counts are fixture metadata, and documents are not authenticated. The complete seed dataset is in the client bundle, which is suitable for a fictional demo only. Hiding neighbour rows in the interface would not protect real submissions.

The checkout demonstrates a price and access gate. It collects no card number, creates no purchase, and does not grant a durable paid entitlement. Real payments would need a provider account, server-side checkout creation, payment verification, entitlement storage, and support and refund handling.

The current complete flow is for **water**. Sewer and trash may reuse the allocation approach when a building divides a shared charge, but each needs its own rule and statements. Individually metered electricity needs a separate model.

For real shared data, a backend would need building membership and independent-household checks, private storage, server-side aggregation, consent, and a publication threshold chosen for privacy. The demo's three-household calculation minimum is not a safe threshold for releasing real aggregates. A real “notify me when enough neighbours join” feature would also need separate opt-in contact storage, an email provider, and unsubscribe and deletion controls.

Report codes detect changes to an included snapshot. They do not authenticate statements or prove that the building's total bill is correct. Formula and vacancy findings are patterns to investigate, not legal conclusions. There is no live database, cross-device history, email, subscription, scheduled monitoring, OCR, or LLM integration.

The team must still submit the required English PDF pitch deck separately. See the [FAQ audit](docs/FAQ_REQUIREMENTS.md) for the case requirements.

## Technical notes

The app uses Next.js, React, TypeScript, and **Tailwind CSS v4**. Tailwind utilities live in the components; `src/app/globals.css` holds theme tokens, self-hosted fonts, and print rules. PDF text extraction uses PDF.js in the browser. The source is [public on GitHub](https://github.com/osp-d/sharecheck-qtezh).

### Run locally

Node.js 22.13 or later is required. Use the committed lockfile:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. No account, credentials, database, or AI service is needed.

### Verify and build

```sh
npm test             # Calculation, checkout, history, and PDF extraction tests
npm run typecheck    # Strict TypeScript
npm run build        # Static export in out/
```

`npm run check` runs all three. The build setup copies the PDF.js worker and standard fonts from the installed package into public assets.

### Deploy

The [public Site](https://sharecheck-business-cup-2026.loosephlox32.chatgpt.site) runs the static export; no production Node server or API keys are needed. To host it elsewhere, run `npm run build` and serve the contents of `out/` at the domain root. On Vercel, import the GitHub repository, use `npm run build`, and set the output directory to `out`. `npm run start` is not used for this static export.

### Project map

```text
src/lib/audit.ts                 Allocation engine and validation
src/lib/insights.ts              Formula, vacancy, change, letter, and code functions
src/lib/demo.ts                  Synthetic building fixtures
src/lib/history.ts               Computed three-month moving history
src/lib/statement-parser.ts      PDF text extraction
src/lib/report.ts                Manager-request generation
src/lib/checkout.ts              Demo price and access-code calculation
src/components/sharecheck-app.tsx Journey state and screens
src/components/insights-panels.tsx Insight and verification screens
src/components/report-view.tsx   Calculation, letters, checkout, and report
src/app/globals.css              Tailwind import, theme, fonts, print rules
postcss.config.mjs               Tailwind PostCSS integration
public/samples/                  Synthetic statement, addendum, master bill
tests/                          Calculation and parsing cases
docs/IMPLEMENTATION_PLAN.md      Scope, acceptance, release checks
docs/ARCHITECTURE.md             Privacy model and production design
docs/DEMO_SCRIPT.md              Two-minute walkthrough
docs/FAQ_REQUIREMENTS.md         Case FAQ audit and submission gap
```

See the [two-minute walkthrough](docs/DEMO_SCRIPT.md), [architecture](docs/ARCHITECTURE.md), and [release checklist](docs/IMPLEMENTATION_PLAN.md#release-checklist) for more detail.
