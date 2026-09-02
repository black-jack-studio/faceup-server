import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "@/icons";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserStore } from "@/store/user-store";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import OffsuitCard from "@/components/PlayingCard";
import { CardBack, UserCardBack, sortCardBacksByRarity } from "@/lib/card-backs";

interface CardBacksProps {
  // Same pattern as Avatars/Emotes (see avatars.tsx): passed when rendered as Profile's
  // slide-up overlay so its close animation plays with Profile already mounted behind it,
  // falls back to routing to /profile when reached directly as its own route.
  onClose?: () => void;
}

// Two "sm" cards (80x115), both upright (no rotation — a tilted second card read as "put on
// wrong", per Anatole), stacked with a small down-right offset so they still overlap like a
// hand of cards. Same collection-glyph language as the Card backs row's own icon on Profile
// (see profile.tsx), just at full size instead of shrunk into a 32px box. locked=true swaps the
// real card-back image for a gray-on-black placeholder (border-only outline, no artwork, "?" in
// the middle) for entries the player doesn't own yet — there's no purchase flow for card backs
// to send them into instead (see card-backs.ts), so this is purely "here's what exists, this
// one isn't yours".
function CardFan({ imageUrl, locked, selected }: { imageUrl?: string | null; locked?: boolean; selected?: boolean }) {
  const card = () =>
    locked ? (
      <div
        className="flex items-center justify-center bg-black border-2 border-white/25"
        // 16, not Tailwind's rounded-2xl (32px in this project's config, see
        // tailwind.config.ts) — has to match "sm"'s own radius (sizeMap.sm.r in
        // PlayingCard.tsx) so a locked card's corners read as the same shape as a real one.
        style={{ width: 80, height: 115, borderRadius: 16 }}
      >
        <span className="text-white/25 text-3xl font-bold leading-none">?</span>
      </div>
    ) : (
      <OffsuitCard rank="A" suit="spades" faceDown={true} size="sm" cardBackUrl={imageUrl} />
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
          card footprint instead. Same 16px radius as the cards themselves, same white as the
          avatar picker's selection ring (avatars.tsx's ring-2 ring-white).
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
          style={{ left: -14, top: -14, width: 120 + 28, height: 115 + 28, border: "2px solid #ffffff", borderRadius: 16 }}
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

  const { data: userCardBacks = [], isLoading } = useQuery({
    queryKey: ["/api/user/card-backs"],
    enabled: !!user,
    select: (response: any) => response?.data || [],
  });

  // Full catalog (owned or not) — powers the locked placeholders below. Card backs have no
  // purchase flow yet (see card-backs.ts), so a locked entry here just shows what exists
  // without offering a way to unlock it.
  const { data: allCardBacks = [] } = useQuery({
    queryKey: ["/api/card-backs"],
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

  const ownedIds = new Set(userCardBacks.map((ucb: UserCardBack) => ucb.cardBack.id));
  const lockedCardBacks = allCardBacks.filter((cb: CardBack) => !ownedIds.has(cb.id));

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

            {sortCardBacksByRarity(userCardBacks).map((userCardBack: UserCardBack) => (
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

            {lockedCardBacks.map((cardBack: CardBack) => (
              <div
                key={cardBack.id}
                className="flex flex-col items-center gap-2"
                data-testid={`card-back-locked-${cardBack.id}`}
              >
                <CardFan locked />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
