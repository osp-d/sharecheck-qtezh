# SHARECHECK

**Your neighbours’ bills are the evidence.**

### [Open the live SHARECHECK prototype →](https://sharecheck-business-cup-2026.loosephlox32.chatgpt.site)

Public web demo · No sign-up · Synthetic data

A clickable, browser-only prototype for checking how an apartment building allocates a shared water bill. Start by choosing one of four fictional buildings. An unlisted building shows an honest no-data state. All resident records shipped with this demo are synthetic.

The interface uses **Tailwind CSS v4** with a small theme and print stylesheet in `src/app/globals.css`.

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

- Building chooser → statement → formula → room → result → report; separate report verification screen.
- Four synthetic buildings with six statements each: Maple Court (area and occupants), Birch Gardens (equal split), Riverstone Lofts (area), and Cedar Point (bedrooms). Three sample viewers have flagged differences; Riverstone's sample viewer is consistent.
- Unlisted-building state with no invented comparison or notification signup.
- Editable financial inputs and weighted square-foot, occupant, bedroom, and unit formulas.
- Browser-local text-PDF extraction, with file-size/page limits and manual fallback. This is deterministic extraction, not AI or OCR. Review is mandatory.
- Building median check, >2% outlier threshold, three-household minimum, and optional master-bill cross-check.
- Formula Detective: infers a likely charge rule from 4+ participating bills, including ambiguity and insufficient-data states.
- Vacancy Shift Check: compares the eligible master-bill pool with observed charges; includes a clearly marked shifted-vacancy simulation.
- Bill-change explanation: a modeled November statement decomposed into building pool, share, fee, and off-formula change. Displayed cents reconcile.
- Anonymous building letter, in addition to the editable personal manager letter.
- Deterministic report code and a paste-and-verify JSON bundle. The bundle contains the viewer's row and a fingerprint of the synthetic cohort, not neighbour rows.
- Synthetic neighbours added only after explicit demo participation consent.
- Own statement and aggregate results only; other residents’ rows are never rendered.
- Evidence provenance, mock paywall, editable manager letter, text download, and print-to-PDF report.
- Session reset and withdrawal of demo participation.

Maple Court example: **$112.50** utility charge, **$90.00** consensus estimate, **$22.50** difference, **25%** above consensus. The **$3.95** fee is separate. A $2,400 master bill less 10% supports the $2,160 building pool. All amounts are fictional.

## Deliberate boundaries

This is a **single-browser, in-memory demo**, not a live resident service. Refresh clears edits and building selection. Invitation links open independent synthetic sessions. Evidence counts for neighbours are simulated fixture metadata; no documents are authenticated. There is no live database, cross-device history, email, payments, subscriptions, scheduled monitoring, OCR, or LLM integration. The downloadable PDF statement and master bill are Maple Court examples only; other building figures are prefilled synthetic inputs.

For a real "notify me when my building has enough data" flow, collect an email address only after explicit opt-in and a privacy notice. A backend must store a verified building ID, consent, and the contact address separately from submissions, count eligible distinct households by building and month, and send a single threshold alert through an email provider. Residents need a way to unsubscribe and delete their contact data. Publish comparisons only after a privacy threshold chosen for a real pilot; the demo's three-household calculation minimum is not a safe release threshold.

Use synthetic information. Files are parsed in the browser and are not uploaded. The complete seed dataset exists in the client bundle: this is appropriate only for synthetic fixtures, never real submissions. Hiding rows in the UI is not a production access-control mechanism.

Report codes detect changes to the included snapshot. They do not authenticate bills, prove that a building formula is lawful, or let a third party reproduce private neighbour entries. Formula and vacancy findings are patterns to investigate, not legal conclusions.

## Deploy

Public demo: [SHARECHECK](https://sharecheck-business-cup-2026.loosephlox32.chatgpt.site). No sign-up is required.

The app uses a Next.js static export so the demo can be hosted without a backend.

For Vercel: import this directory as the repository root, use Next.js, run `npm run build`, and set the output directory to `out`. Alternatively, upload the contents of `out/` to a static host. All links and assets assume hosting at the domain root. `npm run start` is not used for a static export.

The source repository is [public on GitHub](https://github.com/osp-d/sharecheck-qtezh). Hosting the static `out/` directory requires no backend or API keys. See [the release checklist](docs/IMPLEMENTATION_PLAN.md#release-checklist) before sharing with judges.

## Project map

```text
src/lib/audit.ts                 Pure calculation engine and validation
src/lib/insights.ts              Formula, vacancy, change, letter, and code functions
src/lib/demo.ts                  Clearly synthetic fixtures
src/lib/statement-parser.ts      Conservative PDF field extraction
src/lib/report.ts                Manager-request generation
src/components/sharecheck-app.tsx Journey state and screens
src/components/insights-panels.tsx Insight and verification screens
src/components/report-view.tsx   Calculation, letter, and printable report
src/app/globals.css              Tailwind import, theme, fonts, print rules
postcss.config.mjs               Tailwind PostCSS integration
public/samples/                  Synthetic statement, addendum, master bill
tests/                          Independent arithmetic and parsing cases
docs/IMPLEMENTATION_PLAN.md      Scope, milestones, acceptance, release checks
docs/ARCHITECTURE.md             Decisions, privacy model, production design
docs/DEMO_SCRIPT.md              Two-minute judge walkthrough
```

Financial calculations and document organisation, not legal advice.
