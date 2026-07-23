import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  CATEGORY_ORDER,
  categoryLabel,
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
  selectedCode: string | null;
  onSelect?: (account: Account) => void;
  /** When false, rows are read-only (user lacks the bank-closing permission). */
  canSelect?: boolean;
}

export default function AccountList({
  accounts,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  selectedCode,
  onSelect,
  canSelect = true,
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

      {/* Category tabs */}
      <div role="tablist" aria-label="Account category" className="flex border-b">
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
                "flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {categoryLabel(tab)}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs",
                  active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
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
          <ul className="space-y-1 p-2">
            {rows.map((account) => {
              const active = account.AcctCode === selectedCode;
              const Row = canSelect ? "button" : "div";
              return (
                <li key={account.AcctCode}>
                  <Row
                    {...(canSelect
                      ? { type: "button" as const, onClick: () => onSelect?.(account), "aria-current": active }
                      : {})}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                      canSelect
                        ? active
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "cursor-pointer border-transparent hover:border-border hover:bg-accent"
                        : "border-transparent"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {account.AcctName}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {account.AcctCode}
                        {account.U_Bank_Name ? ` · ${account.U_Bank_Name}` : ""}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-medium tabular-nums">
                        {formatMoney(account.CurrTotal, account.ActCurr)}
                      </div>
                      <div className="text-xs text-muted-foreground">Current balance</div>
                    </div>
                  </Row>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
