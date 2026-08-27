import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "@/icons";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { gameService } from "@/services/gameService";
import { showRewardedAd } from "@/lib/admob";
import { apiRequest } from "@/lib/queryClient";
import { useSelectedCardBack } from "@/hooks/use-selected-card-back";
import { BetSlider } from "@/components/BetSlider";
import HandCards from "@/components/game/play/HandCards";
import ActionBar from "@/components/game/play/ActionBar";
import SplitHandsCenterSide from "@/components/game/play/SplitHandsCenterSide";
import GameResultOverlay, { GameResultType } from "@/components/game/GameResultOverlay";
import AnimatedModal from "@/components/AnimatedModal";
import NoEntry from "@/icons/NoEntry";
import topHatImage from "@assets/top_hat_3d_1757354434573.png";
import { formatFullNumber } from "@/lib/formatUtils";

// Prototype room preset — the entry-level tier (lowest tapis, mise mini/maxi basse). Room
// names are meant to climb in glamour as the tapis mini goes up (Garage -> ... -> Vegas ->
// Paris -> Monaco), not stay "Las Vegas" at the very bottom rung. Only used here to test the
// flow, not wired to any real room system yet.
const ROOM = { name: "Garage", minBet: 1, maxBet: 500 };

interface TableTestProps {
  // Shown as an overlay on Home (see home.tsx) instead of routing away, so the slide up/down
  // has Home still visible underneath the whole time. onClose just hides the overlay — Home
  // owns the actual slide animation via AnimatePresence, this component doesn't need its own.
  // Falls back to a plain navigate("/") for the standalone /play/table-test route registered
  // in App.tsx (kept as a direct-link fallback, not part of the normal Home entry flow).
  onClose?: () => void;
}

