// SHARECHECK insights: original features layered on the building check.
// Self-contained (no imports) so it can sit beside the existing src/lib/audit.ts.
// Pure functions only: every result is reproducible from its inputs.

export type Basis = "sqft" | "occupants" | "bedrooms" | "units";
export type UnitAttrs = Record<Basis, number>; // units = 1 for every apartment

export interface Observation {
  id: string; // anonymous id
  unit: UnitAttrs;
  utilityCharge: number; // allocated utility amount, excluding the flat billing fee
}

const round2 = (x: number) => Math.round(x * 100) / 100;

// ---------------------------------------------------------------------------
// F1. Formula Detective: infer an undisclosed formula from neighbours' bills.
// Fits charge = Σ rate_b × attribute_b (no building totals needed) for each
// candidate formula, drops off-formula outliers, and picks the simplest
// formula that explains the most households.
// ---------------------------------------------------------------------------

export const CANDIDATE_FORMULAS: Basis[][] = [
  ["units"], // equal split
  ["sqft"],
  ["occupants"],
  ["bedrooms"],
  ["sqft", "occupants"],
  ["bedrooms", "occupants"],
  ["sqft", "bedrooms"],
];

export const FIT_TOLERANCE = 0.02; // a 2% miss counts as off-formula

/** Least squares with no intercept for 1 or 2 bases. Returns null if singular. */
function fit(obs: Observation[], bases: Basis[]): number[] | null {
  if (bases.length === 1) {
    const [b] = bases;
    const xx = obs.reduce((s, o) => s + o.unit[b] ** 2, 0);
    if (xx === 0) return null;
    return [obs.reduce((s, o) => s + o.unit[b] * o.utilityCharge, 0) / xx];
  }
  const [a, b] = bases;
  let saa = 0,
    sab = 0,
    sbb = 0,
    say = 0,
    sby = 0;
  for (const o of obs) {
    const xa = o.unit[a],
      xb = o.unit[b],
      y = o.utilityCharge;
    saa += xa * xa;
    sab += xa * xb;
    sbb += xb * xb;
    say += xa * y;
    sby += xb * y;
  }
  const det = saa * sbb - sab * sab;
  if (Math.abs(det) < 1e-9 * Math.max(1, saa * sbb)) return null; // bases move together: not identifiable
  return [(say * sbb - sby * sab) / det, (sby * saa - say * sab) / det];
}

const predict = (o: Observation, bases: Basis[], rates: number[]) =>
  bases.reduce((s, b, i) => s + rates[i] * o.unit[b], 0);

const relativeError = (o: Observation, bases: Basis[], rates: number[]) => {
  const expected = predict(o, bases, rates);
  return expected > 0
    ? Math.abs(o.utilityCharge - expected) / expected
    : Infinity;
};

export interface FormulaFit {
  bases: Basis[];
  rates: Record<string, number>; // e.g. { sqft: 0.05, occupants: 22.5 } = $ per sq ft, $ per occupant
  inliers: string[];
  outliers: {
    id: string;
    billed: number;
    expected: number;
    excessPerMonth: number;
    deviationPct: number;
  }[];
  maxInlierErrorPct: number;
}

function fitRobust(obs: Observation[], bases: Basis[]): FormulaFit | null {
  const k = bases.length;
  let kept = [...obs];
  const removed: Observation[] = [];
  let rates = fit(kept, bases);
  // Remove the worst point while it misses by more than the tolerance, keeping
  // at least k + 2 households and never removing half or more of them.
  while (rates) {
    const errs = kept.map((o) => relativeError(o, bases, rates!));
    const worst = errs.indexOf(Math.max(...errs));
    if (errs[worst] <= FIT_TOLERANCE) break;
    if (kept.length - 1 < k + 2 || removed.length + 1 >= obs.length / 2)
      return null;
    removed.push(kept.splice(worst, 1)[0]);
    rates = fit(kept, bases);
  }
  if (!rates || rates.some((r) => r < 0) || kept.length < k + 2) return null;
  const errs = kept.map((o) => relativeError(o, bases, rates!));
  return {
    bases,
    rates: Object.fromEntries(
      bases.map((b, i) => [b, Math.round(rates![i] * 1000000) / 1000000]),
    ),
    inliers: kept.map((o) => o.id),
    outliers: removed.map((o) => {
      const expected = predict(o, bases, rates!);
      return {
        id: o.id,
        billed: o.utilityCharge,
        expected: round2(expected),
        excessPerMonth: round2(o.utilityCharge - expected),
        deviationPct: round2(((o.utilityCharge - expected) / expected) * 100),
      };
    }),
    maxInlierErrorPct: round2(Math.max(...errs) * 100),
  };
}

export type DetectiveResult =
  | { status: "found"; best: FormulaFit; alternatives: number }
  | { status: "ambiguous"; candidates: FormulaFit[] }
  | { status: "insufficient_data"; contributors: number; needed: number }
  | { status: "no_formula_fits" };

