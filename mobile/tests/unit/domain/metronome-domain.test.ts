import {
  DEFAULT_METRONOME_STATE,
  DEFAULT_PRACTICE_MODE_SETTINGS,
  MAX_BEATS_PER_BAR,
  MAX_BPM,
  MAX_PRACTICE_BARS,
  MAX_PRACTICE_BPM_STEP,
  MAX_PRACTICE_MAX_BPM,
  METRONOME_STORAGE_KEY,
  MIN_BPM,
  PRACTICE_MODE_STORAGE_KEY,
  SOUND_TYPES,
  SUBDIVISION_TYPES,
  TEMPO_MARKS,
  TIME_SIGNATURE_DENOMINATORS,
  applyPracticeBarEnd,
  cloneBeatSettings,
  createDefaultBeatSettings,
  createEmptyPresetSlots,
  createMetronomeState,
  createPresetRecord,
  deserializeMetronomeState,
  deserializePracticeModeSettings,
  getBeatIntervalSeconds,
  getSubdivisionSteps,
  getTempoName,
  resetPracticeProgress,
  serializeMetronomeState,
  syncPracticeBarStart,
} from '../../../src/domain/metronome';

describe('native metronome domain parity', () => {
  it('preserves the web tempo-mark bucket boundaries', () => {
    expect(getTempoName(20)).toBe('Grave');
    expect(getTempoName(40)).toBe('Largo');
    expect(getTempoName(60)).toBe('Larghetto');
    expect(getTempoName(120)).toBe('Allegro');
    expect(getTempoName(300)).toBe('Prestissimo');
    expect(getTempoName(301)).toBe('');
  });

  it('keeps the time-signature denominator in the beat-interval math', () => {
    expect(getBeatIntervalSeconds({ bpm: 120, noteValue: 4 })).toBeCloseTo(0.5, 5);
    expect(getBeatIntervalSeconds({ bpm: 120, noteValue: 8 })).toBeCloseTo(0.25, 5);
    expect(getBeatIntervalSeconds({ bpm: 120, noteValue: 2 })).toBeCloseTo(1, 5);
    expect(getBeatIntervalSeconds({ bpm: 90, noteValue: 8 })).toBeCloseTo(1 / 3, 5);
    expect(getBeatIntervalSeconds({ bpm: 60, noteValue: 2 })).toBeCloseTo(2, 5);
  });

  it('matches the current subdivision step mapping', () => {
    expect(getSubdivisionSteps('quarter')).toBe(1);
    expect(getSubdivisionSteps('eighth')).toBe(2);
    expect(getSubdivisionSteps('triplet')).toBe(3);
    expect(getSubdivisionSteps('sixteenth')).toBe(4);
    expect(getSubdivisionSteps('bogus')).toBe(1);
  });

  it('builds default beat settings with an accented first beat and cycling colors', () => {
    const beatSettings = createDefaultBeatSettings(10);

    expect(beatSettings).toHaveLength(10);
    expect(beatSettings[0].sound).toBe('accent');
    expect(beatSettings.slice(1).every((beat) => beat.sound === 'tick')).toBe(true);
    expect(beatSettings[8].color).toBe(beatSettings[0].color);
  });

  it('deserializes metronome state with the same fallback rules as the web app', () => {
    const base = createMetronomeState({
      bpm: 132,
      beatsPerBar: 7,
      noteValue: 8,
      subdivision: 'triplet',
      beatSettings: [
        { sound: 'accent', color: '#111111' },
        { sound: 'tick', color: '#222222' },
        { sound: 'tick', color: '#333333' },
        { sound: 'tick', color: '#444444' },
        { sound: 'tick', color: '#555555' },
        { sound: 'tick', color: '#666666' },
        { sound: 'tick', color: '#777777' },
      ],
    });

    const parsed = deserializeMetronomeState({
      bpm: 160,
      beatsPerBar: 6,
      noteValue: '16',
      subdivision: 'sixteenth',
      useUniform: false,
      uniformSound: 'clap',
      uniformColor: '#ff6584',
      beatSettings: [{ sound: 'kick', color: '#123456' }],
    }, base);

    expect(parsed.bpm).toBe(160);
    expect(parsed.beatsPerBar).toBe(6);
    expect(parsed.noteValue).toBe(16);
    expect(parsed.subdivision).toBe('sixteenth');
    expect(parsed.useUniform).toBe(false);
    expect(parsed.beatSettings).toHaveLength(6);
    expect(parsed.beatSettings[0]).toEqual({ sound: 'kick', color: '#123456' });
    expect(parsed.beatSettings[1].sound).toBe('tick');

    const invalid = deserializeMetronomeState({
      bpm: 999,
      beatsPerBar: 0,
      noteValue: '3',
      subdivision: 'bogus',
      uniformSound: 'alien-click',
      beatSettings: [{ sound: 'unknown', color: '' }],
    }, base);

    expect(invalid.bpm).toBe(999);
    expect(invalid.beatsPerBar).toBe(0);
    expect(invalid.noteValue).toBe(4);
    expect(invalid.subdivision).toBe('bogus');
    expect(invalid.uniformSound).toBe('alien-click');
    expect(invalid.beatSettings).toHaveLength(0);
  });

  it('serializes a metronome snapshot without leaking references', () => {
    const state = createMetronomeState({
      beatsPerBar: 2,
      useUniform: false,
      beatSettings: [
        { sound: 'accent', color: '#111111' },
        { sound: 'tick', color: '#222222' },
      ],
    });

    const serialized = serializeMetronomeState(state);
    serialized.beatSettings[0].sound = 'mute';

    expect(state.beatSettings[0].sound).toBe('accent');
    expect(serialized).toEqual({
      bpm: 120,
      beatsPerBar: 2,
      noteValue: 4,
      beatSettings: [
        { sound: 'mute', color: '#111111' },
        { sound: 'tick', color: '#222222' },
      ],
      useUniform: false,
      uniformSound: 'tick',
      uniformColor: '#6c63ff',
      subdivision: 'quarter',
    });
  });

  it('sanitizes practice mode settings to the web defaults and limits', () => {
    const parsed = deserializePracticeModeSettings({
      enabled: 1,
      barsBeforeIncrease: '0',
      bpmStep: '99',
      maxBpm: '999',
    });

    expect(parsed).toEqual({
      enabled: true,
      barsBeforeIncrease: 1,
      bpmStep: 50,
      maxBpm: 300,
    });

    expect(deserializePracticeModeSettings()).toEqual(DEFAULT_PRACTICE_MODE_SETTINGS);
  });

  it('applies practice tempo increases only after the configured number of full bars', () => {
    const initial = {
      settings: deserializePracticeModeSettings({ enabled: true, barsBeforeIncrease: 2, bpmStep: 3, maxBpm: 130 }),
      progress: { completedBars: 0, awaitingBarBoundary: false },
      bpm: 120,
    };

    const afterFirstBar = applyPracticeBarEnd(initial);
    expect(afterFirstBar.bpm).toBe(120);
    expect(afterFirstBar.progress.completedBars).toBe(1);
    expect(afterFirstBar.progress.awaitingBarBoundary).toBe(false);

    const afterSecondBar = applyPracticeBarEnd({
      ...initial,
      bpm: afterFirstBar.bpm,
      progress: afterFirstBar.progress,
    });
    expect(afterSecondBar.bpm).toBe(123);
    expect(afterSecondBar.progress.completedBars).toBe(0);
    expect(afterSecondBar.progress.awaitingBarBoundary).toBe(true);
  });

  it('never lowers tempo when the practice max is below the current BPM', () => {
    const result = applyPracticeBarEnd({
      settings: deserializePracticeModeSettings({ enabled: true, barsBeforeIncrease: 1, bpmStep: 10, maxBpm: 160 }),
      progress: { completedBars: 0, awaitingBarBoundary: false },
      bpm: 200,
    });

    expect(result.bpm).toBe(200);
    expect(result.progress.completedBars).toBe(0);
    expect(result.progress.awaitingBarBoundary).toBe(false);
  });

  it('does not advance practice mode while waiting for the next bar boundary', () => {
    const result = applyPracticeBarEnd({
      settings: deserializePracticeModeSettings({ enabled: true, barsBeforeIncrease: 1, bpmStep: 4, maxBpm: 150 }),
      progress: { completedBars: 0, awaitingBarBoundary: true },
      bpm: 120,
    });

    expect(result.bpm).toBe(120);
    expect(result.progress).toEqual({ completedBars: 0, awaitingBarBoundary: true });
  });

  it('resets practice progress using the same playback-aware rule as the web app', () => {
    expect(resetPracticeProgress({ isPlaying: false })).toEqual({
      completedBars: 0,
      awaitingBarBoundary: false,
    });

    expect(resetPracticeProgress({ isPlaying: true })).toEqual({
      completedBars: 0,
      awaitingBarBoundary: true,
    });
  });

  it('clears the waiting flag when the next bar actually starts', () => {
    expect(syncPracticeBarStart({ completedBars: 0, awaitingBarBoundary: true })).toEqual({
      completedBars: 0,
      awaitingBarBoundary: false,
    });

    expect(syncPracticeBarStart({ completedBars: 1, awaitingBarBoundary: false })).toEqual({
      completedBars: 1,
      awaitingBarBoundary: false,
    });
  });

  it('recreates the mid-bar enable flow without counting the partial bar', () => {
    const enabledMidBar = resetPracticeProgress({ isPlaying: true });

    const beforeBoundary = applyPracticeBarEnd({
      settings: deserializePracticeModeSettings({ enabled: true, barsBeforeIncrease: 1, bpmStep: 10, maxBpm: 140 }),
      progress: enabledMidBar,
      bpm: 120,
    });
    expect(beforeBoundary.bpm).toBe(120);
    expect(beforeBoundary.progress.awaitingBarBoundary).toBe(true);

    const afterBoundary = syncPracticeBarStart(beforeBoundary.progress);
    const afterFullBar = applyPracticeBarEnd({
      settings: deserializePracticeModeSettings({ enabled: true, barsBeforeIncrease: 1, bpmStep: 10, maxBpm: 140 }),
      progress: afterBoundary,
      bpm: beforeBoundary.bpm,
    });

    expect(afterFullBar.bpm).toBe(130);
    expect(afterFullBar.progress.awaitingBarBoundary).toBe(true);
  });

  it('creates preset records and empty slots with the current storage assumptions', () => {
    const state = createMetronomeState({ bpm: 144, beatsPerBar: 7, noteValue: 8 });
    const practiceMode = deserializePracticeModeSettings({ enabled: true, barsBeforeIncrease: 3, bpmStep: 6, maxBpm: 180 });
    const record = createPresetRecord({
      name: 'Odd meter',
      state,
      appMode: 'expert',
      practiceMode,
      savedAt: 123,
    });

    expect(record).toEqual({
      name: 'Odd meter',
      savedAt: 123,
      state: {
        bpm: 144,
        beatsPerBar: 7,
        noteValue: 8,
        beatSettings: state.beatSettings,
        useUniform: true,
        uniformSound: 'tick',
        uniformColor: '#6c63ff',
        subdivision: 'quarter',
        appMode: 'expert',
        practiceMode,
      },
    });

    const slots = createEmptyPresetSlots();
    expect(slots).toHaveLength(5);
    expect(slots.every((slot) => slot === null)).toBe(true);
  });

  it('exports the same public constants Batch B depends on', () => {
    expect(METRONOME_STORAGE_KEY).toBe('tottibeat_presets');
    expect(PRACTICE_MODE_STORAGE_KEY).toBe('practiceMode');
    expect(MIN_BPM).toBe(20);
    expect(MAX_BPM).toBe(300);
    expect(MAX_PRACTICE_BARS).toBe(32);
    expect(MAX_PRACTICE_BPM_STEP).toBe(50);
    expect(MAX_PRACTICE_MAX_BPM).toBe(300);
    expect(DEFAULT_METRONOME_STATE.beatsPerBar).toBe(4);
    expect(TEMPO_MARKS).toHaveLength(10);
    expect(TIME_SIGNATURE_DENOMINATORS).toEqual([2, 4, 8, 16]);
    expect(SUBDIVISION_TYPES.map((option) => option.id)).toEqual(['quarter', 'eighth', 'triplet', 'sixteenth']);
    expect(SOUND_TYPES[0].id).toBe('tick');
    expect(MAX_BEATS_PER_BAR).toBe(8);
    expect(cloneBeatSettings(DEFAULT_METRONOME_STATE.beatSettings)).not.toBe(DEFAULT_METRONOME_STATE.beatSettings);
  });
});