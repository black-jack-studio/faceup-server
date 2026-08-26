import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";

type Range = "24h" | "7d" | "30d";

interface HistoryPoint {
  bucketStart: string;
  net: number;
}

// Same art direction as Home's mode cards (see ModesCarousel.tsx) instead of a generic
// saturated rainbow — every hue here is drawn from those three cards' own gradients
// (Classic 21: green/blue/gray, Play with Friends: purple/amber/orange, Coming Soon:
// blue/indigo/purple), one step up from their literal 100/200 shades so it still reads as
// distinct color on this chart's black background instead of washing out to near-white.
// SVG's default gradientUnits (objectBoundingBox) maps 0%/100% to the drawn line's own
// top/bottom, so whatever the actual value range is for the selected window, its highest
// point always lands on the green end and its lowest always lands on the orange end.
const WAVE_GRADIENT_STOPS: { offset: string; color: string }[] = [
  { offset: "0%", color: "#86efac" },   // green-300 — highest point in view
  { offset: "17%", color: "#93c5fd" },  // blue-300
  { offset: "33%", color: "#9ca3af" },  // gray-400
  { offset: "50%", color: "#a5b4fc" },  // indigo-300
  { offset: "67%", color: "#d8b4fe" },  // purple-300
  { offset: "83%", color: "#fcd34d" },  // amber-300
  { offset: "100%", color: "#fdba74" }, // orange-300 — lowest point in view
];
const POSITIVE_COLOR = "#86efac";
const WAVE_GRADIENT_ID = "coins-history-wave-gradient";

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex(rgb: [number, number, number]): string {
  return `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

// Solid color at a given position along WAVE_GRADIENT_STOPS (t=0 top/blue, t=1 bottom/red)
// — used to color a single point (the hover dot, the tooltip swatch) so it matches the
// backdrop at that same height, instead of referencing the SVG gradient directly (which,
// applied to a shape as tiny as a 4px dot, resampled the whole 0%-100% range across those
// few pixels and came out looking like a blurry multicolor smear).
function colorAtGradientPosition(t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  const stops = WAVE_GRADIENT_STOPS.map((stop) => ({
    pos: parseFloat(stop.offset) / 100,
    rgb: hexToRgb(stop.color),
  }));
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (clamped >= a.pos && clamped <= b.pos) {
      const localT = b.pos === a.pos ? 0 : (clamped - a.pos) / (b.pos - a.pos);
      return rgbToHex([
        a.rgb[0] + (b.rgb[0] - a.rgb[0]) * localT,
        a.rgb[1] + (b.rgb[1] - a.rgb[1]) * localT,
        a.rgb[2] + (b.rgb[2] - a.rgb[2]) * localT,
      ]);
    }
  }
  return stops[stops.length - 1].rgb ? rgbToHex(stops[stops.length - 1].rgb) : POSITIVE_COLOR;
}

function getColorForValue(value: number, min: number, max: number): string {
  if (max === min) return POSITIVE_COLOR;
  // value === max -> t=0 (blue, top of the gradient); value === min -> t=1 (red, bottom).
  const t = (max - value) / (max - min);
  return colorAtGradientPosition(t);
}

const RANGES: { key: Range; label: string }[] = [
  { key: "24h", label: "24H" },
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
];

// Exact value, never compacted to "K" — Anatole wants the total and every tooltip reading
// accurate to the coin, not a rounded approximation.
function formatCoins(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toLocaleString()}`;
}

