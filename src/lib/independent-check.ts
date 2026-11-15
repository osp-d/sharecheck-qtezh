import { FACTORS, TOLERANCE, formatMoney, type Factor } from "./audit";

export interface IndependentInput {
  buildingName: string;
  period: string;
  masterPeriod: string;
  chargeCents?: number;
  feeCents?: number;
  masterBillCents?: number;
  commonAreaFraction?: number;
  weights: Partial<Record<Factor, number>>;
  totals: Partial<Record<Factor, number>>;
  factors: Partial<Record<Factor, number>>;
}

export type IndependentResult =
  | {
      status: "needs-evidence";
      missing: string[];
      errors: string[];
      requestLetter: string;
    }
  | {
      status: "calculated";
      share: number;
      eligiblePoolCents: number;
      expectedCents: number;
      differenceCents: number;
      deviation: number;
      flagged: boolean;
    };

const labels: Record<Factor, string> = {
  sqft: "area",
  occupants: "occupants",
  bedrooms: "bedrooms",
  units: "units",
};
const whole = (value: number) => Number.isSafeInteger(value) && value >= 0;
const cents = (value: number) => Number.isSafeInteger(value) && value >= 0;

export function evidenceRequest(
  input: Pick<IndependentInput, "buildingName" | "period">,
  missing: string[],
): string {
  const building = input.buildingName.trim() || "my apartment building";
  const month = /^\d{4}-\d{2}$/.test(input.period)
    ? ` for ${input.period}`
    : "";
  return `Subject: Request for water allocation records${month}\n\nHello,\n\nI would like to verify the water charge for ${building}${month}. Please provide or confirm:\n\n${missing.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\nPlease also explain how my share was calculated and identify any separate billing fee. I would appreciate the supporting records or the right contact for this request.\n\nThank you,\n[Your name / account reference]\n\nDraft only — review before sending.`;
}

export function clarificationRequest(
  input: IndependentInput,
  result: Extract<IndependentResult, { status: "calculated" }>,
): string {
  const building = input.buildingName.trim() || "my apartment building";
  return `Subject: Request to clarify ${input.period} water charge\n\nHello,\n\nI checked my water charge for ${building} using the master-bill amount, allocation weights, building totals, and common-area deduction that I entered. My statement shows ${formatMoney(input.chargeCents!)} before the separate billing fee. Those figures produce an expected charge of ${formatMoney(result.expectedCents)}, a difference of ${formatMoney(Math.abs(result.differenceCents))} ${result.differenceCents >= 0 ? "above" : "below"} that amount.\n\nPlease confirm the figures and rule used for my account, provide the supporting calculation, and explain or correct any difference. I understand that this independent calculation does not authenticate the documents or establish a legal overcharge.\n\nThank you,\n[Your name / account reference]\n\nDraft only — review before sending.`;
}

/** Checks one renter's entered charge against an entered master bill and disclosed allocation rule. */
export function independentCheck(input: IndependentInput): IndependentResult {
  const missing: string[] = [];
  const errors: string[] = [];
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.period))
    missing.push("Your water statement and billing month");
  if (input.chargeCents === undefined)
    missing.push("Your statement's water charge, excluding any billing fee");
  else if (!cents(input.chargeCents) || input.chargeCents === 0)
    errors.push("Water charge must be a positive amount in cents.");
  if (input.feeCents !== undefined && !cents(input.feeCents))
    errors.push("Billing fee must be a non-negative amount in cents.");
  if (input.masterBillCents === undefined)
    missing.push("The building's master water bill for the same month");
  else if (!cents(input.masterBillCents) || input.masterBillCents === 0)
    errors.push("Master bill must be a positive amount in cents.");
  if (!input.masterPeriod) missing.push("The master bill's billing month");
  else if (input.masterPeriod !== input.period)
    errors.push(
      "The master bill and your statement must cover the same month.",
    );
  if (input.commonAreaFraction === undefined)
    missing.push("The disclosed common-area deduction (confirm 0% if none)");
  else if (
    !Number.isFinite(input.commonAreaFraction) ||
    input.commonAreaFraction < 0 ||
    input.commonAreaFraction >= 1
  )
    errors.push("Common-area deduction must be from 0% to less than 100%.");

  const weights = FACTORS.map((factor) => input.weights[factor] ?? 0);
  if (FACTORS.every((factor) => input.weights[factor] === undefined))
    missing.push("The disclosed allocation rule and its weights");
  else if (
    weights.some(
      (weight) => !Number.isFinite(weight) || weight < 0 || weight > 1,
    ) ||
    Math.abs(weights.reduce((sum, weight) => sum + weight, 0) - 1) > 1e-8
  )
    errors.push(
      "Allocation weights must be between 0% and 100% and add to 100%.",
    );

  let share = 0;
  for (const factor of FACTORS) {
    const weight = input.weights[factor] ?? 0;
    if (!(weight > 0 && weight <= 1)) continue;
    const total = input.totals[factor];
    const own = factor === "units" ? 1 : input.factors[factor];
    if (total === undefined)
      missing.push(
        `Building total ${labels[factor]} used by the allocation rule`,
      );
    else if (
      !Number.isFinite(total) ||
      total <= 0 ||
      (factor !== "sqft" && !whole(total))
    )
      errors.push(
        `Building total ${labels[factor]} must be positive${factor === "sqft" ? "" : " and whole"}.`,
      );
    if (own === undefined)
      missing.push(
        `Your apartment's ${labels[factor]} used by the allocation rule`,
      );
    else if (
      !Number.isFinite(own) ||
      own < (factor === "bedrooms" ? 0 : 1) ||
      (factor !== "sqft" && !whole(own))
    )
      errors.push(
        `Your apartment's ${labels[factor]} must be valid${factor === "sqft" ? "" : " and whole"}.`,
      );
    if (
      total !== undefined &&
      own !== undefined &&
      total > 0 &&
      own >= 0 &&
      Number.isFinite(total) &&
      Number.isFinite(own)
    ) {
      if (own > total)
        errors.push(
          `Your apartment's ${labels[factor]} cannot exceed the building total.`,
        );
      else share += (weight * own) / total;
    }
  }
  if (missing.length || errors.length)
    return {
      status: "needs-evidence",
      missing: [...new Set(missing)],
      errors: [...new Set(errors)],
      requestLetter: evidenceRequest(
        input,
        missing.length
          ? [...new Set(missing)]
          : ["The records and factors used to calculate my water charge"],
      ),
    };
  if (!Number.isFinite(share) || share <= 0 || share > 1)
    return {
      status: "needs-evidence",
      missing: [],
      errors: [
        "The supplied rule gives an invalid apartment share. Check the inputs.",
      ],
      requestLetter: evidenceRequest(input, [
        "The allocation formula and factors applied to my apartment",
      ]),
    };
  const eligiblePoolCents = Math.round(
    input.masterBillCents! * (1 - input.commonAreaFraction!),
  );
  const expectedCents = Math.round(share * eligiblePoolCents);
  if (expectedCents <= 0)
    return {
      status: "needs-evidence",
      missing: [],
      errors: ["The supplied amounts produce no meaningful expected charge."],
      requestLetter: evidenceRequest(input, [
        "The master bill and allocation formula applied to my apartment",
      ]),
    };
  const differenceCents = input.chargeCents! - expectedCents;
  const deviation = differenceCents / expectedCents;
  return {
    status: "calculated",
    share,
    eligiblePoolCents,
    expectedCents,
    differenceCents,
    deviation,
    flagged: Math.abs(deviation) > TOLERANCE + 1e-10,
  };
}
