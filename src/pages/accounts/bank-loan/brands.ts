/**
 * Bank & wallet brand registry.
 *
 * SAP gives us a free-text `U_Bank_Name` (and an account name), not a brand id,
 * so identity is resolved by matching known aliases against that text. Each
 * brand carries:
 *   - `domain`  — used to fetch the official logo from the logo CDN
 *   - `slug`    — used for a self-hosted override at `/logos/<slug>.svg`
 *   - `color`   — the brand colour, used for the monogram badge when no logo
 *                 loads. It is chrome for an already-labelled row, never a data
 *                 mark, so it sits outside the validated chart palette.
 *
 * Adding a bank is a one-line entry — no other file needs to change.
 */

export type BrandKind = "bank" | "wallet";

export interface Brand {
  slug: string;
  name: string;
  domain: string;
  color: string;
  kind: BrandKind;
  /** Lower-case aliases matched against the SAP text, longest first. */
  aliases: string[];
}

/* ── Registry ─────────────────────────────────────────────── */

const BANKS: Brand[] = [
  { slug: "sbi", name: "State Bank of India", domain: "sbi.co.in", color: "#22409a", kind: "bank", aliases: ["state bank of india", "state bank", "sbi"] },
  { slug: "icici", name: "ICICI Bank", domain: "icicibank.com", color: "#af272f", kind: "bank", aliases: ["icici bank", "icici"] },
  { slug: "hdfc", name: "HDFC Bank", domain: "hdfcbank.com", color: "#004c8f", kind: "bank", aliases: ["hdfc bank", "hdfc"] },
  { slug: "axis", name: "Axis Bank", domain: "axisbank.com", color: "#97144d", kind: "bank", aliases: ["axis bank", "axis"] },
  { slug: "kotak", name: "Kotak Mahindra Bank", domain: "kotak.com", color: "#ed1c24", kind: "bank", aliases: ["kotak mahindra bank", "kotak mahindra", "kotak"] },
  { slug: "yes", name: "Yes Bank", domain: "yesbank.in", color: "#00518f", kind: "bank", aliases: ["yes bank"] },
  { slug: "indusind", name: "IndusInd Bank", domain: "indusind.com", color: "#98272b", kind: "bank", aliases: ["indusind bank", "indusind"] },
  { slug: "pnb", name: "Punjab National Bank", domain: "pnbindia.in", color: "#a4123f", kind: "bank", aliases: ["punjab national bank", "pnb"] },
  { slug: "bob", name: "Bank of Baroda", domain: "bankofbaroda.in", color: "#f15a22", kind: "bank", aliases: ["bank of baroda", "bob"] },
  { slug: "canara", name: "Canara Bank", domain: "canarabank.com", color: "#00539f", kind: "bank", aliases: ["canara bank", "canara"] },
  { slug: "union", name: "Union Bank of India", domain: "unionbankofindia.co.in", color: "#c8102e", kind: "bank", aliases: ["union bank of india", "union bank"] },
  { slug: "idbi", name: "IDBI Bank", domain: "idbibank.in", color: "#006241", kind: "bank", aliases: ["idbi bank", "idbi"] },
  { slug: "idfc", name: "IDFC First Bank", domain: "idfcfirstbank.com", color: "#9c1d26", kind: "bank", aliases: ["idfc first bank", "idfc first", "idfc"] },
  { slug: "federal", name: "Federal Bank", domain: "federalbank.co.in", color: "#003a70", kind: "bank", aliases: ["federal bank", "federal"] },
  { slug: "rbl", name: "RBL Bank", domain: "rblbank.com", color: "#8c2332", kind: "bank", aliases: ["rbl bank", "rbl", "ratnakar bank"] },
  { slug: "bandhan", name: "Bandhan Bank", domain: "bandhanbank.com", color: "#a6192e", kind: "bank", aliases: ["bandhan bank", "bandhan"] },
  { slug: "au", name: "AU Small Finance Bank", domain: "aubank.in", color: "#5f259f", kind: "bank", aliases: ["au small finance bank", "au small finance", "au bank"] },
  { slug: "indian-bank", name: "Indian Bank", domain: "indianbank.in", color: "#00447c", kind: "bank", aliases: ["indian bank"] },
  { slug: "central", name: "Central Bank of India", domain: "centralbankofindia.co.in", color: "#5c2d91", kind: "bank", aliases: ["central bank of india", "central bank"] },
  { slug: "uco", name: "UCO Bank", domain: "ucobank.com", color: "#004a8f", kind: "bank", aliases: ["uco bank", "uco"] },
  { slug: "boi", name: "Bank of India", domain: "bankofindia.co.in", color: "#f37021", kind: "bank", aliases: ["bank of india", "boi"] },
  { slug: "bom", name: "Bank of Maharashtra", domain: "bankofmaharashtra.in", color: "#00539b", kind: "bank", aliases: ["bank of maharashtra", "mahabank"] },
  { slug: "kvb", name: "Karur Vysya Bank", domain: "kvb.co.in", color: "#00a0af", kind: "bank", aliases: ["karur vysya bank", "karur vysya", "kvb"] },
  { slug: "sib", name: "South Indian Bank", domain: "southindianbank.com", color: "#00539f", kind: "bank", aliases: ["south indian bank"] },
  { slug: "cub", name: "City Union Bank", domain: "cityunionbank.com", color: "#00693e", kind: "bank", aliases: ["city union bank", "cub"] },
  { slug: "dcb", name: "DCB Bank", domain: "dcbbank.com", color: "#00447c", kind: "bank", aliases: ["dcb bank", "dcb"] },
  { slug: "karnataka", name: "Karnataka Bank", domain: "karnatakabank.com", color: "#c8102e", kind: "bank", aliases: ["karnataka bank"] },
  { slug: "jk", name: "J&K Bank", domain: "jkbank.com", color: "#8c1d40", kind: "bank", aliases: ["jammu and kashmir bank", "jammu & kashmir bank", "j&k bank", "jk bank"] },
  { slug: "psb", name: "Punjab & Sind Bank", domain: "punjabandsindbank.co.in", color: "#a6192e", kind: "bank", aliases: ["punjab and sind bank", "punjab & sind bank"] },
  { slug: "saraswat", name: "Saraswat Bank", domain: "saraswatbank.com", color: "#00539f", kind: "bank", aliases: ["saraswat bank", "saraswat"] },
  { slug: "equitas", name: "Equitas Small Finance Bank", domain: "equitasbank.com", color: "#7b2682", kind: "bank", aliases: ["equitas small finance bank", "equitas"] },
  { slug: "ujjivan", name: "Ujjivan Small Finance Bank", domain: "ujjivansfb.in", color: "#e4002b", kind: "bank", aliases: ["ujjivan small finance bank", "ujjivan"] },
  { slug: "scb", name: "Standard Chartered", domain: "sc.com", color: "#0473ea", kind: "bank", aliases: ["standard chartered", "stanchart", "scb"] },
  { slug: "hsbc", name: "HSBC", domain: "hsbc.co.in", color: "#db0011", kind: "bank", aliases: ["hsbc"] },
  { slug: "citi", name: "Citibank", domain: "citibank.co.in", color: "#004685", kind: "bank", aliases: ["citibank", "citi bank", "citi"] },
  { slug: "deutsche", name: "Deutsche Bank", domain: "db.com", color: "#0018a8", kind: "bank", aliases: ["deutsche bank", "deutsche"] },
  { slug: "dbs", name: "DBS Bank", domain: "dbs.com", color: "#ff0000", kind: "bank", aliases: ["dbs bank", "dbs"] },
  { slug: "barclays", name: "Barclays", domain: "barclays.in", color: "#00aeef", kind: "bank", aliases: ["barclays"] },
  { slug: "ippb", name: "India Post Payments Bank", domain: "ippbonline.com", color: "#c8102e", kind: "bank", aliases: ["india post payments bank", "india post", "ippb"] },
];

