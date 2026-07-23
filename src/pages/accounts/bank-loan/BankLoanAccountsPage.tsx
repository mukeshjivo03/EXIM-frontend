import { useState } from "react";
import { type Account, type Branch } from "@/api/bankAccounts";
import { useAccounts } from "@/hooks/useBankAccounts";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import BranchToggle from "./BranchToggle";
import AccountList from "./AccountList";
import AccountDetail from "./AccountDetail";

export default function BankLoanAccountsPage() {
  const [branch, setBranch] = useState<Branch>("OIL");
  const [selected, setSelected] = useState<Account | null>(null);

  const {
    data: accounts = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useAccounts(branch);

  // Branch is a global control: switching it clears the detail panel.
  const handleBranchChange = (next: Branch) => {
    if (next === branch) return;
    setBranch(next);
    setSelected(null);
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      {/* Header */}
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
            Bank &amp; Loan Accounts
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Browse SAP bank, FD and loan accounts, and view the net movement for
            an account over a date range.
          </p>
        </div>
        <BranchToggle value={branch} onChange={handleBranchChange} />
      </header>

      {/* Full-width account list */}
      <section className="h-[calc(100dvh-9.5rem)] overflow-hidden rounded-xl border bg-card">
        <AccountList
          accounts={accounts}
          isLoading={isLoading}
          isError={isError}
          errorMessage={error?.message}
          onRetry={() => refetch()}
          selectedCode={selected?.AcctCode ?? null}
          onSelect={setSelected}
        />
      </section>

      {/* Right side-panel: date selector + net movement for the selected account */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent
          side="right"
          className="w-full gap-0 p-0 sm:max-w-md"
        >
          {selected && (
            <>
              <SheetTitle className="sr-only">
                {selected.AcctName} — Net Movement
              </SheetTitle>
              <AccountDetail
                key={selected.AcctCode}
                account={selected}
                branch={branch}
              />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
