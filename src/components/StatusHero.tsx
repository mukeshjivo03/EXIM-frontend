import React from "react";

/* ── Shared wrapper ────────────────────────────────────────────── */
function W({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: "0.75rem", background: bg, marginBottom: 4, overflow: "hidden", lineHeight: 0 }}>
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ON THE SEA — static cargo ship on calm ocean
════════════════════════════════════════════════════════════════ */
function OnTheSeaHero() {
  return (
    <W bg="linear-gradient(180deg,#0f4c81 0%,#1565c0 40%,#1976d2 70%,#1e88e5 100%)">
      <svg viewBox="0 0 900 152" width="100%">
        {/* Sky gradient */}
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d3b6e" />
            <stop offset="100%" stopColor="#1565c0" />
          </linearGradient>
          <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1565c0" />
            <stop offset="100%" stopColor="#0d2f5a" />
          </linearGradient>
        </defs>
        <rect width="900" height="152" fill="url(#sky)" />
        {/* Stars */}
        {[60,140,220,310,400,490,560,640,730,820].map((x,i)=>(
          <circle key={i} cx={x} cy={10+(i%3)*8} r="1.2" fill="white" opacity={0.5+(i%3)*0.2} />
        ))}
        {/* Moon */}
        <circle cx="820" cy="22" r="13" fill="#fffde7" opacity="0.9" />
        <circle cx="826" cy="18" r="10" fill="#1565c0" opacity="0.9" />
        {/* Ocean */}
        <rect x="0" y="90" width="900" height="62" fill="url(#sea)" />
        {/* Gentle waves */}
        <path d="M0,92 Q112,85 225,92 Q337,99 450,92 Q562,85 675,92 Q787,99 900,92" stroke="#42a5f5" strokeWidth="2" fill="none" opacity="0.5" />
        <path d="M0,100 Q112,93 225,100 Q337,107 450,100 Q562,93 675,100 Q787,107 900,100" stroke="#64b5f6" strokeWidth="1.5" fill="none" opacity="0.35" />
        {/* Ship hull */}
        <path d="M180,78 L720,78 L740,110 L160,110 Z" fill="#37474f" />
        <rect x="180" y="55" width="540" height="23" fill="#455a64" />
        {/* Superstructure */}
        <rect x="340" y="25" width="180" height="55" fill="#546e7a" rx="3" />
        <rect x="360" y="15" width="130" height="40" fill="#607d8b" rx="3" />
        {/* Portholes */}
        {[390,430,470].map((x,i)=>(
          <circle key={i} cx={x} cy="35" r="7" fill="#b0bec5" stroke="#90a4ae" strokeWidth="1.5" />
        ))}
        {/* Funnel */}
        <rect x="450" y="5" width="28" height="30" fill="#d32f2f" rx="2" />
        <rect x="448" y="2" width="32" height="8" fill="#b71c1c" rx="2" />
        {/* Smoke — static puffs */}
        <ellipse cx="464" cy="-2" rx="12" ry="7" fill="#9e9e9e" opacity="0.4" />
        <ellipse cx="470" cy="-12" rx="16" ry="9" fill="#bdbdbd" opacity="0.25" />
        {/* Cargo containers */}
        {[[195,60,80,18,"#e53935"],[280,60,80,18,"#fb8c00"],[365,60,80,18,"#43a047"],
          [525,60,80,18,"#1e88e5"],[610,60,80,18,"#8e24aa"],[695,60,80,18,"#e53935"]].map(([x,y,w,h,c],i)=>(
          <rect key={i} x={x as number} y={y as number} width={w as number} height={h as number} fill={c as string} rx="2" />
        ))}
        {/* Mast */}
        <line x1="464" y1="2" x2="464" y2="-15" stroke="#78909c" strokeWidth="2" />
        {/* Water reflection */}
        <ellipse cx="450" cy="112" rx="220" ry="8" fill="#1976d2" opacity="0.3" />
        {/* Anchor chain */}
        <line x1="200" y1="108" x2="195" y2="130" stroke="#78909c" strokeWidth="2" strokeDasharray="4,3" />
      </svg>
    </W>
  );
}

/* ════════════════════════════════════════════════════════════════
   MUNDRA PORT — static port with cranes and containers
════════════════════════════════════════════════════════════════ */
function MundraPortHero() {
  return (
    <W bg="linear-gradient(180deg,#1a237e 0%,#283593 45%,#e8d5a3 100%)">
      <svg viewBox="0 0 900 152" width="100%">
        <defs>
          <linearGradient id="portSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a237e" />
            <stop offset="60%" stopColor="#3949ab" />
            <stop offset="100%" stopColor="#e8d5a3" />
          </linearGradient>
        </defs>
        <rect width="900" height="152" fill="url(#portSky)" />
        {/* Quay ground */}
        <rect x="0" y="118" width="900" height="34" fill="#5d4037" />
        <rect x="0" y="116" width="900" height="4" fill="#795548" />
        {/* Water */}
        <rect x="0" y="108" width="900" height="12" fill="#1565c0" opacity="0.6" />
        {/* Gantry cranes */}
        {[120, 380, 640].map((cx, i) => (
          <g key={i}>
            {/* Legs */}
            <rect x={cx-4} y="60" width="8" height="60" fill="#e0e0e0" />
            <rect x={cx+60-4} y="60" width="8" height="60" fill="#e0e0e0" />
            {/* Crossbeam */}
            <rect x={cx-20} y="55" width="100" height="8" fill="#bdbdbd" rx="2" />
            {/* Trolley */}
            <rect x={cx+20} y="63" width="20" height="10" fill="#f57c00" rx="2" />
            {/* Hoist cable */}
            <line x1={cx+30} y1="73" x2={cx+30} y2="95" stroke="#9e9e9e" strokeWidth="1.5" />
            {/* Hook */}
            <path d={`M${cx+26},95 Q${cx+30},102 ${cx+34},95`} stroke="#757575" strokeWidth="2" fill="none" />
            {/* Vertical mast */}
            <rect x={cx+26} y="20" width="8" height="40" fill="#e0e0e0" />
            {/* Cab */}
            <rect x={cx+18} y="38" width="24" height="18" fill="#1565c0" rx="2" />
          </g>
        ))}
        {/* Stacked containers */}
        {[
          [50,90,"#e53935"],[50,72,"#fb8c00"],[50,54,"#43a047"],
          [110,90,"#1e88e5"],[110,72,"#8e24aa"],
          [170,90,"#00897b"],[170,72,"#e53935"],
          [310,90,"#fb8c00"],[310,72,"#1e88e5"],[310,54,"#43a047"],
          [370,90,"#d32f2f"],[370,72,"#fdd835"],
          [570,90,"#e53935"],[570,72,"#fb8c00"],
          [630,90,"#1e88e5"],[630,72,"#43a047"],[630,54,"#8e24aa"],
          [750,90,"#00897b"],[750,72,"#d32f2f"],
          [810,90,"#fdd835"],[810,72,"#1e88e5"],
          [860,90,"#43a047"],[860,72,"#e53935"],
        ].map(([x,y,c],i)=>(
          <rect key={i} x={x as number} y={y as number} width="50" height="16" fill={c as string} rx="1" opacity="0.95" />
        ))}
        {/* Ship silhouette behind */}
        <path d="M580,90 L860,90 L875,108 L565,108 Z" fill="#263238" opacity="0.7" />
        <rect x="660" y="60" width="120" height="32" fill="#37474f" opacity="0.7" />
        <rect x="700" y="44" width="70" height="28" fill="#455a64" opacity="0.7" />
        {/* Bollards on quay */}
        {[80,200,350,500,650,800].map((x,i)=>(
          <g key={i}>
            <rect x={x} y="118" width="10" height="14" fill="#616161" rx="2" />
            <ellipse cx={x+5} cy="118" rx="7" ry="4" fill="#757575" />
          </g>
        ))}
        {/* Port lights */}
        {[60,250,450,680,870].map((x,i)=>(
          <g key={i}>
            <rect x={x} y="70" width="3" height="50" fill="#9e9e9e" />
            <circle cx={x+1.5} cy="68" r="5" fill="#fff9c4" opacity="0.9" />
          </g>
        ))}
        {/* Sunrise glow */}
        <ellipse cx="750" cy="152" rx="200" ry="60" fill="#ff8f00" opacity="0.2" />
      </svg>
    </W>
  );
}

