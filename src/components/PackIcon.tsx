export type PackIconType = "pouch" | "bottle" | "tin";

export interface PackColorScheme {
  /** main body fill */
  base: string;
  /** darker shade for caps/seams */
  dark: string;
  /** lighter highlight */
  light: string;
}

interface PackIconProps {
  type: PackIconType;
  size?: number;
  scheme: PackColorScheme;
  className?: string;
}

/** Infer the illustration type from a pack-type label like "pouch 750g" / "bottle 1ltr" / "15kg tin". */
export function packTypeFromLabel(label: string): PackIconType {
  const l = label.toLowerCase();
  if (l.includes("bottle")) return "bottle";
  if (l.includes("tin") || l.includes("jar") || l.includes("can")) return "tin";
  return "pouch";
}

/**
 * Small inline SVG pack illustrations (pouch / bottle / tin), colored per
 * commodity via `scheme`. viewBox 0 0 48 64, scales with `size` (height).
 */
export function PackIcon({ type, size = 56, scheme, className }: PackIconProps) {
  const width = (size * 48) / 64;
  const common = { width, height: size, viewBox: "0 0 48 64", className, "aria-hidden": true as const };

  if (type === "bottle") {
    return (
      <svg {...common}>
        {/* cap */}
        <rect x="19" y="2" width="10" height="6" rx="1.5" fill={scheme.dark} />
        {/* neck */}
        <path d="M20 8 h8 v7 c3 2 6 4 6 8 v34 a5 5 0 0 1 -5 5 H19 a5 5 0 0 1 -5 -5 V23 c0 -4 3 -6 6 -8 Z" fill={scheme.base} />
        {/* label band */}
        <rect x="14" y="30" width="20" height="16" rx="2" fill={scheme.light} />
        <rect x="17" y="34" width="14" height="2" rx="1" fill={scheme.dark} opacity="0.55" />
        <rect x="17" y="39" width="10" height="2" rx="1" fill={scheme.dark} opacity="0.35" />
        {/* sheen */}
        <rect x="17" y="18" width="3" height="34" rx="1.5" fill="#ffffff" opacity="0.30" />
      </svg>
    );
  }

  if (type === "tin") {
    return (
      <svg {...common}>
        {/* body */}
        <rect x="8" y="14" width="32" height="42" rx="3" fill={scheme.base} />
        {/* top ellipse */}
        <ellipse cx="24" cy="14" rx="16" ry="5" fill={scheme.light} />
        <ellipse cx="24" cy="14" rx="16" ry="5" fill="none" stroke={scheme.dark} strokeWidth="1" opacity="0.5" />
        {/* small cap/spout */}
        <ellipse cx="31" cy="12.5" rx="4" ry="1.8" fill={scheme.dark} />
        <rect x="28.5" y="8.5" width="5" height="4" rx="1" fill={scheme.dark} />
        {/* label band */}
        <rect x="8" y="28" width="32" height="14" fill={scheme.light} opacity="0.9" />
        <rect x="13" y="32" width="22" height="2" rx="1" fill={scheme.dark} opacity="0.55" />
        <rect x="13" y="36.5" width="15" height="2" rx="1" fill={scheme.dark} opacity="0.35" />
        {/* seam + sheen */}
        <line x1="8" y1="52" x2="40" y2="52" stroke={scheme.dark} strokeWidth="1" opacity="0.35" />
        <rect x="12" y="18" width="3" height="34" rx="1.5" fill="#ffffff" opacity="0.28" />
      </svg>
    );
  }

  // pouch
  return (
    <svg {...common}>
      {/* sealed top strip */}
      <path d="M13 6 h22 l1.5 6 h-25 Z" fill={scheme.dark} />
      <line x1="14.5" y1="9" x2="34" y2="9" stroke="#ffffff" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
      {/* trapezoid body — widens to the bottom */}
      <path d="M11.5 12 h25 l5 42 a4 4 0 0 1 -4 4.5 h-27 a4 4 0 0 1 -4 -4.5 Z" fill={scheme.base} />
      {/* label window */}
      <rect x="14" y="26" width="20" height="18" rx="3" fill={scheme.light} />
      <rect x="17" y="31" width="14" height="2.2" rx="1.1" fill={scheme.dark} opacity="0.55" />
      <rect x="17" y="36" width="9" height="2.2" rx="1.1" fill={scheme.dark} opacity="0.35" />
      {/* sheen */}
      <path d="M15 14 l-2.5 40 h4 l2 -40 Z" fill="#ffffff" opacity="0.25" />
    </svg>
  );
}
