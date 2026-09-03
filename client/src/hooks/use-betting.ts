import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { gameService, GameStateResponse } from "@/services/gameService";
import { useGameStore } from "@/store/game-store";

interface UseBettingOptions {
  mode?: string;
  onSuccess?: (result: GameStateResponse) => void;
  onError?: (error: any) => void;
}

export function useBetting(options: UseBettingOptions = {}) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);

  // We keep the mutation structure for React Query benefits (loading state, error handling)
  const startGameMutation = useMutation({
    mutationFn: async (params: { amount: number; mode?: string }) => {
      return await gameService.startGame(params.mode || "classic", params.amount);
    },
    onSuccess: (data) => {
      // The server has already dealt real cards from its own shuffled deck — project that
      // authoritative state onto the game store before navigating to the table.
      useGameStore.getState().syncServerState(data);

      // Force user store to update coins immediately to reflect the debit
      import("@/store/user-store").then(({ useUserStore }) => {
        useUserStore.getState().loadUserCoins();
      });

      // Update caches in background
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] }),
      ]).catch(error => console.warn("Cache invalidation failed:", error));

      setCurrentGameId(data.gameId);

      options.onSuccess?.(data);
    },
    onError: (error: any) => {
      console.error(`Game start failed:`, error);
      const errorMessage = getErrorMessage(error);

      // Handle specific error cases
      if (error.message?.includes("409") || errorMessage.includes("Insufficient")) {
        toast({
          title: "Insufficient Funds",
          description: "You don't have enough coins for this bet.",
          variant: "destructive",
        });
        setTimeout(() => navigate("/shop"), 2000);
      } else {
        toast({
          title: "Game Start Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }

      setCurrentGameId(null);
      options.onError?.(error);
    },
  });

  const placeBet = async (amount: number): Promise<void> => {
    try {
      await startGameMutation.mutateAsync({ amount, mode: options.mode });
    } catch (error) {
      // Error handling is done in mutation onError
      throw error;
    }
  };

  const navigateToGame = (gameId: string | null, amount: number, additionalParams: Record<string, string> = {}) => {
    const params = new URLSearchParams({
      gameId: gameId || "",
      bet: amount.toString(),
      ...additionalParams,
    });
    navigate(`/play/game?${params.toString()}`);
  };

  return {
    placeBet, // We keep the name placeBet for compatibility with UI components
    navigateToGame,
    isLoading: startGameMutation.isPending,
    isPreparingBet: startGameMutation.isPending,
    isCommittingBet: startGameMutation.isPending,
    currentGameId,
    error: startGameMutation.error,
  };
}

function getErrorMessage(error: any): string {
  if (error.message) {
    // Extract message from error response
    const match = error.message.match(/\d+:\s*(.+)/);
    if (match) {
      return match[1];
    }
    return error.message;
  }
  return "An unexpected error occurred. Please try again.";
}