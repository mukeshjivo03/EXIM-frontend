/** Shared helpers for the Bank & Loan Accounts screen. */

/** Format a value with Indian digit grouping in the account's currency. */
export function formatMoney(value: number, currency = "INR"): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
    }).format(value);
  } catch {
    // Guard against an unexpected/invalid currency code from HANA.
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(value);
  }
}

/** Zero-padded local ISO date (YYYY-MM-DD) — avoids UTC shift from toISOString. */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Default date range for the Net Movement query:
 *   From = one month before today (lower bound)
 *   To   = today (upper bound)
 */
export function defaultDateRange(today = new Date()): {
  from: string;
  to: string;
} {
  const from = new Date(today);
  from.setMonth(from.getMonth() - 1); // one month before today
  return {
    from: toISODate(from),
    to: toISODate(today),
  };
}
