import {
  BEAT_COLORS,
  DEFAULT_PRACTICE_MODE_SETTINGS,
  MAX_BEATS_PER_BAR,
  MAX_BPM,
  MAX_PRESETS,
  MAX_PRACTICE_BARS,
  MAX_PRACTICE_BPM_STEP,
  MAX_PRACTICE_MAX_BPM,
  MIN_BEATS_PER_BAR,
  MIN_BPM,
  MIN_PRACTICE_BARS,
  MIN_PRACTICE_BPM_STEP,
  MIN_PRACTICE_MAX_BPM,
  SOUND_TYPES,
  SUBDIVISION_TYPES,
  TEMPO_MARKS,
  TIME_SIGNATURE_DENOMINATORS,
} from './constants';

export type SoundType = (typeof SOUND_TYPES)[number]['id'];
export type BeatColor = (typeof BEAT_COLORS)[number];
export type SubdivisionId = (typeof SUBDIVISION_TYPES)[number]['id'];
export type NoteValue = (typeof TIME_SIGNATURE_DENOMINATORS)[number];
export type AppMode = 'easy' | 'expert';

export type BeatSetting = {
  sound: string;
  color: string;
};

export type MetronomeState = {
  bpm: number;
  beatsPerBar: number;
  noteValue: number;
  beatSettings: BeatSetting[];
  useUniform: boolean;
  uniformSound: string;
  uniformColor: string;
  subdivision: string;
};

export type PracticeModeSettings = {
  enabled: boolean;
  barsBeforeIncrease: number;
  bpmStep: number;
  maxBpm: number;
};

export type MetronomeStateInput = Partial<{
  bpm: unknown;
  beatsPerBar: unknown;
  noteValue: unknown;
  beatSettings: unknown;
  useUniform: unknown;
  uniformSound: unknown;
  uniformColor: unknown;
  subdivision: unknown;
}>;

export type PracticeModeSettingsInput = Partial<{
  enabled: unknown;
  barsBeforeIncrease: unknown;
  bpmStep: unknown;
  maxBpm: unknown;
}>;

export type PracticeModeProgress = {
  completedBars: number;
  awaitingBarBoundary: boolean;
};

export type PracticeBarEndInput = {
  settings: PracticeModeSettings;
  progress: PracticeModeProgress;
  bpm: number;
};

export type PracticeBarEndResult = {
  bpm: number;
  progress: PracticeModeProgress;
};

export type PracticeProgressResetInput = {
  isPlaying: boolean;
};

export type PresetRecord = {
  name: string;
  savedAt: number;
  state: ReturnType<typeof serializeMetronomeState> & {
    appMode: AppMode;
    practiceMode: PracticeModeSettings;
  };
};

const SOUND_TYPE_IDS = new Set<string>(SOUND_TYPES.map((option) => option.id));
const SUBDIVISION_IDS = new Set<string>(SUBDIVISION_TYPES.map((option) => option.id));
const NOTE_VALUES = new Set<number>(TIME_SIGNATURE_DENOMINATORS);

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function isBeatSetting(value: unknown): value is BeatSetting {
  return Boolean(
    value
      && typeof value === 'object'
      && SOUND_TYPE_IDS.has((value as BeatSetting).sound)
      && typeof (value as BeatSetting).color === 'string'
      && (value as BeatSetting).color.length > 0,
  );
}

export function createDefaultBeatSettings(count: number): BeatSetting[] {
  return Array.from({ length: count }, (_, index) => ({
    sound: index === 0 ? 'accent' : 'tick',
    color: BEAT_COLORS[index % BEAT_COLORS.length],
  }));
}

export function cloneBeatSettings(settings: BeatSetting[]): BeatSetting[] {
  return settings.map((setting) => ({ ...setting }));
}

export const DEFAULT_METRONOME_STATE: MetronomeState = Object.freeze({
  bpm: 120,
  beatsPerBar: 4,
  noteValue: 4,
  beatSettings: createDefaultBeatSettings(4),
  useUniform: true,
  uniformSound: 'tick',
  uniformColor: BEAT_COLORS[0],
  subdivision: 'quarter',
});

