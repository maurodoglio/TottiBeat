/**
 * TottiBeat – Metronome Application
 *
 * Architecture:
 *  - SoundEngine   – synthesises audio using the Web Audio API
 *  - Metronome     – precise scheduling loop (Web Audio time + setTimeout)
 *  - SettingsStore – persists up to MAX_PRESETS named presets via localStorage
 *  - UI            – manages all DOM interactions and visual feedback
 */

/* ════════════════════════════════════════════════════════════
   Constants
   ════════════════════════════════════════════════════════════ */
const SOUND_TYPES = [
  { id: 'tick',      label: '🔔 Tick'      },
  { id: 'accent',    label: '🔔 Accent'    },
  { id: 'clap',      label: '👏 Clap'      },
  { id: 'kick',      label: '🥁 Kick'      },
  { id: 'hihat',     label: '🎩 Hi-Hat'    },
  { id: 'woodblock', label: '🪵 Woodblock' },
  { id: 'mute',      label: '🔇 Mute'      },
];

const BEAT_COLORS = [
  '#6c63ff', '#ff6584', '#38d9a9', '#ffd43b',
  '#74c0fc', '#ff922b', '#e599f7', '#a9e34b',
];

const SUBDIVISION_TYPES = [
  { id: 'quarter', label: 'Quarter', stepsPerBeat: 1 },
  { id: 'eighth', label: 'Eighths', stepsPerBeat: 2 },
  { id: 'triplet', label: 'Triplets', stepsPerBeat: 3 },
  { id: 'sixteenth', label: 'Sixteenths', stepsPerBeat: 4 },
];

const TIME_SIGNATURE_DENOMINATORS = [2, 4, 8, 16];

const TEMPO_MARKS = [
  { min: 20,  max: 40,  name: 'Grave'       },
  { min: 40,  max: 60,  name: 'Largo'       },
  { min: 60,  max: 66,  name: 'Larghetto'   },
  { min: 66,  max: 76,  name: 'Adagio'      },
  { min: 76,  max: 108, name: 'Andante'     },
  { min: 108, max: 120, name: 'Moderato'    },
  { min: 120, max: 156, name: 'Allegro'     },
  { min: 156, max: 176, name: 'Vivace'      },
  { min: 176, max: 200, name: 'Presto'      },
  { min: 200, max: 300, name: 'Prestissimo' },
];

const MAX_PRESETS  = 5;
const STORAGE_KEY  = 'tottibeat_presets';
const LOOKAHEAD_MS = 25;          // scheduler interval
const SCHEDULE_AHEAD = 0.12;      // seconds to look ahead
const TAP_TEMPO_RESET_MS = 2000;
const TAP_TEMPO_MAX_INTERVALS = 6;
const DEFAULT_PRACTICE_SETTINGS = Object.freeze({
  enabled: false,
  barsBeforeIncrease: 4,
  bpmStep: 5,
  maxBpm: 160,
});

const APP_MODES = Object.freeze({
  easy: {
    subtitle: 'Simple metronome for reading from your music sheet',
  },
  expert: {
    subtitle: 'Advanced controls for pulse, accents, and practice workflows',
  },
});

/* ════════════════════════════════════════════════════════════
   SoundEngine – Web Audio synthesis
   ════════════════════════════════════════════════════════════ */
class SoundEngine {
  constructor() {
    this._ctx = null;
  }

