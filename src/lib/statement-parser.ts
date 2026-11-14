export interface ExtractedFields {
  utilityDollars?: number;
  feeDollars?: number;
  sqft?: number;
  occupants?: number;
  bedrooms?: number;
  period?: string;
}

/** Conservative text extraction; missing fields stay missing for manual confirmation. */
export function parseStatementText(text: string): ExtractedFields {
  const normalized = text.replace(/\s+/g, " ");
  const amount = (pattern: RegExp) => {
    const match = normalized.match(pattern);
    return match ? Number(match[1].replace(/,/g, "")) : undefined;
  };
  return {
    utilityDollars: amount(
      /(?:water|utility)\s+charge\s*[:$]*\s*\$?\s*([\d,]+\.\d{2})/i,
    ),
    feeDollars: amount(/billing\s+fee\s*[:$]*\s*\$?\s*([\d,]+\.\d{2})/i),
    sqft: amount(
      /(?:apartment\s+area|square\s+feet|sq\s*ft)\s*[:=]?\s*([\d,]+)/i,
    ),
    occupants: amount(/occupants\s*[:=]?\s*(\d+)/i),
    bedrooms: amount(/bedrooms\s*[:=]?\s*(\d+)/i),
    period: normalized.match(/billing\s+period\s*:?\s*(\d{4}-\d{2})/i)?.[1],
  };
}

export async function extractPdf(file: File): Promise<ExtractedFields> {
  if (file.size > 10 * 1024 * 1024)
    throw new Error(
      "Choose a PDF smaller than 10 MB, or enter the figures manually.",
    );
  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  )
    throw new Error("Choose a PDF statement.");
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({
    data: await file.arrayBuffer(),
    standardFontDataUrl: "/pdf-fonts/",
  });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 12)
      throw new Error(
        "Choose a statement with 12 pages or fewer, or enter the figures manually.",
      );
    const pages: string[] = [];
    for (let index = 1; index <= pdf.numPages; index++) {
      const content = await (await pdf.getPage(index)).getTextContent();
      pages.push(
        content.items.map((item) => ("str" in item ? item.str : "")).join(" "),
      );
    }
    const fields = parseStatementText(pages.join(" "));
    if (fields.utilityDollars === undefined)
      throw new Error(
        "A water charge could not be read. Scanned PDFs and other layouts need manual entry.",
      );
    return fields;
  } finally {
    await task.destroy();
  }
}
