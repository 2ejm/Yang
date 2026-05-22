// Procedural Sound Effects Synthesizer using Web Audio API for Sheep Random Defense

class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Lazy initialize to bypass browser autoplay restrictions
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      } catch (e) {
        console.error('Web Audio API not supported', e);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getMuteState(): boolean {
    return this.isMuted;
  }

  /**
   * Synthesizes a realistic / quirky sheep "Baa" bleat!
   * Uses frequency modulation and rapid ampltiude LFO wobbles to mimic a sheep bleat.
   */
  public playBaa(pitchScale: number = 1.0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = 0.5 + Math.random() * 0.2;

    // Main carrier oscillator (nasal, slightly buzz-like sawtooth + triangle)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    
    // Low Frequency Oscillator for tremolo (rapid volume wobbling "b-a-a-a-h")
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();

    const mainGain = this.ctx.createGain();
    const lowpass = this.ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';

    // Sheep fundamental frequency around 230Hz (modified by pitch scale)
    const baseFreq = (220 + Math.random() * 40) * pitchScale;
    osc1.frequency.setValueAtTime(baseFreq, now);
    osc2.frequency.setValueAtTime(baseFreq * 1.01, now); // slightly detuned

    // Connect oscillators
    osc1.connect(mainGain);
    osc2.connect(mainGain);
    mainGain.connect(lowpass);
    lowpass.connect(this.ctx.destination);

    // Filter configuration for nasal, vocal tract sound
    lowpass.type = 'bandpass';
    lowpass.frequency.setValueAtTime(800, now);
    lowpass.Q.setValueAtTime(2.0, now);
    lowpass.frequency.exponentialRampToValueAtTime(450, now + duration);

    // Main envelope
    mainGain.gain.setValueAtTime(0, now);
    mainGain.gain.linearRampToValueAtTime(0.08, now + 0.05); // quick attack
    mainGain.gain.exponentialRampToValueAtTime(0.04, now + duration * 0.5);
    mainGain.gain.linearRampToValueAtTime(0.001, now + duration); // decay

    // Tremolo LFO setup (vibrates volume at 9Hz)
    lfo.frequency.setValueAtTime(9 + Math.random() * 3, now);
    lfoGain.gain.setValueAtTime(0.025, now);
    lfoGain.gain.linearRampToValueAtTime(0.015, now + duration);

    lfo.connect(lfoGain);
    lfoGain.connect(mainGain.gain); // Modulates volume!

    // Wobble frequency slightly too
    const fLfo = this.ctx.createOscillator();
    const fLfoGain = this.ctx.createGain();
    fLfo.frequency.setValueAtTime(8, now);
    fLfoGain.gain.setValueAtTime(10, now); // 10Hz pitch wobble
    fLfo.connect(fLfoGain);
    fLfoGain.connect(osc1.frequency);
    fLfoGain.connect(osc2.frequency);

    // Start everything
    osc1.start(now);
    osc2.start(now);
    lfo.start(now);
    fLfo.start(now);

    osc1.stop(now + duration);
    osc2.stop(now + duration);
    lfo.stop(now + duration);
    fLfo.stop(now + duration);
  }

  /**
   * Procedural shooting sounds for different sheep attack types
   */
  public playShoot(type: 'normal' | 'fire' | 'freeze' | 'lightning' | 'poison') {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    if (type === 'normal') {
      // Light "pop" or soft projectile throw
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);
      
      gainNode.gain.setValueAtTime(0.05, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      
      osc.start(now);
      osc.stop(now + 0.12);
    } 
    else if (type === 'fire') {
      // Flamethrower/fire plume "whoosh" sound
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.2);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);

      osc.disconnect(gainNode);
      osc.connect(filter);
      filter.connect(gainNode);

      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.start(now);
      osc.stop(now + 0.2);
    } 
    else if (type === 'freeze') {
      // Icy bell chime sweep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);

      gainNode.gain.setValueAtTime(0.03, now);
      gainNode.gain.linearRampToValueAtTime(0.001, now + 0.15);

      osc.start(now);
      osc.stop(now + 0.15);
    } 
    else if (type === 'lightning') {
      // Spark zapping buzz
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.setValueAtTime(900, now + 0.03);
      osc.frequency.setValueAtTime(200, now + 0.06);

      gainNode.gain.setValueAtTime(0.04, now);
      gainNode.gain.setValueAtTime(0.02, now + 0.04);
      gainNode.gain.linearRampToValueAtTime(0.001, now + 0.1);

      osc.start(now);
      osc.stop(now + 0.1);
    } 
    else if (type === 'poison') {
      // Sizzling liquid squirt
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);

      gainNode.gain.setValueAtTime(0.02, now);
      gainNode.gain.linearRampToValueAtTime(0.001, now + 0.1);

      osc.start(now);
      osc.stop(now + 0.1);
    }
  }

  /**
   * Sound indicating a projectile hit an enemy
   */
  public playHit(type: 'normal' | 'fire' | 'freeze' | 'lightning' | 'poison') {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    if (type === 'fire') {
      // Fire splash blast (low rumble crush)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, now);
      osc.disconnect(gainNode);
      osc.connect(filter);
      filter.connect(gainNode);

      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.linearRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } 
    else if (type === 'freeze') {
      // Freeze shatter (crackling glass sound)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1320, now + 0.03);
      osc.frequency.setValueAtTime(1760, now + 0.06);

      gainNode.gain.setValueAtTime(0.03, now);
      gainNode.gain.linearRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } 
    else {
      // Minor generic hit
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.06);

      gainNode.gain.setValueAtTime(0.03, now);
      gainNode.gain.linearRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    }
  }

  /**
   * Shimmering coin sound for gold collections / income ticking
   */
  public playCoin() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, now); // B5
    osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, now); // D6
    osc2.frequency.setValueAtTime(1567.98, now + 0.08); // G6

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }

  /**
   * Harmonious arpeggio chime when combining 3 identical sheep to upgrade
   */
  public playMerge() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // C major arpeggio upward sweep (C4, E4, G4, C5, E5, G5)
    const pitches = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
    
    pitches.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      
      gainNode.gain.setValueAtTime(0.04, now + i * 0.04);
      gainNode.gain.setValueAtTime(0.04, now + i * 0.04 + 0.05);
      gainNode.gain.linearRampToValueAtTime(0.001, now + i * 0.04 + 0.15);

      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.15);
    });

    // Sub base swell
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.connect(subGain);
    subGain.connect(this.ctx.destination);
    
    sub.type = 'sine';
    sub.frequency.setValueAtTime(130.81, now); // C3
    sub.frequency.exponentialRampToValueAtTime(261.63, now + 0.3);
    
    subGain.gain.setValueAtTime(0.06, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    
    sub.start(now);
    sub.stop(now + 0.35);
  }

  /**
   * Sound indicating wolves are gnawing on the defensive fence! (Wood cracking crunch)
   */
  public playFenceDamage() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = 0.15;

    // Create a burst of white noise for the wooden crunch
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(250, now);
    filter.Q.setValueAtTime(3.0, now);

    const gain = this.ctx.createGain();
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Add low bass hit
    const hit = this.ctx.createOscillator();
    const hitGain = this.ctx.createGain();
    hit.type = 'triangle';
    hit.frequency.setValueAtTime(80, now);
    hit.frequency.exponentialRampToValueAtTime(30, now + duration);
    
    hit.connect(hitGain);
    hitGain.connect(this.ctx.destination);
    hitGain.gain.setValueAtTime(0.15, now);
    hitGain.gain.linearRampToValueAtTime(0.001, now + duration);

    noise.start(now);
    noise.stop(now + duration);
    hit.start(now);
    hit.stop(now + duration);
  }

  /**
   * Synthesizes an eerie, thrilling Wolf Howl + alert alarm when a new wave starts!
   * Pitch sweep from medium to high, then vibrating and sliding down.
   */
  public playWaveAlert() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = 1.2;

    // Howl carrier
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const lowpass = this.ctx.createBiquadFilter();

    osc.connect(gainNode);
    gainNode.connect(lowpass);
    lowpass.connect(this.ctx.destination);

    // Vocal quality bandpass
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(600, now);

    // Howl fundamental frequency curves: starts low (150Hz), climbs high (550Hz), then decays down
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.35); // quick howl rise
    osc.frequency.linearRampToValueAtTime(500, now + 0.7);      // howl wobble top
    osc.frequency.exponentialRampToValueAtTime(110, now + duration); // fade down

    // Howl envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.06, now + 0.2); // swell
    gainNode.gain.setValueAtTime(0.06, now + 0.7);
    gainNode.gain.linearRampToValueAtTime(0.001, now + duration);

    // Howl LFO for the animalistic vibrato
    const vibrato = this.ctx.createOscillator();
    const vibratoGain = this.ctx.createGain();
    vibrato.frequency.setValueAtTime(6, now); // 6Hz vibrato
    vibratoGain.gain.setValueAtTime(15, now); // vibrato amplitude
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);

    vibrato.start(now);
    vibrato.stop(now + duration);

    osc.start(now);
    osc.stop(now + duration);

    // Secondary sub horn sweep representing threat
    const horn = this.ctx.createOscillator();
    const hornGain = this.ctx.createGain();
    horn.type = 'triangle';
    horn.frequency.setValueAtTime(75, now);
    horn.frequency.linearRampToValueAtTime(85, now + 0.5);
    horn.frequency.exponentialRampToValueAtTime(40, now + 1.0);

    horn.connect(hornGain);
    hornGain.connect(this.ctx.destination);
    hornGain.gain.setValueAtTime(0, now);
    hornGain.gain.linearRampToValueAtTime(0.06, now + 0.15);
    hornGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    horn.start(now);
    horn.stop(now + 1.0);
  }
}

export const sfx = new AudioEngine();
