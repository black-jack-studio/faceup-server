import { apiRequest } from "@/lib/queryClient";

export interface StartGameResponse {
    success: boolean;
    gameId: string;
    snapshotAmount: number;
}

export interface ResolveGameResponse {
    success: boolean;
    payout: number;
    netResult: number;
}

export const gameService = {
    /**
     * Starts a game by debiting the user immediately.
     * @param mode Game mode ('classic', 'all-in', 'streak')
     * @param amount Bet amount (ignored for all-in as it takes everything)
     */
    async startGame(mode: string, amount: number): Promise<StartGameResponse> {
        const response = await apiRequest("POST", "/api/game/start", { mode, amount });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to start game");
        }
        return await response.json();
    },

    /**
     * Resolves a game by calculating payout server-side and crediting the user.
     * @param gameId The ID of the active game session
     * @param result Game result ('win', 'loss', 'push', 'blackjack')
     * @param multiplier Optional multiplier for Streak mode
     */
    async resolveGame(gameId: string, result: string, multiplier?: number): Promise<ResolveGameResponse> {
        const response = await apiRequest("POST", "/api/game/resolve", { gameId, result, multiplier });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to resolve game");
        }
        return await response.json();
    }
};