const WALLETS: Brand[] = [
  { slug: "paytm", name: "Paytm", domain: "paytm.com", color: "#00baf2", kind: "wallet", aliases: ["paytm payments bank", "paytm"] },
  { slug: "razorpay", name: "Razorpay", domain: "razorpay.com", color: "#3395ff", kind: "wallet", aliases: ["razorpay", "razor pay"] },
  { slug: "phonepe", name: "PhonePe", domain: "phonepe.com", color: "#5f259f", kind: "wallet", aliases: ["phonepe", "phone pe"] },
  { slug: "gpay", name: "Google Pay", domain: "pay.google.com", color: "#4285f4", kind: "wallet", aliases: ["google pay", "gpay", "g pay"] },
  { slug: "amazonpay", name: "Amazon Pay", domain: "amazon.in", color: "#ff9900", kind: "wallet", aliases: ["amazon pay", "amazonpay"] },
  { slug: "mobikwik", name: "MobiKwik", domain: "mobikwik.com", color: "#2c3e94", kind: "wallet", aliases: ["mobikwik", "mobi kwik"] },
  { slug: "freecharge", name: "Freecharge", domain: "freecharge.in", color: "#f6821f", kind: "wallet", aliases: ["freecharge", "free charge"] },
  { slug: "payu", name: "PayU", domain: "payu.in", color: "#a4c639", kind: "wallet", aliases: ["payu money", "payumoney", "payu"] },
  { slug: "cashfree", name: "Cashfree", domain: "cashfree.com", color: "#6933ff", kind: "wallet", aliases: ["cashfree", "cash free"] },
  { slug: "billdesk", name: "BillDesk", domain: "billdesk.com", color: "#00a0e3", kind: "wallet", aliases: ["billdesk", "bill desk"] },
  { slug: "ccavenue", name: "CCAvenue", domain: "ccavenue.com", color: "#e2231a", kind: "wallet", aliases: ["ccavenue", "cc avenue"] },
  { slug: "instamojo", name: "Instamojo", domain: "instamojo.com", color: "#00b9f5", kind: "wallet", aliases: ["instamojo", "insta mojo"] },
  { slug: "airtel-money", name: "Airtel Payments Bank", domain: "airtel.in", color: "#e40000", kind: "wallet", aliases: ["airtel payments bank", "airtel money", "airtel"] },
  { slug: "jio", name: "Jio Payments", domain: "jio.com", color: "#0f3cc9", kind: "wallet", aliases: ["jio payments bank", "jiomoney", "jio money"] },
  { slug: "pinelabs", name: "Pine Labs", domain: "pinelabs.com", color: "#00a5a0", kind: "wallet", aliases: ["pine labs", "pinelabs"] },
  { slug: "easebuzz", name: "Easebuzz", domain: "easebuzz.in", color: "#00aeef", kind: "wallet", aliases: ["easebuzz", "ease buzz"] },
  { slug: "juspay", name: "Juspay", domain: "juspay.in", color: "#2d5be3", kind: "wallet", aliases: ["juspay", "jus pay"] },
  { slug: "fino", name: "Fino Payments Bank", domain: "finobank.com", color: "#f37021", kind: "wallet", aliases: ["fino payments bank", "fino"] },
];