export function createMetronomeState(overrides: MetronomeStateInput = {}): MetronomeState {
  const beatsPerBar = clampInteger(
    overrides.beatsPerBar ?? DEFAULT_METRONOME_STATE.beatsPerBar,
    DEFAULT_METRONOME_STATE.beatsPerBar,
    MIN_BEATS_PER_BAR,
    MAX_BEATS_PER_BAR,
  );

  const beatSettings = createDefaultBeatSettings(beatsPerBar);
  const overrideBeatSettings = Array.isArray(overrides.beatSettings) ? overrides.beatSettings : [];
  overrideBeatSettings.forEach((setting, index) => {
    if (beatSettings[index] && isBeatSetting(setting)) {
      beatSettings[index] = { ...setting };
    }
  });

  const noteValueCandidate = Number.parseInt(String(overrides.noteValue ?? DEFAULT_METRONOME_STATE.noteValue), 10);
  const subdivisionCandidate = overrides.subdivision ?? DEFAULT_METRONOME_STATE.subdivision;
  const uniformSoundCandidate = overrides.uniformSound ?? DEFAULT_METRONOME_STATE.uniformSound;

  return {
    bpm: clampInteger(overrides.bpm ?? DEFAULT_METRONOME_STATE.bpm, DEFAULT_METRONOME_STATE.bpm, MIN_BPM, MAX_BPM),
    beatsPerBar,
    noteValue: NOTE_VALUES.has(noteValueCandidate) ? (noteValueCandidate as NoteValue) : DEFAULT_METRONOME_STATE.noteValue,
    beatSettings,
    useUniform: Boolean(overrides.useUniform ?? DEFAULT_METRONOME_STATE.useUniform),
    uniformSound: SOUND_TYPE_IDS.has(String(uniformSoundCandidate))
      ? (uniformSoundCandidate as SoundType)
      : DEFAULT_METRONOME_STATE.uniformSound,
    uniformColor: typeof overrides.uniformColor === 'string' && overrides.uniformColor.length > 0
      ? overrides.uniformColor
      : DEFAULT_METRONOME_STATE.uniformColor,
    subdivision: SUBDIVISION_IDS.has(String(subdivisionCandidate))
      ? (subdivisionCandidate as SubdivisionId)
      : DEFAULT_METRONOME_STATE.subdivision,
  };
}

export function serializeMetronomeState(state: MetronomeState): MetronomeState {
  return {
    bpm: state.bpm,
    beatsPerBar: state.beatsPerBar,
    noteValue: state.noteValue,
    beatSettings: cloneBeatSettings(state.beatSettings),
    useUniform: state.useUniform,
    uniformSound: state.uniformSound,
    uniformColor: state.uniformColor,
    subdivision: state.subdivision,
  };
}

export function deserializeMetronomeState(raw: MetronomeStateInput = {}, fallback = DEFAULT_METRONOME_STATE): MetronomeState {
  const bpm = raw.bpm ?? fallback.bpm;
  const beatsPerBar = raw.beatsPerBar ?? fallback.beatsPerBar;
  const loadedNoteValue = Number.parseInt(String(raw.noteValue), 10);
  const noteValue = NOTE_VALUES.has(loadedNoteValue)
    ? loadedNoteValue
    : DEFAULT_METRONOME_STATE.noteValue;
  const useUniform = (raw.useUniform ?? fallback.useUniform) as boolean;
  const uniformSound = String(raw.uniformSound ?? fallback.uniformSound);
  const uniformColor = String(raw.uniformColor ?? fallback.uniformColor);
  const subdivision = String(raw.subdivision ?? fallback.subdivision);
  const beatSettingsLength = Math.max(0, Math.trunc(Number(beatsPerBar) || 0));
  const beatSettings = Array.from({ length: beatSettingsLength }, (_, index) => ({
    ...(fallback.beatSettings[index] ?? {
      sound: 'tick',
      color: BEAT_COLORS[index % BEAT_COLORS.length],
    }),
  }));

  if (Array.isArray(raw.beatSettings)) {
    raw.beatSettings.forEach((setting, index) => {
      if (beatSettings[index] && setting && typeof setting === 'object') {
        beatSettings[index] = { ...setting } as BeatSetting;
      }
    });
  }

  return {
    bpm: Number(bpm),
    beatsPerBar: Number(beatsPerBar),
    noteValue,
    beatSettings,
    useUniform,
    uniformSound,
    uniformColor,
    subdivision,
  };
}

export function getTempoName(bpm: number): string {
  for (let index = 0; index < TEMPO_MARKS.length; index += 1) {
    const { min, max, name } = TEMPO_MARKS[index];
    const isLastRange = index === TEMPO_MARKS.length - 1;
    if (bpm >= min && (bpm < max || (isLastRange && bpm <= max))) {
      return name;
    }
  }

  return '';
}

