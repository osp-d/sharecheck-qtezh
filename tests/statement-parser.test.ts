import assert from "node:assert/strict";
import { test } from "node:test";
import { parseStatementText } from "../src/lib/statement-parser";

test("extracts labelled statement fields without including the billing fee", () => {
  assert.deepEqual(
    parseStatementText(
      "DEMO Billing period: 2026-10 Water charge: $112.50 Billing fee: $3.95 Total due $116.45 Apartment area: 900 Occupants: 2",
    ),
    {
      utilityDollars: 112.5,
      feeDollars: 3.95,
      sqft: 900,
      occupants: 2,
      bedrooms: undefined,
      period: "2026-10",
    },
  );
});
test("handles PDF line breaks, comma amounts, and case differences", () => {
  const result = parseStatementText(
    "WATER\n CHARGE $1,112.50\nSquare feet 1,200\nOCCUPANTS: 3",
  );
  assert.equal(result.utilityDollars, 1112.5);
  assert.equal(result.sqft, 1200);
  assert.equal(result.occupants, 3);
});
test("never guesses missing fields or uses total due as the utility charge", () => {
  const result = parseStatementText("Total due $116.45 Account number 123456");
  assert.equal(result.utilityDollars, undefined);
  assert.equal(result.occupants, undefined);
});
