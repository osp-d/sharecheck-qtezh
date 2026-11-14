import { copyFile, cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
await mkdir(new URL("public/", root), { recursive: true });
await copyFile(
  fileURLToPath(
    new URL("node_modules/pdfjs-dist/build/pdf.worker.min.mjs", root),
  ),
  fileURLToPath(new URL("public/pdf.worker.min.mjs", root)),
);
await cp(
  new URL("node_modules/pdfjs-dist/standard_fonts/", root),
  new URL("public/pdf-fonts/", root),
  { recursive: true },
);
