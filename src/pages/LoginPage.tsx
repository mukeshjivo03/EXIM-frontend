import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { Sun, Moon } from "lucide-react";

import { login } from "@/api/auth";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/* ── Cargo Ship SVG (same as HomePage) ─────────────────────── */
function CargoShip() {
  return (
    <svg viewBox="0 0 520 180" fill="none" overflow="visible" aria-hidden="true">
      <defs>
        <linearGradient id="loginHullSteel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5A6B7A" />
          <stop offset="35%" stopColor="#6E7F8E" />
          <stop offset="100%" stopColor="#4A5A68" />
        </linearGradient>
        <linearGradient id="loginHullAF" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7A2828" />
          <stop offset="100%" stopColor="#5C1E1E" />
        </linearGradient>
        <linearGradient id="loginBridgeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E2E6EA" />
          <stop offset="100%" stopColor="#C8CED4" />
        </linearGradient>
      </defs>
      <path d="M50,95 L50,125 L460,125 L440,95 Z" fill="url(#loginHullSteel)" stroke="#3D4D5C" strokeWidth="0.5" />
      <path d="M50,125 L32,158 L465,158 L460,125 Z" fill="url(#loginHullAF)" />
      <line x1="42" y1="125" x2="462" y2="125" stroke="#8A9AAA" strokeWidth="1" opacity="0.45" />
      <path d="M50,95 L18,125 L32,158 L50,125 Z" fill="url(#loginHullAF)" />
      <path d="M50,95 L18,125 L50,125 Z" fill="url(#loginHullSteel)" stroke="#3D4D5C" strokeWidth="0.5" />
      <ellipse cx="20" cy="154" rx="7" ry="4.5" fill="#5C1E1E" opacity="0.8" />
      <rect x="58" y="87" width="378" height="10" rx="1" fill="#4A5568" stroke="#3D4050" strokeWidth="0.3" />
      <rect x="65" y="55" width="40" height="32" rx="1.5" fill="#A63D32" stroke="#8A2D24" strokeWidth="0.5" />
      <rect x="108" y="55" width="40" height="32" rx="1.5" fill="#2D5B8A" stroke="#1E4670" strokeWidth="0.5" />
      <rect x="151" y="55" width="40" height="32" rx="1.5" fill="#4B7B4B" stroke="#3A6338" strokeWidth="0.5" />
      <rect x="194" y="55" width="40" height="32" rx="1.5" fill="#8B7030" stroke="#6E5820" strokeWidth="0.5" />
      <rect x="237" y="55" width="40" height="32" rx="1.5" fill="#5C5C5C" stroke="#444444" strokeWidth="0.5" />
      <rect x="280" y="55" width="40" height="32" rx="1.5" fill="#7B4B2A" stroke="#5E3A1E" strokeWidth="0.5" />
      <rect x="323" y="55" width="40" height="32" rx="1.5" fill="#A63D32" stroke="#8A2D24" strokeWidth="0.5" />
      <rect x="65" y="21" width="40" height="32" rx="1.5" fill="#2D5B8A" stroke="#1E4670" strokeWidth="0.5" />
      <rect x="108" y="21" width="40" height="32" rx="1.5" fill="#7B4B2A" stroke="#5E3A1E" strokeWidth="0.5" />
      <rect x="151" y="21" width="40" height="32" rx="1.5" fill="#A63D32" stroke="#8A2D24" strokeWidth="0.5" />
      <rect x="194" y="21" width="40" height="32" rx="1.5" fill="#4B7B4B" stroke="#3A6338" strokeWidth="0.5" />
      <rect x="237" y="21" width="40" height="32" rx="1.5" fill="#8B7030" stroke="#6E5820" strokeWidth="0.5" />
      <rect x="280" y="21" width="40" height="32" rx="1.5" fill="#5C5C5C" stroke="#444444" strokeWidth="0.5" />
      <rect x="108" y="-13" width="40" height="32" rx="1.5" fill="#5C5C5C" stroke="#444444" strokeWidth="0.5" />
      <rect x="151" y="-13" width="40" height="32" rx="1.5" fill="#2D5B8A" stroke="#1E4670" strokeWidth="0.5" />
      <rect x="194" y="-13" width="40" height="32" rx="1.5" fill="#7B4B2A" stroke="#5E3A1E" strokeWidth="0.5" />
      <rect x="237" y="-13" width="40" height="32" rx="1.5" fill="#A63D32" stroke="#8A2D24" strokeWidth="0.5" />
      {[65, 108, 151, 194, 237, 280, 323].map((x) => (
        <line key={`s1-${x}`} x1={x + 20} y1={57} x2={x + 20} y2={85} stroke="rgba(0,0,0,0.1)" strokeWidth="0.4" />
      ))}
      {[65, 108, 151, 194, 237, 280].map((x) => (
        <line key={`s2-${x}`} x1={x + 20} y1={23} x2={x + 20} y2={51} stroke="rgba(0,0,0,0.1)" strokeWidth="0.4" />
      ))}
      <line x1="372" y1="87" x2="372" y2="20" stroke="#5A6B7A" strokeWidth="2.5" />
      <line x1="372" y1="22" x2="348" y2="48" stroke="#5A6B7A" strokeWidth="1.5" />
      <line x1="372" y1="22" x2="396" y2="48" stroke="#718096" strokeWidth="0.8" opacity="0.5" />
      <line x1="348" y1="48" x2="348" y2="62" stroke="#8A9AAA" strokeWidth="0.5" strokeDasharray="2 2" />
      <rect x="382" y="50" width="52" height="37" rx="2" fill="url(#loginBridgeGrad)" stroke="#A0A8B0" strokeWidth="0.4" />
      <rect x="384" y="30" width="46" height="22" rx="2" fill="url(#loginBridgeGrad)" stroke="#A0A8B0" strokeWidth="0.4" />
      <rect x="378" y="28" width="58" height="3" rx="1" fill="#B0B8C0" />
      {[387, 400, 413].map((x) => (
        <rect key={`wu-${x}`} x={x} y="34" width="10" height="7" rx="1" fill="#6B8DAB" opacity="0.85" />
      ))}
      {[386, 398, 410, 422].map((x) => (
        <rect key={`wl-${x}`} x={x} y="56" width="9" height="6" rx="0.8" fill="#6B8DAB" opacity="0.6" />
      ))}
      <rect x="398" y="6" width="16" height="24" rx="1.5" fill="#2D3748" stroke="#1A2332" strokeWidth="0.4" />
      <rect x="398" y="16" width="16" height="5" rx="0.5" fill="#A63D32" />
      <rect x="394" y="4" width="24" height="3" rx="1" fill="#1A2332" />
      <line x1="406" y1="4" x2="406" y2="-10" stroke="#718096" strokeWidth="1.5" />
      <line x1="399" y1="-6" x2="413" y2="-6" stroke="#718096" strokeWidth="1" />
      <circle cx="406" cy="-10" r="1.8" fill="#A0AEC0" stroke="#8090A0" strokeWidth="0.4" />
      <circle cx="406" cy="0" r="4" fill="#5A6A7A" className="ship-smoke smoke-1" />
      <circle cx="404" cy="-7" r="5.5" fill="#5A6A7A" className="ship-smoke smoke-2" />
      <circle cx="401" cy="-16" r="7" fill="#5A6A7A" className="ship-smoke smoke-3" />
      <circle cx="40" cy="100" r="2.5" fill="none" stroke="#8A9AAA" strokeWidth="0.8" />
      <line x1="40" y1="102.5" x2="40" y2="108" stroke="#8A9AAA" strokeWidth="0.8" />
      <path d="M14,150 Q6,142 12,134" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <path d="M10,155 Q0,146 8,136" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
    </svg>
  );
}

