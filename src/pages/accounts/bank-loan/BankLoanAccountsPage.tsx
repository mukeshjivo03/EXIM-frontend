import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Banknote, Landmark, Lock, PiggyBank, Scale, Wallet } from "lucide-react";
import { type Account, type BranchFilter } from "@/api/bankAccounts";
import { useAccounts } from "@/hooks/useBankAccounts";
import { useHasPermission } from "@/hooks/useHasPermission";
import { Skeleton } from "@/components/ui/skeleton";
import BranchToggle from "./BranchToggle";
import AccountList from "./AccountList";
import { formatMoney, portfolioSummary } from "./helpers";
import { CATEGORY_TINT, useChartPalette } from "./chartTheme";
import {
  displayCategoryLabel,
  DISPLAY_CATEGORY_ORDER,
  type DisplayCategory,
} from "./grouping";
import {
  CompositionMeter,
  LegendRow,
  MagnitudeBar,
  PageHeader,
  SectionCard,
  StatTile,
} from "./ui";

const CATEGORY_ICONS: Record<DisplayCategory, typeof Landmark> = {
  Bank: Landmark,
  Wallet: Wallet,
  FD: PiggyBank,
  Loan: Banknote,
};

export default function BankLoanAccountsPage() {
  const navigate = useNavigate();
  const { hasPermission } = useHasPermission();
  // "view_bank_closing" gates the ledger (date-range net-movement) view.
  const canViewClosing = hasPermission("bank_closing");
  const palette = useChartPalette();

  const [branch, setBranch] = useState<BranchFilter>("OIL");

  const {
    data: accounts = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useAccounts(branch);

  const summary = useMemo(() => portfolioSummary(accounts), [accounts]);

  // Only tile the categories this branch actually holds — a branch with no
  // wallet accounts shouldn't show an empty Wallets card.
  const presentCategories = useMemo(
    () => DISPLAY_CATEGORY_ORDER.filter((c) => summary.byCategory[c].count > 0),
    [summary]
  );

  // Category shares are measured against gross magnitude, so a loan (a
  // liability) still contributes its full weight to the mix.
  const grossTotal = useMemo(
    () =>
      DISPLAY_CATEGORY_ORDER.reduce(
        (sum, c) => sum + Math.abs(summary.byCategory[c].total),
        0
      ),
    [summary]
  );

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
    <div className="animate-page flex w-full flex-col gap-5 p-4 sm:p-6">
      <PageHeader
        icon={Landmark}
        title="Bank & Loan Accounts"
        description="Bank, wallet, FD and loan accounts grouped by institution and SAP group. Open an account to read its ledger over any date range."
        actions={<BranchToggle value={branch} onChange={handleBranchChange} />}
      />

      {/* Category KPIs + net position */}
      <div
        className={cnGrid(presentCategories.length + 1)}
      >
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[7.5rem] rounded-xl" />
          ))
        ) : (
          <>
            {presentCategories.map((category) => {
              const { count, total } = summary.byCategory[category];
              const share = grossTotal > 0 ? Math.abs(total) / grossTotal : 0;
              return (
                <StatTile
                  key={category}
                  label={displayCategoryLabel(category)}
                  value={formatMoney(total, summary.currency)}
                  hint={`${count} ${count === 1 ? "account" : "accounts"} · ${(share * 100).toFixed(0)}% of portfolio`}
                  icon={CATEGORY_ICONS[category]}
                  chipClassName={CATEGORY_TINT[category]}
                  footer={
                    <MagnitudeBar
                      ratio={share}
                      color={palette.category[category]}
                      track={palette.track}
                    />
                  }
                />
              );
            })}
            <StatTile
              label="Net Position"
              value={formatMoney(summary.net, summary.currency)}
              hint={
                summary.excludedAccounts > 0
                  ? `${summary.currency} only · ${summary.excludedAccounts} account${summary.excludedAccounts === 1 ? "" : "s"} in other currencies excluded`
                  : `Assets − loans · ${summary.currency}`
              }
              icon={Scale}
              tone={summary.net >= 0 ? "positive" : "negative"}
              footer={
                <div className="space-y-1.5">
                  <CompositionMeter
                    segments={presentCategories.map((c) => ({
                      key: c,
                      label: displayCategoryLabel(c),
                      value: summary.byCategory[c].total,
                      color: palette.category[c],
                    }))}
                  />
                  <LegendRow
                    className="gap-x-2.5"
                    items={presentCategories.map((c) => ({
                      key: c,
                      label: displayCategoryLabel(c),
                      color: palette.category[c],
                    }))}
                  />
                </div>
              }
            />
          </>
        )}
      </div>

      {/* Account list */}
      <SectionCard
        flush
        title="Accounts"
        description={
          canViewClosing
            ? "Grouped by bank, wallet provider or SAP loan group — select an account to open its ledger."
            : "Read-only — opening an account ledger needs the bank-closing permission."
        }
        action={
          !canViewClosing ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              <Lock className="size-3" />
              Read-only
            </span>
          ) : undefined
        }
        bodyClassName="h-[calc(100dvh-27rem)] min-h-[26rem]"
      >
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
      </SectionCard>
    </div>
  );
}

/** Tile grid that widens with the number of categories the branch holds. */
function cnGrid(tiles: number): string {
  const wide =
    tiles >= 5
      ? "xl:grid-cols-5"
      : tiles === 4
        ? "xl:grid-cols-4"
        : "xl:grid-cols-3";
  return `grid grid-cols-1 gap-3 sm:grid-cols-2 ${wide}`;
}