function formatBucketLabel(bucketStart: string, range: Range): string {
  const date = new Date(bucketStart);
  if (range === "24h") {
    return date.toLocaleTimeString([], { hour: "numeric" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function ChartTooltip({ active, payload, range, minValue, maxValue }: any) {
  if (!active || !payload?.length) return null;
  const point: HistoryPoint = payload[0].payload;
  return (
    <div className="rounded-lg bg-[#232328] px-3 py-2 shadow-lg">
      <p className="text-white/50 text-xs mb-1">{formatBucketLabel(point.bucketStart, range)}</p>
      <div className="flex items-center gap-1.5">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: getColorForValue(point.net, minValue, maxValue) }}
        />
        <span className="text-white font-bold text-sm">{formatCoins(point.net)} coins</span>
      </div>
    </div>
  );
}

// Recharts clones this element with its own dot props (cx, cy, payload, ...) merged in —
// minValue/maxValue passed down from the chart survive that merge since they don't collide
// with any of recharts' own prop names.
function ActiveDot(props: any) {
  const { cx, cy, payload, minValue, maxValue } = props;
  if (cx == null || cy == null || !payload) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={getColorForValue(payload.net, minValue, maxValue)}
      stroke="#000000"
      strokeWidth={2}
    />
  );
}

export default function CoinsHistoryChart() {
  const [range, setRange] = useState<Range>("7d");

  // Polled (same 15s cadence as friends/requests elsewhere) as a backstop covering every
  // settlement path, on top of the explicit invalidateQueries calls in game.tsx/table-test.tsx
  // (Classic solo) that update this the instant a hand settles rather than waiting on the poll.
  const { data, isLoading } = useQuery<{ history: HistoryPoint[] }>({
    queryKey: [`/api/stats/coins-history?range=${range}`],
    refetchInterval: 15000,
  });

  const history = data?.history ?? [];
  const total = history.reduce((sum, point) => sum + point.net, 0);
  const hasActivity = history.some((point) => point.net !== 0);
  const values = history.map((point) => point.net);
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 0;
  // A light constant-thickness band trailing the curve instead of a fill anchored to the flat
  // zero baseline (which read as "placid" — its far edge stayed dead straight regardless of
  // the curve's own peaks/dips). 15% of the value range on each side, with a floor so a
  // near-flat curve still gets a visible band instead of collapsing to nothing.
  const bandHalfWidth = Math.max((maxValue - minValue) * 0.15, Math.max(Math.abs(maxValue), Math.abs(minValue), 100) * 0.05);
  const chartData = history.map((point) => ({
    ...point,
    bandBase: point.net - bandHalfWidth,
    bandThickness: bandHalfWidth * 2,
  }));

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

      {/* The frame (bg-black/border) used to live in profile.tsx wrapping this whole
          component, header row included — moved here around just the chart so the total +
          range pills sit above the frame instead of inside it, and the chart fills the frame
          edge-to-edge (no padding) instead of sitting inset within it. */}
      <div className="h-40 relative rounded-xl border-2 border-white/10 bg-black overflow-hidden">
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
                {/* margin top/bottom: 6 — enough clearance for the 2.5px stroke's half-width
                    plus antialiasing so a peak/trough sitting exactly at the domain's min/max
                    doesn't get clipped by this box's own overflow-hidden. */}
                <AreaChart data={chartData} margin={{ top: 6, right: 0, bottom: 6, left: 0 }}>
                  <defs>
                    <linearGradient id={WAVE_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                      {WAVE_GRADIENT_STOPS.map((stop) => (
                        <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
                      ))}
                    </linearGradient>
                  </defs>
                  {/* Domain widened by the band's own half-width on each side (rather than the
                      curve's exact dataMin/dataMax) so the band has room to sit above/below the
                      line without its own edges getting clipped — the line's gradient coloring
                      is unaffected since that's mapped against the stroke path's own bounding
                      box, not this domain. */}
                  <YAxis hide domain={[(min: number) => min - bandHalfWidth, (max: number) => max + bandHalfWidth]} />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                  {/* isAnimationActive: false — Recharts' default tooltip wrapper eases its
                      position with a CSS transition, which reads fine for a mouse but makes a
                      finger-drag scrub across the chart feel like it's lagging a beat behind
                      the touch instead of tracking it 1:1. */}
                  <Tooltip
                    content={<ChartTooltip range={range} minValue={minValue} maxValue={maxValue} />}
                    cursor={{ stroke: "rgba(255,255,255,0.2)", strokeWidth: 1 }}
                    isAnimationActive={false}
                  />
                  {/* Constant-thickness band trailing the curve (stacked: invisible bandBase +
                      colored bandThickness) instead of a fill anchored to the flat zero line —
                      the whole point of this request: the color should move up and down with
                      the wave, not just sit flat while the line dips through it. */}
                  <Area type="monotone" dataKey="bandBase" stackId="band" stroke="none" fill="transparent" isAnimationActive={false} />
                  <Area
                    type="monotone"
                    dataKey="bandThickness"
                    stackId="band"
                    stroke="none"
                    fill={`url(#${WAVE_GRADIENT_ID})`}
                    fillOpacity={0.08}
                  />
                  <Area
                    type="monotone"
                    dataKey="net"
                    stroke={`url(#${WAVE_GRADIENT_ID})`}
                    strokeWidth={2.5}
                    fill="none"
                    dot={false}
                    activeDot={<ActiveDot minValue={minValue} maxValue={maxValue} />}
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
