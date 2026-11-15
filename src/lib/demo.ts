import type { Rule, Statement } from "./audit";
import type { UnitAttrs } from "./insights";

/** Every building and statement here is fictional. No real resident data ships in the demo. */
export interface DemoBuilding {
  id: string;
  name: string;
  units: number;
  period: string;
  periodLabel: string;
  formulaLabel: string;
  rule: Rule;
  statements: Statement[];
  viewerId: string;
  masterBillCents: number;
  vacantUnits: UnitAttrs[];
}

const period = "2026-10";
const unit = (
  sqft: number,
  occupants: number,
  bedrooms: number,
): UnitAttrs => ({ sqft, occupants, bedrooms, units: 1 });
const row = (
  buildingId: string,
  id: string,
  sqft: number,
  occupants: number,
  bedrooms: number,
  utilityCents: number,
  feeCents: number,
  evidence: Statement["evidence"] = "self-reported",
): Statement => ({
  householdId: id,
  buildingId,
  period,
  utility: "water",
  factors: unit(sqft, occupants, bedrooms),
  utilityCents,
  feeCents,
  evidence,
});

const mapleId = "maple-court-demo";
const mapleRule: Rule = {
  weights: { sqft: 0.5, occupants: 0.5, bedrooms: 0, units: 0 },
  totals: { sqft: 21600, occupants: 48, bedrooms: 36, units: 24 },
  commonAreaFraction: 0.1,
  billingFeeCents: 395,
};
const maple: DemoBuilding = {
  id: mapleId,
  name: "Maple Court Apartments",
  units: 24,
  period,
  periodLabel: "October 2026",
  formulaLabel: "Area + occupants",
  rule: mapleRule,
  viewerId: "r4",
  masterBillCents: 240000,
  vacantUnits: [unit(900, 0, 2), unit(900, 0, 2), unit(900, 0, 2)],
  statements: [
    row(mapleId, "r1", 650, 1, 1, 5500, 395, "document-attached"),
    row(mapleId, "r2", 900, 2, 2, 9000, 395, "document-attached"),
    row(mapleId, "r3", 1100, 3, 2, 12250, 395, "document-attached"),
    row(mapleId, "r4", 900, 2, 2, 11250, 395, "document-attached"),
    row(mapleId, "r5", 650, 2, 1, 7750, 395, "document-attached"),
    row(mapleId, "r6", 1100, 2, 2, 10000, 395, "self-reported"),
  ],
};

const birchId = "birch-gardens-demo";
const birch: DemoBuilding = {
  id: birchId,
  name: "Birch Gardens",
  units: 18,
  period,
  periodLabel: "October 2026",
  formulaLabel: "Equal split",
  rule: {
    weights: { sqft: 0, occupants: 0, bedrooms: 0, units: 1 },
    totals: { sqft: 15300, occupants: 36, bedrooms: 24, units: 18 },
    commonAreaFraction: 0.1,
    billingFeeCents: 250,
  },
  viewerId: "r4",
  masterBillCents: 200000,
  vacantUnits: [unit(800, 0, 2), unit(850, 0, 2)],
  statements: [
    row(birchId, "r1", 650, 1, 1, 10000, 250),
    row(birchId, "r2", 800, 2, 2, 10000, 250),
    row(birchId, "r3", 950, 3, 2, 10000, 250),
    row(birchId, "r4", 700, 2, 1, 11500, 250),
    row(birchId, "r5", 1000, 2, 3, 10000, 250),
    row(birchId, "r6", 750, 1, 1, 10000, 250, "self-reported"),
  ],
};

const riverId = "riverstone-lofts-demo";
const riverstone: DemoBuilding = {
  id: riverId,
  name: "Riverstone Lofts",
  units: 20,
  period,
  periodLabel: "October 2026",
  formulaLabel: "Area only",
  rule: {
    weights: { sqft: 1, occupants: 0, bedrooms: 0, units: 0 },
    totals: { sqft: 20000, occupants: 40, bedrooms: 30, units: 20 },
    commonAreaFraction: 0.1,
    billingFeeCents: 400,
  },
  viewerId: "r4",
  masterBillCents: 333333,
  vacantUnits: [unit(800, 0, 1), unit(800, 0, 1)],
  statements: [
    row(riverId, "r1", 600, 1, 1, 9000, 400),
    row(riverId, "r2", 1000, 2, 2, 15000, 400),
    row(riverId, "r3", 1200, 3, 2, 18000, 400),
    row(riverId, "r4", 800, 1, 2, 12000, 400),
    row(riverId, "r5", 900, 2, 1, 13500, 400),
    row(riverId, "r6", 1100, 2, 3, 16500, 400, "self-reported"),
  ],
};

const cedarId = "cedar-point-demo";
const cedar: DemoBuilding = {
  id: cedarId,
  name: "Cedar Point",
  units: 20,
  period,
  periodLabel: "October 2026",
  formulaLabel: "Bedrooms only",
  rule: {
    weights: { sqft: 0, occupants: 0, bedrooms: 1, units: 0 },
    totals: { sqft: 18000, occupants: 45, bedrooms: 40, units: 20 },
    commonAreaFraction: 0.2,
    billingFeeCents: 350,
  },
  viewerId: "r4",
  masterBillCents: 250000,
  vacantUnits: [unit(850, 0, 2), unit(850, 0, 2), unit(850, 0, 2)],
  statements: [
    row(cedarId, "r1", 650, 1, 1, 5000, 350),
    row(cedarId, "r2", 900, 2, 2, 10000, 350),
    row(cedarId, "r3", 1100, 3, 3, 15000, 350),
    row(cedarId, "r4", 700, 1, 2, 12500, 350),
    row(cedarId, "r5", 850, 2, 1, 5000, 350),
    row(cedarId, "r6", 1000, 2, 3, 15000, 350, "self-reported"),
  ],
};

export const DEMO_BUILDINGS: DemoBuilding[] = [maple, birch, riverstone, cedar];

// Keep the original Maple Court fixture exports for existing calculation tests.
export const BUILDING = {
  id: maple.id,
  name: maple.name,
  units: maple.units,
  period: maple.period,
  periodLabel: maple.periodLabel,
};
export const DEMO_RULE = maple.rule;
export const DEMO_STATEMENTS = maple.statements;
export const YOUR_STATEMENT = maple.statements[3];

export function demoCohort(
  yours: Statement,
  joined: boolean,
  building: DemoBuilding = maple,
): Statement[] {
  return joined
    ? building.statements.map((statement) =>
        statement.householdId === building.viewerId ? yours : statement,
      )
    : [yours];
}