/* ── Wave paths ────────────────────────────────────────────── */
const WAVE_BACK =
  "M0,50 Q120,35 240,50 Q360,65 480,50 Q600,35 720,50 Q840,65 960,50 Q1080,35 1200,50 Q1320,65 1440,50 Q1560,35 1680,50 Q1800,65 1920,50 Q2040,35 2160,50 Q2280,65 2400,50 Q2520,35 2640,50 Q2760,65 2880,50 L2880,120 L0,120 Z";

const WAVE_MID =
  "M0,55 Q90,37 180,55 Q270,73 360,55 Q450,37 540,55 Q630,73 720,55 Q810,37 900,55 Q990,73 1080,55 Q1170,37 1260,55 Q1350,73 1440,55 Q1530,37 1620,55 Q1710,73 1800,55 Q1890,37 1980,55 Q2070,73 2160,55 Q2250,37 2340,55 Q2430,73 2520,55 Q2610,37 2700,55 Q2790,73 2880,55 L2880,120 L0,120 Z";

const WAVE_FRONT =
  "M0,50 Q60,38 120,50 Q180,62 240,50 Q300,38 360,50 Q420,62 480,50 Q540,38 600,50 Q660,62 720,50 Q780,38 840,50 Q900,62 960,50 Q1020,38 1080,50 Q1140,62 1200,50 Q1260,38 1320,50 Q1380,62 1440,50 Q1500,38 1560,50 Q1620,62 1680,50 Q1740,38 1800,50 Q1860,62 1920,50 Q1980,38 2040,50 Q2100,62 2160,50 Q2220,38 2280,50 Q2340,62 2400,50 Q2460,38 2520,50 Q2580,62 2640,50 Q2700,38 2760,50 Q2820,62 2880,50 L2880,120 L0,120 Z";

