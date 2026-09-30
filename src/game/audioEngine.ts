/**
 * Dynamic Web Audio API Sound Design Engine
 * Synthesizes bone-crunching hits, ring canvas impacts, steel chair clangs,
 * referee 3-counts, crowd roars, and heavy arena rock riffs.
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private crowdGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isMusicMuted: boolean = false;
  private crowdNoiseNode: AudioNode | null = null;
  private musicInterval: number | null = null;
  private isInitialized: boolean = false;

  public init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.crowdGain = this.ctx.createGain();
      this.crowdGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      this.crowdGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.initCrowdAmbiance();
      this.startArenaRockBGM();
      this.isInitialized = true;
    } catch {
      // Audio context might be restricted until user interaction
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.isMuted = !enabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(enabled ? 0.85 : 0, this.ctx.currentTime);
    }
  }

  public setMusicEnabled(enabled: boolean) {
    this.isMusicMuted = !enabled;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(enabled ? 0.4 : 0, this.ctx.currentTime);
    }
  }

  /**
   * Flesh-on-flesh punch or kick strike
   */
  public playStrike(heavy: boolean = false) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Transient slap (filtered white noise)
    const bufferSize = this.ctx.sampleRate * (heavy ? 0.12 : 0.08);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(heavy ? 1200 : 1800, now);
    noiseFilter.Q.setValueAtTime(2.5, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(heavy ? 0.9 : 0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.12 : 0.08));

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain!);

    whiteNoise.start(now);

    // Punch body thud (oscillator drop)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(heavy ? 220 : 160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + (heavy ? 0.14 : 0.09));

    oscGain.gain.setValueAtTime(heavy ? 0.8 : 0.5, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.14 : 0.09));

    osc.connect(oscGain);
    oscGain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + (heavy ? 0.15 : 0.1));
  }

  /**
   * Heavy canvas ring mat slam / powerbomb / suplex impact
   */
  public playMatSlam(massive: boolean = false) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Sub-bass canvas thump (low sine drop)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(massive ? 130 : 95, now);
    subOsc.frequency.exponentialRampToValueAtTime(25, now + (massive ? 0.45 : 0.3));

    subGain.gain.setValueAtTime(massive ? 1.0 : 0.8, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + (massive ? 0.45 : 0.3));

    subOsc.connect(subGain);
    subGain.connect(this.masterGain!);
    subOsc.start(now);
    subOsc.stop(now + (massive ? 0.45 : 0.3));

    // Wooden ring canvas slap
    const bufferSize = this.ctx.sampleRate * 0.15;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.04));
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain!);

    noiseSource.start(now);

    // Trigger crowd reaction if massive bump
    if (massive) {
      this.playCrowdRoar(0.6);
    }
  }

  /**
   * Iconic Steel Folding Chair Shot
   */
  public playChairClang() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // High metal resonant harmonic ring
    const freqs = [620, 890, 1420, 2150, 3400];
    freqs.forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = idx % 2 === 0 ? 'square' : 'sawtooth';
      osc.frequency.setValueAtTime(f, now);

      const decay = 0.35 + idx * 0.08;
      gain.gain.setValueAtTime(0.3 / (idx + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + decay);
    });

    // Sharp metallic crack transient
    this.playStrike(true);
    this.playCrowdRoar(0.5);
  }

  /**
   * Ring rope tension snap / Irish whip bounce
   */
  public playRopeSnap() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.18);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Counter / Reversal sting sound
   */
  public playCounterSting() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.08);
    osc.frequency.linearRampToValueAtTime(1320, now + 0.15);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * "RED SMACKDOWN" Finisher Blast!
   */
  public playRedSmackFinisher() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Deep cinematic impact boom
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(20, now + 0.9);

    subGain.gain.setValueAtTime(1.0, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain!);
    subOsc.start(now);
    subOsc.stop(now + 1.0);

    // Dynamic high energy guitar blast chord
    [130.81, 196.0, 261.63, 392.0].forEach((freq) => {
      const gOsc = this.ctx!.createOscillator();
      const gGain = this.ctx!.createGain();
      gOsc.type = 'sawtooth';
      gOsc.frequency.setValueAtTime(freq, now);

      gGain.gain.setValueAtTime(0.3, now);
      gGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      gOsc.connect(gGain);
      gGain.connect(this.masterGain!);
      gOsc.start(now);
      gOsc.stop(now + 0.7);
    });

    this.playCrowdRoar(1.0);
    this.playCrowdChant('holy_shit');
  }

  /**
   * Rhythmic Stadium Hand Clap
   */
  public playStadiumClap(delayOffset: number = 0) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime + delayOffset;

    // Sharp noise burst shaped with bandpass filter (simulating thousands clapping in an arena)
    const bufferSize = this.ctx.sampleRate * 0.08;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.015));
    }

    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, now);
    filter.Q.setValueAtTime(1.8, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noiseSrc.connect(filter);
    filter.connect(gain);
    gain.connect(this.crowdGain || this.masterGain!);

    noiseSrc.start(now);
  }

  /**
   * Synthesizes Formant Vowel Pulses for Human Crowd Chants
   */
  private playVocalFormantPulse(pitchHz: number, vowel: 'oh' | 'ah' | 'ay', startTime: number, duration: number = 0.22, volume: number = 0.4) {
    if (!this.ctx) return;

    // Formant frequencies for choir vowel simulation
    const formants = vowel === 'oh' 
      ? [500, 1000, 2400] 
      : vowel === 'ah' 
      ? [750, 1200, 2600] 
      : [400, 2000, 2800];

    // Detuned multi-voice harmonic source
    [-4, 0, 4].forEach((detuneCents) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(pitchHz, startTime);
      osc.detune.setValueAtTime(detuneCents, startTime);

      formants.forEach((fFreq, fIdx) => {
        const bp = this.ctx!.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(fFreq, startTime);
        bp.Q.setValueAtTime(4.0, startTime);

        const vGain = this.ctx!.createGain();
        vGain.gain.setValueAtTime((volume / (fIdx + 1)), startTime);
        vGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(bp);
        bp.connect(vGain);
        vGain.connect(this.crowdGain || this.masterGain!);
      });

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    });
  }

  /**
   * Context-Aware Dynamic Crowd Chants
   * Chants: 'lets_go', 'holy_shit', 'this_is_awesome', 'you_suck', 'kickout_gasp', 'boo_heel'
   */
  public playCrowdChant(type: 'lets_go' | 'holy_shit' | 'this_is_awesome' | 'you_suck' | 'kickout_gasp' | 'boo_heel', wrestlerName?: string) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Optional Browser Speech Synthesis for crisp, personalized arena chanting
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && !this.isMuted) {
      try {
        let chantVoiceText = '';
        const shortName = wrestlerName ? wrestlerName.replace(/^The\s+/i, '') : 'CHAMPION';

        if (type === 'lets_go') {
          chantVoiceText = `Let's go ${shortName}! Let's go ${shortName}!`;
        } else if (type === 'holy_shit') {
          chantVoiceText = 'Holy shit! Holy shit!';
        } else if (type === 'this_is_awesome') {
          chantVoiceText = 'This is awesome! This is awesome!';
        } else if (type === 'you_suck') {
          chantVoiceText = 'You suck! You suck!';
        }

        if (chantVoiceText) {
          const utter = new SpeechSynthesisUtterance(chantVoiceText);
          utter.rate = 1.12;
          utter.pitch = 0.95;
          utter.volume = 0.9;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utter);
        }
      } catch {
        // Fallback to synthesized formants
      }
    }

    switch (type) {
      case 'holy_shit':
        // Rhythmic "HO - LY - SHIT!" (3 pulses) followed by stadium claps
        [0, 0.4, 0.8].forEach((offset, idx) => {
          const t = now + offset;
          const pitch = idx === 2 ? 160 : 180;
          this.playVocalFormantPulse(pitch, idx === 0 ? 'oh' : 'ah', t, 0.28, 0.65);
        });
        // 3 heavy stadium claps
        [1.3, 1.6, 1.9].forEach((offset) => {
          this.playStadiumClap(offset);
        });
        this.playCrowdRoar(0.9);
        break;

      case 'this_is_awesome':
        // "THIS - IS - AWE - SOME!" (5-beat stadium cadence)
        [0, 0.35, 0.7, 1.05].forEach((offset, idx) => {
          const t = now + offset;
          const pitch = idx === 3 ? 150 : 175;
          this.playVocalFormantPulse(pitch, 'ah', t, 0.26, 0.6);
        });
        [1.4, 1.65, 1.9, 2.15, 2.4].forEach((offset) => {
          this.playStadiumClap(offset);
        });
        this.playCrowdRoar(0.75);
        break;

      case 'lets_go':
        // "LET'S - GO - [CHAMP]!" followed by 5 fast claps (👏 👏 👏👏👏)
        this.playVocalFormantPulse(170, 'ay', now, 0.25, 0.55);
        this.playVocalFormantPulse(160, 'oh', now + 0.35, 0.25, 0.55);
        this.playVocalFormantPulse(190, 'ah', now + 0.7, 0.32, 0.65);

        // 5 claps: clap ... clap ... clap-clap-clap
        [1.1, 1.45, 1.75, 1.9, 2.05].forEach((offset) => {
          this.playStadiumClap(offset);
        });
        break;

      case 'you_suck':
        // Iconic "YOU - SUCK!" (2 sharp horn/vocal cadence pulses)
        this.playVocalFormantPulse(180, 'oh', now, 0.3, 0.6);
        this.playVocalFormantPulse(135, 'ah', now + 0.45, 0.4, 0.65);
        this.playVocalFormantPulse(180, 'oh', now + 1.1, 0.3, 0.6);
        this.playVocalFormantPulse(135, 'ah', now + 1.55, 0.4, 0.65);
        break;

      case 'kickout_gasp':
        // Massive collective audience gasp on 2.9 count kickout!
        if (this.crowdGain) {
          this.crowdGain.gain.setValueAtTime(0.1, now);
          this.crowdGain.gain.linearRampToValueAtTime(0.75, now + 0.2);
          this.crowdGain.gain.exponentialRampToValueAtTime(0.25, now + 1.8);
        }
        this.playVocalFormantPulse(140, 'oh', now, 0.5, 0.45);
        break;

      case 'boo_heel':
        // Deep collective arena BOOOO! (low descending choir pitch)
        this.playVocalFormantPulse(115, 'oh', now, 1.2, 0.6);
        this.playVocalFormantPulse(105, 'oh', now + 0.1, 1.2, 0.5);
        break;
    }
  }

  /**
   * Ring Bell "DING DING DING!"
   */
  public playRingBell() {
    if (!this.ctx || this.isMuted) return;
    
    [0, 0.25, 0.5].forEach((offset) => {
      const now = this.ctx!.currentTime + offset;
      const osc1 = this.ctx!.createOscillator();
      const osc2 = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1180, now);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(2360, now);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain!);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.65);
      osc2.stop(now + 0.65);
    });
  }

  /**
   * Referee mat count slap: 1, 2, 3!
   */
  public playRefMatSlap(countNumber: number) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Hard slap on canvas
    this.playMatSlam(false);

    // Voice tone harmonic
    const voiceOsc = this.ctx.createOscillator();
    const voiceGain = this.ctx.createGain();
    voiceOsc.type = 'triangle';
    voiceOsc.frequency.setValueAtTime(180 + countNumber * 40, now);

    voiceGain.gain.setValueAtTime(0.4, now);
    voiceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    voiceOsc.connect(voiceGain);
    voiceGain.connect(this.masterGain!);
    voiceOsc.start(now);
    voiceOsc.stop(now + 0.22);
  }

  /**
   * Dynamic crowd roar on big moves or finisher
   */
  public playCrowdRoar(intensity: number = 0.5) {
    if (!this.crowdGain || !this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const targetGain = Math.min(0.9, 0.3 + intensity * 0.6);
    this.crowdGain.gain.cancelScheduledValues(now);
    this.crowdGain.gain.linearRampToValueAtTime(targetGain, now + 0.1);
    this.crowdGain.gain.exponentialRampToValueAtTime(0.25, now + 2.2);
  }

  /**
   * Continuous filtered crowd ambiance
   */
  private initCrowdAmbiance() {
    if (!this.ctx || !this.crowdGain) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(this.crowdGain);
    noiseSource.start();
    this.crowdNoiseNode = noiseSource;
  }

  /**
   * Retro 2000s WWE Arena Heavy Rock Bass Riff
   */
  private startArenaRockBGM() {
    if (!this.ctx || !this.musicGain) return;

    // Sequence of heavy drop-D bass notes
    const riff = [73.42, 73.42, 87.31, 73.42, 98.0, 92.5, 73.42, 110.0];
    let noteIndex = 0;

    const beatInterval = 280; // ~107 BPM heavy rock pulse

    this.musicInterval = window.setInterval(() => {
      if (!this.ctx || this.isMusicMuted || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const freq = riff[noteIndex % riff.length];
      noteIndex++;

      // Heavy distorted bass synth note
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(480, now);
      filter.Q.setValueAtTime(4, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain!);

      osc.start(now);
      osc.stop(now + 0.25);

      // Kick drum pulse every 2 beats
      if (noteIndex % 2 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(110, now);
        kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

        kickGain.gain.setValueAtTime(0.25, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        kickOsc.connect(kickGain);
        kickGain.connect(this.musicGain!);

        kickOsc.start(now);
        kickOsc.stop(now + 0.13);
      }
    }, beatInterval);
  }

  public dispose() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    if (this.crowdNoiseNode) {
      try {
        (this.crowdNoiseNode as AudioBufferSourceNode).stop();
      } catch {
        // ignore
      }
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const audioEngine = new AudioEngine();
