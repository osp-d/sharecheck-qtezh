"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Download, Upload } from "lucide-react";
import { FACTORS, formatMoney, formatPercent, type Factor } from "@/lib/audit";
import { extractPdf } from "@/lib/statement-parser";
import {
  clarificationRequest,
  independentCheck,
  type IndependentInput,
  type IndependentResult,
} from "@/lib/independent-check";

type Draft = {
  buildingName: string;
  period: string;
  masterPeriod: string;
  charge: string;
  fee: string;
  masterBill: string;
  commonAreaPct: string;
  sqft: string;
  occupants: string;
  bedrooms: string;
  weights: Record<Factor, string>;
  totals: Record<Factor, string>;
};
const blank: Draft = {
  buildingName: "",
  period: "",
  masterPeriod: "",
  charge: "",
  fee: "",
  masterBill: "",
  commonAreaPct: "",
  sqft: "",
  occupants: "",
  bedrooms: "",
  weights: { sqft: "", occupants: "", bedrooms: "", units: "" },
  totals: { sqft: "", occupants: "", bedrooms: "", units: "" },
};
const sample: Draft = {
  buildingName: "Maple Court Apartments (sample)",
  period: "2026-10",
  masterPeriod: "2026-10",
  charge: "112.50",
  fee: "3.95",
  masterBill: "2400.00",
  commonAreaPct: "10",
  sqft: "900",
  occupants: "2",
  bedrooms: "2",
  weights: { sqft: "50", occupants: "50", bedrooms: "0", units: "0" },
  totals: { sqft: "21600", occupants: "48", bedrooms: "48", units: "24" },
};
const panel =
  "rounded-3xl border border-stroke bg-white p-6 shadow-[0_12px_40px_rgba(24,49,38,0.035)] sm:p-8";
const input =
  "mt-2 min-h-11 w-full rounded-xl border border-stroke bg-white px-3.5 text-sm outline-none focus:border-forest";
const label = "block text-xs font-semibold text-ink";
const factorLabel: Record<Factor, string> = {
  sqft: "Area · sq ft",
  occupants: "Occupants",
  bedrooms: "Bedrooms",
  units: "Units",
};
const parseNumber = (value: string) =>
  value.trim() === "" ? undefined : Number(value);
const parseMoney = (value: string) =>
  value.trim() === ""
    ? undefined
    : /^\d+(\.\d{1,2})?$/.test(value.trim())
      ? Math.round(Number(value) * 100)
      : NaN;
const toInput = (draft: Draft): IndependentInput => ({
  buildingName: draft.buildingName,
  period: draft.period,
  masterPeriod: draft.masterPeriod,
  chargeCents: parseMoney(draft.charge),
  feeCents: parseMoney(draft.fee),
  masterBillCents: parseMoney(draft.masterBill),
  commonAreaFraction:
    draft.commonAreaPct.trim() === ""
      ? undefined
      : Number(draft.commonAreaPct) / 100,
  factors: {
    sqft: parseNumber(draft.sqft),
    occupants: parseNumber(draft.occupants),
    bedrooms: parseNumber(draft.bedrooms),
    units: 1,
  },
  weights: Object.fromEntries(
    FACTORS.map((factor) => [
      factor,
      draft.weights[factor].trim() === ""
        ? undefined
        : Number(draft.weights[factor]) / 100,
    ]),
  ),
  totals: Object.fromEntries(
    FACTORS.map((factor) => [factor, parseNumber(draft.totals[factor])]),
  ),
});

