import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pause, Loop } from "@/icons";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { useOverlayVisibilityStore } from "@/store/overlay-visibility-store";
import { gameService } from "@/services/gameService";
import { showRewardedAd } from "@/lib/admob";
import { apiRequest } from "@/lib/queryClient";
import { useSelectedCardBack } from "@/hooks/use-selected-card-back";
import { BetSlider } from "@/components/BetSlider";
import HandCards from "@/components/game/play/HandCards";
import ActionBar from "@/components/game/play/ActionBar";
import SplitHandsCenterSide from "@/components/game/play/SplitHandsCenterSide";
import type { GameResultType } from "@/components/game/GameResultOverlay";
import RoundResultBanner from "@/components/game/play/RoundResultBanner";
import WinStreakBar from "@/components/game/play/WinStreakBar";
import CoinBurst from "@/components/game/play/CoinBurst";
import ResultDimOverlay from "@/components/game/play/ResultDimOverlay";
import CountingBalance from "@/components/game/CountingBalance";
import BottomSheet from "@/components/BottomSheet";
import NoEntry from "@/icons/NoEntry";
import WatchAdIcon from "@/components/icons/WatchAdIcon";
import { formatFullNumber } from "@/lib/formatUtils";
import { getWinIntensity } from "@/lib/winIntensity";
import { trackCoinsDepleted } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";

// Entry-level room preset (lowest tapis, mise mini/maxi basse). Room names are meant to climb
// in glamour as the tapis mini goes up (Garage -> ... -> Vegas -> Paris -> Monaco), not stay
// "Las Vegas" at the very bottom rung. Not wired to a real room system yet — every table is
// this same preset for now.
const ROOM = { name: "Garage", minBet: 1, maxBet: 500 };

// EXPERIMENTAL (Anatole, 2026-09-12) — test change, easy to back out: revert this file to
// commit ec86cdcf to restore the old tap-to-dismiss-only flow with no auto-advance.
//
// How long the result banner (label+amount+XP) stays up before handing off, in the same slot,
// to the win streak bar — see the effect that drives showStreakInResultSlot below.
const RESULT_TO_STREAK_DELAY_MS = 1500;
// Gap between the result banner starting its own exit fade and the streak bar actually
// mounting — matches (rounded up from) RoundResultBanner's own 0.3s exit transition. Without
// this, both were flex siblings in the same centered slot for that whole overlap: the box
// briefly held both banner-exiting and bar-entering stacked, and shrank back down the instant
// the banner fully unmounted, reading as the bar arriving and then hopping into place a beat
// later (Anatole, 2026-09-12: "elle arrive, mais d'un coup, genre brut, et puis elle remonte un
// peu"). Waiting for the banner to actually be gone before mounting the bar means there's never
// a moment both share the slot, so the bar just fades in already sitting exactly where it'll
// stay.
const RESULT_EXIT_BUFFER_MS = 350;
// Total time a result stays on screen before auto-advancing to the next hand (no tap needed
// any more, in auto-bet or not) — long enough, past the delay above, to actually see the
// streak bar's own reveal, and to give a real win time to tap Watch-to-2X before it's gone. See
// the effect below for why this doesn't run at all while an ad claim (isDoubling) is in flight.
const AUTO_DISMISS_MS = 2750;
// A loss or push never offers Watch-to-2X and, in auto-bet, essentially never has a streak to
// hand off to either (a loss resets it) — holding those for the full delay above just meant an
// empty result slot sitting there doing nothing for a second-plus before anything moved
// (Anatole, 2026-09-12: "trop long ... le lose -1 qui part, puis après ça change de main").
// This shorter delay only applies when canOfferDouble is false, so a real win — the one case
// actually worth the wait — is untouched.
const AUTO_DISMISS_QUICK_MS = 1000;

interface ClassicModeProps {
  // Shown as an overlay on Home (see home.tsx) instead of routing away, so the slide up/down
  // has Home still visible underneath the whole time. onClose just hides the overlay — Home
  // owns the actual slide animation via AnimatePresence, this component doesn't need its own.
  // Falls back to a plain navigate("/") for the standalone /play/classic route registered
  // in App.tsx (kept as a direct-link fallback, not part of the normal Home entry flow).
  onClose?: () => void;
}

