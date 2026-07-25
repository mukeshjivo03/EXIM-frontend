/**
 * Display categories and account grouping.
 *
 * SAP classifies these accounts by `FatherNum` (the OACT parent group). The
 * backend collapses those codes into three categories — Bank / FD / Loan — but
 * the Bank family actually holds two very different things: real bank accounts
 * and payment wallets (Paytm, Razorpay…). We split them apart here, driven by
 * the SAP group NAME rather than a hard-coded account code, so the UI follows
 * SAP if the chart of accounts is re-organised.
 */

import { groupName, type Account, type AccountCategory } from "@/api/bankAccounts";
import { resolveBrand, type Brand } from "./brands";

export type DisplayCategory = "Bank" | "Wallet" | "FD" | "Loan";

export const DISPLAY_CATEGORY_ORDER: DisplayCategory[] = [
  "Bank",
  "Wallet",
  "FD",
  "Loan",
];

export const DISPLAY_CATEGORY_LABELS: Record<DisplayCategory, string> = {
  Bank: "Bank",
  Wallet: "Wallets",
  FD: "FDR",
  Loan: "Loans",
};

export function displayCategoryLabel(category: DisplayCategory): string {
  return DISPLAY_CATEGORY_LABELS[category] ?? category;
}

/** Categories that add to the asset side; Loan is the only liability. */
export const ASSET_CATEGORIES: DisplayCategory[] = ["Bank", "Wallet", "FD"];

/** SAP group names that mark a wallet / payment-gateway group. */
const WALLET_GROUP = /\b(wallet|wallets|e-?wallet|prepaid|payment\s*gateway)\b/i;

/**
 * Which tab an account belongs under.
 *
 * The SAP group name decides first — if the chart of accounts calls the group
 * "Wallets", that is authoritative. Only when the group name is silent do we
 * fall back to recognising the brand itself, which covers wallet accounts
 * filed under a generic "Bank Accounts" group.
 */
export function displayCategory(row: {
  Category: AccountCategory;
  GroupName?: string | null;
  FatherNum?: string | null;
  U_Bank_Name?: string | null;
  AcctName?: string | null;
}): DisplayCategory {
  if (row.Category === "FD") return "FD";
  if (row.Category === "Loan") return "Loan";

  if (WALLET_GROUP.test(groupName(row))) return "Wallet";
  if (row.U_Bank_Name || row.AcctName) {
    const brand = resolveBrand(row);
    if (brand?.kind === "wallet") return "Wallet";
  }
  return "Bank";
}

/* ── Grouping ─────────────────────────────────────────────── */

export type SortKey = "balance-desc" | "balance-asc" | "name" | "code";

export interface AccountGroup {
  key: string;
  /** "ICICI Bank", "Paytm", "Vehicle Loans"… */
  title: string;
  /** Secondary line — the SAP group, or the bank mix for a loan sub-group. */
  subtitle: string | null;
  /** Brand for the logo; null when the group has no single brand. */
  brand: Brand | null;
  accounts: Account[];
  total: number;
  currency: string;
  /** True when the group holds more than one currency (so `total` is partial). */
  mixedCurrency: boolean;
}

function sortAccounts(accounts: Account[], sort: SortKey): Account[] {
  const rows = [...accounts];
  switch (sort) {
    case "balance-desc":
      return rows.sort((a, b) => Math.abs(b.CurrTotal) - Math.abs(a.CurrTotal));
    case "balance-asc":
      return rows.sort((a, b) => Math.abs(a.CurrTotal) - Math.abs(b.CurrTotal));
    case "name":
      return rows.sort((a, b) => a.AcctName.localeCompare(b.AcctName));
    case "code":
      return rows.sort((a, b) => a.AcctCode.localeCompare(b.AcctCode));
  }
}

/** Tidy a free-text SAP bank name for use as a group heading. */
function cleanBankName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").replace(/[.,;:]+$/, "");
}

/**
 * Group a category's accounts for display.
 *
 * - Bank / Wallet / FDR group by **institution** — every ICICI account under
 *   one ICICI heading — because that is how the money is actually held.
 * - Loans group by **SAP sub-group** (Term Loans, Vehicle Loans, Director
 *   Loans…), because the kind of borrowing matters more than the lender; a
 *   sub-group still shows a logo when every loan in it is from one lender.
 */
export function groupAccounts(
  accounts: Account[],
  category: DisplayCategory,
  sort: SortKey = "balance-desc"
): AccountGroup[] {
  const buckets = new Map<string, { title: string; rows: Account[] }>();

  for (const account of accounts) {
    let key: string;
    let title: string;

    if (category === "Loan") {
      title = groupName(account);
      key = `group:${account.FatherNum || title}`;
    } else {
      const brand = resolveBrand(account);
      if (brand) {
        key = `brand:${brand.slug}`;
        title = brand.name;
      } else {
        const raw = cleanBankName(account.U_Bank_Name ?? "");
        key = raw ? `name:${raw.toLowerCase()}` : "other";
        title = raw || "Other accounts";
      }
    }

    const bucket = buckets.get(key) ?? { title, rows: [] };
    bucket.rows.push(account);
    buckets.set(key, bucket);
  }

  const groups: AccountGroup[] = [...buckets.entries()].map(([key, bucket]) => {
    const rows = sortAccounts(bucket.rows, sort);
    const currencies = new Set(rows.map((a) => a.ActCurr || "INR"));
    const currency = rows[0]?.ActCurr || "INR";
    const total = rows
      .filter((a) => (a.ActCurr || "INR") === currency)
      .reduce((sum, a) => sum + a.CurrTotal, 0);

    // A loan sub-group borrows its logo from its lender, but only when every
    // account in it agrees — otherwise the mark would misrepresent the group.
    const brands = rows.map((a) => resolveBrand(a));
    const first = brands[0];
    const singleBrand =
      first && brands.every((b) => b?.slug === first.slug) ? first : null;

    let subtitle: string | null = null;
    if (category === "Loan") {
      const lenders = new Set(
        rows.map((a) => resolveBrand(a)?.name ?? cleanBankName(a.U_Bank_Name ?? ""))
      );
      lenders.delete("");
      subtitle =
        lenders.size === 1
          ? [...lenders][0]
          : lenders.size > 1
            ? `${lenders.size} lenders`
            : null;
    } else {
      const sapGroups = new Set(rows.map((a) => groupName(a)));
      subtitle = sapGroups.size === 1 ? [...sapGroups][0] : null;
    }

    return {
      key,
      title: bucket.title,
      subtitle,
      brand: singleBrand,
      accounts: rows,
      total,
      currency,
      mixedCurrency: currencies.size > 1,
    };
  });

  // Biggest holding first; unrecognised accounts always sink to the bottom.
  return groups.sort((a, b) => {
    if (a.key === "other" !== (b.key === "other")) return a.key === "other" ? 1 : -1;
    return Math.abs(b.total) - Math.abs(a.total);
  });
}
