import { useAuth } from "@/context/AuthContext";
import {
  ClipboardList,
  Droplets,
  Container,
  Gauge,
  Users,
  Truck,
  ScrollText,
} from "lucide-react";
import { Link } from "react-router-dom";

const quickLinks = [
  { to: "/stock/stock-status", label: "Stock Status", icon: ClipboardList, desc: "Track stock statuses" },
  { to: "/stock/tank-monitoring", label: "Tank Monitoring", icon: Gauge, desc: "Live tank visuals" },
  { to: "/stock/tank-items", label: "Tank Items", icon: Droplets, desc: "Manage tank items" },
  { to: "/stock/tank-data", label: "Tank Data", icon: Container, desc: "Manage tanks" },
  { to: "/admin/users", label: "Users", icon: Users, desc: "Manage accounts" },
  { to: "/admin/sync-vendor-data", label: "Sync Vendors", icon: Truck, desc: "SAP vendor sync" },
  { to: "/admin/sync-logs", label: "Sync Logs", icon: ScrollText, desc: "View sync history" },
];

/* ── Industrial Cargo Ship SVG ──────────────────────────────── */
function CargoShip() {
  return (
    <svg viewBox="0 0 520 180" fill="none" overflow="visible" aria-hidden="true">
      <defs>
        <linearGradient id="hullSteel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5A6B7A" />
          <stop offset="35%" stopColor="#6E7F8E" />
          <stop offset="100%" stopColor="#4A5A68" />
        </linearGradient>
        <linearGradient id="hullAF" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7A2828" />
          <stop offset="100%" stopColor="#5C1E1E" />
        </linearGradient>
        <linearGradient id="bridgeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E2E6EA" />
          <stop offset="100%" stopColor="#C8CED4" />
        </linearGradient>
      </defs>

      {/* Hull — upper steel */}
      <path d="M50,95 L50,125 L460,125 L440,95 Z" fill="url(#hullSteel)" stroke="#3D4D5C" strokeWidth="0.5" />
      {/* Hull — lower anti-fouling red */}
      <path d="M50,125 L32,158 L465,158 L460,125 Z" fill="url(#hullAF)" />
      {/* Waterline */}
      <line x1="42" y1="125" x2="462" y2="125" stroke="#8A9AAA" strokeWidth="1" opacity="0.45" />
      {/* Bow */}
      <path d="M50,95 L18,125 L32,158 L50,125 Z" fill="url(#hullAF)" />
      <path d="M50,95 L18,125 L50,125 Z" fill="url(#hullSteel)" stroke="#3D4D5C" strokeWidth="0.5" />
      {/* Bulbous bow */}
      <ellipse cx="20" cy="154" rx="7" ry="4.5" fill="#5C1E1E" opacity="0.8" />

      {/* Deck plate */}
      <rect x="58" y="87" width="378" height="10" rx="1" fill="#4A5568" stroke="#3D4050" strokeWidth="0.3" />

      {/* ── Containers Row 1 (7) ── */}
      <rect x="65"  y="55" width="40" height="32" rx="1.5" fill="#A63D32" stroke="#8A2D24" strokeWidth="0.5" />
      <rect x="108" y="55" width="40" height="32" rx="1.5" fill="#2D5B8A" stroke="#1E4670" strokeWidth="0.5" />
      <rect x="151" y="55" width="40" height="32" rx="1.5" fill="#4B7B4B" stroke="#3A6338" strokeWidth="0.5" />
      <rect x="194" y="55" width="40" height="32" rx="1.5" fill="#8B7030" stroke="#6E5820" strokeWidth="0.5" />
      <rect x="237" y="55" width="40" height="32" rx="1.5" fill="#5C5C5C" stroke="#444444" strokeWidth="0.5" />
      <rect x="280" y="55" width="40" height="32" rx="1.5" fill="#7B4B2A" stroke="#5E3A1E" strokeWidth="0.5" />
      <rect x="323" y="55" width="40" height="32" rx="1.5" fill="#A63D32" stroke="#8A2D24" strokeWidth="0.5" />

      {/* ── Containers Row 2 (6) ── */}
      <rect x="65"  y="21" width="40" height="32" rx="1.5" fill="#2D5B8A" stroke="#1E4670" strokeWidth="0.5" />
      <rect x="108" y="21" width="40" height="32" rx="1.5" fill="#7B4B2A" stroke="#5E3A1E" strokeWidth="0.5" />
      <rect x="151" y="21" width="40" height="32" rx="1.5" fill="#A63D32" stroke="#8A2D24" strokeWidth="0.5" />
      <rect x="194" y="21" width="40" height="32" rx="1.5" fill="#4B7B4B" stroke="#3A6338" strokeWidth="0.5" />
      <rect x="237" y="21" width="40" height="32" rx="1.5" fill="#8B7030" stroke="#6E5820" strokeWidth="0.5" />
      <rect x="280" y="21" width="40" height="32" rx="1.5" fill="#5C5C5C" stroke="#444444" strokeWidth="0.5" />

      {/* ── Containers Row 3 (4) ── */}
      <rect x="108" y="-13" width="40" height="32" rx="1.5" fill="#5C5C5C" stroke="#444444" strokeWidth="0.5" />
      <rect x="151" y="-13" width="40" height="32" rx="1.5" fill="#2D5B8A" stroke="#1E4670" strokeWidth="0.5" />
      <rect x="194" y="-13" width="40" height="32" rx="1.5" fill="#7B4B2A" stroke="#5E3A1E" strokeWidth="0.5" />
      <rect x="237" y="-13" width="40" height="32" rx="1.5" fill="#A63D32" stroke="#8A2D24" strokeWidth="0.5" />

      {/* Container door-seam lines */}
      {[65, 108, 151, 194, 237, 280, 323].map((x) => (
        <line key={`s1-${x}`} x1={x + 20} y1={57} x2={x + 20} y2={85} stroke="rgba(0,0,0,0.1)" strokeWidth="0.4" />
      ))}
      {[65, 108, 151, 194, 237, 280].map((x) => (
        <line key={`s2-${x}`} x1={x + 20} y1={23} x2={x + 20} y2={51} stroke="rgba(0,0,0,0.1)" strokeWidth="0.4" />
      ))}

      {/* On-deck crane */}
      <line x1="372" y1="87" x2="372" y2="20" stroke="#5A6B7A" strokeWidth="2.5" />
      <line x1="372" y1="22" x2="348" y2="48" stroke="#5A6B7A" strokeWidth="1.5" />
      <line x1="372" y1="22" x2="396" y2="48" stroke="#718096" strokeWidth="0.8" opacity="0.5" />
      <line x1="348" y1="48" x2="348" y2="62" stroke="#8A9AAA" strokeWidth="0.5" strokeDasharray="2 2" />

      {/* Bridge — lower deck */}
      <rect x="382" y="50" width="52" height="37" rx="2" fill="url(#bridgeGrad)" stroke="#A0A8B0" strokeWidth="0.4" />
      {/* Bridge — upper deck */}
      <rect x="384" y="30" width="46" height="22" rx="2" fill="url(#bridgeGrad)" stroke="#A0A8B0" strokeWidth="0.4" />
      {/* Bridge wing */}
      <rect x="378" y="28" width="58" height="3" rx="1" fill="#B0B8C0" />

      {/* Windows — upper deck */}
      {[387, 400, 413].map((x) => (
        <rect key={`wu-${x}`} x={x} y="34" width="10" height="7" rx="1" fill="#6B8DAB" opacity="0.85" />
      ))}
      {/* Windows — lower deck */}
      {[386, 398, 410, 422].map((x) => (
        <rect key={`wl-${x}`} x={x} y="56" width="9" height="6" rx="0.8" fill="#6B8DAB" opacity="0.6" />
      ))}

      {/* Funnel */}
      <rect x="398" y="6" width="16" height="24" rx="1.5" fill="#2D3748" stroke="#1A2332" strokeWidth="0.4" />
      <rect x="398" y="16" width="16" height="5" rx="0.5" fill="#A63D32" />
      <rect x="394" y="4" width="24" height="3" rx="1" fill="#1A2332" />

      {/* Radar mast & dome */}
      <line x1="406" y1="4" x2="406" y2="-10" stroke="#718096" strokeWidth="1.5" />
      <line x1="399" y1="-6" x2="413" y2="-6" stroke="#718096" strokeWidth="1" />
      <circle cx="406" cy="-10" r="1.8" fill="#A0AEC0" stroke="#8090A0" strokeWidth="0.4" />

      {/* Exhaust smoke */}
      <circle cx="406" cy="0"   r="4"   fill="#5A6A7A" className="ship-smoke smoke-1" />
      <circle cx="404" cy="-7"  r="5.5" fill="#5A6A7A" className="ship-smoke smoke-2" />
      <circle cx="401" cy="-16" r="7"   fill="#5A6A7A" className="ship-smoke smoke-3" />

      {/* Anchor */}
      <circle cx="40" cy="100" r="2.5" fill="none" stroke="#8A9AAA" strokeWidth="0.8" />
      <line x1="40" y1="102.5" x2="40" y2="108" stroke="#8A9AAA" strokeWidth="0.8" />

      {/* Bow wave spray */}
      <path d="M14,150 Q6,142 12,134" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <path d="M10,155 Q0,146 8,136" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
    </svg>
  );
}