export default function ClassicMode({ onClose }: ClassicModeProps) {
  const [, navigate] = useLocation();
  const { t } = useTranslation("gameplay");
  const { toast } = useToast();
  const handleClose = onClose ?? (() => navigate("/"));
  const queryClient = useQueryClient();
  const { cardBackUrl } = useSelectedCardBack();

  const user = useUserStore((s) => s.user);
  const loadUserCoins = useUserStore((s) => s.loadUserCoins);
  const balance = user?.coins || 0;

  const {
    gameState, playerHand, dealerHand, playerTotal, dealerTotal, bet, result,
    canDouble, canSplit, isSplit, splitHands, currentSplitHand,
    isProcessingAction, lastNetResult, lastStreak, lastStreakBonus, gameId,
    hit, stand, double, split, resetGame, setMode, syncServerState,
  } = useGameStore();
  // The bar's own displayed value — deliberately NOT read straight from lastStreak. The server
  // response (and so lastStreak) lands the instant the hand settles, well before the dealer's
  // own cards have actually finished revealing (see onDealerHandSettled/revealResultRef below) —
  // bound directly to lastStreak, the bar would update (or break) the moment a win/loss is
  // known server-side, spoiling the outcome before the player has even seen the dealer's hand.
  // This instead only moves in step with revealResultRef.current() itself, the same instant the
  // result banner appears — see the setDisplayedStreak call there. Seeded from the user's own
  // persisted streak so reopening mid-streak (or loading this screen after a win from earlier
  // this session) still shows the bar right away, matching what's actually true.
  const [displayedStreak, setDisplayedStreak] = useState<number>(() => user?.currentStreakClassic ?? 0);
  // The one-off "you win X bonus" celebration WinStreakBar shows in place of the usual
  // countdown — set at the same reveal moment as displayedStreak whenever this hand actually
  // earned a streak bonus (server already reset displayedStreak's own new value back to 0 by
  // then, see WinStreakBar's own comment on why). null the rest of the time; WinStreakBar clears
  // it back to null itself once its own timer's up.
  const [streakCelebrationBonus, setStreakCelebrationBonus] = useState<number | null>(null);
  // EXPERIMENTAL, see RESULT_TO_STREAK_DELAY_MS above — flips true partway through a result's
  // display, hiding RoundResultBanner (see hideResultBanner below, not this) so it starts its
  // own exit fade.
  const [hideResultBanner, setHideResultBanner] = useState(false);
  // Flips true RESULT_EXIT_BUFFER_MS after hideResultBanner — i.e. only once the banner has
  // actually finished exiting and unmounted — handing the resultRef slot over to WinStreakBar.
  // See RESULT_EXIT_BUFFER_MS's own comment for why this needs its own later timer rather than
  // sharing hideResultBanner's.
  const [showStreakInResultSlot, setShowStreakInResultSlot] = useState(false);
  // Auto-bet — once on, handleDismissResult (see its own effect below) re-fires handlePlaceBet
  // with the same currentBet the instant a round ends, on repeat until paused. No stop-loss/
  // stop-win by design (see the brief this came from) — the only way out is the pause button.
  const [autoBetEnabled, setAutoBetEnabled] = useState(false);

  // CoinBurst reads these elements' own getBoundingClientRect() to fly coins from/to their
  // real on-screen position — not a guessed % of some ancestor's box, which drifted the moment
  // the header/result layout shifted (coins landing on the dealer's cards instead of the
  // balance, see the brief this came from).
  const balanceRef = useRef<HTMLSpanElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  // The positioned ancestor CoinBurst's particles are actually absolute-positioned against — see
  // the "relative" added to the root div below. Ancestors ABOVE this one may be mid-transform
  // (Home's own slide-in/out for this whole overlay), so anchoring to the viewport (position:
  // fixed) isn't safe; anchoring here and converting the two refs' viewport rects into
  // this-element-relative px is.
  const tableRootRef = useRef<HTMLDivElement>(null);

  const [currentBet, setCurrentBet] = useState(ROOM.minBet);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  // True for exactly the span of an auto-bet's own automatic handlePlaceBet call (see its isAuto
  // param below) — i.e. gameState is technically "betting" again, but the player never asked to
  // see the wheel for it. isBetting itself (below) folds this in so the wheel/header betting text
  // never mounts for that stretch; the ActionBar mounts right away instead (its own canHit/
  // canStand still gate on gameState === "playing", so it just sits disabled until the deal
  // lands) instead of the wheel appearing, showing "DEALING...", then swapping to it a beat later.
  const [isAutoRebetting, setIsAutoRebetting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultType, setResultType] = useState<GameResultType>(null);
  // The result sheet shows this hand's own net change (0 -> +200, 0 -> -1900, ...), not the
  // player's whole account balance — same as Play with Friends (see GameResultOverlay).
  const [netResultAmount, setNetResultAmount] = useState(0);
  // The header CountingBalance's own animation start point — a snapshot of `balance` taken
  // right before revealResultRef applies pendingRemainingCoins, i.e. the number actually on
  // screen the instant before the reveal. NOT `balance - netResultAmount`: netResult is the
  // hand's net win/loss relative to the balance BEFORE the bet was ever placed, but `balance`
  // by then already has the bet debited (see syncServerState's own mid-hand-debit branch) — so
  // that subtraction landed a bet-amount too high, one silent extra "pop" (the bet coming back)
  // stacked in front of the real animated count (the actual win), reading as too big a jump.
  const [preRevealBalance, setPreRevealBalance] = useState(0);
  // Watch-to-2X — offered as the bottom action-row button in place of Hit/Stand/Double/Swap
  // once a win is showing (see canOfferDouble/isWinResult below), not GameResultOverlay's old
  // small pill. doubledTo mirrors PlayerHand's own post-double net result once claimed; the
  // result banner reads it too, to swap its own displayed amount over the instant it lands.
  const [doubledTo, setDoubledTo] = useState<number | null>(null);
  const [isDoubling, setIsDoubling] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  // Swap — spends 1 Swap token to redeal the current starting hand (see POST /api/game/swap).
  // isSwapping guards against a double-tap; hasSwapped tracks the server's one-per-hand cap
  // (mirrors PlayerHand.swapped, which syncServerState doesn't surface on its own) so the
  // button greys out the instant it's used instead of only after a rejected second attempt.
  const [isSwapping, setIsSwapping] = useState(false);
  const [hasSwapped, setHasSwapped] = useState(false);
  // True for the brief window where the two starting cards are turned face-down for a
  // redeal (see handleSwap) — without this, syncServerState just swapped playerHand's suit/
  // value props on the same already-face-up, already-mounted card slots, which card.tsx never
  // animates (isHidden never actually changes), so the new hand just snapped in with no
  // visible change at all.
  const [isSwapFlipping, setIsSwapFlipping] = useState(false);
  // This hand's simulated win probability (server-computed against the real remaining deck —
  // see handStrength.ts), set from the very same response that deals the cards so Swap's
  // eligibility is already known before the reveal animation even starts. undefined until
  // that arrives, which canSwap below treats as "not eligible" rather than flashing enabled.
  const [winProbability, setWinProbability] = useState<number | undefined>(undefined);
  // True from the moment the result sheet is dismissed until the dealer/player HandCards below
  // have actually finished flipping every dealt card back to its card-back face (see
  // handleDismissResult) — forces both hands' isHidden regardless of the real card data, which
  // stays mounted (and stale) underneath the whole time. Nothing about the round actually
  // resets — game state, the wheel/ActionBar swap, the header text — until that flip is done;
  // see the setTimeout in handleDismissResult for why, and why the delay is computed rather
  // than a flat guess.
  const [isRoundEnding, setIsRoundEnding] = useState(false);

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

  // The joined pair's own score should get its own "it's gone now" beat (see HandCards'
  // `splitting` prop and its 0.12s exit fade) before the two-hand split view actually mounts and
  // the cards' shared-layout FLIP starts moving them apart — without this gap, the score
  // vanishing and the cards separating land in the same instant and read as one cluttered event
  // instead of two clean beats. revealSplit trails isSplit by that fade's duration plus a small
  // buffer, and only on the false->true edge — a session that resumes already mid-split has
  // nothing to fake-replay this delay for.
  const [revealSplit, setRevealSplit] = useState(isSplit);
  useEffect(() => {
    if (!isSplit) {
      setRevealSplit(false);
      return;
    }
    const t = setTimeout(() => setRevealSplit(true), 150);
    return () => clearTimeout(t);
  }, [isSplit]);
  // The store already collapses playerHand down to just the active split hand's own card(s) the
  // same instant isSplit flips true (see game-store's split()/syncServerState) — but the joined
  // pair needs to keep showing both original cards, unchanged, for the whole revealSplit delay
  // above (only its score is meant to visibly change during that window). Snapshots the last
  // pre-split playerHand so the still-mounted single-hand HandCards below has that to render
  // instead of the already-collapsed live data.
  const preSplitHandRef = useRef(playerHand);
  useEffect(() => {
    if (!isSplit) preSplitHandRef.current = playerHand;
  }, [isSplit, playerHand]);

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
  // Same "GO TO SHOP" swap as friends-lobby.tsx, for when the balance hits 0.
  const outOfCoins = balance === 0;

  // Fires exactly when this screen swaps the bet wheel for the "GET COINS" wall below --
  // the sharpest monetization/churn fork in the app. Re-fires if the player tops up and
  // then goes broke again in the same session, which is the correct behavior here.
  useEffect(() => {
    if (balance === 0) trackCoinsDepleted();
  }, [balance]);

  // currentBet intentionally survives a hand (see the "left as-is on purpose" comment below)
  // so the wheel reopens pre-loaded with the same bet. But a loss can drop `balance` below
  // that remembered bet, and without this the slider's thumb would sit past the track's own
  // right edge (unreachable by drag) while BET stayed permanently disabled (balance <
  // currentBet) -- the bet amount just silently outliving the balance that could ever cover
  // it again. Same fix as friends-lobby.tsx.
  useEffect(() => {
    setCurrentBet((prev) => Math.min(prev, dynamicMax));
  }, [dynamicMax]);

  // Slider steps one unit at a time across the room's full 1–500 range.
  const handleBetSliderChange = (value: number) => {
    const rounded = Math.round(value);
    setCurrentBet(Math.max(ROOM.minBet, Math.min(dynamicMax, rounded)));
  };

  // isAuto marks a call fired by handleDismissResult's own auto-bet re-fire rather than the
  // player tapping the wheel's BET button — see isAutoRebetting's own comment above for what
  // that changes on screen. Set/cleared here, around the same guards handlePlaceBet already had,
  // rather than by the caller: the early return right below (balance too low, already placing
  // one) is exactly the "leaves the wheel idle" case that comment already documented, and it has
  // to actually show the wheel again, so isAutoRebetting must go back to false on that path too —
  // not just in the try/finally below, which this return skips entirely.
  const handlePlaceBet = async (isAuto = false) => {
    if (isPlacingBet || currentBet <= 0 || balance < currentBet) {
      if (isAuto) setIsAutoRebetting(false);
      return;
    }
    if (isAuto) setIsAutoRebetting(true);
    setIsPlacingBet(true);
    try {
      const data = await gameService.startGame("classic", currentBet);
      syncServerState(data);
      setHasSwapped(false);
      setWinProbability(data.winProbability);
      // A natural blackjack on the deal settles right in this same response — syncServerState
      // already holds its remainingCoins as pendingRemainingCoins rather than applying it here,
      // so revealResultRef is the one that actually lands it, in step with the reveal instead
      // of a beat before it (same reasoning as Stand's own case, see pendingRemainingCoins).
      // loadUserCoins() below would otherwise race that hold-back: its own GET can land the
      // already-settled true balance while the dealer's cards are still flipping (showResult
      // still false, so the header shows it unanimated, straight away — see CountingBalance's
      // active prop), snapping the header to the answer well before the reveal. Skip it here
      // whenever this response already completed the hand; a still-in-progress deal has
      // nothing to spoil (syncServerState's own mid-hand branch already reflects the post-bet
      // balance immediately) so it's safe to also refresh from the server there.
      if (data.status !== "completed") {
        loadUserCoins();
      }
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
    } catch (e: any) {
      // Without this, a failed bet just silently reset the wheel with no explanation of
      // what happened.
      const message = e?.message || "";
      if (message.includes("409") || message.toLowerCase().includes("insufficient")) {
        toast({ message: t("betting.insufficientFundsMessage") });
        navigate("/shop");
      } else {
        toast({ message: t("betting.gameStartFailedMessage") });
      }
    } finally {
      setIsPlacingBet(false);
      if (isAuto) setIsAutoRebetting(false);
    }
  };

  const handlePlayerAction = (action: "hit" | "stand" | "double" | "split") => {
    if (isProcessingAction) return;
    if (action === "hit") hit();
    if (action === "stand") stand();
    if (action === "double") double();
    if (action === "split") split();
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
  // slot should still be occupying the row (see canSwap below). Includes isProcessingAction so
  // a mid-hit/stand request doesn't let a Swap tap land mid-race — handleSwap checks this
  // directly, it's not what the button's own grey-out below follows (see swapVisuallyDisabled).
  const swapClickable = swapEligible && !hasSwapped && !isSwapping && !isProcessingAction;
  // What the Swap button actually shows as disabled — deliberately NOT swapClickable itself.
  // isProcessingAction is real but brief (one Hit/Stand/Double round trip), and greying every
  // button in the row for that instant, then un-greying them a beat later, read as a "wink"
  // every single tap — even though the hand was never actually unplayable (Anatole, 2026-09-12:
  // "je veux qu'ils s'assombrissent que quand on ne peut plus jouer"). A stray tap during that
  // brief window still lands as a harmless no-op via swapClickable inside handleSwap, same as
  // Hit/Stand/Double/Split already are via handlePlayerAction's own isProcessingAction check.
  const swapVisuallyDisabled = !swapEligible || hasSwapped || isSwapping;
  // Surrender is gone (see ActionBar's own comment) — Swap now permanently occupies that slot
  // in the row instead of only joining once eligible, same design language as Hit/Stand: always
  // present, just greyed out (via swapDisabled below) whenever a tap wouldn't do anything.
  const canSwap = true;
  const hasSwapTokens = (user?.swapTokens ?? 0) > 0;

  const handleSwap = async () => {
    if (!swapClickable || !gameId) return;
    setIsSwapping(true);
    setIsSwapFlipping(true);
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
      // Give the two starting cards time to actually finish turning face-down (card.tsx's
      // 0.5s flip plus HandCards' own per-card hideDelay stagger, see isSwapFlipping below)
      // before the new hand lands — landing it immediately would swap the faces mid-flip,
      // visible the instant the card is next edge-on.
      await new Promise((resolve) => setTimeout(resolve, 550));
      syncServerState(data);
      setHasSwapped(true);
      if (typeof data.swapTokens === "number") {
        useUserStore.getState().updateUser({ swapTokens: data.swapTokens });
      }
      // If the redeal landed a natural blackjack (settled right here, see POST /api/game/swap),
      // syncServerState above already holds its remainingCoins as pendingRemainingCoins instead
      // of applying it now — revealResultRef lands it in step with the result banner instead of
      // while the redealt cards are still mid-flip (see pendingRemainingCoins' own comment).
    } catch (e) {
      console.error("Failed to swap hand", e);
    } finally {
      setIsSwapping(false);
      setIsSwapFlipping(false);
    }
  };

  // Reveals the result sheet — called once the dealer's HandCards reports its whole hand has
  // actually finished animating (see onDealerHandSettled below), not after a fixed timeout.
  // A fixed delay doesn't scale with how many cards the dealer actually drew: it used to be
  // possible for the result ("You won"/"You lost") to show up while the dealer's own cards
  // were still mid-reveal, or even before a card that ends up busting them had appeared —
  // spoiling/contradicting what the player was still watching happen.
  const revealResultRef = useRef<() => void>(() => {});
  // Guards handleDismissResult below against firing twice for the same hand. It used to be
  // triggered by exactly one setTimeout (self-cancelling), so this couldn't happen — now that
  // it only ever fires from the player's own tap (see RoundResultBanner's dim layer), a fast
  // double-tap lands as two separate click events before React has re-rendered showResult to
  // false in between them, and without this both would run: a second flip-back cycle, and under
  // auto-bet, a second bet placed for one hand. Reset the instant a new hand's own result is
  // about to show, not sooner — there's nothing to guard against before that anyway.
  const dismissedRef = useRef(false);
  revealResultRef.current = () => {
    if (gameState !== "gameOver" || result === null || showResult) return;
    dismissedRef.current = false;
    const playerHandValue = playerHand.reduce((sum, c) => {
      if (c.value === "A") return sum + 11;
      if (["K", "Q", "J"].includes(c.value)) return sum + 10;
      return sum + parseInt(c.value);
    }, 0);
    const isBlackjack = playerHand.length === 2 && playerHandValue === 21;
    const type: GameResultType =
      result === "win" && isBlackjack ? "blackjack" : result === "win" ? "win" : result === "push" ? "tie" : "loss";

    setNetResultAmount(lastNetResult ?? 0);
    // Snapshot BEFORE applying pendingCoins below — see preRevealBalance's own comment for why
    // this, not balance - netResultAmount, is the header's correct animation start point.
    setPreRevealBalance(balance);
    // The header balance's own post-hand value — held back by syncServerState (see its own
    // comment) specifically so it wouldn't land here until this exact reveal. Applying it now,
    // synchronously, means it lands in the very same render as showResult flipping true, so
    // CountingBalance's from (preRevealBalance) -> to (balance, now already post-hand) actually
    // spans the real change instead of "to" already being stale.
    const pendingCoins = useGameStore.getState().pendingRemainingCoins;
    if (pendingCoins !== null) {
      useUserStore.getState().updateUser({ coins: pendingCoins });
      useGameStore.setState({ pendingRemainingCoins: null });
    }
    // Synced to this exact reveal moment, not to lastStreak's own (much earlier) update — see
    // displayedStreak's own comment above for why.
    setDisplayedStreak(lastStreak ?? 0);
    setStreakCelebrationBonus(lastStreakBonus ? lastStreakBonus : null);
    queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats/summary"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats/coins-history?range=24h"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats/coins-history?range=7d"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats/coins-history?range=30d"] });
    queryClient.invalidateQueries({ queryKey: ["/api/challenges/user"] });
    queryClient.invalidateQueries({ queryKey: ["/api/daily-streak"] });
    useUserStore.getState().loadUser();

    setDoubledTo(null);
    setIsDoubling(false);
    setResultType(type);
    setShowResult(true);
  };

  // A short, fixed beat AFTER the cards genuinely finish (not a substitute for waiting on
  // them) — just enough for the last card to visually settle before the sheet flies up.
  const handleDealerHandSettled = useCallback(() => {
    setTimeout(() => revealResultRef.current(), 400);
  }, []);

  const handleDismissResult = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setShowResult(false);
    // Flips the two starting cards of each hand back to their card-back face, in place — see
    // HandCards' forceHidden and card.tsx's hideDelay. Any card beyond those two (a hit) is
    // trimmed the same instant isRoundEnding flips (see the dealer/player HandCards below,
    // which slice dealerHand/playerHand down to 2 whenever isRoundEnding is true) — deliberately
    // BEFORE the flip, not after: trimming first, while cards.length is still >0 so HandCards'
    // row is still in its normal (not-placeholder) layout mode, lets the row's own `layout`
    // animation smoothly slide the two remaining cards into their now-centered spot at the same
    // time forceHidden turns them over — one continuous "slide while turning" motion instead of
    // the hand sitting there fully turned for a beat and only then snapping sideways once extra
    // cards disappeared. dealerHand/playerHand themselves are otherwise left alone here:
    // clearing them immediately would swap the real cards for the next hand's placeholders while
    // still mid-turn, and a data swap mid-rotation is visible as a flicker (a card's front face
    // is still partly on screen until it's rotated ~edge-on). Only once the flip is done (the
    // timeout below) is it safe to reset.
    setIsRoundEnding(true);

    // Always exactly 2 cards actually flip now (see the trim above — anything beyond that never
    // animates, it's just gone), so this no longer needs to scale with hand size: hideDelay
    // staggers 60ms per card index (see HandCards) and the flip itself takes 500ms, plus a
    // small buffer.
    const flipDurationMs = 60 + 500 + 100;

    setTimeout(() => {
      // resultType is deliberately NOT cleared here. GameResultOverlay bails out with
      // `if (!resultType) return null` before it ever reaches its own AnimatePresence — clearing
      // resultType in the same tick as show=false used to unmount that AnimatePresence outright,
      // skipping its slide-down/backdrop-fade exit animation entirely instead of playing it. That
      // let the sheet vanish in a single frame instead of actually sliding away — the "flash"
      // this fixes. Leaving resultType in place lets `show={false}` drive a real exit; it gets
      // overwritten with a fresh value next time revealResultRef.current() fires, so there's
      // nothing to reset it back to in the meantime.
      resetGame();
      setIsRoundEnding(false);
      // currentBet is left as-is on purpose — the wheel reopens pre-loaded with the same
      // amount so tapping BET again instantly rebets, per the "recommencer à l'infini" flow.
      // Auto-bet's actual trigger: fires the very next bet the instant the wheel would
      // otherwise just be sitting there waiting for a tap. handlePlaceBet's own guards
      // (balance, isPlacingBet) still apply, so running out of coins mid-streak just leaves the
      // wheel idle on the next tick rather than throwing — no stop-loss/stop-win by design.
      if (autoBetEnabled) handlePlaceBet(true);
    }, flipDurationMs);
  };

  // Read via .current in the two effects below rather than closed over directly, same reason as
  // revealResultRef above: handleDismissResult is a fresh closure every render, but each effect
  // only re-arms its own timer when its own narrow deps change, so a stale closure from whichever
  // render last (re)armed it would otherwise fire instead of the latest one.
  const handleDismissResultRef = useRef<() => void>(() => {});
  handleDismissResultRef.current = handleDismissResult;

  // EXPERIMENTAL, see RESULT_TO_STREAK_DELAY_MS's own comment above. autoBetEnabled-only
  // (Anatole, 2026-09-12): manual mode goes back to the streak bar's old home in the betting
  // slot instead (see isBetting's own render below), so this handoff — and the auto-dismiss
  // effect further down, once canOfferDouble exists — only matter, and only run, while auto-bet
  // is actually on. Resets the instant a new result starts showing, then runs the two-step
  // handoff (hide the banner, then — only once it's actually gone, see RESULT_EXIT_BUFFER_MS —
  // show the bar) partway through it. Neither timer is tied to isDoubling: the top slot's own
  // content swap has nothing to do with the button below.
  useEffect(() => {
    if (!showResult || !autoBetEnabled) {
      setHideResultBanner(false);
      setShowStreakInResultSlot(false);
      return;
    }
    const hideTimer = setTimeout(() => setHideResultBanner(true), RESULT_TO_STREAK_DELAY_MS);
    const showBarTimer = setTimeout(
      () => setShowStreakInResultSlot(true),
      RESULT_TO_STREAK_DELAY_MS + RESULT_EXIT_BUFFER_MS
    );
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(showBarTimer);
    };
  }, [showResult, autoBetEnabled]);

  // Folds in isAutoRebetting so the wheel/header betting text never mounts for an auto-fired
  // bet's own brief "betting" gameState window — see isAutoRebetting's own comment for why.
  const isBetting = gameState === "betting" && !isAutoRebetting;
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

  // Scales this hand's whole celebration (confetti, flying coins, balance count-up speed, win
  // sound) to how big netResultAmount is relative to THIS room's own maxBet, not a flat coin
  // amount — see getWinIntensity. Only meaningful on an actual win; loss/push ignore it (their
  // CoinBurst/ConfettiBurst never fire, and CountingBalance keeps its plain default there).
  const isWinResult = resultType === "win" || resultType === "blackjack";
  const winIntensity = getWinIntensity(netResultAmount, ROOM.maxBet);

  // Same eligibility rule GameResultOverlay's old pill used: a real win with something to
  // actually double, and a gameId to double it against (naturals settle immediately server-
  // side and always carry one, see /api/game/start).
  const canOfferDouble = !!gameId && isWinResult && netResultAmount > 0;
  // The Watch-to-2X button is actually showing (see its own block below).
  const showWatchToDouble = showResult && canOfferDouble;

  // EXPERIMENTAL, see AUTO_DISMISS_MS's own comment above — replaces the old requirement to tap
  // the result away by hand, but only in auto-bet: manual mode keeps that tap (Anatole,
  // 2026-09-12 — the point of auto-bet is not touching the screen between hands at all, but a
  // manual player still wants to read the result on their own time). canOfferDouble picks
  // between the full delay (a real win, worth waiting out) and the quick one (see
  // AUTO_DISMISS_QUICK_MS — a loss/push has nothing left to wait for). Deliberately gated on
  // !isDoubling rather than just skipping the dismiss once while it's true: an in-flight ad/
  // claim (handleWatchAdToDouble) can run well past this delay, and a one-shot timer that
  // fired-and-skipped during it would never come back to actually dismiss the result once the
  // claim lands. Re-arming fresh from the moment isDoubling flips back to false instead means a
  // claim always gets its own full look at the doubled result before this fires, whether that
  // claim took one second or ten.
  useEffect(() => {
    if (!showResult || !autoBetEnabled || isDoubling) return;
    const delay = canOfferDouble ? AUTO_DISMISS_MS : AUTO_DISMISS_QUICK_MS;
    const timer = setTimeout(() => handleDismissResultRef.current(), delay);
    return () => clearTimeout(timer);
  }, [showResult, autoBetEnabled, isDoubling, canOfferDouble]);

  const { data: doubleRewardStatus, refetch: refetchDoubleRewardStatus } = useQuery({
    queryKey: ["/api/game/double-reward/status"],
    queryFn: () => gameService.getDoubleRewardStatus(),
    enabled: showWatchToDouble,
  });
  const watchedToday = doubleRewardStatus?.watchedToday ?? 0;
  const dailyLimit = doubleRewardStatus?.limit ?? 3;
  const dailyLimitReached = watchedToday >= dailyLimit;

  const handleWatchAdToDouble = async () => {
    if (!gameId || isDoubling || doubledTo !== null || dailyLimitReached) return;
    setIsDoubling(true);
    try {
      const earned = await showRewardedAd();
      if (!earned) return;
      const { newNetResult } = await gameService.doubleReward(gameId);
      setDoubledTo(newNetResult);
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/weekly-xp"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/weekly-xp/me"] });
      refetchDoubleRewardStatus();
      useUserStore.getState().loadUser();
    } catch (error) {
      console.error("Failed to double reward:", error);
    } finally {
      setIsDoubling(false);
    }
  };

  return (
    // Fills whatever fixed-position, full-screen container the caller wraps this in (Home's
    // overlay, or the .fixed-safe-screen div App.tsx puts around the standalone route) —
    // doesn't own that positioning itself, since Home's version needs the *outer* element to
    // be what slides, with this content just filling it. overflow-hidden still matters here:
    // same rubber-band-bounce-on-iOS fix as the rest of the app's tables (see "Fix game table
    // layout: pin the page, add safe-area clearance") — a scrollable full-height block can
    // still bounce even inside a non-scrolling ancestor.
    <div ref={tableRootRef} className="relative h-full w-full bg-black text-white overflow-hidden">
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
          <div className="relative">
            <button
              onClick={handleLeaveTable}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-transparent border-none cursor-pointer text-white/60 hover:text-white transition-colors"
              style={{ background: "transparent", border: "none", padding: 0 }}
              data-testid="button-leave-table"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            {/* Sits below the back arrow (absolute, out of flow, so it never grows the header
                row's own height) — the single control for auto-bet, replacing the standalone
                switch that used to sit in the bet wheel itself (see the wheel's own comment on
                why that row is gone). Always here, on the bet screen and mid-hand alike: a tap
                flips autoBetEnabled either way — off shows the loop glyph ("start it"), on
                swaps to pause ("stop it") and lands back on the bet screen at the end of
                whichever hand is currently in flight, never interrupting one mid-hand. */}
            <button
              onClick={() => setAutoBetEnabled((v) => !v)}
              className="absolute top-full left-0 mt-0.5 flex items-center justify-center w-9 h-9 rounded-full bg-transparent border-none cursor-pointer transition-colors"
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                color: autoBetEnabled ? "#3b82f6" : "#ffffff",
              }}
              aria-label={autoBetEnabled ? t("pauseAutoBet") : t("autoBet")}
              data-testid="button-toggle-autobet"
            >
              {autoBetEnabled ? <Pause className="w-4 h-4" /> : <Loop className="w-4 h-4" />}
            </button>
          </div>
          {/* Replaces the old "Dealer" title + top-hat glyph — the balance is what the player
              actually tracks hand to hand now (see the brief this came from). Same font-light/
              tracking-tight treatment as the balance on Home (see CoinsHero), just at header
              scale — no coin glyph, plain number. Stays plain white between hands; only the
              result banner's own sequence (see RoundResultBanner) drives the green/red
              count-up, right when a hand settles. */}
          <div className="absolute left-1/2 -translate-x-1/2 text-lg font-light tracking-tight">
            <span
              ref={balanceRef}
              className="tabular-nums transition-colors duration-300"
              style={{
                color: !showResult ? "#ffffff" : netResultAmount > 0 ? "#34d399" : netResultAmount < 0 ? "#f87171" : "#ffffff",
              }}
              data-testid="text-header-balance"
            >
              <CountingBalance
                from={showResult ? preRevealBalance : balance}
                to={balance}
                active={showResult}
                duration={isWinResult ? winIntensity.countDuration : undefined}
                impactCount={isWinResult ? winIntensity.coinCount : undefined}
                showSign={false}
              />
            </span>
          </div>
          {/* h-10 + relative, children absolute: same fix as the wheel/ActionBar box below (see
              its comment) — fadeMode "sync" keeps "header-betting" and "header-hand" mounted
              together for the crossfade, and without taking them out of flow this box grew to
              fit both stacked at once. That growth landed here, in the same flex row as the
              balance display above — which has no top/bottom set, so its vertical position is
              the *static* one the browser computes from surrounding flow, not fixed by the
              flex row's align-items. So the extra height silently pushed that display (and
              everything below it: dealer card, player area) down for the ~150ms crossfade,
              then snapped back up the instant the old header text unmounted.

              w-20 is load-bearing too, for the same reason h-10 is: the crossfading text is
              `absolute inset-0` (out of flow) so this box has no in-flow content left to size
              itself from — as a flex item with only ml-auto/text-right and no explicit width,
              it collapsed to 0 width, clipping "Garage"/"1–500" and, once a hand starts, "Bet"/
              the player's actual wager entirely invisible despite both being in the DOM. */}
          <div className="ml-auto text-right overflow-hidden relative h-10 w-20">
            <AnimatePresence mode={fadeMode} initial={false}>
              <motion.div
                key={isBetting ? "header-betting" : "header-hand"}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.2 } }}
                exit={{ opacity: 0, y: 4, transition: { duration: 0.15 } }}
                className="absolute inset-0 flex flex-col items-end justify-center"
              >
                <p className="text-white/50 text-xs">{isBetting ? ROOM.name : t("betLabel")}</p>
                <p className="text-white font-semibold text-base">
                  {isBetting ? `${ROOM.minBet}–${ROOM.maxBet}` : formatFullNumber(bet)}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Dealer */}
        <div className="flex justify-center">
          {/* Never remounted (no key, no wrapping AnimatePresence) — this stays the SAME
              HandCards instance for the whole app session, not just one round. Placing a bet
              just feeds it new cards/faceDownIndices props; each PlayingCard flips in place
              (placeholderCount, see HandCards) with no unmount and so no gap for the table to
              darken through. Round end is the same story in reverse: forceHidden flips the
              starting two cards back to their card-back face in place (see handleDismissResult),
              and only once that's finished does dealerHand actually clear back to placeholders —
              by then everything's already showing its back, so the data swap is invisible.

              The slice(0, 2) is what actually drops any card beyond the starting two (a hit) —
              done here, not by waiting for dealerHand itself to shrink later, so it happens in
              the same instant forceHidden turns the remaining two, letting HandCards' own row
              recenter (still its normal layout mode — cards.length is still >0 here, so it's
              never in placeholder mode) as a smooth slide instead of a later abrupt snap. */}
          <HandCards
            cards={isRoundEnding ? dealerHand.slice(0, 2) : dealerHand}
            faceDownIndices={isPlaying ? [1] : []}
            forceHidden={isRoundEnding}
            variant="dealer"
            cardBackUrl={cardBackUrl}
            showPositionedTotal
            total={dealerTotal}
            onDealerHandSettled={handleDealerHandSettled}
            skipInitialFall
            placeholderCount={2}
          />
        </div>

        {/* Sits here — in normal flow, right after the dealer's own total — rather than
            centered over the whole screen (which used to land it squarely on top of the
            player's now-bigger cards, unreadable). This is the one stretch of the header/
            dealer column that's otherwise always empty: the player's cards live in their own
            separately bottom-pinned block below (see its own comment), so nothing here ever
            pushes against them regardless of hand size.

            pt-20 clears the dealer's own total number, which HandCards renders via
            `-bottom-10` (40px) below the card row's own flow-bottom edge plus the total text's
            own ~28-32px height — that overflow doesn't count toward this column's layout
            height (it's position:absolute), so without this the banner would render right on
            top of "18"/"2" etc. instead of below it.

            Same centered slot for every result (win/blackjack/tie/loss) — centered within this
            fixed min-h box, i.e. between the dealer's total above and the player's own cards
            below (Anatole, 2026-09-11: a win's amount+XP used to top-anchor and grow downward
            instead, which read as off-center once the XP row appeared under it — see
            RoundResultBanner's own comment on why that row no longer needs its own separate
            anchor point).

            During betting (isBetting true) RoundResultBanner itself renders nothing (show is
            false) — this slot shows the win streak bar instead then, in manual mode (see the
            isBetting render below).

            EXPERIMENTAL, auto-bet only (Anatole, 2026-09-12): partway through a result's
            display, this slot swaps over to the win streak bar in RoundResultBanner's place —
            see hideResultBanner/showStreakInResultSlot's own comments above for why those are
            two separate, staggered timers rather than one, and RESULT_EXIT_BUFFER_MS for why:
            the two never actually overlap in the DOM, so this box never has to shrink back down
            right after the bar arrives. */}
        <div
          ref={resultRef}
          className="pt-20 min-h-[140px] flex flex-col items-center justify-center"
        >
          <RoundResultBanner
            show={showResult && !hideResultBanner}
            resultType={resultType}
            netResultAmount={netResultAmount}
            doubledTo={doubledTo}
            isDoubling={isDoubling}
            maxBet={ROOM.maxBet}
            onDismiss={handleDismissResult}
          />
          <AnimatePresence>
            {showResult && showStreakInResultSlot && (displayedStreak > 0 || streakCelebrationBonus != null) && (
              <motion.div
                key="streak-handoff"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.4, ease: "easeOut" } }}
                exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeIn" } }}
              >
                <WinStreakBar
                  streak={displayedStreak}
                  celebrationBonus={streakCelebrationBonus}
                  onCelebrationDone={() => setStreakCelebrationBonus(null)}
                />
              </motion.div>
            )}
          </AnimatePresence>
          {/* Manual mode's own spot for this same bar (Anatole, 2026-09-12) — its original
              home, before the auto-bet-only handoff above existed. isBetting is essentially
              never true during auto-bet (see isAutoRebetting), so in practice this and the
              handoff above don't compete for the same moment. */}
          {isBetting && (displayedStreak > 0 || streakCelebrationBonus != null) && (
            <WinStreakBar
              streak={displayedStreak}
              celebrationBonus={streakCelebrationBonus}
              onCelebrationDone={() => setStreakCelebrationBonus(null)}
            />
          )}
        </div>
      </div>

      {/* Player's cards + controls, pinned to the real bottom edge of the device. Plain 20px,
          not max(env(safe-area-inset-bottom), 20px): this div's containing block is the .fixed-
          safe-screen wrapper both mount paths use (home.tsx's overlay and App.tsx's direct-link
          route), which already subtracts env(safe-area-inset-bottom) via its own padding-bottom
          — bottom-0 here already lands right at that inset's edge, so adding the inset again on
          top of the 20px floor double-counted it and pushed the buttons noticeably higher than
          the true safe edge on any device with a home indicator. */}
      <div
        className="absolute bottom-0 left-0 right-0 max-w-md mx-auto px-5 flex flex-col items-center gap-4"
        style={{ paddingBottom: "20px" }}
      >
        {/* w-full is load-bearing for the split view specifically: its side hand pins itself to
            "right-0" of ITS OWN width, but a flex child inside an "items-center" ancestor (the
            parent below) shrinks to its content's width by default — without this, the whole
            component collapsed to roughly the width of the centered hand alone, so "right-0"
            landed right next to it instead of at the real screen edge. */}
        <div className="w-full flex justify-center">
          {/* Keyed by isSplit, not by round: the plain HandCards branch below gets the same
              never-remounted treatment as the dealer block above (see its comment) for every
              normal round, split or not — isSplit itself doesn't change at round end, so this
              AnimatePresence swap only actually plays for the specific case a split hand's own
              two SplitHandsCenterSide <-> HandCards transition, not the common one. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={revealSplit ? "split" : "single"}
              className="w-full flex justify-center"
              // w-full here carries the real screen width down to SplitHandsCenterSide (see the
              // "w-full is load-bearing" comment on this block's own parent) — this wrapper sits
              // between that parent and SplitHandsCenterSide, and without its own w-full it
              // shrinks to content width like any other flex child, so SplitHandsCenterSide's
              // waiting-hand "right-0"/"left-0" pin resolved against that collapsed width instead
              // of the true screen edge and landed right on top of the active hand.
              //
              // No fade for the single->split direction specifically (revealSplit true): the
              // pair's two cards now carry a matching layoutId straight into
              // SplitHandsCenterSide's own first-card slots (cardLayoutIdPrefix below / that
              // component's firstCardLayoutId), so they glide there via a shared-layout FLIP
              // instead — a fade on top of that just dimmed a move that was already reading fine
              // on its own. `key` here is 1:1 with `revealSplit` (see the branch below), so
              // whichever instance is *entering* when revealSplit is true is always this
              // direction, never the reverse — the opposite direction (closing a split hand back
              // to a fresh single one at the next round) has no such shared cards to hand off, so
              // it keeps the plain fade.
              initial={revealSplit ? false : { opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.2, ease: "easeOut" } }}
              exit={revealSplit ? { opacity: 0, transition: { duration: 0.15, ease: "easeIn" } } : undefined}
            >
              {revealSplit ? (
                <SplitHandsCenterSide
                  splitHands={splitHands}
                  currentSplitHand={displayedSplitHand}
                  cardBackUrl={cardBackUrl}
                />
              ) : (
                <HandCards
                  cards={
                    isSplit
                      ? preSplitHandRef.current
                      : isRoundEnding
                        ? playerHand.slice(0, 2)
                        : playerHand
                  }
                  variant="player"
                  total={playerTotal}
                  forceHidden={isRoundEnding || isSwapFlipping}
                  cardBackUrl={cardBackUrl}
                  showPositionedTotal
                  skipInitialFall
                  placeholderCount={2}
                  cardLayoutIdPrefix="split-card"
                  splitting={isSplit}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* A fixed height per state (bet wheel vs. everything else), not a single constant for
            both any more — the bet wheel's own natural content (label + amount + 48px slider +
            button) runs to ~172px, but the ActionBar grid underneath it the rest of a hand's
            duration only needs ~112px, and keeping the taller 172 permanently left a large dead
            gap below the actual buttons — and below them, the player's cards too, since this
            whole block sits above nothing (it's the last child in a bottom-anchored flex column)
            and had that much more total height to sit on top of (Anatole, 2026-09-11: "tout est
            trop haut, il y a trop d'espace vide en bas").

            The two heights still don't just snap between each other though — that's what used to
            cause the exact bug this box's fixed height originally fixed (see git blame): a
            min-height box growing/shrinking the instant the wheel mounted/unmounted shoved the
            cards above it a visible beat late instead of them already sitting where they land.
            The CSS height transition below covers the same ground more cheaply: the box still
            only ever has one of two heights, but now animates between them instead of snapping,
            so the one moment they actually differ (BET tapped, wheel and ActionBar briefly
            dual-mounted mid-crossfade) reads as one deliberate resize instead of a pop. */}
        <div
          className="w-full flex flex-col justify-center relative transition-[height] duration-300 ease-out"
          style={{ height: isBetting ? 172 : 128 }}
        >
          {/* Sequential fade, same reasoning as the header block above (see there and
              isRoundStart's own comment) — this bit of UI (the wheel vs. ActionBar) uses the
              same isBetting/fadeMode crossfade for the round-START direction (BET tapped).

              Round END is deliberately NOT part of that crossfade. isBetting only flips back to
              true once handleDismissResult's timeout actually calls resetGame() — i.e. once the
              dealer/player cards have finished flipping to their backs (see isRoundEnding) — so
              this box shows nothing at all (the `null` branch below) for that whole stretch,
              but ONLY when the hand that just ended offered Watch-to-2X (canOfferDouble): that
              case was showing the watch2x button right up to the moment of dismissal, so
              jumping straight to the disabled ActionBar while the cards are still mid-flip would
              flash a control in that was never there a moment ago. A hand with nothing to watch
              (loss/push) was already showing this exact same disabled ActionBar the whole time
              the result sat on screen (see the `showWatchToDouble ? ... : actions` branch
              below) — forcing it through `null` and back for isRoundEnding there was a pure
              unmount/remount for no visual reason, which is what read as the buttons vanishing
              then popping back in dark, instead of just staying put and lighting up once the
              deal lands (Anatole, 2026-09-12: "je veux pas qu'ils disparaissent puis
              réapparaissent, juste qu'ils passent du mode sombre au mode normal").

              fadeMode "sync" (round start only) keeps the wheel and ActionBar mounted at the
              same time for the ~200ms crossfade, which is the point — but neither motion.div was
              taken out of normal flow, so for that whole window this flex column held BOTH of
              them stacked (the BET/DEALING button plus the full Hit/Stand/Double/Swap grid
              beneath it, overflowing past the fixed box), then snapped up to just
              the ActionBar the instant the wheel's exit finished — visible as the button bar
              lurching down then jumping back up right when BET is tapped. Taking both children
              out of flow (absolute inset-0, each doing its own vertical centering) makes them
              overlap in place instead of stacking, so the box's height truly never changes
              during the crossfade. */}
          <AnimatePresence mode={fadeMode} initial={false}>
            {isBetting ? (
              <motion.div
                key="wheel"
                // The one entrance this ever plays: round end, once the cards are done flipping
                // and the result sheet is long gone. Rises up from just below its resting spot
                // instead of a flat opacity-only fade, so it reads as the wheel arriving from
                // underneath rather than materializing in place — matching the cards' own
                // "things turn/move deliberately" language instead of a plain crossfade.
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } }}
                exit={{ opacity: 0, transition: { duration: 0.15, ease: "easeIn" } }}
                className="absolute inset-0 flex flex-col"
              >
                {/* flex-1 (not part of the space-y-2 stack below): centers the "YOUR BET" text
                    in whatever room is actually left above the slider, instead of the old
                    single justify-center on the whole column — that centered the text+slider+
                    button as one group in the 172px box, which piled ALL of the fixed box's
                    slack above the text (since the text/slider/button stack is much shorter
                    than 172px) and left it sitting almost flush against the slider below, far
                    from the cards above. This keeps the same true center point regardless of
                    exact text/slider/button heights. */}
                <div className="flex-1 flex items-center justify-center">
                  {!outOfCoins && (
                    <div className="text-center">
                      <p className="text-xs text-white/50 uppercase tracking-wide mb-0.5">{t("yourBet")}</p>
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
                  )}
                </div>
                {/* space-y-2 moved down onto just this pair (was on the whole flex column
                    above) — the slider and its button still need that same fixed gap between
                    them, now that the text block above claims its own flex-1 area instead of
                    sharing this stack. */}
                <div className="space-y-2">
                  <BetSlider
                    min={ROOM.minBet}
                    max={dynamicMax}
                    value={currentBet}
                    onChange={handleBetSliderChange}
                    disabled={isPlacingBet || outOfCoins}
                    dataTestId="bet-slider"
                  />
                  {outOfCoins ? (
                    <motion.button
                      onClick={() => {
                        // Same close-before-navigate as every other exit from this overlay (see
                        // handleClose's own callers) -- Home's useBodyScrollLock stays keyed on
                        // showClassic staying true, so skipping this left the body permanently
                        // pinned (position: fixed) on whatever screen came next, unrecoverable
                        // short of restarting the app (Anatole, 2026-09-03).
                        handleClose();
                        // Same reset() escape hatch as emotes.tsx/avatars.tsx's own "Go to Shop"
                        // buttons: this overlay's exit animation is still ~0.28s from finishing
                        // when we jump straight to Shop, and without this the bottom nav bar
                        // stayed missing on Shop until that (now invisible, behind Shop) animation
                        // wrapped up on its own -- read as the nav bar "popping in" a moment late.
                        useOverlayVisibilityStore.getState().reset();
                        navigate("/shop?section=coins");
                      }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-4 text-base font-bold rounded-xl bg-white text-[#15161A]"
                      data-testid="button-go-to-shop"
                    >
                      {t("goToShop").toUpperCase()}
                    </motion.button>
                  ) : (
                    <motion.button
                      // Not just {handlePlaceBet}: onClick would hand it the click event as its
                      // first arg, and handlePlaceBet now reads that same slot as isAuto — any
                      // truthy event object would flip isAutoRebetting on for a manual tap too.
                      onClick={() => handlePlaceBet()}
                      disabled={isPlacingBet || balance < currentBet}
                      whileTap={!isPlacingBet && balance >= currentBet ? { scale: 0.98 } : {}}
                      className="w-full py-4 text-base font-bold rounded-xl bg-white text-[#15161A] disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="button-place-bet"
                    >
                      {isPlacingBet ? t("dealing") : t("betCta", { amount: formatFullNumber(currentBet) })}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ) : isRoundEnding && canOfferDouble ? null : showWatchToDouble ? (
              // Replaces Hit/Stand/Double/Swap the instant a win is showing (same crossfade as
              // every other swap in this box — see fadeMode above) rather than leaving them
              // mounted-but-disabled underneath the result the way the old small pill in
              // RoundResultBanner did. Same shape/weight as the BET button above (and Home's
              // own "See full leaderboard" pill) so it reads as the one thing to tap next, not
              // just another disabled control sitting in the grid.
              <motion.div
                key="watch2x"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.2, ease: "easeOut" } }}
                exit={{ opacity: 0, transition: { duration: 0.15, ease: "easeIn" } }}
                // z-30: this box sits underneath RoundResultBanner's own full-screen "tap
                // anywhere to dismiss" layer (z-25, only actually mounted while showResult is
                // true — exactly the stretch this button exists for), which would otherwise
                // swallow every tap meant for it. Matches the z-index RoundResultBanner's own
                // content already uses to clear that same layer.
                className="absolute inset-0 z-30 flex flex-col justify-end"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWatchAdToDouble();
                  }}
                  disabled={isDoubling || doubledTo !== null || dailyLimitReached}
                  // h-14: the loading spinner is only 16px tall against the icon+text row's own
                  // ~24px, and py-4 alone sizes the button off whichever's actually rendered — so
                  // the button visibly shrank for the spinner's duration instead of staying put.
                  // Explicit height matches what py-4 (32px) + the icon+text row already summed
                  // to, so it's a no-op for that state and just locks the spinner state to match.
                  className="w-full h-14 text-base font-bold rounded-xl bg-white text-[#15161A] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  data-testid="button-watch-to-double"
                >
                  {isDoubling ? (
                    <span className="w-4 h-4 rounded-full border-2 border-[#15161A]/30 border-t-[#15161A] animate-spin" />
                  ) : doubledTo !== null ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {t("resultOverlay.doubled")}
                    </>
                  ) : (
                    <>
                      <WatchAdIcon size={18} strokeWidth={3} />
                      {t("resultOverlay.watchToDouble")}
                    </>
                  )}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.2, ease: "easeOut" } }}
                exit={{ opacity: 0, transition: { duration: 0.15, ease: "easeIn" } }}
                className="absolute inset-0 flex flex-col justify-end"
              >
                <ActionBar
                  animateEntrance={false}
                  // isProcessingAction deliberately does NOT gate any of these four — see
                  // swapVisuallyDisabled's own comment above for why. handlePlayerAction still
                  // checks it before actually firing hit/stand/double/split, so a tap during
                  // that brief window is a no-op, not a race — it just doesn't greyscale the
                  // whole row for it any more.
                  canHit={gameState === "playing" && !isSwitchingSplitHand}
                  canStand={gameState === "playing" && !isSwitchingSplitHand}
                  canDouble={gameState === "playing" && !isSwitchingSplitHand && !!canDouble && balance >= bet}
                  canSplit={gameState === "playing" && !isSwitchingSplitHand && !!canSplit && balance >= bet}
                  onHit={() => handlePlayerAction("hit")}
                  onStand={() => handlePlayerAction("stand")}
                  onDouble={() => handlePlayerAction("double")}
                  onSplit={() => handlePlayerAction("split")}
                  canSwap={canSwap}
                  swapDisabled={swapVisuallyDisabled}
                  onSwap={handleSwap}
                  swapViaAd={!hasSwapTokens}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ResultDimOverlay show={showResult} />

      {/* Only on an actual win — a loss/push just lets the header balance count down/hold with
          no fanfare (see the brief this came from). */}
      <CoinBurst
        active={showResult && isWinResult}
        sourceRef={resultRef}
        targetRef={balanceRef}
        containerRef={tableRootRef}
        count={winIntensity.coinCount}
      />

      {/* Same rising bottom sheet every other popup in the app uses (Daily Streak, Player
          Stats, Invite a friend, ...) instead of a centered modal — height="auto" since this
          content is short and fixed-size, same reasoning as Daily Streak's own sheet. */}
      <BottomSheet
        open={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        height="auto"
        contentClassName="px-6 pt-2 pb-8 flex flex-col items-center text-center"
      >
        <NoEntry size={56} />
        <h2 className="mt-3 text-xl font-bold text-white">{t("leaveTableTitle")}</h2>
        <p className="mt-2 text-white/70 text-sm mb-6">
          {t("leaveTableWarning", { amount: formatFullNumber(bet) })}
        </p>
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => forfeitMutation.mutate()}
            disabled={forfeitMutation.isPending}
            className="w-full h-11 rounded-[18px] bg-red-500 hover:bg-red-600 text-white font-bold disabled:opacity-50"
            data-testid="button-confirm-leave-table"
          >
            {forfeitMutation.isPending ? t("leaving") : t("leave")}
          </button>
          <button
            onClick={() => setShowLeaveConfirm(false)}
            disabled={forfeitMutation.isPending}
            className="w-full h-11 rounded-[18px] bg-[#232227]/40 hover:bg-[#232227]/60 text-white font-medium disabled:opacity-50"
            data-testid="button-cancel-leave-table"
          >
            {t("stay")}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
