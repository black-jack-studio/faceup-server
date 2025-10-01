import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BetPrepareRequest {
  stake: number;
  gameType: string;
}

interface BetPrepareResponse {
  ok: boolean;
  gameId: string;
  table: string;
  bet: number;
  // Legacy fields for backwards compatibility
  coins?: number;
  reserved?: number;
}

interface BetSuccessResult {
  ok: boolean;
  gameId: string;
  table: string;
  bet: number;
  coins?: number;
  reserved?: number;
}

interface UseBettingOptions {
  mode?: string;
  onSuccess?: (result: BetSuccessResult) => void;
  onError?: (error: any) => void;
}

export function useBetting(options: UseBettingOptions = {}) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const prepareMutation = useMutation({
    mutationFn: async (request: BetPrepareRequest): Promise<BetPrepareResponse> => {
      const response = await apiRequest("POST", "/api/bets/prepare", request);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('bets route failed', response.status, errorText);
        throw new Error(`Bet prepare failed: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: (data: BetPrepareResponse) => {
      // Update chips store with new balance from server (if available in legacy format)
      if (data.coins !== undefined) {
        import("@/store/chips-store").then(({ useChipsStore }) => {
          const { setBalance } = useChipsStore.getState();
          setBalance(data.coins!);
        }).catch(error => console.warn("Failed to update chips balance:", error));
      }
      
      // Update caches in background
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] }),
      ]).catch(error => console.warn("Cache invalidation failed:", error));
      
      // Call user's onSuccess with the full response
      options.onSuccess?.(data);
    },
    onError: (error: any) => {
      console.error("Bet prepare failed:", error);
      const errorMessage = getErrorMessage(error);
      
      // Handle specific error cases
      if (errorMessage.includes("INSUFFICIENT_FUNDS")) {
        toast({
          title: "Insufficient Funds",
          description: "You don't have enough coins for this bet.",
          variant: "destructive",
        });
        setTimeout(() => navigate("/shop"), 2000);
      } else {
        toast({
          title: "Bet Preparation Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      options.onError?.(error);
    },
  });

  const placeBet = async (amount: number): Promise<void> => {
    try {
      // Prepare the bet (debit coins immediately)
      const prepareRequest: BetPrepareRequest = {
        stake: amount,
        gameType: options.mode || 'classic'
      };

      const prepareResult = await prepareMutation.mutateAsync(prepareRequest);
      
      // Success callback is already called in mutation onSuccess

    } catch (error: any) {
      // Error handling is done in the mutation onError handlers
      console.error("Place bet error:", error);
      throw error;
    }
  };

  const navigateToGame = (data: any, additionalParams: Record<string, string> = {}) => {
    // Robust gameId extraction with fallbacks
    const gameId = data?.gameId ?? data?.game_id ?? data?.id ?? null;
    
    if (!gameId) {
      console.error('navigateToGame: missing gameId in response', data);
      toast({
        title: "Bet Preparation Failed",
        description: "Could not start game. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    const params = new URLSearchParams({
      gameId: gameId.toString(),
      ...additionalParams,
    });
    navigate(`/play/game?${params.toString()}`);
  };

  return {
    placeBet,
    navigateToGame,
    isLoading: prepareMutation.isPending,
    isPreparingBet: prepareMutation.isPending,
    error: prepareMutation.error,
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