  /** Lazily create AudioContext on first user gesture */
  get ctx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this._ctx;
  }

  resume() {
    // Also ensures the AudioContext is created (required during a user gesture
    // on browsers that need explicit unlocking, e.g. Safari/iOS).
    const ctx = this.ctx;
    if (ctx.state === 'suspended') {
      return ctx.resume();
    }
    return Promise.resolve();
  }

  play(type, time) {
    switch (type) {
      case 'tick':      this._tick(time, false); break;
      case 'accent':    this._tick(time, true);  break;
      case 'clap':      this._clap(time);        break;
      case 'kick':      this._kick(time);        break;
      case 'hihat':     this._hihat(time);       break;
      case 'woodblock': this._woodblock(time);   break;
      case 'mute':      /* silent */             break;
      default:          this._tick(time, false); break;
    }
  }

  /* ── Private synthesis methods ─────────────────────────── */

  _tick(time, accent) {
    const ctx   = this.ctx;
    const freq  = accent ? 1600 : 1000;
    const vol   = accent ? 0.9  : 0.5;
    const dur   = 0.06;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.start(time);
    osc.stop(time + dur + 0.01);
  }

  _clap(time) {
    const ctx = this.ctx;
    const dur = 0.12;

    // Two quick noise bursts
    [0, 0.01].forEach((offset) => {
      const buf    = this._noiseBuffer(dur);
      const source = ctx.createBufferSource();
      source.buffer = buf;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1200;
      bp.Q.value = 0.5;

      const gain = ctx.createGain();
      const t = time + offset;
      gain.gain.setValueAtTime(0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      source.connect(bp);
      bp.connect(gain);
      gain.connect(ctx.destination);
      source.start(t);
      source.stop(t + dur + 0.01);
    });
  }

  _kick(time) {
    const ctx = this.ctx;
    const dur = 0.45;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.001, time + dur);

    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.start(time);
    osc.stop(time + dur + 0.01);
  }

  _hihat(time) {
    const ctx = this.ctx;
    const dur = 0.06;

    const buf    = this._noiseBuffer(dur);
    const source = ctx.createBufferSource();
    source.buffer = buf;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    source.connect(hp);
    hp.connect(gain);
    gain.connect(ctx.destination);
    source.start(time);
    source.stop(time + dur + 0.01);
  }

  _woodblock(time) {
    const ctx = this.ctx;
    const dur = 0.09;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'square';
    osc.frequency.value = 800;

    gain.gain.setValueAtTime(0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.start(time);
    osc.stop(time + dur + 0.01);
  }

  /** Create a buffer of white noise */
  _noiseBuffer(duration) {
    const ctx        = this.ctx;
    const sampleRate = ctx.sampleRate;
    const length     = Math.ceil(sampleRate * duration);
    const buffer     = ctx.createBuffer(1, length, sampleRate);
    const data       = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}

/* ════════════════════════════════════════════════════════════
   Metronome – precise scheduling + visual queue
   ════════════════════════════════════════════════════════════ */
class Metronome {
  constructor(soundEngine) {
    this.sound         = soundEngine;
    this.bpm           = 120;
    this.beatsPerBar   = 4;
    this.beatSettings  = this._defaultSettings(4);
    this.useUniform    = true;
    this.uniformSound  = 'tick';
    this.uniformColor  = BEAT_COLORS[0];
    this.subdivision   = 'quarter';
    this.noteValue     = 4;

    this.isPlaying     = false;
    this._currentBeat  = 0;
    this._nextNoteTime = 0;
    this._timerId      = null;

    /** Queue of { beat (0-indexed), time } for visual sync */
    this._noteQueue    = [];

    this.onBeat        = null; // callback(beatIndex, time)
    this.onBarEnd      = null;
  }

  _defaultSettings(n) {
    return Array.from({ length: n }, (_, i) => ({
      sound: i === 0 ? 'accent' : 'tick',
      color: BEAT_COLORS[i % BEAT_COLORS.length],
    }));
  }

  setBeatsPerBar(n) {
    const old = this.beatSettings;
    this.beatSettings = Array.from({ length: n }, (_, i) =>
      old[i] || { sound: 'tick', color: BEAT_COLORS[i % BEAT_COLORS.length] }
    );
    this.beatsPerBar = n;
    this._currentBeat = 0;
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying    = true;
    this._currentBeat = 0;
    this._nextNoteTime = this.sound.ctx.currentTime + 0.05;
    this._schedule();
    requestAnimationFrame(() => this._visualLoop());
  }

  stop() {
    this.isPlaying = false;
    if (this._timerId) clearTimeout(this._timerId);
    this._timerId   = null;
    this._noteQueue = [];
  }

  _beatInterval() {
    const denominator = TIME_SIGNATURE_DENOMINATORS.includes(this.noteValue) ? this.noteValue : 4;
    return (60 / this.bpm) * (4 / denominator);
  }

  _subdivisionSteps() {
    return SUBDIVISION_TYPES.find((option) => option.id === this.subdivision)?.stepsPerBeat || 1;
  }

  _schedule() {
    const ctx = this.sound.ctx;
    while (this._nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD) {
      this._scheduleNote(this._currentBeat, this._nextNoteTime);
      this._advance();
    }
    this._timerId = setTimeout(() => this._schedule(), LOOKAHEAD_MS);
  }

  _scheduleNote(beat, time) {
    const type = this.useUniform
      ? this.uniformSound
      : this.beatSettings[beat].sound;

    this.sound.play(type, time);
    this._noteQueue.push({ beat, time, isSubdivision: false });

    const steps = this._subdivisionSteps();
    if (steps > 1 && type !== 'mute') {
      const stepDuration = this._beatInterval() / steps;
      for (let step = 1; step < steps; step++) {
        this.sound.play('tick', time + (stepDuration * step));
        this._noteQueue.push({ beat, time: time + (stepDuration * step), isSubdivision: true });
      }
    }
  }

  _advance() {
    const completedBeat = this._currentBeat;
    if (completedBeat === this.beatsPerBar - 1 && this.onBarEnd) {
      this.onBarEnd();
    }
    this._nextNoteTime += this._beatInterval();
    this._currentBeat   = (this._currentBeat + 1) % this.beatsPerBar;
  }

  _visualLoop() {
    if (!this.isPlaying) return;

    const now = this.sound.ctx.currentTime;
    while (this._noteQueue.length && this._noteQueue[0].time <= now) {
      const { beat, isSubdivision } = this._noteQueue.shift();
      if (!isSubdivision && this.onBeat) this.onBeat(beat);
    }
    requestAnimationFrame(() => this._visualLoop());
  }

  /** Snapshot of current state (for preset saving) */
  getState() {
    return {
      bpm:          this.bpm,
      beatsPerBar:  this.beatsPerBar,
      noteValue:    this.noteValue,
      beatSettings: JSON.parse(JSON.stringify(this.beatSettings)),
      useUniform:   this.useUniform,
      uniformSound: this.uniformSound,
      uniformColor: this.uniformColor,
      subdivision:  this.subdivision,
    };
  }

  /** Restore from a state snapshot */
  loadState(state) {
    this.bpm          = state.bpm          ?? this.bpm;
    const loadedNoteValue = Number.parseInt(state.noteValue, 10);
    this.noteValue    = TIME_SIGNATURE_DENOMINATORS.includes(loadedNoteValue) ? loadedNoteValue : 4;
    this.useUniform   = state.useUniform   ?? this.useUniform;
    this.uniformSound = state.uniformSound ?? this.uniformSound;
    this.uniformColor = state.uniformColor ?? this.uniformColor;
    this.subdivision  = state.subdivision  ?? this.subdivision;

    // setBeatsPerBar rebuilds beatSettings; then overlay saved values
    this.setBeatsPerBar(state.beatsPerBar ?? this.beatsPerBar);
    if (state.beatSettings) {
      state.beatSettings.forEach((s, i) => {
        if (this.beatSettings[i]) this.beatSettings[i] = { ...s };
      });
    }
  }
}

/* ════════════════════════════════════════════════════════════
   SettingsStore – localStorage presets
   ════════════════════════════════════════════════════════════ */
class SettingsStore {
  constructor() {
    this.presets = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) { /* ignore */ }
    return Array(MAX_PRESETS).fill(null);
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.presets));
    } catch (_) { /* ignore – storage may be unavailable */ }
  }

  save(index, name, state) {
    this.presets[index] = { name, state, savedAt: Date.now() };
    this._save();
  }

  load(index) {
    return this.presets[index] || null;
  }

  delete(index) {
    this.presets[index] = null;
    this._save();
  }
}

/* ════════════════════════════════════════════════════════════
   UI – DOM management
   ════════════════════════════════════════════════════════════ */
