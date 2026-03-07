/** Shared formatting utilities for the EXIM app */

/** Format a number with Indian locale and 2 decimal places */
export function fmtDecimal(n: number | string): string {
  return Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Format a number with Indian locale (no forced decimals) */
export function fmtNum(n: number, decimals = 0): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: decimals });
}

/** Format an ISO date string to "01 Jan 2024" */
export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Format an ISO date string to "01 Jan 2024, 02:30 PM" */
export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format currency: ₹ 1,23,456.78 */
export function fmtCurrency(n: number | string): string {
  return `₹ ${fmtDecimal(n)}`;
}
