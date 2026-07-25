import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { fallbackColor, monogram, type Brand } from "./brands";

/**
 * Official brand mark for a bank or wallet, with a three-step fallback:
 *
 *   1. the logo CDN (official mark, no files to host)
 *   2. a self-hosted override at `public/logos/<slug>.svg`
 *   3. a brand-coloured monogram badge
 *
 * Step 2 is what to use when a mark is wrong, missing, or the network is
 * closed off — drop the SVG in and it wins the moment the CDN request fails.
 * To pin every logo locally instead, set {@link LOGO_CDN} to `null`.
 */

/** Logo CDN template. `{domain}` is replaced with the brand's domain. */
export const LOGO_CDN: string | null = "https://logo.clearbit.com/{domain}";

const SIZES = {
  sm: { box: "size-7", text: "text-[10px]", pad: "p-1" },
  md: { box: "size-9", text: "text-xs", pad: "p-1.5" },
  lg: { box: "size-11", text: "text-sm", pad: "p-1.5" },
} as const;

export type LogoSize = keyof typeof SIZES;

/** Relative luminance of a #rrggbb colour, for picking readable badge text. */
function needsDarkText(color: string): boolean {
  if (!color.startsWith("#") || color.length !== 7) return false;
  const channel = (hex: string) => {
    const v = parseInt(hex, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const lum =
    0.2126 * channel(color.slice(1, 3)) +
    0.7152 * channel(color.slice(3, 5)) +
    0.0722 * channel(color.slice(5, 7));
  // Contrast of white text is 1.05/(lum+0.05); flip to black below ~4.5:1.
  return 1.05 / (lum + 0.05) < 4.5;
}

export default function BankLogo({
  name,
  brand,
  size = "md",
  className,
}: {
  /** Display name — used for the monogram and the alt text. */
  name: string;
  brand: Brand | null;
  size?: LogoSize;
  className?: string;
}) {
  const sources = useMemo(() => {
    if (!brand) return [];
    const list: string[] = [];
    if (LOGO_CDN) list.push(LOGO_CDN.replace("{domain}", brand.domain));
    list.push(`/logos/${brand.slug}.svg`);
    return list;
  }, [brand]);

  const [attempt, setAttempt] = useState(0);
  // Start over when the row is recycled for a different brand.
  useEffect(() => setAttempt(0), [brand?.slug]);

  const s = SIZES[size];
  const src = sources[attempt];

  if (src) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white shadow-sm",
          s.box,
          s.pad,
          className
        )}
      >
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="size-full object-contain"
          onError={() => setAttempt((a) => a + 1)}
        />
      </span>
    );
  }

  // Monogram badge — the always-available fallback.
  const color = brand?.color ?? fallbackColor(name);
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg font-bold tracking-tight shadow-sm",
        s.box,
        s.text,
        needsDarkText(color) ? "text-black/80" : "text-white",
        className
      )}
      style={{ backgroundColor: color }}
    >
      {monogram(name)}
    </span>
  );
}
