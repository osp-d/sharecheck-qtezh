import {
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
  context: { buildingName: string; periodLabel: string } = {
    buildingName: "Maple Court Apartments",
    periodLabel: "October 2026",
  },
): string {
  const change = own.flagged
    ? `My utility charge of ${formatMoney(statement.utilityCents)} differs from the building-consensus estimate of ${formatMoney(own.expectedCents)} by ${formatMoney(Math.abs(own.differenceCents))} (${formatPercent(Math.abs(own.deviation))}).`
    : `My utility charge of ${formatMoney(statement.utilityCents)} is within the 2% comparison tolerance of the building-consensus estimate of ${formatMoney(own.expectedCents)}.`;
  return `Subject: Request to clarify ${context.periodLabel} water allocation — DEMO\n\nDear property manager,\n\nPlease help me reconcile my ${context.periodLabel} water statement for ${context.buildingName} (DEMO). ${change}\n\nUsing the supplied allocation formula, my share is ${formatPercent(own.share, 4)}. The participating households' statements imply a median utility pool of ${formatMoney(consensusCents)}. The separate ${formatMoney(statement.feeCents)} billing fee is excluded from this comparison.\n\nPlease confirm the apartment area (${statement.factors.sqft} sq ft) and occupant count (${statement.factors.occupants}) used for my account, provide the master water bill, and explain the ${formatPercent(rule.commonAreaFraction, 0)} common-area deduction. Please also confirm the allocation weights and building totals.\n\nThis comparison identifies a calculation discrepancy, if present; it does not establish that a charge is unlawful or that a refund is owed. I would appreciate the supporting calculation and any correction needed.\n\nThank you,\n[Your name / account reference]\n\nDEMO — synthetic information for illustration only.`;
}
