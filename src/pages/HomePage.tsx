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
  Crown,
  BookOpen,
  FileText,
  TrendingUp,
  LineChart,
  Scale,
  Clock,
  ReceiptText,
  ShoppingCart,
  Search,
  Bell,
  Activity,
  History,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Globe,
  Warehouse,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  Zap,
  MapPin,
  CalendarRange,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useHasPermission } from "@/hooks/useHasPermission";
import { getStockSummary, getStockLogs, getStockStatuses } from "@/api/stockStatus";
import { getTankSummary } from "@/api/tank";
import { getSyncLogs } from "@/api/sapSync";
import { fmtDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ── Types & Constants ────────────────────────────────────── */

interface ActivityItem {
  id: number | string;
  type: string;
  title: string;
  subtitle: string;
  time: string;
  status?: "SUCCESS" | "FAILURE" | string;
}

interface ContractAlert {
  id: number;
  itemCode: string;
  itemName: string;
  vendorCode: string;
  vendorName: string;
  quantity: string;
  rate: string;
  location?: string;
  contractEnd: string;
  daysRemaining: number;
  isExpired: boolean;
  isUrgent: boolean;
}

interface QuickLink {
  to: string;
  label: string;
  icon: any;
  desc: string;
  category: "Reports" | "Operations" | "Commercials" | "Administration";
  /** Permission modules required — visible if user has ANY. Empty/omitted = visible to all. */
  modules?: string[];
}

const quickLinks: QuickLink[] = [
  // Reports
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Overview & analytics", category: "Reports", modules: ["domesticreports", "stockstatus"] },
  { to: "/stock-dashboard", label: "Stock Dashboard", icon: BarChart3, desc: "Stock across statuses", category: "Reports", modules: ["stockstatus"] },
  { to: "/reports/director-dashboard", label: "Director Dashboard", icon: Crown, desc: "Stage-wise inventory snapshot", category: "Reports", modules: ["director_report", "director_inventory", "director_inventorty", "domesticreports"] },
  { to: "/stock/warehouse-inventory", label: "Warehouse Inventory", icon: Warehouse, desc: "Live inventory by warehouse", category: "Reports", modules: ["inventory", "stockstatus"] },
  { to: "/reports/vehicle-report", label: "Vehicle Report", icon: Truck, desc: "Vehicle-wise stock movement", category: "Reports", modules: ["vehicle_report"] },
  { to: "/reports/contracts", label: "Contracts", icon: FileText, desc: "Expiring in-contract stock", category: "Reports", modules: ["stockstatus"] },
  { to: "/reports/planning", label: "Planning", icon: CalendarRange, desc: "Monthly SAP planning", category: "Reports", modules: ["domesticreports", "stockstatus"] },

  // Operations
  { to: "/stock/stock-status", label: "Stock Status", icon: ClipboardList, desc: "Track stock statuses", category: "Operations", modules: ["stockstatus"] },
  { to: "/stock/tank-monitoring", label: "Tank Monitoring", icon: Gauge, desc: "Live tank visuals", category: "Operations", modules: ["tankdata", "tanklayer"] },
  { to: "/stock/tank-items", label: "Tank Items", icon: Droplets, desc: "Manage tank items", category: "Operations", modules: ["tankitem"] },
  { to: "/stock/tank-data", label: "Tank Data", icon: Container, desc: "Manage tanks", category: "Operations", modules: ["tankdata"] },
  { to: "/stock/in-tank-breakdown", label: "In Tank Breakdown", icon: Droplets, desc: "Item-wise tank stock breakdown", category: "Operations", modules: ["stockstatus", "tankdata", "tanklayer"] },
  { to: "/stock/tank-logs", label: "Tank Logs", icon: ScrollText, desc: "Tank operation logs", category: "Operations", modules: ["tanklog"] },
  { to: "/stock/variance", label: "Shortage Report", icon: Scale, desc: "Shortage Report analysis", category: "Operations", modules: ["stockstatus"] },

  // Commercials
  { to: "/contracts/open-grpos", label: "Open GRPOs", icon: ShoppingCart, desc: "Open goods receipt orders", category: "Commercials", modules: ["open_grpos"] },
  { to: "/domestic-contracts", label: "Contracts (25-26)", icon: FileText, desc: "Historical orders", category: "Commercials", modules: ["domesticcontract"] },
  { to: "/contracts/domestic-2627", label: "Contracts (26-27)", icon: FileText, desc: "Active orders", category: "Commercials", modules: ["domesticcontract"] },
  { to: "/exim-rates", label: "Exchange Rates", icon: Globe, desc: "FX rates & conversion", category: "Commercials", modules: ["exim_rates"] },
  { to: "/exim-account", label: "Oil  CR/DR Outstanding", icon: BookOpen, desc: "Account & balance", category: "Commercials", modules: ["debitentry"] },
  { to: "/accounts/customer-outstanding", label: "Customer Outstanding", icon: ReceiptText, desc: "Customer balance sheet", category: "Commercials", modules: ["customer_balance_sheet"] },
  { to: "/accounts/customer-aging", label: "Customer Aging", icon: Clock, desc: "Customer aging balance", category: "Commercials", modules: ["customer_balance_sheet"] },
  { to: "/accounts/open-ars", label: "Open ARs", icon: FileText, desc: "Open receivable invoices", category: "Commercials", modules: ["customer_balance_sheet"] },
  { to: "/accounts/open-aps", label: "Open APs", icon: FileText, desc: "Open payable invoices", category: "Commercials", modules: ["balance_sheet"] },
  { to: "/accounts/open-pos", label: "Open POS", icon: FileText, desc: "Open purchase orders from SAP", category: "Commercials", modules: ["balance_sheet"] },
  { to: "/commodity/daily-price", label: "Daily Price", icon: TrendingUp, desc: "Commodity prices", category: "Commercials", modules: ["dailyprice"] },
  { to: "/commodity/jivo-rates", label: "Jivo Rates", icon: LineChart, desc: "Jivo commodity rates", category: "Commercials", modules: ["jivorates"] },
  { to: "/license/advance-license", label: "Advance License", icon: FileText, desc: "License management", category: "Commercials", modules: ["advancelicenseheaders"] },
  { to: "/license/dfia-license", label: "DFIA License", icon: FileText, desc: "DFIA license management", category: "Commercials", modules: ["dfialicenseheader"] },

  // Administration
  { to: "/admin/stock-updation-logs", label: "Stock Logs", icon: ScrollText, desc: "Stock update history", category: "Administration", modules: ["stockstatusupdatelog"] },
  { to: "/admin/users", label: "Users", icon: Users, desc: "Manage accounts", category: "Administration", modules: ["user"] },
  { to: "/admin/sync-raw-material-data", label: "Sync RM Data", icon: Package, desc: "Raw material sync", category: "Administration", modules: ["rmproducts"] },
  { to: "/admin/sync-finished-goods-data", label: "Sync FG Data", icon: Boxes, desc: "Finished goods sync", category: "Administration", modules: ["fgproducts"] },
  { to: "/admin/sync-vendor-data", label: "Sync Vendors", icon: Truck, desc: "SAP vendor sync", category: "Administration", modules: ["party"] },
  { to: "/admin/sync-logs", label: "Sync Logs", icon: ScrollText, desc: "View sync history", category: "Administration", modules: ["synclogs"] },
];

const CATEGORY_STYLES = {
  Reports: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white",
  Operations: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white",
  Commercials: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white",
  Administration: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white",
};

const CONTRACT_EXPIRY_SOON_DAYS = 7;

function dateOnly(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function getDaysRemaining(dateText?: string | null) {
  if (!dateText) return null;
  const [year, month, day] = dateText.split("-").map(Number);
  if (!year || !month || !day) return null;

  const endDate = new Date(year, month - 1, day);
  const today = dateOnly(new Date());
  return Math.ceil((dateOnly(endDate).getTime() - today.getTime()) / 86_400_000);
}

function formatContractAging(daysRemaining: number) {
  if (daysRemaining < 0) return `Expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} ago`;
  if (daysRemaining === 0) return "Expires today";
  if (daysRemaining === 1) return "Expires tomorrow";
  return `${daysRemaining} days remaining`;
}

function formatDateOnly(dateText: string) {
  const [year, month, day] = dateText.split("-").map(Number);
  if (!year || !month || !day) return dateText;
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ── Weather badge helpers ───────────────────────────────── */
interface WeatherData { temp: number; condition: string; city: string; Icon: React.ElementType; color: string; }

function weatherMeta(code: number): Omit<WeatherData, "temp" | "city"> {
  if (code === 0)        return { condition: "Clear",       Icon: Sun,       color: "#fde047" };
  if (code <= 3)         return { condition: "Cloudy",      Icon: Cloud,     color: "#94a3b8" };
  if (code <= 48)        return { condition: "Foggy",       Icon: Cloud,     color: "#94a3b8" };
  if (code <= 65)        return { condition: "Rainy",       Icon: CloudRain, color: "#7dd3fc" };
  if (code <= 77)        return { condition: "Snowy",       Icon: CloudSnow, color: "#e0f2fe" };
  if (code <= 82)        return { condition: "Showers",     Icon: CloudRain, color: "#7dd3fc" };
  return                        { condition: "Thunderstorm",Icon: Zap,       color: "#fde047" };
}

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
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60; // minute-level precision
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
  const { name, permissions } = useAuth();
  const { hasPermission } = useHasPermission();
  const [search, setSearch] = useState("");
  const [stockStats, setStockStats] = useState({ count: 0, val: 0 });
  const [tankStats, setTankStats] = useState({ count: 0, util: 0 });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [contractAlerts, setContractAlerts] = useState<ContractAlert[]>([]);
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lon } }) => {
        try {
          const [wRes, gRes] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`),
            fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`),
          ]);
          const wJson = await wRes.json();
          const gJson = await gRes.json();
          const meta = weatherMeta(wJson.current.weather_code);
          setWeather({ temp: Math.round(wJson.current.temperature_2m), city: gJson.city || gJson.locality || "", ...meta });
        } catch { /* non-critical */ }
      },
      () => { /* permission denied */ },
      { timeout: 10_000 },
    );
  }, []);

  useEffect(() => {
    async function loadStats() {
      // Load Stock Stats
      getStockSummary()
        .then((res) => setStockStats({ count: res.summary.total_count, val: res.summary.total_value }))
        .catch(() => { });

      // Load Tank Stats
      getTankSummary()
        .then((res) => setTankStats({ count: res.tank_count, util: res.utilisation_rate }))
        .catch(() => { });

      if (hasPermission("stockstatus", "view")) {
        getStockStatuses({ status: "IN_CONTRACT" })
          .then((res) => {
            const alerts = res
              .filter((contract) => !contract.deleted)
              .map((contract) => {
                const daysRemaining = getDaysRemaining(contract.contract_end);
                if (daysRemaining === null) return null;

                return {
                  id: contract.id,
                  itemCode: contract.item_code,
                  itemName: contract.item_name || contract.item_code,
                  vendorCode: contract.vendor_code,
                  vendorName: contract.vendor_name || contract.vendor_code,
                  quantity: contract.quantity,
                  rate: contract.rate,
                  location: contract.location,
                  contractEnd: contract.contract_end || "",
                  daysRemaining,
                  isExpired: daysRemaining < 0,
                  isUrgent: daysRemaining <= 2,
                };
              })
              .filter((alert): alert is ContractAlert => Boolean(alert))
              .filter((alert) => alert.daysRemaining <= CONTRACT_EXPIRY_SOON_DAYS)
              .sort((a, b) => a.daysRemaining - b.daysRemaining);

            setContractAlerts(alerts);
          })
          .catch(() => setContractAlerts([]));
      } else {
        setContractAlerts([]);
      }

      // Load Activity based on permissions
      if (hasPermission("synclogs", "view")) {
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
          .catch(() => { });
      } else {
        // Others see Stock Movement
        getStockLogs()
          .then((res) => {
            const activities: ActivityItem[] = res.slice(0, 5).map((log) => ({
              id: log.id,
              type: "stock",
              title: `ID #${log.stock} ${log.action}`,
              subtitle: log.note || `${(log.field_logs?.[0]?.field_name ?? "record").replace(/_/g, " ")} changed`,
              time: log.timestamp,
              status: "SUCCESS",
            }));
            setRecentActivity(activities);
          })
          .catch(() => { });
      }
    }
    loadStats();
  }, [permissions]);

  // Live sky/sun — updates every 60 seconds
  const [timeDisplay, setTimeDisplay] = useState(() => getTimeControl());
  useEffect(() => {
    const id = setInterval(() => setTimeDisplay(getTimeControl()), 60_000);
    return () => clearInterval(id);
  }, []);

  /** A link is visible if it has no module requirement OR the user has at least one */
  const filteredLinks = useMemo(() => {
    const q = search.toLowerCase();
    return quickLinks
      .filter((l) => !l.modules || l.modules.length === 0 || l.modules.some((m) => hasPermission(m, "view")))
      .filter((l) => l.label.toLowerCase().includes(q) || l.desc.toLowerCase().includes(q));
  }, [search, permissions, hasPermission]);

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
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-6 sm:space-y-8 lg:space-y-12 animate-page">
      {/* ── Hero & Grid Layout ── */}
      <div className="flex flex-col xl:flex-row gap-5 sm:gap-8">

        {/* Main Content (Hero + Search + Grid) */}
        <div className="flex-1 space-y-5 sm:space-y-8">

          {/* Hero Banner */}
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl h-[240px] sm:h-[260px] border border-black/10 dark:border-white/5 shadow-2xl group/hero">
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
            <div className="absolute top-3 right-3 sm:top-6 sm:right-6 z-20 flex flex-col items-end gap-2">
              <div className="flex gap-2 sm:gap-3">
                <div className="glass-morphism px-2.5 py-2 sm:p-3 rounded-xl sm:rounded-2xl border border-white/20 text-white animate-in zoom-in duration-500">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Shipments</p>
                  <p className="text-base sm:text-lg font-black">{stockStats.count}</p>
                </div>
                <div className="glass-morphism px-2.5 py-2 sm:p-3 rounded-xl sm:rounded-2xl border border-white/20 text-white animate-in zoom-in duration-700">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Utilisation</p>
                  <p className="text-base sm:text-lg font-black">{tankStats.util.toFixed(1)}%</p>
                </div>
              </div>
              {weather && (
                <div className="glass-morphism px-2.5 py-1.5 sm:px-3 rounded-xl sm:rounded-2xl border border-white/20 text-white flex items-center gap-1.5 sm:gap-2 animate-in zoom-in duration-700 max-w-[180px] sm:max-w-none">
                  <weather.Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" style={{ color: weather.color }} />
                  <span className="text-xs sm:text-sm font-black">{weather.temp}°C</span>
                  <span className="text-[10px] font-semibold opacity-70 hidden sm:inline">{weather.condition}</span>
                  {weather.city && (
                    <>
                      <div className="w-px h-3 bg-white/20 hidden sm:block" />
                      <MapPin className="h-3 w-3 opacity-50 shrink-0 hidden sm:block" />
                      <span className="text-[10px] opacity-60 max-w-[80px] truncate hidden sm:inline">{weather.city}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Welcome text */}
            <div className="relative z-10 flex flex-col justify-end sm:justify-center h-full px-4 pb-5 sm:px-12 sm:pb-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1 w-8 bg-primary rounded-full" />
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/80">
                  JIVO EXIM PORTAL
                </p>
              </div>
              <h1 className="text-xl sm:text-4xl font-black tracking-tight text-white drop-shadow-xl leading-tight pr-2 sm:pr-0">
                Welcome back, {name?.split(" ")[0] ?? "User"}
              </h1>
              <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-3">
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md px-2.5 py-1 text-[11px] sm:text-xs">
                  {name ?? "User"}
                </Badge>
                <p className="text-white/70 text-[11px] sm:text-xs font-medium flex items-center gap-1.5">
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
            <div className="absolute z-[5] pointer-events-none hidden sm:block" style={{ bottom: "-12%", width: "280px", height: "155px", animation: "shipSail 40s linear infinite" }}>
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
          <div className="relative w-full max-w-md mx-auto xl:mx-0">
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
          <div className="space-y-7 sm:space-y-10">
            {Object.entries(grouped).map(([category, links]) => {
              if (links.length === 0) return null;
              return (
                <div key={category} className="space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      {category}
                    </h2>
                    <div className="h-[1px] flex-1 bg-border/50" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {links.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="group relative overflow-hidden rounded-2xl border bg-card p-4 sm:p-5 flex items-start gap-3 sm:gap-4 transition-all hover:shadow-lg hover:-translate-y-1"
                      >
                        <div className={cn(
                          "flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
                          CATEGORY_STYLES[link.category as keyof typeof CATEGORY_STYLES]
                        )}>
                          <link.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-sm sm:text-base text-foreground truncate">{link.label}</p>
                            <ArrowRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-muted-foreground" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 sm:line-clamp-1">{link.desc}</p>
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
        <div className="w-full xl:w-[320px] space-y-4 sm:space-y-6">

          {/* Alerts Card */}
          <div className="rounded-3xl border bg-card overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setAlertsModalOpen(true)}
              className="w-full text-left bg-red-50 dark:bg-red-950/20 px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between border-b border-red-100 dark:border-red-900/30 hover:bg-red-100/70 dark:hover:bg-red-950/30 transition-colors"
            >
              <h3 className="text-xs font-bold uppercase tracking-widest text-red-600 flex items-center gap-2">
                <Bell className="h-3.5 w-3.5" /> Alerts
              </h3>
              <span className="flex items-center gap-2">
                <Badge variant="destructive" className="rounded-full px-2 py-0 h-5 text-[10px]">
                  {contractAlerts.length}
                </Badge>
                <ArrowRight className="h-3.5 w-3.5 text-red-500" />
              </span>
            </button>
            <button
              type="button"
              onClick={() => setAlertsModalOpen(true)}
              className="w-full p-4 space-y-3 text-left"
            >
              {contractAlerts.length > 0 ? (
                contractAlerts.slice(0, 3).map((contract) => (
                  <div
                    key={contract.id}
                    className={cn(
                      "flex gap-3 p-3 rounded-xl border transition-all",
                      contract.isExpired || contract.isUrgent
                        ? "bg-red-50/80 border-red-200 hover:bg-red-50 dark:bg-red-950/20 dark:border-red-900/40"
                        : "bg-amber-50/80 border-amber-200 hover:bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40"
                    )}
                  >
                    {contract.isExpired || contract.isUrgent ? (
                      <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold leading-tight truncate">{contract.itemName}</p>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                            contract.isExpired || contract.isUrgent
                              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                          )}
                        >
                          {formatContractAging(contract.daysRemaining)}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground truncate">{contract.vendorName}</p>
                      <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                        Contract end: {formatDateOnly(contract.contractEnd)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex gap-3 p-3 rounded-xl bg-muted/30 border border-transparent">
                  <Clock className="h-4 w-4 text-emerald-500 shrink-0" />
                  <p className="text-xs font-medium leading-tight">No contracts expiring in the next {CONTRACT_EXPIRY_SOON_DAYS} days</p>
                </div>
              )}
              {contractAlerts.length > 3 && (
                <p className="text-center text-[10px] font-bold uppercase tracking-widest text-primary">
                  View all {contractAlerts.length} expiring contracts
                </p>
              )}
            </button>
          </div>

          {/* Activity Feed */}
          <div className="rounded-3xl border bg-card overflow-hidden shadow-sm">
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between border-b">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <History className="h-3.5 w-3.5" /> Recent Activity
              </h3>
            </div>
            <div className="p-3 sm:p-4 relative">
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
                to={hasPermission("synclogs", "view") ? "/admin/sync-logs" : "/admin/stock-updation-logs"}
                className="mt-6 block text-center text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
              >
                View All History
              </Link>
            </div>
          </div>

        </div>
      </div>

      <Dialog open={alertsModalOpen} onOpenChange={setAlertsModalOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-3rem)] xl:max-w-[1400px] max-h-[88vh] overflow-hidden p-0">
          <DialogHeader className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b bg-red-50/80 dark:bg-red-950/20">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Expiring In-Contract Stocks
            </DialogTitle>
            <DialogDescription>
              Contracts with an end date within the next {CONTRACT_EXPIRY_SOON_DAYS} days.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[68vh] overflow-y-auto px-4 sm:px-6 py-4">
            {contractAlerts.length > 0 ? (
              <>
                <div className="hidden md:block rounded-xl border">
                  <table className="w-full table-fixed text-sm">
                    <thead className="bg-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="w-[18%] px-3 py-3 text-left font-bold">Item</th>
                        <th className="w-[22%] px-3 py-3 text-left font-bold">Vendor</th>
                        <th className="w-[10%] px-3 py-3 text-left font-bold">Qty</th>
                        <th className="w-[9%] px-3 py-3 text-left font-bold">Rate</th>
                        <th className="w-[12%] px-3 py-3 text-left font-bold">Location</th>
                        <th className="w-[13%] px-3 py-3 text-left font-bold">Contract End</th>
                        <th className="w-[16%] px-3 py-3 text-left font-bold">Aging</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {contractAlerts.map((contract) => (
                        <tr key={contract.id} className="hover:bg-muted/30">
                          <td className="px-3 py-3">
                            <p className="font-semibold truncate">{contract.itemName}</p>
                            <p className="text-xs text-muted-foreground truncate">{contract.itemCode}</p>
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-medium truncate">{contract.vendorName}</p>
                            <p className="text-xs text-muted-foreground truncate">{contract.vendorCode}</p>
                          </td>
                          <td className="px-3 py-3 font-medium whitespace-nowrap">{contract.quantity}</td>
                          <td className="px-3 py-3 font-medium whitespace-nowrap">{contract.rate}</td>
                          <td className="px-3 py-3 text-muted-foreground truncate">{contract.location || "-"}</td>
                          <td className="px-3 py-3 whitespace-nowrap">{formatDateOnly(contract.contractEnd)}</td>
                          <td className="px-3 py-3">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap",
                                contract.isExpired || contract.isUrgent
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                              )}
                            >
                              {formatContractAging(contract.daysRemaining)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden space-y-3">
                  {contractAlerts.map((contract) => (
                    <div
                      key={contract.id}
                      className={cn(
                        "rounded-xl border p-3",
                        contract.isExpired || contract.isUrgent
                          ? "bg-red-50/80 border-red-200 dark:bg-red-950/20 dark:border-red-900/40"
                          : "bg-amber-50/80 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{contract.itemName}</p>
                          <p className="text-xs text-muted-foreground">{contract.itemCode}</p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                            contract.isExpired || contract.isUrgent
                              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                          )}
                        >
                          {formatContractAging(contract.daysRemaining)}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <p><span className="text-muted-foreground">Vendor:</span> {contract.vendorName}</p>
                        <p><span className="text-muted-foreground">Qty:</span> {contract.quantity}</p>
                        <p><span className="text-muted-foreground">Rate:</span> {contract.rate}</p>
                        <p><span className="text-muted-foreground">End:</span> {formatDateOnly(contract.contractEnd)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Link
                  to="/reports/contracts"
                  onClick={() => setAlertsModalOpen(false)}
                  className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary hover:underline"
                >
                  Open Contracts Report <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </>
            ) : (
              <div className="py-10 text-center">
                <Clock className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
                <p className="text-sm font-semibold">No contracts expiring soon</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Nothing ends within the next {CONTRACT_EXPIRY_SOON_DAYS} days.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

