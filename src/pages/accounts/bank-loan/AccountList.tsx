import { useMemo, useState, type KeyboardEvent } from "react";
import { Search } from "lucide-react";
import {
  CATEGORY_ORDER,
  categoryLabel,
  accountKey,
  type Account,
  type AccountCategory,
} from "@/api/bankAccounts";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatMoney } from "./helpers";
import { AccountListSkeleton, EmptyState, ErrorState } from "./states";

interface AccountListProps {
  accounts: Account[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  selectedKey: string | null;
  onSelect?: (account: Account) => void;
  /** When false, rows are read-only (user lacks the bank-closing permission). */
  canSelect?: boolean;
  /** When true (the "ALL" view), each row shows a branch badge. */
  showBranch?: boolean;
}

export default function AccountList({
  accounts,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  selectedKey,
  onSelect,
  canSelect = true,
  showBranch = false,
}: AccountListProps) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<AccountCategory>(CATEGORY_ORDER[0]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.AcctName.toLowerCase().includes(q) ||
        a.AcctCode.toLowerCase().includes(q)
    );
  }, [accounts, query]);

  // Per-category counts (post-search) to badge the tabs.
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of filtered) map.set(a.Category, (map.get(a.Category) ?? 0) + 1);
    return map;
  }, [filtered]);

  // Any categories beyond the known three (defensive).
  const extraCats = useMemo(
    () =>
      [...new Set(accounts.map((a) => a.Category))].filter(
        (c) => !CATEGORY_ORDER.includes(c)
      ),
    [accounts]
  );
  const tabs = useMemo<AccountCategory[]>(
    () => [...CATEGORY_ORDER, ...extraCats],
    [extraCats]
  );

  const rows = useMemo(
    () => filtered.filter((a) => a.Category === activeTab),
    [filtered, activeTab]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="border-b p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or code…"
            className="pl-9"
            aria-label="Search accounts"
          />
        </div>
      </div>

      {/* Category tabs — bubble stickers */}
      <div
        role="tablist"
        aria-label="Account category"
        className="flex flex-wrap gap-2 border-b p-3"
      >
        {tabs.map((tab) => {
          const active = tab === activeTab;
          const count = counts.get(tab) ?? 0;
          return (
            <button
              key={tab}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-primary/25"
                  : "border-border bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {categoryLabel(tab)}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                  active
                    ? "bg-white/20 text-primary-foreground"
                    : "bg-background text-muted-foreground"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Body — independent states */}
      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <AccountListSkeleton />
        ) : isError ? (
          <ErrorState
            message={errorMessage ?? "Failed to load accounts."}
            onRetry={onRetry}
          />
        ) : accounts.length === 0 ? (
          <EmptyState message="No accounts for this branch" />
        ) : rows.length === 0 ? (
          <EmptyState
            message={
              query.trim()
                ? `No ${categoryLabel(activeTab)} accounts match “${query}”`
                : `No ${categoryLabel(activeTab)} accounts`
            }
          />
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
              <tr className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                {showBranch && (
                  <th className="px-3 py-2.5 text-left font-semibold">Branch</th>
                )}
                <th className="px-3 py-2.5 text-left font-semibold">Account</th>
                <th className="px-3 py-2.5 text-left font-semibold">Bank</th>
                <th className="px-3 py-2.5 text-right font-semibold">
                  Current Balance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((account) => {
                const key = accountKey(account);
                const active = key === selectedKey;
                const select = canSelect ? () => onSelect?.(account) : undefined;
                return (
                  <tr
                    key={key}
                    {...(select
                      ? {
                          onClick: select,
                          onKeyDown: (e: KeyboardEvent) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              select();
                            }
                          },
                          tabIndex: 0,
                          "aria-current": active,
                        }
                      : {})}
                    className={cn(
                      "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      active
                        ? "bg-primary/10"
                        : canSelect
                          ? "cursor-pointer hover:bg-accent"
                          : ""
                    )}
                  >
                    {showBranch && (
                      <td className="px-3 py-2.5 align-top">
                        <span className="inline-flex rounded-full border bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {account.sourceBranch}
                        </span>
                      </td>
                    )}
                    <td className="px-3 py-2.5 align-top">
                      <div className="truncate font-medium">{account.AcctName}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {account.AcctCode}
                      </div>
                    </td>
                    <td className="max-w-[10rem] truncate px-3 py-2.5 align-top text-muted-foreground">
                      {account.U_Bank_Name || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right align-top font-medium tabular-nums">
                      {formatMoney(account.CurrTotal, account.ActCurr)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
