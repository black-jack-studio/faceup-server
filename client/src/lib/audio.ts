/**
 * Audio system for card sound effects in blackjack game
 */

type SoundEffect = 'card-deal' | 'card-flip' | 'card-shuffle' | 'chip-drop';

class AudioManager {
  private sounds: Map<SoundEffect, HTMLAudioElement> = new Map();
  private enabled: boolean = true;

  constructor() {
    this.initializeSounds();
  }

  private initializeSounds() {
    // Card dealing sound
    const dealSound = new Audio();
    dealSound.preload = 'auto';
    dealSound.volume = 0.3;
    // Using a data URL for a simple card sound (short click/tap)
    dealSound.src = this.createCardDealSound();
    this.sounds.set('card-deal', dealSound);

    // Card flipping sound
    const flipSound = new Audio();
    flipSound.preload = 'auto';
    flipSound.volume = 0.25;
    flipSound.src = this.createCardFlipSound();
    this.sounds.set('card-flip', flipSound);

    // Card shuffling sound
    const shuffleSound = new Audio();
    shuffleSound.preload = 'auto';
    shuffleSound.volume = 0.2;
    shuffleSound.src = this.createShuffleSound();
    this.sounds.set('card-shuffle', shuffleSound);

    // Chip drop sound
    const chipSound = new Audio();
    chipSound.preload = 'auto';
    chipSound.volume = 0.3;
    chipSound.src = this.createChipSound();
    this.sounds.set('chip-drop', chipSound);
  }

  private createCardDealSound(): string {
    // Generate a quick "snap" sound for card dealing
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buffer = context.createBuffer(1, context.sampleRate * 0.1, context.sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // Quick attack with high frequency then decay
    for (let i = 0; i < channelData.length; i++) {
      const t = i / context.sampleRate;
      const envelope = Math.exp(-t * 50); // Quick decay
      const noise = (Math.random() - 0.5) * 0.3;
      const tone = Math.sin(2 * Math.PI * 800 * t) * 0.1; // High frequency click
      channelData[i] = (noise + tone) * envelope;
    }
    
    return this.bufferToWav(buffer);
  }

  private createCardFlipSound(): string {
    // Generate a "whoosh" sound for card flipping
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buffer = context.createBuffer(1, context.sampleRate * 0.2, context.sampleRate);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < channelData.length; i++) {
      const t = i / context.sampleRate;
      const envelope = Math.exp(-t * 15) * (1 - Math.exp(-t * 40)); // Attack then decay
      const noise = (Math.random() - 0.5) * 0.2;
      const sweep = Math.sin(2 * Math.PI * (400 + t * 200) * t) * 0.1; // Frequency sweep
      channelData[i] = (noise + sweep) * envelope;
    }
    
    return this.bufferToWav(buffer);
  }

  private createShuffleSound(): string {
    // Generate a longer "rustling" sound for shuffling
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buffer = context.createBuffer(1, context.sampleRate * 0.8, context.sampleRate);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < channelData.length; i++) {
      const t = i / context.sampleRate;
      const envelope = Math.sin(Math.PI * t / 0.8); // Smooth fade in and out
      const noise = (Math.random() - 0.5) * 0.4;
      const filtered = noise * Math.exp(-Math.abs(noise) * 2); // Filtered noise
      channelData[i] = filtered * envelope;
    }
    
    return this.bufferToWav(buffer);
  }

  private createChipSound(): string {
    // Generate a "clink" sound for chip placement
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buffer = context.createBuffer(1, context.sampleRate * 0.15, context.sampleRate);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < channelData.length; i++) {
      const t = i / context.sampleRate;
      const envelope = Math.exp(-t * 25);
      const tone1 = Math.sin(2 * Math.PI * 1200 * t);
      const tone2 = Math.sin(2 * Math.PI * 800 * t) * 0.5;
      channelData[i] = (tone1 + tone2) * envelope * 0.2;
    }
    
    return this.bufferToWav(buffer);
  }

  private bufferToWav(buffer: AudioBuffer): string {
    // Convert AudioBuffer to WAV data URL
    const length = buffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    const channelData = buffer.getChannelData(0);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // PCM samples
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
    
    const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  play(sound: SoundEffect, delay: number = 0) {
    if (!this.enabled) return;
    
    setTimeout(() => {
      const audio = this.sounds.get(sound);
      if (audio) {
        // Reset to beginning and play
        audio.currentTime = 0;
        audio.play().catch(error => {
          console.log('Audio play prevented by browser policy:', error);
        });
      }
    }, delay);
  }

  setVolume(sound: SoundEffect, volume: number) {
    const audio = this.sounds.get(sound);
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

// Export singleton instance
export const audioManager = new AudioManager();

// React hook for using audio in components
export function useAudio() {
  return {
    playCardDeal: (delay?: number) => audioManager.play('card-deal', delay),
    playCardFlip: (delay?: number) => audioManager.play('card-flip', delay),
    playCardShuffle: (delay?: number) => audioManager.play('card-shuffle', delay),
    playChipDrop: (delay?: number) => audioManager.play('chip-drop', delay),
    setEnabled: (enabled: boolean) => audioManager.setEnabled(enabled),
    isEnabled: () => audioManager.isEnabled(),
  };
}