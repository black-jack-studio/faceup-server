// Emote catalog (2026-08-25): animated 3D emojis (APNG, render natively in any <img>) from
// attached_assets/emotes3d/. Ids/names come from shared/emoteCatalog.ts (the same list the
// server rolls chest rewards from) -- this file only adds the actual image, resolved via a
// Vite-only import.meta.glob the server can't use. Ownership (2026-09-02): every emote can now
// be won as a chest reward once unowned -- see shared/battlePassChests.ts and
// server/storage.ts's getUserEmotes/addEmoteToUser.

import { EMOTE_CATALOG as EMOTE_CATALOG_BASE } from "@shared/emoteCatalog";

export interface EmoteEntry {
  id: string;
  name: string;
  image: string;
}

const images = import.meta.glob('../../../attached_assets/emotes3d/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

function imageFor(filename: string): string {
  const entry = Object.entries(images).find(([path]) => path.endsWith(`/${filename}`));
  if (!entry) {
    throw new Error(`Missing emote asset: ${filename}`);
  }
  return entry[1];
}

export const EMOTE_CATALOG: EmoteEntry[] = EMOTE_CATALOG_BASE.map((e) => ({
  id: e.id,
  name: e.name,
  image: imageFor(e.file),
}));