export function getBeatIntervalSeconds({ bpm, noteValue }: Pick<MetronomeState, 'bpm' | 'noteValue'>): number {
  const denominator = NOTE_VALUES.has(noteValue) ? noteValue : DEFAULT_METRONOME_STATE.noteValue;
  return (60 / bpm) * (4 / denominator);
}

export function getSubdivisionSteps(subdivision: string): number {
  return SUBDIVISION_TYPES.find((option) => option.id === subdivision)?.stepsPerBeat ?? 1;
}

export function deserializePracticeModeSettings(raw: PracticeModeSettingsInput = {}): PracticeModeSettings {
  return {
    enabled: Boolean(raw.enabled ?? DEFAULT_PRACTICE_MODE_SETTINGS.enabled),
    barsBeforeIncrease: clampInteger(
      raw.barsBeforeIncrease,
      DEFAULT_PRACTICE_MODE_SETTINGS.barsBeforeIncrease,
      MIN_PRACTICE_BARS,
      MAX_PRACTICE_BARS,
    ),
    bpmStep: clampInteger(
      raw.bpmStep,
      DEFAULT_PRACTICE_MODE_SETTINGS.bpmStep,
      MIN_PRACTICE_BPM_STEP,
      MAX_PRACTICE_BPM_STEP,
    ),
    maxBpm: clampInteger(
      raw.maxBpm,
      DEFAULT_PRACTICE_MODE_SETTINGS.maxBpm,
      MIN_PRACTICE_MAX_BPM,
      MAX_PRACTICE_MAX_BPM,
    ),
  };
}

export function serializePracticeModeSettings(settings: PracticeModeSettings): PracticeModeSettings {
  return { ...settings };
}

export function applyPracticeBarEnd(input: PracticeBarEndInput): PracticeBarEndResult {
  const settings = deserializePracticeModeSettings(input.settings);
  const progress = {
    completedBars: clampInteger(input.progress.completedBars, 0, 0, MAX_PRACTICE_BARS),
    awaitingBarBoundary: Boolean(input.progress.awaitingBarBoundary),
  };

  if (!settings.enabled || progress.awaitingBarBoundary) {
    return {
      bpm: input.bpm,
      progress,
    };
  }

  const nextCompletedBars = progress.completedBars + 1;
  if (nextCompletedBars < settings.barsBeforeIncrease) {
    return {
      bpm: input.bpm,
      progress: {
        completedBars: nextCompletedBars,
        awaitingBarBoundary: false,
      },
    };
  }

  if (input.bpm >= settings.maxBpm) {
    return {
      bpm: input.bpm,
      progress: {
        completedBars: 0,
        awaitingBarBoundary: false,
      },
    };
  }

  const nextBpm = Math.min(settings.maxBpm, input.bpm + settings.bpmStep);
  if (nextBpm === input.bpm) {
    return {
      bpm: input.bpm,
      progress: {
        completedBars: 0,
        awaitingBarBoundary: false,
      },
    };
  }

  return {
    bpm: nextBpm,
    progress: {
      completedBars: 0,
      awaitingBarBoundary: true,
    },
  };
}

export function resetPracticeProgress({ isPlaying }: PracticeProgressResetInput): PracticeModeProgress {
  return {
    completedBars: 0,
    awaitingBarBoundary: isPlaying,
  };
}

export function syncPracticeBarStart(progress: PracticeModeProgress): PracticeModeProgress {
  if (!progress.awaitingBarBoundary) {
    return { ...progress };
  }

  return {
    completedBars: progress.completedBars,
    awaitingBarBoundary: false,
  };
}

export function createPresetRecord({
  name,
  state,
  appMode,
  practiceMode,
  savedAt = Date.now(),
}: {
  name: string;
  state: MetronomeState;
  appMode: AppMode;
  practiceMode: PracticeModeSettings;
  savedAt?: number;
}): PresetRecord {
  return {
    name,
    savedAt,
    state: {
      ...serializeMetronomeState(state),
      appMode,
      practiceMode: serializePracticeModeSettings(practiceMode),
    },
  };
}

export function createEmptyPresetSlots(): (PresetRecord | null)[] {
  return Array(MAX_PRESETS).fill(null);
}
