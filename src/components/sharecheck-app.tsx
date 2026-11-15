"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  FileText,
  Fingerprint,
  RotateCcw,
  Search,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import {
  buildingCheck,
  FACTORS,
  formatMoney,
  formatPercent,
  validateRule,
  type Rule,
  type Statement,
} from "@/lib/audit";
import {
  DEMO_BUILDINGS,
  DEMO_RULE,
  YOUR_STATEMENT,
  demoCohort,
} from "@/lib/demo";
import { demoHistory } from "@/lib/history";
import {
  detectFormula,
  explainChange,
  ratesToWeights,
  reportCode,
  vacantShare,
  vacancyCheck,
  type Observation,
} from "@/lib/insights";
import { extractPdf } from "@/lib/statement-parser";
import {
  FormulaInsight,
  VacancyInsight,
  ChangeInsight,
  VerifyPage,
} from "./insights-panels";
import { AuditReport } from "./report-view";

type Page = "overview" | "statement" | "formula" | "room" | "report" | "verify";
type FieldValues = {
  charge: string;
  fee: string;
  sqft: string;
  occupants: string;
  bedrooms: string;
  period: string;
};
const INITIAL: FieldValues = {
  charge: "112.50",
  fee: "3.95",
  sqft: "900",
  occupants: "2",
  bedrooms: "2",
  period: "2026-10",
};
const fieldsFrom = (item: Statement): FieldValues => ({
  charge: (item.utilityCents / 100).toFixed(2),
  fee: (item.feeCents / 100).toFixed(2),
  sqft: String(item.factors.sqft),
  occupants: String(item.factors.occupants),
  bedrooms: String(item.factors.bedrooms),
  period: item.period,
});
const factorNames = {
  sqft: "Area",
  occupants: "Occupants",
  bedrooms: "Bedrooms",
  units: "Units",
};
const tabs: { id: Page; label: string; short: string }[] = [
  { id: "overview", label: "Overview", short: "Home" },
  { id: "statement", label: "Statement", short: "Bill" },
  { id: "formula", label: "Formula", short: "Formula" },
  { id: "room", label: "Building room", short: "Room" },
  { id: "report", label: "Report", short: "Report" },
  { id: "verify", label: "Verify", short: "Verify" },
];
const panel =
  "rounded-3xl border border-stroke bg-white p-6 shadow-[0_12px_40px_rgba(24,49,38,0.035)] sm:p-8";
const eyebrow = "text-[10px] font-bold uppercase tracking-[0.18em] text-muted";
const primary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-forest px-5 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40";
const secondary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stroke bg-white px-4 text-sm font-semibold transition hover:border-forest disabled:opacity-40";

function Field({
  label,
  value,
  onChange,
  hint,
  readOnly = false,
  inputMode = "decimal",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  readOnly?: boolean;
  inputMode?: "decimal" | "numeric";
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-xs font-semibold text-ink">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        readOnly={readOnly}
        inputMode={inputMode}
        className="min-h-11 w-full rounded-xl border border-stroke bg-white px-3.5 text-sm text-ink outline-none transition focus:border-forest read-only:bg-canvas read-only:text-muted"
      />
      {hint && (
        <span className="mt-1 block text-[11px] text-muted">{hint}</span>
      )}
    </label>
  );
}

