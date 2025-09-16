import { useQuery } from "@tanstack/react-query";
import { useUserStore } from "@/store/user-store";

interface SelectedCardBackData {
  cardBack: {
    id: string;
    name: string;
    imageUrl: string;
    rarity: string;
  };
}

/**
 * Hook réutilisable pour récupérer l'URL du dos de carte sélectionné par l'utilisateur
 * Gère automatiquement le fallback vers null si aucun dos n'est sélectionné ou en cas d'erreur
 */
export function useSelectedCardBack() {
  const user = useUserStore((state) => state.user);

  const { data, isLoading, error } = useQuery<SelectedCardBackData>({
    queryKey: ["/api/user/selected-card-back"],
    enabled: !!user && !!user.selectedCardBackId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1, // Only retry once on error
    select: (response: any) => response?.data || null,
  });

  // Retourner l'URL du dos sélectionné ou null pour le fallback vers le dos par défaut
  const selectedCardBackUrl = data?.cardBack?.imageUrl || null;

  return {
    cardBackUrl: selectedCardBackUrl,
    cardBackData: data,
    isLoading,
    error,
    hasCustomCardBack: !!selectedCardBackUrl,
  };
}