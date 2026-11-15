import { allocationShare, buildingCheck, type Statement } from "./audit";
import type { DemoBuilding } from "./demo";

export interface HistoryMonth {
  period: string;
  label: string;
  status: "consistent" | "inconsistent";
  flaggedCount: number;
  households: number;
  consensusCents: number;
}

/** A computed, three-month history made entirely from fictional sample statements. */
export function demoHistory(building: DemoBuilding): HistoryMonth[] {
  const basePoolCents = Math.round(
    building.masterBillCents * (1 - building.rule.commonAreaFraction),
  );
  const months = [
    {
      period: "2026-08",
      label: "August",
      poolCents: Math.round(basePoolCents * 0.91),
      outlier: false,
    },
    {
      period: "2026-09",
      label: "September",
      poolCents: Math.round(basePoolCents * 1.04),
      outlier: building.id !== "riverstone-lofts-demo",
    },
    {
      period: building.period,
      label: "October",
      poolCents: basePoolCents,
      outlier: false,
    },
  ];
  return months.map((month) => {
    const statements: Statement[] =
      month.period === building.period
        ? building.statements
        : building.statements.map((statement) => ({
            ...statement,
            period: month.period,
            evidence: "self-reported",
            utilityCents: Math.round(
              allocationShare(statement, building.rule) *
                month.poolCents *
                (month.outlier && statement.householdId === building.viewerId
                  ? 1.15
                  : 1),
            ),
          }));
    const result = buildingCheck({
      buildingId: building.id,
      period: month.period,
      rule: building.rule,
      statements,
    });
    if (result.status === "insufficient")
      throw new Error(`Invalid demo history: ${building.id} ${month.period}`);
    return {
      period: month.period,
      label: month.label,
      status: result.status,
      flaggedCount: result.residents.filter((resident) => resident.flagged)
        .length,
      households: statements.length,
      consensusCents: result.consensusCents,
    };
  });
}
