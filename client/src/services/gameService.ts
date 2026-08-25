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
     * How many of today's 3 "watch an ad to 2X" claims the player has used, and when the
     * count resets (midnight Paris time) once they've used all 3.
     */
    async getDoubleRewardStatus(): Promise<{ watchedToday: number; limit: number; resetAt: string | null }> {
        const response = await apiRequest("GET", "/api/game/double-reward/status");
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to fetch double-reward status");
        }
        return await response.json();
    },
};