/* ── Gentle ocean swell paths (seamless at 50% translateX) ──── */
const WAVE_BACK =
  "M0,50 Q120,35 240,50 Q360,65 480,50 Q600,35 720,50 Q840,65 960,50 Q1080,35 1200,50 Q1320,65 1440,50 Q1560,35 1680,50 Q1800,65 1920,50 Q2040,35 2160,50 Q2280,65 2400,50 Q2520,35 2640,50 Q2760,65 2880,50 L2880,120 L0,120 Z";

const WAVE_MID =
  "M0,55 Q90,37 180,55 Q270,73 360,55 Q450,37 540,55 Q630,73 720,55 Q810,37 900,55 Q990,73 1080,55 Q1170,37 1260,55 Q1350,73 1440,55 Q1530,37 1620,55 Q1710,73 1800,55 Q1890,37 1980,55 Q2070,73 2160,55 Q2250,37 2340,55 Q2430,73 2520,55 Q2610,37 2700,55 Q2790,73 2880,55 L2880,120 L0,120 Z";

const WAVE_FRONT =
  "M0,50 Q60,38 120,50 Q180,62 240,50 Q300,38 360,50 Q420,62 480,50 Q540,38 600,50 Q660,62 720,50 Q780,38 840,50 Q900,62 960,50 Q1020,38 1080,50 Q1140,62 1200,50 Q1260,38 1320,50 Q1380,62 1440,50 Q1500,38 1560,50 Q1620,62 1680,50 Q1740,38 1800,50 Q1860,62 1920,50 Q1980,38 2040,50 Q2100,62 2160,50 Q2220,38 2280,50 Q2340,62 2400,50 Q2460,38 2520,50 Q2580,62 2640,50 Q2700,38 2760,50 Q2820,62 2880,50 L2880,120 L0,120 Z";

