import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildingLetter,
  detectFormula,
  explainChange,
  ratesToWeights,
  reportCode,
  vacancyCheck,
  vacantShare,
  type Observation,
  type WeightedRule,
} from "../src/lib/insights";

// Same synthetic building as the demo: 24 units, 21,600 sq ft, 48 occupants,
// 50% sq ft / 50% occupants on a $2,160 pool => $0.05 per sq ft + $22.50 per occupant.
const u = (sqft: number, occupants: number, bedrooms: number) => ({ sqft, occupants, bedrooms, units: 1 });
const DEMO: Observation[] = [
  { id: "r1", unit: u(650, 1, 1), utilityCharge: 55.0 },
  { id: "r2", unit: u(900, 2, 2), utilityCharge: 90.0 },
  { id: "r3", unit: u(1100, 3, 2), utilityCharge: 122.5 },
  { id: "r4", unit: u(900, 2, 2), utilityCharge: 112.5 }, // billed as 3 occupants
  { id: "r5", unit: u(650, 2, 1), utilityCharge: 77.5 },
  { id: "r6", unit: u(1100, 2, 2), utilityCharge: 100.0 },
];
const RULE: WeightedRule = {
  components: [
    { basis: "sqft", weight: 0.5 },
    { basis: "occupants", weight: 0.5 },
  ],
  buildingTotals: { sqft: 21600, occupants: 48, bedrooms: 36, units: 24 },
};

test("F1 recovers the undisclosed formula and flags r4 without being told the formula", () => {
  const r = detectFormula(DEMO);
  assert.equal(r.status, "found");
  if (r.status !== "found") return;
  assert.deepEqual(r.best.bases, ["sqft", "occupants"]);
  assert.equal(r.best.rates.sqft, 0.05);
  assert.equal(r.best.rates.occupants, 22.5);
  assert.deepEqual(r.best.outliers.map((o) => o.id), ["r4"]);
  assert.equal(r.best.outliers[0].expected, 90);
  assert.equal(r.best.outliers[0].excessPerMonth, 22.5);
});

test("F1 turns rates back into the lease-style 50/50 split when totals are known", () => {
  const r = detectFormula(DEMO);
  if (r.status !== "found") throw new Error("expected found");
  assert.deepEqual(ratesToWeights(r.best.rates, RULE.buildingTotals), {
    impliedPool: 2160,
    weights: { sqft: 0.5, occupants: 0.5 },
  });
});

test("F1 keeps inferred weights precise enough to sum to one", () => {
  const inferred = ratesToWeights({ sqft: 0.071, occupants: 19.17 }, RULE.buildingTotals);
  assert.ok(inferred);
  assert.ok(Math.abs(Object.values(inferred.weights).reduce((sum, weight) => sum + weight, 0) - 1) < 1e-12);
});

test("F1 prefers the simpler formula when it fits", () => {
  const perOccupant = DEMO.map((o) => ({ ...o, utilityCharge: 40 * o.unit.occupants }));
  const r = detectFormula(perOccupant);
  assert.equal(r.status, "found");
  if (r.status === "found") assert.deepEqual(r.best.bases, ["occupants"]);
});

test("F1 refuses below 4 households and reports ambiguity instead of guessing", () => {
  assert.equal(detectFormula(DEMO.slice(0, 3)).status, "insufficient_data");
  // sq ft exactly 400 × bedrooms: the two formulas cannot be told apart
  const twins = [1, 2, 3, 2].map((b, i) => ({ id: `t${i}`, unit: u(400 * b, 1, b), utilityCharge: 30 * b }));
  assert.equal(detectFormula(twins).status, "ambiguous");
});

test("F2 says the landlord absorbs vacancies in the demo building", () => {
  const r = vacancyCheck({
    consensusPool: 2160, masterBill: 2400, commonAreaDeductionPct: 0.1, rule: RULE,
    vacantUnits: [u(900, 0, 2), u(900, 0, 2), u(900, 0, 2)],
  });
  assert.equal(r.finding, "landlord_absorbs_vacancies");
  assert.equal(r.vacantSharePct, 6.25);
});