const WAVE_FOAM =
  "M0,50 Q60,38 120,50 Q180,62 240,50 Q300,38 360,50 Q420,62 480,50 Q540,38 600,50 Q660,62 720,50 Q780,38 840,50 Q900,62 960,50 Q1020,38 1080,50 Q1140,62 1200,50 Q1260,38 1320,50 Q1380,62 1440,50 Q1500,38 1560,50 Q1620,62 1680,50 Q1740,38 1800,50 Q1860,62 1920,50 Q1980,38 2040,50 Q2100,62 2160,50 Q2220,38 2280,50 Q2340,62 2400,50 Q2460,38 2520,50 Q2580,62 2640,50 Q2700,38 2760,50 Q2820,62 2880,50";

/* ── Route Map SVG (shipping route with port markers) ────── */
function RouteMap() {
  return (
    <svg
      viewBox="0 0 1200 400"
      fill="none"
      className="absolute inset-0 w-full h-full opacity-[0.08] dark:opacity-[0.06]"
      aria-hidden="true"
    >
      {/* Simplified world coastline hints */}
      {/* India */}
      <path d="M650,140 Q680,160 670,200 Q660,240 640,260 Q630,250 635,220 Q640,180 650,140 Z" fill="currentColor" opacity="0.3" />
      {/* Africa east coast */}
      <path d="M500,120 Q510,180 490,240 Q480,200 500,120 Z" fill="currentColor" opacity="0.2" />
      {/* Southeast Asia */}
      <path d="M800,160 Q820,180 810,210 Q790,200 800,160 Z" fill="currentColor" opacity="0.2" />
      {/* Europe */}
      <path d="M380,80 Q400,60 420,70 Q440,80 430,100 Q410,90 380,80 Z" fill="currentColor" opacity="0.2" />

      {/* Shipping route — dashed curved line */}
      <path
        d="M200,180 Q350,120 500,160 Q600,190 650,200 Q700,210 800,180 Q900,150 1000,170"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="8 6"
        opacity="0.4"
        fill="none"
        className="login-route-line"
      />

      {/* Port markers */}
      <circle cx="200" cy="180" r="5" fill="currentColor" opacity="0.5" />
      <circle cx="500" cy="160" r="4" fill="currentColor" opacity="0.4" />
      <circle cx="650" cy="200" r="5" fill="currentColor" opacity="0.5" />
      <circle cx="800" cy="180" r="4" fill="currentColor" opacity="0.4" />
      <circle cx="1000" cy="170" r="5" fill="currentColor" opacity="0.5" />

      {/* Port labels */}
      <text x="185" y="170" fontSize="10" fill="currentColor" opacity="0.4">PORT</text>
      <text x="635" y="220" fontSize="10" fill="currentColor" opacity="0.4">INDIA</text>
      <text x="985" y="160" fontSize="10" fill="currentColor" opacity="0.4">PORT</text>
    </svg>
  );
}

