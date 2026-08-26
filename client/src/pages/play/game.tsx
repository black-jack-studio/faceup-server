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
  // The balance the player saw on the betting screen, right before this bet was placed —
  // passed through the URL so the result sheet has a fixed number to animate from,
  // instead of re-reading the (possibly already-updated) live store balance later.
  const [startingBalance, setStartingBalance] = useState(0);
  const [endingBalance, setEndingBalance] = useState(0);
  const queryClient = useQueryClient();

  const closeAnimation = () => {
    setShowResult(false);
    setResultType(null);
    resetGame();
    navigate(bettingPathFor(tableLayout));
  };
  const {
    setMode, resetGame, playerHand, result, playerTotal, dealerTotal,
    gameState, lastNetResult, gameId,
  } = useGameStore();

  // Extract bet amount and layout from the URL (set by navigateToGame before this page mounts)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const betAmount = urlParams.get('bet');
    const balanceParam = urlParams.get('balance');
    const layout = urlParams.get('layout') === 'friends' ? 'friends' : 'solo';

    setTableLayout(layout);

    if (betAmount) {
      const parsedBet = parseInt(betAmount);
      setBet(parsedBet);
      // Old/bookmarked links may be missing the balance param — fall back to the current
      // store balance plus the bet as a best-effort approximation of the pre-bet balance.
      setStartingBalance(
        balanceParam ? parseInt(balanceParam) : (useUserStore.getState().user?.coins ?? 0) + parsedBet
      );
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

        // The result sheet shows this hand's own net change (0 -> +200, 0 -> -1900, ...), not
        // the player's whole account balance — same as Classic's table-test.tsx and Play with
        // Friends. lastNetResult is the server's net result (payout minus TOTAL bet, which
        // correctly includes the extra stake a split deducts for the second hand).
        setEndingBalance(lastNetResult ?? 0);

        queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user/coins'] });
        queryClient.invalidateQueries({ queryKey: ['/api/stats/summary'] });
        // Profile's coins-history chart, one query per range — no shared prefix to fuzzy-match
        // since each range is its own literal URL string (see CoinsHistoryChart.tsx).
        queryClient.invalidateQueries({ queryKey: ['/api/stats/coins-history?range=24h'] });
        queryClient.invalidateQueries({ queryKey: ['/api/stats/coins-history?range=7d'] });
        queryClient.invalidateQueries({ queryKey: ['/api/stats/coins-history?range=30d'] });
        // The server already updates daily-challenge progress as part of settling the hand
        // (ChallengeService.updateChallengeProgress) — without this, the Challenges screen
        // kept showing stale progress until a full app reload re-fetched it from scratch.
        queryClient.invalidateQueries({ queryKey: ['/api/challenges/user'] });
        // Same idea for the daily streak: a Classic win may have just made a reward
        // claimable, and the flame/nav-bar notification dots read this same query.
        queryClient.invalidateQueries({ queryKey: ['/api/daily-streak'] });
        // The weekly leaderboard's own polling (10s) would eventually pick this hand up,
        // but invalidating now makes the player's own rank/coins update the moment their
        // hand settles instead of up to 10s later.
        queryClient.invalidateQueries({ queryKey: ['/api/leaderboard/weekly-xp'] });
        queryClient.invalidateQueries({ queryKey: ['/api/leaderboard/weekly-xp/me'] });
        // loadUser() (not loadUserCoins()) — hands award XP server-side too, and
        // loadUserCoins only ever re-fetched coins, never xp/currentLevelXP/level.
        // Those stayed stuck at their pre-hand values in the Zustand user store (what the
        // XP bar/ring actually read from) until a full app relaunch re-ran initializeAuth.
        useUserStore.getState().loadUser();

        setResultType(type);
        setShowResult(true);
      }, 2000); // 2 second delay to see dealer reveal cards

      return () => clearTimeout(delayTimer);
    }
  }, [gameState, result, showResult, playerHand, lastNetResult, queryClient]);

  if (bet === 0) {
    return null; // Wait for bet to be set
  }

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
        startingBalance={0}
        endingBalance={endingBalance}
        onDismiss={closeAnimation}
        gameId={gameId}
      />
    </div>
  );
}
