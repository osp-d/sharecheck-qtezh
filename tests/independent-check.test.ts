import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clarificationRequest,
  independentCheck,
  type IndependentInput,
} from "../src/lib/independent-check";

const maple: IndependentInput = {
  buildingName: "Maple Court Apartments",
  period: "2026-10",
  masterPeriod: "2026-10",
  chargeCents: 11250,
  feeCents: 395,
  masterBillCents: 240000,
  commonAreaFraction: 0.1,
  weights: { sqft: 0.5, occupants: 0.5, bedrooms: 0, units: 0 },
  totals: { sqft: 21600, occupants: 48, bedrooms: 36, units: 24 },
  factors: { sqft: 900, occupants: 2, bedrooms: 2, units: 1 },
};

test("one entered bill, rule, totals, and master bill calculate without neighbours", () => {
  const result = independentCheck(maple);
  assert.equal(result.status, "calculated");
  if (result.status !== "calculated") return;
  assert.equal(result.share, 1 / 24);
  assert.equal(result.eligiblePoolCents, 216000);
  assert.equal(result.expectedCents, 9000);
  assert.equal(result.differenceCents, 2250);
  assert.equal(result.flagged, true);
  const request = clarificationRequest(maple, result);
  assert.ok(request.includes("$112.50"));
  assert.ok(request.includes("$90.00"));
  assert.ok(request.includes("$22.50"));
  const corrected = independentCheck({
    ...maple,
    chargeCents: 9000,
    feeCents: 9999,
  });
  assert.equal(corrected.status, "calculated");
  if (corrected.status === "calculated") {
    assert.equal(corrected.differenceCents, 0);
    assert.equal(corrected.flagged, false);
  }
});

test("missing master bill or disclosed rule withholds a result and drafts a specific request", () => {
  const result = independentCheck({
    ...maple,
    masterBillCents: undefined,
    weights: {},
  });
  assert.equal(result.status, "needs-evidence");
  if (result.status !== "needs-evidence") return;
  assert.ok(result.missing.some((item) => item.includes("master water bill")));
  assert.ok(result.missing.some((item) => item.includes("allocation rule")));
  assert.ok(result.requestLetter.includes("Maple Court Apartments"));
  assert.ok(result.requestLetter.includes("master water bill"));
});

test("rejects mismatched months, invalid weights, and impossible factors", () => {
  const result = independentCheck({
    ...maple,
    masterPeriod: "2026-09",
    weights: { sqft: 0.6, occupants: 0.5 },
    factors: { sqft: 30000, occupants: 2 },
  });
  assert.equal(result.status, "needs-evidence");
  if (result.status !== "needs-evidence") return;
  assert.ok(result.errors.some((item) => item.includes("same month")));
  assert.ok(result.errors.some((item) => item.includes("add to 100%")));
  assert.ok(result.errors.some((item) => item.includes("cannot exceed")));
});

test("a fully disclosed equal split is computable without unused factor totals", () => {
  const result = independentCheck({
    ...maple,
    chargeCents: 10000,
    masterBillCents: 200000,
    weights: { units: 1 },
    totals: { units: 18 },
    factors: { units: 1 },
  });
  assert.equal(result.status, "calculated");
  if (result.status === "calculated") assert.equal(result.expectedCents, 10000);
});

test("rounds the eligible master pool to cents before allocating it", () => {
  const result = independentCheck({
    ...maple,
    chargeCents: 22,
    masterBillCents: 101,
    commonAreaFraction: 0.15,
    weights: { units: 1 },
    totals: { units: 4 },
    factors: { units: 1 },
  });
  assert.equal(result.status, "calculated");
  if (result.status !== "calculated") return;
  assert.equal(result.eligiblePoolCents, 86);
  assert.equal(result.expectedCents, 22);
});
