import { motion } from "framer-motion";
import { ArrowLeft } from "@/icons";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserStore } from "@/store/user-store";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import OffsuitCard from "@/components/PlayingCard";
import { UserCardBack, sortCardBacksByRarity } from "@/lib/card-backs";

interface CardBacksProps {
  // Same pattern as Avatars/Emotes (see avatars.tsx): passed when rendered as Profile's
  // slide-up overlay so its close animation plays with Profile already mounted behind it,
  // falls back to routing to /profile when reached directly as its own route.
  onClose?: () => void;
}

export default function CardBacks({ onClose }: CardBacksProps = {}) {
  const [, navigate] = useLocation();
  const close = onClose ?? (() => navigate("/profile"));
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);
  const updateUser = useUserStore((state) => state.updateUser);

  // No unowned/locked entries here — unlike Avatars, card backs currently have no in-app
  // purchase flow (the shop's card-back section was emptied out, see card-backs.ts), so the
  // grid only ever shows the always-owned default plus whatever the user has actually
  // acquired (rewards, battle pass, ...).
  const { data: userCardBacks = [], isLoading } = useQuery({
    queryKey: ["/api/user/card-backs"],
    enabled: !!user,
    select: (response: any) => response?.data || [],
  });

  const { data: selectedCardBack } = useQuery({
    queryKey: ["/api/user/selected-card-back"],
    enabled: !!user,
    select: (response: any) => response?.data || null,
  });

  const selectMutation = useMutation({
    mutationFn: async (cardBackId: string) => {
      return await apiRequest("PATCH", "/api/user/selected-card-back", { cardBackId });
    },
    onSuccess: (_, cardBackId) => {
      updateUser({ selectedCardBackId: cardBackId });
      queryClient.invalidateQueries({ queryKey: ["/api/user/selected-card-back"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update card back",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const currentSelectedId = selectedCardBack?.selectedCardBackId || user?.selectedCardBackId || "default";

  const handleSelect = (cardBackId: string) => {
    if (cardBackId === currentSelectedId) return;
    selectMutation.mutate(cardBackId);
  };

  return (
    <div className="min-h-screen text-white pb-24" style={{ backgroundColor: "#000000" }}>
      <div className="max-w-md mx-auto px-6">
        {/* Header — no entrance animation, same reasoning as Avatars/Emotes: this page
            opens/closes as a whole via the slide overlay in profile.tsx. Right-side spacer
            keeps the title centered like Avatars/Emotes' headers. */}
        <div className="flex items-center justify-between mb-6 pt-4">
          <button
            onClick={close}
            className="p-2 rounded-full transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-2xl font-bold text-white">Card Backs</h1>
          <div className="w-10 h-10" />
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          // 3 columns instead of Avatars/Emotes' 2 — cards are tall and narrow (3:4), two per
          // row would render them oversized next to everything else on this page.
          <div className="grid grid-cols-3 gap-x-4 gap-y-10">
            <motion.button
              key="default"
              onClick={() => handleSelect("default")}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-2"
              data-testid="card-back-option-default"
            >
              <OffsuitCard
                rank="A"
                suit="spades"
                faceDown={true}
                size="sm"
                cardBackUrl={null}
                className={`transition-all ${currentSelectedId === "default" ? "ring-2 ring-white" : ""}`}
              />
            </motion.button>

            {sortCardBacksByRarity(userCardBacks).map((userCardBack: UserCardBack) => {
              const isSelected = currentSelectedId === userCardBack.cardBack.id;

              return (
                <motion.button
                  key={userCardBack.cardBack.id}
                  onClick={() => handleSelect(userCardBack.cardBack.id)}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center gap-2"
                  data-testid={`card-back-option-${userCardBack.cardBack.id}`}
                >
                  <OffsuitCard
                    rank="A"
                    suit="spades"
                    faceDown={true}
                    size="sm"
                    cardBackUrl={userCardBack.cardBack.imageUrl}
                    className={`transition-all ${isSelected ? "ring-2 ring-white" : ""}`}
                  />
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
