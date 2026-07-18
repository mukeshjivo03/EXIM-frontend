import type { PackColorScheme } from "@/components/PackIcon";

export function fmtINR(v: number, decimals = 2): string {
  return v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Parse "Pouch 750 Gm" / "Bottle 1 Ltr" / "15 Kg Tin" → normalized quantity. */
export function parsePackSize(label: string): { qty: number; unit: "kg" | "L" } | null {
  const m = label.match(/([\d.]+)\s*(kg|gm|g|ltr|litre|l|ml)/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = m[2].toLowerCase();
  if (unit === "g" || unit === "gm") return { qty: n / 1000, unit: "kg" };
  if (unit === "ml") return { qty: n / 1000, unit: "L" };
  if (unit === "kg") return { qty: n, unit: "kg" };
  return { qty: n, unit: "L" };
}

/** "≈ ₹174.27 / kg" comparison line; null when the pack size can't be parsed. */
export function normalizedRateLabel(rate: number, packLabel: string): string | null {
  const size = parsePackSize(packLabel);
  if (!size) return null;
  return `≈ ₹${fmtINR(rate / size.qty)} / ${size.unit}`;
}

/** Per-commodity illustration colors: soya teal, mustard amber, sunflower yellow, cotton gray, ricebran coral. */
export function commodityScheme(commodity: string): PackColorScheme {
  const c = commodity.toLowerCase();
  if (c.includes("soya")) return { base: "#14b8a6", dark: "#0f766e", light: "#99f6e4" };
  if (c.includes("mustard")) return { base: "#f59e0b", dark: "#b45309", light: "#fde68a" };
  if (c.includes("sunflower")) return { base: "#eab308", dark: "#a16207", light: "#fef08a" };
  if (c.includes("cotton")) return { base: "#64748b", dark: "#475569", light: "#cbd5e1" };
  if (c.includes("ricebran") || c.includes("rice bran")) return { base: "#fb7185", dark: "#be123c", light: "#fecdd3" };
  return { base: "#0ea5e9", dark: "#0369a1", light: "#bae6fd" };
}
