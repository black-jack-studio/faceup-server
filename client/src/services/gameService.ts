import { apiRequest } from "@/lib/queryClient";
import type { PlayerHand, GameAction, Card } from "@shared/blackjack-types";

export interface GameStateResponse {
    success: boolean;
    gameId: string | null;
    status: "in_progress" | "completed";
    mode: string;
    betAmount: number;
    playerHands: PlayerHand[];
    dealerHand: Card[];
    activeHandIndex: number;
    legalActions: GameAction[];
    result?: { payout: number; netResult: number };
    remainingCoins?: number;
    // Only present on the Swap response — the caller's fresh Swap-token balance after the
    // spend, so the UI can update it without a separate round trip.
    swapTokens?: number;
    // Classic solo only, and only while the first-decision/Swap-eligible window is still open
    // (see handStrength.ts) — this hand's simulated win probability, computed against the
    // real remaining deck. Drives whether Swap lights up.
    winProbability?: number;
}

export interface ActiveGameResponse {
    active: boolean;
    gameId?: string;
    status?: "in_progress" | "completed";
    mode?: string;
    betAmount?: number;
    playerHands?: PlayerHand[];
    dealerHand?: Card[];
    activeHandIndex?: number;
    legalActions?: GameAction[];
    winProbability?: number;
}

// Rank/XP/challenge-progress fingerprint for one moment in time — GameResultOverlay takes one
// of these right when a hand starts (before any settlement can have happened) and another once
// the result sheet is ready, then diffs the two to show what that specific hand earned. Fetched
// fresh from the server rather than through react-query's cache since the cache may be stale or
// simply never populated yet (e.g. landing straight on the game screen).
export interface HandRewardsSnapshot {
    xp: number;
    rank: number | null;
    completedChallengeIds: string[];
}

export const gameService = {
    /**
     * Starts a server-dealt game: debits the bet, shuffles and deals from a real deck.
     * @param mode Game mode ('classic')
     */
    async startGame(mode: string, amount: number): Promise<GameStateResponse> {
        const response = await apiRequest("POST", "/api/game/start", { mode, amount });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to start game");
        }
        return await response.json();
    },

    /**
     * Sends a player action (hit/stand/double/split/surrender) for an in-progress game.
     * The server re-validates the action against its own authoritative state.
     */
    async sendAction(gameId: string, action: GameAction): Promise<GameStateResponse> {
        const response = await apiRequest("POST", "/api/game/action", { gameId, action });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to process action");
        }
        return await response.json();
    },

    /**
     * Fetches the caller's in-progress game, if any (used to resume after a refresh/kill).
     */
    async getActiveGame(): Promise<ActiveGameResponse> {
        const response = await apiRequest("GET", "/api/game/active");
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to fetch active game");
        }
        return await response.json();
    },

    /**
     * Classic solo only — spends 1 Swap token to discard the current starting 2-card hand
     * and deal a fresh one from the same shoe. Only legal on the very first decision (see
     * POST /api/game/swap); the server re-validates all of that itself.
     * Pass viaAd once showRewardedAd() has resolved true — same trust model as doubleReward,
     * used when the player is out of Swap tokens instead of paying with one.
     */
    async swap(gameId: string, viaAd = false): Promise<GameStateResponse> {
        const response = await apiRequest("POST", "/api/game/swap", { gameId, viaAd });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to swap hand");
        }
        return await response.json();
    },

    /**
     * Claims the "watch an ad to double your win" offer on a completed hand's result sheet.
     * Only ever called after showRewardedAd() resolves true — the server still re-validates
     * the hand's own net result and that it hasn't already been doubled.
     */
    async doubleReward(gameId: string): Promise<{ success: true; newNetResult: number; remainingCoins: number; watchedToday: number; limit: number }> {
        const response = await apiRequest("POST", "/api/game/double-reward", { gameId });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to double reward");
        }
        return await response.json();
    },

    /**
     * Play with Friends' version of doubleReward — same offer, same shared daily counter,
     * claimed against a table seat's settled hand instead of a solo game.
     */
    async doubleTableReward(tableId: string): Promise<{ success: true; newNetResult: number; remainingCoins: number; watchedToday: number; limit: number }> {
        const response = await apiRequest("POST", `/api/tables/${tableId}/double-reward`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to double reward");
        }
        return await response.json();
    },

    /**
     * Play with Friends' version of swap — same 1-per-hand, first-decision-only rules as
     * Classic solo's swap() above, spent against a table seat's hand instead of a solo game.
     * Only legal on my own turn (see POST /api/tables/:id/swap); the server re-validates
     * everything itself. Pass viaAd once showRewardedAd() has resolved true, same trust model.
     */
    async tableSwap(tableId: string, viaAd = false): Promise<{ success: true; settled: boolean; swapTokens: number }> {
        const response = await apiRequest("POST", `/api/tables/${tableId}/swap`, { viaAd });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to swap hand");
        }
        return await response.json();
    },

    /**
     * How many of today's 3 "watch an ad to 2X" claims the player has used, and when the
     * count resets (midnight Paris time) once they've used all 3. Shared across every mode
     * (Classic solo, Play with Friends) — this is a single per-account daily counter.
     */
    async getDoubleRewardStatus(): Promise<{ watchedToday: number; limit: number; resetAt: string | null }> {
        const response = await apiRequest("GET", "/api/game/double-reward/status");
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to fetch double-reward status");
        }
        return await response.json();
    },

    /**
     * Snapshot of the caller's total XP, weekly leaderboard rank, and completed-challenge ids
     * right now. See HandRewardsSnapshot — a request failing here just yields a neutral value
     * (0 XP / no rank / no challenges) rather than throwing, since this is only ever used to
     * compute a "what changed this hand" diff and shouldn't be able to break the result sheet.
     */
    async getHandRewardsSnapshot(): Promise<HandRewardsSnapshot> {
        const [profileRes, rankRes, challengesRes] = await Promise.all([
            apiRequest("GET", "/api/user/profile").catch(() => null),
            apiRequest("GET", "/api/leaderboard/weekly-xp/me").catch(() => null),
            apiRequest("GET", "/api/challenges/user").catch(() => null),
        ]);
        const profile = profileRes?.ok ? await profileRes.json() : null;
        const rankStatus = rankRes?.ok ? await rankRes.json() : null;
        const challenges = challengesRes?.ok ? await challengesRes.json() : [];

        return {
            xp: profile?.xp ?? 0,
            rank: typeof rankStatus?.rank === "number" ? rankStatus.rank : null,
            completedChallengeIds: Array.isArray(challenges)
                ? challenges.filter((c: any) => c.isCompleted).map((c: any) => c.id)
                : [],
        };
    },
};
