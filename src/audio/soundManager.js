/**
 * AAA Procedural Web Audio Sound Engine & In-Car Radio System
 * Uses the Web Audio API to synthesize responsive game audio with 0 external network dependencies.
 */

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.initialized = false;

    // Radio state
    this.radioStations = [
      { id: 'off', name: 'Radio Off', genre: 'Muted' },
      { id: 'synthwave', name: 'Synthwave 84.5 FM', genre: 'Retrowave / Synth' },
      { id: 'hiphop', name: 'Los Santos Beats 102.1', genre: 'West Coast Beats' },
      { id: 'cyber', name: 'Cyber Electro 99.9', genre: 'Electronic / Club' }
    ];
    this.currentStation = 0; // 0 = off, 1 = synthwave, 2 = hiphop, 3 = cyber
    this.radioPlaying = false;
    this.radioTimer = null;
    this.radioStep = 0;

    // Engine sound state
    this.engineGain = null;
    this.engineOsc = null;
    this.engineActive = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.initialized = true;
      this._setupEngine();
    } catch (e) {
      console.warn('Web Audio not available:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // ---------------------------------------------------------------------------
  // VEHICLE SFX (Engine, Drifting, Impacts, Horn)
  // ---------------------------------------------------------------------------
  _setupEngine() {
    if (!this.ctx) return;
    try {
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 280;

      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55; // Idle rumble

      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
    } catch (e) {}
  }

  updateEngine(speedKmh, isDriving = true) {
    if (!this.initialized || !this.ctx) return;
    if (!isDriving || this.isMuted) {
      if (this.engineGain) this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      return;
    }

    const absSpeed = Math.abs(speedKmh);
    const targetFreq = 50 + (absSpeed * 2.8) % 180 + (absSpeed > 50 ? 40 : 0);
    const targetFilter = Math.min(1200, 200 + absSpeed * 10);
    const targetVol = 0.04 + Math.min(0.08, (absSpeed / 120) * 0.08);

    if (this.engineOsc) this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.05);
    if (this.engineFilter) this.engineFilter.frequency.setTargetAtTime(targetFilter, this.ctx.currentTime, 0.05);
    if (this.engineGain) this.engineGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.05);
  }

  playTireSkid() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    try {
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.7));
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1400;
      filter.Q.value = 3.0;

      const gain = this.ctx.createGain();
      gain.gain.value = 0.08;

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      whiteNoise.start();
    } catch (e) {}
  }

  playCrash() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // Low punch oscillator
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {}
  }

  playHorn() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.frequency.value = 440; // A4
      osc2.frequency.value = 554.37; // C#5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // INTERACTIVE & UI SFX (Elevator, Cash, Door, Dialogue)
  // ---------------------------------------------------------------------------
  playElevatorChime() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // Ding: G5 then C6
      const playTone = (freq, time, dur) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + dur);
      };
      playTone(784, now, 0.4); // G5
      playTone(1046, now + 0.15, 0.6); // C6
    } catch (e) {}
  }

  playCashRegister() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const playBell = (freq, delay) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.35);
      };
      playBell(1200, 0);
      playBell(1600, 0.08);
      playBell(2400, 0.16);
    } catch (e) {}
  }

  playDrinkCan() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {}
  }

  playDialogueBlip() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480 + Math.random() * 80, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // IN-CAR PROCEDURAL RADIO SYSTEM (Synthwave / HipHop / Cyberpunk)
  // ---------------------------------------------------------------------------
  cycleRadio() {
    this.currentStation = (this.currentStation + 1) % this.radioStations.length;
    this.stopRadio();
    if (this.currentStation !== 0) {
      this.startRadio();
    }
    return this.radioStations[this.currentStation];
  }

  startRadio() {
    if (!this.initialized || !this.ctx || this.currentStation === 0) return;
    this.radioPlaying = true;
    this.radioStep = 0;
    this._playRadioStep();
  }

  stopRadio() {
    this.radioPlaying = false;
    if (this.radioTimer) {
      clearTimeout(this.radioTimer);
      this.radioTimer = null;
    }
  }

  _playRadioStep() {
    if (!this.radioPlaying || !this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const station = this.radioStations[this.currentStation].id;

    if (station === 'synthwave') {
      // 80s Synthwave bassline + lead arpeggio
      const bassNotes = [110, 110, 130.81, 146.83, 164.81, 146.83, 130.81, 110];
      const leadNotes = [440, 523.25, 659.25, 783.99, 659.25, 523.25, 440, 392];
      const noteIdx = this.radioStep % 8;

      // Bass note
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.value = bassNotes[noteIdx];
      bassGain.gain.setValueAtTime(0.04, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      bassOsc.connect(bassGain);
      bassGain.connect(this.ctx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + 0.22);

      // Lead note
      if (this.radioStep % 2 === 0) {
        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();
        leadOsc.type = 'sine';
        leadOsc.frequency.value = leadNotes[noteIdx];
        leadGain.gain.setValueAtTime(0.03, now);
        leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        leadOsc.connect(leadGain);
        leadGain.connect(this.ctx.destination);
        leadOsc.start(now);
        leadOsc.stop(now + 0.4);
      }

      this.radioStep++;
      this.radioTimer = setTimeout(() => this._playRadioStep(), 240); // 125 BPM 16th groove

    } else if (station === 'hiphop') {
      // West Coast Boom-Bap Groove
      const beat = this.radioStep % 8;
      // Kick on 0, 4, 6
      if (beat === 0 || beat === 4 || beat === 6) {
        const kick = this.ctx.createOscillator();
        const kGain = this.ctx.createGain();
        kick.frequency.setValueAtTime(120, now);
        kick.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        kGain.gain.setValueAtTime(0.08, now);
        kGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        kick.connect(kGain);
        kGain.connect(this.ctx.destination);
        kick.start(now);
        kick.stop(now + 0.18);
      }

      // Snare on 2, 6
      if (beat === 2 || beat === 6) {
        const snare = this.ctx.createOscillator();
        const sGain = this.ctx.createGain();
        snare.type = 'triangle';
        snare.frequency.setValueAtTime(220, now);
        sGain.gain.setValueAtTime(0.05, now);
        sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        snare.connect(sGain);
        sGain.connect(this.ctx.destination);
        snare.start(now);
        snare.stop(now + 0.12);
      }

      // Sub Bass
      const subNotes = [55, 55, 65.41, 73.42];
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.value = subNotes[Math.floor(beat / 2)];
      subGain.gain.setValueAtTime(0.05, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      sub.connect(subGain);
      subGain.connect(this.ctx.destination);
      sub.start(now);
      sub.stop(now + 0.3);

      this.radioStep++;
      this.radioTimer = setTimeout(() => this._playRadioStep(), 280);

    } else if (station === 'cyber') {
      // Fast Cyber Techno
      const notes = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = notes[this.radioStep % notes.length];
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);

      this.radioStep++;
      this.radioTimer = setTimeout(() => this._playRadioStep(), 150);
    }
  }
}