const WAVE_FOAM =
  "M0,50 Q60,38 120,50 Q180,62 240,50 Q300,38 360,50 Q420,62 480,50 Q540,38 600,50 Q660,62 720,50 Q780,38 840,50 Q900,62 960,50 Q1020,38 1080,50 Q1140,62 1200,50 Q1260,38 1320,50 Q1380,62 1440,50 Q1500,38 1560,50 Q1620,62 1680,50 Q1740,38 1800,50 Q1860,62 1920,50 Q1980,38 2040,50 Q2100,62 2160,50 Q2220,38 2280,50 Q2340,62 2400,50 Q2460,38 2520,50 Q2580,62 2640,50 Q2700,38 2760,50 Q2820,62 2880,50";

/* ── Page Component ─────────────────────────────────────────── */
export default function HomePage() {
  const { name, role } = useAuth();

  const ROLE_LABELS: Record<string, string> = {
    ADM: "Administrator",
    FTR: "Factory User",
    MNG: "Manager",
  };

  return (
    <div className="p-6 space-y-8 animate-page">
      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-2xl h-[200px] sm:h-[230px] md:h-[260px] border border-black/10 dark:border-white/5 shadow-lg">
        {/* Sky */}
        <div className="absolute inset-0 banner-sky" />
        {/* Horizon glow */}
        <div className="absolute inset-0 banner-horizon" />
        {/* Atmospheric haze */}
        <div className="banner-haze banner-haze-1" aria-hidden="true" />
        <div className="banner-haze banner-haze-2" aria-hidden="true" />

        {/* Sun (light) / Moon (dark) */}
        <div className="absolute top-5 right-10 z-[1] pointer-events-none" aria-hidden="true">
          {/* Sun — muted through haze */}
          <div className="block dark:hidden w-11 h-11 rounded-full bg-[radial-gradient(circle_at_40%_40%,#F5E6B8,#D4A84B_50%,#B8863A_100%)] opacity-60 shadow-[0_0_30px_8px_rgba(212,168,75,0.25)]" />
          {/* Moon — clean crescent */}
          <div className="hidden dark:block w-9 h-9 rounded-full bg-[radial-gradient(circle_at_65%_35%,#D0D4DA,#A8B0BC_60%,#8090A0_100%)] opacity-70 shadow-[0_0_20px_6px_rgba(160,176,192,0.15)]" />
        </div>

        {/* Text readability overlay */}
        <div className="absolute inset-0 z-[1] banner-text-overlay" />

        {/* Welcome text */}
        <div className="relative z-10 flex flex-col justify-center h-[55%] px-6 sm:px-8">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-white/60 mb-1">
            JIVO EXIM &middot; Management System
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-md">
            Welcome back, {name ?? "User"}
          </h1>
          <p className="text-white/70 mt-1 text-xs sm:text-sm">
            {ROLE_LABELS[role ?? ""] ?? role ?? ""}
          </p>
        </div>

        {/* ── Back wave ── */}
        <div
          className="absolute bottom-0 left-0 w-[200%] z-[2] pointer-events-none ocean-wave-back"
          style={{ height: "45%" }}
        >
          <svg viewBox="0 0 2880 120" preserveAspectRatio="none" className="w-full h-full" aria-hidden="true">
            <path d={WAVE_BACK} className="wave-fill-back" />
          </svg>
        </div>

        {/* ── Mid wave ── */}
        <div
          className="absolute bottom-0 left-0 w-[200%] z-[3] pointer-events-none ocean-wave-mid"
          style={{ height: "38%" }}
        >
          <svg viewBox="0 0 2880 120" preserveAspectRatio="none" className="w-full h-full" aria-hidden="true">
            <path d={WAVE_MID} className="wave-fill-mid" />
          </svg>
        </div>

        {/* ── Cargo Ship ── */}
        <div
          className="absolute z-[7] ship-sail pointer-events-none"
          style={{ bottom: "-10%", width: "300px", height: "165px" }}
        >
          <div className="ship-bob w-full h-full">
            <CargoShip />
          </div>
        </div>

        {/* ── Front wave ── */}
        <div
          className="absolute bottom-0 left-0 w-[200%] z-[6] pointer-events-none ocean-wave-front"
          style={{ height: "30%" }}
        >
          <svg viewBox="0 0 2880 120" preserveAspectRatio="none" className="w-full h-full" aria-hidden="true">
            <path d={WAVE_FRONT} className="wave-fill-front" />
            <path d={WAVE_FOAM} fill="none" stroke="white" strokeWidth="1" opacity="0.15" />
          </svg>
        </div>
      </div>

      {/* ── Quick Access ── */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Quick Access
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="card-hover shimmer-hover group rounded-xl border bg-card p-5 flex items-start gap-4 no-underline"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
                <link.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{link.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{link.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