test("F2 detects vacant apartments' share billed to residents", () => {
  const vacant = [u(900, 0, 2), u(900, 0, 2), u(900, 0, 2)];
  const v = vacantShare(RULE, vacant); // 0.5 × 2700/21600 = 6.25%
  const r = vacancyCheck({
    consensusPool: 2160 / (1 - v), masterBill: 2400, commonAreaDeductionPct: 0.1, rule: RULE,
    vacantUnits: vacant, yourShare: 1 / 24,
  });
  assert.equal(r.finding, "vacancies_billed_to_residents");
  assert.equal(r.consensusPool, 2304);
  assert.equal(r.extraBilledToResidentsPerMonth, 135);
  assert.equal(r.yourExtraPerMonth, 6);
});

test("F2 reports an unexplained pool rather than forcing a cause", () => {
  const r = vacancyCheck({
    consensusPool: 2500, masterBill: 2400, commonAreaDeductionPct: 0.1, rule: RULE, vacantUnits: [u(900, 0, 2)],
  });
  assert.equal(r.finding, "pool_unexplained");
});

test("F3 splits a bill change into parts that add up exactly", () => {
  const r = explainChange(
    { period: "2026-10", share: 1 / 24, pool: 2160, charged: 90, fee: 3.95 },
    { period: "2026-11", share: 1 / 24, pool: 2400, charged: 112.5, fee: 4.95 },
  );
  assert.equal(r.totalChange, 23.5);
  assert.equal(r.parts.buildingBill, 10);
  assert.equal(r.parts.yourShare, 0);
  assert.equal(r.parts.fee, 1);
  assert.equal(r.parts.offFormula, 12.5);
  const sum = Object.values(r.parts).reduce((s, x) => s + x, 0);
  assert.ok(Math.abs(sum - r.totalChange) < 0.011);
  assert.equal(r.mainCause, "offFormula");
});

test("F3 displayed parts still reconcile when shares create fractional cents", () => {
  const r = explainChange(
    { period: "October", share: 0.03789, pool: 2160.01, charged: 82.37, fee: 3.95 },
    { period: "November", share: 0.03817, pool: 2400.03, charged: 104.19, fee: 4.96 },
  );
  assert.equal(Math.round(Object.values(r.parts).reduce((sum, part) => sum + part, 0) * 100), Math.round(r.totalChange * 100));
});

test("F4 letter is collective, anonymous and refuses under 3 households", () => {
  const text = buildingLetter({
    buildingName: "Maple Court Apartments (DEMO)", period: "October 2026", households: 6, flaggedCount: 1,
    consensusPool: 2160, formula: { bases: ["sqft", "occupants"], rates: { sqft: 0.05, occupants: 22.5 } },
    reportCode: "SC-0000-0000-0000",
  });
  assert.match(text, /6 households/);
  assert.match(text, /\$0\.05 per sq ft plus \$22\.50 per occupant/);
  assert.doesNotMatch(text, /r4|unit \d/i);
  assert.throws(() => buildingLetter({ buildingName: "X", period: "Oct", households: 2, flaggedCount: 0, consensusPool: 1 }));
});

test("F5 report code is stable across key order and changes with any input", async () => {
  const a = await reportCode({ rule: RULE, obs: DEMO, period: "2026-10" });
  const b = await reportCode({ period: "2026-10", obs: DEMO, rule: RULE });
  const c = await reportCode({ rule: RULE, obs: DEMO.map((o) => (o.id === "r4" ? { ...o, utilityCharge: 112.49 } : o)), period: "2026-10" });
  assert.match(a, /^SC-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
  assert.equal(a, b);
  assert.notEqual(a, c);
});
