import assert from "node:assert/strict";
import { test } from "node:test";
import {
  allocationShare,
  buildingCheck,
  median,
  type AuditInput,
  type AuditResult,
} from "../src/lib/audit";
import {
  BUILDING,
  DEMO_BUILDINGS,
  DEMO_RULE,
  DEMO_STATEMENTS,
  YOUR_STATEMENT,
} from "../src/lib/demo";
import { detectFormula } from "../src/lib/insights";

test("each fictional building yields its intended comparison and master-bill match", () => {
  const expected = [
    ["maple-court-demo", "inconsistent", 2250],
    ["birch-gardens-demo", "inconsistent", 1500],
    ["riverstone-lofts-demo", "consistent", 0],
    ["cedar-point-demo", "inconsistent", 2500],
  ] as const;
  for (const [id, status, difference] of expected) {
    const building = DEMO_BUILDINGS.find((item) => item.id === id)!;
    const result = conclusive(
      buildingCheck({
        buildingId: building.id,
        period: building.period,
        rule: building.rule,
        statements: building.statements,
        masterBillCents: building.masterBillCents,
      }),
    );
    assert.equal(result.status, status, id);
    assert.equal(
      result.residents.find((item) => item.householdId === building.viewerId)
        ?.differenceCents,
      difference,
      id,
    );
    assert.equal(result.masterCheck?.matches, true, id);
  }
});

test("formula detective resolves each seeded building after neighbours join", () => {
  const expectedBases = [
    ["sqft", "occupants"],
    ["units"],
    ["sqft"],
    ["bedrooms"],
  ];
  DEMO_BUILDINGS.forEach((building, index) => {
    const result = detectFormula(
      building.statements.map((item) => ({
        id: item.householdId,
        unit: item.factors,
        utilityCharge: item.utilityCents / 100,
      })),
    );
    assert.equal(result.status, "found", building.id);
    if (result.status === "found")
      assert.deepEqual(result.best.bases, expectedBases[index], building.id);
  });
});

function fixture(): AuditInput {
  return structuredClone({
    buildingId: BUILDING.id,
    period: BUILDING.period,
    rule: DEMO_RULE,
    statements: DEMO_STATEMENTS,
  });
}
function conclusive(result: AuditResult) {
  assert.notEqual(result.status, "insufficient");
  if (result.status === "insufficient")
    throw new Error(result.reasons.join(" "));
  return result;
}