/* ════════════════════════════════════════════════════════════════
   KANDLA STORAGE — static warehouse / silo complex
════════════════════════════════════════════════════════════════ */
function KandlaStorageHero() {
  return (
    <W bg="linear-gradient(180deg,#bf360c 0%,#e64a19 40%,#ff7043 100%)">
      <svg viewBox="0 0 900 152" width="100%">
        <defs>
          <linearGradient id="kSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bf360c" />
            <stop offset="100%" stopColor="#ff8a65" />
          </linearGradient>
        </defs>
        <rect width="900" height="152" fill="url(#kSky)" />
        {/* Ground */}
        <rect x="0" y="128" width="900" height="24" fill="#4e342e" />
        {/* Silos */}
        {[80,200,320,640,760,880].map((cx,i)=>(
          <g key={i}>
            <rect x={cx-22} y="50" width="44" height="80" fill="#bcaaa4" rx="4" />
            <ellipse cx={cx} cy="50" rx="22" ry="10" fill="#d7ccc8" />
            <ellipse cx={cx} cy="50" rx="16" ry="7" fill="#efebe9" opacity="0.5" />
            <rect x={cx-4} y="128" width="8" height="10" fill="#8d6e63" />
            <line x1={cx-22} y1="80" x2={cx+22} y2="80" stroke="#a1887f" strokeWidth="1" opacity="0.5" />
            <line x1={cx-22} y1="100" x2={cx+22} y2="100" stroke="#a1887f" strokeWidth="1" opacity="0.5" />
          </g>
        ))}
        {/* Main warehouse */}
        <rect x="380" y="62" width="220" height="68" fill="#8d6e63" />
        <path d="M370,62 L490,30 L610,62 Z" fill="#795548" />
        {/* Warehouse door */}
        <rect x="460" y="96" width="40" height="34" fill="#5d4037" rx="2" />
        <line x1="480" y1="96" x2="480" y2="130" stroke="#4e342e" strokeWidth="1.5" />
        {/* Warehouse windows */}
        <rect x="400" y="75" width="30" height="20" fill="#ffcc02" opacity="0.5" rx="2" />
        <rect x="560" y="75" width="30" height="20" fill="#ffcc02" opacity="0.5" rx="2" />
        {/* Conveyor belt */}
        <rect x="200" y="112" width="120" height="8" fill="#616161" rx="4" />
        <rect x="204" y="114" width="8" height="4" fill="#424242" rx="2" />
        <rect x="222" y="114" width="8" height="4" fill="#424242" rx="2" />
        <rect x="240" y="114" width="8" height="4" fill="#424242" rx="2" />
        <rect x="258" y="114" width="8" height="4" fill="#424242" rx="2" />
        <rect x="276" y="114" width="8" height="4" fill="#424242" rx="2" />
        <rect x="294" y="114" width="8" height="4" fill="#424242" rx="2" />
        {/* Fence */}
        {[20,60,100,140,700,740,780,820,860].map((x,i)=>(
          <g key={i}>
            <rect x={x} y="118" width="3" height="14" fill="#a1887f" />
            <line x1={x+1.5} y1="120" x2={x+41.5} y2="120" stroke="#a1887f" strokeWidth="1.5" />
          </g>
        ))}
        {/* Label */}
        <rect x="416" y="38" width="148" height="18" fill="none" />
        <text x="490" y="52" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" opacity="0.8">KANDLA STORAGE</text>
      </svg>
    </W>
  );
}

/* ════════════════════════════════════════════════════════════════
   UNDER LOADING — static forklift + warehouse loading dock
════════════════════════════════════════════════════════════════ */
function UnderLoadingHero() {
  return (
    <W bg="linear-gradient(180deg,#f57f17 0%,#f9a825 50%,#fdd835 100%)">
      <svg viewBox="0 0 900 152" width="100%">
        <defs>
          <linearGradient id="lSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e65100" />
            <stop offset="100%" stopColor="#ffd54f" />
          </linearGradient>
        </defs>
        <rect width="900" height="152" fill="url(#lSky)" />
        {/* Ground / floor */}
        <rect x="0" y="124" width="900" height="28" fill="#5d4037" />
        {/* Dock floor stripe */}
        <rect x="0" y="122" width="900" height="4" fill="#795548" />
        {/* Warehouse wall */}
        <rect x="0" y="0" width="320" height="126" fill="#8d6e63" />
        <rect x="0" y="0" width="320" height="10" fill="#795548" />
        {/* Loading dock opening */}
        <rect x="60" y="70" width="120" height="56" fill="#3e2723" rx="2" />
        <rect x="64" y="74" width="112" height="50" fill="#4e342e" rx="1" />
        {/* Dock height markers */}
        {[0,1,2,3,4].map(i=>(
          <line key={i} x1="60" y1={70+i*11} x2="68" y2={70+i*11} stroke="#a1887f" strokeWidth="1.5" />
        ))}
        {/* Forklift body */}
        <rect x="350" y="88" width="80" height="36" fill="#f57f17" rx="4" />
        {/* Forklift mast */}
        <rect x="410" y="40" width="10" height="84" fill="#e65100" rx="2" />
        {/* Forks */}
        <rect x="416" y="100" width="50" height="6" fill="#bf360c" rx="1" />
        <rect x="416" y="110" width="50" height="6" fill="#bf360c" rx="1" />
        {/* Forklift cab */}
        <rect x="355" y="72" width="50" height="22" fill="#ff6d00" rx="3" />
        <rect x="360" y="75" width="18" height="14" fill="#b3e5fc" rx="1" opacity="0.8" />
        {/* Forklift wheels */}
        <circle cx="370" cy="126" r="10" fill="#212121" />
        <circle cx="370" cy="126" r="5" fill="#424242" />
        <circle cx="415" cy="126" r="10" fill="#212121" />
        <circle cx="415" cy="126" r="5" fill="#424242" />
        {/* Pallet on forks */}
        <rect x="420" y="88" width="44" height="8" fill="#8d6e63" rx="1" />
        <rect x="420" y="92" width="8" height="6" fill="#6d4c41" />
        <rect x="436" y="92" width="8" height="6" fill="#6d4c41" />
        <rect x="452" y="92" width="8" height="6" fill="#6d4c41" />
        {/* Boxes on pallet */}
        <rect x="422" y="72" width="18" height="18" fill="#e53935" rx="2" />
        <rect x="442" y="72" width="18" height="18" fill="#1e88e5" rx="2" />
        <rect x="422" y="54" width="18" height="18" fill="#43a047" rx="2" />
        <rect x="442" y="54" width="18" height="18" fill="#fb8c00" rx="2" />
        {/* Stacked boxes near dock */}
        {[
          [530,100,40,24,"#e53935"],[575,100,40,24,"#fb8c00"],[620,100,40,24,"#1e88e5"],
          [530,76,40,24,"#43a047"],[575,76,40,24,"#8e24aa"],
          [665,100,40,24,"#00897b"],[665,76,40,24,"#e53935"],
          [710,100,40,24,"#fdd835"],[710,76,40,24,"#1565c0"],
          [760,100,40,24,"#d32f2f"],[805,100,40,24,"#fb8c00"],
        ].map(([x,y,w,h,c],i)=>(
          <rect key={i} x={x as number} y={y as number} width={w as number} height={h as number} fill={c as string} rx="2" />
        ))}
        {/* Safety stripes on floor */}
        {[0,1,2,3,4,5,6,7,8].map(i=>(
          <rect key={i} x={330+i*60} y="122" width="30" height="4" fill="#fdd835" opacity="0.6" />
        ))}
        {/* Overhead light */}
        <rect x="420" y="0" width="60" height="6" fill="#9e9e9e" rx="2" />
        <rect x="425" y="6" width="50" height="4" fill="#fff9c4" opacity="0.7" rx="1" />
      </svg>
    </W>
  );
}

