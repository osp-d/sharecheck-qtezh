import assert from "node:assert/strict";
import { test } from "node:test";
import { DEMO_BUILDINGS } from "../src/lib/demo";
import { demoHistory } from "../src/lib/history";

test("moving history computes three separate months per building from statements", () => {
  for (const building of DEMO_BUILDINGS) {
    const months = demoHistory(building);
    assert.deepEqual(
      months.map((month) => month.period),
      ["2026-08", "2026-09", "2026-10"],
    );
    assert.ok(months.every((month) => month.households === 6));
    assert.ok(months.every((month) => month.consensusCents > 0));
    assert.equal(months[0].status, "consistent");
    assert.equal(
      months[1].status,
      building.id === "riverstone-lofts-demo" ? "consistent" : "inconsistent",
    );
    assert.equal(
      months[2].status,
      building.id === "riverstone-lofts-demo" ? "consistent" : "inconsistent",
    );
  }
});
