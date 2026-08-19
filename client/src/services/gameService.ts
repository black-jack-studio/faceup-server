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
    remainingTickets?: number;
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
     * @param mode Game mode ('classic', 'all-in')
     * @param amount Bet amount (ignored for all-in, which bets every coin)
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
};
