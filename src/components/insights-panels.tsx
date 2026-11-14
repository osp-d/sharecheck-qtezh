"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Copy, Fingerprint, History, Search, Sparkles } from "lucide-react";
import { reportCode, type DetectiveResult, type VacancyCheckResult, type ChangeResult } from "@/lib/insights";

const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const signed = (n: number) => `${n < 0 ? "−" : "+"}${money(Math.abs(n))}`;

export function FormulaInsight({ result, compact, onAdd }: { result: DetectiveResult; compact: boolean; onAdd: () => void }) {
  return <section className={`insight-card ${compact ? "" : "in-form"}`}>
    <div className="insight-kicker"><Search size={17} /> FORMULA DETECTIVE <span>F1</span></div>
    {result.status === "found" ? <>
      <h3>We found a likely formula.</h3>
      <div className="insight-equation">
        {result.best.bases.map((basis, i) => <span key={basis}>{i > 0 && <em> + </em>}{money(result.best.rates[basis])} <small>per {basis === "sqft" ? "sq ft" : basis === "units" ? "unit" : basis.slice(0, -1)}</small></span>)}
      </div>
      <div className="insight-footer"><span><Check size={15} /> {result.best.inliers.length} of {result.best.inliers.length + result.best.outliers.length} households match</span><span>{result.best.outliers.length} flagged</span></div>
      {result.best.outliers.some((o) => o.id === "r4") && <p className="insight-note">Your charge is {money(result.best.outliers.find((o) => o.id === "r4")!.excessPerMonth)} above this pattern.</p>}
    </> : result.status === "insufficient_data" ? <>
      <h3>Need more neighbours</h3>
      <p>At least 4 households are needed to infer a formula. {result.contributors} available now.</p>
      <button type="button" className="text-link" onClick={onAdd}>Open building room <ArrowRight size={15} /></button>
    </> : result.status === "ambiguous" ? <>
      <h3>Several formulas fit.</h3>
      <p>The current mix of apartments does not distinguish them. Add different household types before drawing a conclusion.</p>
    </> : <>
      <h3>No reliable formula found.</h3>
      <p>Review the figures or add more varied households.</p>
    </>}
    <p className="insight-footnote">Pattern from shared charges, not proof of the lease rule.</p>
  </section>;
}

export function VacancyInsight({ result, shifted, onToggle }: { result: VacancyCheckResult; shifted: boolean; onToggle: () => void }) {
  return <section className="insight-card">
    <div className="insight-kicker"><Sparkles size={17} /> VACANCY SHIFT CHECK <span>F2</span></div>
    <h3>{result.finding === "landlord_absorbs_vacancies" ? "Landlord appears to absorb vacancies." : result.finding === "vacancies_billed_to_residents" ? "Pattern is consistent with shifting vacancies." : "The pool needs an explanation."}</h3>
    <div className="insight-metrics"><div><small>Vacant share</small><strong>{result.vacantSharePct.toFixed(2)}%</strong></div><div><small>{shifted ? "Simulated pool" : "Observed pool"}</small><strong>{money(result.consensusPool)}</strong></div></div>
    {shifted && <p className="insight-note">{money(result.extraBilledToResidentsPerMonth)} is the vacant share of the eligible pool. The simulated pool exceeds it by {money(result.consensusPool - result.eligiblePool)}; your modeled difference is {money(result.yourExtraPerMonth ?? 0)}.</p>}
    <div className="insight-footer"><span>3 vacant demo apartments · $2,400 master bill</span><button type="button" className="text-link" onClick={onToggle}>{shifted ? "Show observed sample" : "Simulate shifted vacancies"} <ArrowRight size={14} /></button></div>
    <p className="insight-footnote">The shifted view is a what-if scenario, not a finding about this building. Confirm vacancy inputs and the lease before using this outside the demo.</p>
  </section>;
}

export function ChangeInsight({ result }: { result: ChangeResult }) {
  const rows = [
    ["Building bill", result.parts.buildingBill],
    ["Your share", result.parts.yourShare],
    ["Billing fee", result.parts.fee],
    ["Off-formula change", result.parts.offFormula],
  ] as const;
  return <section className="insight-card change-insight">
    <div className="insight-kicker"><History size={17} /> WHY DID MY BILL CHANGE? <span>F3</span></div>
    <div className="change-head"><div><h3>October → November</h3><p>Synthetic two-month example</p></div><strong>{signed(result.totalChange)}</strong></div>
    <div className="change-parts">{rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{signed(value)}</strong></div>)}</div>
    <p className="insight-footnote">The four parts reconcile to the cent. November is an illustrative statement, separate from your October check.</p>
  </section>;
}

export function VerifyPage({ initialBundle, onCopy }: { initialBundle: string; onCopy: (text: string) => Promise<void> }) {
  const [bundle, setBundle] = useState(initialBundle);
  const [message, setMessage] = useState("");
  useEffect(() => { if (initialBundle) setBundle(initialBundle); }, [initialBundle]);
  async function verify() {
    try {
      const parsed: unknown = JSON.parse(bundle);
      if (!parsed || typeof parsed !== "object" || !("code" in parsed) || !("inputs" in parsed) || typeof parsed.code !== "string" || !/^SC-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(parsed.code)) throw new Error("Paste a SHARECHECK verification bundle.");
      const computed = await reportCode(parsed.inputs);
      setMessage(computed === parsed.code ? "Match. This snapshot has the stated report code." : `Does not match. These inputs produce ${computed}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read the verification bundle.");
    }
  }
  return <section className="card verify-card">
    <div className="insight-kicker"><Fingerprint size={18} /> REPORT VERIFICATION <span>F5</span></div>
    <h2>Check a shared snapshot.</h2>
    <p>Paste the JSON bundle from a report. Changing any included figure changes its code.</p>
    <label htmlFor="verification-bundle">Verification bundle</label>
    <textarea id="verification-bundle" value={bundle} onChange={(event) => { setBundle(event.target.value); setMessage(""); }} rows={13} spellCheck={false} placeholder='{ "code": "SC-…", "inputs": { … } }' />
    <div className="button-row"><button className="button primary" type="button" onClick={() => void verify()}>Verify code <ArrowRight size={16} /></button><button className="button secondary" type="button" onClick={() => void onCopy(bundle)} disabled={!bundle}>Copy bundle <Copy size={15} /></button></div>
    {message && <p className="verify-result" role="status">{message}</p>}
    <p className="insight-footnote">A match confirms that this snapshot hashes to the code. It does not authenticate statements or reveal private neighbour rows.</p>
  </section>;
}
