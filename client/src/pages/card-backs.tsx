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
import { CardBack, UserCardBack, sortCardBacksByRarity } from "@/lib/card-backs";
import BottomSheet from "@/components/BottomSheet";
import { useOverlayVisibilityStore } from "@/store/overlay-visibility-store";
// Same 3 chest assets shop.tsx/battlepass.tsx/emotes.tsx/avatars.tsx each already import on
// their own -- there's no shared image module for them (see shared/chestCatalog.ts, tiers/
// pricing only).
import chestGoldImage from "@assets/battlepass_chests/chest_gold_1787823960.png";
import chestPurpleImage from "@assets/battlepass_chests/chest_purple_1787823960.png";
import chestCrownImage from "@assets/battlepass_chests/chest_crown_1787823960.png";

// Cheapest -> priciest, same order/names as the Shop (shop.tsx's CHEST_DISPLAY_ORDER/NAMES).
const CHEST_PROMO_TIERS: { name: string; image: string }[] = [
  { name: "Lucky", image: chestGoldImage },
  { name: "Fortune", image: chestPurpleImage },
  { name: "Jackpot", image: chestCrownImage },
];

interface CardBacksProps {
  // Same pattern as Avatars/Emotes (see avatars.tsx): passed when rendered as Profile's
  // slide-up overlay so its close animation plays with Profile already mounted behind it,
  // falls back to routing to /profile when reached directly as its own route.
  onClose?: () => void;
}

// Two "sm" cards (80x115), both upright (no rotation — a tilted second card read as "put on
// wrong", per Anatole), stacked with a small down-right offset so they still overlap like a
// hand of cards. Same collection-glyph language as the Card backs row's own icon on Profile
// (see profile.tsx), just at full size instead of shrunk into a 32px box.
// - locked=true (0 shards, no row at all): a gray "?" placeholder, same language as
//   Emotes/Avatars' own Mystery tiles -- nothing to show yet.
// - dimmed=true (1-3 of CARD_BACK_SHARDS_REQUIRED shards): the real art, just grayscale + faded
//   (per Anatole: fragments already collected ARE visible, unlike a fully-locked mystery tile).
function CardFan({ imageUrl, locked, dimmed, selected }: { imageUrl?: string | null; locked?: boolean; dimmed?: boolean; selected?: boolean }) {
  const card = () =>
    locked ? (
      <div
        // bg-[#1c1c1e] (same dark card-tile gray used elsewhere in the app), not bg-black --
        // pure black against this page's own black background read as a see-through outline
        // instead of a solid dark card.
        className="flex items-center justify-center bg-[#1c1c1e] border-4 border-white/25"
        style={{ width: 80, height: 115, borderRadius: 16 }}
      >
        <span className="text-white/25 text-3xl font-bold leading-none">?</span>
      </div>
    ) : (
      // brightness (not opacity) darkens the art while keeping it fully opaque -- opacity let
      // the black page background show through, which read as a half-transparent card instead
      // of a dark solid one.
      <div className={dimmed ? "grayscale brightness-[0.45]" : undefined}>
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
  // progress (1..required-1) both come back here.
  const { data: userCardBacks = [], isLoading } = useQuery({
    queryKey: ["/api/user/card-backs"],
    enabled: !!user,
    select: (response: any) => response?.data || [],
  });

  // Full catalog (owned or not) — powers the locked "?" placeholders below for card backs at 0
  // shards. Card backs have no direct-purchase flow (see card-backs.ts) -- tapping a locked one
  // opens the chest-promo sheet instead (same pattern as Emotes/Avatars' own Mystery items).
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
  // Tapping a locked (0-shard) card back opens this instead of selecting it -- it isn't
  // started yet, so there's nothing to select.
  const [showChestPromo, setShowChestPromo] = useState(false);

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
  const startedIds = new Set(userCardBacks.map((ucb: UserCardBack) => ucb.cardBack.id));
  const lockedCardBacks = allCardBacks.filter((cb: CardBack) => !startedIds.has(cb.id));

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

            {/* Not started at all (0 shards) — locked "?" placeholder, tapping opens the
                chest-promo sheet instead of selecting (same pattern as Emotes/Avatars' own
                Mystery items). Grouped last so the grid reads progress-first, mystery-last. */}
            {lockedCardBacks.map((cardBack: CardBack) => (
              <motion.button
                key={cardBack.id}
                onClick={() => setShowChestPromo(true)}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center gap-2"
                data-testid={`card-back-locked-${cardBack.id}`}
              >
                <CardFan locked />
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Same slide-up sheet as Emotes/Avatars' own chest promo (emotes.tsx, avatars.tsx) --
          purely informational, no purchase happens here directly. pb-4, not the usual pb-8 --
          Anatole: with the bigger chest images below it was leaving too much dead space under
          the button. */}
      <BottomSheet
        open={showChestPromo}
        onClose={() => setShowChestPromo(false)}
        height="auto"
        contentClassName="px-6 pt-2 pb-4 flex flex-col items-center text-center"
      >
        <h2 className="mt-3 text-xl font-bold text-white">Unlock this card back from chests</h2>
        <p className="mt-2 text-white/70 text-sm mb-6">
          Any chest from the Shop or the Battle Pass has a chance to unlock it.
        </p>
        <div className="flex items-center justify-center gap-4 mb-6">
          {CHEST_PROMO_TIERS.map((chest) => (
            <img key={chest.name} src={chest.image} alt={chest.name} className="w-16 h-16 object-contain" />
          ))}
        </div>
        <button
          onClick={() => {
            setShowChestPromo(false);
            // Same fix as Emotes/Avatars' own "Go to Shop" (see emotes.tsx): close this overlay
            // and force the overlay-visibility count to 0 before navigating away, so the bottom
            // nav bar isn't stuck waiting on this (now offscreen) overlay's own exit animation.
            close();
            useOverlayVisibilityStore.getState().reset();
            navigate("/shop");
          }}
          className="w-full h-11 rounded-[18px] bg-white hover:bg-gray-100 text-black font-bold"
          data-testid="button-go-to-shop"
        >
          Go to Shop
        </button>
      </BottomSheet>
    </div>
  );
}
