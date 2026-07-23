import { AxiosError } from "axios";
import api from "./client";

/**
 * Bank & Loan Accounts API — browses SAP HANA GL accounts and reports the
 * NET MOVEMENT for a single account over a date range.
 *
 * Endpoints are mounted under /hana/accounts/. The axios instance in
 * ./client.ts resolves the base URL from VITE_API_BASE_URL and attaches the
 * auth token, so we reuse it rather than a bare axios call against
 * VITE_API_URL.
 */
const BASE = "/hana/accounts";

/* ── Types ───────────────────────────────────────────────── */

/** Real API branches — the values the backend endpoints accept. */
export type Branch = "OIL" | "BEVERAGES" | "MART";
export const BRANCHES: Branch[] = ["OIL", "BEVERAGES", "MART"];

/**
 * Branch selector shown in the UI. "ALL" is a client-side pseudo-branch: it is
 * never sent to the API; instead the list is aggregated across every real
 * branch (see {@link fetchAllAccounts}).
 */
export type BranchFilter = Branch | "ALL";
export const BRANCH_FILTERS: BranchFilter[] = ["ALL", "OIL", "BEVERAGES", "MART"];

/** Account category as returned by HANA. */
export type AccountCategory = "Bank" | "FD" | "Loan";
export const CATEGORY_ORDER: AccountCategory[] = ["Bank", "FD", "Loan"];

/** Display labels for categories — HANA's raw codes → user-facing group names. */
export const CATEGORY_LABELS: Record<AccountCategory, string> = {
  Bank: "Bank",
  FD: "FDR",
  Loan: "Loans",
};

/** User-facing label for a category, falling back to the raw value. */
export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category as AccountCategory] ?? category;
}

/** One row from GET /hana/accounts/ */
export interface Account {
  AcctCode: string;
  AcctName: string;
  FatherNum: string;
  Category: AccountCategory;
  CurrTotal: number;
  ActCurr: string;
  U_Bank_Name?: string | null;
  U_Account_Number?: string | null;
  U_IFSC?: string | null;
  /**
   * The branch this row was fetched from. Tagged client-side so the "ALL" view
   * can group/label rows and query the correct branch for closing balances.
   */
  sourceBranch: Branch;
}

/**
 * Stable identity for an account across branches. AcctCode alone is NOT unique
 * in the aggregated "ALL" view (the same code can exist under multiple
 * branches), so we qualify it with the source branch.
 */
export function accountKey(account: Account): string {
  return `${account.sourceBranch}:${account.AcctCode}`;
}

/** One row from GET /hana/accounts/closing-balances/ */
export interface AccountBalance {
  AcctCode: string;
  AcctName: string;
  FatherNum: string;
  /**
   * NET MOVEMENT within [from_date, to_date] — NOT a running closing balance,
   * despite the endpoint/field name.
   */
  ClosingBalance: number;
}

/** One journal row from GET /hana/accounts/ledger */
export interface LedgerEntry {
  TransId: number;
  Line_ID: number;
  /** ISO datetime, e.g. "2026-02-05T00:00:00". */
  RefDate: string;
  Account: string;
  AcctName: string;
  /** Money into the account (increases a bank balance). */
  Debit: number;
  /** Money out of the account. */
  Credit: number;
  LineMemo: string;
  ShortName: string;
  HeaderMemo: string;
  /** HANA transaction-type code (e.g. "46" = outgoing payment, "30" = journal). */
  TransType: string;
  Ref1: string;
  Ref2: string;
}

/** One row from GET /hana/accounts/summary/ (grouped by category + currency). */
export interface AccountsSummaryRow {
  Category: AccountCategory;
  AccountCount: number;
  TotalBalance: number;
  ActCurr: string;
  /** Source branch — tagged client-side so the "ALL" summary can be branch-aware. */
  sourceBranch: Branch;
}

/** One row from GET /hana/accounts/monthly-trend/ */
export interface MonthlyTrendRow {
  Year: number;
  Month: number;
  TotalDebit: number;
  TotalCredit: number;
  NetMovement: number;
}

/** The `{ "error": "..." }` shape both endpoints return for 400 / 502. */
interface ApiErrorBody {
  error?: string;
}

/**
 * Error carrying the backend's `error` string so the UI can render it verbatim.
 * Falls back to the axios message when no structured body is present.
 */
export class BankAccountsApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "BankAccountsApiError";
    this.status = status;
  }
}

