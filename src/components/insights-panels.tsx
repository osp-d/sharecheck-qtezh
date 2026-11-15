"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Copy, Fingerprint, Search } from "lucide-react";
import {
  reportCode,
  type DetectiveResult,
  type VacancyCheckResult,
  type ChangeResult,
} from "@/lib/insights";

const panel =
  "rounded-3xl border border-stroke bg-white p-6 shadow-[0_12px_40px_rgba(24,49,38,0.035)] sm:p-7";
const label = "text-[10px] font-bold uppercase tracking-[0.17em] text-muted";
const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );
const rate = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(n);
const signed = (n: number) => `${n < 0 ? "−" : "+"}${money(Math.abs(n))}`;

export function FormulaInsight({
  result,
  compact,
  onAdd,
  viewerId = "r4",
}: {
  result: DetectiveResult;
  compact: boolean;
  onAdd: () => void;
  viewerId?: string;
}) {
  const found = result.status === "found";
  return (
    <section
      className={
        compact
          ? panel
          : "rounded-2xl border border-stroke bg-canvas p-5 sm:p-6"
      }
    >
      <div className="flex items-center gap-2">
        <Search size={16} className="text-forest" />
        <span className={label}>Formula detective</span>
      </div>
      {found ? (
        <>
          <h3 className="mt-5 font-display text-xl font-bold tracking-tight">
            A likely pattern
          </h3>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-display text-2xl font-extrabold tracking-tight text-forest sm:text-[28px]">
            {result.best.bases.map((basis, index) => (
              <span key={basis}>
                {index > 0 && <span className="mr-2 text-muted">+</span>}
                {rate(result.best.rates[basis])}
                <span className="ml-1 font-sans text-xs font-medium tracking-normal text-muted">
                  /{" "}
                  {basis === "sqft"
                    ? "sq ft"
                    : basis === "units"
                      ? "unit"
                      : basis.slice(0, -1)}
                </span>
              </span>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-stroke pt-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5 font-semibold text-forest">
              <Check size={14} />
              {result.best.inliers.length} of{" "}
              {result.best.inliers.length + result.best.outliers.length} match
            </span>
            <span>{result.best.outliers.length} flagged</span>
          </div>
          {result.best.outliers.find((item) => item.id === viewerId) && (
            <p className="mt-3 text-xs text-ink">
              Your charge is{" "}
              {money(
                Math.abs(
                  result.best.outliers.find((item) => item.id === viewerId)!
                    .excessPerMonth,
                ),
              )}{" "}
              {result.best.outliers.find((item) => item.id === viewerId)!
                .excessPerMonth >= 0
                ? "above"
                : "below"}{" "}
              this pattern.
            </p>
          )}
        </>
      ) : (
        <>
          <h3 className="mt-5 font-display text-xl font-bold tracking-tight">
            {result.status === "insufficient_data"
              ? "Need 4 households"
              : result.status === "ambiguous"
                ? "Several patterns fit"
                : "No clear pattern yet"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            {result.status === "insufficient_data"
              ? `${result.contributors} available now. Add demo neighbours to continue.`
              : "Review the inputs or add more varied households."}
          </p>
          {result.status === "insufficient_data" && (
            <button
              type="button"
              onClick={onAdd}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-forest hover:underline"
            >
              Open room <ArrowRight size={15} />
            </button>
          )}
        </>
      )}
      <p className="mt-4 text-[11px] leading-5 text-muted">
        Inferred from charges; confirm the lease rule separately.
      </p>
    </section>
  );
}

export function VacancyInsight({
  result,
  shifted,
  onToggle,
  masterBill,
  vacantCount,
}: {
  result: VacancyCheckResult;
  shifted: boolean;
  onToggle: () => void;
  masterBill: number;
  vacantCount: number;
}) {
  return (
    <section className={panel}>
      <span className={label}>Vacancy shift check</span>
      <h3 className="mt-5 font-display text-xl font-bold leading-tight tracking-tight">
        {result.finding === "landlord_absorbs_vacancies"
          ? "Vacancies appear absorbed"
          : result.finding === "vacancies_billed_to_residents"
            ? "Shifted share fits this scenario"
            : "Pool needs an explanation"}
      </h3>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-canvas p-4">
          <span className="block text-xs text-muted">Vacant share</span>
          <strong className="mt-1 block font-display text-2xl tracking-tight">
            {result.vacantSharePct.toFixed(2)}%
          </strong>
        </div>
        <div className="rounded-2xl bg-canvas p-4">
          <span className="block text-xs text-muted">
            {shifted ? "Simulated pool" : "Observed pool"}
          </span>
          <strong className="mt-1 block font-display text-2xl tracking-tight">
            {money(result.consensusPool)}
          </strong>
        </div>
      </div>
      {shifted && (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
          <span>
            <strong>{money(result.extraBilledToResidentsPerMonth)}</strong>{" "}
            vacant share
          </span>
          <span>
            <strong>{money(result.yourExtraPerMonth ?? 0)}</strong> modeled for
            you
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={onToggle}
        className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-forest hover:underline"
      >
        {shifted ? "Back to observed" : "Try shifted scenario"}
        <ArrowRight size={15} />
      </button>
      <p className="mt-2 text-[11px] leading-5 text-muted">
        {shifted
          ? "What-if only; this is not an observed finding."
          : `Uses the ${money(masterBill)} synthetic master bill and ${vacantCount} vacant units.`}
      </p>
    </section>
  );
}

export function ChangeInsight({ result }: { result: ChangeResult }) {
  const parts = [
    ["Building bill", result.parts.buildingBill],
    ["Your share", result.parts.yourShare],
    ["Fee", result.parts.fee],
    ["Off-formula", result.parts.offFormula],
  ] as const;
  return (
    <section className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className={label}>Why did my bill change?</span>
          <h3 className="mt-2 font-display text-xl font-bold">
            October → November
          </h3>
        </div>
        <strong className="font-display text-3xl font-extrabold tracking-tight text-forest">
          {signed(result.totalChange)}
        </strong>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {parts.map(([name, value]) => (
          <div key={name} className="rounded-xl border border-stroke px-3 py-3">
            <span className="block text-[11px] text-muted">{name}</span>
            <strong className="mt-1 block font-display text-sm">
              {signed(value)}
            </strong>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] leading-5 text-muted">
        Modeled November example. Parts add to the cent.
      </p>
    </section>
  );
}

export function VerifyPage({
  initialBundle,
  onCopy,
}: {
  initialBundle: string;
  onCopy: (text: string) => Promise<void>;
}) {
  const [bundle, setBundle] = useState(initialBundle);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (initialBundle) setBundle(initialBundle);
  }, [initialBundle]);
  async function verify() {
    try {
      const parsed: unknown = JSON.parse(bundle);
      if (
        !parsed ||
        typeof parsed !== "object" ||
        !("code" in parsed) ||
        !("inputs" in parsed) ||
        typeof parsed.code !== "string" ||
        !/^SC-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(parsed.code)
      )
        throw new Error("Paste a SHARECHECK bundle.");
      const computed = await reportCode(parsed.inputs);
      setMessage(
        computed === parsed.code
          ? "Code matches this snapshot."
          : `No match. These inputs produce ${computed}.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not read the bundle.",
      );
    }
  }
  return (
    <section className={`${panel} mx-auto max-w-3xl`}>
      <div className="flex items-center gap-2 text-forest">
        <Fingerprint size={18} />
        <span className={label}>Report verification</span>
      </div>
      <h2 className="mt-5 font-display text-2xl font-bold tracking-tight">
        Check a report code
      </h2>
      <p className="mt-2 text-sm text-muted">
        Paste the bundle copied from a report.
      </p>
      <label
        htmlFor="verification-bundle"
        className="mt-6 block text-xs font-semibold"
      >
        Verification bundle
      </label>
      <textarea
        id="verification-bundle"
        value={bundle}
        onChange={(event) => {
          setBundle(event.target.value);
          setMessage("");
        }}
        rows={12}
        spellCheck={false}
        placeholder='{ "code": "SC-…", "inputs": { … } }'
        className="mt-2 w-full resize-y rounded-xl border border-stroke bg-canvas p-4 font-mono text-xs leading-5 outline-none focus:border-forest"
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void verify()}
          className="min-h-11 rounded-xl bg-forest px-5 text-sm font-semibold text-white hover:bg-ink"
        >
          Verify
        </button>
        <button
          type="button"
          onClick={() => void onCopy(bundle)}
          disabled={!bundle}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-stroke px-4 text-sm font-semibold disabled:opacity-40"
        >
          <Copy size={15} /> Copy
        </button>
      </div>
      {message && (
        <p
          role="status"
          className="mt-4 rounded-xl bg-mist p-3 text-sm font-semibold"
        >
          {message}
        </p>
      )}
      <p className="mt-5 text-xs leading-5 text-muted">
        A match checks this snapshot. It does not authenticate source
        statements.
      </p>
    </section>
  );
}
