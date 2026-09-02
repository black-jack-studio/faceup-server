import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "@/icons";
import { useLocation } from "wouter";
import { EMOTE_CATALOG } from "@/data/emotes";
import { useEmoteLoadoutStore, LOADOUT_SIZE } from "@/store/emote-loadout-store";
import { useUserStore } from "@/store/user-store";
import { useOverlayVisibilityStore } from "@/store/overlay-visibility-store";
import BottomSheet from "@/components/BottomSheet";
// Same 3 chest assets shop.tsx and battlepass.tsx each already import on their own (there's no
// shared image module for them — see shared/chestCatalog.ts, which only carries tiers/pricing).
import chestGoldImage from "@assets/battlepass_chests/chest_gold_1787823960.png";
import chestPurpleImage from "@assets/battlepass_chests/chest_purple_1787823960.png";
import chestCrownImage from "@assets/battlepass_chests/chest_crown_1787823960.png";

// Cheapest -> priciest, same order/names as the Shop (shop.tsx's CHEST_DISPLAY_ORDER/NAMES).
const CHEST_PROMO_TIERS: { name: string; image: string }[] = [
  { name: "Lucky", image: chestGoldImage },
  { name: "Fortune", image: chestPurpleImage },
  { name: "Jackpot", image: chestCrownImage },
];

// The first LOADOUT_SIZE catalog entries are the free starter kit (same ones
// emote-loadout-store.ts's DEFAULT_LOADOUT equips out of the box) — always unlocked. Everything
// past that needs to have actually been won from a chest (server/storage.ts's
// getUserEmotes/addEmoteToUser, wired into gold/purple/crown chest rewards, see
// shared/battlePassChests.ts).
const FREE_STARTER_EMOTE_IDS = new Set(EMOTE_CATALOG.slice(0, LOADOUT_SIZE).map((e) => e.id));

interface EmotesProps {
  // Same pattern as Avatars (see avatars.tsx): passed when rendered as Profile's slide-up
  // overlay so its close animation plays with Profile already mounted behind it, falls back to
  // routing to /profile when reached directly as its own route.
  onClose?: () => void;
}

