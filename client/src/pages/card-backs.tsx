import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "@/icons";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserStore } from "@/store/user-store";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import OffsuitCard from "@/components/PlayingCard";
import CardBackShardBar from "@/components/CardBackShardBar";
import { CARD_BACK_SHARDS_REQUIRED } from "@shared/cardBackShards";
import { UserCardBack, sortCardBacksByRarity } from "@/lib/card-backs";

interface CardBacksProps {
  // Same pattern as Avatars/Emotes (see avatars.tsx): passed when rendered as Profile's
  // slide-up overlay so its close animation plays with Profile already mounted behind it,
  // falls back to routing to /profile when reached directly as its own route.
  onClose?: () => void;
}

// Two "sm" cards (80x115), both upright (no rotation — a tilted second card read as "put on
// wrong", per Anatole), stacked with a small down-right offset so they still overlap like a
// hand of cards. Same collection-glyph language as the Card backs row's own icon on Profile
// (see profile.tsx), just at full size instead of shrunk into a 32px box. dimmed=true is for a
// card back still being collected (1-3 of CARD_BACK_SHARDS_REQUIRED shards, see
// shared/cardBackShards.ts) -- its art is shown (per Anatole: fragments are visible, not a
// mystery), just grayscale + faded, matching how Avatars dims an unowned tile. A card back with
// 0 shards has no row at all and is never passed here -- see completedCardBacks/
// inProgressCardBacks below.
function CardFan({ imageUrl, dimmed, selected }: { imageUrl?: string | null; dimmed?: boolean; selected?: boolean }) {
  const card = () => (
    <div className={dimmed ? "grayscale opacity-50" : undefined}>
      <OffsuitCard rank="A" suit="spades" faceDown={true} size="sm" cardBackUrl={imageUrl} />
    </div>
  );

  return (
    <div className="relative w-[130px] h-[125px]">
      {/* Selection outline around the whole stacked pair, not a single card — a ring on just
          the front card (tried previously) read as landing on the wrong element since the two
          cards visually read as one unit. Sized/positioned from the cards' own bounding box
          (left-0..left-10+80 = 0..120px wide, both cards at top-0 so 115px tall — Tailwind's
          spacing scale is 4px/step, so left-10 is 40px) rather than the container: insetting
          from the container's own edges instead put the ring off-center, since the container is
          deliberately a bit bigger than the cards' footprint. 14px on every side of the actual
          card footprint instead. Same border width (2px) AND corner radius (32px, Tailwind's
          rounded-2xl) as the avatar picker's own selection ring (avatars.tsx's ring-2 ring-white
          on a rounded-2xl image) — deliberately NOT this card's own 16px radius, so the
          selection square itself reads as the same shape everywhere in the app.
          layoutId + a shared identity across every CardFan instance is what makes Framer
          Motion glide this between two cards on tap instead of just popping between them —
          only one instance ever has selected=true, so React unmounts it from the old card and
          mounts it on the new one in the same commit, and Framer Motion's shared layout
          animation (automatic since v6, no AnimateSharedLayout wrapper needed) treats that as
          one element moving rather than two separate appear/disappear transitions. */}
      {selected && (
        <motion.div
          layoutId="card-back-selection-ring"
          className="absolute pointer-events-none"
          style={{ left: -14, top: -14, width: 120 + 28, height: 115 + 28, border: "2px solid #ffffff", borderRadius: 32 }}
          transition={{ type: "spring", stiffness: 520, damping: 34 }}
        />
      )}
      <div className="absolute left-0 top-0">
        {card()}
      </div>
      {/* Same top-0 as the back card (both dead level on the same line, no vertical stagger) --
          left-10 (40px, half the card's own 80px width) so about half of the back card still
          peeks out instead of almost all of it getting buried under an 8px offset. */}
      <div className="absolute left-10 top-0 z-10">
        {card()}
      </div>
    </div>
  );
}

export default function CardBacks({ onClose }: CardBacksProps = {}) {
  const [, navigate] = useLocation();
  const close = onClose ?? (() => navigate("/profile"));
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);
  const updateUser = useUserStore((state) => state.updateUser);

  // Every card back the player has at least 1 shard of — complete (>= required) and in
  // progress (1..required-1) both come back here; one at 0 shards has no row and simply never
  // appears, which is exactly right: unstarted card backs aren't shown anywhere in this page.
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

  // Set immediately on tap so the blue ring jumps to the new card in the same frame as the
  // click, instead of waiting on the PATCH round-trip below — currentSelectedId reads this
  // first. Only cleared on error (to snap back to the real selection); left in place on
  // success since it's already correct by then and clearing it would risk a flicker back to
  // the stale query value while the invalidated queries are still refetching.
  const [optimisticSelectedId, setOptimisticSelectedId] = useState<string | null>(null);

  const selectMutation = useMutation({
    mutationFn: async (cardBackId: string) => {
      return await apiRequest("PATCH", "/api/user/selected-card-back", { cardBackId });
    },
    onSuccess: (_, cardBackId) => {
      updateUser({ selectedCardBackId: cardBackId });
      queryClient.invalidateQueries({ queryKey: ["/api/user/selected-card-back"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: any, _cardBackId, _context) => {
      setOptimisticSelectedId(null);
      toast({
        title: "Failed to update card back",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const currentSelectedId = optimisticSelectedId ?? (selectedCardBack?.selectedCardBackId || user?.selectedCardBackId || "default");

  const handleSelect = (cardBackId: string) => {
    if (cardBackId === currentSelectedId) return;
    setOptimisticSelectedId(cardBackId);
    selectMutation.mutate(cardBackId);
  };

  const completedCardBacks = userCardBacks.filter((ucb: UserCardBack) => ucb.shards >= CARD_BACK_SHARDS_REQUIRED);
  const inProgressCardBacks = userCardBacks.filter((ucb: UserCardBack) => ucb.shards < CARD_BACK_SHARDS_REQUIRED);

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
          <div className="grid grid-cols-2 gap-x-4 gap-y-10">
            <motion.button
              key="default"
              onClick={() => handleSelect("default")}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-2"
              data-testid="card-back-option-default"
            >
              <CardFan imageUrl={null} selected={currentSelectedId === "default"} />
            </motion.button>

            {sortCardBacksByRarity(completedCardBacks).map((userCardBack: UserCardBack) => (
              <motion.button
                key={userCardBack.cardBack.id}
                onClick={() => handleSelect(userCardBack.cardBack.id)}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center gap-2"
                data-testid={`card-back-option-${userCardBack.cardBack.id}`}
              >
                <CardFan
                  imageUrl={userCardBack.cardBack.imageUrl}
                  selected={currentSelectedId === userCardBack.cardBack.id}
                />
              </motion.button>
            ))}

            {/* Still being collected (1-3 of CARD_BACK_SHARDS_REQUIRED shards) — grayed out and
                not tappable (nothing to select yet), with the same fragment bar the chest
                reveal shows underneath instead of on the card itself. */}
            {sortCardBacksByRarity(inProgressCardBacks).map((userCardBack: UserCardBack) => (
              <div
                key={userCardBack.cardBack.id}
                className="flex flex-col items-center gap-2"
                data-testid={`card-back-progress-${userCardBack.cardBack.id}`}
              >
                <CardFan imageUrl={userCardBack.cardBack.imageUrl} dimmed />
                <CardBackShardBar filled={userCardBack.shards} total={CARD_BACK_SHARDS_REQUIRED} className="w-20" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
