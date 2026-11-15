"use client";

import { useState } from "react";
import { ArrowRight, Copy, Download, Printer } from "lucide-react";
import {
  FACTORS,
  formatMoney,
  formatPercent,
  type AuditResult,
  type ResidentResult,
  type Rule,
  type Statement,
} from "@/lib/audit";
import {
  buildingLetter,
  type DetectiveResult,
  type VacancyCheckResult,
} from "@/lib/insights";
import { managerLetter } from "@/lib/report";
import {
  DEMO_ACCESS_CODE,
  REPORT_PRICE_CENTS,
  demoOrder,
} from "@/lib/checkout";

type ConclusiveResult = Exclude<AuditResult, { status: "insufficient" }>;
const panel = "print-card rounded-3xl border border-stroke bg-white p-6 sm:p-8";
const smallLabel =
  "text-[10px] font-bold uppercase tracking-[0.16em] text-muted";

export function AuditReport({
  result,
  buildingName,
  periodLabel,
  own,
  statement,
  rule,
  unlocked,
  onUnlock,
  onCopy,
  formula,
  vacancy,
  reportCode,
  verificationBundle,
  onVerify,
}: {
  result: ConclusiveResult;
  buildingName: string;
  periodLabel: string;
  own: ResidentResult;
  statement: Statement;
  rule: Rule;
  unlocked: boolean;
  onUnlock: () => void;
  onCopy: (text: string) => Promise<void>;
  formula: DetectiveResult;
  vacancy: VacancyCheckResult | null;
  reportCode: string;
  verificationBundle: string;
  onVerify: () => void;
}) {
  const [personalLetter, setPersonalLetter] = useState(() =>
    managerLetter(statement, own, rule, result.consensusCents, {
      buildingName,
      periodLabel,
    }),
  );
  const [collectiveLetter, setCollectiveLetter] = useState("");
  const [letterType, setLetterType] = useState<"personal" | "collective">(
    "personal",
  );
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [codeApplied, setCodeApplied] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const order = demoOrder(codeApplied ? accessCode : "");
  const activeLetter =
    letterType === "personal" ? personalLetter : collectiveLetter;

  function openCollective() {
    if (!collectiveLetter)
      setCollectiveLetter(
        buildingLetter({
          buildingName: `${buildingName} (DEMO)`,
          period: periodLabel,
          households: result.residents.length,
          flaggedCount: result.residents.filter((resident) => resident.flagged)
            .length,
          consensusPool: result.consensusCents / 100,
          formula:
            formula.status === "found"
              ? { bases: formula.best.bases, rates: formula.best.rates }
              : null,
          vacancy,
          reportCode,
        }),
      );
    setLetterType("collective");
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([activeLetter], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `sharecheck-${letterType}-letter.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <article className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className={smallLabel}>Your report · synthetic demo</span>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {periodLabel} water check
          </h2>
          <p className="mt-1 text-xs text-muted">
            {buildingName} · {reportCode || "Calculating code…"}
          </p>
        </div>
        {unlocked && (
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print inline-flex min-h-11 items-center gap-2 rounded-xl border border-stroke bg-white px-4 text-sm font-semibold"
          >
            <Printer size={16} /> Save PDF
          </button>
        )}
      </div>

      <section className={`${panel} print-break-avoid`}>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${own.flagged ? "bg-amber-50 text-amber-800" : "bg-mist text-forest"}`}
        >
          {own.flagged ? "Review this charge" : "Within 2% tolerance"}
        </span>
        <h3 className="mt-5 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {own.flagged
            ? `${formatMoney(Math.abs(own.differenceCents))} difference`
            : "Your share looks consistent"}
        </h3>
        <p className="mt-2 text-sm text-muted">
          {own.flagged
            ? `${formatPercent(Math.abs(own.deviation), 0)} ${own.deviation > 0 ? "above" : "below"} the building consensus. Ask the manager to confirm the inputs.`
            : "The participating bills point to a similar allocation."}
        </p>
        <div className="mt-7 grid gap-3 border-t border-stroke pt-5 sm:grid-cols-3">
          {[
            ["Billed, before fee", formatMoney(statement.utilityCents)],
            ["Expected", formatMoney(own.expectedCents)],
            ["Building pool", formatMoney(result.consensusCents)],
          ].map(([name, value]) => (
            <div key={name}>
              <span className="block text-xs text-muted">{name}</span>
              <strong className="mt-1 block font-display text-xl tracking-tight">
                {value}
              </strong>
            </div>
          ))}
        </div>
      </section>

      {unlocked && (
        <div
          className={`${panel} no-print flex flex-wrap items-center justify-between gap-3 bg-mist`}
        >
          <div>
            <span className={smallLabel}>Report code</span>
            <strong className="mt-1 block font-display text-lg">
              {reportCode || "Calculating…"}
            </strong>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!verificationBundle}
              onClick={() => void onCopy(verificationBundle)}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-semibold disabled:opacity-40"
            >
              <Copy size={14} /> Copy bundle
            </button>
            <button
              type="button"
              onClick={onVerify}
              className="inline-flex min-h-10 items-center gap-2 px-2 text-xs font-semibold text-forest"
            >
              Verify <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {!unlocked ? (
        !checkoutOpen ? (
          <section
            className={`${panel} no-print flex flex-wrap items-center justify-between gap-5`}
          >
            <div>
              <span className={smallLabel}>
                Full report · {formatMoney(REPORT_PRICE_CENTS)} one time
              </span>
              <h3 className="mt-2 font-display text-lg font-bold">
                Calculation and editable letters
              </h3>
              <p className="mt-1 text-xs text-muted">
                See the exact split, evidence, and manager letter.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCheckoutOpen(true)}
              className="min-h-11 rounded-xl bg-forest px-5 text-sm font-semibold text-white hover:bg-ink"
            >
              Continue to demo checkout{" "}
              <ArrowRight size={15} className="ml-1 inline" />
            </button>
          </section>
        ) : (
          <section
            className={`${panel} no-print mx-auto max-w-2xl`}
            aria-label="Demo checkout"
          >
            <span className={smallLabel}>
              Demo checkout · no payment collected
            </span>
            <h3 className="mt-2 font-display text-xl font-bold">Your report</h3>
            <div className="mt-5 space-y-2 border-y border-stroke py-4 text-sm">
              <div className="flex justify-between gap-4">
                <span>Full report</span>
                <strong>{formatMoney(order.subtotalCents)}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span>Demo discount</span>
                <strong>−{formatMoney(order.discountCents)}</strong>
              </div>
              <div className="flex justify-between gap-4 border-t border-stroke pt-3 font-bold">
                <span>Total today</span>
                <span>{formatMoney(order.totalCents)}</span>
              </div>
            </div>
            <form
              className="mt-5"
              onSubmit={(event) => {
                event.preventDefault();
                if (demoOrder(accessCode).accepted) {
                  setCodeApplied(true);
                  setCheckoutError("");
                } else {
                  setCodeApplied(false);
                  setCheckoutError("Enter the demo code shown below.");
                }
              }}
            >
              <label
                htmlFor="access-code"
                className="block text-xs font-semibold"
              >
                Access code
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  id="access-code"
                  value={accessCode}
                  onChange={(event) => {
                    setAccessCode(event.target.value);
                    setCodeApplied(false);
                    setCheckoutError("");
                  }}
                  autoComplete="off"
                  className="min-h-11 min-w-0 flex-1 rounded-xl border border-stroke px-3 text-sm outline-none focus:border-forest"
                />
                <button
                  type="submit"
                  className="min-h-11 rounded-xl border border-stroke px-4 text-sm font-semibold hover:border-forest"
                >
                  Apply
                </button>
              </div>
              <p className="mt-2 text-xs text-muted">
                Use <strong className="text-ink">{DEMO_ACCESS_CODE}</strong> to
                try the complete flow.
              </p>
              {checkoutError && (
                <p className="mt-2 text-xs text-amber-800" role="alert">
                  {checkoutError}
                </p>
              )}
            </form>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!codeApplied || !order.accepted}
                onClick={onUnlock}
                className="min-h-11 rounded-xl bg-forest px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Complete demo order
              </button>
              <button
                type="button"
                onClick={() => setCheckoutOpen(false)}
                className="min-h-11 px-3 text-sm font-semibold text-muted hover:text-ink"
              >
                Back
              </button>
            </div>
            <p className="mt-4 text-[11px] text-muted">
              This is a simulated checkout. No card details, account, or charge.
            </p>
          </section>
        )
      ) : (
        <>
          <p
            className="no-print rounded-xl bg-mist px-4 py-3 text-xs font-semibold text-forest"
            role="status"
          >
            Demo order complete · $0 charged · report unlocked
          </p>
          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <section className={panel}>
              <span className={smallLabel}>Calculation</span>
              <h3 className="mt-2 font-display text-lg font-bold">
                Your numbers, step by step
              </h3>
              <ol className="mt-5 space-y-4 text-sm">
                <li className="border-t border-stroke pt-3">
                  <span className="font-semibold">1. Your share</span>
                  <div className="mt-1 space-y-1 font-mono text-xs text-muted">
                    {FACTORS.filter((factor) => rule.weights[factor] > 0).map(
                      (factor) => (
                        <div key={factor}>
                          {formatPercent(rule.weights[factor], 0)} ×{" "}
                          {statement.factors[factor]} ÷ {rule.totals[factor]}{" "}
                          <span className="font-sans">{factor}</span>
                        </div>
                      ),
                    )}
                  </div>
                  <strong className="mt-1 block">
                    {formatPercent(own.share, 4)}
                  </strong>
                </li>
                <li className="border-t border-stroke pt-3">
                  <span className="font-semibold">2. Implied pool</span>
                  <p className="mt-1 font-mono text-xs text-muted">
                    {formatMoney(statement.utilityCents)} ÷{" "}
                    {own.share.toFixed(8)} = {formatMoney(own.impliedPoolCents)}
                  </p>
                </li>
                <li className="border-t border-stroke pt-3">
                  <span className="font-semibold">3. Expected charge</span>
                  <p className="mt-1 font-mono text-xs text-muted">
                    {formatPercent(own.share, 4)} ×{" "}
                    {formatMoney(result.consensusCents)} ≈{" "}
                    {formatMoney(own.expectedCents)}
                  </p>
                </li>
              </ol>
            </section>
            <section className={panel}>
              <span className={smallLabel}>Evidence</span>
              <h3 className="mt-2 font-display text-lg font-bold">
                What was compared
              </h3>
              <dl className="mt-5 space-y-3 text-sm">
                {[
                  ["Households", result.residents.length],
                  ["Document-backed demo entries", result.documentCount],
                  ["Self-reported", result.selfReportedCount],
                  [
                    "Master bill",
                    result.masterCheck ? "Included" : "Not included",
                  ],
                ].map(([name, value]) => (
                  <div
                    key={name}
                    className="flex justify-between gap-3 border-b border-stroke pb-3"
                  >
                    <dt className="text-muted">{name}</dt>
                    <dd className="font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 text-xs leading-5 text-muted">
                The {formatMoney(statement.feeCents)} billing fee is excluded.
                Documents are not authenticated.
              </p>
            </section>
          </div>
          <section className={panel}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className={smallLabel}>Next step</span>
                <h3 className="mt-2 font-display text-lg font-bold">
                  A letter you can edit
                </h3>
              </div>
              <div className="no-print inline-flex rounded-xl bg-canvas p-1">
                <button
                  type="button"
                  onClick={() => setLetterType("personal")}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold ${letterType === "personal" ? "bg-white text-forest shadow-sm" : "text-muted"}`}
                >
                  Personal
                </button>
                <button
                  type="button"
                  onClick={openCollective}
                  disabled={!reportCode || result.residents.length < 3}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-40 ${letterType === "collective" ? "bg-white text-forest shadow-sm" : "text-muted"}`}
                >
                  Building
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted">
              {letterType === "collective"
                ? `${result.residents.length} households · no names or unit numbers`
                : "Your own figures only"}
              . Nothing is sent.
            </p>
            <label htmlFor="letter-editor" className="sr-only">
              Editable manager letter
            </label>
            <textarea
              id="letter-editor"
              rows={14}
              value={activeLetter}
              onChange={(event) =>
                letterType === "personal"
                  ? setPersonalLetter(event.target.value)
                  : setCollectiveLetter(event.target.value)
              }
              className="no-print mt-5 w-full resize-y rounded-xl border border-stroke bg-canvas p-4 text-sm leading-6 focus:border-forest"
            />
            <div className="print-only hidden mt-5 whitespace-pre-wrap text-sm leading-6">
              {activeLetter}
            </div>
            <div className="no-print mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onCopy(activeLetter)}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-stroke px-4 text-xs font-semibold"
              >
                <Copy size={14} /> Copy
              </button>
              <button
                type="button"
                onClick={download}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-stroke px-4 text-xs font-semibold"
              >
                <Download size={14} /> Download
              </button>
            </div>
          </section>
          <p className="text-xs leading-5 text-muted">
            Synthetic calculations for discussion, not a legal conclusion or
            guaranteed refund.
          </p>
        </>
      )}
    </article>
  );
}