/* ════════════════════════════════════════════════════════════════
   OTW TO REFINERY — static tanker truck on highway
════════════════════════════════════════════════════════════════ */
function OtwToRefineryHero() {
  return (
    <W bg="linear-gradient(180deg,#880e4f 0%,#c2185b 50%,#f06292 100%)">
      <svg viewBox="0 0 900 152" width="100%">
        <defs>
          <linearGradient id="rSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4a148c" />
            <stop offset="100%" stopColor="#f48fb1" />
          </linearGradient>
        </defs>
        <rect width="900" height="152" fill="url(#rSky)" />
        {/* Hills */}
        <ellipse cx="150" cy="140" rx="200" ry="60" fill="#1b5e20" opacity="0.6" />
        <ellipse cx="750" cy="148" rx="250" ry="60" fill="#2e7d32" opacity="0.5" />
        {/* Road */}
        <rect x="0" y="110" width="900" height="42" fill="#424242" />
        <rect x="0" y="108" width="900" height="4" fill="#757575" />
        {/* Road lane markings */}
        {[0,1,2,3,4,5,6,7].map(i=>(
          <rect key={i} x={i*120+20} y="128" width="80" height="4" fill="#fdd835" opacity="0.7" rx="1" />
        ))}
        {/* Road shoulders */}
        <rect x="0" y="108" width="900" height="4" fill="#9e9e9e" opacity="0.4" />
        {/* Tanker truck — cabin */}
        <rect x="130" y="80" width="70" height="34" fill="#d32f2f" rx="4" />
        <rect x="136" y="85" width="28" height="18" fill="#b3e5fc" rx="2" opacity="0.8" />
        {/* Grill */}
        <rect x="130" y="92" width="10" height="18" fill="#b71c1c" rx="1" />
        {[0,1,2,3].map(i=>(
          <line key={i} x1="130" y1={94+i*4} x2="140" y2={94+i*4} stroke="#ef9a9a" strokeWidth="1" />
        ))}
        {/* Tanker tank */}
        <rect x="200" y="82" width="280" height="32" fill="#bdbdbd" rx="6" />
        <ellipse cx="200" cy="98" rx="16" ry="16" fill="#9e9e9e" />
        <ellipse cx="480" cy="98" rx="16" ry="16" fill="#9e9e9e" />
        {/* Tank stripes */}
        <rect x="240" y="82" width="4" height="32" fill="#e0e0e0" opacity="0.5" />
        <rect x="300" y="82" width="4" height="32" fill="#e0e0e0" opacity="0.5" />
        <rect x="360" y="82" width="4" height="32" fill="#e0e0e0" opacity="0.5" />
        <rect x="420" y="82" width="4" height="32" fill="#e0e0e0" opacity="0.5" />
        {/* Tank top dome */}
        <ellipse cx="340" cy="82" rx="20" ry="7" fill="#9e9e9e" />
        <rect x="330" y="75" width="20" height="8" fill="#757575" rx="2" />
        {/* Wheels */}
        {[165,215,400,445].map((x,i)=>(
          <g key={i}>
            <circle cx={x} cy="116" r="13" fill="#212121" />
            <circle cx={x} cy="116" r="7" fill="#424242" />
            <circle cx={x} cy="116" r="3" fill="#616161" />
          </g>
        ))}
        {/* Chassis */}
        <rect x="155" y="110" width="345" height="8" fill="#616161" rx="2" />
        {/* Refinery distant silhouette */}
        {[620,670,720,770,820].map((x,i)=>(
          <g key={i}>
            <rect x={x} y={60-i%2*20} width={14+i%3*4} height={90+i%2*20} fill="#4a148c" opacity="0.5" />
            <rect x={x+4} y={50-i%2*20} width="6" height="15" fill="#7b1fa2" opacity="0.5" />
          </g>
        ))}
        {/* Smoke from refinery */}
        <ellipse cx="680" cy="48" rx="18" ry="10" fill="#757575" opacity="0.3" />
        <ellipse cx="740" cy="38" rx="22" ry="12" fill="#9e9e9e" opacity="0.2" />
        {/* Road sign */}
        <rect x="560" y="72" width="3" height="38" fill="#9e9e9e" />
        <rect x="548" y="72" width="28" height="18" fill="#1a237e" rx="2" />
        <text x="562" y="85" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">REFINERY</text>
        <text x="562" y="84" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">→</text>
      </svg>
    </W>
  );
}