export function IndependentCheck() {
  const [draft, setDraft] = useState<Draft>(blank);
  const [result, setResult] = useState<IndependentResult | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  function change<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setResult(null);
  }
  function changeMap(key: "weights" | "totals", factor: Factor, value: string) {
    setDraft((current) => ({
      ...current,
      [key]: { ...current[key], [factor]: value },
    }));
    setResult(null);
  }
  function run(event: FormEvent) {
    event.preventDefault();
    setResult(independentCheck(toInput(draft)));
    setNotice("");
  }
  async function readStatement(file: File) {
    setLoading(true);
    setNotice("");
    try {
      const parsed = await extractPdf(file);
      setDraft((current) => ({
        ...current,
        charge: parsed.utilityDollars?.toFixed(2) ?? "",
        fee: parsed.feeDollars?.toFixed(2) ?? "",
        sqft: parsed.sqft?.toString() ?? "",
        occupants: parsed.occupants?.toString() ?? "",
        bedrooms: parsed.bedrooms?.toString() ?? "",
        period: parsed.period ?? "",
      }));
      setResult(null);
      setNotice(
        "Statement text read locally. Check every field before running the calculation.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not read this PDF. Enter the figures manually.",
      );
    } finally {
      setLoading(false);
    }
  }
  function download(text: string, filename = "sharecheck-records-request.txt") {
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Request copied.");
    } catch {
      setNotice(
        "Clipboard unavailable. Select the request text below to copy it.",
      );
    }
  }
  return (
    <div className="no-print space-y-4">
      <form onSubmit={run} className={panel} noValidate>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
          Independent water check
        </span>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">
          Use your own documents
        </h2>
        <p className="mt-2 text-sm text-muted">
          One bill is enough when you also have the allocation rule, building
          totals, and master bill. Missing something? Run the check to get a
          records request.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setDraft(sample);
              setResult(null);
              setNotice(
                "Synthetic sample figures loaded. Edit any value to test the check.",
              );
            }}
            className="min-h-10 rounded-xl border border-stroke px-4 text-xs font-semibold hover:border-forest"
          >
            Load complete sample
          </button>
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-stroke px-4 text-xs font-semibold hover:border-forest">
            <Upload size={14} /> {loading ? "Reading…" : "Upload statement PDF"}
            <input
              type="file"
              accept="application/pdf"
              className="sr-only"
              disabled={loading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void readStatement(file);
                event.target.value = "";
              }}
            />
          </label>
          <a
            href="/samples/maple-court-statement.pdf"
            download
            className="inline-flex min-h-10 items-center gap-2 px-2 text-xs font-semibold text-forest"
          >
            <Download size={14} /> Sample statement
          </a>
          <a
            href="/samples/maple-court-addendum.pdf"
            download
            className="inline-flex min-h-10 items-center px-2 text-xs font-semibold text-forest"
          >
            Sample rule
          </a>
          <a
            href="/samples/maple-court-master-bill.pdf"
            download
            className="inline-flex min-h-10 items-center px-2 text-xs font-semibold text-forest"
          >
            Sample master bill
          </a>
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <label className={label}>
            Building name{" "}
            <span className="font-normal text-muted">(for the request)</span>
            <input
              className={input}
              value={draft.buildingName}
              onChange={(event) => change("buildingName", event.target.value)}
              placeholder="Your apartment building"
              maxLength={100}
            />
          </label>
          <label className={label}>
            Statement month
            <input
              className={input}
              type="month"
              value={draft.period}
              onChange={(event) => change("period", event.target.value)}
            />
          </label>
          <label className={label}>
            Water charge · $
            <input
              className={input}
              inputMode="decimal"
              value={draft.charge}
              onChange={(event) => change("charge", event.target.value)}
              placeholder="112.50"
            />
          </label>
          <label className={label}>
            Separate billing fee · ${" "}
            <span className="font-normal text-muted">(optional)</span>
            <input
              className={input}
              inputMode="decimal"
              value={draft.fee}
              onChange={(event) => change("fee", event.target.value)}
              placeholder="3.95"
            />
          </label>
        </div>
        <h3 className="mt-8 border-t border-stroke pt-7 font-display text-lg font-bold">
          Disclosed allocation rule
        </h3>
        <p className="mt-1 text-xs text-muted">
          Enter weights from the lease or billing notice. Use 0 for unused
          factors; weights must add to 100%.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FACTORS.map((factor) => (
            <label key={factor} className={label}>
              {factorLabel[factor]} · %
              <input
                className={input}
                inputMode="decimal"
                value={draft.weights[factor]}
                onChange={(event) =>
                  changeMap("weights", factor, event.target.value)
                }
                placeholder="0"
              />
            </label>
          ))}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FACTORS.map((factor) => (
            <label key={factor} className={label}>
              Building total {factorLabel[factor].toLowerCase()}
              <input
                className={input}
                inputMode="decimal"
                value={draft.totals[factor]}
                onChange={(event) =>
                  changeMap("totals", factor, event.target.value)
                }
                placeholder={factor === "units" ? "24" : "From notice"}
              />
            </label>
          ))}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <label className={label}>
            Your area · sq ft
            <input
              className={input}
              inputMode="decimal"
              value={draft.sqft}
              onChange={(event) => change("sqft", event.target.value)}
              placeholder="900"
            />
          </label>
          <label className={label}>
            Your occupants
            <input
              className={input}
              inputMode="numeric"
              value={draft.occupants}
              onChange={(event) => change("occupants", event.target.value)}
              placeholder="2"
            />
          </label>
          <label className={label}>
            Your bedrooms
            <input
              className={input}
              inputMode="numeric"
              value={draft.bedrooms}
              onChange={(event) => change("bedrooms", event.target.value)}
              placeholder="2"
            />
          </label>
        </div>
        <h3 className="mt-8 border-t border-stroke pt-7 font-display text-lg font-bold">
          Master bill
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className={label}>
            Bill month
            <input
              className={input}
              type="month"
              value={draft.masterPeriod}
              onChange={(event) => change("masterPeriod", event.target.value)}
            />
          </label>
          <label className={label}>
            Master water bill · $
            <input
              className={input}
              inputMode="decimal"
              value={draft.masterBill}
              onChange={(event) => change("masterBill", event.target.value)}
              placeholder="2400.00"
            />
          </label>
          <label className={label}>
            Common-area deduction · %
            <input
              className={input}
              inputMode="decimal"
              value={draft.commonAreaPct}
              onChange={(event) => change("commonAreaPct", event.target.value)}
              placeholder="Enter 0 if none"
            />
          </label>
        </div>
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-stroke pt-6">
          <span className="text-xs text-muted">
            Values stay in this browser tab. Documents are not authenticated.
          </span>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest px-5 text-sm font-semibold text-white hover:bg-ink"
          >
            Check this charge <ArrowRight size={16} />
          </button>
        </div>
        {notice && (
          <p role="status" className="mt-3 text-xs text-forest">
            {notice}
          </p>
        )}
      </form>
      {result?.status === "needs-evidence" && (
        <section className={panel} role="status">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
            No conclusion yet
          </span>
          <h3 className="mt-2 font-display text-xl font-bold">
            What is needed
          </h3>
          {result.missing.length > 0 && (
            <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-ink">
              {result.missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          {result.errors.length > 0 && (
            <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-amber-800">
              {result.errors.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          <details className="mt-6 rounded-2xl bg-canvas p-4">
            <summary className="cursor-pointer text-sm font-semibold text-forest">
              Draft a records request
            </summary>
            <p className="mt-2 text-xs text-muted">
              Review and edit after download. Nothing is sent.
            </p>
            <textarea
              readOnly
              value={result.requestLetter}
              rows={12}
              className="mt-4 w-full rounded-xl border border-stroke bg-white p-3 text-xs leading-5"
              aria-label="Draft records request"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copy(result.requestLetter)}
                className="min-h-10 rounded-xl border border-stroke px-4 text-xs font-semibold"
              >
                Copy request
              </button>
              <button
                type="button"
                onClick={() => download(result.requestLetter)}
                className="min-h-10 rounded-xl border border-stroke px-4 text-xs font-semibold"
              >
                Download request
              </button>
            </div>
          </details>
        </section>
      )}
      {result?.status === "calculated" && (
        <section className={panel} role="status">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
            Independent rule check
          </span>
          <h3 className="mt-2 font-display text-2xl font-bold">
            {result.flagged
              ? `${formatMoney(Math.abs(result.differenceCents))} difference`
              : "Within 2% of the entered rule"}
          </h3>
          <p className="mt-2 text-sm text-muted">
            {result.flagged
              ? `${formatPercent(Math.abs(result.deviation), 0)} ${result.differenceCents > 0 ? "above" : "below"} the calculated amount.`
              : "Within the 2% prototype tolerance."}{" "}
            Check the source documents before acting.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["Your charge", formatMoney(parseMoney(draft.charge)!)],
              ["Expected", formatMoney(result.expectedCents)],
              ["Eligible master pool", formatMoney(result.eligiblePoolCents)],
            ].map(([name, value]) => (
              <div key={name} className="rounded-2xl bg-canvas p-4">
                <span className="block text-xs text-muted">{name}</span>
                <strong className="mt-1 block font-display text-xl">
                  {value}
                </strong>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-muted">
            Your share is {formatPercent(result.share, 4)}. The fee is excluded.
            This calculation uses self-entered figures; it does not authenticate
            the bills or establish a legal overcharge.
          </p>
          {result.flagged && (
            <details className="mt-6 rounded-2xl bg-canvas p-4">
              <summary className="cursor-pointer text-sm font-semibold text-forest">
                Draft a clarification request
              </summary>
              <p className="mt-2 text-xs text-muted">
                Review before sending. Nothing is sent from this page.
              </p>
              <textarea
                readOnly
                rows={11}
                value={clarificationRequest(toInput(draft), result)}
                aria-label="Draft clarification request"
                className="mt-4 w-full rounded-xl border border-stroke bg-white p-3 text-xs leading-5"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void copy(clarificationRequest(toInput(draft), result))
                  }
                  className="min-h-10 rounded-xl border border-stroke px-4 text-xs font-semibold"
                >
                  Copy request
                </button>
                <button
                  type="button"
                  onClick={() =>
                    download(
                      clarificationRequest(toInput(draft), result),
                      "sharecheck-clarification-request.txt",
                    )
                  }
                  className="min-h-10 rounded-xl border border-stroke px-4 text-xs font-semibold"
                >
                  Download request
                </button>
              </div>
            </details>
          )}
        </section>
      )}
    </div>
  );
}
