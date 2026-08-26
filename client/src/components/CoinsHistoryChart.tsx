import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type Range = "24h" | "7d" | "30d";

interface HistoryPoint {
  bucketStart: string;
  net: number;
}

// Vertical rainbow requested by Anatole in place of the earlier two-tone diverging bars —
// blue at the top (best), red at the bottom (worst), passing through violet/green/yellow/
// orange in between. SVG's default gradientUnits (objectBoundingBox) maps 0%/100% to the
// drawn line's own top/bottom, so whatever the actual value range is for the selected
// window, its highest point always lands on blue and its lowest always lands on red.
const WAVE_GRADIENT_STOPS: { offset: string; color: string }[] = [
  { offset: "0%", color: "#3987e5" },   // blue — highest point in view
  { offset: "20%", color: "#7c5cf0" },  // violet
  { offset: "45%", color: "#22c55e" },  // green
  { offset: "65%", color: "#eab308" },  // yellow
  { offset: "85%", color: "#f97316" },  // orange
  { offset: "100%", color: "#ef4444" }, // red — lowest point in view
];
const POSITIVE_COLOR = "#3987e5";
const NEGATIVE_COLOR = "#ef4444";
const WAVE_GRADIENT_ID = "coins-history-wave-gradient";

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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-3xl font-black text-white" data-testid="stat-coins-history-total">
          {isLoading ? "–" : formatCoins(total)}
        </p>

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

      {/* Full-height gradient backdrop instead of a fill shaped to the curve (which only
          colored a thin band hugging the line, leaving the top/bottom of the card bare) —
          a plain CSS wash spanning the whole box edge-to-edge, static across range switches
          since it isn't tied to the data's shape. The curve (its own SVG gradient, see
          WAVE_GRADIENT_ID below) is drawn on top with no fill of its own. */}
      <div className="h-40 relative rounded-lg overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, ${WAVE_GRADIENT_STOPS.map((s) => `${s.color} ${s.offset}`).join(", ")})`,
            opacity: 0.22,
          }}
        />

        {/* Crossfade between ranges (mode="wait": old fades out, then the new one fades in)
            instead of the chart snapping instantly — same idea as Add Friend's tab pill, just
            an opacity swap rather than a shared-layout slide since the two charts don't share
            a shape to morph between (24 hourly points vs. 7 or 30 daily ones). */}
        <AnimatePresence mode="wait">
          <motion.div
            key={range}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {isLoading ? (
              <div className="w-full h-full bg-white/5 animate-pulse" />
            ) : !hasActivity ? (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-white/50 text-sm text-center px-6">
                  Play a few hands to see your coin history here.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <defs>
                    <linearGradient id={WAVE_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                      {WAVE_GRADIENT_STOPS.map((stop) => (
                        <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
                      ))}
                    </linearGradient>
                  </defs>
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                  <Tooltip
                    content={<ChartTooltip range={range} />}
                    cursor={{ stroke: "rgba(255,255,255,0.2)", strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="net"
                    stroke={`url(#${WAVE_GRADIENT_ID})`}
                    strokeWidth={2.5}
                    fill="none"
                    dot={false}
                    activeDot={{ r: 4, stroke: "#000000", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