/* ── Stars background (dark mode only) ─────────────────────── */
function Stars() {
  // Deterministic star positions
  const stars = [
    { x: 5, y: 8, r: 1.2, o: 0.9, d: 0 },
    { x: 12, y: 3, r: 0.8, o: 0.6, d: 0.5 },
    { x: 20, y: 12, r: 1, o: 0.7, d: 1.2 },
    { x: 28, y: 5, r: 1.4, o: 0.8, d: 0.3 },
    { x: 35, y: 15, r: 0.7, o: 0.5, d: 1.8 },
    { x: 42, y: 2, r: 1.1, o: 0.9, d: 0.7 },
    { x: 48, y: 18, r: 0.9, o: 0.6, d: 1.4 },
    { x: 55, y: 7, r: 1.3, o: 0.8, d: 0.1 },
    { x: 62, y: 20, r: 0.6, o: 0.5, d: 2.0 },
    { x: 68, y: 4, r: 1, o: 0.7, d: 0.9 },
    { x: 75, y: 14, r: 1.5, o: 0.9, d: 0.4 },
    { x: 82, y: 9, r: 0.8, o: 0.6, d: 1.6 },
    { x: 88, y: 1, r: 1.2, o: 0.8, d: 0.2 },
    { x: 93, y: 16, r: 0.7, o: 0.5, d: 1.1 },
    { x: 97, y: 6, r: 1, o: 0.7, d: 0.6 },
    { x: 15, y: 22, r: 0.6, o: 0.4, d: 1.9 },
    { x: 32, y: 25, r: 0.9, o: 0.5, d: 0.8 },
    { x: 50, y: 24, r: 0.7, o: 0.4, d: 1.5 },
    { x: 72, y: 22, r: 0.8, o: 0.5, d: 0.3 },
    { x: 85, y: 26, r: 0.6, o: 0.4, d: 1.7 },
    { x: 8, y: 28, r: 1.1, o: 0.6, d: 1.0 },
    { x: 25, y: 30, r: 0.5, o: 0.3, d: 2.2 },
    { x: 45, y: 28, r: 0.8, o: 0.5, d: 0.5 },
    { x: 60, y: 32, r: 0.6, o: 0.4, d: 1.3 },
    { x: 78, y: 30, r: 0.9, o: 0.5, d: 0.7 },
    { x: 90, y: 33, r: 0.7, o: 0.4, d: 1.8 },
    { x: 3, y: 35, r: 0.5, o: 0.3, d: 2.0 },
    { x: 38, y: 35, r: 0.6, o: 0.3, d: 1.2 },
    { x: 95, y: 38, r: 0.5, o: 0.3, d: 0.4 },
    { x: 18, y: 38, r: 0.7, o: 0.4, d: 1.6 },
  ];

  return (
    <div className="absolute inset-0 hidden dark:block pointer-events-none z-[0]" aria-hidden="true">
      {stars.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white login-star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.r * 2}px`,
            height: `${s.r * 2}px`,
            opacity: s.o,
            animationDelay: `${s.d}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Component ─────────────────────────────────────────────── */
export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { access, refresh, role, name } = await login({ email, password });
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);
      localStorage.setItem("user_role", role);
      localStorage.setItem("user_name", name);
      localStorage.setItem("user_email", email);

      setAuth(name, role, email);
      navigate("/");
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail ?? err.message);
      } else {
        setError("Login failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-sky-100 via-blue-50 to-cyan-100 dark:from-[#0a1628] dark:via-[#0f1f3a] dark:to-[#0c1a2e] px-4 transition-colors duration-500">

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-5 right-5 z-50 flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 transition-colors"
      >
        {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        {theme === "dark" ? "Light" : "Dark"}
      </button>

      {/* Stars (dark mode only) */}
      <Stars />

      {/* Route map background */}
      <RouteMap />

      {/* Sky gradient overlay */}
      <div className="absolute inset-0 login-sky pointer-events-none" />

      {/* Sun / Moon */}
      <div className="absolute top-8 left-16 z-[1] pointer-events-none" aria-hidden="true">
        <div className="block dark:hidden w-14 h-14 rounded-full bg-[radial-gradient(circle_at_40%_40%,#FDE68A,#F59E0B_50%,#D97706_100%)] opacity-50 shadow-[0_0_50px_15px_rgba(245,158,11,0.2)]" />
        <div className="hidden dark:block w-10 h-10 rounded-full bg-[radial-gradient(circle_at_65%_35%,#D0D4DA,#A8B0BC_60%,#8090A0_100%)] opacity-60 shadow-[0_0_30px_10px_rgba(160,176,192,0.12)]" />
      </div>

      {/* Ocean section — bottom half */}
      <div className="absolute bottom-0 left-0 right-0 h-[45%] overflow-hidden pointer-events-none">
        {/* Back wave */}
        <div className="absolute bottom-0 left-0 w-[200%] ocean-wave-back" style={{ height: "80%" }}>
          <svg viewBox="0 0 2880 120" preserveAspectRatio="none" className="w-full h-full" aria-hidden="true">
            <path d={WAVE_BACK} className="login-wave-back" />
          </svg>
        </div>

        {/* Mid wave */}
        <div className="absolute bottom-0 left-0 w-[200%] ocean-wave-mid" style={{ height: "65%" }}>
          <svg viewBox="0 0 2880 120" preserveAspectRatio="none" className="w-full h-full" aria-hidden="true">
            <path d={WAVE_MID} className="login-wave-mid" />
          </svg>
        </div>

        {/* Cargo Ship sailing */}
        <div
          className="absolute z-[5] ship-sail pointer-events-none"
          style={{ bottom: "15%", width: "200px", height: "110px" }}
        >
          <div className="ship-bob w-full h-full">
            <CargoShip />
          </div>
        </div>


        {/* Front wave */}
        <div className="absolute bottom-0 left-0 w-[200%] z-[6] ocean-wave-front" style={{ height: "50%" }}>
          <svg viewBox="0 0 2880 120" preserveAspectRatio="none" className="w-full h-full" aria-hidden="true">
            <path d={WAVE_FRONT} className="login-wave-front" />
            <path d={WAVE_FOAM} fill="none" stroke="white" strokeWidth="1" opacity="0.1" />
          </svg>
        </div>
      </div>

      {/* Login Card */}
      <div className="login-card relative z-20 w-full max-w-lg rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#1e293b]/90 backdrop-blur-xl p-12 py-14 shadow-2xl">
        {/* Header */}
        <div className="text-center space-y-3 mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            JIVO EXIM
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-7">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your email"
              className="h-11 login-input bg-white/60 dark:bg-[#0f172a] border-gray-300 dark:border-white/10 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              className="h-11 login-input bg-white/60 dark:bg-[#0f172a] border-gray-300 dark:border-white/10 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full h-11 text-[15px] btn-press"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