export function SharecheckApp() {
  const [page, setPage] = useState<Page>("overview");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(
    null,
  );
  const [entryMode, setEntryMode] = useState<"bill" | "moving">("bill");
  const [previewBuildingId, setPreviewBuildingId] = useState<string | null>(
    null,
  );
  const [savedBuildingId, setSavedBuildingId] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldValues>(INITIAL);
  const [statement, setStatement] = useState<Statement>(YOUR_STATEMENT);
  const [rule, setRule] = useState<Rule>(DEMO_RULE);
  const [confirmed, setConfirmed] = useState(false);
  const [joined, setJoined] = useState(false);
  const [consent, setConsent] = useState(false);
  const [checked, setChecked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [master, setMaster] = useState(false);
  const [formulaMode, setFormulaMode] = useState<"disclosed" | "unknown">(
    "disclosed",
  );
  const [shiftedVacancies, setShiftedVacancies] = useState(false);
  const [code, setCode] = useState("");
  const [verificationBundle, setVerificationBundle] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"sample" | "pdf" | "manual">("sample");
  const [documentName, setDocumentName] = useState(
    "Maple Court · October statement.pdf",
  );
  const fileInput = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const selectedBuilding = DEMO_BUILDINGS.find(
    (building) => building.id === selectedBuildingId,
  );
  const activeBuilding = selectedBuilding ?? DEMO_BUILDINGS[0];
  const emptyBuilding = selectedBuildingId === "other";
  const previewBuilding = DEMO_BUILDINGS.find(
    (building) => building.id === previewBuildingId,
  );
  const savedBuilding = DEMO_BUILDINGS.find(
    (building) => building.id === savedBuildingId,
  );

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("sharecheck:saved-building");
      if (DEMO_BUILDINGS.some((building) => building.id === saved))
        setSavedBuildingId(saved);
    } catch {
      // Browser storage is optional.
    }
  }, []);

  function toggleSavedBuilding(id: string) {
    const next = savedBuildingId === id ? null : id;
    setSavedBuildingId(next);
    try {
      if (next) window.localStorage.setItem("sharecheck:saved-building", next);
      else window.localStorage.removeItem("sharecheck:saved-building");
    } catch {
      setNotice(
        "Browser storage is unavailable; this save lasts only for this visit.",
      );
    }
  }

  const cohort = demoCohort(statement, joined, activeBuilding);
  const observations: Observation[] = cohort.map((item) => ({
    id: item.householdId,
    unit: item.factors,
    utilityCharge: item.utilityCents / 100,
  }));
  const detective = detectFormula(observations);
  const inferred =
    detective.status === "found"
      ? ratesToWeights(detective.best.rates, rule.totals)
      : null;
  const effectiveRule: Rule =
    formulaMode === "unknown" && inferred
      ? {
          ...rule,
          weights: {
            sqft: 0,
            occupants: 0,
            bedrooms: 0,
            units: 0,
            ...inferred.weights,
          },
        }
      : rule;
  const result = buildingCheck({
    buildingId: activeBuilding.id,
    period: activeBuilding.period,
    rule: effectiveRule,
    statements: cohort,
    masterBillCents: master ? activeBuilding.masterBillCents : undefined,
  });
  const conclusive = result.status !== "insufficient";
  const own = conclusive
    ? result.residents.find(
        (resident) => resident.householdId === activeBuilding.viewerId,
      )!
    : null;
  const complete = checked && conclusive;
  const vacancyRule = {
    components: FACTORS.filter(
      (factor) => effectiveRule.weights[factor] > 0,
    ).map((basis) => ({ basis, weight: effectiveRule.weights[basis] })),
    buildingTotals: effectiveRule.totals,
  };
  const vacantUnits = activeBuilding.vacantUnits;
  const simulatedVacancyPool =
    ((activeBuilding.masterBillCents / 100) *
      (1 - effectiveRule.commonAreaFraction)) /
    (1 - vacantShare(vacancyRule, vacantUnits));
  const vacancy =
    complete && conclusive && own
      ? vacancyCheck({
          consensusPool: shiftedVacancies
            ? simulatedVacancyPool
            : result.consensusCents / 100,
          masterBill: activeBuilding.masterBillCents / 100,
          commonAreaDeductionPct: effectiveRule.commonAreaFraction,
          rule: vacancyRule,
          vacantUnits,
          yourShare: own.share,
        })
      : null;
  const currentShare = own?.share ?? 1 / activeBuilding.units;
  const currentPool = conclusive
    ? result.consensusCents / 100
    : (activeBuilding.masterBillCents / 100) * (1 - rule.commonAreaFraction);
  const currentCharge = statement.utilityCents / 100;
  const currentFee = statement.feeCents / 100;
  const change = explainChange(
    {
      period: "October 2026",
      share: currentShare,
      pool: currentPool,
      charged: currentCharge,
      fee: currentFee,
    },
    {
      period: "November 2026",
      share: currentShare,
      pool: currentPool + 240,
      charged: currentCharge + currentShare * 240 + 12.5,
      fee: currentFee + 1,
    },
  );
  const codeSource = JSON.stringify({
    statement,
    rule: effectiveRule,
    cohort,
    result: conclusive ? { consensusCents: result.consensusCents, own } : null,
    formulaMode,
    shiftedVacancies,
  });

  useEffect(() => {
    if (!complete || !conclusive || !own) {
      setCode("");
      setVerificationBundle("");
      return;
    }
    let current = true;
    const inputs = {
      version: 1,
      building: activeBuilding.name,
      period: activeBuilding.period,
      viewer: statement,
      rule: effectiveRule,
      consensusCents: result.consensusCents,
      own: {
        expectedCents: own.expectedCents,
        differenceCents: own.differenceCents,
        deviation: own.deviation,
      },
      households: cohort.length,
      formulaMode,
      vacancyScenario: shiftedVacancies
        ? "shifted simulation"
        : "observed sample",
    };
    void (async () => {
      const cohortFingerprint = await reportCode(cohort);
      const snapshot = { ...inputs, cohortFingerprint };
      const nextCode = await reportCode(snapshot);
      if (current) {
        setCode(nextCode);
        setVerificationBundle(
          JSON.stringify({ code: nextCode, inputs: snapshot }, null, 2),
        );
      }
    })();
    return () => {
      current = false;
    };
    // A stable serialized dependency tracks each input without rerunning for identical render objects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, codeSource]);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    titleRef.current?.focus();
  }, [page]);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timeout);
  }, [notice]);

  function go(next: Page) {
    if (!selectedBuilding && next !== "overview" && next !== "verify") {
      setPage("overview");
      return;
    }
    setErrors([]);
    setPage(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function invalidate() {
    setChecked(false);
    setUnlocked(false);
  }
  function updateField(key: keyof FieldValues, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
    setSource("manual");
    setConfirmed(false);
    invalidate();
  }
  function confirmStatement(event: React.FormEvent) {
    event.preventDefault();
    const issues: string[] = [];
    if (
      !/^\d+(\.\d{1,2})?$/.test(fields.charge) ||
      Number(fields.charge) <= 0 ||
      Number(fields.charge) > 100000
    )
      issues.push("Enter a water charge above $0, with up to two decimals.");
    if (!/^\d+(\.\d{1,2})?$/.test(fields.fee) || Number(fields.fee) > 1000)
      issues.push("Enter a fee from $0 to $1,000, with up to two decimals.");
    if (
      !/^\d+$/.test(fields.sqft) ||
      Number(fields.sqft) < 1 ||
      Number(fields.sqft) > 100000
    )
      issues.push("Enter an area from 1 to 100,000 sq ft.");
    if (
      !/^\d+$/.test(fields.occupants) ||
      Number(fields.occupants) < 1 ||
      Number(fields.occupants) > 100
    )
      issues.push("Enter 1 to 100 occupants.");
    if (!/^\d+$/.test(fields.bedrooms) || Number(fields.bedrooms) > 100)
      issues.push("Enter 0 to 100 bedrooms.");
    if (fields.period !== activeBuilding.period)
      issues.push(
        `This demo accepts ${activeBuilding.periodLabel} statements only.`,
      );
    if (issues.length) {
      setErrors(issues);
      return;
    }
    setStatement({
      ...activeBuilding.statements.find(
        (item) => item.householdId === activeBuilding.viewerId,
      )!,
      factors: {
        sqft: Number(fields.sqft),
        occupants: Number(fields.occupants),
        bedrooms: Number(fields.bedrooms),
        units: 1,
      },
      utilityCents: Math.round(Number(fields.charge) * 100),
      feeCents: Math.round(Number(fields.fee) * 100),
      period: fields.period,
      evidence:
        source === "pdf"
          ? "document-attached"
          : source === "sample"
            ? activeBuilding.statements.find(
                (item) => item.householdId === activeBuilding.viewerId,
              )!.evidence
            : "self-reported",
    });
    setConfirmed(true);
    invalidate();
    go("formula");
  }
  async function readFile(file: File) {
    setLoading(true);
    setErrors([]);
    setConfirmed(false);
    invalidate();
    try {
      const parsed = await extractPdf(file);
      setFields({
        charge: parsed.utilityDollars?.toFixed(2) ?? "",
        fee: parsed.feeDollars?.toFixed(2) ?? "",
        sqft: parsed.sqft?.toString() ?? "",
        occupants: parsed.occupants?.toString() ?? "",
        bedrooms: parsed.bedrooms?.toString() ?? "",
        period: parsed.period ?? "",
      });
      setSource("pdf");
      setDocumentName(file.name);
      setNotice("PDF text read locally. Review the fields.");
    } catch (error) {
      setErrors([
        error instanceof Error
          ? error.message
          : "Could not read this PDF. Enter the figures manually.",
      ]);
      setSource("manual");
    } finally {
      setLoading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  function loadSample() {
    setFields(
      fieldsFrom(
        activeBuilding.statements.find(
          (item) => item.householdId === activeBuilding.viewerId,
        )!,
      ),
    );
    setSource("sample");
    setDocumentName(`${activeBuilding.name} · October statement.pdf`);
    setConfirmed(false);
    setErrors([]);
    invalidate();
    setNotice("Sample loaded. Confirm the figures.");
  }
  function updateRule(next: Rule) {
    setRule(next);
    invalidate();
  }
  function continueFormula(event: React.FormEvent) {
    event.preventDefault();
    const issues = formulaMode === "disclosed" ? validateRule(rule) : [];
    if (!confirmed) issues.push("Confirm your statement first.");
    if (issues.length) {
      setErrors(issues);
      return;
    }
    go("room");
  }
  function runCheck() {
    if (!confirmed) {
      go("statement");
      setNotice("Confirm your statement first.");
      return;
    }
    if (formulaMode === "unknown" && detective.status !== "found") {
      setErrors([
        detective.status === "insufficient_data"
          ? "Formula Detective needs 4 households."
          : "No single formula fits this sample. Review the inputs.",
      ]);
      return;
    }
    setChecked(true);
    setErrors([]);
  }
  function reset() {
    setSelectedBuildingId(null);
    setFields(INITIAL);
    setStatement(YOUR_STATEMENT);
    setRule(DEMO_RULE);
    setConfirmed(false);
    setJoined(false);
    setConsent(false);
    setChecked(false);
    setUnlocked(false);
    setMaster(false);
    setFormulaMode("disclosed");
    setShiftedVacancies(false);
    setSource("sample");
    setErrors([]);
    go("overview");
    setNotice("Demo reset.");
  }
  function chooseBuilding(id: string) {
    if (id === "other") {
      setSelectedBuildingId(id);
      setConfirmed(false);
      setJoined(false);
      setChecked(false);
      setUnlocked(false);
      setCode("");
      setVerificationBundle("");
      setErrors([]);
      setNotice("");
      setPage("overview");
      return;
    }
    const next = DEMO_BUILDINGS.find((building) => building.id === id);
    if (!next) return;
    const viewer = next.statements.find(
      (item) => item.householdId === next.viewerId,
    )!;
    setSelectedBuildingId(id);
    setFields(fieldsFrom(viewer));
    setStatement(viewer);
    setRule(structuredClone(next.rule));
    setConfirmed(false);
    setJoined(false);
    setConsent(false);
    setChecked(false);
    setUnlocked(false);
    setMaster(false);
    setShiftedVacancies(false);
    setFormulaMode("disclosed");
    setSource("sample");
    setDocumentName(`${next.name} · October statement.pdf`);
    setCode("");
    setVerificationBundle("");
    setErrors([]);
    setNotice("");
    setPage("statement");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Copied.");
    } catch {
      setNotice("Clipboard unavailable. Select and copy the text shown.");
    }
  }

  const pageTitles: Record<Page, [string, string]> = {
    overview: [
      "A clearer view of your water bill.",
      "Check the split with your neighbours’ statements.",
    ],
    statement: [
      "Start with your bill.",
      "Review the figures used in the check.",
    ],
    formula: [
      "How is it split?",
      "Use the disclosed rule or find a likely one.",
    ],
    room: [
      "Compare as a building.",
      "Only your row and shared totals are shown.",
    ],
    report: ["Your report.", "The calculation and a practical next step."],
    verify: ["Verify a code.", "Check a shared report snapshot."],
  };

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3"
      >
        Skip to content
      </a>
      <header className="no-print border-b border-stroke bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8 sm:py-5">
          <button
            type="button"
            onClick={() => go("overview")}
            className="flex items-center gap-2.5 font-display text-lg font-extrabold tracking-[-0.06em]"
            aria-label="SHARECHECK home"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-forest text-white">
              <Check size={18} strokeWidth={3} />
            </span>
            SHARECHECK<span className="text-forest">.</span>
          </button>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-mist px-3 py-1 text-[11px] font-semibold text-forest">
              Synthetic demo
            </span>
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
            >
              <RotateCcw size={14} />{" "}
              {selectedBuildingId ? "Change building" : "Reset"}
            </button>
          </div>
        </div>
        <nav
          aria-label="Main navigation"
          className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 sm:px-8"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => go(tab.id)}
              disabled={
                !selectedBuilding &&
                tab.id !== "overview" &&
                tab.id !== "verify"
              }
              aria-current={page === tab.id ? "page" : undefined}
              className={`min-h-11 shrink-0 border-b-2 px-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-35 sm:px-4 ${page === tab.id ? "border-forest text-forest" : "border-transparent text-muted hover:text-ink"}`}
            >
              <span className="sm:hidden">{tab.short}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main
        id="main"
        className="mx-auto max-w-6xl px-5 pb-16 pt-9 sm:px-8 sm:pt-12"
      >
        {page !== "overview" && (
          <div className="no-print mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className={eyebrow}>
                {selectedBuilding
                  ? `${activeBuilding.name} / ${activeBuilding.periodLabel}`
                  : "Synthetic demo"}
              </span>
              <h1
                ref={titleRef}
                tabIndex={-1}
                className="mt-3 max-w-3xl font-display text-3xl font-extrabold leading-[1.12] tracking-[-0.055em] outline-none sm:text-5xl"
              >
                {pageTitles[page][0]}
              </h1>
              <p className="mt-3 text-sm text-muted">{pageTitles[page][1]}</p>
            </div>
            {selectedBuilding && (
              <span className="rounded-full border border-stroke bg-white px-3 py-1 text-xs text-muted">
                {joined ? activeBuilding.statements.length : 1} of{" "}
                {activeBuilding.units} households
              </span>
            )}
          </div>
        )}
        {errors.length > 0 && (
          <div
            role="alert"
            className="no-print mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          >
            <strong>Check these details</strong>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {page === "overview" && !selectedBuildingId && (
          <div className="no-print mx-auto max-w-5xl">
            <span className={eyebrow}>SHARECHECK · synthetic demo</span>
            <h1 className="mt-3 font-display text-4xl font-extrabold tracking-[-0.06em] sm:text-6xl">
              {entryMode === "moving"
                ? "Check before you move."
                : "Which building is yours?"}
            </h1>
            <p className="mt-4 max-w-xl text-sm text-muted">
              {entryMode === "moving"
                ? "Explore three months of fictional building history before signing."
                : "Choose a fictional building to explore its water bill. Each has six sample statements."}
            </p>
            <div
              className="mt-6 inline-flex rounded-xl border border-stroke bg-white p-1"
              role="group"
              aria-label="Choose a goal"
            >
              <button
                type="button"
                aria-pressed={entryMode === "bill"}
                onClick={() => {
                  setEntryMode("bill");
                  setPreviewBuildingId(null);
                }}
                className={`rounded-lg px-4 py-2.5 text-xs font-semibold ${entryMode === "bill" ? "bg-forest text-white" : "text-muted"}`}
              >
                Check my bill
              </button>
              <button
                type="button"
                aria-pressed={entryMode === "moving"}
                onClick={() => setEntryMode("moving")}
                className={`rounded-lg px-4 py-2.5 text-xs font-semibold ${entryMode === "moving" ? "bg-forest text-white" : "text-muted"}`}
              >
                Moving
              </button>
            </div>
            {savedBuilding && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-mist px-5 py-4 text-sm">
                <span>
                  <strong>Saved for later:</strong> {savedBuilding.name}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEntryMode("moving");
                    setPreviewBuildingId(savedBuilding.id);
                  }}
                  className="font-semibold text-forest"
                >
                  View history →
                </button>
              </div>
            )}
            <div className="mt-9 grid gap-3 sm:grid-cols-2">
              {DEMO_BUILDINGS.map((building) => (
                <button
                  key={building.id}
                  type="button"
                  onClick={() =>
                    entryMode === "moving"
                      ? setPreviewBuildingId(building.id)
                      : chooseBuilding(building.id)
                  }
                  aria-pressed={
                    entryMode === "moving"
                      ? previewBuildingId === building.id
                      : undefined
                  }
                  className={`group rounded-3xl border bg-white p-6 text-left transition hover:border-forest hover:shadow-lg ${previewBuildingId === building.id && entryMode === "moving" ? "border-forest" : "border-stroke"}`}
                >
                  <span className={eyebrow}>
                    {building.units} homes · {building.periodLabel}
                  </span>
                  <span className="mt-3 flex items-center justify-between gap-3 font-display text-xl font-bold">
                    <span>{building.name}</span>
                    <ArrowRight
                      size={19}
                      className="text-forest transition group-hover:translate-x-1"
                    />
                  </span>
                  <span className="mt-2 block text-xs text-muted">
                    {building.formulaLabel} · 6 sample statements
                  </span>
                </button>
              ))}
            </div>
            {entryMode === "moving" && previewBuilding && (
              <section className={`${panel} mt-5`} aria-live="polite">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className={eyebrow}>Moving preview · synthetic</span>
                    <h2 className="mt-2 font-display text-2xl font-bold">
                      {previewBuilding.name}
                    </h2>
                  </div>
                  <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-forest">
                    6 sample households
                  </span>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {demoHistory(previewBuilding).map((month) => (
                    <div
                      key={month.period}
                      className="rounded-2xl border border-stroke p-4"
                    >
                      <span className={eyebrow}>{month.label} 2026</span>
                      <strong className="mt-2 block font-display text-lg">
                        {month.flaggedCount
                          ? `${month.flaggedCount} flagged`
                          : "No mismatch found"}
                      </strong>
                      <span className="mt-1 block text-xs text-muted">
                        {month.households} statements ·{" "}
                        {formatMoney(month.consensusCents)} pool
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-5 text-muted">
                  Sample history shows calculation differences, not whether a
                  building is fair or what a future bill will be.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSavedBuilding(previewBuilding.id)}
                    className={secondary}
                  >
                    {savedBuildingId === previewBuilding.id
                      ? "Remove saved building"
                      : "Save this building"}
                  </button>
                  <button
                    type="button"
                    onClick={() => chooseBuilding(previewBuilding.id)}
                    className={primary}
                  >
                    Check a bill <ArrowRight size={16} />
                  </button>
                </div>
              </section>
            )}
            <button
              type="button"
              onClick={() => chooseBuilding("other")}
              className="mt-4 flex min-h-14 w-full items-center justify-between rounded-2xl border border-dashed border-stroke px-5 text-left text-sm font-semibold hover:border-forest"
            >
              My building is not listed <ArrowRight size={17} />
            </button>
          </div>
        )}

        {page === "overview" && emptyBuilding && (
          <section className={`${panel} no-print mx-auto max-w-2xl`}>
            <span className={eyebrow}>Your building</span>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
              {entryMode === "moving" ? "No history yet" : "No shared data yet"}
            </h1>
            <p className="mt-5 text-sm leading-6 text-muted">
              An unlisted building has no shared statements here. A comparison
              needs at least three from the same building and month. This demo
              does not save bill submissions or send alerts.
            </p>
            <div className="mt-6 rounded-2xl bg-mist p-4 text-xs leading-5 text-forest">
              For real alerts, the live service would need a private database,
              verified building membership, consent, and an email or
              notification provider.
            </div>
            <button
              type="button"
              onClick={reset}
              className={`${secondary} mt-6`}
            >
              Explore sample buildings <ArrowRight size={16} />
            </button>
          </section>
        )}

        {page === "overview" && selectedBuilding && (
          <div className="no-print space-y-5">
            <section className="relative overflow-hidden rounded-[32px] bg-forest px-7 py-9 text-white sm:px-12 sm:py-14">
              <div className="relative z-10 max-w-2xl">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                  {activeBuilding.name} · {activeBuilding.periodLabel}
                </span>
                <h2 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-[-0.06em] sm:text-6xl">
                  Is your share
                  <br />
                  adding up?
                </h2>
                <p className="mt-5 max-w-md text-sm leading-6 text-white/75">
                  Compare water charges, uncover the formula, and see what to
                  ask next.
                </p>
                <button
                  type="button"
                  onClick={() => go("statement")}
                  className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-forest hover:bg-mist"
                >
                  Start the check <ArrowRight size={17} />
                </button>
                <p className="mt-4 text-xs text-white/60">
                  Synthetic example · About 2 minutes
                </p>
              </div>
              <div
                aria-hidden="true"
                className="absolute -bottom-24 -right-12 size-72 rounded-full border-[55px] border-white/5 sm:-right-4 sm:size-96"
              />
            </section>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className={panel}>
                <span className={eyebrow}>Your sample</span>
                <strong className="mt-2 block font-display text-2xl font-bold">
                  {formatMoney(statement.utilityCents)}
                </strong>
                <span className="text-xs text-muted">Water charge</span>
              </div>
              <div className={panel}>
                <span className={eyebrow}>Participating</span>
                <strong className="mt-2 block font-display text-2xl font-bold">
                  {joined ? activeBuilding.statements.length : 1} /{" "}
                  {activeBuilding.units}
                </strong>
                <span className="text-xs text-muted">Synthetic households</span>
              </div>
              <div className={panel}>
                <span className={eyebrow}>Status</span>
                <strong className="mt-2 block font-display text-lg font-bold">
                  {complete
                    ? own?.flagged
                      ? "Review flagged"
                      : "Consistent"
                    : "Ready to check"}
                </strong>
                <button
                  type="button"
                  onClick={() => go(complete ? "report" : "room")}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-forest"
                >
                  {complete ? "Open report" : "Open room"}{" "}
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Find the formula", "formula", Search],
                ["Check vacant units", "room", ShieldCheck],
                ["Explain a change", "room", FileText],
              ].map(([name, target, Icon]) => {
                const ItemIcon = Icon as typeof Search;
                return (
                  <button
                    key={name as string}
                    type="button"
                    onClick={() => go(target as Page)}
                    className="flex min-h-16 items-center gap-3 rounded-2xl border border-stroke bg-white px-5 text-left text-sm font-semibold hover:border-forest"
                  >
                    <ItemIcon size={19} className="text-forest" />
                    <span className="flex-1">{name as string}</span>
                    <ArrowRight size={15} className="text-muted" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {page === "statement" && (
          <div
            className={`no-print grid gap-5 ${activeBuilding.id === "maple-court-demo" ? "lg:grid-cols-[1.4fr_0.6fr]" : "mx-auto max-w-3xl"}`}
          >
            <form onSubmit={confirmStatement} noValidate className={panel}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className={eyebrow}>1 / Statement</span>
                  <h2 className="mt-2 font-display text-xl font-bold">
                    Confirm your figures
                  </h2>
                </div>
                <FileText size={20} className="text-forest" />
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Water charge · $"
                  value={fields.charge}
                  onChange={(value) => updateField("charge", value)}
                />
                <Field
                  label="Billing fee · $"
                  value={fields.fee}
                  onChange={(value) => updateField("fee", value)}
                />
                <Field
                  label="Apartment · sq ft"
                  value={fields.sqft}
                  onChange={(value) => updateField("sqft", value)}
                  inputMode="numeric"
                />
                <Field
                  label="Occupants"
                  value={fields.occupants}
                  onChange={(value) => updateField("occupants", value)}
                  inputMode="numeric"
                />
                <Field
                  label="Bedrooms"
                  value={fields.bedrooms}
                  onChange={(value) => updateField("bedrooms", value)}
                  inputMode="numeric"
                />
                <Field
                  label="Month"
                  value={fields.period}
                  onChange={(value) => updateField("period", value)}
                  hint={`${activeBuilding.periodLabel} only`}
                />
              </div>
              <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-stroke pt-6">
                <span className="text-xs text-muted">
                  {source === "manual"
                    ? "Manual entry"
                    : source === "pdf"
                      ? `Read from ${documentName}`
                      : "Synthetic sample"}{" "}
                  · review required
                </span>
                <button type="submit" className={primary}>
                  Confirm figures <ArrowRight size={16} />
                </button>
              </div>
            </form>
            {activeBuilding.id === "maple-court-demo" && (
              <aside className={`${panel} h-fit`}>
                <span className={eyebrow}>Optional PDF</span>
                <h3 className="mt-2 font-display text-lg font-bold">
                  Read it locally
                </h3>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Text PDFs only. Your file stays in this browser.
                </p>
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  aria-label="Choose a PDF statement"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void readFile(file);
                  }}
                />
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => fileInput.current?.click()}
                    className={secondary}
                  >
                    <Upload size={15} /> {loading ? "Reading…" : "Choose PDF"}
                  </button>
                  <button
                    type="button"
                    onClick={loadSample}
                    className={secondary}
                  >
                    Use sample
                  </button>
                </div>
                <a
                  href="/samples/maple-court-statement.pdf"
                  download
                  className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-forest hover:underline"
                >
                  Download sample <Download size={14} />
                </a>
              </aside>
            )}
          </div>
        )}

        {page === "formula" && (
          <form
            onSubmit={continueFormula}
            noValidate
            className={`${panel} no-print mx-auto max-w-4xl`}
          >
            <span className={eyebrow}>2 / Formula</span>
            <h2 className="mt-2 font-display text-xl font-bold">
              Choose your starting point
            </h2>
            <div
              role="group"
              aria-label="Formula source"
              className="mt-5 inline-flex rounded-xl bg-canvas p-1"
            >
              <button
                type="button"
                aria-pressed={formulaMode === "disclosed"}
                onClick={() => {
                  setFormulaMode("disclosed");
                  invalidate();
                }}
                className={`rounded-lg px-4 py-2.5 text-xs font-semibold ${formulaMode === "disclosed" ? "bg-white text-forest shadow-sm" : "text-muted"}`}
              >
                Disclosed rule
              </button>
              <button
                type="button"
                aria-pressed={formulaMode === "unknown"}
                onClick={() => {
                  setFormulaMode("unknown");
                  invalidate();
                }}
                className={`rounded-lg px-4 py-2.5 text-xs font-semibold ${formulaMode === "unknown" ? "bg-white text-forest shadow-sm" : "text-muted"}`}
              >
                I don’t have it
              </button>
            </div>
            {formulaMode === "unknown" ? (
              <div className="mt-5">
                <FormulaInsight
                  result={detective}
                  compact={false}
                  onAdd={() => go("room")}
                />
              </div>
            ) : (
              <>
                <div className="mt-6 flex flex-wrap gap-2">
                  {FACTORS.filter((factor) => rule.weights[factor] > 0).map(
                    (factor) => (
                      <span
                        key={factor}
                        className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-forest"
                      >
                        {formatPercent(rule.weights[factor], 0)}{" "}
                        {factorNames[factor].toLowerCase()}
                      </span>
                    ),
                  )}
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {FACTORS.map((factor) => (
                    <Field
                      key={factor}
                      label={`${factorNames[factor]} · %`}
                      value={
                        Number.isFinite(rule.weights[factor])
                          ? String(
                              Math.round(rule.weights[factor] * 10000) / 100,
                            )
                          : ""
                      }
                      onChange={(value) =>
                        updateRule({
                          ...rule,
                          weights: {
                            ...rule.weights,
                            [factor]: value === "" ? NaN : Number(value) / 100,
                          },
                        })
                      }
                    />
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted">
                  Weights must total 100%.
                </p>
                <details className="mt-6 rounded-2xl border border-stroke p-4">
                  <summary className="cursor-pointer text-sm font-semibold">
                    Building totals and fees
                  </summary>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {FACTORS.map((factor) => (
                      <Field
                        key={factor}
                        label={`Total ${factorNames[factor].toLowerCase()}`}
                        value={
                          Number.isFinite(rule.totals[factor])
                            ? String(rule.totals[factor])
                            : ""
                        }
                        readOnly={factor === "units"}
                        inputMode="numeric"
                        onChange={(value) =>
                          updateRule({
                            ...rule,
                            totals: {
                              ...rule.totals,
                              [factor]: value === "" ? NaN : Number(value),
                            },
                          })
                        }
                      />
                    ))}
                    <Field
                      label="Common-area deduction · %"
                      value={
                        Number.isFinite(rule.commonAreaFraction)
                          ? String(
                              Math.round(rule.commonAreaFraction * 10000) / 100,
                            )
                          : ""
                      }
                      onChange={(value) =>
                        updateRule({
                          ...rule,
                          commonAreaFraction:
                            value === "" ? NaN : Number(value) / 100,
                        })
                      }
                    />
                    <Field
                      label="Disclosed fee · $"
                      value={
                        Number.isFinite(rule.billingFeeCents)
                          ? String(rule.billingFeeCents / 100)
                          : ""
                      }
                      onChange={(value) =>
                        updateRule({
                          ...rule,
                          billingFeeCents:
                            value === ""
                              ? NaN
                              : Math.round(Number(value) * 100),
                        })
                      }
                    />
                  </div>
                </details>
                {activeBuilding.id === "maple-court-demo" && (
                  <a
                    href="/samples/maple-court-addendum.pdf"
                    download
                    className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-forest hover:underline"
                  >
                    Sample addendum <Download size={14} />
                  </a>
                )}
              </>
            )}
            <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-stroke pt-6">
              <button
                type="button"
                onClick={() => go("statement")}
                className="text-xs font-semibold text-muted hover:text-ink"
              >
                Back to bill
              </button>
              <button type="submit" className={primary}>
                Continue to room <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        {page === "room" && (
          <div className="no-print space-y-5">
            <section className={panel}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className={eyebrow}>3 / Building room</span>
                  <h2 className="mt-2 font-display text-xl font-bold">
                    {joined
                      ? "Six households in the sample"
                      : "One bill is not enough"}
                  </h2>
                  <p className="mt-2 text-sm text-muted">
                    {joined
                      ? "Your figures and building totals only."
                      : "Add five synthetic neighbours to compare the split."}
                  </p>
                </div>
                <div className="rounded-2xl bg-mist px-4 py-3 text-center">
                  <strong className="block font-display text-2xl">
                    {joined ? 6 : 1}
                  </strong>
                  <span className="text-[11px] text-muted">
                    of {activeBuilding.units}
                  </span>
                </div>
              </div>
              {!joined ? (
                <div className="mt-6 border-t border-stroke pt-5">
                  <label className="flex cursor-pointer items-start gap-3 text-xs leading-5">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(event) => setConsent(event.target.checked)}
                      className="mt-0.5 size-4 accent-forest"
                    />
                    <span>
                      I agree to use my figures in this synthetic comparison.
                    </span>
                  </label>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!consent || !confirmed}
                      onClick={() => {
                        setJoined(true);
                        invalidate();
                        setNotice("Five synthetic neighbours added.");
                      }}
                      className={primary}
                    >
                      <Users size={16} /> Add demo neighbours
                    </button>
                    <button
                      type="button"
                      onClick={() => go("statement")}
                      className={secondary}
                    >
                      {confirmed ? "Edit my bill" : "Confirm my bill"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 border-t border-stroke pt-5">
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex cursor-pointer items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={master}
                        onChange={(event) => {
                          setMaster(event.target.checked);
                          invalidate();
                        }}
                        className="size-4 accent-forest"
                      />{" "}
                      Include {formatMoney(activeBuilding.masterBillCents)} demo
                      master bill
                    </label>
                    {activeBuilding.id === "maple-court-demo" && (
                      <a
                        href="/samples/maple-court-master-bill.pdf"
                        download
                        className="text-xs font-semibold text-forest hover:underline"
                      >
                        View bill ↗
                      </a>
                    )}
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={runCheck}
                      className={primary}
                    >
                      {checked ? "Run again" : "Run building check"}{" "}
                      <ArrowRight size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void copy(window.location.href)}
                      className={secondary}
                    >
                      <Copy size={14} /> Copy demo link
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setJoined(false);
                        setConsent(false);
                        invalidate();
                        setNotice("Participation withdrawn from this session.");
                      }}
                      className="min-h-11 px-2 text-xs font-semibold text-muted hover:text-ink"
                    >
                      Withdraw
                    </button>
                  </div>
                  <p className="mt-3 text-[11px] text-muted">
                    Demo links open independent sessions; no real invitation is
                    sent.
                  </p>
                </div>
              )}
            </section>
            {joined && (
              <div className="grid gap-4 lg:grid-cols-2">
                <FormulaInsight
                  result={detective}
                  compact
                  onAdd={() => go("formula")}
                  viewerId={activeBuilding.viewerId}
                />
                {complete && vacancy && (
                  <VacancyInsight
                    result={vacancy}
                    shifted={shiftedVacancies}
                    onToggle={() => setShiftedVacancies((current) => !current)}
                    masterBill={activeBuilding.masterBillCents / 100}
                    vacantCount={activeBuilding.vacantUnits.length}
                  />
                )}
              </div>
            )}
            {checked && result.status === "insufficient" && (
              <div
                role="status"
                className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"
              >
                <strong>More information is needed.</strong>
                <ul className="mt-2 list-inside list-disc">
                  {result.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
            {complete && own && conclusive && (
              <>
                <section
                  role="status"
                  className="rounded-3xl bg-forest p-7 text-white sm:p-9"
                >
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/65">
                    Your result
                  </span>
                  <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
                    <div>
                      <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                        {own.flagged
                          ? `${formatMoney(Math.abs(own.differenceCents))} difference`
                          : "Your charge matches"}
                      </h2>
                      <p className="mt-2 max-w-lg text-sm text-white/70">
                        {own.flagged
                          ? `${formatPercent(Math.abs(own.deviation), 0)} ${own.deviation > 0 ? "above" : "below"} the building consensus.`
                          : "Within the 2% comparison tolerance."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => go("report")}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-forest"
                    >
                      Open report <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="mt-7 grid gap-4 border-t border-white/20 pt-5 text-xs sm:grid-cols-3">
                    {[
                      ["Your charge", formatMoney(statement.utilityCents)],
                      ["Expected", formatMoney(own.expectedCents)],
                      ["Median pool", formatMoney(result.consensusCents)],
                    ].map(([name, value]) => (
                      <div key={name}>
                        <span className="text-white/60">{name}</span>
                        <strong className="mt-1 block font-display text-lg">
                          {value}
                        </strong>
                      </div>
                    ))}
                  </div>
                </section>
                <ChangeInsight result={change} />
              </>
            )}
          </div>
        )}

        {page === "report" &&
          (!complete || !own || !conclusive ? (
            <section
              className={`${panel} no-print mx-auto max-w-2xl text-center`}
            >
              <Fingerprint size={30} className="mx-auto text-forest" />
              <h2 className="mt-4 font-display text-xl font-bold">
                Your report starts with a check
              </h2>
              <p className="mt-2 text-sm text-muted">
                Confirm the bill, add neighbours and run the comparison.
              </p>
              <button
                type="button"
                onClick={() => go(confirmed ? "room" : "statement")}
                className={`${primary} mt-6`}
              >
                Continue <ArrowRight size={16} />
              </button>
            </section>
          ) : (
            <AuditReport
              key={JSON.stringify({
                statement,
                rule: effectiveRule,
                master,
                formulaMode,
                shiftedVacancies,
              })}
              result={result}
              buildingName={activeBuilding.name}
              periodLabel={activeBuilding.periodLabel}
              own={own}
              statement={statement}
              rule={effectiveRule}
              unlocked={unlocked}
              onUnlock={() => setUnlocked(true)}
              onCopy={copy}
              formula={detective}
              vacancy={shiftedVacancies ? null : vacancy}
              reportCode={code}
              verificationBundle={verificationBundle}
              onVerify={() => go("verify")}
            />
          ))}
        {page === "verify" && (
          <VerifyPage initialBundle={verificationBundle} onCopy={copy} />
        )}
        <footer className="no-print mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-stroke pt-6 text-[11px] text-muted">
          <span>SHARECHECK · Synthetic demo</span>
          <details className="max-w-xl">
            <summary className="cursor-pointer font-semibold text-forest">
              How this works
            </summary>
            <p className="mt-2 leading-5">
              We compare each household’s implied building pool using the
              median. A difference above 2% is flagged. A consistent split does
              not authenticate bills or prove the building total is right.
            </p>
          </details>
          <span>Calculations, not legal advice</span>
        </footer>
      </main>
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed bottom-5 left-1/2 z-50 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl bg-ink px-4 py-3 text-xs font-semibold text-white shadow-xl"
        >
          {notice}
        </div>
      )}
    </div>
  );
}
