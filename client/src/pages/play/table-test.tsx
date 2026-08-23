import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { gameService } from "@/services/gameService";
import { apiRequest } from "@/lib/queryClient";
import { useSelectedCardBack } from "@/hooks/use-selected-card-back";
import { BetSlider } from "@/components/BetSlider";
import PlayingCard from "@/components/game/card";
import HandCards from "@/components/game/play/HandCards";
import ActionBar from "@/components/game/play/ActionBar";
import SplitHandsDisplay from "@/components/game/play/SplitHandsDisplay";
import GameResultOverlay, { GameResultType } from "@/components/game/GameResultOverlay";
import AnimatedModal from "@/components/AnimatedModal";
import NoEntry from "@/icons/NoEntry";
import topHatImage from "@assets/top_hat_3d_1757354434573.png";

// Prototype room preset — the entry-level tier (lowest tapis, mise mini/maxi basse). Room
// names are meant to climb in glamour as the tapis mini goes up (Garage -> ... -> Vegas ->
// Paris -> Monaco), not stay "Las Vegas" at the very bottom rung. Only used here to test the
// flow, not wired to any real room system yet.
const ROOM = { name: "Garage", minBet: 1, maxBet: 500 };

// sm card width is 80px (see PlayingCard's sizeMap) — same overlap ratio as HandCards, so the
// fan looks identical whether the cards are still face-down placeholders or a real hand.
const PLACEHOLDER_CARD_WIDTH = 80;
const PLACEHOLDER_OVERLAP = PLACEHOLDER_CARD_WIDTH * 0.65 - PLACEHOLDER_CARD_WIDTH;

function PlaceholderPair({ cardBackUrl }: { cardBackUrl?: string | null }) {
  // Two face-down cards sitting on the table before any bet is placed — purely decorative,
  // gives the impression of an already-set table rather than a blank screen.
  return (
    <div className="flex items-center">
      <PlayingCard suit="spades" value="?" isHidden size="sm" cardBackUrl={cardBackUrl} />
      <div style={{ marginLeft: PLACEHOLDER_OVERLAP }}>
        <PlayingCard suit="spades" value="?" isHidden size="sm" cardBackUrl={cardBackUrl} />
      </div>
    </div>
  );
}

