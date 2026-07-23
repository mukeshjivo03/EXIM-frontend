import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  fetchAccounts,
  fetchAllAccounts,
  fetchAccountBalance,
  fetchLedger,
  fetchAccountsSummary,
  fetchAllAccountsSummary,
  fetchMonthlyTrend,
  type BranchFilter,
  type BalanceParams,
} from "@/api/bankAccounts";

/**
 * Account list for a branch, or the aggregate across all branches when the
 * filter is "ALL".
 * Cached by ['accounts', filter] — selecting a row does NOT refetch, and
 * switching branch serves the other branch's cached list immediately.
 */
export function useAccounts(filter: BranchFilter) {
  return useQuery({
    queryKey: ["accounts", filter],
    queryFn: () => (filter === "ALL" ? fetchAllAccounts() : fetchAccounts(filter)),
    placeholderData: keepPreviousData,
  });
}

/**
 * Net movement for one account over a date range.
 * Keyed by ['balance', branch, acctCode, from, to]. `enabled` gates the fetch
 * so it only runs on Apply — pass `enabled: false` until the user commits a
 * range (i.e. don't fetch on every keystroke).
 */
export function useAccountBalance(
  params: Partial<BalanceParams>,
  enabled: boolean
) {
  const { branch, acctCode, fromDate, toDate } = params;
  return useQuery({
    queryKey: ["balance", branch, acctCode, fromDate, toDate],
    queryFn: () =>
      fetchAccountBalance({
        branch: branch!,
        acctCode: acctCode!,
        fromDate: fromDate!,
        toDate: toDate!,
      }),
    enabled: enabled && !!branch && !!acctCode && !!fromDate && !!toDate,
  });
}

/**
 * Ledger (journal rows) for one account over a date range. Shares the same
 * committed-range/`enabled` gating as {@link useAccountBalance}.
 */
export function useLedger(params: Partial<BalanceParams>, enabled: boolean) {
  const { branch, acctCode, fromDate, toDate } = params;
  return useQuery({
    queryKey: ["ledger", branch, acctCode, fromDate, toDate],
    queryFn: () =>
      fetchLedger({
        branch: branch!,
        acctCode: acctCode!,
        fromDate: fromDate!,
        toDate: toDate!,
      }),
    enabled: enabled && !!branch && !!acctCode && !!fromDate && !!toDate,
  });
}

/** KPI summary (per category + currency) for a branch, or the aggregate for "ALL". */
export function useAccountsSummary(filter: BranchFilter) {
  return useQuery({
    queryKey: ["accounts-summary", filter],
    queryFn: () =>
      filter === "ALL" ? fetchAllAccountsSummary() : fetchAccountsSummary(filter),
    placeholderData: keepPreviousData,
  });
}

/** Monthly debit/credit/net trend for one account over a date range. */
export function useMonthlyTrend(params: Partial<BalanceParams>, enabled: boolean) {
  const { branch, acctCode, fromDate, toDate } = params;
  return useQuery({
    queryKey: ["monthly-trend", branch, acctCode, fromDate, toDate],
    queryFn: () =>
      fetchMonthlyTrend({
        branch: branch!,
        acctCode: acctCode!,
        fromDate: fromDate!,
        toDate: toDate!,
      }),
    enabled: enabled && !!branch && !!acctCode && !!fromDate && !!toDate,
  });
}
