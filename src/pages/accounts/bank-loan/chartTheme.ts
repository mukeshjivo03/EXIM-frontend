/**
 * Colour tokens for the Bank & Loan charts and data bars.
 *
 * Both modes are *selected* — the dark column is the same hues re-stepped for
 * the dark card surface, not an automatic flip. Every set was checked against
 * this app's own card surfaces (light `oklch(0.99 0.01 210)` ≈ #f5feff, dark
 * `oklch(0.12 0.03 215)` ≈ #00080c) on the all-pairs list:
 *
 *   category  light: worst pair ΔE 9.2 (CVD) / 19.8 (normal), all ≥ 3:1
 *             dark:  worst pair ΔE 7.5 (CVD) / 17.0 (normal), all ≥ 3:1
 *   flow      light: worst pair ΔE 8.6 (CVD) / 27.2 (normal), all ≥ 3:1
 *             dark:  worst pair ΔE 9.6 (CVD) / 24.0 (normal), all ≥ 3:1
 *
 * The dark category set sits in the 6–8 CVD band, which is only legal with a
 * secondary encoding — so every category mark in this feature ships with its
 * own icon and a direct label, and colour never carries meaning alone.
 *
 * HTML bars are painted from these same values inline (rather than Tailwind
 * classes) so a meter and the chart beside it can never drift apart.
 */

import { useTheme } from "@/context/ThemeContext";
import type { DisplayCategory } from "./grouping";

export interface ChartPalette {
  /** Identity colours for the four account categories. */
  category: Record<DisplayCategory, string>;
  /** Polarity colours for money movement. */
  flow: { in: string; out: string; net: string };
  /** Recessive chart chrome. */
  grid: string;
  /** Neutral track behind a meter. */
  track: string;
}

const LIGHT: ChartPalette = {
  category: {
    Bank: "#0284c7",
    Wallet: "#db2777",
    FD: "#7c3aed",
    Loan: "#d97706",
  },
  flow: { in: "#059669", out: "#dc2626", net: "#2563eb" },
  grid: "rgba(11,11,11,0.10)",
  track: "rgba(11,11,11,0.07)",
};

const DARK: ChartPalette = {
  category: {
    Bank: "#0284c7",
    Wallet: "#db2777",
    FD: "#8b5cf6",
    Loan: "#d97706",
  },
  flow: { in: "#059669", out: "#ef4444", net: "#3b82f6" },
  grid: "rgba(255,255,255,0.12)",
  track: "rgba(255,255,255,0.09)",
};

/** The palette matching the active theme. */
export function useChartPalette(): ChartPalette {
  const { theme } = useTheme();
  return theme === "dark" ? DARK : LIGHT;
}

/**
 * Shared Recharts tooltip surface. Uses the theme tokens directly (they are
 * raw `oklch(...)` values in this codebase, so they must NOT be wrapped in
 * `hsl()`).
 */
export const TOOLTIP_STYLE: React.CSSProperties = {
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--card-foreground)",
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
};

/** Soft background chips for category icons — chrome, not data marks. */
export const CATEGORY_TINT: Record<DisplayCategory, string> = {
  Bank: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  Wallet: "bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300",
  FD: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  Loan: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
};