export default function TableTest() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { cardBackUrl } = useSelectedCardBack();

  const user = useUserStore((s) => s.user);
  const loadUserCoins = useUserStore((s) => s.loadUserCoins);
  const balance = user?.coins || 0;

  const {
    gameState, playerHand, dealerHand, playerTotal, dealerTotal, bet, result,
    canDouble, canSplit, canSurrender, isSplit, splitHands, currentSplitHand,
    isProcessingAction, lastNetResult,
    hit, stand, double, split, surrender, resetGame, setMode, syncServerState,
  } = useGameStore();

  const [currentBet, setCurrentBet] = useState(ROOM.minBet);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultType, setResultType] = useState<GameResultType>(null);
  // Snapshot the balance right before the bet is placed — the result sheet counts from this
  // fixed number rather than re-reading the store, which can already reflect the payout.
  const startingBalanceRef = useRef(balance);
  const [endingBalance, setEndingBalance] = useState(balance);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

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
      navigate("/");
    },
  });

  const handleLeaveTable = () => {
    if (gameState === "playing" || gameState === "dealerTurn") {
      setShowLeaveConfirm(true);
      return;
    }
    navigate("/");
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
        } else {
          resetGame();
        }
      })
      .catch(() => resetGame());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rounded down to the nearest 10 so it's never an odd ceiling like "247" the slider then
  // can't reach a round step of — the slider only ever lands on multiples of 10 (see
  // roundToTen below), so its usable max has to be a multiple of 10 too.
  const dynamicMax = Math.floor(Math.min(ROOM.maxBet, Math.max(ROOM.minBet, balance)) / 10) * 10 || ROOM.minBet;

  // Snaps every slider/drag position to a round number — no more landing on odd amounts like
  // 226. The very first step off the floor jumps straight to 1 (the room's actual minimum),
  // then every step after that is a multiple of 10 (10, 20, 30…).
  const handleBetSliderChange = (value: number) => {
    const rounded = value < 5 ? ROOM.minBet : Math.round(value / 10) * 10;
    setCurrentBet(Math.max(ROOM.minBet, Math.min(dynamicMax, rounded)));
  };

  const handlePlaceBet = async () => {
    if (isPlacingBet || currentBet <= 0 || balance < currentBet) return;
    setIsPlacingBet(true);
    startingBalanceRef.current = balance;
    try {
      const data = await gameService.startGame("classic", currentBet);
      syncServerState(data);
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

  // Reveal the result sheet a beat after the dealer's hand is fully shown.
  useEffect(() => {
    if (gameState === "gameOver" && result !== null && !showResult) {
      const t = setTimeout(() => {
        const playerHandValue = playerHand.reduce((sum, c) => {
          if (c.value === "A") return sum + 11;
          if (["K", "Q", "J"].includes(c.value)) return sum + 10;
          return sum + parseInt(c.value);
        }, 0);
        const isBlackjack = playerHand.length === 2 && playerHandValue === 21;
        const type: GameResultType =
          result === "win" && isBlackjack ? "blackjack" : result === "win" ? "win" : result === "push" ? "tie" : "loss";

        setEndingBalance(startingBalanceRef.current + (lastNetResult ?? 0));
        queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats/summary"] });
        queryClient.invalidateQueries({ queryKey: ["/api/challenges/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/daily-streak"] });
        useUserStore.getState().loadUser();

        setResultType(type);
        setShowResult(true);
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [gameState, result]);

  const handleDismissResult = () => {
    setShowResult(false);
    setResultType(null);
    resetGame();
    // currentBet is left as-is on purpose — the wheel reopens pre-loaded with the same
    // amount so tapping BET again instantly rebets, per the "recommencer à l'infini" flow.
  };

  const isBetting = gameState === "betting";
  const isPlaying = gameState === "playing" || gameState === "dealerTurn";

  return (
    // .fixed-safe-screen (position:fixed, inset:0, safe-area padding, overflow:hidden) instead
    // of a scrollable container — the same fix as the rest of the app's tables (see "Fix game
    // table layout: pin the page, add safe-area clearance"). A scrollable full-height page can
    // rubber-band bounce on iOS, and mid-bounce the WKWebView briefly shows a ghosted copy of
    // the system status bar at the bottom of the screen — that's the pixel artifact from
    // testing. Physically unscrollable removes the bounce entirely; the layout is tightened to
    // always fit within the viewport instead (see the centered cards+controls block below).
    <div className="fixed-safe-screen bg-black text-white">
      <div className="max-w-md mx-auto min-h-full flex flex-col px-6 pt-6 pb-8">
        {/* Header */}
        <div className="relative flex items-center mb-6 shrink-0">
          <button
            onClick={handleLeaveTable}
            className="flex items-center text-white/60 hover:text-white transition-colors"
            data-testid="button-leave-table"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-medium flex items-center gap-2">
            <img src={topHatImage} className="w-6 h-6 object-contain" alt="Dealer" />
            Dealer
          </h1>
          <div className="ml-auto text-right">
            <p className="text-white/60 text-xs">{isBetting ? ROOM.name : "Bet"}</p>
            <p className="text-[#F8CA5A] font-bold text-sm">
              {isBetting ? `${ROOM.minBet}–${ROOM.maxBet}` : bet.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Cards + controls travel together as one block — not cards pinned to the top and
            controls pinned to the bottom as separate flex children (that split let leftover
            viewport height open up as a dead gap between the player's cards and the button
            row). justify-start keeps the dealer's cards hugging the header, and since the
            button row is now part of this same flow instead of a sibling, it directly follows
            the player's cards too — any leftover space lands below the buttons instead. */}
        <div className="flex-1 flex flex-col justify-start min-h-0">
        {/* Dealer + player cards */}
        {/* gap-44 (176px) — the dealer/player total badges each float 64px outside their own
            hand (see HandCards' showPositionedTotal); 128px of gap put them edge-to-edge,
            so this adds real clearance between them. */}
        <div className="flex flex-col gap-44 px-4 pt-2 pb-4">
          <div className="flex justify-center">
            {isBetting ? (
              <PlaceholderPair cardBackUrl={cardBackUrl} />
            ) : (
              <HandCards
                cards={dealerHand}
                faceDownIndices={isPlaying ? [1] : []}
                variant="dealer"
                cardBackUrl={cardBackUrl}
                showPositionedTotal
                total={dealerTotal}
              />
            )}
          </div>

          <div className="flex justify-center">
            {isBetting ? (
              <PlaceholderPair cardBackUrl={cardBackUrl} />
            ) : isSplit ? (
              <SplitHandsDisplay
                originalCards={playerHand}
                splitHands={splitHands}
                currentSplitHand={currentSplitHand}
                showSplitAnimation={false}
                cardBackUrl={cardBackUrl}
              />
            ) : (
              <HandCards
                cards={playerHand}
                variant="player"
                total={playerTotal}
                cardBackUrl={cardBackUrl}
                showPositionedTotal
              />
            )}
          </div>
        </div>

        {/* Bottom control zone: bet wheel while betting, action bar while playing —
            cross-fades in place instead of navigating to a different screen. */}
        <div className="shrink-0 mt-4">
          <AnimatePresence mode="wait">
            {isBetting ? (
              <motion.div
                key="wheel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div className="text-center">
                  <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Your bet</p>
                  <motion.p
                    className="text-3xl font-light tracking-tight"
                    key={currentBet}
                    initial={{ scale: 0.92, opacity: 0.7 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    data-testid="text-current-bet"
                  >
                    {currentBet.toLocaleString()}
                  </motion.p>
                </div>
                <div className="px-4">
                  <BetSlider
                    min={ROOM.minBet}
                    max={dynamicMax}
                    value={currentBet}
                    onChange={handleBetSliderChange}
                    disabled={isPlacingBet}
                    dataTestId="bet-slider"
                  />
                </div>
                <div className="px-4">
                  <motion.button
                    onClick={handlePlaceBet}
                    disabled={isPlacingBet || balance < currentBet}
                    whileTap={!isPlacingBet && balance >= currentBet ? { scale: 0.98 } : {}}
                    className="w-full py-4 text-base font-bold rounded-xl bg-white text-[#15161A] disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="button-place-bet"
                  >
                    {isPlacingBet ? "DEALING..." : `BET ${currentBet.toLocaleString()}`}
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="actions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <ActionBar
                  canHit={gameState === "playing" && !isProcessingAction}
                  canStand={gameState === "playing" && !isProcessingAction}
                  canDouble={gameState === "playing" && !isProcessingAction && !!canDouble && balance >= bet}
                  canSplit={gameState === "playing" && !isProcessingAction && !!canSplit && balance >= bet}
                  canSurrender={gameState === "playing" && !isProcessingAction && !!canSurrender}
                  onHit={() => handlePlayerAction("hit")}
                  onStand={() => handlePlayerAction("stand")}
                  onDouble={() => handlePlayerAction("double")}
                  onSplit={() => handlePlayerAction("split")}
                  onSurrender={() => handlePlayerAction("surrender")}
                  playerCardCount={
                    isSplit
                      ? Math.max(playerHand.length, ...splitHands.map((h) => h.hand.length))
                      : playerHand.length
                  }
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>
      </div>

      <GameResultOverlay
        show={showResult}
        resultType={resultType}
        dealerTotal={dealerTotal}
        playerTotal={playerTotal}
        startingBalance={startingBalanceRef.current}
        endingBalance={endingBalance}
        onDismiss={handleDismissResult}
      />

      <AnimatedModal open={showLeaveConfirm} onClose={() => setShowLeaveConfirm(false)} className="w-full max-w-xs">
        <div className="bg-[#000000] border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center">
          <NoEntry size={56} />
          <h2 className="mt-3 text-xl font-bold text-white">Leave the table?</h2>
          <p className="mt-2 text-white/70 text-sm mb-6">
            You'll forfeit your {bet.toLocaleString()} coin bet. It won't be refunded.
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
