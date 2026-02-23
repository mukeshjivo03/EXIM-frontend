export default function CargoShipBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0a1628]">
      {/* Ocean waves */}
      <div className="absolute inset-0">
        <svg className="h-full w-full opacity-20" preserveAspectRatio="none">
          <defs>
            <pattern id="waves" x="0" y="0" width="200" height="20" patternUnits="userSpaceOnUse">
              <path
                d="M0 10 Q25 0, 50 10 T100 10 T150 10 T200 10"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="1.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#waves)" />
        </svg>
      </div>

      {/* Ship — vertically centered, scaled up */}
      <div className="absolute top-0 bottom-0 m-auto h-[300px] animate-[sail_35s_linear_infinite]">
        <svg width="2800" height="300" viewBox="0 0 2800 300" className="overflow-visible">
          {/* Wake / water trail — only behind the ship, not behind banner */}
          <g opacity="0.15">
            <path d="M1120 150 L2800 100" stroke="#60a5fa" strokeWidth="2" strokeDasharray="8 6" />
            <path d="M1120 150 L2800 200" stroke="#60a5fa" strokeWidth="2" strokeDasharray="8 6" />
            <path d="M1120 150 L2800 75" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 8" />
            <path d="M1120 150 L2800 225" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 8" />
          </g>

          {/* === Banner towed behind the ship === */}
          <g>
            {/* Tow rope from stern to banner */}
            <line
              x1="670" y1="150"
              x2="730" y2="150"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeDasharray="5 4"
            />

            {/* Banner body — flowing wavy shape */}
            <path fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1.5">
              <animate
                attributeName="d"
                dur="3s"
                repeatCount="indefinite"
                values="
                  M730,100 Q780,92 820,104 Q860,116 900,100 Q940,84 980,98 Q1020,110 1060,102 Q1090,96 1110,100 L1110,200 Q1090,204 1060,198 Q1020,190 980,202 Q940,216 900,200 Q860,184 820,196 Q780,208 730,200 Z;
                  M730,100 Q780,112 820,98 Q860,84 900,104 Q940,120 980,102 Q1020,88 1060,100 Q1090,108 1110,100 L1110,200 Q1090,192 1060,200 Q1020,212 980,198 Q940,180 900,196 Q860,216 820,202 Q780,188 730,200 Z;
                  M730,100 Q780,92 820,104 Q860,116 900,100 Q940,84 980,98 Q1020,110 1060,102 Q1090,96 1110,100 L1110,200 Q1090,204 1060,198 Q1020,190 980,202 Q940,216 900,200 Q860,184 820,196 Q780,208 730,200 Z
                "
              />
            </path>

            {/* "Jivo EXIM" text */}
            <text
              x="770"
              y="158"
              fontFamily="system-ui, sans-serif"
              fontSize="28"
              fontWeight="800"
              fill="#166534"
              letterSpacing="2"
            >
              JIVO EXIM
            </text>
          </g>

          {/* Ship body — top-down view, bow pointing left (scaled up) */}
          <g>
            {/* Hull */}
            <path
              d="M30 150 L160 80 L630 72 L660 95 L660 205 L630 228 L160 220 Z"
              fill="#1e293b"
              stroke="#334155"
              strokeWidth="2.5"
            />

            {/* Deck border */}
            <path
              d="M100 150 L175 100 L615 94 L640 110 L640 190 L615 206 L175 200 Z"
              fill="none"
              stroke="#475569"
              strokeWidth="1.5"
            />

            {/* Containers row 1 */}
            <rect x="200" y="96" width="55" height="32" rx="3" fill="#ef4444" />
            <rect x="262" y="96" width="55" height="32" rx="3" fill="#3b82f6" />
            <rect x="324" y="96" width="55" height="32" rx="3" fill="#22c55e" />
            <rect x="386" y="96" width="55" height="32" rx="3" fill="#f59e0b" />
            <rect x="448" y="96" width="55" height="32" rx="3" fill="#8b5cf6" />
            <rect x="510" y="96" width="55" height="32" rx="3" fill="#06b6d4" />

            {/* Containers row 2 */}
            <rect x="200" y="172" width="55" height="32" rx="3" fill="#06b6d4" />
            <rect x="262" y="172" width="55" height="32" rx="3" fill="#f59e0b" />
            <rect x="324" y="172" width="55" height="32" rx="3" fill="#8b5cf6" />
            <rect x="386" y="172" width="55" height="32" rx="3" fill="#ef4444" />
            <rect x="448" y="172" width="55" height="32" rx="3" fill="#3b82f6" />
            <rect x="510" y="172" width="55" height="32" rx="3" fill="#22c55e" />

            {/* Middle row of containers */}
            <rect x="230" y="134" width="55" height="32" rx="3" fill="#f59e0b" />
            <rect x="292" y="134" width="55" height="32" rx="3" fill="#ef4444" />
            <rect x="354" y="134" width="55" height="32" rx="3" fill="#3b82f6" />
            <rect x="416" y="134" width="55" height="32" rx="3" fill="#22c55e" />
            <rect x="478" y="134" width="55" height="32" rx="3" fill="#8b5cf6" />

            {/* Bridge / control tower */}
            <rect x="600" y="118" width="32" height="64" rx="4" fill="#475569" />
            <rect x="604" y="124" width="24" height="16" rx="2" fill="#0ea5e9" opacity="0.6" />
            <rect x="604" y="144" width="24" height="8" rx="1" fill="#334155" />
          </g>
        </svg>
      </div>

      {/* Subtle water ripple overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/5 to-blue-950/20" />
    </div>
  );
}