/**
 * Needs at least 4 households (a 2-factor formula plus 2 checks).
 * "ambiguous" = two different formulas explain the same households equally
 * well (e.g. every flat has sq ft proportional to occupants): ask for more neighbours.
 */
export function detectFormula(obs: Observation[]): DetectiveResult {
  if (obs.length < 4)
    return { status: "insufficient_data", contributors: obs.length, needed: 4 };
  const fits = CANDIDATE_FORMULAS.map((b) => fitRobust(obs, b)).filter(
    (f): f is FormulaFit => f !== null,
  );
  if (!fits.length) return { status: "no_formula_fits" };
  const most = Math.max(...fits.map((f) => f.inliers.length));
  const top = fits
    .filter((f) => f.inliers.length === most)
    .sort(
      (x, y) =>
        x.bases.length - y.bases.length ||
        x.maxInlierErrorPct - y.maxInlierErrorPct,
    );
  const simplest = top.filter((f) => f.bases.length === top[0].bases.length);
  if (simplest.length > 1) return { status: "ambiguous", candidates: simplest };
  return { status: "found", best: top[0], alternatives: top.length - 1 };
}

/** Converts fitted rates into the lease-style split, when building totals are known. */
export function ratesToWeights(
  rates: Record<string, number>,
  buildingTotals: Partial<UnitAttrs>,
) {
  const parts = Object.entries(rates).map(
    ([b, r]) => [b, r * (buildingTotals[b as Basis] ?? NaN)] as const,
  );
  const pool = parts.reduce((s, [, v]) => s + v, 0);
  if (!Number.isFinite(pool) || pool <= 0) return null;
  return {
    impliedPool: round2(pool),
    // Keep full precision for downstream allocation checks; round only in the UI.
    weights: Object.fromEntries(parts.map(([b, v]) => [b, v / pool])),
  };
}

// ---------------------------------------------------------------------------
// F2. Vacancy Shift Check: are empty apartments' shares billed to residents?
// If the landlord splits the bill over occupied apartments only, every
// resident's implied pool is the eligible pool ÷ (1 − vacant share).
// ---------------------------------------------------------------------------

export interface WeightedRule {
  components: { basis: Basis; weight: number }[];
  buildingTotals: UnitAttrs; // all apartments, occupied or not, as disclosed
}

export function vacantShare(
  rule: WeightedRule,
  vacantUnits: UnitAttrs[],
): number {
  return rule.components.reduce((s, c) => {
    const vac = vacantUnits.reduce((t, u) => t + u[c.basis], 0);
    return s + c.weight * (vac / rule.buildingTotals[c.basis]);
  }, 0);
}

export function vacancyCheck(args: {
  consensusPool: number; // from the building check
  masterBill: number;
  commonAreaDeductionPct: number;
  rule: WeightedRule;
  vacantUnits: UnitAttrs[];
  yourShare?: number; // the viewer's share under the disclosed formula
}) {
  const eligible = round2(args.masterBill * (1 - args.commonAreaDeductionPct));
  const v = vacantShare(args.rule, args.vacantUnits);
  if (
    !Number.isFinite(eligible) ||
    eligible <= 0 ||
    !Number.isFinite(args.consensusPool) ||
    args.consensusPool <= 0 ||
    !Number.isFinite(v) ||
    v < 0 ||
    v >= 1
  ) {
    throw new Error(
      "Positive finite pools and a vacant share below 100% are required.",
    );
  }
  const ratio = args.consensusPool / eligible;
  const shifted = eligible / (1 - v);
  let finding:
    | "landlord_absorbs_vacancies"
    | "vacancies_billed_to_residents"
    | "pool_unexplained";
  if (Math.abs(ratio - 1) <= FIT_TOLERANCE)
    finding = "landlord_absorbs_vacancies";
  else if (v > 0 && Math.abs(args.consensusPool / shifted - 1) <= FIT_TOLERANCE)
    finding = "vacancies_billed_to_residents";
  else finding = "pool_unexplained";
  const extraBuilding =
    finding === "vacancies_billed_to_residents" ? v * eligible : 0;
  return {
    finding,
    eligiblePool: round2(eligible),
    consensusPool: round2(args.consensusPool),
    vacantSharePct: round2(v * 100),
    poolIfVacanciesShifted: round2(shifted),
    gapPct: round2((ratio - 1) * 100),
    extraBilledToResidentsPerMonth: round2(extraBuilding),
    yourExtraPerMonth:
      args.yourShare === undefined ||
      finding !== "vacancies_billed_to_residents"
        ? null
        : round2(args.yourShare * (args.consensusPool - eligible)),
  };
}
export type VacancyCheckResult = ReturnType<typeof vacancyCheck>;

