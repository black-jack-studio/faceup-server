import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "@/icons";
import { useLocation } from "wouter";
import { EMOTE_CATALOG } from "@/data/emotes";

interface EmotesProps {
  // Same pattern as Avatars (see avatars.tsx): passed when rendered as Profile's slide-up
  // overlay so its close animation plays with Profile already mounted behind it, falls back to
  // routing to /profile when reached directly as its own route.
  onClose?: () => void;
}

export default function Emotes({ onClose }: EmotesProps = {}) {
  const [, navigate] = useLocation();
  const close = onClose ?? (() => navigate("/profile"));

  // No backend field/unlock system for emotes yet (see profile.tsx's Emotes row) — selection
  // here is local-only, just to give the grid the same tap-to-select feel as Avatars.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="min-h-screen text-white pb-24" style={{ backgroundColor: "#000000" }}>
      <div className="max-w-md mx-auto px-6">
        {/* Header — no entrance animation, same reasoning as Avatars: this page opens/closes as
            a whole via the slide overlay in profile.tsx. Right-side spacer (no color swatch —
            emotes have no tone variants) keeps the title centered like Avatars' header. */}
        <div className="flex items-center justify-between mb-6 pt-4">
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

        {/* Grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10">
          {EMOTE_CATALOG.map((entry) => {
            const isSelected = selectedId === entry.id;

            return (
              <motion.button
                key={entry.id}
                onClick={() => setSelectedId(entry.id)}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center gap-2"
                data-testid={`emote-option-${entry.id}`}
              >
                <div className="relative w-32 h-32">
                  <img
                    src={entry.image}
                    alt={entry.name}
                    className={`w-full h-full object-contain rounded-2xl transition-all ${
                      isSelected ? "ring-2 ring-white" : ""
                    }`}
                  />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