/* ════════════════════════════════════════════════════════════════
   AT REFINERY — static refinery towers and pipes
════════════════════════════════════════════════════════════════ */
function AtRefineryHero() {
  return (
    <W bg="linear-gradient(180deg,#311b92 0%,#4527a0 50%,#9c27b0 100%)">
      <svg viewBox="0 0 900 152" width="100%">
        <defs>
          <linearGradient id="refSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a0050" />
            <stop offset="100%" stopColor="#ab47bc" />
          </linearGradient>
        </defs>
        <rect width="900" height="152" fill="url(#refSky)" />
        {/* Ground */}
        <rect x="0" y="130" width="900" height="22" fill="#1a237e" />
        {/* Distillation towers */}
        {[80,200,340,500,660,780].map((cx,i)=>(
          <g key={i}>
            <rect x={cx-16} y={20+i%3*10} width="32" height={112-i%3*10} fill="#7e57c2" rx="3" />
            <ellipse cx={cx} cy={20+i%3*10} rx="16" ry="7" fill="#9575cd" />
            <ellipse cx={cx} cy={20+i%3*10} rx="10" ry="4" fill="#b39ddb" opacity="0.6" />
            {/* Tower rings */}
            {[0,1,2,3].map(j=>(
              <line key={j} x1={cx-16} y1={40+i%3*10+j*20} x2={cx+16} y2={40+i%3*10+j*20} stroke="#9575cd" strokeWidth="1.5" opacity="0.6" />
            ))}
            {/* Flame at top */}
            <path d={`M${cx-4},${20+i%3*10} Q${cx},${10+i%3*10} ${cx+4},${20+i%3*10}`} fill="#ff8f00" opacity="0.7" />
            <ellipse cx={cx} cy={20+i%3*10} rx="4" ry="4" fill="#ffcc02" opacity="0.5" />
          </g>
        ))}
        {/* Horizontal pipes */}
        <rect x="0" y="100" width="900" height="6" fill="#5c6bc0" opacity="0.7" rx="3" />
        <rect x="0" y="112" width="900" height="6" fill="#7986cb" opacity="0.6" rx="3" />
        <rect x="0" y="122" width="600" height="4" fill="#9fa8da" opacity="0.5" rx="2" />
        {/* Vertical connecting pipes */}
        {[120,260,420,580,720].map((x,i)=>(
          <g key={i}>
            <rect x={x-3} y="86" width="6" height="50" fill="#5c6bc0" opacity="0.8" rx="2" />
            <circle cx={x} cy="86" r="7" fill="#7986cb" opacity="0.7" />
          </g>
        ))}
        {/* Storage tanks */}
        {[440,570,700,830].map((cx,i)=>(
          <g key={i}>
            <ellipse cx={cx} cy="120" rx="35" ry="14" fill="#4527a0" stroke="#7e57c2" strokeWidth="1.5" />
            <rect x={cx-35} y="108" width="70" height="12" fill="#4527a0" />
            <ellipse cx={cx} cy="108" rx="35" ry="14" fill="#512da8" stroke="#7e57c2" strokeWidth="1.5" />
          </g>
        ))}
        {/* Smoke puffs — static */}
        <ellipse cx="80" cy="14" rx="14" ry="8" fill="#9e9e9e" opacity="0.35" />
        <ellipse cx="200" cy="10" rx="18" ry="10" fill="#bdbdbd" opacity="0.25" />
        <ellipse cx="340" cy="16" rx="12" ry="7" fill="#9e9e9e" opacity="0.3" />
        <ellipse cx="500" cy="12" rx="16" ry="9" fill="#bdbdbd" opacity="0.2" />
        {/* Stars */}
        {[50,180,420,600,750,880].map((x,i)=>(
          <circle key={i} cx={x} cy={8+i%4*5} r="1.5" fill="white" opacity={0.4+i%3*0.2} />
        ))}
      </svg>
    </W>
  );
}

/* ════════════════════════════════════════════════════════════════
   IN TRANSIT / ON THE WAY — static truck on road
════════════════════════════════════════════════════════════════ */
function InTransitHero() {
  return (
    <W bg="linear-gradient(180deg,#1b5e20 0%,#388e3c 50%,#81c784 100%)">
      <svg viewBox="0 0 900 152" width="100%">
        <defs>
          <linearGradient id="trSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d3b0f" />
            <stop offset="100%" stopColor="#a5d6a7" />
          </linearGradient>
        </defs>
        <rect width="900" height="152" fill="url(#trSky)" />
        {/* Sun */}
        <circle cx="800" cy="30" r="22" fill="#fdd835" opacity="0.9" />
        <circle cx="800" cy="30" r="16" fill="#fff9c4" opacity="0.7" />
        {/* Clouds */}
        <ellipse cx="200" cy="25" rx="50" ry="18" fill="white" opacity="0.7" />
        <ellipse cx="240" cy="20" rx="40" ry="16" fill="white" opacity="0.8" />
        <ellipse cx="160" cy="28" rx="30" ry="14" fill="white" opacity="0.6" />
        <ellipse cx="550" cy="35" rx="45" ry="16" fill="white" opacity="0.6" />
        <ellipse cx="590" cy="30" rx="35" ry="14" fill="white" opacity="0.7" />
        {/* Hills */}
        <ellipse cx="100" cy="140" rx="200" ry="70" fill="#2e7d32" opacity="0.7" />
        <ellipse cx="800" cy="145" rx="250" ry="65" fill="#388e3c" opacity="0.6" />
        {/* Road */}
        <rect x="0" y="110" width="900" height="42" fill="#455a64" />
        <rect x="0" y="108" width="900" height="4" fill="#607d8b" />
        {/* Lane dashes */}
        {[0,1,2,3,4,5,6,7].map(i=>(
          <rect key={i} x={i*120+10} y="128" width="80" height="4" fill="white" opacity="0.5" rx="1" />
        ))}
        {/* Truck cab */}
        <rect x="280" y="78" width="68" height="36" fill="#1565c0" rx="5" />
        <rect x="286" y="82" width="28" height="20" fill="#b3e5fc" rx="2" opacity="0.85" />
        <rect x="280" y="94" width="12" height="16" fill="#0d47a1" rx="1" />
        {[0,1,2,3].map(i=>(
          <line key={i} x1="280" y1={95+i*3.5} x2="292" y2={95+i*3.5} stroke="#42a5f5" strokeWidth="1" opacity="0.7" />
        ))}
        {/* Trailer */}
        <rect x="348" y="80" width="280" height="34" fill="#1976d2" rx="3" />
        {/* Trailer markings */}
        {[0,1,2].map(i=>(
          <rect key={i} x={358+i*84} y="86" width="64" height="22" fill="#0d47a1" rx="2" opacity="0.4" />
        ))}
        <text x="488" y="101" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" opacity="0.8">LOGISTICS</text>
        {/* Wheels */}
        {[300,345,390,520,595].map((x,i)=>(
          <g key={i}>
            <circle cx={x} cy="116" r="12" fill="#212121" />
            <circle cx={x} cy="116" r="6" fill="#424242" />
            <circle cx={x} cy="116" r="2.5" fill="#757575" />
          </g>
        ))}
        {/* Chassis bar */}
        <rect x="290" y="110" width="344" height="7" fill="#546e7a" rx="2" />
        {/* Road trees */}
        {[50,160,700,820].map((x,i)=>(
          <g key={i}>
            <rect x={x+5} y="95" width="6" height="20" fill="#4e342e" />
            <ellipse cx={x+8} cy="90" rx="14" ry="18" fill="#2e7d32" />
          </g>
        ))}
        {/* Distance markers */}
        <rect x="680" y="75" width="3" height="38" fill="#9e9e9e" />
        <rect x="668" y="74" width="30" height="14" fill="#263238" rx="2" />
        <text x="683" y="84" textAnchor="middle" fill="white" fontSize="7">200 km</text>
      </svg>
    </W>
  );
}

