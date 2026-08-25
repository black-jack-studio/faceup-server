import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "@/icons";
import { useLocation } from "wouter";
import { EMOTE_CATALOG } from "@/data/emotes";
import { useEmoteLoadoutStore } from "@/store/emote-loadout-store";

interface EmotesProps {
  // Same pattern as Avatars (see avatars.tsx): passed when rendered as Profile's slide-up
  // overlay so its close animation plays with Profile already mounted behind it, falls back to
  // routing to /profile when reached directly as its own route.
  onClose?: () => void;
}

export default function Emotes({ onClose }: EmotesProps = {}) {
  const [, navigate] = useLocation();
  const close = onClose ?? (() => navigate("/profile"));

  // Persisted (see emote-loadout-store.ts) — this is what Play with Friends reads to know
  // which 4 emotes are actually equipped, so picking them here needs to survive reopening this
  // page, unlike Emotes' other selection state.
  const loadout = useEmoteLoadoutStore((state) => state.loadout);
  const setSlot = useEmoteLoadoutStore((state) => state.setSlot);
  // Which loadout slot a tap on the grid below will overwrite — null means grid taps do
  // nothing (no accidental swaps just from browsing).
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

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
            {EMOTE_CATALOG.map((entry) => (
              <motion.button
                key={entry.id}
                onClick={() => handleGridTap(entry.id)}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center gap-2"
                data-testid={`emote-option-${entry.id}`}
              >
                <div className="relative w-32 h-32">
                  <img
                    src={entry.image}
                    alt={entry.name}
                    className="w-full h-full object-contain rounded-2xl"
                  />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
