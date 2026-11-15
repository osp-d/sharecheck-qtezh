/** Money enters in integer cents. Ratios stay unrounded until presentation. */
export type Factor = "sqft" | "occupants" | "bedrooms" | "units";
export type Evidence = "document-attached" | "self-reported";
export type Weights = Record<Factor, number>;
export interface Rule {
  weights: Weights;
  totals: Weights;
  commonAreaFraction: number;
  billingFeeCents: number;
}
export interface Statement {
  householdId: string;
  buildingId: string;
  period: string;
  utility: "water";
  factors: Weights;
  utilityCents: number;
  feeCents: number;
  evidence: Evidence;
}
export interface AuditInput {
  buildingId: string;
  period: string;
  rule: Rule;
  statements: Statement[];
  masterBillCents?: number;
}
export interface ResidentResult {
  householdId: string;
  share: number;
  impliedPoolCents: number;
  expectedCents: number;
  differenceCents: number;
  deviation: number;
  flagged: boolean;
}
export type AuditResult =
  | { status: "insufficient"; reasons: string[] }
  | {
      status: "consistent" | "inconsistent";
      consensusCents: number;
      residents: ResidentResult[];
      documentCount: number;
      selfReportedCount: number;
      masterCheck: null | {
        poolCents: number;
        deviation: number;
        matches: boolean;
      };
    };

export const FACTORS: Factor[] = ["sqft", "occupants", "bedrooms", "units"];
export const TOLERANCE = 0.02;
export const MIN_HOUSEHOLDS = 3;
const money = (value: number) => Number.isSafeInteger(value) && value >= 0;
const finitePositive = (value: number) => Number.isFinite(value) && value > 0;