/* ════════════════════════════════════════════════════════════════
   IN FACTORY — static factory complex
════════════════════════════════════════════════════════════════ */
function InFactoryHero() {
  return (
    <W bg="linear-gradient(180deg,#1b5e20 0%,#2e7d32 55%,#43a047 100%)">
      <svg viewBox="0 0 900 152" width="100%">
        <defs>
          <linearGradient id="fSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d3b0f" />
            <stop offset="100%" stopColor="#81c784" />
          </linearGradient>
        </defs>
        <rect width="900" height="152" fill="url(#fSky)" />
        {/* Sun */}
        <circle cx="840" cy="28" r="18" fill="#fdd835" opacity="0.85" />
        {/* Ground */}
        <rect x="0" y="128" width="900" height="24" fill="#33691e" />
        <rect x="0" y="126" width="900" height="4" fill="#558b2f" />
        {/* Back row silhouettes */}
        <rect x="10" y="70" width="80" height="60" fill="#2e7d32" opacity="0.5" rx="2" />
        <rect x="110" y="55" width="100" height="75" fill="#1b5e20" opacity="0.4" rx="2" />
        <rect x="730" y="50" width="110" height="80" fill="#1b5e20" opacity="0.45" rx="2" />
        <rect x="820" y="65" width="70" height="65" fill="#2e7d32" opacity="0.4" rx="2" />
        {/* Main building — left wing */}
        <rect x="60" y="65" width="180" height="65" fill="#546e7a" rx="3" />
        <path d="M55,65 L150,38 L245,65 Z" fill="#455a64" />
        {/* Sawtooth roof right side of left wing */}
        <path d="M245,65 L260,50 L275,65 L290,50 L305,65 Z" fill="#37474f" />
        {/* Left wing windows */}
        {[75,115,155,195].map((x,i)=>(
          <rect key={i} x={x} y="80" width="20" height="14" fill="#ffcc02" rx="1" opacity="0.6" />
        ))}
        {/* Left wing doors */}
        <rect x="120" y="108" width="28" height="22" fill="#263238" rx="2" />
        <rect x="165" y="108" width="28" height="22" fill="#263238" rx="2" />
        {/* Central main building */}
        <rect x="305" y="42" width="290" height="90" fill="#607d8b" rx="3" />
        {/* Sawtooth roof on main building */}
        <path d="M305,42 L325,22 L345,42 L365,22 L385,42 L405,22 L425,42 L445,22 L465,42 L485,22 L505,42 L525,22 L545,42 L565,22 L585,42 L595,42" fill="#546e7a" />
        {/* Main building windows */}
        {[320,365,410,455,500,545].map((x,i)=>(
          <rect key={i} x={x} y="58" width="22" height="16" fill="#fff9c4" rx="1" opacity={0.5+i%2*0.2} />
        ))}
        {/* Main doors */}
        <rect x="390" y="104" width="40" height="28" fill="#263238" rx="2" />
        <rect x="460" y="104" width="40" height="28" fill="#263238" rx="2" />
        {/* Right wing */}
        <rect x="595" y="60" width="200" height="70" fill="#546e7a" rx="3" />
        <path d="M590,60 L695,35 L800,60 Z" fill="#455a64" />
        {/* Right wing windows */}
        {[610,650,690,730,770].map((x,i)=>(
          <rect key={i} x={x} y="75" width="20" height="14" fill="#ffcc02" rx="1" opacity="0.55" />
        ))}
        {/* Right wing door */}
        <rect x="670" y="103" width="30" height="27" fill="#263238" rx="2" />
        {/* Smokestacks */}
        {[155,290,440,590,730].map((cx,i)=>(
          <g key={i}>
            <rect x={cx-7} y={10+i%2*8} width="14" height={35-i%2*8} fill="#d32f2f" rx="2" />
            <rect x={cx-9} y={8+i%2*8} width="18" height="6" fill="#b71c1c" rx="2" />
            {/* Smoke — static */}
            <ellipse cx={cx} cy={6+i%2*8} rx="8" ry="5" fill="#9e9e9e" opacity="0.4" />
            <ellipse cx={cx+3} cy={-2+i%2*8} rx="10" ry="6" fill="#bdbdbd" opacity="0.25" />
          </g>
        ))}
        {/* Water tower */}
        <rect x="845" y="80" width="8" height="45" fill="#9e9e9e" />
        <rect x="858" y="72" width="8" height="45" fill="#9e9e9e" />
        <path d="M840,80 Q851,60 865,72" stroke="#757575" strokeWidth="2" fill="none" />
        <ellipse cx="852" cy="72" rx="20" ry="12" fill="#78909c" />
        <ellipse cx="852" cy="70" rx="20" ry="8" fill="#90a4ae" />
        {/* Conveyor belt */}
        <rect x="240" y="115" width="80" height="6" fill="#424242" rx="3" />
        <circle cx="244" cy="118" r="5" fill="#212121" />
        <circle cx="316" cy="118" r="5" fill="#212121" />
        {[0,1,2,3,4].map(i=>(
          <rect key={i} x={250+i*13} y="115" width="6" height="6" fill="#616161" rx="1" />
        ))}
        {/* Pipe network */}
        <rect x="0" y="118" width="60" height="4" fill="#78909c" opacity="0.7" rx="2" />
        <rect x="50" y="100" width="4" height="22" fill="#78909c" opacity="0.7" rx="2" />
        <rect x="855" y="118" width="45" height="4" fill="#78909c" opacity="0.7" rx="2" />
        {/* Fence posts */}
        {[10,30,50,860,880].map((x,i)=>(
          <g key={i}>
            <rect x={x} y="120" width="3" height="12" fill="#8d6e63" />
          </g>
        ))}
        <line x1="10" y1="122" x2="55" y2="122" stroke="#8d6e63" strokeWidth="1.5" />
        <line x1="860" y1="122" x2="895" y2="122" stroke="#8d6e63" strokeWidth="1.5" />
      </svg>
    </W>
  );
}

/* ════════════════════════════════════════════════════════════════
   OUTSIDE FACTORY — static outdoor yard with barrels
════════════════════════════════════════════════════════════════ */
function OutsideFactoryHero() {
  return (
    <W bg="linear-gradient(180deg,#33691e 0%,#558b2f 50%,#8bc34a 100%)">
      <svg viewBox="0 0 900 152" width="100%">
        <defs>
          <linearGradient id="oSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1b5e20" />
            <stop offset="100%" stopColor="#aed581" />
          </linearGradient>
        </defs>
        <rect width="900" height="152" fill="url(#oSky)" />
        {/* Sun & clouds */}
        <circle cx="100" cy="28" r="18" fill="#fdd835" opacity="0.85" />
        <ellipse cx="280" cy="22" rx="45" ry="16" fill="white" opacity="0.6" />
        <ellipse cx="320" cy="18" rx="35" ry="14" fill="white" opacity="0.7" />
        <ellipse cx="640" cy="30" rx="50" ry="17" fill="white" opacity="0.55" />
        {/* Ground */}
        <rect x="0" y="118" width="900" height="34" fill="#558b2f" />
        <rect x="0" y="116" width="900" height="4" fill="#689f38" />
        {/* Factory wall in background */}
        <rect x="300" y="50" width="300" height="70" fill="#546e7a" opacity="0.5" rx="2" />
        <path d="M295,50 L450,28 L605,50 Z" fill="#455a64" opacity="0.5" />
        {/* Barrels */}
        {[
          [50,95,"#1565c0"],[90,95,"#d32f2f"],[130,95,"#43a047"],[170,95,"#f57f17"],
          [50,78,"#8e24aa"],[90,78,"#1565c0"],[130,78,"#d32f2f"],
          [620,95,"#43a047"],[660,95,"#1565c0"],[700,95,"#d32f2f"],[740,95,"#f57f17"],
          [620,78,"#f57f17"],[660,78,"#43a047"],
          [800,95,"#1565c0"],[840,95,"#d32f2f"],[880,95,"#8e24aa"],
        ].map(([x,y,c],i)=>(
          <g key={i}>
            <ellipse cx={(x as number)+12} cy={y as number} rx="12" ry="5" fill={c as string} opacity="0.7" />
            <rect x={x as number} y={y as number} width="24" height="20" fill={c as string} opacity="0.8" rx="2" />
            <ellipse cx={(x as number)+12} cy={(y as number)+20} rx="12" ry="5" fill={c as string} opacity="0.9" />
            <line x1={x as number} y1={(y as number)+7} x2={(x as number)+24} y2={(y as number)+7} stroke="white" strokeWidth="1" opacity="0.3" />
            <line x1={x as number} y1={(y as number)+13} x2={(x as number)+24} y2={(y as number)+13} stroke="white" strokeWidth="1" opacity="0.3" />
          </g>
        ))}
        {/* Pallets */}
        <rect x="230" y="112" width="60" height="6" fill="#8d6e63" rx="1" />
        <rect x="230" y="115" width="12" height="4" fill="#6d4c41" />
        <rect x="253" y="115" width="12" height="4" fill="#6d4c41" />
        <rect x="276" y="115" width="12" height="4" fill="#6d4c41" />
        <rect x="450" y="112" width="60" height="6" fill="#8d6e63" rx="1" />
        {/* Stacked crates on pallets */}
        <rect x="232" y="94" width="26" height="18" fill="#fb8c00" rx="2" />
        <rect x="262" y="94" width="26" height="18" fill="#e53935" rx="2" />
        <rect x="237" y="76" width="46" height="18" fill="#1e88e5" rx="2" />
        {/* Trees / bushes */}
        {[500,540,560,580].map((x,i)=>(
          <g key={i}>
            <rect x={x+6} y="92" width="6" height="26" fill="#5d4037" />
            <ellipse cx={x+9} cy="87" rx={12+i%2*4} ry={15+i%2*3} fill="#2e7d32" />
          </g>
        ))}
        {/* Fence */}
        {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(i=>(
          <g key={i}>
            <rect x={i*46} y="108" width="3" height="10" fill="#a1887f" />
          </g>
        ))}
        <line x1="0" y1="111" x2="900" y2="111" stroke="#a1887f" strokeWidth="1.5" opacity="0.7" />
        <line x1="0" y1="115" x2="900" y2="115" stroke="#a1887f" strokeWidth="1" opacity="0.5" />
      </svg>
    </W>
  );
}

