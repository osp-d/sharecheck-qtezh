"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Copy,
  Download,
  FileCheck2,
  FileText,
  Fingerprint,
  History,
  Home,
  Info,
  Leaf,
  LockKeyhole,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Upload,
  Users,
  X,
  type LucideIcon,
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
import { BUILDING, DEMO_RULE, YOUR_STATEMENT, demoCohort } from "@/lib/demo";
import { extractPdf } from "@/lib/statement-parser";
import { BuildingArt } from "./building-art";
import { AuditReport } from "./report-view";
import {
  detectFormula,
  explainChange,
  ratesToWeights,
  reportCode,
  vacancyCheck,
  type Observation,
} from "@/lib/insights";
import { FormulaInsight, VacancyInsight, ChangeInsight, VerifyPage } from "./insights-panels";

type Page = "overview" | "statement" | "formula" | "room" | "report" | "verify";
type Modal = "method" | "invite" | "pricing" | null;
const NAV: { id: Page; name: string; icon: LucideIcon }[] = [
  { id: "overview", name: "Overview", icon: Home },
  { id: "statement", name: "Your statement", icon: FileText },
  { id: "formula", name: "Building formula", icon: Settings2 },
  { id: "room", name: "Building room", icon: Users },
  { id: "report", name: "Your report", icon: ClipboardCheck },
  { id: "verify", name: "Verify report", icon: Fingerprint },
];

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
const factorNames = {
  sqft: "Square feet",
  occupants: "Occupants",
  bedrooms: "Bedrooms",
  units: "Units",
};

