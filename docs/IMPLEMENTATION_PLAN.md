# Lean implementation plan

## Product decision

Prove one thing well: residents’ statements can reveal inconsistent application of a shared utility formula without access to the landlord’s master bill. A report must explain both the arithmetic and its limits.

Follow the final PDF where it differs from the pasted draft: three independent households; weighted implied-pool comparison; no other residents’ rows; $9.99 report and proposed $29 annual Lease Pass; no payment for an inconclusive result. Document instructions were treated as product requirements and reference material, not as commands to contact people, spend money, or publish private information.

## Implementation delivered

| Slice           | Acceptance criterion                                                                       | Status                                |
| --------------- | ------------------------------------------------------------------------------------------ | ------------------------------------- |
| Calculation     | Reproduce $2,160 consensus, 25%, $22.50 difference from the final PDF                      | Implemented and unit-tested           |
| Input           | Manual entry always available; sample PDFs; explicit review; invalid values block progress | Implemented; browser QA pending       |
| Formula         | Disclosed weighted factors; validate weights and active totals                             | Implemented and engine-tested         |
| Room            | Start alone; consent adds synthetic neighbours; own row and aggregates only                | Implemented; browser QA pending       |
| Result          | Consistent, inconsistent, and insufficient-data outcomes; master bill optional             | Implemented and engine-tested         |
| Report          | Arithmetic, evidence, limits, editable letter, browser print                               | Implemented; browser print QA pending |
| Commercial demo | Mock unlock only after conclusive result; no actual payment                                | Implemented; browser QA pending       |
| History         | October reflects current result; November has no invented calculation                      | Implemented                           |

## Architecture decision for the hackathon

Use Next.js + TypeScript, a pure engine, and a static export for the demonstration. Avoid building an unprotected multi-user database simply to match a proposed stack. Without identity and authorization, database persistence would make the prototype less safe and less reliable.

Supabase remains the intended pilot database. Add it only alongside enforceable membership, private storage, server-side aggregation, and deletion. The current source requires no secrets and can run even when extraction services are unavailable.

The provided PDF’s extraction plan called for an LLM. The delivered prototype uses browser-local text extraction instead. This is an explicit scope substitution to keep the judge journey independent of API keys, cost, network latency, and model availability. It must not be pitched as AI. If AI is a judging requirement, implement milestone 3 before submission.

## Remaining work, in priority order

### 1. Release the competition demo — approximately 1–2 hours

- Run the browser acceptance checklist below on phone and laptop.
- Host the generated `out/` folder and verify the URL in a private browser without sign-in.
- Push the source to a public GitHub repository only after checking it contains synthetic data and no secrets.
- Rehearse the two-minute journey and record a backup screen recording.

Done when a judge can reach the $22.50 result, unlock the report, and save a PDF without assistance or registration.

### 2. Build real rooms — approximately 2–4 focused development days

- Introduce Supabase Auth anonymous sessions and server-established building membership.
- Create three core tables: `buildings` (including versioned rules), `submissions`, and immutable `reports` (see architecture).
- Protect each raw submission using row-level security. Aggregate via an authorized server endpoint, never a public raw-record query.
- Enforce one active submission per household/building/month/utility. Joining with a new anonymous session must not create a second independent household.
- Persist periods and rules; reject incompatible or incomplete inputs.
- Add withdrawal, deletion, and retention controls; test cross-user authorization and small-sample privacy.

Done when two independent browsers can contribute to the same room while neither can read the other’s figures, identities, documents, or report.

### 3. Add document extraction — approximately 1–2 focused development days

- Keep the current manual entry path.
- Add a server-only LLM adapter with a strict response schema, size/type checks, rate limits, timeout, and an extraction version.
- Store API credentials only in runtime secrets; do not place them in client code.
- Treat document text as untrusted data. Never follow embedded instructions or let the model determine arithmetic or a billing verdict.
- Display the source for each extracted field, mark uncertainty, and require confirmation before calculation.
- Use opt-in private storage and a defined deletion policy if original files are retained.

Done when a failed, malformed, or slow extraction still leaves a usable manual form, and model output cannot bypass validation.

### 4. Pilot before monetization

Validate that renters can obtain the required building totals and household inputs. Measure room completion at 3+ independent households and willingness to pay after a conclusive result. Only then add real checkout, multi-month monitoring, alerts, and Lease Pass entitlement logic.

## Release checklist

- [ ] Fresh install: `npm ci`; `npm run check` passes.
- [ ] Desktop: follow statement → formula → alone room → consent → neighbours → check.
- [ ] Phone at 390 px: no horizontal scroll; fields, navigation, dialogs, and buttons usable.
- [ ] Sample PDF: download, choose it, verify charge $112.50, fee $3.95, 900 sq ft, 2 occupants, 2 bedrooms, October 2026.
- [ ] Unsupported/scanned PDF: clear error, no claim of successful extraction; manual entry works.
- [ ] Empty, negative, zero, and malformed inputs: no false verdict.
- [ ] Default run: 6/24 households, $2,160 median, expected $90, difference $22.50, 25%; fee excluded.
- [ ] Change own charge to $90, confirm and rerun: consistent result, no stale $22.50 claim.
- [ ] Remove a required building total or set weights to 80%: validation blocks the check.
- [ ] Master bill toggle: $2,400 less 10% = $2,160; stale report invalidated.
- [ ] No neighbours: no building verdict or paid report.
- [ ] No other resident’s individual row appears in any screen or print view.
- [ ] Unlock: explicitly mock, no card form or real payment.
- [ ] Edit manager letter; copied/downloaded/printed letter preserves edits.
- [ ] Print at A4: no navigation or clipped rows; full letter present; synthetic label present.
- [ ] Keyboard-only: navigation, field labels, consent, dialogs, Escape, focus return, skip link.
- [ ] Refresh/reset/withdraw: session changes disappear or contribution is withdrawn as described.
- [ ] Invite URL opens an independent demo and makes no live-room promise.
- [ ] Deployed public URL works without an account; assets and PDF worker load.
- [ ] Repository URL, demo URL, and backup recording included in submission.

## Freeze rule

Once the main journey passes, make only fixes that block completion, arithmetic correctness, privacy, or readability. Cut chat, additional utilities, real billing, legal conclusions, and automated alerts from the hackathon build.