/* ════════════════════════════════════════════════════════════════
   IN CONTRACT — static handshake / document signing scene
════════════════════════════════════════════════════════════════ */
function InContractHero() {
  return (
    <W bg="linear-gradient(180deg,#1a237e 0%,#283593 50%,#3949ab 100%)">
      <svg viewBox="0 0 900 152" width="100%">
        <defs>
          <linearGradient id="cSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d1642" />
            <stop offset="100%" stopColor="#5c6bc0" />
          </linearGradient>
        </defs>
        <rect width="900" height="152" fill="url(#cSky)" />
        {/* Desk surface */}
        <rect x="200" y="100" width="500" height="10" fill="#5d4037" rx="3" />
        <rect x="200" y="108" width="500" height="30" fill="#4e342e" rx="2" />
        {/* Document */}
        <rect x="340" y="48" width="100" height="130" fill="white" rx="3" opacity="0.95" />
        <rect x="340" y="48" width="100" height="12" fill="#1565c0" rx="3" opacity="0.8" />
        <text x="390" y="59" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">CONTRACT</text>
        {/* Document lines */}
        {[0,1,2,3,4,5,6,7].map(i=>(
          <line key={i} x1="348" y1={68+i*8} x2="432" y2={68+i*8} stroke="#9e9e9e" strokeWidth="1.5" opacity="0.6" />
        ))}
        {/* Signature line */}
        <line x1="350" y1="138" x2="430" y2="138" stroke="#1565c0" strokeWidth="1.5" />
        <text x="390" y="148" textAnchor="middle" fill="#9e9e9e" fontSize="6">SIGNATURE</text>
        {/* Pen */}
        <rect x="425" y="92" width="5" height="40" fill="#ffd54f" rx="2" transform="rotate(25,427,112)" />
        <path d="M423,130 L427,140 L431,130" fill="#d32f2f" transform="rotate(25,427,112)" />
        {/* Stamp */}
        <circle cx="290" cy="88" r="28" fill="none" stroke="#43a047" strokeWidth="3" opacity="0.8" />
        <circle cx="290" cy="88" r="22" fill="none" stroke="#43a047" strokeWidth="1.5" opacity="0.6" />
        <text x="290" y="84" textAnchor="middle" fill="#43a047" fontSize="8" fontWeight="bold">APPROVED</text>
        <text x="290" y="96" textAnchor="middle" fill="#43a047" fontSize="6">✓ VERIFIED</text>
        {/* Handshake silhouette */}
        <path d="M520,80 C530,70 545,75 550,85 L565,95 C570,100 565,108 558,105 L540,95 C535,92 530,95 535,100 L545,110 C548,115 543,120 538,117 L520,105 C510,100 508,88 520,80 Z" fill="#ffb74d" opacity="0.9" />
        <path d="M600,80 C590,70 575,75 570,85 L555,95 C550,100 555,108 562,105 L580,95 C585,92 590,95 585,100 L575,110 C572,115 577,120 582,117 L600,105 C610,100 612,88 600,80 Z" fill="#ffa726" opacity="0.9" />
        {/* Stars scattered */}
        {[60,160,700,800,850].map((x,i)=>(
          <g key={i}>
            <circle cx={x} cy={15+i%3*8} r="1.5" fill="#ffd54f" opacity={0.4+i%3*0.2} />
          </g>
        ))}
        {/* Decorative coins */}
        {[100,130,160,730,760,790].map((cx,i)=>(
          <circle key={i} cx={cx} cy={100+i%2*8} r="10" fill="#fdd835" stroke="#f9a825" strokeWidth="1.5" opacity="0.6" />
        ))}
        {/* $ symbol on coins */}
        <text x="100" y="103" textAnchor="middle" fill="#f57f17" fontSize="8" fontWeight="bold">$</text>
        <text x="130" y="107" textAnchor="middle" fill="#f57f17" fontSize="8" fontWeight="bold">$</text>
        <text x="730" y="103" textAnchor="middle" fill="#f57f17" fontSize="8" fontWeight="bold">$</text>
      </svg>
    </W>
  );
}