// ---------------------------------------------------------------------------
// F3. Why did my bill change? Splits a month-to-month change into its causes.
// The four parts always add up to the total change.
// ---------------------------------------------------------------------------

export interface MonthSnapshot {
  period: string;
  share: number; // your share under the formula that month
  pool: number; // building consensus (or eligible) pool that month
  charged: number; // your allocated utility charge
  fee: number; // flat billing fee
}

export function explainChange(prev: MonthSnapshot, cur: MonthSnapshot) {
  const expPrev = prev.share * prev.pool;
  const expCur = cur.share * cur.pool;
  const parts = {
    buildingBill: prev.share * (cur.pool - prev.pool), // the building's total moved
    yourShare: (cur.share - prev.share) * cur.pool, // occupants / formula inputs changed
    fee: cur.fee - prev.fee,
    offFormula: cur.charged - expCur - (prev.charged - expPrev), // change in mis-billing
  };
  const total = cur.charged + cur.fee - (prev.charged + prev.fee);
  const rounded = Object.fromEntries(
    Object.entries(parts).map(([k, v]) => [k, round2(v)]),
  ) as typeof parts;
  // Assign the rounding remainder to the residual term so displayed cents reconcile.
  rounded.offFormula = round2(
    round2(total) - rounded.buildingBill - rounded.yourShare - rounded.fee,
  );
  const main = (Object.entries(parts) as [keyof typeof parts, number][]).sort(
    (a, b) => Math.abs(b[1]) - Math.abs(a[1]),
  )[0][0];
  return {
    from: prev.period,
    to: cur.period,
    totalChange: round2(total),
    parts: rounded,
    mainCause: main,
  };
}
export type ChangeResult = ReturnType<typeof explainChange>;

// ---------------------------------------------------------------------------
// F4. Building letter: one anonymous, collective request built from results.
// Never names a resident or unit; refuses below 3 households.
// ---------------------------------------------------------------------------

export function buildingLetter(f: {
  buildingName: string;
  period: string;
  households: number;
  flaggedCount: number;
  consensusPool: number;
  masterPool?: number;
  formula?: { bases: string[]; rates: Record<string, number> } | null;
  vacancy?: ReturnType<typeof vacancyCheck> | null;
  reportCode?: string;
}): string {
  if (f.households < 3)
    throw new Error(
      "A building letter needs at least 3 participating households.",
    );
  const lines: string[] = [];
  lines.push(`To the property manager of ${f.buildingName},`, "");
  lines.push(
    `${f.households} households in this building compared their ${f.period} water statements using SHARECHECK.`,
    `Together, our statements imply a building water pool of $${f.consensusPool.toFixed(2)}.`,
  );
  if (f.masterPool !== undefined)
    lines.push(
      `The eligible master-bill pool is $${f.masterPool.toFixed(2)}, a $${Math.abs(f.consensusPool - f.masterPool).toFixed(2)} gap. Please reconcile the totals.`,
    );
  if (f.flaggedCount > 0)
    lines.push(
      `${f.flaggedCount} ${f.flaggedCount === 1 ? "household was" : "households were"} billed differently from the formula applied to the others.`,
    );
  if (f.formula) {
    const r = Object.entries(f.formula.rates).map(
      ([b, v]) =>
        `${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(v)} per ${b === "sqft" ? "sq ft" : b.replace(/s$/, "")}`,
    );
    lines.push(
      `Our bills are consistent with a charge of ${r.join(" plus ")}.`,
    );
  }
  if (f.vacancy?.finding === "vacancies_billed_to_residents")
    lines.push(
      `Our bills are consistent with a vacancy shift. Vacant apartments represent about $${f.vacancy.extraBilledToResidentsPerMonth.toFixed(2)} of the eligible pool, while the observed pool is higher.`,
    );
  lines.push("", "We ask you to provide, in writing:");
  lines.push("1. The allocation formula and the building totals it uses.");
  lines.push(`2. The master utility bill(s) for ${f.period}.`);
  lines.push(
    "3. How common areas and vacant apartments are treated in the allocation.",
  );
  if (f.flaggedCount > 0)
    lines.push(
      "4. A review of the household charges that do not match the formula.",
    );
  lines.push("", "Sincerely,", `${f.households} participating households`);
  if (f.reportCode) lines.push("", `Report snapshot code: ${f.reportCode}.`);
  lines.push("", "This letter reports calculations, not legal conclusions.");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// F5. Report code: a tamper-evident fingerprint of the exact inputs.
// Same inputs → same code, on any device. Uses Web Crypto (browser + Node 20+).
// ---------------------------------------------------------------------------

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value as object)
      .sort()
      .map(
        (k) =>
          `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`,
      )
      .join(",")}}`;
  return JSON.stringify(value);
}

export async function reportCode(inputs: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonical(inputs));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const hex = [...digest.slice(0, 6)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `SC-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}
