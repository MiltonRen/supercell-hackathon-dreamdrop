/**
 * Sound Synthesizer - Real-time audio synthesis for game sound effects
 * Uses Web Audio API to generate cute, funky sounds procedurally
 */

class SoundSynthesizer {
  private audioContext: AudioContext | null = null;

  /**
   * Initialize the audio context (lazy initialization)
   * Note: Some browsers require user interaction before creating AudioContext
   */
  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  /**
   * Play a rising pitch "bloop" sound for picking up blocks
   * Characteristics: Bright, cheerful, upward sweep
   */
  playPickupSound(): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      // Create oscillator for the main tone
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Use triangle wave for a softer, rounder tone
      osc.type = 'triangle';

      // Rising frequency sweep: 300Hz -> 800Hz
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);

      // Low-pass filter for warmth
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, now);
      filter.Q.setValueAtTime(1, now);

      // ADSR envelope: quick attack, short sustain, quick release
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02); // Attack
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.08); // Sustain
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2); // Release

      // Connect the audio graph
      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Play the sound
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (error) {
      console.warn('Failed to play pickup sound:', error);
    }
  }

  /**
   * Play a descending pitch "plop" sound for dropping blocks
   * Characteristics: Soft, bouncy, downward sweep
   */
  playDropSound(): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      // Create oscillator for the main tone
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Use sine wave for a smooth, mellow tone
      osc.type = 'sine';

      // Descending frequency sweep: 500Hz -> 150Hz
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.25);

      // Low-pass filter with resonance for "plop" character
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(400, now + 0.25);
      filter.Q.setValueAtTime(3, now);

      // ADSR envelope: medium attack, gentle release
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.25, now + 0.03); // Attack
      gainNode.gain.linearRampToValueAtTime(0.18, now + 0.1); // Sustain
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3); // Release

      // Connect the audio graph
      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Play the sound
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (error) {
      console.warn('Failed to play drop sound:', error);
    }
  }

  /**
   * Play a sparkly "ding" sound for generating new blocks
   * Characteristics: Multi-tone, shimmer effect, magical feel
   */
  playGenerateSound(): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      // Create multiple oscillators for a rich, sparkly sound
      const frequencies = [800, 1000, 1200, 1600]; // Harmonious intervals
      const masterGain = ctx.createGain();

      frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const delay = index * 0.1; // Slight stagger for shimmer effect

        // Use sine waves for pure, bell-like tones
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);

        // Add slight vibrato for sparkle
        osc.frequency.exponentialRampToValueAtTime(freq * 0.98, now + delay + 0.3);

        // Individual envelope for each tone
        const volume = 0.3 / frequencies.length; // Normalize volume
        gainNode.gain.setValueAtTime(0, now + delay);
        gainNode.gain.linearRampToValueAtTime(volume, now + delay + 0.01); // Quick attack
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.4); // Long release

        // Connect to master gain
        osc.connect(gainNode);
        gainNode.connect(masterGain);

        // Play the tone
        osc.start(now + delay);
        osc.stop(now + delay + 0.4);
      });

      // Master gain with slight compression
      masterGain.gain.setValueAtTime(1, now);
      masterGain.connect(ctx.destination);

    } catch (error) {
      console.warn('Failed to play generate sound:', error);
    }
  }

  /**
   * Resume audio context if it's suspended (required by some browsers)
   * Call this on user interaction if needed
   */
  async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
}

// Export a singleton instance
export const soundSynthesizer = new SoundSynthesizer();
