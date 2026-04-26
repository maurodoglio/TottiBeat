import type { SubdivisionId } from '../domain/metronome';
import { getBeatIntervalSeconds, getSubdivisionSteps } from '../domain/metronome';

import type { AudioClock, AudioEngine } from './expoAudioEngine';

export type TransportState = {
  bpm: number;
  beatsPerBar: number;
  noteValue: number;
  subdivision: SubdivisionId;
};

export type AudioTransportOptions = {
  engine: AudioEngine;
  clock: AudioClock;
  initialState: TransportState;
  lookAheadSeconds?: number;
  startDelaySeconds?: number;
};

export type AudioTransport = {
  prepare(): Promise<void>;
  start(): Promise<void>;
  stop(): void;
  updateState(nextState: Partial<TransportState>): void;
  schedulerTick(): Promise<number>;
  dispose(): Promise<void>;
  getDebugState(): {
    isPlaying: boolean;
    queuedNotes: number;
    currentBeat: number;
    nextNoteTime: number;
  };
};

const DEFAULT_LOOK_AHEAD_SECONDS = 1;
const DEFAULT_START_DELAY_SECONDS = 0.05;

export function createAudioTransport({
  engine,
  clock,
  initialState,
  lookAheadSeconds = DEFAULT_LOOK_AHEAD_SECONDS,
  startDelaySeconds = DEFAULT_START_DELAY_SECONDS,
}: AudioTransportOptions): AudioTransport {
  let state: TransportState = { ...initialState };
  let isPlaying = false;
  let currentBeat = 0;
  let nextNoteTime = 0;
  let queuedNotes = 0;

  function beatIntervalSeconds() {
    return getBeatIntervalSeconds({ bpm: state.bpm, noteValue: state.noteValue });
  }

  function realignIfLate() {
    if (!nextNoteTime) {
      return;
    }

    const interval = beatIntervalSeconds();
    if (nextNoteTime >= clock.currentTime) {
      return;
    }

    const missedBeats = Math.floor((clock.currentTime - nextNoteTime) / interval);
    if (missedBeats > 0) {
      currentBeat = (currentBeat + missedBeats) % state.beatsPerBar;
      nextNoteTime += missedBeats * interval;
    }

    if (nextNoteTime < clock.currentTime) {
      nextNoteTime = clock.currentTime + startDelaySeconds;
    }
  }

  async function scheduleBeat(beat: number, atSeconds: number) {
    if (beat === 0) {
      await engine.playAccent(atSeconds);
    } else {
      await engine.playTick(atSeconds);
    }
    queuedNotes += 1;

    const subdivisionSteps = getSubdivisionSteps(state.subdivision);
    if (subdivisionSteps > 1) {
      const stepDuration = beatIntervalSeconds() / subdivisionSteps;
      // schedule only the extra ticks; the base beat is already scheduled above
      for (let step = 1; step < subdivisionSteps; step += 1) {
        await engine.playTick(atSeconds + (stepDuration * step));
        queuedNotes += 1;
      }
    }
  }

  return {
    async prepare() {
      await engine.prepare();
    },

    async start() {
      await engine.prepare();
      isPlaying = true;
      currentBeat = 0;
      queuedNotes = 0;
      nextNoteTime = clock.currentTime + startDelaySeconds;
    },

    stop() {
      isPlaying = false;
      currentBeat = 0;
      queuedNotes = 0;
      nextNoteTime = 0;
    },

    updateState(nextState) {
      state = {
        ...state,
        ...nextState,
      };
    },

    async schedulerTick() {
      if (!isPlaying) {
        return 0;
      }

      realignIfLate();

      let scheduled = 0;
      while (nextNoteTime < clock.currentTime + lookAheadSeconds) {
        await scheduleBeat(currentBeat, nextNoteTime);
        scheduled += 1;
        nextNoteTime += beatIntervalSeconds();
        currentBeat = (currentBeat + 1) % state.beatsPerBar;
      }

      return scheduled;
    },

    async dispose() {
      this.stop();
      await engine.unload();
    },

    getDebugState() {
      return {
        isPlaying,
        queuedNotes,
        currentBeat,
        nextNoteTime,
      };
    },
  };
}
