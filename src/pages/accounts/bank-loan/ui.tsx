/**
 * Presentational primitives shared by the Bank & Loan screens.
 *
 * These exist so the accounts list and the finance dashboard read as one
 * surface: same header, same tile, same meter, same section chrome.
 */

import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ── Page header ──────────────────────────────────────────── */

export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start sm:gap-6">
      <div className="flex min-w-0 items-start gap-3">
        <span className="hidden size-11 shrink-0 items-center justify-center rounded-xl border bg-card text-primary shadow-sm sm:inline-flex">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
            {title}
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground sm:text-sm">
            {description}
          </p>
        </div>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}

/* ── Section card ─────────────────────────────────────────── */

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  flush = false,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Drop the body padding (for edge-to-edge tables). */
  flush?: boolean;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className={cn(flush ? "" : "p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/* ── Stat tile ────────────────────────────────────────────── */

export type TileTone = "neutral" | "brand" | "positive" | "negative";

const TONE_CHIP: Record<TileTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  brand: "bg-primary/10 text-primary",
  positive: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  negative: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
};

/**
 * One headline number. The value itself always wears text ink — the tint lives
 * in the icon chip, so colour is never the only thing carrying meaning.
 */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  chipClassName,
  footer,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  tone?: TileTone;
  /** Overrides the tone chip (used for category tints). */
  chipClassName?: string;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <span
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
            chipClassName ?? TONE_CHIP[tone]
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 truncate text-xl font-bold tabular-nums lg:text-2xl" title={value}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}

/* ── Meters ───────────────────────────────────────────────── */

export interface MeterSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

/**
 * Stacked composition bar. Segments are separated by a 2px surface gap so
 * adjacent fills never blend into one another.
 */
export function CompositionMeter({
  segments,
  className,
}: {
  segments: MeterSegment[];
  className?: string;
}) {
  const total = segments.reduce((sum, s) => sum + Math.abs(s.value), 0);
  if (total <= 0) {
    return (
      <div
        className={cn("h-2.5 rounded-full bg-muted", className)}
        aria-hidden
      />
    );
  }
  return (
    <div
      className={cn("flex h-2.5 gap-[2px] overflow-hidden", className)}
      role="img"
      aria-label={segments
        .map((s) => `${s.label} ${((Math.abs(s.value) / total) * 100).toFixed(0)}%`)
        .join(", ")}
    >
      {segments
        .filter((s) => Math.abs(s.value) > 0)
        .map((s) => (
          <span
            key={s.key}
            className="h-full rounded-[3px]"
            style={{
              backgroundColor: s.color,
              flexBasis: `${(Math.abs(s.value) / total) * 100}%`,
            }}
          />
        ))}
    </div>
  );
}

/** A single-value magnitude bar, e.g. one row's share of the largest row. */
export function MagnitudeBar({
  ratio,
  color,
  track,
  className,
}: {
  ratio: number;
  color: string;
  track: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full", className)}
      style={{ backgroundColor: track }}
      aria-hidden
    >
      <span
        className="block h-full rounded-full"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

/* ── Legend ───────────────────────────────────────────────── */

export function LegendRow({
  items,
  className,
}: {
  items: { key: string; label: string; color: string }[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5", className)}>
      {items.map((item) => (
        <li
          key={item.key}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <span
            className="size-2.5 shrink-0 rounded-[3px]"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/* ── Misc ─────────────────────────────────────────────────── */

/** Small uppercase pill, e.g. a branch tag. */
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}
