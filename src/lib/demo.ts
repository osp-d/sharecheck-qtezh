import type { Rule, Statement } from "./audit";

export const BUILDING = {
  id: "maple-court-demo",
  name: "Maple Court Apartments",
  units: 24,
  period: "2026-10",
  periodLabel: "October 2026",
};
export const DEMO_RULE: Rule = {
  weights: { sqft: 0.5, occupants: 0.5, bedrooms: 0, units: 0 },
  totals: { sqft: 21600, occupants: 48, bedrooms: 48, units: 24 },
  commonAreaFraction: 0.1,
  billingFeeCents: 395,
};
const resident = (
  id: string,
  sqft: number,
  occupants: number,
  cents: number,
  evidence: Statement["evidence"] = "document-attached",
): Statement => ({
  householdId: id,
  buildingId: BUILDING.id,
  period: BUILDING.period,
  utility: "water",
  factors: { sqft, occupants, bedrooms: 2, units: 1 },
  utilityCents: cents,
  feeCents: 395,
  evidence,
});
/** Synthetic fixtures from the final brief, never real residents' information. */
export const DEMO_STATEMENTS: Statement[] = [
  resident("r1", 650, 1, 5500),
  resident("r2", 900, 2, 9000),
  resident("r3", 1100, 3, 12250),
  resident("r4", 900, 2, 11250),
  resident("r5", 650, 2, 7750),
  resident("r6", 1100, 2, 10000, "self-reported"),
];
export const YOUR_STATEMENT = DEMO_STATEMENTS[3];

export function demoCohort(yours: Statement, joined: boolean): Statement[] {
  return joined
    ? DEMO_STATEMENTS.map((s) => (s.householdId === "r4" ? yours : s))
    : [yours];
}
