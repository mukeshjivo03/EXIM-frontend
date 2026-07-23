import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  fetchAccounts,
  fetchAccountBalance,
  type Branch,
  type BalanceParams,
} from "@/api/bankAccounts";

/**
 * Account list for a branch.
 * Cached by ['accounts', branch] — selecting a row does NOT refetch, and
 * switching branch serves the other branch's cached list immediately.
 */
export function useAccounts(branch: Branch) {
  return useQuery({
    queryKey: ["accounts", branch],
    queryFn: () => fetchAccounts(branch),
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
