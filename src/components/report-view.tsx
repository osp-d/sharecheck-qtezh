"use client";

import { useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  FileCheck2,
  FileText,
  Info,
  LockKeyhole,
  Printer,
  ShieldCheck,
} from "lucide-react";
import {
  FACTORS,
  formatMoney,
  formatPercent,
  type AuditResult,
  type ResidentResult,
  type Rule,
  type Statement,
} from "@/lib/audit";
import { managerLetter } from "@/lib/report";
import { buildingLetter, type DetectiveResult, type VacancyCheckResult } from "@/lib/insights";

type ConclusiveResult = Exclude<AuditResult, { status: "insufficient" }>;

export function AuditReport({
  result,
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
  const [letter, setLetter] = useState(() =>
    managerLetter(statement, own, rule, result.consensusCents),
  );
  const [collectiveLetter, setCollectiveLetter] = useState("");
  const [letterType, setLetterType] = useState<"personal" | "collective">("personal");
  const activeLetter = letterType === "personal" ? letter : collectiveLetter;
  function showCollectiveLetter() {
    if (!collectiveLetter) {
      setCollectiveLetter(buildingLetter({
        buildingName: "Maple Court Apartments (DEMO)",
        period: "October 2026",
        households: result.residents.length,
        flaggedCount: result.residents.filter((r) => r.flagged).length,
        consensusPool: result.consensusCents / 100,
        formula: formula.status === "found" ? { bases: formula.best.bases, rates: formula.best.rates } : null,
        vacancy,
        reportCode,
      }));
    }
    setLetterType("collective");
  }
  function downloadLetter() {
    const url = URL.createObjectURL(
      new Blob([activeLetter], { type: "text/plain;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = letterType === "personal" ? "sharecheck-personal-letter.txt" : "sharecheck-building-letter.txt";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <article className={`report ${unlocked ? "unlocked" : "locked"}`}>
      <div className="report-title-row">
        <div>
          <span className="eyebrow">SHARECHECK / BUILDING REPORT / DEMO</span>
          <h2>Maple Court · October 2026</h2>
          <p>Water allocation · Synthetic data · {reportCode || "Calculating report code…"}</p>
        </div>
        {unlocked ? (
          <button
            className="button primary no-print"
            onClick={() => window.print()}
          >
            Save as PDF <Printer size={16} />
          </button>
        ) : (
          <span className="pill no-print">BASIC RESULT · FREE</span>
        )}
      </div>
      <section className={`report-summary ${own.flagged ? "flagged" : ""}`}>
        <span className="pill">
          {result.status === "inconsistent"
            ? "INCONSISTENT BUILDING SPLIT"
            : "CONSISTENT BUILDING SPLIT"}
        </span>
        <h3>
          {own.flagged
            ? `Your statement is ${formatPercent(Math.abs(own.deviation), 0)} ${own.deviation > 0 ? "above" : "below"} consensus.`
            : "Your statement is within the 2% tolerance."}
        </h3>
        <p>
          {own.flagged
            ? "This is a discrepancy to investigate, not a determination that money is owed."
            : "The allocation appears consistent for your statement. The actual building cost still needs supporting evidence."}
        </p>
        <div className="report-metrics">
          <div>
            <span>Billed, excluding fee</span>
            <strong>{formatMoney(statement.utilityCents)}</strong>
          </div>
          <ArrowRight size={18} />
          <div>
            <span>Expected from consensus</span>
            <strong>{formatMoney(own.expectedCents)}</strong>
          </div>
          <ArrowRight size={18} />
          <div>
            <span>
              {own.differenceCents >= 0 ? "Above consensus" : "Below consensus"}
            </span>
            <strong>
              {formatMoney(Math.abs(own.differenceCents))}
              <small> / month</small>
            </strong>
          </div>
        </div>
      </section>
      <section className="report-code-card no-print">
        <div><span className="eyebrow">REPRODUCIBLE SNAPSHOT</span><strong>{reportCode || "Calculating…"}</strong><small>Changes to included inputs create a different code.</small></div>
        <div className="button-row"><button className="button secondary small" disabled={!verificationBundle} onClick={() => void onCopy(verificationBundle)}>Copy verification bundle <Copy size={15} /></button><button className="text-link" onClick={onVerify}>Verify code <ArrowRight size={15} /></button></div>
      </section>
      {!unlocked && (
        <section className="card unlock-card no-print">
          <span className="icon-tile">
            <LockKeyhole size={23} />
          </span>
          <div>
            <span className="eyebrow">TAKE THE NEXT STEP WITH THE NUMBERS</span>
            <h3>From a result to a useful conversation.</h3>
            <p>
              Unlock the full calculation trail, evidence summary, printable
              report, and an editable letter to your manager.
            </p>
            <div className="button-row">
              <button className="button primary" onClick={onUnlock}>
                Unlock full report <ArrowRight size={16} />
              </button>
              <span className="small-copy">
                $9.99 proposed price · free in demo
              </span>
            </div>
          </div>
        </section>
      )}
      {unlocked && (
        <div className="report-details">
          <section className="card trail-card">
            <div className="section-title">
              <h3>Your calculation trail</h3>
              <span className="pill">
                <Check size={13} /> REPRODUCIBLE
              </span>
            </div>
            <p className="small-copy">
              Only your own household’s inputs are shown. Ratios are calculated
              before rounding amounts to cents.
            </p>
            <div className="calculation-steps">
              <div>
                <span className="circle-number">1</span>
                <div>
                  <h4>Calculate your allocation share</h4>
                  {FACTORS.filter((factor) => rule.weights[factor] > 0).map(
                    (factor) => (
                      <p className="mono" key={factor}>
                        {formatPercent(rule.weights[factor], 0)} × (
                        {statement.factors[factor].toLocaleString("en-US")} ÷{" "}
                        {rule.totals[factor].toLocaleString("en-US")}){" "}
                        <span className="small-copy">{factor}</span>
                      </p>
                    ),
                  )}
                  <strong className="calculation-answer">
                    Combined share = {formatPercent(own.share, 4)}
                  </strong>
                </div>
              </div>
              <div>
                <span className="circle-number">2</span>
                <div>
                  <h4>Work backwards to the implied pool</h4>
                  <p className="mono">
                    {formatMoney(statement.utilityCents)} ÷{" "}
                    {own.share.toFixed(8)} ≈ {formatMoney(own.impliedPoolCents)}
                  </p>
                  <p className="small-copy">
                    The building total implied by your statement.
                  </p>
                </div>
              </div>
              <div>
                <span className="circle-number">3</span>
                <div>
                  <h4>Compare with the building median</h4>
                  <p className="mono">
                    Median of 6 implied pools ={" "}
                    {formatMoney(result.consensusCents)}
                  </p>
                  <p className="small-copy">
                    Your implied pool differs by{" "}
                    {formatPercent(Math.abs(own.deviation))}. Differences
                    greater than 2% are flagged.
                  </p>
                </div>
              </div>
              <div>
                <span className="circle-number">4</span>
                <div>
                  <h4>Estimate your charge under the consensus</h4>
                  <p className="mono">
                    {own.share.toFixed(8)} ×{" "}
                    {formatMoney(result.consensusCents)} ≈{" "}
                    {formatMoney(own.expectedCents)}
                  </p>
                  <strong className="calculation-answer">
                    Your charge − expected ={" "}
                    {own.differenceCents < 0 ? "−" : ""}
                    {formatMoney(Math.abs(own.differenceCents))}
                  </strong>
                </div>
              </div>
            </div>
            <div className="info-line">
              <Info size={16} />
              <span>
                The separate {formatMoney(statement.feeCents)} fee is excluded
                from this comparison.
                {statement.feeCents !== rule.billingFeeCents
                  ? ` It differs from the disclosed ${formatMoney(rule.billingFeeCents)} fee; ask the manager to explain.`
                  : " This check does not establish whether the fee is permitted."}
              </span>
            </div>
          </section>
          <div className="report-evidence-grid">
            <section className="card evidence-detail">
              <FileCheck2 size={22} />
              <h3>What supports this result</h3>
              <dl>
                <div>
                  <dt>Synthetic document-backed entries</dt>
                  <dd>{result.documentCount}</dd>
                </div>
                <div>
                  <dt>Self-reported entries</dt>
                  <dd>{result.selfReportedCount}</dd>
                </div>
                <div>
                  <dt>Same building, month, utility</dt>
                  <dd>Yes</dd>
                </div>
                <div>
                  <dt>Master bill included</dt>
                  <dd>{result.masterCheck ? "Demo bill" : "No"}</dd>
                </div>
              </dl>
              <p className="small-copy">
                Evidence labels describe the synthetic fixtures or local input
                method. Documents are not independently authenticated.
              </p>
            </section>
            <section className="card evidence-detail">
              <ShieldCheck size={22} />
              <h3>
                {result.masterCheck
                  ? "Master bill cross-check"
                  : "What remains unverified"}
              </h3>
              {result.masterCheck ? (
                <>
                  <p>
                    {formatMoney(240000)} × (1 −{" "}
                    {formatPercent(rule.commonAreaFraction, 0)}) ={" "}
                    <strong>{formatMoney(result.masterCheck.poolCents)}</strong>
                  </p>
                  <p>
                    {result.masterCheck.matches
                      ? "The adjusted demo master bill matches the consensus within 2%."
                      : `The consensus differs from the adjusted demo master bill by ${formatPercent(Math.abs(result.masterCheck.deviation))}. Review the pool and deduction.`}
                  </p>
                </>
              ) : (
                <p>
                  The actual building cost and common-area deduction need the
                  master bill. A consistently inflated pool can pass the
                  neighbour check.
                </p>
              )}
              <p className="small-copy">
                The median assumes a majority of entries are reliable. Building
                totals, occupant counts, and the disclosed formula still need
                confirmation.
              </p>
            </section>
          </div>
          <section className="card letter-card">
            <div className="section-title">
              <div>
                <span className="eyebrow">A PRACTICAL NEXT STEP</span>
                <h3>Request the missing pieces.</h3>
              </div>
              <FileText size={21} />
            </div>
            <div className="segmented-control no-print" role="group" aria-label="Letter type">
              <button type="button" className={letterType === "personal" ? "selected" : ""} aria-pressed={letterType === "personal"} onClick={() => setLetterType("personal")}>Personal letter</button>
              <button type="button" className={letterType === "collective" ? "selected" : ""} aria-pressed={letterType === "collective"} onClick={showCollectiveLetter} disabled={result.residents.length < 3 || !reportCode}>Building letter</button>
            </div>
            <p className="small-copy no-print">
              {letterType === "collective" ? `${result.residents.length} participating households · no names or apartment numbers` : "Your own statement only"}. Edit before copying or printing. Nothing is sent.
            </p>
            <label className="visually-hidden" htmlFor="manager-letter">
              Editable request to property manager
            </label>
            <textarea
              id="manager-letter"
              className="letter-editor no-print"
              value={activeLetter}
              onChange={(event) => letterType === "personal" ? setLetter(event.target.value) : setCollectiveLetter(event.target.value)}
              rows={18}
              spellCheck
            />
            <div className="printed-letter print-only">{activeLetter}</div>
            <div className="letter-actions no-print">
              <button
                className="button secondary"
                onClick={() => void onCopy(activeLetter)}
              >
                Copy letter <Copy size={15} />
              </button>
              <button className="text-link" onClick={downloadLetter}>
                Download text <Download size={15} />
              </button>
            </div>
          </section>
          <div className="report-disclaimer">
            <Info size={17} />
            <p>
              SHARECHECK provides financial calculations and document
              organisation, not legal advice. This report uses synthetic demo
              data. A discrepancy is an estimate to investigate, not proof of
              unlawful billing or a guaranteed refund.
            </p>
          </div>
          <div className="report-print-actions no-print">
            <span>
              Tip: choose “Save as PDF” in your browser’s print dialog.
            </span>
            <button className="button primary" onClick={() => window.print()}>
              Save report as PDF <Printer size={16} />
            </button>
          </div>
        </div>
      )}
      {!unlocked && (
        <p className="print-only">
          This is the free basic result. Unlock the demo report to include its
          calculation trail, evidence summary, and manager letter.
        </p>
      )}
    </article>
  );
}
