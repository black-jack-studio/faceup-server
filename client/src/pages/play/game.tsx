import { useEffect, useState } from "react";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { gameService } from "@/services/gameService";
import BlackjackTable from "@/components/game/blackjack-table";
import GameResultOverlay from "@/components/game/GameResultOverlay";

// Where to bounce back to place a new bet — the "friends" table layout still runs on the
// classic engine under the hood, but its betting screen lives at its own route.
function bettingPathFor(layout: "solo" | "friends") {
  return layout === "friends" ? "/play/friends" : "/play/classic";
}

export default function GameMode() {
  const [, navigate] = useLocation();
  const [bet, setBet] = useState(0);
  const [tableLayout, setTableLayout] = useState<"solo" | "friends">("solo");
  const [showResult, setShowResult] = useState(false);
  const [resultType, setResultType] = useState<"win" | "loss" | "tie" | "blackjack" | null>(null);
  const [finalWinnings, setFinalWinnings] = useState(0);
  const queryClient = useQueryClient();

  const closeAnimation = () => {
    setShowResult(false);
    setResultType(null);
    resetGame();
    navigate(bettingPathFor(tableLayout));
  };
  const {
    setMode, resetGame, playerHand, result, playerTotal, dealerTotal,
    gameState, lastPayout,
  } = useGameStore();
  const currentBet = useGameStore((state) => state.bet); // ✅ Reactive selector for bet

  // Extract bet amount and layout from the URL (set by navigateToGame before this page mounts)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const betAmount = urlParams.get('bet');
    const layout = urlParams.get('layout') === 'friends' ? 'friends' : 'solo';

    setTableLayout(layout);

    if (betAmount) {
      setBet(parseInt(betAmount));
    } else {
      // If no bet, return to the right page according to layout
      navigate(bettingPathFor(layout));
    }
  }, [navigate]);

  // The betting page already dealt the game server-side and synced the store before
  // navigating here. If the store looks empty (e.g. the page was refreshed and the
  // in-memory Zustand state was lost), resume the authoritative in-progress game instead
  // of ever dealing anything locally — cash games are never dealt on this page.
  useEffect(() => {
    if (bet <= 0) return;

    const store = useGameStore.getState();
    const alreadySynced = store.gameId !== null || store.gameState === 'gameOver' || store.playerHand.length > 0;
    setMode("classic");

    if (alreadySynced) return;

    gameService.getActiveGame().then((active) => {
      if (active.active && active.gameId) {
        useGameStore.getState().syncServerState({
          success: true,
          gameId: active.gameId,
          status: active.status || "in_progress",
          mode: active.mode || "classic",
          betAmount: active.betAmount ?? bet,
          playerHands: active.playerHands || [],
          dealerHand: active.dealerHand || [],
          activeHandIndex: active.activeHandIndex || 0,
          legalActions: active.legalActions || [],
        });
      } else {
        // Nothing in progress and nothing already synced — bounce back to place a bet.
        navigate(bettingPathFor(tableLayout));
      }
    }).catch(() => {
      navigate(bettingPathFor(tableLayout));
    });
  }, [bet, tableLayout, setMode, navigate]);

  // Display the result animation once the server has settled the hand. The server already
  // credited the payout (see game-store's syncServerState) — this just reflects it visually.
  useEffect(() => {
    if (gameState === "gameOver" && result !== null && !showResult) {
      const delayTimer = setTimeout(() => {
        const playerHandValue = playerHand.reduce((sum, card) => {
          if (card.value === 'A') return sum + 11;
          if (['K', 'Q', 'J'].includes(card.value)) return sum + 10;
          return sum + parseInt(card.value);
        }, 0);
        const isPlayerBlackjack = playerHand.length === 2 && playerHandValue === 21;

        const type = result === "win" && isPlayerBlackjack ? "blackjack" : result === "win" ? "win" : result === "push" ? "tie" : "loss";

        queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user/coins'] });
        queryClient.invalidateQueries({ queryKey: ['/api/stats/summary'] });
        // The server already updates daily-challenge progress as part of settling the hand
        // (ChallengeService.updateChallengeProgress) — without this, the Challenges screen
        // kept showing stale progress until a full app reload re-fetched it from scratch.
        queryClient.invalidateQueries({ queryKey: ['/api/challenges/user'] });
        // Same idea for the daily streak: a Classic win may have just made a reward
        // claimable, and the flame/nav-bar notification dots read this same query.
        queryClient.invalidateQueries({ queryKey: ['/api/daily-streak'] });
        // loadUser() (not loadUserCoins()) — hands award XP server-side too, and
        // loadUserCoins only ever re-fetched coins/bolts, never xp/currentLevelXP/level.
        // Those stayed stuck at their pre-hand values in the Zustand user store (what the
        // XP bar/ring actually read from) until a full app relaunch re-ran initializeAuth.
        useUserStore.getState().loadUser();

        setResultType(type);
        setFinalWinnings(lastPayout ?? 0);
        setShowResult(true);
      }, 2000); // 2 second delay to see dealer reveal cards

      return () => clearTimeout(delayTimer);
    }
  }, [gameState, result, showResult, playerHand, lastPayout, queryClient]);

  if (bet === 0) {
    return null; // Wait for bet to be set
  }

  // A loss isn't always the full bet — surrendering gets half the bet back as a payout, so
  // what's actually lost is bet minus whatever was paid out. A push just returns the bet.
  const resultAmount =
    resultType === "win" || resultType === "blackjack"
      ? finalWinnings
      : resultType === "tie"
        ? currentBet
        : currentBet - (lastPayout ?? 0);

  return (
    <div className="relative">
      <BlackjackTable
        gameMode="cash"
        layout={tableLayout}
      />
      <GameResultOverlay
        show={showResult}
        resultType={resultType}
        dealerTotal={dealerTotal}
        playerTotal={playerTotal}
        amount={resultAmount}
        onDismiss={closeAnimation}
      />
    </div>
  );
}
