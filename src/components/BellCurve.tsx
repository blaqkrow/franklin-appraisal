"use client";
import { bucketize, gauss, stats } from "@/lib/bellcurve";

export default function BellCurve({
  values,
  width = 640,
  height = 280,
  title,
}: {
  values: number[];
  width?: number;
  height?: number;
  title?: string;
}) {
  const buckets = bucketize(values, 10);
  const st = stats(values);
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));

  if (values.length < 5) {
    return (
      <div className="text-[13px] text-slate-500 italic bg-ghost border border-dashed border-rule rounded p-5 text-center">
        Not enough data for a meaningful curve (n={values.length}, need ≥5).
      </div>
    );
  }

  const margin = { top: 20, right: 20, bottom: 40, left: 36 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const barW = innerW / buckets.length;

  // Gaussian overlay points (scaled so peak aligns with tallest bar)
  const points: { x: number; y: number }[] = [];
  const step = 2;
  const rawMax = gauss(st.mean, st.mean, st.stdev || 1);
  const scale = maxCount / (rawMax || 1);
  for (let x = 0; x <= 100; x += step) {
    const y = gauss(x, st.mean, st.stdev || 1) * scale;
    points.push({ x, y });
  }

  return (
    <div className="bg-white p-3 sm:p-5 border border-rule rounded">
      {title && <h3 className="text-[14px] font-semibold mb-2">{title}</h3>}
      <div className="flex items-end gap-4 text-[11px] text-slate-600 mb-3 flex-wrap">
        <span>n = {st.n}</span>
        <span>mean = {st.mean.toFixed(1)}%</span>
        <span>median = {st.median.toFixed(1)}%</span>
        <span>σ = {st.stdev.toFixed(1)}%</span>
        <span>min = {st.min.toFixed(1)}% · max = {st.max.toFixed(1)}%</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* y-axis grid */}
          {Array.from({ length: 5 }).map((_, i) => {
            const y = (innerH / 4) * i;
            const val = Math.round(maxCount - (maxCount / 4) * i);
            return (
              <g key={i}>
                <line x1={0} y1={y} x2={innerW} y2={y} stroke="#e5e7eb" />
                <text x={-6} y={y + 3} textAnchor="end" fontSize="10" fill="#6b7280">
                  {val}
                </text>
              </g>
            );
          })}
          {/* bars */}
          {buckets.map((b, i) => {
            const h = (b.count / maxCount) * innerH;
            const x = i * barW + 2;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={innerH - h}
                  width={barW - 4}
                  height={h}
                  fill="#1e3a5f"
                  rx={2}
                />
                {b.count > 0 && (
                  <text
                    x={x + (barW - 4) / 2}
                    y={innerH - h - 4}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#374151"
                  >
                    {b.count}
                  </text>
                )}
              </g>
            );
          })}
          {/* gaussian curve */}
          <polyline
            fill="none"
            stroke="#b91c1c"
            strokeWidth={2}
            points={points
              .map((p) => {
                const x = (p.x / 100) * innerW;
                const y = innerH - Math.min(p.y, maxCount) * (innerH / maxCount);
                return `${x},${y}`;
              })
              .join(" ")}
          />
          {/* x labels */}
          {buckets.map((b, i) => (
            <text
              key={i}
              x={i * barW + barW / 2}
              y={innerH + 16}
              textAnchor="middle"
              fontSize="10"
              fill="#6b7280"
            >
              {b.from}
            </text>
          ))}
          <text
            x={innerW / 2}
            y={innerH + 34}
            textAnchor="middle"
            fontSize="11"
            fill="#374151"
          >
            Overall Score (%)
          </text>
        </g>
      </svg>
    </div>
  );
}