/** Normalise any thrown error into a BankAccountsApiError with a display string. */
export function toApiError(err: unknown): BankAccountsApiError {
  if (err instanceof BankAccountsApiError) return err;
  if (err instanceof AxiosError) {
    const body = err.response?.data as ApiErrorBody | string | undefined;
    const msg =
      (typeof body === "string" && body) ||
      (body && typeof body === "object" && body.error) ||
      err.message ||
      "Request failed";
    return new BankAccountsApiError(msg, err.response?.status);
  }
  if (err instanceof Error) return new BankAccountsApiError(err.message);
  return new BankAccountsApiError("Something went wrong");
}

/* ── Fetchers ────────────────────────────────────────────── */

/** GET /hana/accounts/?branch=OIL|BEVERAGES|MART */
export async function fetchAccounts(branch: Branch): Promise<Account[]> {
  try {
    const { data } = await api.get<Account[]>(`${BASE}/`, { params: { branch } });
    // Tag every row with its source branch so the UI can carry it around.
    return (data ?? []).map((account) => ({ ...account, sourceBranch: branch }));
  } catch (err) {
    throw toApiError(err);
  }
}

/**
 * Aggregate the account lists of every real branch into one, tagging each row
 * with its {@link Account.sourceBranch}. Backs the "ALL" view. Branches are
 * fetched in parallel; if any one fails the whole call rejects with its error.
 */
export async function fetchAllAccounts(): Promise<Account[]> {
  const perBranch = await Promise.all(BRANCHES.map((branch) => fetchAccounts(branch)));
  return perBranch.flat();
}

export interface BalanceParams {
  branch: Branch;
  acctCode: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
}

/**
 * GET /hana/accounts/closing-balances/?branch=&acct_code=&from_date=&to_date=
 * Returns a single-row array; we surface the first row (or null when empty).
 */
export async function fetchAccountBalance(
  params: BalanceParams
): Promise<AccountBalance | null> {
  try {
    const { data } = await api.get<AccountBalance[]>(`${BASE}/closing-balances/`, {
      params: {
        branch: params.branch,
        acct_code: params.acctCode,
        from_date: params.fromDate,
        to_date: params.toDate,
      },
    });
    return data?.[0] ?? null;
  } catch (err) {
    throw toApiError(err);
  }
}

/**
 * GET /hana/accounts/ledger?branch=&acct_code=&from_date=&to_date=
 * Returns the journal rows (debits/credits) for one account over a date range.
 * The backend does NOT include a running balance — the UI derives it.
 */
export async function fetchLedger(params: BalanceParams): Promise<LedgerEntry[]> {
  try {
    const { data } = await api.get<LedgerEntry[]>(`${BASE}/ledger`, {
      params: {
        branch: params.branch,
        acct_code: params.acctCode,
        from_date: params.fromDate,
        to_date: params.toDate,
      },
    });
    return data ?? [];
  } catch (err) {
    throw toApiError(err);
  }
}

/** GET /hana/accounts/summary/?branch= — KPI totals per category + currency. */
export async function fetchAccountsSummary(
  branch: Branch
): Promise<AccountsSummaryRow[]> {
  try {
    const { data } = await api.get<AccountsSummaryRow[]>(`${BASE}/summary/`, {
      params: { branch },
    });
    return (data ?? []).map((row) => ({ ...row, sourceBranch: branch }));
  } catch (err) {
    throw toApiError(err);
  }
}

/** Aggregate summaries across every real branch (backs the "ALL" dashboard). */
export async function fetchAllAccountsSummary(): Promise<AccountsSummaryRow[]> {
  const perBranch = await Promise.all(BRANCHES.map((b) => fetchAccountsSummary(b)));
  return perBranch.flat();
}

/**
 * GET /hana/accounts/monthly-trend/?branch=&acct_code=&from_date=&to_date=
 * Monthly debit/credit/net series for a single account.
 */
export async function fetchMonthlyTrend(
  params: BalanceParams
): Promise<MonthlyTrendRow[]> {
  try {
    const { data } = await api.get<MonthlyTrendRow[]>(`${BASE}/monthly-trend/`, {
      params: {
        branch: params.branch,
        acct_code: params.acctCode,
        from_date: params.fromDate,
        to_date: params.toDate,
      },
    });
    return data ?? [];
  } catch (err) {
    throw toApiError(err);
  }
}
