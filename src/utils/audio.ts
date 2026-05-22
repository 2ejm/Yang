// Procedural Sound Effects Synthesizer using Web Audio API

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

  public playLaser(isEnemy: boolean = false) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    if (isEnemy) {
      // Enemy laser: harsher, descending tone
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
      
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else {
      // Player laser: futuristic, light chime-sweep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);

      // Add a quick secondary harmonic for punch
      const harm = this.ctx.createOscillator();
      const harmGain = this.ctx.createGain();
      harm.type = 'triangle';
      harm.frequency.setValueAtTime(1760, now);
      harm.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      harm.connect(harmGain);
      harmGain.connect(this.ctx.destination);
      
      harmGain.gain.setValueAtTime(0.04, now);
      harmGain.gain.linearRampToValueAtTime(0.001, now + 0.08);
      harm.start(now);
      harm.stop(now + 0.08);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  }

  public playExplosion(type: 'meteor' | 'pirate' | 'player') {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = type === 'player' ? 1.5 : type === 'pirate' ? 0.6 : 0.3;
    
    // Create noise buffer for crunchiness
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    // Filter to make it sound like an explosion (low-pass)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    
    if (type === 'player') {
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(50, now + duration);
    } else if (type === 'pirate') {
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + duration);
    } else {
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(150, now + duration);
    }

    const gainNode = this.ctx.createGain();
    
    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    // Deep sub boom for extra feedback
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(120, now);
    subOsc.frequency.exponentialRampToValueAtTime(20, now + duration);
    
    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);

    // Dynamic gain curves
    if (type === 'player') {
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
      
      subGain.gain.setValueAtTime(0.4, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.8);
    } else if (type === 'pirate') {
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

      subGain.gain.setValueAtTime(0.25, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    } else {
      // standard meteor crunch
      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.linearRampToValueAtTime(0.001, now + duration);

      subGain.gain.setValueAtTime(0.15, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    }

    noiseNode.start(now);
    noiseNode.stop(now + duration);
    
    subOsc.start(now);
    subOsc.stop(now + duration);
  }

  public playCrystalPickup(mineralType: 'common' | 'rare' | 'exotic') {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    
    let baseFreq = 523.25; // C5 (common)
    let extraFreq = 659.25; // E5
    let volume = 0.08;

    if (mineralType === 'rare') {
      baseFreq = 659.25; // E5 (rare)
      extraFreq = 783.99; // G5
      volume = 0.12;
    } else if (mineralType === 'exotic') {
      baseFreq = 783.99; // G5 (exotic)
      extraFreq = 987.77; // B5
      volume = 0.15;
    }

    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.setValueAtTime(extraFreq, now + 0.05);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.2);

    // Quick secondary chime layer
    const chime = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();
    chime.connect(chimeGain);
    chimeGain.connect(this.ctx.destination);
    
    chime.type = 'sine';
    chime.frequency.setValueAtTime(baseFreq * 2, now + 0.03);
    chimeGain.gain.setValueAtTime(volume * 0.4, now);
    chimeGain.gain.linearRampToValueAtTime(0.001, now + 0.25);
    
    chime.start(now);
    chime.stop(now + 0.25);
  }

  public playUpgrade() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const steps = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // Arpeggio C4 E4 G4 C5 E5 G5
    
    steps.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      
      gain.gain.setValueAtTime(0.06, now + idx * 0.05);
      gain.gain.linearRampToValueAtTime(0.001, now + idx * 0.05 + 0.15);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.15);
    });
  }

  public playDamage() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(60, now + 0.18);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.18);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playPirateAlert() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = 0.8;
    
    // Siren sound: rising-falling alarm
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(220, now);
    osc1.frequency.linearRampToValueAtTime(440, now + 0.25);
    osc1.frequency.linearRampToValueAtTime(220, now + 0.5);
    osc1.frequency.linearRampToValueAtTime(440, now + 0.75);

    osc2.frequency.setValueAtTime(223, now); // slightly detuned
    osc2.frequency.linearRampToValueAtTime(443, now + 0.25);
    osc2.frequency.linearRampToValueAtTime(223, now + 0.5);
    osc2.frequency.linearRampToValueAtTime(443, now + 0.75);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.linearRampToValueAtTime(0.04, now + duration - 0.1);
    gain.gain.linearRampToValueAtTime(0.001, now + duration);

    osc1.start(now);
    osc2.start(now);
    
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  }
}

export const sfx = new AudioEngine();