/* ════════════════════════════════════════════════════════════════
   PENDING — static hourglass / clock waiting scene
════════════════════════════════════════════════════════════════ */
function PendingHero() {
  return (
    <W bg="linear-gradient(180deg,#e65100 0%,#f57c00 50%,#ff9800 100%)">
      <svg viewBox="0 0 900 152" width="100%">
        <defs>
          <linearGradient id="pSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bf360c" />
            <stop offset="100%" stopColor="#ffcc80" />
          </linearGradient>
        </defs>
        <rect width="900" height="152" fill="url(#pSky)" />
        {/* Large hourglass — center */}
        <rect x="415" y="20" width="70" height="8" fill="#5d4037" rx="2" />
        <rect x="415" y="124" width="70" height="8" fill="#5d4037" rx="2" />
        <path d="M420,28 L480,28 L450,76 Z" fill="#ffd54f" opacity="0.9" />
        <path d="M420,124 L480,124 L450,76 Z" fill="#ffd54f" opacity="0.5" />
        <line x1="422" y1="28" x2="422" y2="124" stroke="#8d6e63" strokeWidth="2.5" />
        <line x1="478" y1="28" x2="478" y2="124" stroke="#8d6e63" strokeWidth="2.5" />
        {/* Sand dots at bottom */}
        {[440,450,460,445,455,450].map((x,i)=>(
          <ellipse key={i} cx={x} cy={110+i%2*5} rx="6" ry="3" fill="#fdd835" opacity={0.6+i%2*0.2} />
        ))}
        {/* Clock face — left */}
        <circle cx="230" cy="76" r="50" fill="#fff8e1" stroke="#f57f17" strokeWidth="3" opacity="0.9" />
        <circle cx="230" cy="76" r="44" fill="none" stroke="#ffe0b2" strokeWidth="1" />
        {/* Clock numbers */}
        {[12,3,6,9].map((n,i)=>{
          const angle = (i*90-90)*Math.PI/180;
          return <text key={n} x={230+38*Math.cos(angle)} y={76+38*Math.sin(angle)+4} textAnchor="middle" fill="#5d4037" fontSize="10" fontWeight="bold">{n}</text>;
        })}
        {/* Clock hands */}
        <line x1="230" y1="76" x2="230" y2="46" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />
        <line x1="230" y1="76" x2="258" y2="88" stroke="#bf360c" strokeWidth="2" strokeLinecap="round" />
        <circle cx="230" cy="76" r="4" fill="#5d4037" />
        {/* Clock — right */}
        <circle cx="670" cy="76" r="50" fill="#fff8e1" stroke="#f57f17" strokeWidth="3" opacity="0.9" />
        <circle cx="670" cy="76" r="44" fill="none" stroke="#ffe0b2" strokeWidth="1" />
        {[12,3,6,9].map((n,i)=>{
          const angle = (i*90-90)*Math.PI/180;
          return <text key={n} x={670+38*Math.cos(angle)} y={76+38*Math.sin(angle)+4} textAnchor="middle" fill="#5d4037" fontSize="10" fontWeight="bold">{n}</text>;
        })}
        <line x1="670" y1="76" x2="696" y2="58" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />
        <line x1="670" y1="76" x2="688" y2="96" stroke="#bf360c" strokeWidth="2" strokeLinecap="round" />
        <circle cx="670" cy="76" r="4" fill="#5d4037" />
        {/* Waiting dots */}
        <circle cx="395" cy="152" r="6" fill="#fdd835" opacity="0.9" />
        <circle cx="450" cy="152" r="6" fill="#fdd835" opacity="0.6" />
        <circle cx="505" cy="152" r="6" fill="#fdd835" opacity="0.35" />
        {/* Background dots */}
        {[80,160,340,560,740,860].map((x,i)=>(
          <circle key={i} cx={x} cy={20+i%4*12} r="3" fill="#fdd835" opacity={0.2+i%3*0.15} />
        ))}
      </svg>
    </W>
  );
}

/* ════════════════════════════════════════════════════════════════
   PROCESSING — static gears / factory processing scene
════════════════════════════════════════════════════════════════ */
function ProcessingHero() {
  function Gear({ cx, cy, r, teeth, fill }: { cx: number; cy: number; r: number; teeth: number; fill: string }) {
    const ir = r * 0.65;
    const toothH = r * 0.28;
    const pts: string[] = [];
    for (let i = 0; i < teeth; i++) {
      const a0 = (i / teeth) * Math.PI * 2 - Math.PI / teeth / 2;
      const a1 = a0 + Math.PI / teeth * 0.8;
      const a2 = a1 + Math.PI / teeth * 0.2;
      const a3 = a2 + Math.PI / teeth * 0.8;
      const or = r + toothH;
      pts.push(`${cx + Math.cos(a0) * r},${cy + Math.sin(a0) * r}`);
      pts.push(`${cx + Math.cos(a1) * or},${cy + Math.sin(a1) * or}`);
      pts.push(`${cx + Math.cos(a2) * or},${cy + Math.sin(a2) * or}`);
      pts.push(`${cx + Math.cos(a3) * r},${cy + Math.sin(a3) * r}`);
    }
    return (
      <g>
        <polygon points={pts.join(" ")} fill={fill} />
        <circle cx={cx} cy={cy} r={ir} fill="none" stroke={fill} strokeWidth="4" opacity="0.3" />
        <circle cx={cx} cy={cy} r={8} fill={fill} opacity="0.8" />
        <circle cx={cx} cy={cy} r={4} fill="white" opacity="0.6" />
      </g>
    );
  }
  return (
    <W bg="linear-gradient(180deg,#4a148c 0%,#6a1b9a 50%,#ab47bc 100%)">
      <svg viewBox="0 0 900 152" width="100%">
        <defs>
          <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a0050" />
            <stop offset="100%" stopColor="#ce93d8" />
          </linearGradient>
        </defs>
        <rect width="900" height="152" fill="url(#gSky)" />
        {/* Ground */}
        <rect x="0" y="130" width="900" height="22" fill="#1a0050" />
        {/* Gears */}
        <Gear cx={200} cy={76} r={46} teeth={12} fill="#9c27b0" />
        <Gear cx={312} cy={76} r={36} teeth={10} fill="#7b1fa2" />
        <Gear cx={450} cy={76} r={52} teeth={14} fill="#8e24aa" />
        <Gear cx={590} cy={76} r={38} teeth={10} fill="#6a1b9a" />
        <Gear cx={700} cy={76} r={44} teeth={12} fill="#9c27b0" />
        {/* Small accent gears */}
        <Gear cx={138} cy={116} r={20} teeth={8} fill="#e91e63" />
        <Gear cx={770} cy={112} r={22} teeth={8} fill="#f06292" />
        <Gear cx={380} cy={120} r={18} teeth={7} fill="#ce93d8" />
        {/* Conveyor belt */}
        <rect x="100" y="120" width="700" height="10" fill="#424242" rx="5" />
        {[0,1,2,3,4,5,6,7,8,9,10,11,12,13].map(i=>(
          <rect key={i} x={106+i*48} y="120" width="10" height="10" fill="#616161" rx="2" />
        ))}
        {/* Items on conveyor */}
        {[140,260,380,500,620,740].map((x,i)=>(
          <rect key={i} x={x} y="109" width="24" height="12" fill={["#e53935","#1e88e5","#43a047","#fb8c00","#8e24aa","#00897b"][i]} rx="2" />
        ))}
        {/* Sparks / processing indicators */}
        {[200,450,700].map((cx,i)=>(
          <g key={i} opacity="0.7">
            <line x1={cx} y1={22} x2={cx+8} y2={14} stroke="#fdd835" strokeWidth="2" />
            <line x1={cx} y1={22} x2={cx-8} y2={14} stroke="#ffd54f" strokeWidth="2" />
            <line x1={cx} y1={22} x2={cx} y2={10} stroke="#ffcc02" strokeWidth="2" />
          </g>
        ))}
        {/* Stars */}
        {[50,350,550,800,880].map((x,i)=>(
          <circle key={i} cx={x} cy={10+i%3*8} r="1.5" fill="white" opacity={0.3+i%3*0.2} />
        ))}
      </svg>
    </W>
  );
}

