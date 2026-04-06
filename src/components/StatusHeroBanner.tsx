import { motion, AnimatePresence } from "framer-motion";

/* ═══════════════════════════════════════════════════════════
   PALETTE — Navy / Teal / Cyan flat vector
═══════════════════════════════════════════════════════════ */
const C = {
  navy: "#0B1D33", navyMid: "#132D4A", navyLight: "#1B3F5E",
  teal: "#0D9488", tealLight: "#2DD4BF", tealDark: "#0F766E",
  cyan: "#06B6D4", cyanLight: "#67E8F9",
  steel: "#3B5068", steelLight: "#5A7A96",
  white: "#FFFFFF", dim: "#94A3B8",
  red: "#A63D32", brown: "#7B4B2A", green: "#4B7B4B", gold: "#8B7030", grey: "#5C5C5C",
};

/* ═══════════════════════════════════════════════════════════
   HORIZON — consistent floor line across all statuses
═══════════════════════════════════════════════════════════ */
const HORIZON_Y = 220; // px from top in 300px banner

function FogLayer() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
      <motion.div
        className="absolute inset-0"
        style={{
          width: "300%",
          backgroundImage: "radial-gradient(ellipse at center, rgba(6, 182, 212, 0.05) 0%, transparent 50%), radial-gradient(ellipse at center, rgba(13, 148, 136, 0.05) 0%, transparent 50%)",
          backgroundSize: "600px 100px, 800px 150px",
          backgroundPosition: "0% 70%, 100px 80%",
          backgroundRepeat: "repeat-x"
        }}
        animate={{ x: [0, -600] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

function HorizonLine() {
  return <line x1="0" y1={HORIZON_Y} x2="1200" y2={HORIZON_Y} stroke={C.steelLight} strokeWidth="2" opacity="0.3" />;
}

/* ═══════════════════════════════════════════════════════════
   SCENE: IN_CONTRACT — Pen drawing signature
═══════════════════════════════════════════════════════════ */
function ContractScene() {
  return (
    <g>
      {/* Document */}
      <rect x="530" y="80" width="140" height="180" rx="4" fill={C.navyLight} stroke={C.steelLight} strokeWidth="1.5" />
      <rect x="530" y="80" width="140" height="24" rx="4" fill={C.tealDark} />
      <text x="600" y="96" textAnchor="middle" fill={C.white} fontSize="10" fontWeight="bold">CONTRACT</text>
      {[0,1,2,3,4,5].map(i => (
        <line key={i} x1="548" y1={118 + i * 14} x2={640 - (i === 5 ? 30 : 0)} y2={118 + i * 14} stroke={C.dim} strokeWidth="1.5" opacity="0.4" />
      ))}
      {/* Signature line */}
      <line x1="548" y1="220" x2="652" y2="220" stroke={C.teal} strokeWidth="1.5" />
      {/* Animated pen */}
      <motion.g
        animate={{ x: [0, 80, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <rect x="548" y="200" width="4" height="28" rx="1" fill={C.gold} transform="rotate(-20, 550, 214)" />
        <polygon points="548,228 550,236 552,228" fill={C.red} transform="rotate(-20, 550, 214)" />
      </motion.g>
      {/* Animated signature path */}
      <motion.path
        d="M548,218 Q565,208 578,218 Q590,228 602,218 Q614,208 625,218 Q638,228 650,218"
        fill="none" stroke={C.teal} strokeWidth="1.5"
        initial={{ pathLength: 0 }} animate={{ pathLength: [0, 1, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Stamp */}
      <circle cx="440" cy="170" r="30" fill="none" stroke={C.tealLight} strokeWidth="2.5" opacity="0.5" />
      <circle cx="440" cy="170" r="22" fill="none" stroke={C.tealLight} strokeWidth="1" opacity="0.3" />
      <text x="440" y="167" textAnchor="middle" fill={C.tealLight} fontSize="8" fontWeight="bold" opacity="0.5">APPROVED</text>
      <text x="440" y="178" textAnchor="middle" fill={C.tealLight} fontSize="6" opacity="0.4">✓ VERIFIED</text>
      {/* Coins */}
      {[730, 760, 790].map((cx, i) => (
        <g key={i}>
          <circle cx={cx} cy={190 + (i % 2) * 10} r="12" fill={C.gold} opacity="0.3" />
          <text x={cx} y={194 + (i % 2) * 10} textAnchor="middle" fill={C.gold} fontSize="10" fontWeight="bold" opacity="0.4">$</text>
        </g>
      ))}
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCENE: ON_THE_SEA — Cargo ship with buoyancy
═══════════════════════════════════════════════════════════ */
function SeaScene() {
  return (
    <g>
      {/* Water */}
      <rect x="0" y={HORIZON_Y} width="1200" height="80" fill={C.navyMid} opacity="0.6" />
      {/* Gentle waves */}
      <motion.path d="M0,225 Q150,215 300,225 Q450,235 600,225 Q750,215 900,225 Q1050,235 1200,225"
        stroke={C.tealLight} strokeWidth="1.5" fill="none" opacity="0.3"
        animate={{ x: [0, -150, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} />
      <motion.path d="M0,235 Q100,227 200,235 Q300,243 400,235 Q500,227 600,235 Q700,243 800,235 Q900,227 1000,235 Q1100,243 1200,235"
        stroke={C.cyan} strokeWidth="1" fill="none" opacity="0.2"
        animate={{ x: [0, 100, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} />
      {/* Ship with buoyancy */}
      <motion.g
        animate={{ y: [0, -8, 0], rotate: [0, 1, 0, -1, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{ originX: "600px", originY: "200px" }}
      >
        {/* Hull */}
        <path d="M440,185 L440,205 L760,205 L745,185 Z" fill={C.steel} />
        <path d="M440,205 L428,225 L763,225 L760,205 Z" fill={C.red} />
        <path d="M440,185 L418,205 L428,225 L440,205 Z" fill={C.red} />
        <path d="M440,185 L418,205 L440,205 Z" fill={C.steel} />
        {/* Deck */}
        <rect x="446" y="179" width="300" height="8" rx="1" fill={C.navyLight} />
        {/* Containers row 1 */}
        {[452,486,520,554,588,622,656].map((x,i) => (
          <rect key={`c1-${i}`} x={x} y="153" width="30" height="26" rx="1" fill={[C.red,C.navyMid,C.green,C.gold,C.grey,C.brown,C.red][i]} />
        ))}
        {/* Containers row 2 */}
        {[452,486,520,554,588,622].map((x,i) => (
          <rect key={`c2-${i}`} x={x} y="125" width="30" height="26" rx="1" fill={[C.navyMid,C.brown,C.red,C.green,C.gold,C.grey][i]} />
        ))}
        {/* Containers row 3 */}
        {[486,520,554,588].map((x,i) => (
          <rect key={`c3-${i}`} x={x} y="97" width="30" height="26" rx="1" fill={[C.grey,C.navyMid,C.brown,C.red][i]} />
        ))}
        {/* Bridge */}
        <rect x="690" y="145" width="42" height="34" rx="2" fill={C.steelLight} />
        <rect x="692" y="128" width="36" height="18" rx="2" fill={C.steelLight} />
        {[695,706,717].map(x => <rect key={x} x={x} y="131" width="8" height="6" rx="1" fill={C.cyan} opacity="0.6" />)}
        {/* Funnel */}
        <rect x="704" y="108" width="12" height="20" rx="1" fill={C.navyLight} />
        <rect x="704" y="118" width="12" height="4" fill={C.red} />
        {/* Smoke */}
        <motion.circle cx="710" cy="104" r="4" fill={C.dim} animate={{ opacity: [0.4, 0], y: [0, -20], scale: [1, 2.5] }} transition={{ duration: 3, repeat: Infinity }} />
        <motion.circle cx="708" cy="96" r="5" fill={C.dim} animate={{ opacity: [0.3, 0], y: [0, -25], scale: [1, 2.8] }} transition={{ duration: 3, repeat: Infinity, delay: 1 }} />
        {/* Crane */}
        <line x1="680" y1="179" x2="680" y2="120" stroke={C.steel} strokeWidth="2" />
        <line x1="680" y1="122" x2="660" y2="148" stroke={C.steel} strokeWidth="1.5" />
      </motion.g>
      {/* Front wave */}
      <motion.path d="M0,240 Q60,232 120,240 Q180,248 240,240 Q300,232 360,240 Q420,248 480,240 Q540,232 600,240 Q660,248 720,240 Q780,232 840,240 Q900,248 960,240 Q1020,232 1080,240 Q1140,248 1200,240 L1200,300 L0,300 Z"
        fill={C.navyLight} opacity="0.8"
        animate={{ x: [0, -60, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }} />
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCENE: MUNDRA_PORT — Crane loading container
═══════════════════════════════════════════════════════════ */
function PortScene() {
  return (
    <g>
      {/* Quay */}
      <rect x="0" y={HORIZON_Y} width="1200" height="80" fill="#3D2E22" />
      <rect x="0" y={HORIZON_Y - 4} width="1200" height="6" fill={C.steel} />
      {/* Water behind */}
      <rect x="0" y={HORIZON_Y - 14} width="1200" height="12" fill={C.navyMid} opacity="0.5" />
      {/* Stacked containers */}
      {[[350,170,C.red],[350,144,C.gold],[350,118,C.green],[400,170,C.navyMid],[400,144,C.brown],[450,170,C.grey],[450,144,C.red],[500,170,C.green]].map(([x,y,c],i) => (
        <rect key={i} x={x as number} y={y as number} width="46" height="24" rx="1" fill={c as string} />
      ))}
      {/* Gantry crane */}
      {[600].map(cx => (
        <g key={cx}>
          <rect x={cx - 4} y="60" width="8" height={HORIZON_Y - 60} fill={C.steelLight} />
          <rect x={cx + 70 - 4} y="60" width="8" height={HORIZON_Y - 60} fill={C.steelLight} />
          <rect x={cx - 30} y="52" width="130" height="10" rx="2" fill={C.dim} />
          {/* Trolley */}
          <motion.g animate={{ x: [0, 40, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
            <rect x={cx + 10} y="62" width="20" height="8" rx="2" fill={C.gold} />
            {/* Cable + container */}
            <motion.g animate={{ y: [0, 60, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
              <line x1={cx + 20} y1="70" x2={cx + 20} y2="100" stroke={C.dim} strokeWidth="1.5" />
              <rect x={cx + 6} y="100" width="28" height="18" rx="1" fill={C.red} />
            </motion.g>
          </motion.g>
          {/* Mast */}
          <rect x={cx + 28} y="16" width="8" height="40" fill={C.steelLight} />
          <rect x={cx + 20} y="38" width="24" height="16" rx="2" fill={C.navyMid} />
        </g>
      ))}
      {/* Docked ship silhouette */}
      <path d="M750,180 L950,180 L960,210 L740,210 Z" fill={C.navyLight} opacity="0.6" />
      <rect x="780" y="155" width="120" height="26" fill={C.steel} opacity="0.5" />
      <rect x="810" y="138" width="70" height="18" fill={C.steelLight} opacity="0.4" />
      {/* Bollards */}
      {[300,500,700,900].map(x => <rect key={x} x={x} y={HORIZON_Y} width="8" height="10" rx="2" fill={C.steel} />)}
    </g>
  );
}

function TruckScene() {
  return (
    <g>
      {/* Hills / Parallax Environment - Refinery Silhouette slowly moving */}
      <motion.g animate={{ x: [0, -100] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
        <g opacity="0.35">
          {[450, 600, 750, 900, 1050, 1200, 1350].map((x, i) => (
            <g key={i}>
              <rect x={x} y={80 + (i % 2) * 20} width={30 + (i % 3) * 10} height={HORIZON_Y - 80 - (i % 2) * 20} fill="#0B1D33" />
              <rect x={x + 10} y={70 + (i % 2) * 20} width="10" height="20" fill="#0D9488" />
            </g>
          ))}
        </g>
      </motion.g>

      {/* Road */}
      <rect x="0" y={HORIZON_Y - 4} width="1200" height="50" fill="#0f172a" opacity="0.8" />
      <rect x="0" y={HORIZON_Y - 6} width="1200" height="4" fill="#0D9488" opacity="0.4" />

      {/* Speed Lines */}
      <motion.g animate={{ x: [1200, -200] }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}>
        <rect x="150" y={HORIZON_Y - 60} width="120" height="2" fill="#fff" opacity="0.3" />
        <rect x="600" y={HORIZON_Y - 30} width="90" height="2" fill="#0d9488" opacity="0.5" />
        <rect x="950" y={HORIZON_Y - 70} width="250" height="2" fill="#fff" opacity="0.2" />
        <rect x="250" y={HORIZON_Y - 100} width="150" height="2" fill="#0d9488" opacity="0.3" />
      </motion.g>

      {/* Truck with Y-axis Vibration */}
      <motion.g
        animate={{ y: [0, -1, 0, 1, 0] }}
        transition={{ duration: 0.08, repeat: Infinity, ease: "linear" }}
      >
        {/* Chassis */}
        <line x1="380" y1={HORIZON_Y - 14} x2="620" y2={HORIZON_Y - 14} stroke="#132D4A" strokeWidth="4" />

        {/* Tanker (Cylindrical) - Updated Color */}
        <rect x="390" y={HORIZON_Y - 80} width="150" height="60" rx="30" fill="#3B5068" />
        <rect x="420" y={HORIZON_Y - 60} width="90" height="20" rx="10" fill="#5A7A96" opacity="0.8" />
        {/* Valves/Hatches */}
        <rect x="430" y={HORIZON_Y - 90} width="15" height="10" rx="4" fill="#3B5068" />
        <rect x="480" y={HORIZON_Y - 90} width="15" height="10" rx="4" fill="#3B5068" />
        <line x1="390" y1={HORIZON_Y - 50} x2="540" y2={HORIZON_Y - 50} stroke="#1B3F5E" strokeWidth="2" opacity="0.5" />

        {/* Cab - Updated Color */}
        <rect x="550" y={HORIZON_Y - 70} width="50" height="50" rx="6" fill="#132D4A" />
        <rect x="560" y={HORIZON_Y - 65} width="35" height="20" rx="4" fill="#06B6D4" opacity="0.4" />
        {/* Exhaust */}
        <rect x="590" y={HORIZON_Y - 95} width="4" height="25" rx="1" fill="#132D4A" /> 
        <motion.circle cx="592" cy={HORIZON_Y - 100} r="4" fill="#94A3B8" opacity="0.5" animate={{ y: [0, -10], opacity: [0.5, 0], scale: [1, 2] }} transition={{ duration: 0.5, repeat: Infinity }} />

        {/* Wheels */}
        {[410, 450, 560, 590].map(cx => (
          <g key={cx}>
            <circle cx={cx} cy={HORIZON_Y - 10} r="14" fill="#0B1D33" />
            <motion.g
              animate={{ rotate: 360 }}
              transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: `${cx}px ${HORIZON_Y - 10}px` }}
            >
              <circle cx={cx} cy={HORIZON_Y - 10} r="6" fill="#5A7A96" />
              <line x1={cx - 6} y1={HORIZON_Y - 10} x2={cx + 6} y2={HORIZON_Y - 10} stroke="#fff" strokeWidth="2" opacity="0.8" />
              <line x1={cx} y1={HORIZON_Y - 16} x2={cx} y2={HORIZON_Y - 4} stroke="#fff" strokeWidth="2" opacity="0.8" />
            </motion.g>
          </g>
        ))}
      </motion.g>
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCENE: AT_REFINERY — Tanks with fill level animation
═══════════════════════════════════════════════════════════ */
function RefineryScene() {
  return (
    <g>
      <rect x="0" y={HORIZON_Y - 2} width="1200" height="40" fill={C.navyLight} />
      {/* 3 Main Interconnected Industrial Tanks */}
      {[250, 450, 650].map((cx, i) => (
        <g key={i}>
          {/* Main Tank Structure */}
          <rect x={cx - 50} y={60} width="100" height={HORIZON_Y - 60} rx="4" fill={C.navyMid} />
          {/* Tank Top Dome */}
          <path d={`M${cx - 50},60 Q${cx},40 ${cx + 50},60 Z`} fill={C.steel} />
          
          {/* Structural Bands */}
          <rect x={cx - 52} y={100} width="104" height="4" fill={C.navyLight} />
          <rect x={cx - 52} y={150} width="104" height="4" fill={C.navyLight} />

          {/* Thin Vertical Pipes */}
          <rect x={cx - 30} y={50} width="2" height={HORIZON_Y - 50} fill={C.steelLight} opacity="0.6" />
          <rect x={cx + 28} y={50} width="2" height={HORIZON_Y - 50} fill={C.steelLight} opacity="0.6" />

          {/* Liquid Fill - Translucent Teal with Sine Ripple */}
          <clipPath id={`refinery-tank-clip-${i}`}>
            <rect x={cx - 46} y={100} width="92" height={HORIZON_Y - 100} rx="2" />
          </clipPath>
          <g clipPath={`url(#refinery-tank-clip-${i})`}>
            {/* The liquid volume */}
            <rect x={cx - 46} y={120} width="92" height={HORIZON_Y - 120} fill={C.teal} opacity="0.3" />
            
            {/* The animated wave surface */}
            <motion.path 
              d={`M${cx - 60},120 Q${cx - 20},110 ${cx + 20},120 T${cx + 100},120 L${cx + 100},140 L${cx - 60},140 Z`}
              fill={C.cyan} opacity="0.4"
              animate={{ x: [0, -40, 0] }}
              transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut" }}
            />
          </g>

          {/* Indicator Light */}
          <motion.circle cx={cx} cy={25} r="3" fill={C.cyan}
            animate={{ opacity: [1, 0.2, 1], boxShadow: ["0px 0px 8px #06B6D4", "0px 0px 0px transparent", "0px 0px 8px #06B6D4"] }}
            transition={{ duration: 1.5 + i * 0.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <line x1={cx} y1={28} x2={cx} y2={45} stroke={C.steel} strokeWidth="2" />
        </g>
      ))}

      {/* Catwalks Bridging Tanks */}
      <rect x="300" y={145} width="100" height="4" fill={C.steel} />
      <rect x="300" y={135} width="100" height="2" fill={C.steelLight} opacity="0.5" />
      {[310, 330, 350, 370, 390].map(x => <rect key={x} x={x} y={135} width="2" height="10" fill={C.steelLight} opacity="0.5" />)}

      <rect x="500" y={95} width="100" height="4" fill={C.steel} />
      <rect x="500" y={85} width="100" height="2" fill={C.steelLight} opacity="0.5" />
      {[510, 530, 550, 570, 590].map(x => <rect key={x} x={x} y={85} width="2" height="10" fill={C.steelLight} opacity="0.5" />)}

      {/* Pipes connecting to ground network */}
      <rect x="0" y={HORIZON_Y - 14} width="1200" height="4" fill={C.cyan} opacity="0.3" />
      <rect x="0" y={HORIZON_Y - 8} width="1200" height="2" fill={C.teal} opacity="0.6" />
    </g>
  );
}

function LoadingScene() {
  return (
    <g>
      {/* Environment */}
      <rect x="0" y={HORIZON_Y - 4} width="1200" height="4" fill={C.teal} opacity="0.4" />
      
      {/* Loading Bay Structure */}
      {/* Large structural pillar */}
      <rect x="300" y="40" width="80" height={HORIZON_Y - 40} fill={C.navyMid} />
      <rect x="375" y="40" width="5" height={HORIZON_Y - 40} fill={C.navyLight} />
      
      {/* Canopy extending over the truck */}
      <path d="M250,50 L650,50 L630,70 L300,70 Z" fill={C.navyLight} />
      <rect x="300" y="70" width="300" height="10" fill={C.navyMid} />
      {/* Canopy lights (cyan spots) */}
      {[400, 480, 560].map(x => (
        <circle key={x} cx={x} cy="75" r="3" fill={C.cyan} opacity="0.6" />
      ))}

      {/* Loading Apparatus (Pipe dropping from canopy) */}
      <rect x="475" y="80" width="16" height="60" fill={C.steel} />
      <rect x="471" y="130" width="24" height="10" fill={C.steelLight} />
      
      {/* The Dynamic Flow (Using moving dashed line) */}
      <motion.line 
        x1="483" y1="140" x2="483" y2={HORIZON_Y - 75} 
        stroke={C.cyan} strokeWidth="6" strokeDasharray="10 5"
        animate={{ strokeDashoffset: [0, -30] }}
        transition={{ duration: 0.2, repeat: Infinity, ease: "linear" }}
        opacity="0.9"
      />

      {/* Truck (Static because it's loading) */}
      <g>
        {/* Chassis */}
        <line x1="380" y1={HORIZON_Y - 14} x2="620" y2={HORIZON_Y - 14} stroke={C.navyMid} strokeWidth="4" />

        {/* Tanker (Box with open top) */}
        <rect x="390" y={HORIZON_Y - 80} width="150" height="60" rx="10" fill={C.steel} />
        <rect x="390" y={HORIZON_Y - 80} width="150" height="4" fill={C.teal} opacity="0.4" />
        
        {/* Oil filling up animated mask */}
        <clipPath id="loading-tank-clip">
          <rect x="395" y={HORIZON_Y - 75} width="140" height="50" rx="8" />
        </clipPath>
        <rect x="395" y={HORIZON_Y - 75} width="140" height="50" rx="8" fill={C.navyMid} opacity="0.5" />
        <motion.rect x="395" width="140" fill={C.teal} opacity="0.8"
          clipPath="url(#loading-tank-clip)"
          animate={{ height: [0, 50], y: [HORIZON_Y - 25, HORIZON_Y - 75] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Hatch open */}
        <rect x="470" y={HORIZON_Y - 86} width="26" height="6" rx="2" fill={C.steelLight} />

        {/* Cab */}
        <rect x="550" y={HORIZON_Y - 70} width="50" height="50" rx="6" fill={C.tealDark} />
        <rect x="560" y={HORIZON_Y - 65} width="35" height="20" rx="4" fill={C.cyan} opacity="0.4" />
        <rect x="590" y={HORIZON_Y - 95} width="4" height="25" rx="1" fill={C.navyMid} /> 

        {/* Wheels */}
        {[410, 450, 560, 590].map(cx => (
          <g key={cx}>
            <circle cx={cx} cy={HORIZON_Y - 10} r="14" fill={C.navy} />
            <circle cx={cx} cy={HORIZON_Y - 10} r="6" fill={C.steelLight} />
          </g>
        ))}
      </g>
    </g>
  );
}

function TransitScene({ showFactory }: { showFactory?: boolean }) {
  return (
    <g>
      {/* Hills / Parallax Environment */}
      <motion.g animate={{ x: [0, -100] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }}>
        <ellipse cx="200" cy={HORIZON_Y} rx="250" ry="55" fill="#0F766E" opacity="0.3" />
        <ellipse cx="800" cy={HORIZON_Y} rx="280" ry="50" fill="#0F766E" opacity="0.2" />
        
        {/* Factory Silhouette for Outside Factory state */}
        {showFactory && (
          <g opacity="0.4">
            <rect x="300" y="100" width="120" height={HORIZON_Y - 100} fill="#1B3F5E" />
            <rect x="330" y="60" width="15" height="40" fill="#1B3F5E" />
            <rect x="380" y="40" width="15" height="60" fill="#1B3F5E" />
            <polygon points="420,100 480,100 450,60" fill="#1B3F5E" />
            <rect x="420" y="100" width="60" height={HORIZON_Y - 100} fill="#1B3F5E" />
          </g>
        )}

        {[150, 800, 1150, 1400].map((x, i) => (
          <g key={i}>
            <rect x={x + 4} y={HORIZON_Y - 40} width="6" height="40" fill="#132D4A" opacity="0.6" />
            <ellipse cx={x + 7} cy={HORIZON_Y - 45} rx="18" ry="24" fill="#0F766E" opacity="0.5" />
          </g>
        ))}
      </motion.g>

      {/* Road */}
      <rect x="0" y={HORIZON_Y - 4} width="1200" height="50" fill="#0B1D33" opacity="0.8" />
      <rect x="0" y={HORIZON_Y - 6} width="1200" height="4" fill="#2DD4BF" opacity="0.4" />

      {/* Speed Lines */}
      <motion.g animate={{ x: [1200, -200] }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
        <rect x="100" y={HORIZON_Y - 50} width="150" height="2" fill="#fff" opacity="0.3" />
        <rect x="500" y={HORIZON_Y - 20} width="80" height="2" fill="#2DD4BF" opacity="0.5" />
        <rect x="800" y={HORIZON_Y - 80} width="200" height="2" fill="#fff" opacity="0.2" />
        <rect x="1200" y={HORIZON_Y - 40} width="100" height="2" fill="#2DD4BF" opacity="0.4" />
      </motion.g>

      {/* Truck with Y-axis Vibration */}
      <motion.g
        animate={{ y: [0, -1, 0, 1, 0] }}
        transition={{ duration: 0.1, repeat: Infinity, ease: "linear" }}
      >
        {/* Chassis */}
        <line x1="380" y1={HORIZON_Y - 14} x2="620" y2={HORIZON_Y - 14} stroke="#132D4A" strokeWidth="4" />

        {/* Trailer (Box) - New Colors */}
        <rect x="390" y={HORIZON_Y - 100} width="150" height="80" rx="4" fill="#0F766E" />
        {/* Ribbing lines */}
        {[0, 1, 2, 3].map(i => (
          <line key={i} x1="390" y1={HORIZON_Y - 80 + i * 15} x2="540" y2={HORIZON_Y - 80 + i * 15} stroke="#0D9488" strokeWidth="2" opacity="0.6" />
        ))}
        {/* LOGISTICS text removed as instructed */}

        {/* Cab - New Colors */}
        <rect x="550" y={HORIZON_Y - 70} width="50" height="50" rx="6" fill="#132D4A" />
        <rect x="560" y={HORIZON_Y - 65} width="35" height="20" rx="4" fill="#2DD4BF" opacity="0.3" />
        {/* Exhaust */}
        <rect x="590" y={HORIZON_Y - 95} width="4" height="25" rx="1" fill="#132D4A" /> 
        <motion.circle cx="592" cy={HORIZON_Y - 100} r="4" fill="#94A3B8" opacity="0.5" animate={{ y: [0, -10], opacity: [0.5, 0], scale: [1, 2] }} transition={{ duration: 0.5, repeat: Infinity }} />

        {/* Wheels */}
        {[410, 450, 560, 590].map(cx => (
          <g key={cx}>
            <circle cx={cx} cy={HORIZON_Y - 10} r="14" fill="#0B1D33" />
            {/* Spinning Hubcap */}
            <motion.g
              animate={{ rotate: 360 }}
              transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: `${cx}px ${HORIZON_Y - 10}px` }}
            >
              <circle cx={cx} cy={HORIZON_Y - 10} r="6" fill="#5A7A96" />
              <line x1={cx - 6} y1={HORIZON_Y - 10} x2={cx + 6} y2={HORIZON_Y - 10} stroke="#fff" strokeWidth="2" opacity="0.8" />
              <line x1={cx} y1={HORIZON_Y - 16} x2={cx} y2={HORIZON_Y - 4} stroke="#fff" strokeWidth="2" opacity="0.8" />
            </motion.g>
          </g>
        ))}
      </motion.g>
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCENE: IN_FACTORY — Interlocking gears
═══════════════════════════════════════════════════════════ */
function FactoryScene() {
  return (
    <g>
      {/* Background Ambience Inside Factory */}
      <rect x="0" y="0" width="1200" height="300" fill={C.navyLight} opacity="0.2" />
      
      {/* Conveyor Belt System */}
      <rect x="0" y={HORIZON_Y - 20} width="1200" height="15" fill={C.navyMid} />
      {/* Moving Dashed Belt */}
      <motion.line 
        x1="0" y1={HORIZON_Y - 18} x2="1200" y2={HORIZON_Y - 18} 
        stroke={C.teal} strokeWidth="4" strokeDasharray="20 10"
        animate={{ strokeDashoffset: [0, -30] }}
        transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
      />
      {/* Base Structural supports for conveyor */}
      {[200, 500, 800, 1100].map((cx, i) => (
        <g key={i}>
          <rect x={cx} y={HORIZON_Y - 5} width="8" height={15} fill={C.steel} />
          <polygon points={`${cx - 5},${HORIZON_Y + 10} ${cx + 13},${HORIZON_Y + 10} ${cx + 8},${HORIZON_Y - 5} ${cx},${HORIZON_Y - 5}`} fill={C.steelLight} opacity="0.6" />
        </g>
      ))}

      {/* Boxes on Conveyor Belt */}
      <motion.g animate={{ x: [0, 800] }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }}>
        <g transform="translate(-100, 0)">
          <rect x="200" y={HORIZON_Y - 55} width="40" height="35" rx="3" fill={C.steelLight} />
          <rect x="205" y={HORIZON_Y - 45} width="30" height="2" fill={C.navyLight} opacity="0.4" />
          <rect x="205" y={HORIZON_Y - 35} width="20" height="2" fill={C.navyLight} opacity="0.4" />
          <motion.rect x="215" y={HORIZON_Y - 50} width="10" height="4" rx="1" fill={C.cyan} opacity="0.8" 
            animate={{ opacity: [0.8, 0.2, 0.8] }} transition={{ duration: 1, repeat: Infinity }} />
        </g>
        
        <g transform="translate(200, 0)">
          <rect x="200" y={HORIZON_Y - 55} width="40" height="35" rx="3" fill={C.steel} />
        </g>

        <g transform="translate(500, 0)">
           <rect x="200" y={HORIZON_Y - 55} width="40" height="35" rx="3" fill={C.steelLight} />
           <motion.rect x="215" y={HORIZON_Y - 50} width="10" height="4" rx="1" fill={C.cyan} opacity="0.8" 
            animate={{ opacity: [0.8, 0.2, 0.8] }} transition={{ duration: 1.5, repeat: Infinity }} />
        </g>
      </motion.g>

      {/* Articulated Robotic Arm */}
      <g transform="translate(450, 0)">
        {/* Base mount */}
        <rect x="40" y="-10" width="40" height="30" fill={C.navyMid} rx="4" />
        {/* Upper Arm pivoting */}
        <motion.g 
          animate={{ rotate: [-10, 15, -10] }} 
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} 
          style={{ originX: "60px", originY: "10px" }}
        >
          <rect x="55" y="10" width="10" height="90" rx="5" fill={C.steel} />
          <circle cx="60" cy="10" r="6" fill={C.cyan} opacity="0.8" />
          
          {/* Lower Arm dipping down */}
          <motion.g
            animate={{ rotate: [20, -10, 20] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{ originX: "60px", originY: "90px" }}
          >
            <rect x="56" y="90" width="8" height="60" rx="4" fill={C.steelLight} />
            <circle cx="60" cy="90" r="4" fill={C.cyan} opacity="0.9" />
            <circle cx="60" cy="90" r="2" fill={C.white} />
            
            {/* Hand / Claw */}
            <path d="M50,150 L70,150 L75,165 L65,165 L60,155 L55,165 L45,165 Z" fill={C.navyMid} />
            {/* Actively scanning glow */}
            <motion.ellipse cx="60" cy="168" rx="8" ry="3" fill={C.cyan} 
              animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.5, repeat: Infinity }} />
          </motion.g>
        </motion.g>
      </g>
      
      {/* Background geometric panels to enhance interior space feel */}
      <rect x="0" y="20" width="1200" height="2" fill={C.steelLight} opacity="0.3" />
      {[100, 400, 700, 1000].map(x => (
        <rect key={x} x={x} y="0" width="2" height="150" fill={C.steelLight} opacity="0.2" />
      ))}
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCENE: KANDLA_STORAGE — Static warehouse/silos
═══════════════════════════════════════════════════════════ */
function StorageScene() {
  return (
    <g>
      <rect x="0" y={HORIZON_Y} width="1200" height="80" fill="#3D2E22" />
      {/* Silos */}
      {[200, 350, 500, 750, 900].map((cx, i) => (
        <g key={i}>
          <rect x={cx - 22} y="80" width="44" height={HORIZON_Y - 80} rx="4" fill={C.steelLight} opacity="0.7" />
          <ellipse cx={cx} cy="80" rx="22" ry="9" fill={C.dim} opacity="0.5" />
          {[0, 1].map(j => <line key={j} x1={cx - 22} y1={110 + j * 30} x2={cx + 22} y2={110 + j * 30} stroke={C.dim} strokeWidth="1" opacity="0.3" />)}
        </g>
      ))}
      {/* Main warehouse */}
      <rect x="550" y="100" width="160" height={HORIZON_Y - 100} fill={C.steel} />
      <path d="M540,100 L630,60 L720,100 Z" fill={C.navyLight} />
      <rect x="600" y="170" width="40" height={HORIZON_Y - 170} fill={C.navyLight} rx="2" />
      <text x="630" y="85" textAnchor="middle" fill={C.white} fontSize="10" fontWeight="bold" opacity="0.5">KANDLA</text>
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCENE DISPATCHER
═══════════════════════════════════════════════════════════ */
const SCENE_MAP: Record<string, () => React.JSX.Element> = {
  IN_CONTRACT: () => <ContractScene />,
  ON_THE_SEA: () => <SeaScene />,
  MUNDRA_PORT: () => <PortScene />,
  OTW_TO_REFINERY: () => <TruckScene />,
  AT_REFINERY: () => <RefineryScene />,
  UNDER_LOADING: () => <LoadingScene />,
  ON_THE_WAY: () => <TransitScene />,
  OUT_SIDE_FACTORY: () => <TransitScene showFactory />,
  IN_FACTORY: () => <FactoryScene />,
  KANDLA_STORAGE: () => <StorageScene />,
  IN_TRANSIT: () => <TransitScene />,
};

const SKY_COLORS: Record<string, string> = {
  IN_CONTRACT: "radial-gradient(circle at 50% 120%, #38bdf8 0%, #0ea5e9 40%, #0284c7 100%)", // Sky Blue
  ON_THE_SEA: "radial-gradient(circle at 50% 120%, #2dd4bf 0%, #0d9488 50%, #0f766e 100%)", // Tropical Teal
  MUNDRA_PORT: "radial-gradient(circle at 50% 120%, #facc15 0%, #eab308 40%, #ca8a04 100%)", // Vibrant Amber
  OTW_TO_REFINERY: "radial-gradient(circle at 50% 120%, #4ade80 0%, #22c55e 40%, #16a34a 100%)", // Fresh Green
  AT_REFINERY: "radial-gradient(circle at 50% 120%, #f472b6 0%, #ec4899 40%, #db2777 100%)", // Warm Pink
  UNDER_LOADING: "radial-gradient(circle at 50% 120%, #60a5fa 0%, #3b82f6 40%, #2563eb 100%)", // Royal Blue
  ON_THE_WAY: "radial-gradient(circle at 50% 120%, #fb923c 0%, #f97316 40%, #ea580c 100%)", // Energetic Orange
  OUT_SIDE_FACTORY: "radial-gradient(circle at 50% 120%, #c084fc 0%, #a855f7 40%, #9333ea 100%)", // Bright Purple
  IN_FACTORY: "radial-gradient(circle at 50% 120%, #818cf8 0%, #6366f1 40%, #4f46e5 100%)", // Deep Indigo
  KANDLA_STORAGE: "radial-gradient(circle at 50% 120%, #fb7185 0%, #f43f5e 40%, #e11d48 100%)", // Rose Red
  IN_TRANSIT: "radial-gradient(circle at 50% 120%, #34d399 0%, #10b981 40%, #059669 100%)", // Emerald Green
};

/* ═══════════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════════ */
export function StatusHeroBanner({
  activeStatus,
  label,
  itemCount,
  totalVolume,
  unit,
}: {
  activeStatus: string;
  label: string;
  itemCount: number;
  totalVolume: string;
  unit: string;
}) {
  const sky = SKY_COLORS[activeStatus] ?? SKY_COLORS.IN_CONTRACT;
  const SceneComponent = SCENE_MAP[activeStatus] ?? SCENE_MAP.IN_CONTRACT;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/5 shadow-2xl" style={{ height: 260 }}>
      {/* Sky */}
      <div className="absolute inset-0" style={{ background: sky }} />
      <FogLayer />
      {/* Text overlay gradient */}
      <div className="absolute inset-0 z-[1]" style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 45%, transparent 100%)" }} />

      {/* Animated scene */}
      <div className="absolute inset-0 z-[2]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStatus}
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -80 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-full h-full"
          >
            <svg viewBox="0 0 1200 300" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
              <HorizonLine />
              <SceneComponent />
            </svg>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Stats chips */}
      <div className="absolute top-5 right-5 z-20 flex gap-2">
        <div className="glass-morphism px-3 py-2 rounded-2xl border border-white/20 text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Items</p>
          <p className="text-lg font-black leading-tight">{itemCount}</p>
        </div>
        <div className="glass-morphism px-3 py-2 rounded-2xl border border-white/20 text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{unit}</p>
          <p className="text-lg font-black leading-tight tabular-nums">{totalVolume}</p>
        </div>
      </div>

      {/* Status text */}
      <div className="relative z-10 flex flex-col justify-center h-full px-7 sm:px-10">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="h-1 w-6 bg-white/60 rounded-full" />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/70">Stock Status</p>
        </div>
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-xl">{label}</h2>
        <p className="text-white/55 text-xs mt-2 font-medium">Item-wise inventory breakdown</p>
      </div>
    </div>
  );
}
