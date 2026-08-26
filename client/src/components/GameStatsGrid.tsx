import { Trophy, Cards, Chart, Activity } from "@/icons";
import { colorAtGradientPosition } from "@/components/CoinsHistoryChart";

// Poker-tracker-style stat cards (Anatole's reference: VPIP/Activity/PFR/AFq tiles) adapted to
// this app's own 4 stats and icon language — same layout/DA (icon + label header row, big
// number below), not the reference's own pink/green bar color or its "?" info icons (nothing
// here needs a tooltip, so a fake info button that opens nothing would just be confusing
// chrome). Win Rate is the only one of the four that's actually a percentage of a whole, so
// it's the only one with a filled-segment bar under it (matching the reference's VPIP/PFR/AFq
// tiles) — the other three are raw counts, so they get a plain caption line instead (matching
// the reference's own Activity tile, which has no bar either), each pulled from stats already
// on hand rather than needing anything new from the server: losses to contextualize Hands Won,
// busts for Total Games Played, and blackjack rate as text (not a second bar) for Blackjacks.
// mt-auto on each bottom row pins it to the card's bottom edge regardless of which cards have 2
// lines of content above it vs 1. Fixed height (h-24, not just matching padding) keeps all four
// the same size regardless.
// Shared by Profile (the logged-in user's own stats) and the Friend Stats popup (a friend's).
export default function GameStatsGrid({ stats }: { stats: any }) {
  const winRate = stats?.handsWon
    ? (stats.handsWon / (stats.handsPlayed || 1)) * 100
    : 0;
  const segments = 5;
  const filledSegments = Math.round((Math.min(100, winRate) / 100) * segments);
  // Same gradient as the Coins chart above (WAVE_GRADIENT_STOPS in CoinsHistoryChart.tsx) —
  // not a bar-specific color scheme of its own. Each filled segment's color is interpolated by
  // its own position in the bar (0 at the start, 1 at the end), not by how many are actually
  // filled, so a low win rate (few segments) only ever shows the gradient's green end and a
  // high one progresses further through it.
  const segmentColor = (i: number) => colorAtGradientPosition(segments > 1 ? i / (segments - 1) : 0);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-black rounded-[24px] border-2 border-white/15 px-4 py-3 h-24 flex flex-col">
        <div className="flex items-center gap-1.5">
          <Trophy className="w-4 h-4 flex-shrink-0 text-white/70" />
          <span className="text-white/70 font-bold text-xs">Hands Won</span>
        </div>
        <div className="flex-1 flex items-center">
          <p className="text-white font-black text-xl leading-none" data-testid="stat-wins">
            {stats?.handsWon || 0}
          </p>
        </div>
        <p className="text-white/40 text-[11px] font-semibold">
          {stats?.handsLost || 0} losses
        </p>
      </div>

      <div className="bg-black rounded-[24px] border-2 border-white/15 px-4 py-3 h-24 flex flex-col">
        <div className="flex items-center gap-1.5">
          <Chart className="w-4 h-4 flex-shrink-0 text-white/70" />
          <span className="text-white/70 font-bold text-xs">Win Rate</span>
        </div>
        <div className="flex-1 flex items-center">
          <p className="text-white font-black text-xl leading-none" data-testid="stat-winrate">
            {winRate.toFixed(1)}
            <span className="text-xs text-white/45 font-bold">%</span>
          </p>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: segments }).map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full"
              style={{ backgroundColor: i < filledSegments ? segmentColor(i) : "rgba(255,255,255,0.1)" }}
            />
          ))}
        </div>
      </div>

      <div className="bg-black rounded-[24px] border-2 border-white/15 px-4 py-3 h-24 flex flex-col">
        <div className="flex items-center gap-1.5">
          <Activity className="w-4 h-4 flex-shrink-0 text-white/70" />
          <span className="text-white/70 font-bold text-xs">TGP</span>
        </div>
        <div className="flex-1 flex items-center">
          <p className="text-white font-black text-xl leading-none" data-testid="stat-games-played">
            {stats?.handsPlayed || 0}
          </p>
        </div>
        <p className="text-white/40 text-[11px] font-semibold">
          {stats?.busts || 0} busts
        </p>
      </div>

      <div className="bg-black rounded-[24px] border-2 border-white/15 px-4 py-3 h-24 flex flex-col">
        <div className="flex items-center gap-1.5">
          <Cards className="w-4 h-4 flex-shrink-0 text-white/70" />
          <span className="text-white/70 font-bold text-xs">Blackjacks</span>
        </div>
        <div className="flex-1 flex items-center">
          <p className="text-white font-black text-xl leading-none" data-testid="stat-blackjacks">
            {stats?.blackjacks || 0}
          </p>
        </div>
        <p className="text-white/40 text-[11px] font-semibold">
          {stats?.handsPlayed ? ((stats.blackjacks / stats.handsPlayed) * 100).toFixed(1) : "0.0"}% of hands
        </p>
      </div>
    </div>
  );
}
