import {
  FACTORS,
  formatMoney,
  formatPercent,
  type ResidentResult,
  type Rule,
  type Statement,
} from "./audit";

export function managerLetter(
  statement: Statement,
  own: ResidentResult,
  rule: Rule,
  consensusCents: number,
  context: {
    buildingName: string;
    periodLabel: string;
    masterPoolCents?: number;
  } = {
    buildingName: "Maple Court Apartments",
    periodLabel: "October 2026",
  },
): string {
  const change = own.flagged
    ? `My utility charge of ${formatMoney(statement.utilityCents)} differs from the building-consensus estimate of ${formatMoney(own.expectedCents)} by ${formatMoney(Math.abs(own.differenceCents))} (${formatPercent(Math.abs(own.deviation))}).`
    : `My utility charge of ${formatMoney(statement.utilityCents)} is within the 2% comparison tolerance of the building-consensus estimate of ${formatMoney(own.expectedCents)}.`;
  const factorNames = {
    sqft: "apartment area",
    occupants: "occupant count",
    bedrooms: "bedroom count",
    units: "apartment count",
  };
  const activeFactors = FACTORS.filter((factor) => rule.weights[factor] > 0)
    .map(
      (factor) =>
        `${factorNames[factor]} (${statement.factors[factor]}${factor === "sqft" ? " sq ft" : ""})`,
    )
    .join(" and ");
  const masterGap =
    context.masterPoolCents === undefined
      ? ""
      : ` The eligible master-bill pool is ${formatMoney(context.masterPoolCents)}, a difference of ${formatMoney(Math.abs(consensusCents - context.masterPoolCents))} from the implied pool. Please reconcile these totals.`;
  return `Subject: Request to clarify ${context.periodLabel} water allocation — DEMO\n\nDear property manager,\n\nPlease help me reconcile my ${context.periodLabel} water statement for ${context.buildingName} (DEMO). ${change}\n\nUsing the supplied allocation formula, my share is ${formatPercent(own.share, 4)}. The participating households' statements imply a median utility pool of ${formatMoney(consensusCents)}. The separate ${formatMoney(statement.feeCents)} billing fee is excluded from this comparison.${masterGap}\n\nPlease confirm the ${activeFactors} used for my account, provide the master water bill, and explain the ${formatPercent(rule.commonAreaFraction, 0)} common-area deduction. Please also confirm the allocation weights and building totals.\n\nThis comparison identifies a calculation discrepancy, if present; it does not establish that a charge is unlawful or that a refund is owed. I would appreciate the supporting calculation and any correction needed.\n\nThank you,\n[Your name / account reference]\n\nDEMO — synthetic information for illustration only.`;
}
