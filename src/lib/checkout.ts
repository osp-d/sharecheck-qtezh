export const REPORT_PRICE_CENTS = 999;
export const DEMO_ACCESS_CODE = "DEMO100";

export function demoOrder(code: string) {
  const accepted = code.trim().toUpperCase() === DEMO_ACCESS_CODE;
  return {
    subtotalCents: REPORT_PRICE_CENTS,
    discountCents: accepted ? REPORT_PRICE_CENTS : 0,
    totalCents: accepted ? 0 : REPORT_PRICE_CENTS,
    accepted,
  };
}