export default function Emotes({ onClose }: EmotesProps = {}) {
  const [, navigate] = useLocation();
  const close = onClose ?? (() => navigate("/profile"));
  const user = useUserStore((state) => state.user);

  // Persisted (see emote-loadout-store.ts) — this is what Play with Friends reads to know
  // which 4 emotes are actually equipped, so picking them here needs to survive reopening this
  // page, unlike Emotes' other selection state.
  const loadout = useEmoteLoadoutStore((state) => state.loadout);
  const setSlot = useEmoteLoadoutStore((state) => state.setSlot);
  // Which loadout slot a tap on the grid below will overwrite — null means grid taps do
  // nothing (no accidental swaps just from browsing).
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  // Tapping a locked (mystery) tile opens this instead of arming/assigning anything — it isn't
  // owned yet, so there's nothing to select.
  const [showChestPromo, setShowChestPromo] = useState(false);

  // Emotes won from chests (server/storage.ts's getUserEmotes) — merged with the free starter
  // set below to decide which tiles show as unlocked.
  const { data: ownedEmotes = [] } = useQuery({
    queryKey: ["/api/user/emotes"],
    enabled: !!user,
    select: (response: any) => response?.data || [],
  });

  const unlockedEmoteIds = useMemo(() => {
    const ids = new Set(FREE_STARTER_EMOTE_IDS);
    for (const owned of ownedEmotes) ids.add(owned.emoteId);
    return ids;
  }, [ownedEmotes]);

  const handleSlotTap = (index: number) => {
    setActiveSlot((current) => (current === index ? null : index));
  };

  const handleGridTap = (entryId: string) => {
    if (activeSlot === null) return;
    setSlot(activeSlot, entryId);
    setActiveSlot(null);
  };

  return (
    <>
      {/* Fixed header: back/title row + the in-game loadout bar, pinned together so the close
          button stays reachable at any scroll position instead of scrolling away on its own
          (same "fixed top-0" approach as Battle Pass's own header, see battlepass.tsx — plain
          CSS position:sticky doesn't reliably pin inside this page's slide-up overlay wrapper
          in profile.tsx, which animates its own transform). */}
      <div
        className="fixed top-0 left-0 right-0 z-20"
        // .fixed-safe-screen (the overlay wrapper this page mounts inside, see profile.tsx)
        // already pads ITS OWN top by the safe-area inset — but that padding only pushes
        // normal-flow content, not this position:fixed header, which is contained by the
        // wrapper's padding box (i.e. positioned as if that padding weren't there). Redone here
        // so the back button/title don't sit under the notch.
        style={{ backgroundColor: "#000000", paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="max-w-md mx-auto px-6">
          <div className="flex items-center justify-between pt-4 pb-4">
            <button
              onClick={close}
              className="p-2 rounded-full transition-colors"
              data-testid="button-back"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-2xl font-bold text-white">Emotes</h1>
            <div className="w-10 h-10" />
          </div>

          {/* In-game loadout — tap a slot to arm it, then tap an emote in the grid below to
              drop it into that slot. Gray background per Anatole's request, to read as a
              distinct "equipped" tray rather than another grid row. The armed slot scales up
              instead of getting a ring — a ring here read as too heavy on such a small,
              already-tight bar.
              flex justify-center on the OUTER div + inline-flex on the bar itself: a plain
              flex/w-full bar stretched across the whole content width and centered its 4 slots
              inside that with justify-center, leaving a big gap of bare gray background on each
              side before reaching the actual slots. inline-flex shrink-wraps the bar to just
              its slots + padding, and the outer div centers that smaller box instead. */}
          <div className="flex justify-center mb-4">
            <div className="bg-white/10 rounded-xl px-3 py-2 inline-flex items-center gap-2">
              {loadout.map((emoteId, index) => {
                const entry = EMOTE_CATALOG.find((e) => e.id === emoteId);
                const isActive = activeSlot === index;

                return (
                  <motion.button
                    key={index}
                    onClick={() => handleSlotTap(index)}
                    animate={{ scale: isActive ? 1.3 : 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    whileTap={{ scale: isActive ? 1.2 : 0.95 }}
                    className="w-10 h-10 rounded-lg"
                    data-testid={`loadout-slot-${index}`}
                  >
                    {entry && (
                      <img src={entry.image} alt={entry.name} className="w-full h-full object-contain" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div
        className="min-h-screen text-white pb-24"
        style={{ backgroundColor: "#000000", paddingTop: "calc(10.5rem + env(safe-area-inset-top))" }}
      >
        <div className="max-w-md mx-auto px-6">
          {/* Grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-10">
            {EMOTE_CATALOG.map((entry) => {
              const unlocked = unlockedEmoteIds.has(entry.id);
              return (
                <motion.button
                  key={entry.id}
                  onClick={() => unlocked ? handleGridTap(entry.id) : setShowChestPromo(true)}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center gap-2"
                  data-testid={`emote-option-${entry.id}`}
                >
                  {unlocked ? (
                    <div className="relative w-32 h-32">
                      <img
                        src={entry.image}
                        alt={entry.name}
                        className="w-full h-full object-contain rounded-2xl"
                      />
                    </div>
                  ) : (
                    // Same locked-placeholder language as Card Backs (card-backs.tsx's CardFan):
                    // a bordered box standing in for artwork the player doesn't own, not the real
                    // image dimmed — a thicker border here since this tile is bigger.
                    <div
                      className="w-32 h-32 rounded-2xl bg-black border-4 border-white/25 flex items-center justify-center"
                      data-testid={`emote-locked-${entry.id}`}
                    >
                      <span className="text-white/25 text-5xl font-bold leading-none">?</span>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Same slide-up sheet as everywhere else in the app (shop.tsx's chest confirm, etc.) --
          purely informational, no purchase happens here directly. */}
      <BottomSheet
        open={showChestPromo}
        onClose={() => setShowChestPromo(false)}
        height="auto"
        contentClassName="px-6 pt-2 pb-8 flex flex-col items-center text-center"
      >
        <h2 className="mt-3 text-xl font-bold text-white">Unlock this emote from chests</h2>
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
            // Closes this overlay itself first (not just navigate("/shop") on its own) --
            // otherwise Profile's own showEmotes stayed stuck true forever (its exit animation
            // never got triggered), which left its body-scroll lock and overlay-visibility
            // registration stuck on even after landing on Shop: no bottom nav, page unscrollable.
            close();
            // Without this, the bottom nav bar stayed hidden on Shop for however long Profile's
            // own (now offscreen) exit animation for this overlay took to finish, then popped in
            // -- see overlay-visibility-store.ts's reset() for why forcing it to 0 here is safe.
            useOverlayVisibilityStore.getState().reset();
            navigate("/shop");
          }}
          className="w-full h-11 rounded-[18px] bg-white hover:bg-gray-100 text-black font-bold"
          data-testid="button-go-to-shop"
        >
          Go to Shop
        </button>
      </BottomSheet>
    </>
  );
}
