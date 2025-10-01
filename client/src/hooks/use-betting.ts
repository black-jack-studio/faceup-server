import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { nanoid } from "nanoid";

interface BetPrepareRequest {
  betId: string;
  amount: number;
  mode?: string;
}

interface BetCommitRequest {
  betId: string;
}

interface BetPrepareResponse {
  success: boolean;
  betDraft: {
    betId: string;
    amount: number;
    expiresAt: string;
  };
}

interface BetCommitResponse {
  success: boolean;
  deductedAmount: number;
  remainingCoins: number;
  mode?: string;
}

interface BetSuccessResult extends BetCommitResponse {
  committedAmount: number;
}

interface UseBettingOptions {
  mode?: string;
  onSuccess?: (result: BetSuccessResult) => void;
  onError?: (error: any) => void;
}

export function useBetting(options: UseBettingOptions = {}) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentBetId, setCurrentBetId] = useState<string | null>(null);
  const [committedAmount, setCommittedAmount] = useState<number | null>(null);

  const prepareMutation = useMutation({
    mutationFn: async (request: BetPrepareRequest): Promise<BetPrepareResponse> => {
      const response = await apiRequest("POST", "/api/bets/prepare", request);
      return response.json();
    },
    onError: (error: any) => {
      console.error("Bet prepare failed:", error);
      toast({
        title: "Bet Preparation Failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      setCurrentBetId(null);
      setCommittedAmount(null);
      options.onError?.(error);
    },
  });

  const commitMutation = useMutation({
    mutationFn: async (request: BetCommitRequest): Promise<BetCommitResponse> => {
      const response = await apiRequest("POST", "/api/bets/commit", request);
      return response.json();
    },
    onSuccess: (data: BetCommitResponse) => {
      // Update caches in background (no await to avoid blocking UI)
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] }),
      ]).catch(error => console.warn("Cache invalidation failed:", error));
      
      // Force chips store to reload balance in background
      import("@/store/chips-store").then(({ useChipsStore }) => {
        const { loadBalance } = useChipsStore.getState();
        return loadBalance();
      }).catch(error => console.warn("Failed to reload chips balance:", error));

      setCurrentBetId(null);
      setCommittedAmount(null);
    },
    onError: (error: any) => {
      console.error("Bet commit failed:", error);
      const errorMessage = getErrorMessage(error);
      
      // Handle specific error cases
      if (error.message?.includes("409")) {
        // Insufficient funds
        toast({
          title: "Insufficient Funds",
          description: "You don't have enough coins for this bet.",
          variant: "destructive",
        });
        // Redirect to shop after a delay
        setTimeout(() => navigate("/shop"), 2000);
      } else if (error.message?.includes("410")) {
        // Bet expired
        toast({
          title: "Bet Expired",
          description: "Your bet has expired. Please try again.",
          variant: "destructive",
        });
      } else if (error.message?.includes("403")) {
        // Premium required
        toast({
          title: "Premium Required",
          description: "High-Stakes mode requires a premium membership.",
          variant: "destructive",
        });
        setTimeout(() => navigate("/premium"), 2000);
      } else {
        // Generic error
        toast({
          title: "Bet Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      setCurrentBetId(null);
      setCommittedAmount(null);
      options.onError?.(error);
    },
  });

  const placeBet = async (amount: number): Promise<void> => {
    try {
      // Generate unique bet ID
      const betId = nanoid();
      setCurrentBetId(betId);
      
      // Capture the committed amount before any async operations
      setCommittedAmount(amount);

      // Navigate immediately for instant feedback (optimistic UI)
      const enhancedResult: BetSuccessResult = {
        success: true,
        deductedAmount: amount,
        remainingCoins: 0, // Will be updated later
        committedAmount: amount
      };
      
      // Call success callback immediately for instant navigation
      options.onSuccess?.(enhancedResult);

      // Do the actual betting operations in background
      const prepareRequest: BetPrepareRequest = {
        betId,
        amount,
        ...(options.mode && { mode: options.mode })
      };

      const prepareResult = await prepareMutation.mutateAsync(prepareRequest);
      
      if (!prepareResult.success) {
        throw new Error("Failed to prepare bet");
      }

      const commitRequest: BetCommitRequest = {
        betId,
      };

      await commitMutation.mutateAsync(commitRequest);

    } catch (error: any) {
      // Error handling is done in the mutation onError handlers
      console.error("Place bet error:", error);
      setCurrentBetId(null);
      setCommittedAmount(null);
      throw error;
    }
  };

  const navigateToGame = (amount: number, additionalParams: Record<string, string> = {}) => {
    const params = new URLSearchParams({
      bet: amount.toString(),
      ...additionalParams,
    });
    navigate(`/play/game?${params.toString()}`);
  };

  return {
    placeBet,
    navigateToGame,
    isLoading: prepareMutation.isPending || commitMutation.isPending,
    isPreparingBet: prepareMutation.isPending,
    isCommittingBet: commitMutation.isPending,
    currentBetId,
    error: prepareMutation.error || commitMutation.error,
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