"use client";

export default function HistoricalChart({
  data,
  width = 640,
  height = 260,
}: {
  data: Array<{ year: number; pct: number | null }>;
  width?: number;
  height?: number;
}) {
  const points = data.filter((d) => d.pct != null) as { year: number; pct: number }[];
  if (points.length === 0) {
    return (
      <div className="text-[13px] text-slate-500 italic bg-ghost border border-dashed border-rule rounded p-5 text-center">
        No completed appraisals for this employee yet.
      </div>
    );
  }
  const margin = { top: 24, right: 20, bottom: 32, left: 40 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const minYear = Math.min(...points.map((p) => p.year));
  const maxYear = Math.max(...points.map((p) => p.year));
  const spread = Math.max(1, maxYear - minYear);
  const x = (year: number) =>
    spread === 0 ? innerW / 2 : ((year - minYear) / spread) * innerW;
  const y = (pct: number) => innerH - (pct / 100) * innerH;
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.year)},${y(p.pct)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto bg-white border border-rule rounded">
      <g transform={`translate(${margin.left},${margin.top})`}>
        {Array.from({ length: 5 }).map((_, i) => {
          const yy = (innerH / 4) * i;
          const v = 100 - 25 * i;
          return (
            <g key={i}>
              <line x1={0} y1={yy} x2={innerW} y2={yy} stroke="#e5e7eb" />
              <text x={-6} y={yy + 3} textAnchor="end" fontSize="10" fill="#6b7280">
                {v}
              </text>
            </g>
          );
        })}
        <path d={path} fill="none" stroke="#1e3a5f" strokeWidth={2} />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(p.year)} cy={y(p.pct)} r={4} fill="#1e3a5f" />
            <text
              x={x(p.year)}
              y={y(p.pct) - 10}
              textAnchor="middle"
              fontSize="10"
              fill="#374151"
            >
              {p.pct.toFixed(1)}%
            </text>
            <text
              x={x(p.year)}
              y={innerH + 18}
              textAnchor="middle"
              fontSize="10"
              fill="#6b7280"
            >
              {p.year}
            </text>
          </g>
        ))}
        <text x={innerW / 2} y={innerH + 30} textAnchor="middle" fontSize="11" fill="#374151">
          Appraisal Year
        </text>
      </g>
    </svg>
  );
}