export default function TableTest({ onClose }: TableTestProps) {
  const [, navigate] = useLocation();
  const handleClose = onClose ?? (() => navigate("/"));
  const queryClient = useQueryClient();
  const { cardBackUrl } = useSelectedCardBack();

  const user = useUserStore((s) => s.user);
  const loadUserCoins = useUserStore((s) => s.loadUserCoins);
  const balance = user?.coins || 0;

  const {
    gameState, playerHand, dealerHand, playerTotal, dealerTotal, bet, result,
    canDouble, canSplit, canSurrender, isSplit, splitHands, currentSplitHand,
    isProcessingAction, lastNetResult, gameId,
    hit, stand, double, split, surrender, resetGame, setMode, syncServerState,
  } = useGameStore();

  const [currentBet, setCurrentBet] = useState(ROOM.minBet);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultType, setResultType] = useState<GameResultType>(null);
  // The result sheet shows this hand's own net change (0 -> +200, 0 -> -1900, ...), not the
  // player's whole account balance — same as Play with Friends (see GameResultOverlay).
  const [netResultAmount, setNetResultAmount] = useState(0);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  // Swap — spends 1 Swap token to redeal the current starting hand (see POST /api/game/swap).
  // isSwapping guards against a double-tap; hasSwapped tracks the server's one-per-hand cap
  // (mirrors PlayerHand.swapped, which syncServerState doesn't surface on its own) so the
  // button greys out the instant it's used instead of only after a rejected second attempt.
  const [isSwapping, setIsSwapping] = useState(false);
  const [hasSwapped, setHasSwapped] = useState(false);
  // This hand's simulated win probability (server-computed against the real remaining deck —
  // see handStrength.ts), set from the very same response that deals the cards so Swap's
  // eligibility is already known before the reveal animation even starts. undefined until
  // that arrives, which canSwap below treats as "not eligible" rather than flashing enabled.
  const [winProbability, setWinProbability] = useState<number | undefined>(undefined);
  // Bumped once per round, only at round end (see handleDismissResult) — keys the dealer/player
  // HandCards below so they keep the SAME component instance for the whole betting -> dealt ->
  // gameOver span of a round (the cards just re-render with new props, in place — no unmount,
  // no gap for the table to darken through) and only actually remount, replaying the old
  // fade-out/fade-in swap, at the one moment that swap was always meant for: the round handing
  // off to the next one, hidden behind GameResultOverlay's own backdrop fade.
  const [roundKey, setRoundKey] = useState(0);

  // After a split, the server switches currentSplitHand to the next hand in the very same
  // response that settled the first one (a bust, a stand) — without this lag, the swap
  // happened instantly, so a bust flashed by with no time to actually see it before the other
  // hand took over. displayedSplitHand trails the real one by a beat; the action buttons stay
  // gated (see canHit etc. below) until it catches up, so a tap during that beat can't land on
  // the wrong hand.
  const [displayedSplitHand, setDisplayedSplitHand] = useState(currentSplitHand);
  useEffect(() => {
    if (currentSplitHand === displayedSplitHand) return;
    const t = setTimeout(() => setDisplayedSplitHand(currentSplitHand), 900);
    return () => clearTimeout(t);
  }, [currentSplitHand, displayedSplitHand]);
  // A brand new split (not a switch mid-split) should show its first hand immediately, no
  // delay — only fires once, right when isSplit flips false -> true.
  useEffect(() => {
    if (isSplit) setDisplayedSplitHand(currentSplitHand);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSplit]);
  const isSwitchingSplitHand = isSplit && displayedSplitHand !== currentSplitHand;

  // Leaving mid-hand forfeits the bet server-side — without this, "Menu" during a live hand
  // just navigates away and leaves the game "in_progress" in the DB, so the next visit to
  // this page silently resumes it (looked like landing straight into a game with no bet).
  const forfeitMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/game/forfeit");
    },
    onSettled: () => {
      setShowLeaveConfirm(false);
      resetGame();
      handleClose();
    },
  });

  const handleLeaveTable = () => {
    if (gameState === "playing" || gameState === "dealerTurn") {
      setShowLeaveConfirm(true);
      return;
    }
    handleClose();
  };

  useEffect(() => {
    setMode("classic");
    loadUserCoins();
    // Resume an in-progress game (refresh survival); otherwise land cleanly on the wheel.
    gameService
      .getActiveGame()
      .then((active) => {
        if (active.active && active.gameId) {
          syncServerState({
            success: true,
            gameId: active.gameId,
            status: active.status || "in_progress",
            mode: active.mode || "classic",
            betAmount: active.betAmount ?? ROOM.minBet,
            playerHands: active.playerHands || [],
            dealerHand: active.dealerHand || [],
            activeHandIndex: active.activeHandIndex || 0,
            legalActions: active.legalActions || [],
          });
          // Resuming a hand that was already swapped before the app got killed — syncServerState
          // itself doesn't carry PlayerHand.swapped through, so this is seeded here instead.
          setHasSwapped(!!active.playerHands?.[active.activeHandIndex || 0]?.swapped);
          setWinProbability(active.winProbability);
        } else {
          resetGame();
        }
      })
      .catch(() => resetGame());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dynamicMax = Math.min(ROOM.maxBet, Math.max(ROOM.minBet, balance)) || ROOM.minBet;

  // Slider steps one unit at a time across the room's full 1–500 range.
  const handleBetSliderChange = (value: number) => {
    const rounded = Math.round(value);
    setCurrentBet(Math.max(ROOM.minBet, Math.min(dynamicMax, rounded)));
  };

  const handlePlaceBet = async () => {
    if (isPlacingBet || currentBet <= 0 || balance < currentBet) return;
    setIsPlacingBet(true);
    try {
      const data = await gameService.startGame("classic", currentBet);
      syncServerState(data);
      setHasSwapped(false);
      setWinProbability(data.winProbability);
      loadUserCoins();
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
    } catch (e) {
      console.error("Failed to start game", e);
    } finally {
      setIsPlacingBet(false);
    }
  };

  const handlePlayerAction = (action: "hit" | "stand" | "double" | "split" | "surrender") => {
    if (isProcessingAction) return;
    if (action === "hit") hit();
    if (action === "stand") stand();
    if (action === "double") double();
    if (action === "split") split();
    if (action === "surrender") surrender();
  };

  // Same "first decision" window Double uses — still the starting 2-card hand, nothing
  // played yet — minus split hands (v1 keeps this simple, see the server route's comment).
  // Also gated on the hand actually being weak: winProbability is a server-side Monte Carlo
  // simulation against the real remaining deck (see handStrength.ts), sent in the same
  // response that deals the cards — under 50% is the "bad hand" case Swap is for, not every
  // single deal. undefined (not arrived yet, or a mode that never computes it) reads as
  // "not eligible" rather than flashing enabled before the real number lands. Deliberately
  // NOT gated on having a Swap token — see hasSwapTokens/swapViaAd below, which decide whether
  // tapping it spends one or plays a rewarded ad instead; the button stays equally "live"
  // either way.
  const swapEligible =
    gameState === "playing" &&
    !isSplit &&
    playerHand.length === 2 &&
    (winProbability ?? 1) < 0.5;
  // Whether tapping Swap right now would actually do anything — separate from whether the
  // slot should still be occupying the row (see canSwap below). Excludes isProcessingAction
  // so a mid-hit/stand request doesn't just gray the button, it also blocks the tap.
  const swapClickable = swapEligible && !hasSwapped && !isSwapping && !isProcessingAction;
  // Once the slot has ever been worth showing for this hand, keep it in the row — grayed out —
  // rather than yanking it the instant a tap starts (isSwapping) or it gets used (hasSwapped).
  // Without this, clicking Swap while out of tokens made the button vanish immediately, then
  // reappear/disappear again once the rewarded ad finished, instead of staying put as a visibly
  // "already used" button the way Double/Surrender stay put once they stop being legal.
  const canSwap = swapEligible || isSwapping || hasSwapped;
  const hasSwapTokens = (user?.swapTokens ?? 0) > 0;

  const handleSwap = async () => {
    if (!swapClickable || !gameId) return;
    setIsSwapping(true);
    try {
      let data;
      if (hasSwapTokens) {
        data = await gameService.swap(gameId);
      } else {
        // Out of tokens — the same button becomes "watch an ad to swap instead" (see
        // ActionBar's swapViaAd prop for its icon). Same trust model as the double-reward
        // ad flow: the server only ever hears about this after the ad actually played
        // through.
        const earned = await showRewardedAd();
        if (!earned) return;
        data = await gameService.swap(gameId, true);
      }
      syncServerState(data);
      setHasSwapped(true);
      if (typeof data.swapTokens === "number") {
        useUserStore.getState().updateUser({ swapTokens: data.swapTokens });
      }
    } catch (e) {
      console.error("Failed to swap hand", e);
    } finally {
      setIsSwapping(false);
    }
  };

  // Reveals the result sheet — called once the dealer's HandCards reports its whole hand has
  // actually finished animating (see onDealerHandSettled below), not after a fixed timeout.
  // A fixed delay doesn't scale with how many cards the dealer actually drew: it used to be
  // possible for the result ("You won"/"You lost") to show up while the dealer's own cards
  // were still mid-reveal, or even before a card that ends up busting them had appeared —
  // spoiling/contradicting what the player was still watching happen.
  const revealResultRef = useRef<() => void>(() => {});
  revealResultRef.current = () => {
    if (gameState !== "gameOver" || result === null || showResult) return;
    const playerHandValue = playerHand.reduce((sum, c) => {
      if (c.value === "A") return sum + 11;
      if (["K", "Q", "J"].includes(c.value)) return sum + 10;
      return sum + parseInt(c.value);
    }, 0);
    const isBlackjack = playerHand.length === 2 && playerHandValue === 21;
    const type: GameResultType =
      result === "win" && isBlackjack ? "blackjack" : result === "win" ? "win" : result === "push" ? "tie" : "loss";

    setNetResultAmount(lastNetResult ?? 0);
    queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats/summary"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats/coins-history?range=24h"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats/coins-history?range=7d"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats/coins-history?range=30d"] });
    queryClient.invalidateQueries({ queryKey: ["/api/challenges/user"] });
    queryClient.invalidateQueries({ queryKey: ["/api/daily-streak"] });
    useUserStore.getState().loadUser();

    setResultType(type);
    setShowResult(true);
  };

  // A short, fixed beat AFTER the cards genuinely finish (not a substitute for waiting on
  // them) — just enough for the last card to visually settle before the sheet flies up.
  const handleDealerHandSettled = useCallback(() => {
    setTimeout(() => revealResultRef.current(), 400);
  }, []);

  const handleDismissResult = () => {
    setShowResult(false);
    // resultType is deliberately NOT cleared here. GameResultOverlay bails out with
    // `if (!resultType) return null` before it ever reaches its own AnimatePresence — clearing
    // resultType in the same tick as show=false used to unmount that AnimatePresence outright,
    // skipping its slide-down/backdrop-fade exit animation entirely instead of playing it. That
    // let the sheet vanish in a single frame, instantly exposing the settled hand at full
    // brightness underneath before the table's own fade-out had a chance to run — the "flash"
    // this fixes. Leaving resultType in place lets `show={false}` drive a real exit; it gets
    // overwritten with a fresh value next time revealResultRef.current() fires, so there's
    // nothing to reset it back to in the meantime.
    resetGame();
    // currentBet is left as-is on purpose — the wheel reopens pre-loaded with the same
    // amount so tapping BET again instantly rebets, per the "recommencer à l'infini" flow.
    setRoundKey((k) => k + 1);
  };

  const isBetting = gameState === "betting";
  const isPlaying = gameState === "playing" || gameState === "dealerTurn";

  // Round start (bet placed: isBetting true -> false) and round end (result dismissed:
  // isBetting false -> true) both flip the same boolean, but only round-end wants the
  // sequential "wait" fade-through-black — that's the one paired with GameResultOverlay's own
  // backdrop fade (see the comment below). Round-start should feel like nothing but the wheel
  // swapping for the dealt hand/ActionBar, so it needs a synchronized crossfade instead.
  //
  // fadeMode has to be *decided once* right when isBetting changes and then held fixed for the
  // rest of that transition's animation, not recomputed fresh on every render. It used to be
  // (isRoundStart, comparing against a ref updated in a useEffect *after* commit): that left a
  // window, for as long as the ~200ms crossfade below was still playing, where an unrelated
  // re-render (e.g. handlePlaceBet's loadUserCoins() resolving, or a query invalidation,
  // whenever they happened to land) saw the effect had already flipped the ref back and
  // recomputed isRoundStart as false — flipping AnimatePresence's mode prop from sync
  // (simultaneous crossfade) to "wait" (sequential, exit-then-enter) *while the sync animation
  // was still in flight*. That's what an intermittent "bet bar bounces, then vanishes, then the
  // action buttons pop in" was: not every time, only when that re-render's timing happened to
  // land inside the animation window — i.e. exactly the flaky, network-timing-dependent
  // pattern reported. Updating the ref synchronously during render (comparing against the
  // previous render's value, then immediately overwriting it) closes that window entirely:
  // there's no commit in between where a stale-but-not-yet-corrected value could be read.
  const prevIsBettingRef = useRef(isBetting);
  const fadeModeRef = useRef<"wait" | undefined>("wait");
  if (prevIsBettingRef.current !== isBetting) {
    fadeModeRef.current = prevIsBettingRef.current && !isBetting ? undefined : "wait";
    prevIsBettingRef.current = isBetting;
  }
  const fadeMode = fadeModeRef.current;

  return (
    // Fills whatever fixed-position, full-screen container the caller wraps this in (Home's
    // overlay, or the .fixed-safe-screen div App.tsx puts around the standalone route) —
    // doesn't own that positioning itself, since Home's version needs the *outer* element to
    // be what slides, with this content just filling it. overflow-hidden still matters here:
    // same rubber-band-bounce-on-iOS fix as the rest of the app's tables (see "Fix game table
    // layout: pin the page, add safe-area clearance") — a scrollable full-height block can
    // still bounce even inside a non-scrolling ancestor.
    <div className="h-full w-full bg-black text-white overflow-hidden">
      {/* Header + dealer live in normal flow near the top. The player's cards + controls are
          NOT part of this flow — see the position:absolute block right below — because relying
          on flex-1/h-full to push them down turned out not to be reliable: percentage/flex
          height computed against a position:fixed ancestor doesn't always match what the actual
          WKWebView viewport reports on-device, and left a dead gap under the buttons no matter
          how the flex math was tuned. Pinning the player block with the exact same
          position:fixed/inset technique that already reliably works for .fixed-safe-screen
          itself sidesteps that gap entirely, and as a bonus keeps the player's cards at a fixed
          distance from the true bottom edge — identical between the betting and playing
          screens — since it no longer depends on how tall the dealer's own content is. */}
      <div className="max-w-md mx-auto h-full flex flex-col px-5 pt-6">
        {/* Header */}
        <div className="relative flex items-center mb-6 shrink-0">
          <button
            onClick={handleLeaveTable}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-transparent border-none cursor-pointer text-white/60 hover:text-white transition-colors"
            style={{ background: "transparent", border: "none", padding: 0 }}
            data-testid="button-leave-table"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-medium flex items-center gap-2">
            <img src={topHatImage} className="w-6 h-6 object-contain" alt="Dealer" />
            Dealer
          </h1>
          <div className="ml-auto text-right overflow-hidden">
            <AnimatePresence mode={fadeMode} initial={false}>
              <motion.div
                key={isBetting ? "header-betting" : "header-hand"}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.2 } }}
                exit={{ opacity: 0, y: 4, transition: { duration: 0.15 } }}
              >
                <p className="text-white/50 text-xs">{isBetting ? ROOM.name : "Bet"}</p>
                <p className="text-white font-semibold text-base">
                  {isBetting ? `${ROOM.minBet}–${ROOM.maxBet}` : formatFullNumber(bet)}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Dealer */}
        <div className="flex justify-center">
          {/* Keyed by roundKey, not by isBetting: React only unmounts/remounts HandCards when
              roundKey actually changes, and that only happens once, at round end (see
              handleDismissResult) — so for the whole betting -> dealt -> gameOver span of a
              single round, this stays the SAME component instance. Placing a bet just feeds it
              new cards/faceDownIndices props; each PlayingCard flips in place (placeholderCount,
              see HandCards) with no unmount and so no gap for the table to darken through.
              At round end, roundKey bumps, so THIS one swap still plays the original
              fade-out/fade-in ("wait" mode) exactly as it always did, hidden behind
              GameResultOverlay's own backdrop fade — that transition was never the problem, only
              the identical one at round start was, so only round start lost it. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={roundKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.2, ease: "easeOut" } }}
              exit={{ opacity: 0, transition: { duration: 0.15, ease: "easeIn" } }}
            >
              <HandCards
                cards={dealerHand}
                faceDownIndices={isPlaying ? [1] : []}
                variant="dealer"
                cardBackUrl={cardBackUrl}
                showPositionedTotal
                total={dealerTotal}
                onDealerHandSettled={handleDealerHandSettled}
                skipInitialFall
                placeholderCount={2}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Player's cards + controls, pinned to the real bottom edge of the device — max() picks
          whichever is bigger between the actual home-indicator inset and a plain 20px floor, so
          there's always clean, deliberate breathing room even on a device with no inset at all. */}
      <div
        className="absolute bottom-0 left-0 right-0 max-w-md mx-auto px-5 flex flex-col items-center gap-4"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 20px)" }}
      >
        {/* w-full is load-bearing for the split view specifically: its side hand pins itself to
            "right-0" of ITS OWN width, but a flex child inside an "items-center" ancestor (the
            parent below) shrinks to its content's width by default — without this, the whole
            component collapsed to roughly the width of the centered hand alone, so "right-0"
            landed right next to it instead of at the real screen edge. */}
        <div className="w-full flex justify-center">
          {/* Same roundKey-keyed AnimatePresence as the dealer block above — see the comment
              there. isSplit is always false during betting (a split can only happen mid-hand),
              so this still lands on the plain HandCards branch, with the same placeholderCount,
              whenever there's no hand yet. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={roundKey}
              className="w-full flex justify-center"
              // w-full here carries the real screen width down to SplitHandsCenterSide (see the
              // "w-full is load-bearing" comment on this block's own parent) — this wrapper sits
              // between that parent and SplitHandsCenterSide, and without its own w-full it
              // shrinks to content width like any other flex child, so SplitHandsCenterSide's
              // waiting-hand "right-0"/"left-0" pin resolved against that collapsed width instead
              // of the true screen edge and landed right on top of the active hand.
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.2, ease: "easeOut" } }}
              exit={{ opacity: 0, transition: { duration: 0.15, ease: "easeIn" } }}
            >
              {isSplit ? (
                <SplitHandsCenterSide
                  splitHands={splitHands}
                  currentSplitHand={displayedSplitHand}
                  cardBackUrl={cardBackUrl}
                />
              ) : (
                <HandCards
                  cards={playerHand}
                  variant="player"
                  total={playerTotal}
                  cardBackUrl={cardBackUrl}
                  showPositionedTotal
                  skipInitialFall
                  placeholderCount={2}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* A fixed height, not min-height: the bet wheel's own natural content (label + amount
            + 48px slider + button) runs to ~172px, taller than the 160px floor this used to be
            — so a min-height still let the box grow by ~12px the instant the wheel mounted
            (after the actionbar, whose own content is shorter, finished exiting). Since this
            whole block sits above nothing (it's the last child in a bottom-anchored flex
            column), that growth pushed the player's cards further up during the crossfade
            before settling back — visible as the cards jumping into place a beat late instead
            of already sitting where they land. A height tall enough for the taller of the two,
            fixed rather than floored, means the box truly never changes size, so the cards
            above it never move for a reason that has nothing to do with them. */}
        <div className="w-full h-[172px] flex flex-col justify-center">
          {/* Sequential fade, same reasoning as the header block above (see there and
              isRoundStart's own comment). The cards use a different mechanism now (roundKey,
              see the dealer block above) since a real 3-card flip needed the swap gone
              entirely at round start, not just crossfaded — but this bit of UI (the wheel vs.
              ActionBar) never had that problem, so isBetting/fadeMode's plain crossfade is
              still the right tool for it. */}
          <AnimatePresence mode={fadeMode} initial={false}>
            {isBetting ? (
              <motion.div
                key="wheel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.2, ease: "easeOut" } }}
                exit={{ opacity: 0, transition: { duration: 0.15, ease: "easeIn" } }}
                className="space-y-2"
              >
                <div className="text-center">
                  <p className="text-xs text-white/50 uppercase tracking-wide mb-0.5">Your bet</p>
                  <motion.p
                    className="text-2xl font-light tracking-tight"
                    key={currentBet}
                    initial={{ scale: 0.92, opacity: 0.7 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    data-testid="text-current-bet"
                  >
                    {formatFullNumber(currentBet)}
                  </motion.p>
                </div>
                <BetSlider
                  min={ROOM.minBet}
                  max={dynamicMax}
                  value={currentBet}
                  onChange={handleBetSliderChange}
                  disabled={isPlacingBet}
                  dataTestId="bet-slider"
                />
                <motion.button
                  onClick={handlePlaceBet}
                  disabled={isPlacingBet || balance < currentBet}
                  whileTap={!isPlacingBet && balance >= currentBet ? { scale: 0.98 } : {}}
                  className="w-full py-4 text-base font-bold rounded-xl bg-white text-[#15161A] disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-place-bet"
                >
                  {isPlacingBet ? "DEALING..." : `BET ${formatFullNumber(currentBet)}`}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.2, ease: "easeOut" } }}
                exit={{ opacity: 0, transition: { duration: 0.15, ease: "easeIn" } }}
              >
                <ActionBar
                  animateEntrance={false}
                  canHit={gameState === "playing" && !isProcessingAction && !isSwitchingSplitHand}
                  canStand={gameState === "playing" && !isProcessingAction && !isSwitchingSplitHand}
                  canDouble={gameState === "playing" && !isProcessingAction && !isSwitchingSplitHand && !!canDouble && balance >= bet}
                  canSplit={gameState === "playing" && !isProcessingAction && !isSwitchingSplitHand && !!canSplit && balance >= bet}
                  canSurrender={gameState === "playing" && !isProcessingAction && !isSwitchingSplitHand && !!canSurrender}
                  onHit={() => handlePlayerAction("hit")}
                  onStand={() => handlePlayerAction("stand")}
                  onDouble={() => handlePlayerAction("double")}
                  onSplit={() => handlePlayerAction("split")}
                  onSurrender={() => handlePlayerAction("surrender")}
                  canSwap={canSwap}
                  swapDisabled={!swapClickable}
                  onSwap={handleSwap}
                  swapBalance={user?.swapTokens ?? 0}
                  swapViaAd={!hasSwapTokens}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <GameResultOverlay
        show={showResult}
        resultType={resultType}
        dealerTotal={dealerTotal}
        playerTotal={playerTotal}
        startingBalance={0}
        endingBalance={netResultAmount}
        onDismiss={handleDismissResult}
        gameId={gameId}
      />

      <AnimatedModal open={showLeaveConfirm} onClose={() => setShowLeaveConfirm(false)} className="w-full max-w-xs">
        <div className="bg-[#000000] border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center">
          <NoEntry size={56} />
          <h2 className="mt-3 text-xl font-bold text-white">Leave the table?</h2>
          <p className="mt-2 text-white/70 text-sm mb-6">
            You'll forfeit your {formatFullNumber(bet)} coin bet. It won't be refunded.
          </p>
          <div className="flex gap-3 w-full">
            <button
              onClick={() => setShowLeaveConfirm(false)}
              disabled={forfeitMutation.isPending}
              className="flex-1 h-11 rounded-xl bg-[#0B0B0F] hover:bg-[#0B0B0F] border border-zinc-700 text-white font-medium disabled:opacity-50"
              data-testid="button-cancel-leave-table"
            >
              Stay
            </button>
            <button
              onClick={() => forfeitMutation.mutate()}
              disabled={forfeitMutation.isPending}
              className="flex-1 h-11 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold disabled:opacity-50"
              data-testid="button-confirm-leave-table"
            >
              {forfeitMutation.isPending ? "Leaving…" : "Leave"}
            </button>
          </div>
        </div>
      </AnimatedModal>
    </div>
  );
}
