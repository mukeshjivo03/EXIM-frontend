interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
}

const TREND_COLORS = {
  up: "#10b981", // emerald-500
  down: "#ef4444", // red-500
  flat: "#94a3b8", // slate-400
} as const;

/**
 * Tiny dependency-free SVG sparkline. Stroke color follows the overall trend
 * (first vs last point). A single data point renders as a flat line.
 */
export function Sparkline({ data, width = 72, height = 26, strokeWidth = 1.5, className }: SparklineProps) {
  const values = data.filter((d) => Number.isFinite(d));
  if (values.length === 0) {
    return <svg width={width} height={height} className={className} aria-hidden="true" />;
  }

  const first = values[0];
  const last = values[values.length - 1];
  const trend = Math.abs(last - first) < 0.005 ? "flat" : last > first ? "up" : "down";
  const color = TREND_COLORS[trend];

  const pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points: [number, number][] =
    values.length === 1
      ? [
          [pad, height / 2],
          [width - pad, height / 2],
        ]
      : values.map((v, i) => [
          pad + (i * (width - 2 * pad)) / (values.length - 1),
          pad + (1 - (v - min) / span) * (height - 2 * pad),
        ]);

  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      <polyline
        points={points.map((p) => p.join(",")).join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r={2.2} fill={color} />
    </svg>
  );
}
