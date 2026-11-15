# SHARECHECK

**Check whether your share of a building's water bill adds up.**

[Open the live demo](https://sharecheck-business-cup-2026.loosephlox32.chatgpt.site) · [Download a test statement PDF](https://sharecheck-business-cup-2026.loosephlox32.chatgpt.site/samples/maple-court-statement.pdf)

SHARECHECK helps a renter compare a water charge with other households in the same building. It estimates the expected charge from the building's allocation rule, flags a difference worth asking about, and prepares an editable request to the property manager. The demo works in a browser without an account. **Every building and neighbour statement in it is fictional.**

## Try it

1. Choose **Maple Court Apartments** and confirm the sample statement. To test upload, download the PDF above and select **Choose PDF** on the Statement screen.
2. Continue through **Formula** and **Building room**. Add the synthetic neighbours, then run the check.
3. Open the report. The proposed price is **$4.99 once**; enter the visible code `DEMO100` in the demo checkout to bring the total to **$0** and unlock it. No payment is taken.

In the Maple Court example, a **$112.50** water charge is compared with a **$90.00** estimate, a **$22.50** difference. The **$3.95** billing fee is separate. Change the inputs and the calculation changes with them.

You can also choose **Moving** to inspect three months of calculated sample history before considering a building. Saving a building makes it easy to reopen in the same browser. **My building is not listed** shows an empty state with no invented result.

## What the prototype includes

- Four fictional buildings with distinct allocation rules and six sample statements each. Three example charges are flagged; one is consistent.
- Editable bill details, an optional local PDF upload, formula inference, a building comparison, a master-bill cross-check, and a vacancy scenario.
- A report with the calculation, evidence counts, editable personal and building letters, print-to-PDF, and a verification code.
- A working demo checkout and a browser-local saved-building feature.

The comparison identifies a **calculation discrepancy**, not proof of unfair or unlawful billing. A small agreeing sample cannot verify the building's actual utility cost. The report explains these limits.

## Demo limits

This is a browser-only prototype. It does not collect card details, charge money, create accounts, receive live neighbour submissions, or send notifications. Uploads are read locally. Bill edits disappear on refresh; only a saved fictional building ID is kept in this browser and can be removed. The moving history is synthetic and does not update from real residents.

The current complete flow is for **water**. Sewer and trash may reuse the allocation approach when a building divides a shared charge, but each needs its own rule and statements. Individually metered electricity needs a separate model.

Real shared data, alerts, and payments would need a backend with building membership checks, private storage, consent, safe publication thresholds, and a payment provider. See [Architecture](docs/ARCHITECTURE.md) and the [FAQ audit](docs/FAQ_REQUIREMENTS.md). The team must still submit the required English PDF pitch deck separately.

## Technical notes

The app uses Next.js, React, TypeScript, and **Tailwind CSS v4**. It exports a static site to `out/`; the public demo needs no server or API keys. PDF text extraction uses PDF.js in the browser. The source is [public on GitHub](https://github.com/osp-d/sharecheck-qtezh).

Requires Node.js 22.13 or later:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. To verify and build:

```sh
npm run check
```

For another static host, run `npm run build` and serve the generated `out/` directory at the domain root. The app's PDF worker is copied from the installed PDF.js package during the build.

For more detail, see the [two-minute walkthrough](docs/DEMO_SCRIPT.md), [architecture](docs/ARCHITECTURE.md), and [case FAQ audit](docs/FAQ_REQUIREMENTS.md).