/* ════════════════════════════════════════════════════════════════
   COMPLETED — static checkmark / celebration scene
════════════════════════════════════════════════════════════════ */
function CompletedHero() {
  return (
    <W bg="linear-gradient(180deg,#1b5e20 0%,#2e7d32 50%,#66bb6a 100%)">
      <svg viewBox="0 0 900 152" width="100%">
        <defs>
          <linearGradient id="compSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#003300" />
            <stop offset="100%" stopColor="#a5d6a7" />
          </linearGradient>
        </defs>
        <rect width="900" height="152" fill="url(#compSky)" />
        {/* Big checkmark circle */}
        <circle cx="450" cy="72" r="58" fill="#2e7d32" stroke="#43a047" strokeWidth="3" />
        <circle cx="450" cy="72" r="50" fill="#388e3c" opacity="0.6" />
        {/* Checkmark */}
        <polyline points="420,72 438,90 482,52" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        {/* Confetti */}
        {[
          [120,30,"#f44336"],[180,15,"#2196f3"],[250,40,"#fdd835"],[320,20,"#e91e63"],
          [600,25,"#ff9800"],[680,15,"#00bcd4"],[750,35,"#9c27b0"],[820,20,"#4caf50"],
          [80,55,"#ff5722"],[150,65,"#3f51b5"],[750,65,"#f44336"],[850,50,"#fdd835"],
          [400,10,"#ff4081"],[520,8,"#00e5ff"],[200,72,"#ffd600"],[700,70,"#76ff03"],
        ].map(([x,y,c],i)=>(
          <rect key={i} x={x as number} y={y as number} width="8" height="8" fill={c as string}
            transform={`rotate(${i*25},${(x as number)+4},${(y as number)+4})`} opacity="0.85" rx="1" />
        ))}
        {/* Stars */}
        {[55,155,310,590,745,865].map((x,i)=>(
          <g key={i} fill="#fdd835" opacity={0.5+i%3*0.2}>
            <polygon points={`${x},${8+i%3*5} ${x+4},${18+i%3*5} ${x+10},${18+i%3*5} ${x+5},${24+i%3*5} ${x+7},${34+i%3*5} ${x},${28+i%3*5} ${x-7},${34+i%3*5} ${x-5},${24+i%3*5} ${x-10},${18+i%3*5} ${x-4},${18+i%3*5}`} />
          </g>
        ))}
        {/* Ribbons/banners */}
        <path d="M0,130 Q100,115 200,130 Q300,145 400,130 Q500,115 600,130 Q700,145 800,130 Q850,122 900,130" stroke="#43a047" strokeWidth="4" fill="none" opacity="0.6" />
        <path d="M0,140 Q100,128 200,140 Q300,152 400,140 Q500,128 600,140 Q700,152 800,140 Q850,134 900,140" stroke="#66bb6a" strokeWidth="3" fill="none" opacity="0.5" />
        {/* "DONE" text */}
        <text x="450" y="140" textAnchor="middle" fill="#fdd835" fontSize="14" fontWeight="bold" opacity="0.8">ORDER COMPLETE</text>
      </svg>
    </W>
  );
}

/* ════════════════════════════════════════════════════════════════
   DELIVERED — static delivery truck at destination
════════════════════════════════════════════════════════════════ */
function DeliveredHero() {
  return (
    <W bg="linear-gradient(180deg,#004d40 0%,#00695c 50%,#26a69a 100%)">
      <svg viewBox="0 0 900 152" width="100%">
        <defs>
          <linearGradient id="dSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00251a" />
            <stop offset="100%" stopColor="#80cbc4" />
          </linearGradient>
        </defs>
        <rect width="900" height="152" fill="url(#dSky)" />
        {/* Sun */}
        <circle cx="820" cy="25" r="20" fill="#fdd835" opacity="0.9" />
        {/* Building / destination */}
        <rect x="600" y="48" width="260" height="90" fill="#00796b" rx="3" />
        <path d="M595,50 L730,24 L865,50 Z" fill="#00695c" />
        {/* Building windows */}
        {[615,670,725,780].map((x,i)=>(
          <rect key={i} x={x} y="65" width="28" height="22" fill="#fff9c4" rx="2" opacity="0.7" />
        ))}
        {[615,670,725,780].map((x,i)=>(
          <rect key={i} x={x} y="96" width="28" height="22" fill="#fff9c4" rx="2" opacity="0.5" />
        ))}
        {/* Building door */}
        <rect x="700" y="110" width="40" height="28" fill="#004d40" rx="2" />
        {/* Building sign */}
        <rect x="660" y="32" width="120" height="16" fill="#004d40" rx="2" opacity="0.8" />
        <text x="720" y="44" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">WAREHOUSE</text>
        {/* Road */}
        <rect x="0" y="118" width="900" height="34" fill="#37474f" />
        <rect x="0" y="116" width="900" height="4" fill="#546e7a" />
        {/* Road markings */}
        {[0,1,2,3,4,5,6,7].map(i=>(
          <rect key={i} x={i*110+10} y="131" width="70" height="4" fill="white" opacity="0.4" rx="1" />
        ))}
        {/* Delivery truck */}
        <rect x="100" y="84" width="66" height="38" fill="#00897b" rx="4" />
        <rect x="106" y="88" width="26" height="20" fill="#b2dfdb" rx="2" opacity="0.8" />
        <rect x="100" y="98" width="10" height="18" fill="#006064" rx="1" />
        <rect x="166" y="84" width="220" height="38" fill="#00acc1" rx="3" />
        <text x="276" y="107" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" opacity="0.8">DELIVERED ✓</text>
        {/* Wheels */}
        {[130,175,220,330].map((x,i)=>(
          <g key={i}>
            <circle cx={x} cy="124" r="11" fill="#212121" />
            <circle cx={x} cy="124" r="5" fill="#424242" />
            <circle cx={x} cy="124" r="2.5" fill="#757575" />
          </g>
        ))}
        <rect x="110" y="118" width="312" height="7" fill="#00695c" rx="2" />
        {/* Open truck doors */}
        <rect x="382" y="84" width="4" height="36" fill="#0097a7" />
        <rect x="386" y="84" width="30" height="36" fill="#00bcd4" rx="2" opacity="0.5" />
        {/* Boxes being unloaded */}
        <rect x="422" y="96" width="24" height="22" fill="#f44336" rx="2" />
        <rect x="450" y="96" width="24" height="22" fill="#1e88e5" rx="2" />
        <rect x="422" y="74" width="24" height="22" fill="#fdd835" rx="2" />
        {/* Check mark above building */}
        <circle cx="730" cy="12" r="14" fill="#43a047" opacity="0.9" />
        <polyline points="722,12 728,18 740,6" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Trees */}
        {[550,565].map((x,i)=>(
          <g key={i}>
            <rect x={x+5} y="95" width="5" height="24" fill="#5d4037" />
            <ellipse cx={x+7} cy="90" rx="12" ry="16" fill="#1b5e20" />
          </g>
        ))}
      </svg>
    </W>
  );
}

/* ════════════════════════════════════════════════════════════════
   EXPORT — dispatcher
════════════════════════════════════════════════════════════════ */
export function StatusHero({ status }: { status: string }) {
  switch (status) {
    case "ON_THE_SEA":       return <OnTheSeaHero />;
    case "MUNDRA_PORT":      return <MundraPortHero />;
    case "KANDLA_STORAGE":   return <KandlaStorageHero />;
    case "UNDER_LOADING":    return <UnderLoadingHero />;
    case "OTW_TO_REFINERY":  return <OtwToRefineryHero />;
    case "AT_REFINERY":      return <AtRefineryHero />;
    case "IN_TRANSIT":
    case "ON_THE_WAY":       return <InTransitHero />;
    case "IN_FACTORY":       return <InFactoryHero />;
    case "OUT_SIDE_FACTORY": return <OutsideFactoryHero />;
    case "IN_CONTRACT":      return <InContractHero />;
    case "PENDING":          return <PendingHero />;
    case "PROCESSING":       return <ProcessingHero />;
    case "COMPLETED":        return <CompletedHero />;
    case "DELIVERED":        return <DeliveredHero />;
    default:                 return null;
  }
}
