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

export type Branch = "OIL" | "BEVERAGES";
export const BRANCHES: Branch[] = ["OIL", "BEVERAGES"];

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

/** GET /hana/accounts/?branch=OIL|BEVERAGES */
export async function fetchAccounts(branch: Branch): Promise<Account[]> {
  try {
    const { data } = await api.get<Account[]>(`${BASE}/`, { params: { branch } });
    return data ?? [];
  } catch (err) {
    throw toApiError(err);
  }
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