class UI {
  constructor(metronome, store) {
    this.metro = metronome;
    this.store = store;

    this._activeBeatIndex = -1;
    this._flashTimer      = null;
    this._popoverTrigger  = null;
    this._tapTimes        = [];
    this._modalState      = null;
    this._modalTrigger    = null;
    this._appMode         = this._defaultAppMode();
    this._practice = {
      ...DEFAULT_PRACTICE_SETTINGS,
      completedBars: 0,
      awaitingBarBoundary: false,
    };

    this._bindElements();
    this._buildBeatsPerBar();
    this._buildTimeSignatureDenominators();
    this._buildSubdivisionControls();
    this._buildBeatCircles();
    this._buildUniformPanel();
    this._buildPerBeatPanel();
    this._buildPresets();
    this._attachEvents();
    this._syncBpmDisplay();
    this._syncMode();
    this._syncUniformToggle();
    this._syncPracticeControls();
    this._syncPracticeStatus();
    this._syncTapTempoButton();

    // Visual beat callback
    this.metro.onBeat = (beat) => this._handleBeat(beat);
    this.metro.onBarEnd = () => this._handlePracticeBarEnd();
  }

  /* ── Element cache ─────────────────────────────────────── */
  _bindElements() {
    this.$ = (id) => document.getElementById(id);
    this.bpmInput       = this.$('bpm-input');
    this.bpmSlider      = this.$('bpm-slider');
    this.bpmDec         = this.$('bpm-dec');
    this.bpmInc         = this.$('bpm-inc');
    this.appSubtitle    = this.$('app-subtitle');
    this.modeControls   = this.$('app-mode-controls');
    this.modeButtons    = [...document.querySelectorAll('.mode-btn')];
    this.modeSections   = [...document.querySelectorAll('[data-mode-section]')];
    this.tempoName      = this.$('tempo-name');
    this.timeSignaturePreview = this.$('time-signature-preview');
    this.bpbGrid        = this.$('beats-per-bar-grid');
    this.timeSignatureDenominatorGrid = this.$('time-signature-denominator-grid');
    this.subdivisionGrid = this.$('subdivision-grid');
    this.beatCircles    = this.$('beat-circles');
    this.playBtn        = this.$('play-btn');
    this.tapBtn         = this.$('tap-btn');
    this.practiceToggle = this.$('practice-mode-toggle');
    this.practiceBarsInput = this.$('practice-bars-input');
    this.practiceStepInput = this.$('practice-step-input');
    this.practiceMaxInput = this.$('practice-max-bpm-input');
    this.practiceStatus = this.$('practice-status');
    this.uniformToggle  = this.$('uniform-toggle');
    this.uniformPanel   = this.$('uniform-panel');
    this.perBeatPanel   = this.$('per-beat-panel');
    this.perBeatList    = this.$('per-beat-list');
    this.presetsGrid    = this.$('presets-grid');
    this.popover        = this.$('beat-popover');
    this.popoverBdrop   = this.$('popover-backdrop');
    this.popoverBeatNum = this.$('popover-beat-num');
    this.popoverSound   = this.$('popover-sound-picker');
    this.popoverColor   = this.$('popover-color-picker');
    this.popoverClose   = this.$('popover-close');
    this.presetModal    = this.$('preset-modal');
    this.presetModalBackdrop = this.$('preset-modal-backdrop');
    this.presetModalTitle = this.$('preset-modal-title');
    this.presetModalDescription = this.$('preset-modal-description');
    this.presetNameLabel = this.$('preset-name-label');
    this.presetNameInput = this.$('preset-name-input');
    this.presetModalCancel = this.$('preset-modal-cancel');
    this.presetModalConfirm = this.$('preset-modal-confirm');
    this.presetModalClose = this.$('preset-modal-close');
  }

  /* ── Builders ──────────────────────────────────────────── */
  _buildBeatsPerBar() {
    this.bpbGrid.innerHTML = '';
    for (let i = 1; i <= 8; i++) {
      const btn = document.createElement('button');
      btn.className = 'beats-btn' + (i === this.metro.beatsPerBar ? ' active' : '');
      btn.dataset.beats = i;
      btn.textContent = i;
      btn.setAttribute('aria-pressed', i === this.metro.beatsPerBar ? 'true' : 'false');
      btn.setAttribute('aria-label', `Select ${i} as the top number of the time signature`);
      btn.addEventListener('click', () => this._onBeatsPerBar(i));
      this.bpbGrid.appendChild(btn);
    }
  }

