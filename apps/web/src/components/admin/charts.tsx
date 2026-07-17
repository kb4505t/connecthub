"use client";

interface DailyPoint {
  date: string;
  count: number;
}

/** Formats "2026-07-10" as "Jul 10" for axis labels. */
function formatDay(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * A minimal bar chart drawn as plain SVG using theme CSS variables, so it
 * matches light/dark mode automatically without a charting library. Built
 * for small day-bucketed series (≤30-60 points) — not a general-purpose
 * charting solution.
 */
export function DailyBarChart({ data, color = "hsl(var(--primary))" }: { data: DailyPoint[]; color?: string }) {
  const width = 600;
  const height = 160;
  const paddingBottom = 24;
  const max = Math.max(1, ...data.map((d) => d.count));
  const barGap = 2;
  const barWidth = data.length > 0 ? width / data.length - barGap : 0;

  // Show every ~5th label so the axis doesn't get crowded on a 30-day series.
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Daily counts bar chart">
      {data.map((d, i) => {
        const barHeight = ((height - paddingBottom) * d.count) / max;
        const x = i * (barWidth + barGap);
        const y = height - paddingBottom - barHeight;
        return (
          <g key={d.date}>
            <rect x={x} y={y} width={Math.max(barWidth, 1)} height={Math.max(barHeight, d.count > 0 ? 2 : 0)} rx={2} fill={color} opacity={0.85}>
              <title>{`${formatDay(d.date)}: ${d.count}`}</title>
            </rect>
            {i % labelEvery === 0 && (
              <text x={x + barWidth / 2} y={height - 6} fontSize={9} textAnchor="middle" fill="hsl(var(--muted-foreground))">
                {formatDay(d.date)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** A simple horizontal bar list for ranked items (trending hashtags, top posts by engagement). */
export function RankedBarList({ items }: { items: { label: string; value: number; href?: string }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={`${item.label}-${i}`} className="flex items-center gap-3">
          <span className="w-5 text-xs font-medium text-muted-foreground text-right shrink-0">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-sm font-medium truncate">{item.label}</span>
              <span className="text-xs text-muted-foreground shrink-0">{item.value.toLocaleString()}</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/80"
                style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
