export const SOUND_TYPES = [
  { id: 'tick', label: '🔔 Tick' },
  { id: 'accent', label: '🔔 Accent' },
  { id: 'clap', label: '👏 Clap' },
  { id: 'kick', label: '🥁 Kick' },
  { id: 'hihat', label: '🎩 Hi-Hat' },
  { id: 'woodblock', label: '🪵 Woodblock' },
  { id: 'mute', label: '🔇 Mute' },
] as const;

export const BEAT_COLORS = [
  '#6c63ff',
  '#ff6584',
  '#38d9a9',
  '#ffd43b',
  '#74c0fc',
  '#ff922b',
  '#e599f7',
  '#a9e34b',
] as const;

export const SUBDIVISION_TYPES = [
  { id: 'quarter', label: 'Quarter', stepsPerBeat: 1 },
  { id: 'eighth', label: 'Eighths', stepsPerBeat: 2 },
  { id: 'triplet', label: 'Triplets', stepsPerBeat: 3 },
  { id: 'sixteenth', label: 'Sixteenths', stepsPerBeat: 4 },
] as const;

export const TIME_SIGNATURE_DENOMINATORS = [2, 4, 8, 16] as const;

export const TEMPO_MARKS = [
  { min: 20, max: 40, name: 'Grave' },
  { min: 40, max: 60, name: 'Largo' },
  { min: 60, max: 66, name: 'Larghetto' },
  { min: 66, max: 76, name: 'Adagio' },
  { min: 76, max: 108, name: 'Andante' },
  { min: 108, max: 120, name: 'Moderato' },
  { min: 120, max: 156, name: 'Allegro' },
  { min: 156, max: 176, name: 'Vivace' },
  { min: 176, max: 200, name: 'Presto' },
  { min: 200, max: 300, name: 'Prestissimo' },
] as const;

export const METRONOME_STORAGE_KEY = 'tottibeat_presets';
export const PRACTICE_MODE_STORAGE_KEY = 'practiceMode';

export const MIN_BPM = 20;
export const MAX_BPM = 300;
export const MIN_BEATS_PER_BAR = 1;
export const MAX_BEATS_PER_BAR = 8;
export const MAX_PRESETS = 5;

export const MIN_PRACTICE_BARS = 1;
export const MAX_PRACTICE_BARS = 32;
export const MIN_PRACTICE_BPM_STEP = 1;
export const MAX_PRACTICE_BPM_STEP = 50;
export const MIN_PRACTICE_MAX_BPM = 20;
export const MAX_PRACTICE_MAX_BPM = 300;

export const DEFAULT_PRACTICE_MODE_SETTINGS = Object.freeze({
  enabled: false,
  barsBeforeIncrease: 4,
  bpmStep: 5,
  maxBpm: 160,
});
