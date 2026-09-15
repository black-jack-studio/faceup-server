// Lightweight SFX player for the game tables. Plain HTML5 Audio rather than a native
// Capacitor plugin — it works identically in the web client and inside the iOS/Android
// WebView, and needs no native build to test. Files are Kenney's CC0 "Casino Audio" and
// "Interface Sounds" packs (client/public/sounds/LICENSE-kenney-*.txt).

// Shelved 2026-09-15: the whole sound system (per-tap click sound, per-card flip sound,
// win/lose/push) is switched off here rather than ripped out — flip this back to true to bring
// it all back with nothing else to rewire. The Settings screen's toggle row was removed while
// this is off, since there'd be nothing left for it to control.
const SOUND_SYSTEM_ENABLED = false;

const SOUND_FILES = {
  cardDeal: "/sounds/card-deal.wav",
  cardFlip: "/sounds/card-flip.wav",
  chipBet: "/sounds/chip-bet.ogg",
  shuffle: "/sounds/shuffle.ogg",
  buttonClick: "/sounds/button-click.mp3",
  win: "/sounds/win.wav",
  lose: "/sounds/lose.mp3",
  push: "/sounds/push.mp3",
  chestOpen: "/sounds/chest-open.ogg",
} as const;

export type SoundName = keyof typeof SOUND_FILES;

const STORAGE_KEY = "faceup-sound-enabled";
const pool = new Map<SoundName, HTMLAudioElement>();

function getAudio(name: SoundName): HTMLAudioElement {
  let el = pool.get(name);
  if (!el) {
    el = new Audio(SOUND_FILES[name]);
    el.preload = "auto";
    el.volume = 0.35;
    pool.set(name, el);
  }
  return el;
}

// iOS WebView (and most mobile browsers) refuse the very first Audio.play() unless it's
// called synchronously inside a user gesture. The game's own sounds (dealt cards, dealer
// turns) fire well outside any tap, so every sound is preloaded — and played/paused once —
// on the first tap anywhere in the app, which satisfies that gesture requirement and unlocks
// playback for every later programmatic call this session. Muted during this one unlock play:
// `.play()` starts real audible output immediately, and `.pause()` only lands once its promise
// resolves (a WebView tick or two later), so leaving it unmuted meant every sound briefly
// played all at once, audibly, on the very first tap.
let unlocked = false;
export function unlockAudio() {
  if (!SOUND_SYSTEM_ENABLED || unlocked) return;
  unlocked = true;
  Object.keys(SOUND_FILES).forEach((name) => {
    const el = getAudio(name as SoundName);
    el.muted = true;
    el.play()
      .then(() => {
        el.pause();
        el.currentTime = 0;
        el.muted = false;
      })
      .catch(() => {
        el.muted = false;
      });
  });
}

export function isSoundEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== "false";
}

export function setSoundEnabled(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY, String(enabled));
}

export function playSound(
  name: SoundName,
  // Used to make a big win's "win" sound read as bigger than a small one — see
  // getWinIntensity, the only caller that passes these. Reset explicitly on every call rather
  // than left to accumulate, since the same pooled <audio> element is reused across plays.
  options?: { playbackRate?: number; volumeBoost?: number },
) {
  if (!SOUND_SYSTEM_ENABLED || !isSoundEnabled()) return;
  const el = getAudio(name);
  try {
    el.currentTime = 0;
    el.playbackRate = options?.playbackRate ?? 1;
    el.volume = Math.min(1, 0.35 + (options?.volumeBoost ?? 0));
    el.play().catch(() => {});
  } catch {
    // Playback can throw synchronously in some WebViews if the element isn't ready yet —
    // never worth surfacing to the player over a sound effect.
  }
}