export function median(values: number[]): number {
  if (!values.length)
    throw new Error("Cannot calculate the median of an empty sample.");
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function validateRule(rule: Rule): string[] {
  const reasons: string[] = [];
  if (!Number.isSafeInteger(rule.totals.units) || rule.totals.units < 1) {
    reasons.push("The building must have a positive whole number of units.");
  }
  if (
    FACTORS.some(
      (key) =>
        !Number.isFinite(rule.weights[key]) ||
        rule.weights[key] < 0 ||
        rule.weights[key] > 1,
    )
  ) {
    reasons.push("Allocation weights must be between 0% and 100%.");
  }
  if (
    Math.abs(FACTORS.reduce((sum, key) => sum + rule.weights[key], 0) - 1) >
    1e-8
  ) {
    reasons.push("Allocation weights must add up to 100%.");
  }
  for (const key of FACTORS) {
    if (rule.weights[key] > 0 && !finitePositive(rule.totals[key])) {
      reasons.push(`The building total for ${key} is missing or invalid.`);
    }
    if (
      rule.weights[key] > 0 &&
      ["occupants", "bedrooms", "units"].includes(key) &&
      !Number.isSafeInteger(rule.totals[key])
    ) {
      reasons.push(`The building total for ${key} must be a whole number.`);
    }
  }
  if (
    !Number.isFinite(rule.commonAreaFraction) ||
    rule.commonAreaFraction < 0 ||
    rule.commonAreaFraction >= 1
  ) {
    reasons.push(
      "The common-area deduction must be from 0% to less than 100%.",
    );
  }
  if (!money(rule.billingFeeCents))
    reasons.push("The billing fee must be a non-negative amount in cents.");
  return reasons;
}

export function allocationShare(statement: Statement, rule: Rule): number {
  return FACTORS.reduce(
    (sum, key) =>
      sum +
      (rule.weights[key] > 0
        ? (rule.weights[key] * statement.factors[key]) / rule.totals[key]
        : 0),
    0,
  );
}

export function buildingCheck(input: AuditInput): AuditResult {
  const { statements, rule } = input;
  const reasons = validateRule(rule);
  if (statements.length < MIN_HOUSEHOLDS)
    reasons.push("At least 3 independent households are needed.");
  if (
    new Set(statements.map((s) => s.householdId)).size !== statements.length ||
    statements.some((s) => !s.householdId)
  ) {
    reasons.push("Each submission must belong to a different household.");
  }
  if (
    statements.some(
      (s) =>
        s.buildingId !== input.buildingId ||
        s.period !== input.period ||
        s.utility !== "water",
    )
  ) {
    reasons.push(
      "All statements must be for the same building, month, and utility.",
    );
  }
  if (
    statements.length > rule.totals.units &&
    finitePositive(rule.totals.units)
  ) {
    reasons.push(
      "The number of households exceeds the number of building units.",
    );
  }
  for (const statement of statements) {
    if (!money(statement.utilityCents) || !money(statement.feeCents))
      reasons.push("Statement amounts must be non-negative amounts in cents.");
    for (const key of FACTORS) {
      if (
        rule.weights[key] > 0 &&
        (!finitePositive(statement.factors[key]) ||
          statement.factors[key] > rule.totals[key])
      ) {
        reasons.push(
          `A household's ${key} is missing, invalid, or exceeds the building total.`,
        );
      }
      if (
        rule.weights[key] > 0 &&
        ["occupants", "bedrooms", "units"].includes(key) &&
        !Number.isSafeInteger(statement.factors[key])
      ) {
        reasons.push(`A household's ${key} must be a whole number.`);
      }
    }
  }
  for (const key of FACTORS) {
    if (rule.weights[key] <= 0 || !finitePositive(rule.totals[key])) continue;
    const observedTotal = statements.reduce(
      (sum, statement) => sum + statement.factors[key],
      0,
    );
    if (
      Number.isFinite(observedTotal) &&
      observedTotal > rule.totals[key] + 1e-8
    )
      reasons.push(
        `The participating households' ${key} exceed the disclosed building total.`,
      );
  }
  if (
    input.masterBillCents !== undefined &&
    (!money(input.masterBillCents) || input.masterBillCents === 0)
  ) {
    reasons.push("The master bill must be a positive amount in cents.");
  }
  if (
    input.masterBillCents !== undefined &&
    money(input.masterBillCents) &&
    Number.isFinite(rule.commonAreaFraction) &&
    rule.commonAreaFraction >= 0 &&
    rule.commonAreaFraction < 1 &&
    Math.round(input.masterBillCents * (1 - rule.commonAreaFraction)) <= 0
  ) {
    reasons.push("The master bill leaves no positive eligible water pool.");
  }
  if (reasons.length)
    return { status: "insufficient", reasons: [...new Set(reasons)] };
  const shares = statements.map((s) => allocationShare(s, rule));
  if (shares.some((share) => !finitePositive(share) || share > 1)) {
    return {
      status: "insufficient",
      reasons: ["The formula produced an invalid household share."],
    };
  }
  const pools = statements.map((s, index) => s.utilityCents / shares[index]);
  const consensusCents = median(pools);
  // A zero pool provides no meaningful relative comparison.
  if (!finitePositive(consensusCents))
    return {
      status: "insufficient",
      reasons: [
        "A positive building pool is needed to compare relative differences.",
      ],
    };
  const residents = statements.map((s, index): ResidentResult => {
    const expectedCents = Math.round(shares[index] * consensusCents);
    const deviation = (pools[index] - consensusCents) / consensusCents;
    return {
      householdId: s.householdId,
      share: shares[index],
      impliedPoolCents: pools[index],
      expectedCents,
      differenceCents: s.utilityCents - expectedCents,
      deviation,
      flagged: Math.abs(deviation) > TOLERANCE + 1e-10,
    };
  });
  const poolCents =
    input.masterBillCents === undefined
      ? undefined
      : Math.round(input.masterBillCents * (1 - rule.commonAreaFraction));
  const masterDeviation =
    poolCents === undefined
      ? undefined
      : (consensusCents - poolCents) / poolCents;
  const masterCheck =
    poolCents === undefined
      ? null
      : {
          poolCents,
          deviation: masterDeviation!,
          matches: Math.abs(masterDeviation!) <= TOLERANCE + 1e-10,
        };
  return {
    status:
      residents.some((r) => r.flagged) ||
      (masterCheck !== null && !masterCheck.matches)
        ? "inconsistent"
        : "consistent",
    consensusCents,
    residents,
    documentCount: statements.filter((s) => s.evidence === "document-attached")
      .length,
    selfReportedCount: statements.filter((s) => s.evidence === "self-reported")
      .length,
    masterCheck,
  };
}

export const formatMoney = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export const formatPercent = (fraction: number, digits = 2) =>
  `${(fraction * 100).toFixed(digits)}%`;
