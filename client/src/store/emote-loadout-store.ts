import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EMOTE_CATALOG } from '@/data/emotes';

export const LOADOUT_SIZE = 4;

// First 4 in catalog order (all hand/arm gestures post-sort, see emotes.ts) — as good a
// default as any until there's a reason to pick specific ones.
const DEFAULT_LOADOUT = EMOTE_CATALOG.slice(0, LOADOUT_SIZE).map((entry) => entry.id);

interface EmoteLoadoutState {
  loadout: string[];
  setSlot: (index: number, emoteId: string) => void;
}

// Shared between the Emotes page (client/src/pages/emotes.tsx), where the player picks their 4,
// and the Play with Friends table (friends-table-view.tsx), which reads it to show what's
// equipped — persisted (unlike the rest of Emotes' selection state, which is local-only) so a
// choice made on the Emotes page actually survives to a later game.
export const useEmoteLoadoutStore = create<EmoteLoadoutState>()(
  persist(
    (set) => ({
      loadout: DEFAULT_LOADOUT,
      setSlot: (index, emoteId) =>
        set((state) => {
          const next = [...state.loadout];
          next[index] = emoteId;
          return { loadout: next };
        }),
    }),
    { name: 'offsuit-emote-loadout' }
  )
);
