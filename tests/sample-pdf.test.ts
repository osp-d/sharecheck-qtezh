import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { parseStatementText } from "../src/lib/statement-parser";

test("the shipped sample PDF produces the expected fields through actual PDF.js extraction", async () => {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({
    data: new Uint8Array(
      await readFile(
        new URL("../public/samples/maple-court-statement.pdf", import.meta.url),
      ),
    ),
    standardFontDataUrl: new URL(
      "../node_modules/pdfjs-dist/standard_fonts/",
      import.meta.url,
    ).pathname,
  });
  try {
    const pdf = await task.promise;
    assert.equal(pdf.numPages, 1);
    const content = await (await pdf.getPage(1)).getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    assert.deepEqual(parseStatementText(text), {
      utilityDollars: 112.5,
      feeDollars: 3.95,
      sqft: 900,
      occupants: 2,
      bedrooms: 2,
      period: "2026-10",
    });
  } finally {
    await task.destroy();
  }
});
