/** Shared helpers for the Bank & Loan Accounts screen. */

import { CATEGORY_ORDER } from "@/api/bankAccounts";
import type {
  Account,
  AccountCategory,
  AccountsSummaryRow,
  LedgerEntry,
} from "@/api/bankAccounts";

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

/** Compact currency form (e.g. "₹1.4M") for tight spots like chart axes. */
export function formatMoneyCompact(value: number, currency = "INR"): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return new Intl.NumberFormat("en-IN", {
      notation: "compact",
      maximumFractionDigits: 1,
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

/* ── Ledger helpers ──────────────────────────────────────── */

/** The date portion (YYYY-MM-DD) of a HANA "…T00:00:00" timestamp. */
export function ledgerDate(refDate: string): string {
  return (refDate ?? "").slice(0, 10);
}

/** Short axis/label form of a ledger date, e.g. "05 Feb". */
export function formatLedgerDate(refDate: string): string {
  const iso = ledgerDate(refDate);
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

/** A ledger row augmented with its running balance (money in − money out). */
export interface LedgerRow extends LedgerEntry {
  /** Cumulative Debit − Credit up to and including this row. */
  runningBalance: number;
}

/** One point on the running-balance chart — the end-of-day balance. */
export interface LedgerPoint {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "05 Feb"
  balance: number;
}

export interface LedgerAnalytics {
  /** Rows sorted chronologically, each carrying its running balance. */
  rows: LedgerRow[];
  totalDebit: number;
  totalCredit: number;
  /** Net movement over the period = totalDebit − totalCredit. */
  net: number;
  /** End-of-day running balance series for the chart. */
  points: LedgerPoint[];
}

/**
 * Turn raw ledger rows into a chronologically-sorted set with a running
 * balance, period totals, and a per-day series for the chart. The backend
 * returns no running balance, so we accumulate Debit − Credit from the start
 * of the period (i.e. the series is relative to a zero opening balance).
 */
export function buildLedgerAnalytics(entries: LedgerEntry[]): LedgerAnalytics {
  const sorted = [...entries].sort((a, b) => {
    if (a.RefDate !== b.RefDate) return a.RefDate < b.RefDate ? -1 : 1;
    if (a.TransId !== b.TransId) return a.TransId - b.TransId;
    return a.Line_ID - b.Line_ID;
  });

  let totalDebit = 0;
  let totalCredit = 0;
  let running = 0;
  const rows: LedgerRow[] = sorted.map((e) => {
    totalDebit += e.Debit;
    totalCredit += e.Credit;
    running += e.Debit - e.Credit;
    return { ...e, runningBalance: running };
  });

  // Collapse to the last running balance of each day for a clean time series.
  const byDay = new Map<string, LedgerPoint>();
  for (const row of rows) {
    const date = ledgerDate(row.RefDate);
    byDay.set(date, { date, label: formatLedgerDate(row.RefDate), balance: row.runningBalance });
  }

  return {
    rows,
    totalDebit,
    totalCredit,
    net: totalDebit - totalCredit,
    points: [...byDay.values()],
  };
}

/* ── Dashboard helpers ───────────────────────────────────── */

export interface CategoryTotal {
  count: number;
  balance: number;
}

export interface CurrencySummary {
  currency: string;
  byCategory: Record<AccountCategory, CategoryTotal>;
  totalAccounts: number;
  /** Raw sum of every category balance in this currency. */
  netBalance: number;
  /** Bank + FD (treated as asset accounts). */
  assets: number;
  /** Loan balances. */
  liabilities: number;
}

function emptyCategoryMap(): Record<AccountCategory, CategoryTotal> {
  return {
    Bank: { count: 0, balance: 0 },
    FD: { count: 0, balance: 0 },
    Loan: { count: 0, balance: 0 },
  };
}

/**
 * Collapse summary rows into one entry per currency (balances across currencies
 * must never be summed together). Sorted with the currency holding the most
 * accounts first, so the UI can lead with the dominant one.
 */
export function summariseByCurrency(rows: AccountsSummaryRow[]): CurrencySummary[] {
  const map = new Map<string, CurrencySummary>();

  for (const row of rows) {
    if (!row.Category) continue;
    const currency = row.ActCurr || "INR";
    let entry = map.get(currency);
    if (!entry) {
      entry = {
        currency,
        byCategory: emptyCategoryMap(),
        totalAccounts: 0,
        netBalance: 0,
        assets: 0,
        liabilities: 0,
      };
      map.set(currency, entry);
    }
    const bucket = entry.byCategory[row.Category];
    bucket.count += row.AccountCount;
    bucket.balance += row.TotalBalance ?? 0;
    entry.totalAccounts += row.AccountCount;
    entry.netBalance += row.TotalBalance ?? 0;
    if (row.Category === "Loan") entry.liabilities += row.TotalBalance ?? 0;
    else entry.assets += row.TotalBalance ?? 0;
  }

  return [...map.values()].sort((a, b) => b.totalAccounts - a.totalAccounts);
}

/** Most frequent currency across a set of accounts (defaults to INR). */
export function primaryCurrency(accounts: Account[]): string {
  const freq = new Map<string, number>();
  for (const a of accounts) {
    const c = a.ActCurr || "INR";
    freq.set(c, (freq.get(c) ?? 0) + 1);
  }
  let best = "INR";
  let max = -1;
  for (const [cur, n] of freq) {
    if (n > max) {
      max = n;
      best = cur;
    }
  }
  return best;
}

export interface CategoryKpi {
  category: AccountCategory;
  count: number;
  /** Total balance of the primary-currency accounts in this category. */
  total: number;
  currency: string;
  /** True when the category holds accounts in more than one currency. */
  mixedCurrency: boolean;
}

/**
 * Per-category KPI totals (Bank / FD / Loan) for the account list. Balances are
 * summed only within the branch's primary currency — accounts in other
 * currencies still count toward `count` and flag `mixedCurrency`.
 */
export function accountCategoryKpis(accounts: Account[]): CategoryKpi[] {
  const currency = primaryCurrency(accounts);
  return CATEGORY_ORDER.map((category) => {
    const inCat = accounts.filter((a) => a.Category === category);
    const currencies = new Set(inCat.map((a) => a.ActCurr || "INR"));
    const total = inCat
      .filter((a) => (a.ActCurr || "INR") === currency)
      .reduce((sum, a) => sum + a.CurrTotal, 0);
    return {
      category,
      count: inCat.length,
      total,
      currency,
      mixedCurrency: currencies.size > 1,
    };
  });
}

/** "Feb 2026" from a year + 1-based month. */
export function monthLabel(year: number, month: number): string {
  if (!year || !month) return "";
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}