export const BRANDS: Brand[] = [...BANKS, ...WALLETS];

/**
 * Alias index, longest alias first, so "bank of india" wins over "boi" and
 * "central bank of india" is never swallowed by "bank of india".
 */
const ALIAS_INDEX: { alias: string; brand: Brand }[] = BRANDS.flatMap((brand) =>
  brand.aliases.map((alias) => ({ alias, brand }))
).sort((a, b) => b.alias.length - a.alias.length);

/** Collapse punctuation/spacing so "ICICI-BANK LTD." matches "icici bank". */
function normalise(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9&]+/g, " ").trim()} `;
}

/** True when `alias` appears in `haystack` on word boundaries. */
function containsAlias(haystack: string, alias: string): boolean {
  return haystack.includes(` ${normalise(alias).trim()} `);
}

/**
 * Resolve a brand from whatever text SAP gives us. `U_Bank_Name` is the most
 * reliable signal, so it is tried first; the account name is the fallback for
 * rows where the UDF was never filled in.
 */
export function resolveBrand(account: {
  U_Bank_Name?: string | null;
  AcctName?: string | null;
}): Brand | null {
  for (const source of [account.U_Bank_Name, account.AcctName]) {
    const text = (source ?? "").trim();
    if (!text) continue;
    const haystack = normalise(text);
    for (const { alias, brand } of ALIAS_INDEX) {
      if (containsAlias(haystack, alias)) return brand;
    }
  }
  return null;
}

/** Up-to-two-letter monogram for a brand or free-text bank name. */
export function monogram(name: string): string {
  const words = name
    .replace(/[^A-Za-z0-9 &]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !/^(bank|of|the|ltd|limited|india|co|pvt|&)$/i.test(w));
  if (words.length === 0) return name.slice(0, 2).toUpperCase() || "??";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Deterministic fallback colour for an unrecognised bank, so the same name
 * always gets the same badge instead of flickering between renders.
 */
export function fallbackColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  // Mid-lightness, mid-chroma band — readable in both themes.
  return `hsl(${hash % 360} 45% 38%)`;
}
