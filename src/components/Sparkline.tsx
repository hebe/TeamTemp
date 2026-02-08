"use client";

type SparklineProps = {
  /** Normalized 0–1 values (one per round) */
  values: number[];
  width?: number;
  height?: number;
  /** Indices where the scale changed (optional, for visual markers) */
  scaleChangeIndices?: number[];
};

export default function Sparkline({
  values,
  width = 140,
  height = 40,
  scaleChangeIndices,
}: SparklineProps) {
  if (values.length === 0) return null;

  const pad = 6;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  // Values are normalized 0–1, so Y maps directly
  const points = values.map((v, i) => {
    const x = pad + (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW);
    const y = pad + innerH - v * innerH;
    return { x, y };
  });

  const lineD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaD = `${lineD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
  const last = points[points.length - 1];
  const gradId = `sg-${width}-${height}`;

  return (
    <svg width={width} height={height} className="inline-block" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.18} />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path
        d={lineD}
        fill="none"
        stroke="var(--brand)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Scale change markers — subtle dashed vertical lines */}
      {scaleChangeIndices?.map((idx) => {
        if (idx < 0 || idx >= points.length) return null;
        const x = points[idx].x;
        return (
          <line
            key={`sc-${idx}`}
            x1={x}
            y1={pad - 2}
            x2={x}
            y2={height - pad + 2}
            stroke="var(--muted)"
            strokeWidth={1}
            strokeDasharray="2 2"
            opacity={0.5}
          />
        );
      })}
      <circle cx={last.x} cy={last.y} r={4} fill="var(--brand)" />
      <circle cx={last.x} cy={last.y} r={7} fill="var(--brand)" opacity={0.15} />
    </svg>
  );
}