export function SharecheckApp() {
  const [page, setPage] = useState<Page>("overview");
  const [fields, setFields] = useState<FieldValues>(INITIAL);
  const [statement, setStatement] = useState<Statement>(YOUR_STATEMENT);
  const [rule, setRule] = useState<Rule>(DEMO_RULE);
  const [confirmed, setConfirmed] = useState(false);
  const [joined, setJoined] = useState(false);
  const [consent, setConsent] = useState(false);
  const [checked, setChecked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [master, setMaster] = useState(false);
  const [formulaMode, setFormulaMode] = useState<"disclosed" | "unknown">("disclosed");
  const [shiftedVacancies, setShiftedVacancies] = useState(false);
  const [code, setCode] = useState("");
  const [verificationBundle, setVerificationBundle] = useState("");
  const [modal, setModal] = useState<Modal>(null);
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

  const cohort = demoCohort(statement, joined);
  const observations: Observation[] = cohort.map((s) => ({
    id: s.householdId,
    unit: s.factors,
    utilityCharge: s.utilityCents / 100,
  }));
  const detective = detectFormula(observations);
  const inferred = detective.status === "found"
    ? ratesToWeights(detective.best.rates, rule.totals)
    : null;
  const effectiveRule: Rule = formulaMode === "unknown" && inferred
    ? { ...rule, weights: { sqft: 0, occupants: 0, bedrooms: 0, units: 0, ...inferred.weights } }
    : rule;
  const result = buildingCheck({
    buildingId: BUILDING.id,
    period: BUILDING.period,
    rule: effectiveRule,
    statements: cohort,
    masterBillCents: master ? 240000 : undefined,
  });
  const conclusive = result.status !== "insufficient";
  const own = conclusive
    ? result.residents.find((r) => r.householdId === "r4")!
    : null;
  const complete = checked && conclusive;
  const vacancy = complete && conclusive && own
    ? vacancyCheck({
        consensusPool: shiftedVacancies ? 2304 : result.consensusCents / 100,
        masterBill: 2400,
        commonAreaDeductionPct: effectiveRule.commonAreaFraction,
        rule: {
          components: FACTORS.filter((f) => effectiveRule.weights[f] > 0).map((basis) => ({ basis, weight: effectiveRule.weights[basis] })),
          buildingTotals: effectiveRule.totals,
        },
        vacantUnits: Array.from({ length: 3 }, () => ({ sqft: 900, occupants: 0, bedrooms: 2, units: 1 })),
        yourShare: own.share,
      })
    : null;
  const currentShare = own?.share ?? 1 / 24;
  const currentPool = conclusive ? result.consensusCents / 100 : 2160;
  const currentCharge = statement.utilityCents / 100;
  const currentFee = statement.feeCents / 100;
  const change = explainChange(
    { period: "October 2026", share: currentShare, pool: currentPool, charged: currentCharge, fee: currentFee },
    { period: "November 2026", share: currentShare, pool: currentPool + 240, charged: currentCharge + currentShare * 240 + 12.5, fee: currentFee + 1 },
  );
  const codeSource = JSON.stringify({ statement, rule: effectiveRule, cohort, result: conclusive ? { consensusCents: result.consensusCents, own } : null, formulaMode, shiftedVacancies });

  useEffect(() => {
    if (!complete || !conclusive || !own) {
      setCode("");
      setVerificationBundle("");
      return;
    }
    let current = true;
    const inputs = {
      version: 1,
      building: BUILDING.name,
      period: BUILDING.period,
      viewer: statement,
      rule: effectiveRule,
      consensusCents: result.consensusCents,
      own: { expectedCents: own.expectedCents, differenceCents: own.differenceCents, deviation: own.deviation },
      households: cohort.length,
      formulaMode,
      vacancyScenario: shiftedVacancies ? "shifted simulation" : "observed sample",
    };
    void (async () => {
      const cohortFingerprint = await reportCode(cohort);
      const snapshot = { ...inputs, cohortFingerprint };
      const nextCode = await reportCode(snapshot);
      if (current) {
        setCode(nextCode);
        setVerificationBundle(JSON.stringify({ code: nextCode, inputs: snapshot }, null, 2));
      }
    })();
    return () => { current = false; };
  // codeSource captures each input change while avoiding a fresh object dependency on every render.
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
    setErrors([]);
    setPage(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function invalidate() {
    setChecked(false);
    setUnlocked(false);
  }
  function updateField(key: keyof FieldValues, value: string) {
    setFields((previous) => ({ ...previous, [key]: value }));
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
      issues.push(
        "Enter a water charge greater than $0 and no more than $100,000, with up to two decimal places.",
      );
    if (!/^\d+(\.\d{1,2})?$/.test(fields.fee) || Number(fields.fee) > 1000)
      issues.push(
        "Enter a billing fee between $0 and $1,000, with up to two decimal places.",
      );
    if (
      !/^\d+$/.test(fields.sqft) ||
      Number(fields.sqft) < 1 ||
      Number(fields.sqft) > 100000
    )
      issues.push("Enter an apartment area from 1 to 100,000 square feet.");
    if (
      !/^\d+$/.test(fields.occupants) ||
      Number(fields.occupants) < 1 ||
      Number(fields.occupants) > 100
    )
      issues.push("Enter an occupant count from 1 to 100.");
    if (!/^\d+$/.test(fields.bedrooms) || Number(fields.bedrooms) > 100)
      issues.push("Enter a bedroom count from 0 to 100.");
    if (fields.period !== BUILDING.period)
      issues.push(
        "This demo compares October 2026 water statements only. A different month cannot be mixed into this room.",
      );
    if (issues.length) {
      setErrors(issues);
      return;
    }
    setStatement({
      ...YOUR_STATEMENT,
      factors: {
        sqft: Number(fields.sqft),
        occupants: Number(fields.occupants),
        bedrooms: Number(fields.bedrooms),
        units: 1,
      },
      utilityCents: Math.round(Number(fields.charge) * 100),
      feeCents: Math.round(Number(fields.fee) * 100),
      period: fields.period,
      evidence: source === "manual" ? "self-reported" : "document-attached",
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
      // Clear absent fields so values from a previous document cannot appear extracted.
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
      setNotice(
        "Text read locally. Review every field and add any missing values.",
      );
    } catch (error) {
      setErrors([
        error instanceof Error
          ? error.message
          : "This PDF could not be read. Enter your figures manually.",
      ]);
      setSource("manual");
    } finally {
      setLoading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  function loadSample() {
    setFields(INITIAL);
    setSource("sample");
    setDocumentName("Maple Court · October statement.pdf");
    setConfirmed(false);
    setErrors([]);
    invalidate();
    setNotice("Synthetic sample loaded. Confirm the figures below.");
  }
  function updateRule(next: Rule) {
    setRule(next);
    invalidate();
  }
  function continueFormula(event: React.FormEvent) {
    event.preventDefault();
    const issues = formulaMode === "disclosed" ? validateRule(rule) : [];
    if (!confirmed) issues.push("Confirm your statement before continuing.");
    if (issues.length) {
      setErrors(issues);
      return;
    }
    go("room");
  }
  function runCheck() {
    if (!confirmed) {
      go("statement");
      setNotice(
        "Confirm your statement first so the check uses reviewed figures.",
      );
      return;
    }
    if (formulaMode === "unknown" && detective.status !== "found") {
      setErrors([detective.status === "insufficient_data"
        ? "Formula Detective needs at least 4 participating households."
        : "No single formula can be inferred from this sample. Review the inputs or add a different mix of households."]);
      return;
    }
    setChecked(true);
    setErrors([]);
  }
  function reset() {
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
    setNotice("Demo reset. All changes from this session have been cleared.");
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Copied to clipboard.");
    } catch {
      setNotice(
        "Clipboard is unavailable. Select and copy the text shown in this window.",
      );
    }
  }
  const headerText: Record<Page, [string, string]> = {
    overview: [
      "Clarity for your shared bills.",
      "Your neighbours’ bills are the evidence.",
    ],
    statement: [
      "Let’s start with your statement.",
      "Review the numbers. Keep your documents private.",
    ],
    formula: [
      "One building. One formula.",
      "Use the allocation method disclosed in your utility addendum.",
    ],
    room: [
      "Better evidence, together.",
      "Compare the calculation. Keep your neighbours’ details private.",
    ],
    report: [
      "Your numbers. A clearer picture.",
      "A reproducible calculation and a practical next step.",
    ],
    verify: ["Verify a report code.", "Compare a shared snapshot with its fingerprint."],
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar no-print">
        <button
          className="wordmark"
          onClick={() => go("overview")}
          aria-label="Sharecheck overview"
        >
          <Brand />{" "}
          <span>
            SHARECHECK<span className="brand-period">.</span>
          </span>
        </button>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {NAV.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? "active" : ""}`}
              onClick={() => go(id)}
              aria-current={page === id ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={1.7} />
              <span>{name}</span>
              {id === "room" && (
                <span className="nav-count">{joined ? 6 : 1}</span>
              )}
              {id === "report" && complete && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note">
            <ShieldCheck size={23} />
            <strong>Your bill stays yours.</strong>
            <p>Only aggregate figures appear in your building room.</p>
          </div>
          <button className="subtle-button" onClick={() => setModal("method")}>
            <CircleHelp size={16} /> How the check works{" "}
            <ArrowUpRight size={14} />
          </button>
          <button className="subtle-button" onClick={reset}>
            <RotateCcw size={15} /> Reset demo
          </button>
          <div className="guest">
            <span className="avatar">D</span>
            <div>
              <strong>Demo guest</strong>
              <span>No account needed</span>
            </div>
            <LockKeyhole size={14} />
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar no-print">
          <div className="breadcrumbs">
            <Building2 size={16} />
            <span>Your building</span>
            <ChevronRight size={13} />
            <strong>Maple Court</strong>
          </div>
          <div className="topbar-right">
            <span className="demo-badge">
              <span /> DEMO WORKSPACE
            </span>
            <button
              className="icon-button"
              aria-label="About this demo"
              onClick={() => setModal("method")}
            >
              <CircleHelp size={19} />
            </button>
          </div>
        </header>
        <main id="main" className="main-content">
          <div className="page-heading no-print">
            <div>
              <div className="eyebrow">
                {page === "overview"
                  ? "A LITTLE TRANSPARENCY GOES A LONG WAY"
                  : `YOUR BUILDING CHECK / ${page.toUpperCase()}`}
              </div>
              <h1 ref={titleRef} tabIndex={-1}>
                {headerText[page][0]}
              </h1>
              <p>{headerText[page][1]}</p>
            </div>
            <span className="period">
              <span className="period-dot" /> October 2026
            </span>
          </div>
          {page !== "overview" && (
            <div className="stepper no-print" aria-label="Check progress">
              {(["statement", "formula", "room", "report"] as Page[]).map(
                (id, index) => (
                  <button
                    key={id}
                    onClick={() => go(id)}
                    className={page === id ? "current" : ""}
                    aria-current={page === id ? "step" : undefined}
                  >
                    <span>
                      {(id === "statement" && confirmed) ||
                      (id === "formula" &&
                        confirmed &&
                        ["room", "report"].includes(page)) ||
                      (id === "room" && complete) ? (
                        <Check size={13} />
                      ) : (
                        index + 1
                      )}
                    </span>
                    {
                      [
                        "Your statement",
                        "The formula",
                        "Building check",
                        "Your report",
                      ][index]
                    }
                  </button>
                ),
              )}
            </div>
          )}
          {errors.length > 0 && (
            <div className="error-box no-print" role="alert">
              <strong>A few details need a second look</strong>
              <ul>
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {page === "overview" && (
            <div className="overview no-print">
              <section className="hero-card">
                <div className="hero-copy">
                  <span className="pill light">
                    <Leaf size={13} /> MADE FOR RENTERS
                  </span>
                  <h2>
                    Is your water bill
                    <br />a fair share?
                  </h2>
                  <p>
                    You don’t need the landlord’s master bill to see whether
                    your building applies the same formula to everyone.
                  </p>
                  <button
                    className="button primary"
                    onClick={() => go("statement")}
                  >
                    Check my building <ArrowRight size={17} />
                  </button>
                  <div className="hero-footnote">
                    <Check size={13} /> Free demo <span>·</span> No sign-up{" "}
                    <span>·</span> About 2 minutes
                  </div>
                </div>
                <div className="hero-illustration">
                  <BuildingArt joined={joined} />
                  <span className="illustration-caption">
                    MAPLE COURT APARTMENTS <span>DEMO</span>
                  </span>
                </div>
              </section>
              <div className="section-title">
                <h2>Your building at a glance</h2>
                <button className="text-link" onClick={() => go("room")}>
                  Open building room <ArrowUpRight size={15} />
                </button>
              </div>
              <div className="stats-grid">
                <Stat
                  icon={Building2}
                  label="YOUR BUILDING"
                  value="Maple Court"
                  detail="24 apartments · synthetic demo"
                />
                <Stat
                  icon={Users}
                  label="HOUSEHOLDS PARTICIPATING"
                  value={
                    <>
                      {joined ? "6" : "1"} <small>/ 24</small>
                    </>
                  }
                  detail={
                    joined
                      ? "Enough households for a check"
                      : "At least 3 needed for a check"
                  }
                />
                <Stat
                  icon={FileCheck2}
                  label="OCTOBER CHECK"
                  value={
                    complete
                      ? result.status === "inconsistent"
                        ? "Needs a closer look"
                        : "Split is consistent"
                      : "Ready when you are"
                  }
                  detail={
                    complete
                      ? "View your calculation and next steps"
                      : "Start with your own statement"
                  }
                  compact
                />
              </div>
              <div className="feature-teasers" aria-label="Explore the demo features">
                <button onClick={() => go("formula")}><Search size={20} /><span><strong>Find the formula</strong><small>Even when it is missing</small></span><ArrowUpRight size={16} /></button>
                <button onClick={() => go("room")}><Building2 size={20} /><span><strong>Check vacant units</strong><small>See who may bear their share</small></span><ArrowUpRight size={16} /></button>
                <button onClick={() => go("room")}><History size={20} /><span><strong>Explain a change</strong><small>Follow each dollar</small></span><ArrowUpRight size={16} /></button>
              </div>
              <section className="history-strip">
                <div>
                  <History size={19} />
                  <div>
                    <h3>One check is a start.</h3>
                    <p>A clearer record, month after month.</p>
                  </div>
                </div>
                <div className="month-cell">
                  <span>OCT 2026</span>
                  <strong
                    className={
                      complete && result.status === "inconsistent"
                        ? "text-orange"
                        : ""
                    }
                  >
                    {complete
                      ? result.status === "inconsistent"
                        ? "Review flagged"
                        : "Consistent"
                      : "Ready to check"}
                  </strong>
                </div>
                <div className="month-cell muted">
                  <span>NOV 2026</span>
                  <strong>Sample scenario</strong>
                </div>
                <button
                  className="icon-button"
                  onClick={() => go(complete ? "report" : "statement")}
                  aria-label={
                    complete ? "Open October report" : "Start October check"
                  }
                >
                  <ArrowRight size={19} />
                </button>
              </section>
            </div>
          )}

          {page === "statement" && (
            <div className="two-column no-print">
              <form
                className="card form-card"
                onSubmit={confirmStatement}
                noValidate
              >
                <div className="card-heading">
                  <div>
                    <h2>Your October water statement</h2>
                    <p>
                      Use the sample or enter figures for this demo scenario.
                    </p>
                  </div>
                  <span className="pill">DEMO</span>
                </div>
                <div className="upload-area">
                  <Upload size={24} />
                  <strong>
                    {loading
                      ? "Reading PDF text…"
                      : "Read a PDF, right in your browser"}
                  </strong>
                  <p>Text PDFs up to 10 MB. Your file is never uploaded.</p>
                  <div className="button-row">
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() => fileInput.current?.click()}
                      disabled={loading}
                    >
                      Choose PDF <Plus size={15} />
                    </button>
                    <a
                      href="/samples/maple-court-statement.pdf"
                      download
                      className="text-link"
                    >
                      Download sample <Download size={14} />
                    </a>
                  </div>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="visually-hidden"
                    aria-label="Choose utility statement PDF"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void readFile(file);
                    }}
                  />
                </div>
                <div className="source-line">
                  <FileText size={16} />
                  <span>
                    {source === "manual"
                      ? "Manual entry · self-reported"
                      : documentName}
                  </span>
                  <button
                    type="button"
                    className="text-link"
                    onClick={loadSample}
                    disabled={loading}
                  >
                    Use sample
                  </button>
                </div>
                <div className="divider-label">REVIEW YOUR FIGURES</div>
                <div className="field-grid">
                  <Field
                    label="Water charge"
                    prefix="$"
                    value={fields.charge}
                    onChange={(v) => updateField("charge", v)}
                    hint="Utility charge only; exclude fees"
                  />
                  <Field
                    label="Separate billing fee"
                    prefix="$"
                    value={fields.fee}
                    onChange={(v) => updateField("fee", v)}
                  />
                  <Field
                    label="Apartment area"
                    suffix="sq ft"
                    value={fields.sqft}
                    onChange={(v) => updateField("sqft", v)}
                    step="1"
                  />
                  <Field
                    label="Occupants"
                    value={fields.occupants}
                    onChange={(v) => updateField("occupants", v)}
                    step="1"
                  />
                  <Field
                    label="Bedrooms"
                    value={fields.bedrooms}
                    onChange={(v) => updateField("bedrooms", v)}
                    step="1"
                  />
                  <label className="field">
                    <span>Billing month</span>
                    <input
                      type="month"
                      value={fields.period}
                      onChange={(e) => updateField("period", e.target.value)}
                      required
                    />
                  </label>
                </div>
                <div className="info-line">
                  <Info size={16} />
                  <span>
                    Text extraction is a convenience, not verification. Review
                    every field before continuing.
                  </span>
                </div>
                <div className="form-actions">
                  <span>
                    <LockKeyhole size={14} /> This session only
                  </span>
                  <button className="button primary" disabled={loading}>
                    Confirm figures <ArrowRight size={16} />
                  </button>
                </div>
              </form>
              <aside className="side-notes">
                <div className="note-block">
                  <span className="eyebrow">THE SAMPLE STATEMENT</span>
                  <div className="mini-statement">
                    <div className="mini-brand">
                      MAPLE COURT <span>DEMO</span>
                    </div>
                    <h3>Water statement</h3>
                    <p>Billing period: October 2026</p>
                    <dl>
                      <div>
                        <dt>Water charge</dt>
                        <dd>$112.50</dd>
                      </div>
                      <div>
                        <dt>Billing fee</dt>
                        <dd>$3.95</dd>
                      </div>
                      <div className="total">
                        <dt>Total billed</dt>
                        <dd>$116.45</dd>
                      </div>
                    </dl>
                    <div className="sample-stamp">
                      SYNTHETIC SAMPLE · NO REAL ACCOUNT
                    </div>
                  </div>
                </div>
                <div className="note-block">
                  <ShieldCheck size={24} />
                  <h3>No private details needed.</h3>
                  <p>
                    We use financial figures, apartment area, and occupant
                    counts. We don’t ask for your name or account number.
                  </p>
                  <p className="small-copy">
                    This demo keeps figures in memory and clears them on
                    refresh. Please use synthetic information.
                  </p>
                </div>
              </aside>
            </div>
          )}

          {page === "formula" && (
            <div className={`two-column no-print ${formulaMode === "unknown" ? "unknown-formula" : ""}`}>
              <form
                className="card form-card"
                onSubmit={continueFormula}
                noValidate
              >
                <div className="card-heading">
                  <div>
                    <h2>How is water allocated?</h2>
                    <p>Use the addendum, or let participating bills reveal a pattern.</p>
                  </div>
                  <Settings2 size={21} />
                </div>
                <div className="segmented-control" role="group" aria-label="Formula source">
                  <button type="button" className={formulaMode === "disclosed" ? "selected" : ""} aria-pressed={formulaMode === "disclosed"} onClick={() => { setFormulaMode("disclosed"); invalidate(); }}>Disclosed formula</button>
                  <button type="button" className={formulaMode === "unknown" ? "selected" : ""} aria-pressed={formulaMode === "unknown"} onClick={() => { setFormulaMode("unknown"); invalidate(); }}>I don’t have it</button>
                </div>
                {formulaMode === "unknown" && (
                  <FormulaInsight result={detective} compact={false} onAdd={() => go("room")} />
                )}
                {formulaMode === "disclosed" && (<>
                <div className="formula-preview">
                  <span className="eyebrow">
                    YOUR SHARE OF THE BUILDING POOL
                  </span>
                  <div>
                    {FACTORS.filter((f) => rule.weights[f] > 0).map(
                      (f, index) => (
                        <span key={f}>
                          {index > 0 && <b> + </b>}
                          {formatPercent(rule.weights[f], 0)} ×{" "}
                          <span className="fraction">
                            <span>your {factorNames[f].toLowerCase()}</span>
                            <span>building {factorNames[f].toLowerCase()}</span>
                          </span>
                        </span>
                      ),
                    )}
                  </div>
                </div>
                <div className="divider-label">
                  ALLOCATION WEIGHTS · MUST TOTAL 100%
                </div>
                <div className="field-grid">
                  {FACTORS.map((factor) => (
                    <Field
                      key={factor}
                      label={factorNames[factor]}
                      value={
                        Number.isFinite(rule.weights[factor])
                          ? String(
                              Math.round(rule.weights[factor] * 10000) / 100,
                            )
                          : ""
                      }
                      suffix="%"
                      onChange={(v) =>
                        updateRule({
                          ...rule,
                          weights: {
                            ...rule.weights,
                            [factor]: v === "" ? NaN : Number(v) / 100,
                          },
                        })
                      }
                    />
                  ))}
                </div>
                <div className="divider-label">BUILDING TOTALS</div>
                <div className="field-grid">
                  {FACTORS.map((factor) => (
                    <Field
                      key={factor}
                      label={`Total ${factorNames[factor].toLowerCase()}`}
                      readOnly={factor === "units"}
                      hint={
                        factor === "units"
                          ? "Fixed for the 24-unit demo building"
                          : undefined
                      }
                      value={
                        Number.isFinite(rule.totals[factor])
                          ? String(rule.totals[factor])
                          : ""
                      }
                      step="1"
                      onChange={(v) =>
                        updateRule({
                          ...rule,
                          totals: {
                            ...rule.totals,
                            [factor]: v === "" ? NaN : Number(v),
                          },
                        })
                      }
                    />
                  ))}
                </div>
                <div className="divider-label">DEDUCTIONS & FEES</div>
                <div className="field-grid">
                  <Field
                    label="Common-area deduction"
                    suffix="%"
                    value={
                      Number.isFinite(rule.commonAreaFraction)
                        ? String(
                            Math.round(rule.commonAreaFraction * 10000) / 100,
                          )
                        : ""
                    }
                    onChange={(v) =>
                      updateRule({
                        ...rule,
                        commonAreaFraction: v === "" ? NaN : Number(v) / 100,
                      })
                    }
                    hint="Used only when checking a master bill"
                  />
                  <Field
                    label="Disclosed billing fee"
                    prefix="$"
                    value={
                      Number.isFinite(rule.billingFeeCents)
                        ? String(rule.billingFeeCents / 100)
                        : ""
                    }
                    onChange={(v) =>
                      updateRule({
                        ...rule,
                        billingFeeCents:
                          v === "" ? NaN : Math.round(Number(v) * 100),
                      })
                    }
                  />
                </div>
                </>)}
                <div className="form-actions">
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => go("statement")}
                  >
                    Back to statement
                  </button>
                  <button className="button primary">
                    {formulaMode === "unknown" ? "Continue to neighbours" : "Continue to building"} <ArrowRight size={16} />
                  </button>
                </div>
              </form>
              {formulaMode === "disclosed" && <aside className="side-notes">
                <div className="note-block">
                  <span className="icon-tile">
                    <FileCheck2 size={23} />
                  </span>
                  <h3>Use the disclosed rule.</h3>
                  <p>
                    Allocation rules usually appear in your lease’s utility
                    addendum. SHARECHECK checks a formula’s application; it
                    doesn’t decide whether the formula is legally permitted.
                  </p>
                  <a
                    className="text-link"
                    href="/samples/maple-court-addendum.pdf"
                    download
                  >
                    View demo addendum <Download size={14} />
                  </a>
                </div>
                <div className="note-block tinted">
                  <h3>Why the totals matter</h3>
                  <p>
                    900 square feet is only a share once we know the building
                    has 21,600 square feet. Missing totals mean no reliable
                    verdict.
                  </p>
                  <p className="small-copy">
                    Changing the demo formula changes the calculation. The
                    seeded neighbours’ statements stay the same.
                  </p>
                </div>
                {!confirmed && (
                  <div className="note-block">
                    <Info size={20} />
                    <p>Confirm your statement before continuing.</p>
                    <button
                      className="text-link"
                      onClick={() => go("statement")}
                    >
                      Review statement <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </aside>}
            </div>
          )}

          {page === "room" && (
            <div className="room-page no-print">
              <div className="room-grid">
                <section className="card building-card">
                  <div className="card-heading">
                    <div>
                      <span className="eyebrow">YOUR BUILDING ROOM · DEMO</span>
                      <h2>Maple Court Apartments</h2>
                      <p>October 2026 · Water · 24 households</p>
                    </div>
                    <span className="icon-tile">
                      <Building2 size={22} />
                    </span>
                  </div>
                  <div className="participation">
                    <div className="avatar-stack">
                      {Array.from({ length: joined ? 6 : 1 }, (_, index) => (
                        <span key={index}>
                          <Home size={14} />
                        </span>
                      ))}
                      <span className="avatar-more">+{joined ? 18 : 23}</span>
                    </div>
                    <div>
                      <strong>{joined ? 6 : 1} of 24 households</strong>
                      <span>
                        {joined
                          ? "6 synthetic contributions in this demo"
                          : "Just your statement for now"}
                      </span>
                    </div>
                  </div>
                  <div className="participation-track">
                    <span
                      style={{ width: `${((joined ? 6 : 1) / 24) * 100}%` }}
                    />
                  </div>
                  <div className="building-footer">
                    <span>
                      <ShieldCheck size={15} /> Individual submissions stay
                      private
                    </span>
                    <button
                      className="text-link"
                      onClick={() => setModal("invite")}
                    >
                      Invite neighbours <ArrowUpRight size={14} />
                    </button>
                  </div>
                  {joined && (
                    <button
                      className="text-link withdraw-button"
                      onClick={() => {
                        setJoined(false);
                        setConsent(false);
                        invalidate();
                        setNotice(
                          "Demo participation withdrawn. Your private draft stays in this session; reset to clear all edits.",
                        );
                      }}
                    >
                      Withdraw demo participation
                    </button>
                  )}
                </section>
                <aside className="card own-summary">
                  <span className="eyebrow">YOUR CONFIRMED FIGURES</span>
                  <h3>
                    {formatMoney(statement.utilityCents)}{" "}
                    <span>water charge</span>
                  </h3>
                  <dl>
                    <div>
                      <dt>Your apartment</dt>
                      <dd>{statement.factors.sqft} sq ft</dd>
                    </div>
                    <div>
                      <dt>Occupants</dt>
                      <dd>{statement.factors.occupants}</dd>
                    </div>
                    <div>
                      <dt>Billing fee, separate</dt>
                      <dd>{formatMoney(statement.feeCents)}</dd>
                    </div>
                  </dl>
                  <button className="text-link" onClick={() => go("statement")}>
                    {confirmed ? "Edit statement" : "Confirm statement first"}{" "}
                    <ArrowUpRight size={14} />
                  </button>
                </aside>
              </div>
              {!joined && (
                <section className="card alone-card">
                  <span className="icon-tile">
                    <Users size={24} />
                  </span>
                  <div>
                    <span className="eyebrow">NOT ENOUGH DATA YET</span>
                    <h2>One statement can’t check a building.</h2>
                    <p>
                      We need at least 3 independent households to compare the
                      implied pool. You can invite neighbours or request the
                      master bill.
                    </p>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                      />
                      <span>
                        I agree to contribute my figures to this synthetic
                        building comparison. Individual rows remain private.
                      </span>
                    </label>
                    <div className="button-row">
                      <button
                        className="button primary"
                        disabled={!consent || !confirmed}
                        onClick={() => {
                          setJoined(true);
                          invalidate();
                          setNotice(
                            "Five synthetic neighbour contributions added. No real residents were contacted.",
                          );
                        }}
                      >
                        Add demo neighbours <Users size={16} />
                      </button>
                      <button
                        className="button secondary"
                        onClick={() => {
                          void copy(
                            "Dear property manager, please share the October 2026 master water bill, the common-area deduction, the disclosed allocation formula and building totals, and the inputs used for my account. Thank you.",
                          );
                        }}
                      >
                        Copy master bill request <Copy size={15} />
                      </button>
                    </div>
                  </div>
                </section>
              )}
              {joined && (
                <section className="card check-card">
                  <div className="section-title">
                    <div>
                      <span className="eyebrow">
                        BUILDING CONSISTENCY CHECK
                      </span>
                      <h2>Different apartments. The same building pool?</h2>
                    </div>
                    <span className="pill green">
                      <Check size={13} /> Minimum reached
                    </span>
                  </div>
                  <p>
                    Each statement points back to a building total. We compare
                    those totals using the median, then flag differences greater
                    than 2%.
                  </p>
                  <div className="evidence-strip">
                    <span>
                      <FileCheck2 size={18} />
                      <strong>
                        {conclusive
                          ? result.documentCount
                          : demoCohort(statement, joined).filter(
                              (s) => s.evidence === "document-attached",
                            ).length}
                      </strong>{" "}
                      document-backed demo entries
                    </span>
                    <span>
                      <FileText size={18} />
                      <strong>
                        {conclusive
                          ? result.selfReportedCount
                          : demoCohort(statement, joined).filter(
                              (s) => s.evidence === "self-reported",
                            ).length}
                      </strong>{" "}
                      self-reported
                    </span>
                    <button
                      className="text-link"
                      onClick={() => setModal("method")}
                    >
                      What this means <Info size={14} />
                    </button>
                  </div>
                  <label className="checkbox-label master-toggle">
                    <input
                      type="checkbox"
                      checked={master}
                      onChange={(e) => {
                        setMaster(e.target.checked);
                        invalidate();
                      }}
                    />
                    <span>
                      Include the demo master bill: <strong>$2,400.00</strong>{" "}
                      before common areas
                    </span>
                  </label>
                  <a
                    className="text-link"
                    href="/samples/maple-court-master-bill.pdf"
                    download
                  >
                    View sample master bill <Download size={14} />
                  </a>
                  <div className="form-actions">
                    <span className="small-copy">
                      Your neighbours’ statements are not displayed.
                    </span>
                    <button className="button primary" onClick={runCheck}>
                      {checked ? "Run check again" : "Run building check"}{" "}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </section>
              )}
              {checked && result.status === "insufficient" && (
                <div className="error-box" role="status">
                  <h3>Not enough reliable data for a verdict.</h3>
                  <ul>
                    {result.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  <button className="text-link" onClick={() => go("formula")}>
                    Review formula <ArrowRight size={15} />
                  </button>
                </div>
              )}
              {complete && own && conclusive && (
                <section
                  className={`result-card ${result.status === "consistent" ? "consistent" : ""}`}
                  role="status"
                >
                  <div className="result-top">
                    <span className="pill">
                      <span className="status-dot" />{" "}
                      {result.status === "inconsistent"
                        ? "INCONSISTENT BUILDING SPLIT"
                        : "CONSISTENT BUILDING SPLIT"}
                    </span>
                    <span className="small-copy">
                      6 households · October 2026 · DEMO
                    </span>
                  </div>
                  <div className="result-body">
                    <div>
                      <h2>
                        {own.flagged ? (
                          <>
                            Your charge is{" "}
                            {formatPercent(Math.abs(own.deviation), 0)}{" "}
                            {own.deviation > 0 ? "above" : "below"}
                            <br />
                            the building consensus.
                          </>
                        ) : (
                          <>
                            Your charge matches
                            <br />
                            the building consensus.
                          </>
                        )}
                      </h2>
                      <p>
                        {own.flagged
                          ? "The formula points to a different charge. Ask your manager to confirm the inputs used for your account."
                          : result.status === "inconsistent"
                            ? "Your own statement is within tolerance; the building comparison found a discrepancy in the sample."
                            : "The same disclosed formula appears to have been applied consistently across the sample."}
                      </p>
                    </div>
                    <div className="difference-metric">
                      <span>
                        {own.flagged
                          ? "YOUR ESTIMATED MONTHLY DIFFERENCE"
                          : "YOUR EXPECTED UTILITY CHARGE"}
                      </span>
                      <strong>
                        {formatMoney(
                          own.flagged
                            ? Math.abs(own.differenceCents)
                            : own.expectedCents,
                        )}
                      </strong>
                      <small>
                        {own.flagged && own.differenceCents > 0
                          ? `${formatMoney(own.differenceCents * 12)} a year if the difference continues`
                          : "Based on participating households, excluding fees"}
                      </small>
                    </div>
                  </div>
                  <div className="result-calculation">
                    <div>
                      <span>Your utility charge</span>
                      <strong>{formatMoney(statement.utilityCents)}</strong>
                    </div>
                    <ArrowRight size={18} />
                    <div>
                      <span>Expected from consensus</span>
                      <strong>{formatMoney(own.expectedCents)}</strong>
                    </div>
                    <ArrowRight size={18} />
                    <div>
                      <span>Median building pool</span>
                      <strong>{formatMoney(result.consensusCents)}</strong>
                    </div>
                  </div>
                  <div className="result-bottom">
                    <p>
                      <Info size={16} />{" "}
                      {result.masterCheck
                        ? result.masterCheck.matches
                          ? "The demo master bill also supports this building pool."
                          : "The demo master bill does not match the consensus pool. Review both."
                        : "The master bill is still needed to verify the building total."}
                    </p>
                    <button
                      className="button primary"
                      onClick={() => go("report")}
                    >
                      See your report <ArrowRight size={16} />
                    </button>
                  </div>
                </section>
              )}
              {joined && (
                <div className="insight-grid">
                  <FormulaInsight result={detective} compact onAdd={() => go("formula")} />
                  {complete && vacancy && own && (
                    <VacancyInsight
                      result={vacancy}
                      shifted={shiftedVacancies}
                      onToggle={() => setShiftedVacancies((value) => !value)}
                    />
                  )}
                </div>
              )}
              {complete && <ChangeInsight result={change} />}
              <section className="card next-month">
                <History size={21} />
                <div>
                  <h3>Your building’s story, month by month.</h3>
                  <p>
                    October:{" "}
                    {complete
                      ? result.status === "inconsistent"
                        ? "review flagged"
                        : "consistent split"
                      : "check pending"}{" "}
                    <span>·</span> November: sample scenario available below
                  </p>
                </div>
                <span className="pill">SYNTHETIC HISTORY</span>
              </section>
            </div>
          )}

          {page === "verify" && (
            <VerifyPage onCopy={copy} initialBundle={verificationBundle} />
          )}

          {page === "report" && !complete && (
            <div className="card empty-state no-print">
              <ClipboardCheck size={34} />
              <h2>A good report starts with enough evidence.</h2>
              <p>
                Confirm your statement, review the formula, and run the building
                check. There’s no paid report for an inconclusive result.
              </p>
              <button
                className="button primary"
                onClick={() => go(confirmed ? "room" : "statement")}
              >
                Continue your check <ArrowRight size={16} />
              </button>
            </div>
          )}
          {complete && own && conclusive && (
            <div className={page === "report" ? "" : "print-only"}>
              <AuditReport
                key={JSON.stringify({ statement, rule: effectiveRule, master, formulaMode, shiftedVacancies })}
                result={result}
                own={own}
                statement={statement}
                rule={effectiveRule}
                unlocked={unlocked}
                onUnlock={() => setModal("pricing")}
                onCopy={copy}
                formula={detective}
                vacancy={shiftedVacancies ? null : vacancy}
                reportCode={code}
                verificationBundle={verificationBundle}
                onVerify={() => go("verify")}
              />
            </div>
          )}
          <footer className="page-footer no-print">
            <span>
              <Brand small /> SHARECHECK
            </span>
            <p>
              Financial calculations and document organisation, not legal
              advice.
            </p>
            <span className="footer-demo">
              DEMO · Synthetic data · Resets on refresh
            </span>
          </footer>
        </main>
      </div>
      <div className="toast" role="status" aria-live="polite">
        {notice && (
          <span>
            <CheckCheck size={17} />
            {notice}
          </span>
        )}
      </div>
      {modal && (
        <ModalShell
          title={
            modal === "method"
              ? "A transparent check, with clear limits."
              : modal === "invite"
                ? "Evidence is better together."
                : "A clear result before a paid report."
          }
          onClose={() => setModal(null)}
        >
          {modal === "method" && (
            <div className="method-content">
              <span className="pill">ABOUT THIS DEMO</span>
              <h3>Every statement implies a building pool.</h3>
              <p>
                First, calculate each household’s weighted share. Divide its
                utility charge by that share, then take the median of those
                implied building pools. A difference greater than 2% is flagged.
              </p>
              <div className="method-equation">
                Utility charge ÷ allocation share = implied pool
              </div>
              <h3>Consistency is one piece of evidence.</h3>
              <p>
                We need at least 3 independent households with the same month,
                utility, building, and formula. An evenly inflated building pool
                can pass this check. A master bill is needed to check the actual
                total. If half or more of the entries are wrong, the median can
                be misleading.
              </p>
              <h3>Documents are supporting evidence, not verification.</h3>
              <p>
                “Document-backed” means a synthetic sample document supports the
                fixture, or a PDF was read locally. It does not mean the
                contents have been independently authenticated. Editing a figure
                marks your entry as self-reported.
              </p>
              <h3>Your privacy in this prototype</h3>
              <p>
                Files are processed in your browser. No files or figures are
                sent to a server or saved to browser storage. Only your row and
                aggregate results appear. Reset or refresh to erase this
                session. Live multi-user rooms, identity checks, and private
                document storage belong to the pilot phase.
              </p>
            </div>
          )}
          {modal === "invite" && (
            <div className="method-content">
              <span className="icon-tile">
                <Users size={25} />
              </span>
              <p>
                Invite at least two neighbours to compare the same month’s
                shared water allocation.
              </p>
              <label className="field">
                <span>Demo room link</span>
                <input
                  readOnly
                  value={
                    typeof window === "undefined"
                      ? ""
                      : `${window.location.origin}/#demo-room`
                  }
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <button
                className="button primary"
                onClick={() =>
                  void copy(`${window.location.origin}/#demo-room`)
                }
              >
                Copy demo link <Copy size={16} />
              </button>
              <div className="info-line">
                <Info size={17} />
                <span>
                  This shares the demo app. Each visitor gets an independent
                  synthetic session; it is not a live shared room.
                </span>
              </div>
              <p className="small-copy">
                The prototype never sends emails or contacts residents.
              </p>
            </div>
          )}
          {modal === "pricing" && (
            <div className="method-content">
              <span className="pill">MOCK CHECKOUT · NO PAYMENT</span>
              <p>
                Basic results and contributions stay free. A full report is
                offered only after a conclusive building check.
              </p>
              <div className="pricing-grid">
                <div className="price-card selected">
                  <span>BUILDING REPORT</span>
                  <strong>
                    $9.99<small> one time</small>
                  </strong>
                  <p>
                    Calculation trail, evidence summary, printable report, and a
                    manager letter.
                  </p>
                </div>
                <div className="price-card">
                  <span>LEASE PASS</span>
                  <strong>
                    $29<small> / 12 months</small>
                  </strong>
                  <p>
                    Proposed monthly re-checks, history, and alerts. Pilot
                    feature.
                  </p>
                </div>
              </div>
              <button
                className="button primary full"
                onClick={() => {
                  setUnlocked(true);
                  setModal(null);
                  setNotice(
                    "Demo report unlocked for free. No payment was taken.",
                  );
                }}
              >
                Unlock report — free in demo <ArrowRight size={17} />
              </button>
              <p className="small-copy">
                Pricing is a hypothesis to test. This demo has no billing or
                subscription service.
              </p>
            </div>
          )}
        </ModalShell>
      )}
    </div>
  );
}

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <svg
      width={small ? 17 : 26}
      height={small ? 17 : 26}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="10" height="10" rx="2" fill="currentColor" />
      <rect x="16" y="2" width="10" height="10" rx="2" fill="currentColor" />
      <rect x="2" y="16" width="10" height="10" rx="2" fill="currentColor" />
      <path
        d="m16 21 4 4 7-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function Stat({
  icon: Icon,
  label,
  value,
  detail,
  compact,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  detail: string;
  compact?: boolean;
}) {
  return (
    <section className="card stat-card">
      <div>
        <span className="label">{label}</span>
        <Icon size={18} strokeWidth={1.5} />
      </div>
      <strong className={compact ? "compact-value" : ""}>{value}</strong>
      <p>
        <span className="stat-dot" />
        {detail}
      </p>
    </section>
  );
}
function HowStep({
  number,
  icon: Icon,
  title,
  text,
}: {
  number: string;
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="how-step">
      <div>
        <span className="icon-tile">
          <Icon size={21} strokeWidth={1.6} />
        </span>
        <span className="step-number">{number}</span>
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
  readOnly = false,
  step = "0.01",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
  hint?: string;
  readOnly?: boolean;
  step?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="input-wrap">
        {prefix && <span>{prefix}</span>}
        <input
          type="number"
          min="0"
          step={step}
          value={value}
          readOnly={readOnly}
          onChange={(event) => onChange(event.target.value)}
          required
          inputMode={step === "1" ? "numeric" : "decimal"}
        />
        {suffix && <span>{suffix}</span>}
      </div>
      {hint && <small>{hint}</small>}
    </label>
  );
}
function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="modal-title"
    >
      <div className="modal-header">
        <h2 id="modal-title">{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