test("PDF worked example: flags only r4, $22.50 excess, $2,160 median, without master bill", () => {
  const result = conclusive(buildingCheck(fixture()));
  assert.equal(result.status, "inconsistent");
  assert.ok(Math.abs(result.consensusCents - 216000) < 1e-6);
  assert.deepEqual(
    result.residents.filter((r) => r.flagged).map((r) => r.householdId),
    ["r4"],
  );
  const own = result.residents.find((r) => r.householdId === "r4")!;
  assert.equal(own.expectedCents, 9000);
  assert.equal(own.differenceCents, 2250);
  assert.ok(Math.abs(own.deviation - 0.25) < 1e-10);
  assert.equal(result.documentCount, 5);
  assert.equal(result.selfReportedCount, 1);
  assert.equal(result.masterCheck, null);
});
test("corrected r4 makes every household consistent", () => {
  const input = fixture();
  input.statements[3].utilityCents = 9000;
  assert.equal(buildingCheck(input).status, "consistent");
});
test("master bill subtracts common areas once, not from each resident twice", () => {
  const input = fixture();
  input.masterBillCents = 240000;
  const result = conclusive(buildingCheck(input));
  assert.deepEqual(result.masterCheck, {
    poolCents: 216000,
    deviation: 0,
    matches: true,
  });
  assert.equal(result.residents[3].differenceCents, 2250);
});
test("uniformly inflated neighbour bills still trigger the master bill check", () => {
  const input = fixture();
  input.statements[3].utilityCents = 9000;
  input.statements.forEach((s) => {
    s.utilityCents = Math.round(s.utilityCents * 1.2);
  });
  input.masterBillCents = 240000;
  const result = conclusive(buildingCheck(input));
  assert.equal(result.status, "inconsistent");
  assert.ok(result.residents.every((resident) => !resident.flagged));
  assert.equal(result.masterCheck?.matches, false);
  assert.ok(Math.abs(result.masterCheck!.deviation - 0.2) < 1e-10);
});
test("participating factors cannot exceed disclosed building totals", () => {
  const input = fixture();
  input.rule.totals.occupants = 10;
  const result = buildingCheck(input);
  assert.equal(result.status, "insufficient");
  if (result.status === "insufficient")
    assert.ok(
      result.reasons.some((reason) =>
        reason.includes("exceed the disclosed building total"),
      ),
    );
});
test("a master bill that rounds to no eligible cents cannot be compared", () => {
  const input = fixture();
  input.masterBillCents = 1;
  input.rule.commonAreaFraction = 0.9;
  const result = buildingCheck(input);
  assert.equal(result.status, "insufficient");
});
test("one or two households never produce a building verdict", () => {
  for (const count of [0, 1, 2]) {
    const input = fixture();
    input.statements = input.statements.slice(0, count);
    assert.equal(buildingCheck(input).status, "insufficient");
  }
});
test("three distinct comparable households are enough", () => {
  const input = fixture();
  input.statements = input.statements.slice(0, 3);
  assert.equal(buildingCheck(input).status, "consistent");
});
test("duplicate household entries cannot satisfy the minimum", () => {
  const input = fixture();
  input.statements[1].householdId = input.statements[0].householdId;
  assert.equal(buildingCheck(input).status, "insufficient");
});
test("different months, buildings, or utilities cannot be mixed", () => {
  for (const change of [
    { period: "2026-11" },
    { buildingId: "other" },
    { utility: "gas" },
  ]) {
    const input = fixture();
    Object.assign(input.statements[0], change);
    assert.equal(buildingCheck(input).status, "insufficient");
  }
});
test("missing active totals and unsupported weights withhold a verdict", () => {
  for (const bad of [0, -1, NaN, Infinity]) {
    const input = fixture();
    input.rule.totals.sqft = bad;
    assert.equal(buildingCheck(input).status, "insufficient");
  }
  const input = fixture();
  input.rule.weights.occupants = 0.3;
  assert.equal(buildingCheck(input).status, "insufficient");
});
test("weights cannot be negative even when they add to 100%", () => {
  const input = fixture();
  input.rule.weights.sqft = -1;
  input.rule.weights.occupants = 2;
  assert.equal(buildingCheck(input).status, "insufficient");
});
test("active household factors must exist and cannot exceed the building total", () => {
  for (const bad of [0, -2, 4800, 1.5, NaN]) {
    const input = fixture();
    input.statements[0].factors.occupants = bad;
    assert.equal(buildingCheck(input).status, "insufficient");
  }
});
test("billing fees do not affect implied utility pools", () => {
  const input = fixture();
  input.statements.forEach((s) => {
    s.feeCents = 9999;
  });
  const result = conclusive(buildingCheck(input));
  assert.equal(result.consensusCents, 216000);
  assert.equal(result.residents[3].differenceCents, 2250);
});
test("exactly 2% is within tolerance; greater than 2% is flagged", () => {
  const input = fixture();
  input.rule.weights = { sqft: 0, occupants: 0, bedrooms: 0, units: 1 };
  input.statements.forEach((s) => {
    s.utilityCents = 10000;
  });
  input.statements[3].utilityCents = 10200;
  assert.equal(conclusive(buildingCheck(input)).residents[3].flagged, false);
  input.statements[3].utilityCents = 10201;
  assert.equal(conclusive(buildingCheck(input)).residents[3].flagged, true);
});
test("underbilling is flagged with a negative difference", () => {
  const input = fixture();
  input.statements[3].utilityCents = 6750;
  const own = conclusive(buildingCheck(input)).residents[3];
  assert.equal(own.flagged, true);
  assert.equal(own.differenceCents, -2250);
});
test("square-foot-only, occupancy-only, bedroom-only, and unit-only formulas work", () => {
  for (const factor of ["sqft", "occupants", "bedrooms", "units"] as const) {
    const input = fixture();
    input.rule.weights = { sqft: 0, occupants: 0, bedrooms: 0, units: 0 };
    input.rule.weights[factor] = 1;
    input.statements.forEach((s) => {
      s.utilityCents = Math.round(allocationShare(s, input.rule) * 216000);
    });
    assert.equal(buildingCheck(input).status, "consistent");
  }
});
test("invalid amounts and deductions cannot become a result", () => {
  for (const amount of [-1, NaN, Infinity, 22.5]) {
    const input = fixture();
    input.statements[0].utilityCents = amount;
    assert.equal(buildingCheck(input).status, "insufficient");
  }
  for (const deduction of [-0.1, 1, NaN]) {
    const input = fixture();
    input.rule.commonAreaFraction = deduction;
    assert.equal(buildingCheck(input).status, "insufficient");
  }
  const input = fixture();
  input.masterBillCents = 0;
  assert.equal(buildingCheck(input).status, "insufficient");
});
test("zero consensus does not cause division-by-zero or a false consistent verdict", () => {
  const input = fixture();
  input.statements.forEach((s) => {
    s.utilityCents = 0;
  });
  assert.equal(buildingCheck(input).status, "insufficient");
});
test("rounds expected amounts only at the money boundary", () => {
  const input = fixture();
  input.statements[0].utilityCents = 5501;
  const result = conclusive(buildingCheck(input));
  assert.equal(result.status, "inconsistent");
  assert.equal(result.residents[0].flagged, false);
  assert.equal(result.residents[0].expectedCents, 5500);
});
test("median does not mutate inputs and handles even sample sizes", () => {
  const values = [4, 1, 3, 2];
  assert.equal(median(values), 2.5);
  assert.deepEqual(values, [4, 1, 3, 2]);
  assert.throws(() => median([]));
});
test("majority-corrupted inputs can mislead the median: documented limit", () => {
  const input = fixture();
  input.statements.forEach((s) => {
    s.utilityCents = Math.round(allocationShare(s, input.rule) * 270000);
  });
  assert.equal(buildingCheck(input).status, "consistent");
});
test("reference household share is 1/24, not an equal-split assumption", () => {
  assert.ok(
    Math.abs(allocationShare(YOUR_STATEMENT, DEMO_RULE) - 1 / 24) < 1e-10,
  );
  assert.notEqual(allocationShare(DEMO_STATEMENTS[0], DEMO_RULE), 1 / 24);
});
