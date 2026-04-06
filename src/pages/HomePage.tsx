import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  Droplets,
  Container,
  Gauge,
  Users,
  Truck,
  ScrollText,
  Package,
  Boxes,
  LayoutDashboard,
  BarChart3,
  BookOpen,
  FileText,
  TrendingUp,
  Search,
  Bell,
  Activity,
  History,
  AlertTriangle,
  ArrowRight,
  Globe,
  Warehouse,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { getStockSummary, getStockLogs } from "@/api/stockStatus";
import { getTankSummary } from "@/api/tank";
import { getSyncLogs } from "@/api/sapSync";
import { fmtDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/* ── Types & Constants ────────────────────────────────────── */

interface ActivityItem {
  id: number;
  type: string;
  title: string;
  subtitle: string;
  time: string;
  status?: "SUCCESS" | "FAILURE" | string;
}

interface QuickLink {
  to: string;
  label: string;
  icon: any;
  desc: string;
  category: "Reports" | "Operations" | "Commercials" | "Administration";
  roles?: string[];
}

const quickLinks: QuickLink[] = [
  // Reports
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Overview & analytics", category: "Reports", roles: ["ADM", "MNG"] },
  { to: "/stock-dashboard", label: "Stock Dashboard", icon: BarChart3, desc: "Stock across statuses", category: "Reports", roles: ["ADM", "MNG"] },
  { to: "/stock/warehouse-inventory", label: "Warehouse Inventory", icon: Warehouse, desc: "Live inventory by warehouse", category: "Reports", roles: ["ADM", "MNG"] },
  { to: "/reports/vehicle-report", label: "Vehicle Report", icon: Truck, desc: "Vehicle-wise stock movement", category: "Reports", roles: ["ADM", "MNG"] },

  // Operations
  { to: "/stock/stock-status", label: "Stock Status", icon: ClipboardList, desc: "Track stock statuses", category: "Operations", roles: ["ADM", "MNG"] },
  { to: "/stock/tank-monitoring", label: "Tank Monitoring", icon: Gauge, desc: "Live tank visuals", category: "Operations" },
  { to: "/stock/tank-items", label: "Tank Items", icon: Droplets, desc: "Manage tank items", category: "Operations" },
  { to: "/stock/tank-data", label: "Tank Data", icon: Container, desc: "Manage tanks", category: "Operations" },
  { to: "/stock/tank-logs", label: "Tank Logs", icon: ScrollText, desc: "Tank operation logs", category: "Operations" },
  
  // Commercials
  { to: "/domestic-contracts", label: "Contracts (25-26)", icon: FileText, desc: "Historical orders", category: "Commercials", roles: ["ADM", "MNG"] },
  { to: "/contracts/domestic-2627", label: "Contracts (26-27)", icon: FileText, desc: "Active orders", category: "Commercials", roles: ["ADM", "MNG"] },
  { to: "/exim-rates", label: "Exchange Rates", icon: Globe, desc: "FX rates & conversion", category: "Commercials", roles: ["ADM", "MNG"] },
  { to: "/exim-account", label: "Exim Account", icon: BookOpen, desc: "Account & balance", category: "Commercials", roles: ["ADM", "MNG"] },
  { to: "/commodity/daily-price", label: "Daily Price", icon: TrendingUp, desc: "Commodity prices", category: "Commercials", roles: ["ADM", "MNG"] },
  { to: "/license/advance-license", label: "Advance License", icon: FileText, desc: "License management", category: "Commercials", roles: ["ADM", "MNG"] },
  { to: "/license/dfia-license", label: "DFIA License", icon: FileText, desc: "DFIA license management", category: "Commercials", roles: ["ADM", "MNG"] },
  
  // Administration
  { to: "/admin/stock-updation-logs", label: "Stock Logs", icon: ScrollText, desc: "Stock update history", category: "Administration", roles: ["ADM", "MNG"] },
  { to: "/admin/users", label: "Users", icon: Users, desc: "Manage accounts", category: "Administration", roles: ["ADM"] },
  { to: "/admin/sync-raw-material-data", label: "Sync RM Data", icon: Package, desc: "Raw material sync", category: "Administration", roles: ["ADM"] },
  { to: "/admin/sync-finished-goods-data", label: "Sync FG Data", icon: Boxes, desc: "Finished goods sync", category: "Administration", roles: ["ADM"] },
  { to: "/admin/sync-vendor-data", label: "Sync Vendors", icon: Truck, desc: "SAP vendor sync", category: "Administration", roles: ["ADM"] },
  { to: "/admin/sync-logs", label: "Sync Logs", icon: ScrollText, desc: "View sync history", category: "Administration", roles: ["ADM"] },
];

const CATEGORY_STYLES = {
  Reports: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white",
  Operations: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white",
  Commercials: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white",
  Administration: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white",
};

/* ── Cargo Ship SVG (matches login page) ─────────────────── */
function CargoShip() {
  return (
    <svg viewBox="0 0 520 180" fill="none" overflow="visible" aria-hidden="true">
      <defs>
        <linearGradient id="heroHullSteel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5A6B7A" />
          <stop offset="35%" stopColor="#6E7F8E" />
          <stop offset="100%" stopColor="#4A5A68" />
        </linearGradient>
        <linearGradient id="heroHullAF" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7A2828" />
          <stop offset="100%" stopColor="#5C1E1E" />
        </linearGradient>
        <linearGradient id="heroBridgeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E2E6EA" />
          <stop offset="100%" stopColor="#C8CED4" />
        </linearGradient>
      </defs>
      {/* Hull */}
      <path d="M50,95 L50,125 L460,125 L440,95 Z" fill="url(#heroHullSteel)" stroke="#3D4D5C" strokeWidth="0.5" />
      <path d="M50,125 L32,158 L465,158 L460,125 Z" fill="url(#heroHullAF)" />
      <line x1="42" y1="125" x2="462" y2="125" stroke="#8A9AAA" strokeWidth="1" opacity="0.45" />
      <path d="M50,95 L18,125 L32,158 L50,125 Z" fill="url(#heroHullAF)" />
      <path d="M50,95 L18,125 L50,125 Z" fill="url(#heroHullSteel)" stroke="#3D4D5C" strokeWidth="0.5" />
      <ellipse cx="20" cy="154" rx="7" ry="4.5" fill="#5C1E1E" opacity="0.8" />
      {/* Deck */}
      <rect x="58" y="87" width="378" height="10" rx="1" fill="#4A5568" stroke="#3D4050" strokeWidth="0.3" />
      {/* Containers — row 1 */}
      <rect x="65" y="55" width="40" height="32" rx="1.5" fill="#A63D32" stroke="#8A2D24" strokeWidth="0.5" />
      <rect x="108" y="55" width="40" height="32" rx="1.5" fill="#2D5B8A" stroke="#1E4670" strokeWidth="0.5" />
      <rect x="151" y="55" width="40" height="32" rx="1.5" fill="#4B7B4B" stroke="#3A6338" strokeWidth="0.5" />
      <rect x="194" y="55" width="40" height="32" rx="1.5" fill="#8B7030" stroke="#6E5820" strokeWidth="0.5" />
      <rect x="237" y="55" width="40" height="32" rx="1.5" fill="#5C5C5C" stroke="#444444" strokeWidth="0.5" />
      <rect x="280" y="55" width="40" height="32" rx="1.5" fill="#7B4B2A" stroke="#5E3A1E" strokeWidth="0.5" />
      <rect x="323" y="55" width="40" height="32" rx="1.5" fill="#A63D32" stroke="#8A2D24" strokeWidth="0.5" />
      {/* Containers — row 2 */}
      <rect x="65" y="21" width="40" height="32" rx="1.5" fill="#2D5B8A" stroke="#1E4670" strokeWidth="0.5" />
      <rect x="108" y="21" width="40" height="32" rx="1.5" fill="#7B4B2A" stroke="#5E3A1E" strokeWidth="0.5" />
      <rect x="151" y="21" width="40" height="32" rx="1.5" fill="#A63D32" stroke="#8A2D24" strokeWidth="0.5" />
      <rect x="194" y="21" width="40" height="32" rx="1.5" fill="#4B7B4B" stroke="#3A6338" strokeWidth="0.5" />
      <rect x="237" y="21" width="40" height="32" rx="1.5" fill="#8B7030" stroke="#6E5820" strokeWidth="0.5" />
      <rect x="280" y="21" width="40" height="32" rx="1.5" fill="#5C5C5C" stroke="#444444" strokeWidth="0.5" />
      {/* Containers — row 3 (pyramid) */}
      <rect x="108" y="-13" width="40" height="32" rx="1.5" fill="#5C5C5C" stroke="#444444" strokeWidth="0.5" />
      <rect x="151" y="-13" width="40" height="32" rx="1.5" fill="#2D5B8A" stroke="#1E4670" strokeWidth="0.5" />
      <rect x="194" y="-13" width="40" height="32" rx="1.5" fill="#7B4B2A" stroke="#5E3A1E" strokeWidth="0.5" />
      <rect x="237" y="-13" width="40" height="32" rx="1.5" fill="#A63D32" stroke="#8A2D24" strokeWidth="0.5" />
      {/* Container seam lines */}
      {[65, 108, 151, 194, 237, 280, 323].map((x) => (
        <line key={`s1-${x}`} x1={x + 20} y1={57} x2={x + 20} y2={85} stroke="rgba(0,0,0,0.1)" strokeWidth="0.4" />
      ))}
      {[65, 108, 151, 194, 237, 280].map((x) => (
        <line key={`s2-${x}`} x1={x + 20} y1={23} x2={x + 20} y2={51} stroke="rgba(0,0,0,0.1)" strokeWidth="0.4" />
      ))}
      {/* Crane/rigging */}
      <line x1="372" y1="87" x2="372" y2="20" stroke="#5A6B7A" strokeWidth="2.5" />
      <line x1="372" y1="22" x2="348" y2="48" stroke="#5A6B7A" strokeWidth="1.5" />
      <line x1="372" y1="22" x2="396" y2="48" stroke="#718096" strokeWidth="0.8" opacity="0.5" />
      <line x1="348" y1="48" x2="348" y2="62" stroke="#8A9AAA" strokeWidth="0.5" strokeDasharray="2 2" />
      {/* Bridge */}
      <rect x="382" y="50" width="52" height="37" rx="2" fill="url(#heroBridgeGrad)" stroke="#A0A8B0" strokeWidth="0.4" />
      <rect x="384" y="30" width="46" height="22" rx="2" fill="url(#heroBridgeGrad)" stroke="#A0A8B0" strokeWidth="0.4" />
      <rect x="378" y="28" width="58" height="3" rx="1" fill="#B0B8C0" />
      {/* Bridge windows */}
      {[387, 400, 413].map((x) => (
        <rect key={`wu-${x}`} x={x} y="34" width="10" height="7" rx="1" fill="#6B8DAB" opacity="0.85" />
      ))}
      {[386, 398, 410, 422].map((x) => (
        <rect key={`wl-${x}`} x={x} y="56" width="9" height="6" rx="0.8" fill="#6B8DAB" opacity="0.6" />
      ))}
      {/* Funnel / smokestack */}
      <rect x="398" y="6" width="16" height="24" rx="1.5" fill="#2D3748" stroke="#1A2332" strokeWidth="0.4" />
      <rect x="398" y="16" width="16" height="5" rx="0.5" fill="#A63D32" />
      <rect x="394" y="4" width="24" height="3" rx="1" fill="#1A2332" />
      {/* Antenna */}
      <line x1="406" y1="4" x2="406" y2="-10" stroke="#718096" strokeWidth="1.5" />
      <line x1="399" y1="-6" x2="413" y2="-6" stroke="#718096" strokeWidth="1" />
      <circle cx="406" cy="-10" r="1.8" fill="#A0AEC0" stroke="#8090A0" strokeWidth="0.4" />
      {/* Smoke */}
      <circle cx="406" cy="0" r="4" fill="#5A6A7A" className="ship-smoke smoke-1" />
      <circle cx="404" cy="-7" r="5.5" fill="#5A6A7A" className="ship-smoke smoke-2" />
      <circle cx="401" cy="-16" r="7" fill="#5A6A7A" className="ship-smoke smoke-3" />
      {/* Bow anchor */}
      <circle cx="40" cy="100" r="2.5" fill="none" stroke="#8A9AAA" strokeWidth="0.8" />
      <line x1="40" y1="102.5" x2="40" y2="108" stroke="#8A9AAA" strokeWidth="0.8" />
      {/* Bow wake spray */}
      <path d="M14,150 Q6,142 12,134" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <path d="M10,155 Q0,146 8,136" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
    </svg>
  );
}

/* ── Waves ─────────────────────────────────────────────────── */
const WAVE_BACK = "M0,50 Q120,35 240,50 Q360,65 480,50 Q600,35 720,50 Q840,65 960,50 Q1080,35 1200,50 Q1320,65 1440,50 Q1560,35 1680,50 Q1800,65 1920,50 Q2040,35 2160,50 Q2280,65 2400,50 Q2520,35 2640,50 Q2760,65 2880,50 L2880,120 L0,120 Z";
const WAVE_MID = "M0,55 Q90,37 180,55 Q270,73 360,55 Q450,37 540,55 Q630,73 720,55 Q810,37 900,55 Q990,73 1080,55 Q1170,37 1260,55 Q1350,73 1440,55 Q1530,37 1620,55 Q1710,73 1800,55 Q1890,37 1980,55 Q2070,73 2160,55 Q2250,37 2340,55 Q2430,73 2520,55 Q2610,37 2700,55 Q2790,73 2880,55 L2880,120 L0,120 Z";
const WAVE_FRONT = "M0,50 Q60,38 120,50 Q180,62 240,50 Q300,38 360,50 Q420,62 480,50 Q540,38 600,50 Q660,62 720,50 Q780,38 840,50 Q900,62 960,50 Q1020,38 1080,50 Q1140,62 1200,50 Q1260,38 1320,50 Q1380,62 1440,50 Q1500,38 1560,50 Q1620,62 1680,50 Q1740,38 1800,50 Q1860,62 1920,50 Q1980,38 2040,50 Q2100,62 2160,50 Q2220,38 2280,50 Q2340,62 2400,50 Q2460,38 2520,50 Q2580,62 2640,50 Q2700,38 2760,50 Q2820,62 2880,50 L2880,120 L0,120 Z";

/* ── Page Component ────────────────────────────────────────── */
function getTimeControl() {
  const hour = new Date().getHours();
  let skyGrad = "";
  let horizonGrad = "";
  let iconObj = { left: 0, top: 0, shadow: "", bg: "", size: 40 };

  if (hour >= 6 && hour < 12) { // Morning
    const progress = (hour - 6) / 6;
    skyGrad = "linear-gradient(180deg, #7dd3fc 0%, #bae6fd 60%, #e0f2fe 100%)";
    horizonGrad = "linear-gradient(180deg, transparent 0%, rgba(253,224,71,0.3) 70%, rgba(253,224,71,0.1) 100%)";
    iconObj = { left: 10 + progress * 40, top: 70 - progress * 50, shadow: "0 0 50px #fde047", bg: "#fef08a", size: 60 };
  } else if (hour >= 12 && hour < 17) { // Afternoon
    const progress = (hour - 12) / 5;
    skyGrad = "linear-gradient(180deg, #38bdf8 0%, #7dd3fc 60%, #bae6fd 100%)";
    horizonGrad = "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.2) 70%, rgba(255,255,255,0.05) 100%)";
    iconObj = { left: 50 + progress * 30, top: 20 + progress * 10, shadow: "0 0 60px #fde047", bg: "#fef08a", size: 60 };
  } else if (hour >= 17 && hour < 20) { // Evening (Golden/Pink)
    const progress = (hour - 17) / 3;
    skyGrad = "linear-gradient(180deg, #4c1d95 0%, #db2777 40%, #f97316 70%, #fcd34d 100%)";
    horizonGrad = "linear-gradient(180deg, transparent 0%, rgba(249,115,22,0.4) 70%, rgba(249,115,22,0.1) 100%)";
    iconObj = { left: 80 + progress * 10, top: 30 + progress * 40, shadow: "0 0 80px #f97316", bg: "#fcd34d", size: 70 };
  } else { // Night
    let progress = hour >= 20 ? (hour - 20) / 10 : (hour + 4) / 10;
    skyGrad = "linear-gradient(180deg, #020617 0%, #0f172a 60%, #1e293b 100%)";
    horizonGrad = "linear-gradient(180deg, transparent 0%, rgba(99,102,241,0.2) 70%, rgba(99,102,241,0.05) 100%)";
    iconObj = { left: 10 + progress * 80, top: 40 - Math.sin(progress * Math.PI) * 20, shadow: "0 0 30px #cbd5e1", bg: "#f1f5f9", size: 40 };
  }

  return { skyGrad, horizonGrad, iconObj };
}

export default function HomePage() {
  const { name, role } = useAuth();
  const [search, setSearch] = useState("");
  const [stockStats, setStockStats] = useState({ count: 0, val: 0 });
  const [tankStats, setTankStats] = useState({ count: 0, util: 0 });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    async function loadStats() {
      // Load Stock Stats
      getStockSummary()
        .then((res) => setStockStats({ count: res.summary.total_count, val: res.summary.total_value }))
        .catch(() => {});

      // Load Tank Stats
      getTankSummary()
        .then((res) => setTankStats({ count: res.tank_count, util: res.utilisation_rate }))
        .catch(() => {});

      // Load Role-based Activity
      if (role === "ADM") {
        getSyncLogs()
          .then((res) => {
            const activities: ActivityItem[] = res.slice(0, 5).map((log) => ({
              id: log.id,
              type: "sync",
              title: log.sync_type.replace(/_/g, " "),
              subtitle: log.status === "SUCCESS" ? "Sync Completed" : "Sync Failed",
              time: log.started_at,
              status: log.status,
            }));
            setRecentActivity(activities);
          })
          .catch(() => {});
      } else {
        // Managers & Others see Stock Movement
        getStockLogs()
          .then((res) => {
            // Group by stock_id and time to show unique events if possible, 
            // but for simple feed we just show last 5 raw changes
            const activities: ActivityItem[] = res.slice(0, 5).map((log) => ({
              id: log.id,
              type: "stock",
              title: `ID #${log.stock_id} Update`,
              subtitle: `${log.field_name.replace(/_/g, " ")} changed`,
              time: log.updated_at,
              status: "SUCCESS",
            }));
            setRecentActivity(activities);
          })
          .catch(() => {});
      }
    }
    loadStats();
  }, [role]);

  const ROLE_LABELS: Record<string, string> = {
    ADM: "Administrator",
    FTR: "Factory User",
    MNG: "Manager",
  };

  const timeDisplay = useMemo(() => getTimeControl(), []);

  const filteredLinks = useMemo(() => {
    const q = search.toLowerCase();
    return quickLinks
      .filter((l) => !l.roles || l.roles.includes(role ?? ""))
      .filter((l) => l.label.toLowerCase().includes(q) || l.desc.toLowerCase().includes(q));
  }, [search, role]);

  const grouped = useMemo(() => {
    const cats: Record<string, QuickLink[]> = {
      Reports: [],
      Operations: [],
      Commercials: [],
      Administration: [],
    };
    filteredLinks.forEach((l) => cats[l.category].push(l));
    return cats;
  }, [filteredLinks]);

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-8 lg:space-y-12 animate-page">
      {/* ── Hero & Grid Layout ── */}
      <div className="flex flex-col xl:flex-row gap-8">
        
        {/* Main Content (Hero + Search + Grid) */}
        <div className="flex-1 space-y-8">
          
          {/* Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl h-[220px] sm:h-[260px] border border-black/10 dark:border-white/5 shadow-2xl group/hero">
            <div className="absolute inset-0 banner-sky" style={{ background: timeDisplay.skyGrad }} />
            <div className="absolute inset-0 banner-horizon" style={{ background: timeDisplay.horizonGrad }} />
            
            {/* Celestial Body (Sun/Moon) */}
            <div className="absolute rounded-full" style={{
              left: `${timeDisplay.iconObj.left}%`,
              top: `${timeDisplay.iconObj.top}%`,
              width: timeDisplay.iconObj.size,
              height: timeDisplay.iconObj.size,
              background: timeDisplay.iconObj.bg,
              boxShadow: timeDisplay.iconObj.shadow,
              transform: 'translate(-50%, -50%)',
              transition: 'all 1s ease'
            }} />

            <div className="absolute inset-0 banner-text-overlay z-[1]" />
            <div className="banner-haze banner-haze-1" />
            <div className="banner-haze banner-haze-2" />
            
            {/* Functional Stats Overlay */}
            <div className="absolute top-6 right-6 z-20 flex gap-3">
              <div className="glass-morphism p-3 rounded-2xl border border-white/20 text-white animate-in zoom-in duration-500">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Shipments</p>
                <p className="text-lg font-black">{stockStats.count}</p>
              </div>
              <div className="glass-morphism p-3 rounded-2xl border border-white/20 text-white animate-in zoom-in duration-700">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Utilisation</p>
                <p className="text-lg font-black">{tankStats.util.toFixed(1)}%</p>
              </div>
            </div>

            {/* Welcome text */}
            <div className="relative z-10 flex flex-col justify-center h-full px-8 sm:px-12">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1 w-8 bg-primary rounded-full" />
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/80">
                  JIVO EXIM PORTAL
                </p>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-xl">
                Welcome back, {name?.split(" ")[0] ?? "User"}
              </h1>
              <div className="flex items-center gap-3 mt-3">
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md px-3 py-1">
                  {ROLE_LABELS[role ?? ""] ?? role ?? ""}
                </Badge>
                <p className="text-white/60 text-xs font-medium flex items-center gap-1.5">
                  <Activity className="h-3 w-3 text-emerald-400" />
                  System Online
                </p>
              </div>
            </div>

            {/* Ship & Ocean */}
            <div className="absolute bottom-0 left-0 w-[200%] z-[2] ocean-wave-back h-[45%] opacity-40">
              <svg viewBox="0 0 2880 120" preserveAspectRatio="none" className="w-full h-full">
                <path d={WAVE_BACK} className="wave-fill-back" />
              </svg>
            </div>
            <div className="absolute bottom-0 left-0 w-[200%] z-[3] ocean-wave-mid h-[38%] opacity-60">
              <svg viewBox="0 0 2880 120" preserveAspectRatio="none" className="w-full h-full">
                <path d={WAVE_MID} className="wave-fill-mid" />
              </svg>
            </div>
            <div className="absolute z-[5] pointer-events-none" style={{ bottom: "-12%", width: "280px", height: "155px", animation: "shipSail 40s linear infinite" }}>
              <div className="ship-bob w-full h-full">
                <CargoShip />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-[200%] z-[6] ocean-wave-front h-[30%]">
              <svg viewBox="0 0 2880 120" preserveAspectRatio="none" className="w-full h-full">
                <path d={WAVE_FRONT} className="wave-fill-front" />
              </svg>
            </div>
          </div>

          {/* Search Modules */}
          <div className="relative max-w-md mx-auto xl:mx-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search modules (e.g. 'tank', 'sync', 'price')..."
              className="w-full h-12 pl-11 pr-4 rounded-2xl border bg-card/50 backdrop-blur-sm focus:ring-2 focus:ring-primary focus:outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Grouped Links */}
          <div className="space-y-10">
            {Object.entries(grouped).map(([category, links]) => {
              if (links.length === 0) return null;
              return (
                <div key={category} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      {category}
                    </h2>
                    <div className="h-[1px] flex-1 bg-border/50" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {links.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="group relative overflow-hidden rounded-2xl border bg-card p-5 flex items-start gap-4 transition-all hover:shadow-lg hover:-translate-y-1"
                      >
                        <div className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
                          CATEGORY_STYLES[link.category as keyof typeof CATEGORY_STYLES]
                        )}>
                          <link.icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-base text-foreground truncate">{link.label}</p>
                            <ArrowRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-muted-foreground" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{link.desc}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Sidebar (Activity & Alerts) ── */}
        <div className="w-full xl:w-[320px] space-y-6">
          
          {/* Alerts Card */}
          <div className="rounded-3xl border bg-card overflow-hidden shadow-sm">
            <div className="bg-red-50 dark:bg-red-950/20 px-6 py-4 flex items-center justify-between border-b border-red-100 dark:border-red-900/30">
              <h3 className="text-xs font-bold uppercase tracking-widest text-red-600 flex items-center gap-2">
                <Bell className="h-3.5 w-3.5" /> Alerts
              </h3>
              <Badge variant="destructive" className="rounded-full px-2 py-0 h-5 text-[10px]">
                {role === "ADM" ? "2" : "2"}
              </Badge>
            </div>
            <div className="p-4 space-y-3">
              {role === "ADM" ? (
                <>
                  <div className="flex gap-3 p-3 rounded-xl bg-muted/30 border border-transparent hover:border-red-200 dark:hover:border-red-900/30 transition-all cursor-pointer">
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                    <p className="text-xs font-medium leading-tight">Sync failed for Raw Material at 10:30 AM</p>
                  </div>
                  <div className="flex gap-3 p-3 rounded-xl bg-muted/30 border border-transparent hover:border-amber-200 dark:hover:border-amber-900/30 transition-all cursor-pointer">
                    <div className="h-2 w-2 rounded-full bg-amber-500 mt-1 shrink-0" />
                    <p className="text-xs font-medium leading-tight">3 contracts expiring in next 7 days</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex gap-3 p-3 rounded-xl bg-muted/30 border border-transparent hover:border-red-200 dark:hover:border-red-900/30 transition-all cursor-pointer">
                    <History className="h-4 w-4 text-red-500 shrink-0" />
                    <p className="text-xs font-medium leading-tight">Advance License #AL-992 expiring soon</p>
                  </div>
                  <div className="flex gap-3 p-3 rounded-xl bg-muted/30 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-900/30 transition-all cursor-pointer">
                    <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />
                    <p className="text-xs font-medium leading-tight">Daily prices updated for {new Date().toLocaleDateString()}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="rounded-3xl border bg-card overflow-hidden shadow-sm">
            <div className="px-6 py-4 flex items-center justify-between border-b">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <History className="h-3.5 w-3.5" /> Recent Activity
              </h3>
            </div>
            <div className="p-4 relative">
              {/* Timeline Line */}
              <div className="absolute left-[27px] top-6 bottom-6 w-[1px] bg-border" />
              
              <div className="space-y-6">
                {recentActivity.length > 0 ? recentActivity.map((act) => (
                  <div key={act.id} className="relative pl-8 flex flex-col gap-1">
                    <div className={cn(
                      "absolute left-0 top-1 h-3 w-3 rounded-full border-2 border-card z-10",
                      act.status === "SUCCESS" ? "bg-emerald-500" : 
                      act.status === "FAILURE" ? "bg-red-500" : "bg-blue-500"
                    )} />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{act.title}</p>
                    <p className="text-xs font-semibold leading-tight">{act.subtitle}</p>
                    <p className="text-[10px] text-muted-foreground">{fmtDateTime(act.time)}</p>
                  </div>
                )) : (
                  <div className="py-8 text-center">
                    <History className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </div>
              
              <Link 
                to={role === "ADM" ? "/admin/sync-logs" : "/admin/stock-updation-logs"} 
                className="mt-6 block text-center text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
              >
                View All History
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
