# SHARECHECK

**Your neighbours’ bills are the evidence.**

A focused hackathon prototype that checks whether one apartment building applied its disclosed water-allocation formula consistently. The final project PDF is the product source of truth; the older pasted draft is background only.

## Run

Node.js 22.13 or later is required. Use the committed lockfile.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. No account, credentials, database, or AI service is needed.

```sh
npm test             # Calculation and conservative text-parser tests
npm run typecheck    # Strict TypeScript
npm run build        # Production static export in out/
```

The PDF worker is copied from the installed `pdfjs-dist` package by the build setup script; it is not a separately versioned dependency.

## What works

- Guest journey: overview → statement → formula → room → result → report.
- Editable financial inputs and weighted square-foot, occupant, bedroom, and unit formulas.
- Browser-local text-PDF extraction, with file-size/page limits and manual fallback. This is deterministic extraction, not AI or OCR. Review is mandatory.
- Building median check, >2% outlier threshold, three-household minimum, and optional master-bill cross-check.
- Synthetic neighbours added only after explicit demo participation consent.
- Own statement and aggregate results only; other residents’ rows are never rendered.
- Evidence provenance, mock paywall, editable manager letter, text download, and print-to-PDF report.
- October history derived from the result, with November clearly awaiting data.
- Session reset and withdrawal of demo participation.

Default example: **$112.50** utility charge, **$90.00** consensus estimate, **$22.50** difference, **25%** above consensus. The **$3.95** fee is separate. A $2,400 master bill less 10% supports the $2,160 building pool.

## Deliberate boundaries

This is a **single-browser, in-memory demo**, not a live resident service. Refresh clears edits. Invitation links open independent synthetic sessions. Evidence counts for neighbours are simulated fixture metadata; no documents are authenticated. There is no live database, cross-device history, email, payments, subscriptions, scheduled monitoring, OCR, or LLM integration.

Use synthetic information. Files are parsed in the browser and are not uploaded. The complete seed dataset exists in the client bundle: this is appropriate only for synthetic fixtures, never real submissions. Hiding rows in the UI is not a production access-control mechanism.

The PDF mentions an existing `src/audit.ts` and ten passing tests, but those files were not attached. This repository contains a newly implemented engine with its own tests. It does not claim to reuse or verify the missing implementation.

## Deploy

The app uses a Next.js static export so the demo can be hosted without a backend.

For Vercel: import this directory as the repository root, use Next.js, run `npm run build`, and set the output directory to `out`. Alternatively, upload the contents of `out/` to a static host. All links and assets assume hosting at the domain root. `npm run start` is not used for a static export.

No public repository or live deployment is created by the source code itself. Before sharing with judges, follow [the release checklist](docs/IMPLEMENTATION_PLAN.md#release-checklist).

## Project map

```text
src/lib/audit.ts                 Pure calculation engine and validation
src/lib/demo.ts                  Clearly synthetic fixtures
src/lib/statement-parser.ts      Conservative PDF field extraction
src/lib/report.ts                Manager-request generation
src/components/sharecheck-app.tsx Journey state and screens
src/components/report-view.tsx   Calculation, letter, and printable report
src/app/globals.css              Responsive interface and print styles
public/samples/                  Synthetic statement, addendum, master bill
tests/                          Independent arithmetic and parsing cases
docs/IMPLEMENTATION_PLAN.md      Scope, milestones, acceptance, release checks
docs/ARCHITECTURE.md             Decisions, privacy model, production design
docs/DEMO_SCRIPT.md              Two-minute judge walkthrough
```

Financial calculations and document organisation, not legal advice.