  _buildTimeSignatureDenominators() {
    this.timeSignatureDenominatorGrid.innerHTML = '';
    TIME_SIGNATURE_DENOMINATORS.forEach((denominator) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'beats-btn denominator-btn' + (denominator === this.metro.noteValue ? ' active' : '');
      button.dataset.denominator = denominator;
      button.textContent = denominator;
      button.setAttribute('aria-pressed', denominator === this.metro.noteValue ? 'true' : 'false');
      button.setAttribute('aria-label', `Select ${denominator} as the bottom number of the time signature`);
      button.addEventListener('click', () => this._setTimeSignatureDenominator(denominator));
      this.timeSignatureDenominatorGrid.appendChild(button);
    });
    this._syncTimeSignaturePreview();
  }

  _buildSubdivisionControls() {
    this.subdivisionGrid.innerHTML = '';
    SUBDIVISION_TYPES.forEach(({ id, label }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'subdivision-btn' + (id === this.metro.subdivision ? ' active' : '');
      button.dataset.subdivision = id;
      button.textContent = label;
      button.setAttribute('aria-pressed', id === this.metro.subdivision ? 'true' : 'false');
      button.addEventListener('click', () => this._setSubdivision(id));
      this.subdivisionGrid.appendChild(button);
    });
  }

  _buildBeatCircles() {
    this.beatCircles.innerHTML = '';
    const n = this.metro.beatsPerBar;
    for (let i = 0; i < n; i++) {
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'beat-circle' + (i === 0 ? ' first-beat' : '');
      c.dataset.beat = i;
      c.textContent = i + 1;
      c.setAttribute('aria-label', `Beat ${i + 1}${this.metro.useUniform ? '' : ' configuration'}`);
      c.setAttribute('aria-disabled', this.metro.useUniform ? 'true' : 'false');
      c.tabIndex = this.metro.useUniform ? -1 : 0;
      const color = this.metro.useUniform
        ? this.metro.uniformColor
        : this.metro.beatSettings[i].color;
      c.style.setProperty('--beat-color', color);
      c.addEventListener('click', () => {
        if (!this.metro.useUniform) this._openPopover(i);
      });
      c.title = this.metro.useUniform ? '' : `Click to customise beat ${i + 1}`;
      this.beatCircles.appendChild(c);
    }
  }

  _buildUniformPanel() {
    // Sound buttons
    this.$('uniform-sound-picker').innerHTML = '';
    SOUND_TYPES.forEach(({ id, label }) => {
      const btn = document.createElement('button');
      btn.className = 'sound-btn' + (id === this.metro.uniformSound ? ' active' : '');
      btn.dataset.sound = id;
      btn.textContent = label;
      btn.addEventListener('click', () => {
        this.metro.uniformSound = id;
        this._buildUniformPanel();
      });
      this.$('uniform-sound-picker').appendChild(btn);
    });

    // Color swatches
    this.$('uniform-color-picker').innerHTML = '';
    BEAT_COLORS.forEach((color) => {
      const sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'color-swatch' + (color === this.metro.uniformColor ? ' active' : '');
      sw.style.background = color;
      sw.title = color;
      sw.setAttribute('aria-label', `Select beat color ${color}`);
      sw.setAttribute('aria-pressed', color === this.metro.uniformColor ? 'true' : 'false');
      sw.addEventListener('click', () => {
        this.metro.uniformColor = color;
        this._buildUniformPanel();
        this._buildBeatCircles(); // update circle colours
      });
      this.$('uniform-color-picker').appendChild(sw);
    });
  }

  _buildPerBeatPanel() {
    this.perBeatList.innerHTML = '';
    const n = this.metro.beatsPerBar;
    for (let i = 0; i < n; i++) {
      const cfg = this.metro.beatSettings[i];
      const row = document.createElement('div');
      row.className = 'beat-row';

      // Beat number bubble
      const num = document.createElement('div');
      num.className = 'beat-row-num';
      num.textContent = i + 1;
      num.style.background = cfg.color;

      // Sound mini-picker
      const soundPicker = document.createElement('div');
      soundPicker.className = 'sound-picker';
      SOUND_TYPES.forEach(({ id, label }) => {
        const btn = document.createElement('button');
        btn.className = 'sound-btn' + (id === cfg.sound ? ' active' : '');
        btn.dataset.sound = id;
        btn.textContent = label;
        btn.addEventListener('click', () => {
          this.metro.beatSettings[i].sound = id;
          this._buildPerBeatPanel();
          this._buildBeatCircles();
        });
        soundPicker.appendChild(btn);
      });

      // Color mini-picker
      const colorPicker = document.createElement('div');
      colorPicker.className = 'color-picker';
      BEAT_COLORS.forEach((color) => {
        const sw = document.createElement('button');
        sw.type = 'button';
        sw.className = 'color-swatch' + (color === cfg.color ? ' active' : '');
        sw.style.background = color;
        sw.title = color;
        sw.setAttribute('aria-label', `Select color ${color} for beat ${i + 1}`);
        sw.setAttribute('aria-pressed', color === cfg.color ? 'true' : 'false');
        sw.addEventListener('click', () => {
          this.metro.beatSettings[i].color = color;
          this._buildPerBeatPanel();
          this._buildBeatCircles();
        });
        colorPicker.appendChild(sw);
      });

      row.appendChild(num);
      const settingsWrap = document.createElement('div');
      settingsWrap.style.flex = '1';
      const sl = document.createElement('label');
      sl.className = 'config-label';
      sl.textContent = 'Sound';
      const cl = document.createElement('label');
      cl.className = 'config-label';
      cl.style.marginTop = '0.4rem';
      cl.textContent = 'Color';
      settingsWrap.appendChild(sl);
      settingsWrap.appendChild(soundPicker);
      settingsWrap.appendChild(cl);
      settingsWrap.appendChild(colorPicker);
      row.appendChild(settingsWrap);

      this.perBeatList.appendChild(row);
    }
  }

  _focusPopoverControl(selector, predicate) {
    const controls = [...this.popover.querySelectorAll(selector)];
    const target = controls.find(predicate) || controls[0];
    if (target && typeof target.focus === 'function') {
      target.focus();
    }
  }

  _popoverFocusableElements() {
    return [...this.popover.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter((element) => !element.classList.contains('hidden'));
  }

  _modalFocusableElements() {
    return [...this.presetModal.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter((element) => !element.classList.contains('hidden'));
  }

  _openPresetModal(config) {
    this._modalState = config;
    this._modalTrigger = document.activeElement;
    this._modalTriggerMeta = {
      index: config.index,
      action: config.mode === 'delete' ? 'del' : 'save',
    };

    this.presetModalTitle.textContent = config.title;
    this.presetModalDescription.textContent = config.description;
    this.presetModalConfirm.textContent = config.confirmLabel;
    this.presetModalConfirm.classList.toggle('del-btn', config.variant === 'danger');
    this.presetModalConfirm.classList.toggle('save-btn', config.variant !== 'danger');

    const requiresName = config.mode === 'save';
    this.presetNameLabel.classList.toggle('hidden', !requiresName);
    this.presetNameInput.classList.toggle('hidden', !requiresName);
    this.presetNameInput.value = config.initialValue || '';

    this.presetModal.classList.remove('hidden');
    this.presetModalBackdrop.classList.remove('hidden');

    if (requiresName) {
      this.presetNameInput.focus();
      this.presetNameInput.select();
    } else {
      this.presetModalConfirm.focus();
    }
  }

  _closePresetModal({ restoreFocus = true } = {}) {
    this.presetModal.classList.add('hidden');
    this.presetModalBackdrop.classList.add('hidden');
    this.presetModalConfirm.classList.remove('del-btn');
    this.presetModalConfirm.classList.add('save-btn');
    this._modalState = null;

    if (restoreFocus) {
      const slot = this._modalTriggerMeta
        ? this.presetsGrid.children[this._modalTriggerMeta.index]
        : null;
      const preferredTrigger = this._modalTriggerMeta?.action
        ? slot?.querySelector(`.${this._modalTriggerMeta.action}-btn:not(:disabled)`)
        : null;
      const liveTrigger = preferredTrigger
        || slot?.querySelector('.save-btn:not(:disabled)')
        || slot?.querySelector('.load-btn:not(:disabled)')
        || slot?.querySelector('.del-btn:not(:disabled)')
        || null;
      const fallbackTrigger = liveTrigger || this._modalTrigger;
      if (fallbackTrigger && typeof fallbackTrigger.focus === 'function') {
        fallbackTrigger.focus();
      }
    }

    this._modalTriggerMeta = null;
  }

  _submitPresetModal() {
    if (!this._modalState) return;

    if (this._modalState.mode === 'save') {
      const name = this.presetNameInput.value.trim() || `Preset ${this._modalState.index + 1}`;
      this.store.save(this._modalState.index, name, {
        ...this.metro.getState(),
        noteValue: this.metro.noteValue,
        appMode: this._appMode,
        practiceMode: {
          enabled: this._practice.enabled,
          barsBeforeIncrease: this._practice.barsBeforeIncrease,
          bpmStep: this._practice.bpmStep,
          maxBpm: this._practice.maxBpm,
        },
      });
      this._buildPresets();
      this._closePresetModal();
      return;
    }

    if (this._modalState.mode === 'delete') {
      this.store.delete(this._modalState.index);
      this._buildPresets();
      this._closePresetModal();
    }
  }

  _registerTapTempoTap() {
    const now = Date.now();
    const lastTap = this._tapTimes[this._tapTimes.length - 1];

    if (lastTap && now - lastTap > TAP_TEMPO_RESET_MS) {
      this._tapTimes = [];
    }

    this._tapTimes.push(now);
    if (this._tapTimes.length > TAP_TEMPO_MAX_INTERVALS + 1) {
      this._tapTimes.shift();
    }

    if (this._tapTimes.length >= 2) {
      const intervals = [];
      for (let i = 1; i < this._tapTimes.length; i++) {
        intervals.push(this._tapTimes[i] - this._tapTimes[i - 1]);
      }
      const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      const bpm = Math.round(60000 / averageInterval);
      this._setBpm(bpm, { preserveTapHistory: true });
    }

    this._syncTapTempoButton();
  }

  _resetTapTempo() {
    this._tapTimes = [];
    this._syncTapTempoButton();
  }

  _syncTapTempoButton() {
    if (!this.tapBtn) return;
    const label = this._tapTimes.length >= 2 ? `Tap Tempo · ${this.metro.bpm} BPM` : 'Tap Tempo';
    this.tapBtn.textContent = label;
    this.tapBtn.setAttribute('aria-label', label);
  }

  _syncTimeSignaturePreview() {
    if (!this.timeSignaturePreview) return;
    this.timeSignaturePreview.textContent = `${this.metro.beatsPerBar}/${this.metro.noteValue}`;
  }

  _defaultAppMode() {
    const hasSavedPresets = this.store.presets.some((preset) => preset && typeof preset === 'object');
    return hasSavedPresets ? 'expert' : 'easy';
  }

  _syncMode() {
    const config = APP_MODES[this._appMode] || APP_MODES.easy;
    const isEasyMode = this._appMode === 'easy';
    this.modeButtons.forEach((button) => {
      const isActive = button.dataset.mode === this._appMode;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    this.modeSections.forEach((section) => {
      const sectionMode = section.dataset.modeSection;
      section.hidden = sectionMode === 'expert' && isEasyMode;
    });
    if (isEasyMode) {
      if (this.metro.subdivision !== 'quarter') {
        this.metro.subdivision = 'quarter';
        this._buildSubdivisionControls();
      }
      if (this._practice.enabled) {
        this._practice.enabled = false;
        this._syncPracticeControls();
        this._resetPracticeProgress();
      }
      if (!this.metro.useUniform) {
        this.metro.useUniform = true;
      }
      if (this.popover && !this.popover.classList.contains('hidden')) {
        this._closePopover();
      }
      this._syncUniformToggle();
      this._buildBeatCircles();
      this._syncTimeSignaturePreview();
    }
    if (this.appSubtitle) {
      this.appSubtitle.textContent = config.subtitle;
    }
  }

  _setMode(mode, { restoreFocus = true } = {}) {
    if (!APP_MODES[mode]) return;
    this._appMode = mode;
    this._syncMode();

    if (restoreFocus || mode === 'easy') {
      const activeButton = this.modeButtons.find((button) => button.dataset.mode === mode);
      if (activeButton && typeof activeButton.focus === 'function') {
        activeButton.focus();
      }
    }
  }

  _sanitizePracticeNumber(value, fallback, { min, max }) {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  _syncPracticeControls() {
    this.practiceToggle.checked = this._practice.enabled;
    this.practiceBarsInput.value = String(this._practice.barsBeforeIncrease);
    this.practiceStepInput.value = String(this._practice.bpmStep);
    this.practiceMaxInput.value = String(this._practice.maxBpm);
  }

  _syncPracticeStatus() {
    if (!this._practice.enabled) {
      this.practiceStatus.textContent = 'Practice mode · Off';
      return;
    }

    if (this.metro.bpm >= this._practice.maxBpm) {
      this.practiceStatus.textContent = `Practice mode · Max ${this._practice.maxBpm} BPM reached`;
      return;
    }

    if (this._practice.awaitingBarBoundary) {
      this.practiceStatus.textContent = `Practice mode · Will increase after ${this._practice.barsBeforeIncrease} full bars at ${this.metro.bpm} BPM`;
      return;
    }

    if (this._practice.completedBars === 0) {
      this.practiceStatus.textContent = `Practice mode · Waiting for bar 1 of ${this._practice.barsBeforeIncrease} at ${this.metro.bpm} BPM`;
      return;
    }

    this.practiceStatus.textContent = `Practice mode · Bar ${this._practice.completedBars} / ${this._practice.barsBeforeIncrease} at ${this.metro.bpm} BPM`;
  }

  _resetPracticeProgress() {
    this._practice.completedBars = 0;
    this._practice.awaitingBarBoundary = this.metro.isPlaying;
    this._syncPracticeStatus();
  }

  _loadPracticeSettings(settings = {}) {
    this._practice.enabled = Boolean(settings.enabled ?? DEFAULT_PRACTICE_SETTINGS.enabled);
    this._practice.barsBeforeIncrease = this._sanitizePracticeNumber(
      settings.barsBeforeIncrease,
      DEFAULT_PRACTICE_SETTINGS.barsBeforeIncrease,
      { min: 1, max: 32 }
    );
    this._practice.bpmStep = this._sanitizePracticeNumber(
      settings.bpmStep,
      DEFAULT_PRACTICE_SETTINGS.bpmStep,
      { min: 1, max: 50 }
    );
    this._practice.maxBpm = this._sanitizePracticeNumber(
      settings.maxBpm,
      DEFAULT_PRACTICE_SETTINGS.maxBpm,
      { min: 20, max: 300 }
    );
    this._practice.completedBars = 0;
    this._practice.awaitingBarBoundary = false;
    this._syncPracticeControls();
    this._syncPracticeStatus();
  }

  _handlePracticeBarStart() {
    if (!this._practice.enabled) return;

    if (this._practice.awaitingBarBoundary) {
      this._practice.awaitingBarBoundary = false;
      this._syncPracticeStatus();
    }
  }

  _handlePracticeBarEnd() {
    if (!this._practice.enabled || this._practice.awaitingBarBoundary) return;

    this._practice.completedBars += 1;
    if (this._practice.completedBars < this._practice.barsBeforeIncrease) {
      this._syncPracticeStatus();
      return;
    }

    if (this.metro.bpm >= this._practice.maxBpm) {
      this._practice.completedBars = 0;
      this._syncPracticeStatus();
      return;
    }

    const nextBpm = Math.min(this._practice.maxBpm, this.metro.bpm + this._practice.bpmStep);
    this._practice.completedBars = 0;

    if (nextBpm === this.metro.bpm) {
      this._syncPracticeStatus();
      return;
    }

    this._practice.awaitingBarBoundary = true;
    this.metro.bpm = nextBpm;
    this.bpmInput.value = nextBpm;
    this.bpmSlider.value = nextBpm;
    this.tempoName.textContent = this._tempoName(nextBpm);
    this._syncPracticeStatus();
    this._syncTapTempoButton();
  }

  _handleBeat(beat) {
    if (beat === 0) {
      this._handlePracticeBarStart();
    }
    this._flashBeat(beat);
  }

  _buildPresets() {
    this.presetsGrid.innerHTML = '';
    for (let i = 0; i < MAX_PRESETS; i++) {
      const preset = this.store.load(i);
      const slot   = document.createElement('div');
      slot.className = 'preset-slot';

      const nameEl = document.createElement('div');
      nameEl.className = 'preset-name' + (preset ? '' : ' empty');
      nameEl.textContent = preset ? preset.name : `Slot ${i + 1}`;

      const metaEl = document.createElement('div');
      metaEl.className = 'preset-meta';
      if (preset) {
        const d = new Date(preset.savedAt);
        const noteValue = preset.state.noteValue ?? 4;
        metaEl.textContent = `${preset.state.bpm} BPM · ${preset.state.beatsPerBar}/${noteValue} · ${d.toLocaleDateString()}`;
      }

      const actions = document.createElement('div');
      actions.className = 'preset-actions';

      const saveBtn = document.createElement('button');
      saveBtn.className = 'preset-btn save-btn';
      saveBtn.textContent = 'Save';
      saveBtn.addEventListener('click', () => this._savePreset(i));

      const loadBtn = document.createElement('button');
      loadBtn.className = 'preset-btn load-btn';
      loadBtn.textContent = 'Load';
      loadBtn.disabled = !preset;
      loadBtn.addEventListener('click', () => this._loadPreset(i));

      const delBtn = document.createElement('button');
      delBtn.className = 'preset-btn del-btn';
      delBtn.textContent = 'Del';
      delBtn.disabled = !preset;
      delBtn.addEventListener('click', () => this._deletePreset(i));

      actions.appendChild(saveBtn);
      actions.appendChild(loadBtn);
      actions.appendChild(delBtn);

      slot.appendChild(nameEl);
      slot.appendChild(metaEl);
      slot.appendChild(actions);
      this.presetsGrid.appendChild(slot);
    }
  }

  /* ── Popover (per-beat inline from beat circles) ────────── */
  _openPopover(beatIndex) {
    const isRefresh = !this.popover.classList.contains('hidden') && this._popoverBeat === beatIndex;

    this._popoverBeat = beatIndex;
    if (!isRefresh) {
      const activeBeat = document.activeElement?.closest?.('.beat-circle');
      this._popoverTrigger = activeBeat || document.activeElement;
    }
    const cfg = this.metro.beatSettings[beatIndex];
    this.popoverBeatNum.textContent = beatIndex + 1;

    // Sound
    this.popoverSound.innerHTML = '';
    SOUND_TYPES.forEach(({ id, label }) => {
      const btn = document.createElement('button');
      btn.className = 'sound-btn' + (id === cfg.sound ? ' active' : '');
      btn.textContent = label;
      btn.addEventListener('click', () => {
        this.metro.beatSettings[beatIndex].sound = id;
        this._openPopover(beatIndex); // refresh
        this._buildPerBeatPanel();
        this._focusPopoverControl('.sound-btn', (control) => control.textContent === label);
      });
      this.popoverSound.appendChild(btn);
    });

    // Color
    this.popoverColor.innerHTML = '';
    BEAT_COLORS.forEach((color) => {
      const sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'color-swatch' + (color === cfg.color ? ' active' : '');
      sw.style.background = color;
      sw.setAttribute('aria-label', `Select color ${color} for beat ${beatIndex + 1}`);
      sw.setAttribute('aria-pressed', color === cfg.color ? 'true' : 'false');
      sw.addEventListener('click', () => {
        this.metro.beatSettings[beatIndex].color = color;
        this._openPopover(beatIndex); // refresh
        this._buildBeatCircles();
        this._buildPerBeatPanel();
        this._focusPopoverControl('.color-swatch', (control) => control.getAttribute('aria-label') === sw.getAttribute('aria-label'));
      });
      this.popoverColor.appendChild(sw);
    });

    this.popover.classList.remove('hidden');
    this.popoverBdrop.classList.remove('hidden');
    const firstFocusable = this.popover.querySelector('button');
    if (firstFocusable) firstFocusable.focus();
  }

  _closePopover() {
    this.popover.classList.add('hidden');
    this.popoverBdrop.classList.add('hidden');
    if (this._popoverTrigger) {
      const liveTrigger = this._popoverTrigger.dataset?.beat
        ? this.beatCircles.querySelector(`.beat-circle[data-beat="${this._popoverTrigger.dataset.beat}"]`)
        : this._popoverTrigger;
      if (liveTrigger && typeof liveTrigger.focus === 'function') {
        liveTrigger.focus();
      }
    }
  }

  /* ── Event wiring ──────────────────────────────────────── */
  _attachEvents() {
    // BPM input
    this.bpmInput.addEventListener('change', () => {
      this._setBpm(parseInt(this.bpmInput.value, 10));
    });
    this.bpmInput.addEventListener('input', () => {
      this._setBpm(parseInt(this.bpmInput.value, 10));
    });

    // BPM slider
    this.bpmSlider.addEventListener('input', () => {
      this._setBpm(parseInt(this.bpmSlider.value, 10));
    });

    // ±BPM buttons
    this.bpmDec.addEventListener('click', () => this._setBpm(this.metro.bpm - 1));
    this.bpmInc.addEventListener('click', () => this._setBpm(this.metro.bpm + 1));

    // Keyboard shortcuts: arrow keys adjust BPM when input focused
    this.bpmInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp')   { e.preventDefault(); this._setBpm(this.metro.bpm + 1); }
      if (e.key === 'ArrowDown') { e.preventDefault(); this._setBpm(this.metro.bpm - 1); }
    });

    // Play/Stop
    this.playBtn.addEventListener('click', () => this._togglePlay());
    this.tapBtn.addEventListener('click', () => this._registerTapTempoTap());
    this.modeButtons.forEach((button) => {
      button.addEventListener('click', () => this._setMode(button.dataset.mode));
    });

    // Space bar = play/stop
    document.addEventListener('keydown', (e) => {
      const targetTag = e.target?.tagName;
      const isInteractive = ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'].includes(targetTag);
      if (e.code === 'Space' && !isInteractive) {
        e.preventDefault();
        this._togglePlay();
      }
    });

    // Uniform toggle
    this.uniformToggle.addEventListener('change', () => {
      if (this.uniformToggle.checked && !this.popover.classList.contains('hidden')) {
        this._closePopover();
      }
      this.metro.useUniform = this.uniformToggle.checked;
      this._syncUniformToggle();
      this._buildBeatCircles();
      if (this.uniformToggle.checked) {
        this.uniformToggle.focus();
      }
    });

    this.practiceToggle.addEventListener('change', () => {
      this._practice.enabled = this.practiceToggle.checked;
      this._resetPracticeProgress();
      this._syncPracticeControls();
    });

    this.practiceBarsInput.addEventListener('input', () => {
      this._practice.barsBeforeIncrease = this._sanitizePracticeNumber(
        this.practiceBarsInput.value,
        this._practice.barsBeforeIncrease,
        { min: 1, max: 32 }
      );
      this._syncPracticeControls();
      this._resetPracticeProgress();
    });

    this.practiceStepInput.addEventListener('input', () => {
      this._practice.bpmStep = this._sanitizePracticeNumber(
        this.practiceStepInput.value,
        this._practice.bpmStep,
        { min: 1, max: 50 }
      );
      this._syncPracticeControls();
      this._resetPracticeProgress();
    });

    this.practiceMaxInput.addEventListener('input', () => {
      this._practice.maxBpm = this._sanitizePracticeNumber(
        this.practiceMaxInput.value,
        this._practice.maxBpm,
        { min: 20, max: 300 }
      );
      this._syncPracticeControls();
      this._resetPracticeProgress();
    });

    // Popover close
    this.popoverClose.addEventListener('click', () => this._closePopover());
    this.popoverBdrop.addEventListener('click', () => this._closePopover());
    this.presetModalCancel.addEventListener('click', () => this._closePresetModal());
    this.presetModalClose.addEventListener('click', () => this._closePresetModal());
    this.presetModalBackdrop.addEventListener('click', () => this._closePresetModal());
    this.presetModalConfirm.addEventListener('click', () => this._submitPresetModal());
    this.presetNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this._submitPresetModal();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.popover.classList.contains('hidden')) {
        e.preventDefault();
        this._closePopover();
      }
      if (e.key === 'Escape' && !this.presetModal.classList.contains('hidden')) {
        e.preventDefault();
        this._closePresetModal();
      }
      if (e.key === 'Tab' && !this.popover.classList.contains('hidden')) {
        const focusable = this._popoverFocusableElements();
        if (!focusable.length) return;

        const currentIndex = focusable.indexOf(document.activeElement);
        const fallbackIndex = e.shiftKey ? 0 : focusable.length - 1;
        const resolvedIndex = currentIndex === -1 ? fallbackIndex : currentIndex;

        if (!e.shiftKey && resolvedIndex === focusable.length - 1) {
          e.preventDefault();
          focusable[0].focus();
        } else if (e.shiftKey && resolvedIndex === 0) {
          e.preventDefault();
          focusable[focusable.length - 1].focus();
        }
      }
      if (e.key === 'Tab' && !this.presetModal.classList.contains('hidden')) {
        const focusable = this._modalFocusableElements();
        if (!focusable.length) return;

        const currentIndex = focusable.indexOf(document.activeElement);
        const fallbackIndex = e.shiftKey ? 0 : focusable.length - 1;
        const resolvedIndex = currentIndex === -1 ? fallbackIndex : currentIndex;

        if (!e.shiftKey && resolvedIndex === focusable.length - 1) {
          e.preventDefault();
          focusable[0].focus();
        } else if (e.shiftKey && resolvedIndex === 0) {
          e.preventDefault();
          focusable[focusable.length - 1].focus();
        }
      }
    });
  }

  /* ── Actions ───────────────────────────────────────────── */
  async _togglePlay() {
    if (this.metro.isPlaying) {
      this.metro.stop();
      this._resetPracticeProgress();
      this._resetBeatCircles();
      this.playBtn.classList.remove('playing');
      this.playBtn.querySelector('.play-icon').textContent = '▶';
      this.playBtn.querySelector('.play-text').textContent = 'Start';
      this.playBtn.setAttribute('aria-pressed', 'false');
    } else {
      // Ensure AudioContext is created and running within this user gesture.
      await this.metro.sound.resume();
      this._resetPracticeProgress();
      this.metro.start();
      this.playBtn.classList.add('playing');
      this.playBtn.querySelector('.play-icon').textContent = '⏹';
      this.playBtn.querySelector('.play-text').textContent = 'Stop';
      this.playBtn.setAttribute('aria-pressed', 'true');
    }
  }

  _onBeatsPerBar(n) {
    const wasPlaying = this.metro.isPlaying;
    if (wasPlaying) this.metro.stop();
    if (!this.popover.classList.contains('hidden')) this._closePopover();

    this.metro.setBeatsPerBar(n);
    this._resetPracticeProgress();

    // Update BPB buttons
    this.bpbGrid.querySelectorAll('.beats-btn').forEach((btn) => {
      const isActive = parseInt(btn.dataset.beats, 10) === n;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    this._syncTimeSignaturePreview();

    this._buildBeatCircles();
    this._buildPerBeatPanel();

    if (wasPlaying) this.metro.start();
  }

  _setTimeSignatureDenominator(denominator) {
    if (!TIME_SIGNATURE_DENOMINATORS.includes(denominator)) return;
    this.metro.noteValue = denominator;
    this.timeSignatureDenominatorGrid.querySelectorAll('.denominator-btn').forEach((button) => {
      const isActive = parseInt(button.dataset.denominator, 10) === denominator;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    this._syncTimeSignaturePreview();
  }

  _setSubdivision(id) {
    if (!SUBDIVISION_TYPES.some((option) => option.id === id)) return;
    this.metro.subdivision = id;
    this._buildSubdivisionControls();
    const activeButton = this.subdivisionGrid.querySelector(`[data-subdivision="${id}"]`);
    if (activeButton && typeof activeButton.focus === 'function') {
      activeButton.focus();
    }
  }

  _setBpm(val, { preserveTapHistory = false, resetPracticeProgress = true } = {}) {
    val = Math.min(300, Math.max(20, val || 20));
    this.metro.bpm       = val;
    this.bpmInput.value  = val;
    this.bpmSlider.value = val;
    this.tempoName.textContent = this._tempoName(val);
    if (!preserveTapHistory) {
      this._tapTimes = [];
    }
    if (resetPracticeProgress) {
      this._resetPracticeProgress();
    } else {
      this._syncPracticeStatus();
    }
    this._syncTapTempoButton();
  }

  _tempoName(bpm) {
    for (let i = 0; i < TEMPO_MARKS.length; i++) {
      const { min, max, name } = TEMPO_MARKS[i];
      const isLastRange = i === TEMPO_MARKS.length - 1;
      if (bpm >= min && (bpm < max || (isLastRange && bpm <= max))) return name;
    }
    return '';
  }

  _syncBpmDisplay() {
    this._setBpm(this.metro.bpm);
  }

  _syncUniformToggle() {
    const uni = this.metro.useUniform;
    this.uniformToggle.checked = uni;
    this.uniformPanel.classList.toggle('hidden', !uni);
    this.perBeatPanel.classList.toggle('hidden', uni);
  }

  /* ── Visual beat flash ─────────────────────────────────── */
  _flashBeat(beatIndex) {
    const circles = this.beatCircles.querySelectorAll('.beat-circle');

    // De-activate previous
    circles.forEach((c) => c.classList.remove('active'));

    const circle = circles[beatIndex];
    if (!circle) return;

    const color = this.metro.useUniform
      ? this.metro.uniformColor
      : this.metro.beatSettings[beatIndex].color;

    circle.style.setProperty('--beat-color', color);
    circle.classList.add('active');

    // Auto-remove 'active' after a short flash
    clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(() => {
      circle.classList.remove('active');
    }, Math.min(250, (60 / this.metro.bpm) * 1000 * 0.5));
  }

  _resetBeatCircles() {
    this.beatCircles
      .querySelectorAll('.beat-circle')
      .forEach((c) => c.classList.remove('active'));
  }

  /* ── Preset management ─────────────────────────────────── */
  _savePreset(index) {
    this._openPresetModal({
      mode: 'save',
      index,
      title: `Save preset ${index + 1}`,
      description: 'Give this preset a name so you can load it later.',
      confirmLabel: 'Save preset',
      initialValue: this.store.load(index)?.name || `Preset ${index + 1}`,
      variant: 'primary',
    });
  }

  _loadPreset(index) {
    const p = this.store.load(index);
    if (!p) return;

    const wasPlaying = this.metro.isPlaying;
    if (wasPlaying) this.metro.stop();
    if (!this.popover.classList.contains('hidden')) this._closePopover();

    this.metro.loadState(p.state);
    this._setMode(p.state.appMode ?? 'expert', { restoreFocus: false });
    this._loadPracticeSettings(p.state.practiceMode);

    this._syncBpmDisplay();
    this._buildSubdivisionControls();
    this._buildBeatsPerBar();
    this._buildTimeSignatureDenominators();
    this._buildBeatCircles();
    this._buildUniformPanel();
    this._buildPerBeatPanel();
    this._syncUniformToggle();

    if (wasPlaying) this.metro.start();
  }

  _deletePreset(index) {
    if (!this.store.load(index)) return;
    this._openPresetModal({
      mode: 'delete',
      index,
      title: `Delete preset ${index + 1}`,
      description: 'This preset will be removed permanently from local storage.',
      confirmLabel: 'Delete preset',
      variant: 'danger',
    });
  }
}

/* ════════════════════════════════════════════════════════════
   Bootstrap
   ════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const sound  = new SoundEngine();
  const metro  = new Metronome(sound);
  const store  = new SettingsStore();
  new UI(metro, store); // eslint-disable-line no-new
});
