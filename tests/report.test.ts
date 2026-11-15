import assert from "node:assert/strict";
import { test } from "node:test";
import { buildingCheck } from "../src/lib/audit";
import {
  BUILDING,
  DEMO_BUILDINGS,
  DEMO_RULE,
  DEMO_STATEMENTS,
} from "../src/lib/demo";
import { managerLetter } from "../src/lib/report";

test("manager request uses the calculated discrepancy and keeps the fee separate", () => {
  const result = buildingCheck({
    buildingId: BUILDING.id,
    period: BUILDING.period,
    rule: DEMO_RULE,
    statements: DEMO_STATEMENTS,
  });
  assert.notEqual(result.status, "insufficient");
  if (result.status === "insufficient")
    throw new Error("Unexpected missing data");
  const letter = managerLetter(
    DEMO_STATEMENTS[3],
    result.residents[3],
    DEMO_RULE,
    result.consensusCents,
  );
  for (const expected of [
    "$112.50",
    "$90.00",
    "$22.50",
    "25.00%",
    "$3.95",
    "DEMO",
    "occupant count (2)",
    "does not establish",
  ])
    assert.ok(letter.includes(expected), expected);
});

test("corrected statement produces a consistent letter without the previous discrepancy", () => {
  const statements = structuredClone(DEMO_STATEMENTS);
  statements[3].utilityCents = 9000;
  const result = buildingCheck({
    buildingId: BUILDING.id,
    period: BUILDING.period,
    rule: DEMO_RULE,
    statements,
  });
  if (result.status === "insufficient")
    throw new Error("Unexpected missing data");
  const letter = managerLetter(
    statements[3],
    result.residents[3],
    DEMO_RULE,
    result.consensusCents,
  );
  assert.ok(letter.includes("within the 2% comparison tolerance"));
  assert.ok(!letter.includes("$22.50"));
});

test("a master-bill gap is stated even when neighbours agree", () => {
  const statements = structuredClone(DEMO_STATEMENTS);
  statements[3].utilityCents = 9000;
  statements.forEach((statement) => {
    statement.utilityCents = Math.round(statement.utilityCents * 1.2);
  });
  const result = buildingCheck({
    buildingId: BUILDING.id,
    period: BUILDING.period,
    rule: DEMO_RULE,
    statements,
    masterBillCents: 240000,
  });
  if (result.status === "insufficient" || !result.masterCheck)
    throw new Error("Expected a master comparison");
  const letter = managerLetter(
    statements[3],
    result.residents[3],
    DEMO_RULE,
    result.consensusCents,
    {
      buildingName: BUILDING.name,
      periodLabel: BUILDING.periodLabel,
      masterPoolCents: result.masterCheck.poolCents,
    },
  );
  assert.ok(letter.includes("$2,592.00"));
  assert.ok(letter.includes("$2,160.00"));
  assert.ok(letter.includes("$432.00"));
});

test("a bedroom-only letter requests the bedroom count used", () => {
  const cedar = DEMO_BUILDINGS[3];
  const result = buildingCheck({
    buildingId: cedar.id,
    period: cedar.period,
    rule: cedar.rule,
    statements: cedar.statements,
  });
  if (result.status === "insufficient") throw new Error("Expected a result");
  const letter = managerLetter(
    cedar.statements[3],
    result.residents[3],
    cedar.rule,
    result.consensusCents,
  );
  assert.ok(letter.includes("bedroom count (2)"));
  assert.ok(!letter.includes("occupant count"));
});
