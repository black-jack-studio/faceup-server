import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  Rectangle,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

type Range = "24h" | "7d" | "30d";

interface HistoryPoint {
  bucketStart: string;
  net: number;
}

// Diverging pair validated against this app's near-black surface (#000000) — see
// scripts/validate_palette.js in the dataviz skill: all checks pass at these two hexes,
// worst-case CVD separation ΔE 19.2. Bar position (above/below the zero baseline) already
// carries the sign redundantly, so color is a secondary cue here, not the only one.
const POSITIVE_COLOR = "#3987e5";
const NEGATIVE_COLOR = "#e66767";

const RANGES: { key: Range; label: string }[] = [
  { key: "24h", label: "24H" },
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
];

function formatCoins(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const compact = abs >= 10000
    ? `${Math.round(abs / 1000)}K`
    : abs >= 1000
      ? `${(abs / 1000).toFixed(1)}K`
      : abs.toLocaleString();
  return `${sign}${compact}`;
}

function formatBucketLabel(bucketStart: string, range: Range): string {
  const date = new Date(bucketStart);
  if (range === "24h") {
    return date.toLocaleTimeString([], { hour: "numeric" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

// Delegates the actual rect/path math to recharts' own Rectangle instead of a hand-rolled
// SVG path — only the fill and which corners round vary per bar. Recharts always draws a
// bar's rect with its top edge at `y` and bottom edge at `y + height`; for a positive value
// the far (data) edge is the top and the near (baseline) edge is the bottom, and for a
// negative value that's flipped — so rounding top-corners-only for positive / bottom-corners-
// only for negative always rounds the data end and keeps the baseline edge square, regardless
// of the exact pixel math.
function DivergingBar(props: any) {
  const { x, y, width, height, payload } = props;
  const isPositive = payload.net >= 0;
  const radius: [number, number, number, number] = isPositive ? [4, 4, 0, 0] : [0, 0, 4, 4];
  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      radius={radius}
      fill={isPositive ? POSITIVE_COLOR : NEGATIVE_COLOR}
    />
  );
}

function ChartTooltip({ active, payload, range }: any) {
  if (!active || !payload?.length) return null;
  const point: HistoryPoint = payload[0].payload;
  const isPositive = point.net >= 0;
  return (
    <div className="rounded-lg bg-[#232328] px-3 py-2 shadow-lg">
      <p className="text-white/50 text-xs mb-1">{formatBucketLabel(point.bucketStart, range)}</p>
      <div className="flex items-center gap-1.5">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: isPositive ? POSITIVE_COLOR : NEGATIVE_COLOR }}
        />
        <span className="text-white font-bold text-sm">{formatCoins(point.net)} coins</span>
      </div>
    </div>
  );
}

export default function CoinsHistoryChart() {
  const [range, setRange] = useState<Range>("7d");

  const { data, isLoading } = useQuery<{ history: HistoryPoint[] }>({
    queryKey: [`/api/stats/coins-history?range=${range}`],
  });

  const history = data?.history ?? [];
  const total = history.reduce((sum, point) => sum + point.net, 0);
  const hasActivity = history.some((point) => point.net !== 0);
  // Tick density scales down with the number of buckets so 30 labels don't collide —
  // 24h shows every 4th hour, 7d shows every day, 30d shows roughly every 5th day.
  const tickInterval = range === "24h" ? 3 : range === "7d" ? 0 : 4;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div>
          <p
            className={`text-3xl font-black ${total > 0 ? "text-white" : total < 0 ? "text-white" : "text-white/70"}`}
            data-testid="stat-coins-history-total"
          >
            {isLoading ? "–" : formatCoins(total)}
          </p>
          <p className="text-sm text-white/50 font-semibold">Coins over the last {range === "24h" ? "24 hours" : range === "7d" ? "7 days" : "30 days"}</p>
        </div>

        {/* Same segmented-pill pattern as Add Friend's tabs (bg-white/5 rounded-2xl p-1
            wrapper, white fill on the active pill) instead of a new control style. */}
        <div className="flex bg-white/5 rounded-2xl p-1 flex-shrink-0">
          {RANGES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                range === key ? "bg-white text-[#15161A]" : "text-white/50 hover:text-white"
              }`}
              data-testid={`button-coins-history-range-${key}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-40 mt-4">
        {isLoading ? (
          <div className="w-full h-full bg-white/5 rounded-xl animate-pulse" />
        ) : !hasActivity ? (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-white/50 text-sm text-center px-6">
              Play a few hands to see your coin history here.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
              <XAxis
                dataKey="bucketStart"
                tickFormatter={(value) => formatBucketLabel(value, range)}
                interval={tickInterval}
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<ChartTooltip range={range} />}
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
              />
              <Bar dataKey="net" shape={DivergingBar} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
