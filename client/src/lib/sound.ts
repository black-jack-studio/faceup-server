// Lightweight SFX player for the game tables. Plain HTML5 Audio rather than a native
// Capacitor plugin — it works identically in the web client and inside the iOS/Android
// WebView, and needs no native build to test. Files are Kenney's CC0 "Casino Audio" and
// "Interface Sounds" packs (client/public/sounds/LICENSE-kenney-*.txt).

const SOUND_FILES = {
  cardDeal: "/sounds/card-deal.ogg",
  cardFlip: "/sounds/card-flip.ogg",
  chipBet: "/sounds/chip-bet.ogg",
  shuffle: "/sounds/shuffle.ogg",
  buttonClick: "/sounds/button-click.ogg",
  win: "/sounds/win.ogg",
  lose: "/sounds/lose.ogg",
  push: "/sounds/push.ogg",
} as const;

export type SoundName = keyof typeof SOUND_FILES;

const STORAGE_KEY = "faceup-sound-enabled";
const pool = new Map<SoundName, HTMLAudioElement>();

function getAudio(name: SoundName): HTMLAudioElement {
  let el = pool.get(name);
  if (!el) {
    el = new Audio(SOUND_FILES[name]);
    el.preload = "auto";
    el.volume = 0.55;
    pool.set(name, el);
  }
  return el;
}

// iOS WebView (and most mobile browsers) refuse the very first Audio.play() unless it's
// called synchronously inside a user gesture. The game's own sounds (dealt cards, dealer
// turns) fire well outside any tap, so every sound is preloaded — and silently played/paused
// once — on the first tap anywhere in the app, which satisfies that gesture requirement and
// unlocks playback for every later programmatic call this session.
let unlocked = false;
export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  Object.keys(SOUND_FILES).forEach((name) => {
    const el = getAudio(name as SoundName);
    el.play()
      .then(() => el.pause())
      .catch(() => {});
  });
}

export function isSoundEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== "false";
}

export function setSoundEnabled(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY, String(enabled));
}

export function playSound(name: SoundName) {
  if (!isSoundEnabled()) return;
  const el = getAudio(name);
  try {
    el.currentTime = 0;
    el.play().catch(() => {});
  } catch {
    // Playback can throw synchronously in some WebViews if the element isn't ready yet —
    // never worth surfacing to the player over a sound effect.
  }
}
