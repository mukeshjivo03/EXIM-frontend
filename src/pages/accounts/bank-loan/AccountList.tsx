import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Banknote,
  ChevronRight,
  Landmark,
  PiggyBank,
  Search,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { accountKey, groupName, type Account } from "@/api/bankAccounts";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatMoney } from "./helpers";
import { CATEGORY_TINT, useChartPalette } from "./chartTheme";
import {
  displayCategory,
  displayCategoryLabel,
  groupAccounts,
  DISPLAY_CATEGORY_ORDER,
  type AccountGroup,
  type DisplayCategory,
  type SortKey,
} from "./grouping";
import { resolveBrand } from "./brands";
import BankLogo from "./BankLogo";
import { MagnitudeBar, Tag } from "./ui";
import { AccountListSkeleton, EmptyState, ErrorState } from "./states";

const SORT_LABELS: Record<SortKey, string> = {
  "balance-desc": "Balance · high → low",
  "balance-asc": "Balance · low → high",
  name: "Name · A → Z",
  code: "Account code",
};

const CATEGORY_ICONS: Record<DisplayCategory, typeof Landmark> = {
  Bank: Landmark,
  Wallet: Wallet,
  FD: PiggyBank,
  Loan: Banknote,
};

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
  const palette = useChartPalette();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<DisplayCategory>("Bank");
  const [sort, setSort] = useState<SortKey>("balance-desc");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Classify once — every downstream count, tab and group reads this.
  const classified = useMemo(
    () => accounts.map((a) => ({ account: a, category: displayCategory(a) })),
    [accounts]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return classified;
    return classified.filter(({ account: a }) =>
      [
        a.AcctName,
        a.AcctCode,
        a.U_Bank_Name,
        a.U_Account_Number,
        groupName(a),
        resolveBrand(a)?.name,
      ].some((v) => (v ?? "").toLowerCase().includes(q))
    );
  }, [classified, query]);

  const counts = useMemo(() => {
    const map = new Map<DisplayCategory, number>();
    for (const { category } of filtered) {
      map.set(category, (map.get(category) ?? 0) + 1);
    }
    return map;
  }, [filtered]);

  // Only offer tabs that actually hold accounts in this branch.
  const tabs = useMemo(() => {
    const present = new Set(classified.map((c) => c.category));
    return DISPLAY_CATEGORY_ORDER.filter((c) => present.has(c));
  }, [classified]);

  // Keep the active tab valid as the branch changes under it.
  useEffect(() => {
    if (tabs.length > 0 && !tabs.includes(activeTab)) setActiveTab(tabs[0]);
  }, [tabs, activeTab]);

  const groups = useMemo(() => {
    const rows = filtered
      .filter((c) => c.category === activeTab)
      .map((c) => c.account);
    return groupAccounts(rows, activeTab, sort);
  }, [filtered, activeTab, sort]);

  const searching = query.trim().length > 0;
  const rowCount = groups.reduce((sum, g) => sum + g.accounts.length, 0);

  // Every bar is scaled against the largest balance on screen, so bars stay
  // comparable across the groups in view.
  const maxAbs = useMemo(
    () =>
      Math.max(
        1,
        ...groups.flatMap((g) => g.accounts.map((a) => Math.abs(a.CurrTotal)))
      ),
    [groups]
  );

  const barColor = palette.category[activeTab];
  const Icon = CATEGORY_ICONS[activeTab];

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const allCollapsed = groups.length > 0 && groups.every((g) => collapsed.has(g.key));
  const setAll = (collapse: boolean) =>
    setCollapsed(collapse ? new Set(groups.map((g) => g.key)) : new Set());

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search account, code, bank or group…"
              className="pl-9"
              aria-label="Search accounts"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-full sm:w-[13.5rem]" aria-label="Sort accounts">
              <span className="flex min-w-0 items-center gap-2 truncate">
                <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" />
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {SORT_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div role="tablist" aria-label="Account category" className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const active = tab === activeTab;
              const count = counts.get(tab) ?? 0;
              const TabIcon = CATEGORY_ICONS[tab];
              return (
                <button
                  key={tab}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "btn-press inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <TabIcon className="size-3.5" />
                  {displayCategoryLabel(tab)}
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
          {groups.length > 1 && (
            <button
              type="button"
              onClick={() => setAll(!allCollapsed)}
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {allCollapsed ? "Expand all" : "Collapse all"}
            </button>
          )}
        </div>
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
        ) : groups.length === 0 ? (
          <EmptyState
            message={
              searching
                ? `No ${displayCategoryLabel(activeTab)} accounts match “${query}”`
                : `No ${displayCategoryLabel(activeTab)} accounts`
            }
          />
        ) : (
          <ul className="divide-y">
            {groups.map((group) => (
              <GroupBlock
                key={group.key}
                group={group}
                category={activeTab}
                categoryIcon={Icon}
                // A search is a request to see the matches, so it forces every
                // matching group open regardless of the collapsed state.
                open={searching || !collapsed.has(group.key)}
                onToggle={() => toggle(group.key)}
                maxAbs={maxAbs}
                barColor={barColor}
                track={palette.track}
                selectedKey={selectedKey}
                onSelect={onSelect}
                canSelect={canSelect}
                showBranch={showBranch}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Footer summary */}
      {!isLoading && !isError && groups.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground sm:px-4">
          <span>
            {groups.length} {groups.length === 1 ? "group" : "groups"} · {rowCount}{" "}
            {rowCount === 1 ? "account" : "accounts"}
            {searching ? ` · filtered from ${accounts.length}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── One institution / sub-group ──────────────────────────── */

function GroupBlock({
  group,
  category,
  categoryIcon: CategoryIcon,
  open,
  onToggle,
  maxAbs,
  barColor,
  track,
  selectedKey,
  onSelect,
  canSelect,
  showBranch,
}: {
  group: AccountGroup;
  category: DisplayCategory;
  categoryIcon: typeof Landmark;
  open: boolean;
  onToggle: () => void;
  maxAbs: number;
  barColor: string;
  track: string;
  selectedKey: string | null;
  onSelect?: (account: Account) => void;
  canSelect: boolean;
  showBranch: boolean;
}) {
  const count = group.accounts.length;

  return (
    <li>
      {/* Group header */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4"
      >
        <ChevronRight
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-90"
          )}
        />
        {group.brand ? (
          <BankLogo name={group.title} brand={group.brand} size="md" />
        ) : (
          <span
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
              CATEGORY_TINT[category]
            )}
          >
            <CategoryIcon className="size-4" />
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold">{group.title}</span>
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
              {count}
            </span>
          </span>
          {group.subtitle && (
            <span className="block truncate text-xs text-muted-foreground">
              {group.subtitle}
            </span>
          )}
        </span>

        <span className="shrink-0 text-right">
          <span className="block whitespace-nowrap font-semibold tabular-nums">
            {formatMoney(group.total, group.currency)}
          </span>
          {group.mixedCurrency && (
            <span className="block text-[10px] text-muted-foreground">
              {group.currency} shown · other currencies excluded
            </span>
          )}
        </span>
      </button>

      {/* Accounts */}
      {open && (
        <ul className="border-t bg-muted/20">
          {group.accounts.map((account) => {
            const key = accountKey(account);
            const active = key === selectedKey;
            const select = canSelect ? () => onSelect?.(account) : undefined;
            return (
              <li key={key}>
                <div
                  {...(select
                    ? {
                        role: "button",
                        onClick: select,
                        onKeyDown: (e: React.KeyboardEvent) => {
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
                    "group flex items-start gap-3 border-b border-border/50 py-2.5 pl-10 pr-3 text-sm transition-colors last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:pl-[3.75rem] sm:pr-4",
                    active
                      ? "bg-primary/10"
                      : canSelect
                        ? "cursor-pointer hover:bg-accent/60"
                        : ""
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {showBranch && <Tag>{account.sourceBranch}</Tag>}
                      <span className="truncate font-medium">{account.AcctName}</span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      <span className="font-mono">{account.AcctCode}</span>
                      {account.U_Account_Number && (
                        <span className="font-mono"> · A/C {account.U_Account_Number}</span>
                      )}
                      {account.U_IFSC && (
                        <span className="hidden font-mono sm:inline">
                          {" "}
                          · {account.U_IFSC}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-[10.5rem] shrink-0">
                    <div className="whitespace-nowrap text-right font-semibold tabular-nums">
                      {formatMoney(account.CurrTotal, account.ActCurr)}
                    </div>
                    <MagnitudeBar
                      className="mt-1.5"
                      ratio={Math.abs(account.CurrTotal) / maxAbs}
                      color={barColor}
                      track={track}
                    />
                  </div>

                  {canSelect && (
                    <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
