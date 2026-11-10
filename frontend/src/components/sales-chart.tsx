"use client";

import { useState } from "react";
import { inr, inrCompact } from "@/lib/format";

type Point = { day: string; total: number; count: number };

const HEIGHT = 180;
const PAD_LEFT = 44;
const PAD_BOTTOM = 22;
const BAR_MAX = 24;

const niceMax = (value: number) => {
  if (value <= 0) return 1000;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value)!;
  return step * magnitude;
};

const dayLabel = (day: string) =>
  new Date(day + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });

// Single-series column chart: one hue, 4px rounded tops, hairline grid, per-bar hover tooltip.
export function SalesChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.map((d) => d.total), 0));
  const ticks = [0, 0.5, 1].map((f) => f * max);
  const width = 640;
  const plotW = width - PAD_LEFT;
  const plotH = HEIGHT - PAD_BOTTOM;
  const band = plotW / data.length;
  const barW = Math.min(BAR_MAX, band * 0.6);

  const hovered = hover !== null ? data[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label="Sales per day for the last 14 days"
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => {
          const y = plotH - (t / max) * plotH;
          return (
            <g key={t}>
              <line x1={PAD_LEFT} x2={width} y1={y} y2={y} stroke="var(--chart-grid)" strokeWidth={1} />
              <text x={PAD_LEFT - 8} y={y + 4} textAnchor="end" className="fill-fg-3 text-[11px] tabular">
                {t === 0 ? "0" : inrCompact(t)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const h = Math.max(d.total > 0 ? 2 : 0, (d.total / max) * plotH);
          const x = PAD_LEFT + i * band + (band - barW) / 2;
          const y = plotH - h;
          const r = Math.min(4, h);
          return (
            <g key={d.day}>
              {/* rounded data-end, square at the baseline */}
              {h > 0 && (
                <path
                  d={`M${x},${plotH} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${plotH} Z`}
                  fill="var(--chart-1)"
                  opacity={hover === null || hover === i ? 1 : 0.45}
                  style={{ transition: "opacity 120ms ease" }}
                />
              )}
              {(i % 2 === data.length % 2 || data.length <= 7) && (
                <text x={x + barW / 2} y={HEIGHT - 4} textAnchor="middle" className="fill-fg-3 text-[11px]">
                  {dayLabel(d.day)}
                </text>
              )}
              {/* hit target is the whole band, larger than the bar */}
              <rect
                x={PAD_LEFT + i * band}
                y={0}
                width={band}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
            </g>
          );
        })}
      </svg>

      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-pop"
          style={{ left: `${((PAD_LEFT + hover * band + band / 2) / width) * 100}%` }}
        >
          <div className="font-medium text-fg">{dayLabel(hovered.day)}</div>
          <div className="mt-0.5 tabular text-fg-2">
            {inr(hovered.total)} · {hovered.count} {hovered.count === 1 ? "invoice" : "invoices"}
          </div>
        </div>
      )}
    </div>
  );
}
