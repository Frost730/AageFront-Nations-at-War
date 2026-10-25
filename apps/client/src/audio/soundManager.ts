export class SoundManager {
  private ctx: AudioContext | null = null;
  private sfxVolume: number = 0.5;
  private musicVolume: number = 0.3;
  private isMuted: boolean = false;
  private isMusicPlaying: boolean = false;
  private musicInterval: any = null;

  constructor() {
    const savedSfx = localStorage.getItem('agefront_sfx_vol');
    const savedMusic = localStorage.getItem('agefront_music_vol');
    if (savedSfx !== null) this.sfxVolume = parseFloat(savedSfx);
    if (savedMusic !== null) this.musicVolume = parseFloat(savedMusic);
  }

  private initContext(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    localStorage.setItem('agefront_sfx_vol', this.sfxVolume.toString());
  }

  public setMusicVolume(vol: number): void {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    localStorage.setItem('agefront_music_vol', this.musicVolume.toString());
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  
  public playCoin(): void {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1760, now); // A6
    osc1.frequency.setValueAtTime(2637, now + 0.08); // E7

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(2093, now); // C7
    osc2.frequency.setValueAtTime(3136, now + 0.08); // G7

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.18 * this.sfxVolume, now + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }

  public playClick(): void {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    // Authentic Age of Empires wood-block & parchment click
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    const gain2 = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(850, now);
    osc1.frequency.exponentialRampToValueAtTime(320, now + 0.035);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1650, now);
    osc2.frequency.exponentialRampToValueAtTime(700, now + 0.025);

    gain1.gain.setValueAtTime(0.22 * this.sfxVolume, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    gain2.gain.setValueAtTime(0.12 * this.sfxVolume, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(this.ctx.destination);
    gain2.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.04);
    osc2.stop(now + 0.03);
  }

  public playError(): void {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    // Dull wood thud / muted horn buzzer
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.14);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);

    gain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  
  private lastVocalBarkTime: number = 0;
  private lastCombatHitTime: number = 0;

  /**
   * Smooth, authoritative unit voice commentary for selection & tactical orders.
   */
  public playUnitVocalBark(type: 'select' | 'move' | 'attack' | 'work', unitType: string = 'basic_infantry'): void {
    if (this.isMuted || this.sfxVolume <= 0) return;
    const now = performance.now();
    if (now - this.lastVocalBarkTime < 1100) return; // 1.1s natural pause
    this.lastVocalBarkTime = now;

    const isWorker = unitType === 'worker';
    let phrases: string[];

    if (type === 'select') {
      phrases = isWorker 
        ? ['Ready to work.', 'Orders received.', 'Yes, Sire?', 'Mandatum?']
        : ['Standing ready.', 'At your command.', 'Awaiting orders.', 'Imperator!'];
    } else if (type === 'move') {
      phrases = isWorker
        ? ['Right away.', 'Moving now.', 'On my way.', 'Properandum.']
        : ['Marching out.', 'Moving forward.', 'Understood.', 'Audentes!'];
    } else if (type === 'attack') {
      phrases = ['To arms!', 'Charge!', 'Engaging enemy!', 'Ad victoriam!'];
    } else { // work
      phrases = ['Constructing now.', 'Right away.', 'Harvesting resources.', 'Laboro.'];
    }

    const phrase = phrases[Math.floor(Math.random() * phrases.length)];

    // Smooth Web Speech Synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel(); // Prevent voice overlapping or queuing
        const utter = new SpeechSynthesisUtterance(phrase);
        utter.volume = Math.min(1.0, 0.75 * this.sfxVolume);
        utter.rate = isWorker ? 1.0 : 0.95;
        utter.pitch = isWorker ? 1.02 : 0.92;
        
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => 
          (v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('David') || v.name.includes('George') || v.name.includes('Male')) &&
          !v.name.includes('Zira')
        ) || voices.find(v => v.lang.startsWith('en')) || voices.find(v => v.lang.includes('it') || v.lang.includes('es'));
        
        if (preferred) utter.voice = preferred;
        window.speechSynthesis.speak(utter);
      } catch (e) {
        // Fallback gracefully
      }
    }
  }

  public playSelect(unitType?: string): void {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    // Authentic Age of Empires unit selection trumpet / horn flourish
    const now = this.ctx.currentTime;
    const oscFund = this.ctx.createOscillator();
    const oscHarm = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    oscFund.type = 'sawtooth';
    oscFund.frequency.setValueAtTime(349.23, now); // F4

    oscHarm.type = 'triangle';
    oscHarm.frequency.setValueAtTime(698.46, now); // F5

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.exponentialRampToValueAtTime(900, now + 0.12);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.25 * this.sfxVolume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    oscFund.connect(filter);
    oscHarm.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    oscFund.start(now);
    oscHarm.start(now);
    oscFund.stop(now + 0.13);
    oscHarm.stop(now + 0.13);
  }

  public playOrder(unitType?: string): void {
    this.playUnitVocalBark('move', unitType);
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    // Affirmative military brass fifth: G4 (392Hz) leaping to D5 (587.33Hz)
    const now = this.ctx.currentTime;
    const notes = [
      { f: 392.00, t: 0, d: 0.06 },
      { f: 587.33, t: 0.05, d: 0.10 }
    ];

    notes.forEach(n => {
      const osc = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.f, now + n.t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, now + n.t);

      gain.gain.setValueAtTime(0.01, now + n.t);
      gain.gain.linearRampToValueAtTime(0.22 * this.sfxVolume, now + n.t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, now + n.t + n.d);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + n.t);
      osc.stop(now + n.t + n.d);
    });
  }

  /**
   * Played when the player issues an attack order.
   */
  public playAttackOrder(unitType?: string): void {
    this.playUnitVocalBark('attack', unitType);
  }

  /**
   * Realistic physical combat fight noise on weapon impacts, sword clashes, and siege explosions.
   */
  public playCombatHit(attackerType: string = 'basic_infantry'): void {
    if (this.isMuted || this.sfxVolume <= 0) return;
    const nowMs = performance.now();
    if (nowMs - this.lastCombatHitTime < 75) return; // 75ms throttle for crisp battlefield soundscape
    this.lastCombatHitTime = nowMs;

    this.initContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const pitchMod = 0.92 + Math.random() * 0.16; // Organic pitch variation

    if (attackerType === 'ranged_infantry') {
      this.playArrowHitSound(now, pitchMod);
    } else if (attackerType === 'siege_unit') {
      this.playSiegeImpactSound(now, pitchMod);
    } else {
      this.playMeleeClashSound(now, pitchMod, attackerType);
    }
  }

  private playMeleeClashSound(now: number, pitchMod: number, unitType: string): void {
    if (!this.ctx) return;

    // 1. Sharp Metal Scrape Transient (Friction of crossing blades)
    const scrapeBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.04), this.ctx.sampleRate);
    const scrapeData = scrapeBuf.getChannelData(0);
    for (let i = 0; i < scrapeData.length; i++) {
      scrapeData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (scrapeData.length * 0.25));
    }
    const scrapeSrc = this.ctx.createBufferSource();
    scrapeSrc.buffer = scrapeBuf;

    const scrapeFilter = this.ctx.createBiquadFilter();
    scrapeFilter.type = 'bandpass';
    scrapeFilter.frequency.setValueAtTime(2600 * pitchMod, now);
    scrapeFilter.Q.setValueAtTime(3.5, now);

    const scrapeGain = this.ctx.createGain();
    scrapeGain.gain.setValueAtTime(0.18 * this.sfxVolume, now);
    scrapeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    scrapeSrc.connect(scrapeFilter);
    scrapeFilter.connect(scrapeGain);
    scrapeGain.connect(this.ctx.destination);
    scrapeSrc.start(now);

    // 2. Ringing Forged Steel Harmonics (Crystalline metallic ring)
    const ringFreqs = unitType === 'advanced_unit' 
      ? [2200 * pitchMod, 3450 * pitchMod, 4900 * pitchMod]
      : [2800 * pitchMod, 3950 * pitchMod, 5300 * pitchMod];

    ringFreqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const decay = 0.12 + idx * 0.04;
      gain.gain.setValueAtTime(0.09 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now);
      osc.stop(now + decay + 0.02);
    });

    // 3. Heavy Physical Armor / Body Thud (Low-end chest impact)
    const thudOsc = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();

    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(160 * pitchMod, now);
    thudOsc.frequency.exponentialRampToValueAtTime(45 * pitchMod, now + 0.07);

    thudGain.gain.setValueAtTime(0.22 * this.sfxVolume, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    thudOsc.connect(thudGain);
    thudGain.connect(this.ctx.destination);

    thudOsc.start(now);
    thudOsc.stop(now + 0.08);
  }

  private playArrowHitSound(now: number, pitchMod: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420 * pitchMod, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.05);

    gain.gain.setValueAtTime(0.24 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);

    const noiseBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.035), this.ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.3));

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400 * pitchMod, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15 * this.sfxVolume, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(now);
  }

  private playSiegeImpactSound(now: number, pitchMod: number): void {
    if (!this.ctx) return;
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(75 * pitchMod, now);
    subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.35);

    subGain.gain.setValueAtTime(0.35 * this.sfxVolume, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);

    subOsc.start(now);
    subOsc.stop(now + 0.36);

    const noiseBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.22), this.ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.4));

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800 * pitchMod, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.28 * this.sfxVolume, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(now);
  }

  public playAttack(unitType?: string): void {
    this.playCombatHit(unitType);
  }

  public playBuild(): void {
    this.playUnitVocalBark('work', 'worker');
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    // Construction hammer impact: sharp strike + wooden beam thump
    const now = this.ctx.currentTime;

    // Sharp hammer strike
    const oscHammer = this.ctx.createOscillator();
    const gainHammer = this.ctx.createGain();
    oscHammer.type = 'triangle';
    oscHammer.frequency.setValueAtTime(1400, now);
    oscHammer.frequency.exponentialRampToValueAtTime(450, now + 0.04);
    gainHammer.gain.setValueAtTime(0.2 * this.sfxVolume, now);
    gainHammer.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    oscHammer.connect(gainHammer);
    gainHammer.connect(this.ctx.destination);
    oscHammer.start(now);
    oscHammer.stop(now + 0.05);

    // Deep wood/stone beam resonance
    const oscBeam = this.ctx.createOscillator();
    const gainBeam = this.ctx.createGain();
    oscBeam.type = 'sine';
    oscBeam.frequency.setValueAtTime(190, now);
    oscBeam.frequency.exponentialRampToValueAtTime(90, now + 0.08);
    gainBeam.gain.setValueAtTime(0.25 * this.sfxVolume, now);
    gainBeam.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    oscBeam.connect(gainBeam);
    gainBeam.connect(this.ctx.destination);
    oscBeam.start(now);
    oscBeam.stop(now + 0.1);
  }

  public playTrainUnit(): void {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    // Military deployment bugle fanfare (G4, C5, E5)
    const now = this.ctx.currentTime;
    const notes = [
      { f: 392.00, t: 0, d: 0.08 },
      { f: 523.25, t: 0.07, d: 0.08 },
      { f: 659.25, t: 0.14, d: 0.16 }
    ];

    notes.forEach(n => {
      const osc = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.f, now + n.t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, now + n.t);

      gain.gain.setValueAtTime(0.01, now + n.t);
      gain.gain.linearRampToValueAtTime(0.25 * this.sfxVolume, now + n.t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.01, now + n.t + n.d);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.02);
    });
  }

  public playAgeUp(): void {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    // The iconic Age of Empires Cathedral Chimes & Imperial Brass Fanfare
    const now = this.ctx.currentTime;

    // 1. Shimmering Cathedral Bell Chimes (C5, G5, C6, E6 inharmonic ring)
    const bellPitches = [523.25, 783.99, 1046.50, 1318.51, 2093.00];
    bellPitches.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.16 * this.sfxVolume, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 1.8);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 1.85);
    });

    // 2. Imperial Brass Triad Chords (C4, G4, C5, E5)
    const brassChords = [
      { f: 261.63, delay: 0.12, dur: 0.9 },
      { f: 392.00, delay: 0.18, dur: 1.1 },
      { f: 523.25, delay: 0.24, dur: 1.2 },
      { f: 659.25, delay: 0.30, dur: 1.4 }
    ];

    brassChords.forEach(c => {
      const osc = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(c.f, now + c.delay);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, now + c.delay);

      gain.gain.setValueAtTime(0.01, now + c.delay);
      gain.gain.linearRampToValueAtTime(0.24 * this.sfxVolume, now + c.delay + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + c.delay + c.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + c.delay);
      osc.stop(now + c.delay + c.dur + 0.05);
    });
  }

  public playVictory(): void {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    // Triumphant Age of Empires Royal Fanfare with bells
    const now = this.ctx.currentTime;
    const chords = [
      [261.63, 329.63, 392.00], // C major
      [293.66, 369.99, 440.00], // D major
      [349.23, 440.00, 523.25], // F major
      [523.25, 659.25, 783.99, 1046.50] // High C grand climax
    ];

    chords.forEach((chord, step) => {
      chord.forEach(freq => {
        const osc = this.ctx!.createOscillator();
        const filter = this.ctx!.createBiquadFilter();
        const gain = this.ctx!.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + step * 0.32);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2200, now + step * 0.32);

        gain.gain.setValueAtTime(0.01, now + step * 0.32);
        gain.gain.linearRampToValueAtTime(0.26 * this.sfxVolume, now + step * 0.32 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + step * 0.32 + 0.85);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + step * 0.32);
        osc.stop(now + step * 0.32 + 0.9);
      });
    });
  }

  public playDefeat(): void {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    // Solemn descending minor brass & tolling bell
    const now = this.ctx.currentTime;
    const notes = [220, 207.65, 196, 146.83]; // A3, G#3, G3, D3
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.4);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now + idx * 0.4);

      gain.gain.setValueAtTime(0.24 * this.sfxVolume, now + idx * 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.4 + 0.8);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + idx * 0.4);
      osc.stop(now + idx * 0.4 + 0.85);
    });
  }

  public startAmbientMusic(): void {
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.initContext();

    const scale = [196, 220, 246.94, 261.63, 293.66, 329.63, 392]; // G major pentatonic/folk
    let noteIndex = 0;

    this.musicInterval = setInterval(() => {
      if (this.isMuted || this.musicVolume <= 0 || !this.ctx) return;

      const freq = scale[noteIndex % scale.length];
      noteIndex = (noteIndex + Math.floor(Math.random() * 3 + 1)) % scale.length;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.08 * this.musicVolume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 1.2);
    }, 700);
  }

  public stopAmbientMusic(): void {
    this.isMusicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const soundManager = new SoundManager();
