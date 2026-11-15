import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEMO_ACCESS_CODE,
  REPORT_PRICE_CENTS,
  demoOrder,
} from "../src/lib/checkout";

test("demo checkout shows the price and only the advertised code makes the total zero", () => {
  assert.equal(REPORT_PRICE_CENTS, 499);
  assert.deepEqual(demoOrder("wrong"), {
    subtotalCents: 499,
    discountCents: 0,
    totalCents: 499,
    accepted: false,
  });
  assert.deepEqual(demoOrder(` ${DEMO_ACCESS_CODE.toLowerCase()} `), {
    subtotalCents: 499,
    discountCents: 499,
    totalCents: 0,
    accepted: true,
  });
});
