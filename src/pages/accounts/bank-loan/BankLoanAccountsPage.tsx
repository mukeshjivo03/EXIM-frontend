import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Banknote, Landmark, PiggyBank } from "lucide-react";
import {
  categoryLabel,
  type Account,
  type AccountCategory,
  type BranchFilter,
} from "@/api/bankAccounts";
import { useAccounts } from "@/hooks/useBankAccounts";
import { useHasPermission } from "@/hooks/useHasPermission";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import BranchToggle from "./BranchToggle";
import AccountList from "./AccountList";
import { accountCategoryKpis, formatMoney, type CategoryKpi } from "./helpers";

const CATEGORY_ICONS: Record<AccountCategory, typeof Landmark> = {
  Bank: Landmark,
  FD: PiggyBank,
  Loan: Banknote,
};

const CATEGORY_ACCENT: Record<AccountCategory, string> = {
  Bank: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  FD: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  Loan: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function BankLoanAccountsPage() {
  const navigate = useNavigate();
  const { hasPermission } = useHasPermission();
  // "view_bank_closing" gates the ledger (date-range net-movement) view.
  const canViewClosing = hasPermission("bank_closing");

  const [branch, setBranch] = useState<BranchFilter>("OIL");

  const {
    data: accounts = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useAccounts(branch);

  const kpis = useMemo(() => accountCategoryKpis(accounts), [accounts]);

  const handleBranchChange = (next: BranchFilter) => {
    if (next === branch) return;
    setBranch(next);
  };

  // Selecting an account opens its full ledger view; the account is passed via
  // router state so the ledger page renders instantly without a re-fetch.
  const openLedger = (account: Account) => {
    navigate(
      `/accounts/bank-loan/ledger/${account.sourceBranch}/${encodeURIComponent(
        account.AcctCode
      )}`,
      { state: { account } }
    );
  };

  return (
    <div className="flex w-full flex-col gap-4 p-4 sm:p-6">
      {/* Header */}
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
            Bank &amp; Loan Accounts
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Browse SAP bank, FD and loan accounts, and open an account to view its
            ledger over a date range.
          </p>
        </div>
        <BranchToggle value={branch} onChange={handleBranchChange} />
      </header>

      {/* Per-category KPI cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))
          : kpis.map((kpi) => <CategoryKpiCard key={kpi.category} kpi={kpi} />)}
      </div>

      {/* Full-width account list */}
      <section className="h-[calc(100dvh-19rem)] min-h-[22rem] w-full overflow-hidden rounded-xl border bg-card">
        <AccountList
          accounts={accounts}
          isLoading={isLoading}
          isError={isError}
          errorMessage={error?.message}
          onRetry={() => refetch()}
          selectedKey={null}
          onSelect={canViewClosing ? openLedger : undefined}
          canSelect={canViewClosing}
          showBranch={branch === "ALL"}
        />
      </section>
    </div>
  );
}

/* ── Category KPI card ────────────────────────────────────── */

function CategoryKpiCard({ kpi }: { kpi: CategoryKpi }) {
  const Icon = CATEGORY_ICONS[kpi.category];
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-lg",
          CATEGORY_ACCENT[kpi.category]
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{categoryLabel(kpi.category)}</p>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
            {kpi.count}
          </span>
        </div>
        <p
          className="mt-0.5 truncate text-lg font-bold tabular-nums"
          title={formatMoney(kpi.total, kpi.currency)}
        >
          {formatMoney(kpi.total, kpi.currency)}
        </p>
        {kpi.mixedCurrency && (
          <p className="text-[10px] text-muted-foreground">
            {kpi.currency} shown · other currencies excluded
          </p>
        )}
      </div>
    </div>
  );
}
