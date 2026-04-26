import {
  createAudioTransport,
  createExpoAudioEngine,
  configureAudioSession,
  type AudioClock,
  type AudioClip,
  type AudioClipPlayer,
  type AudioSessionController,
  type LoadedAudioClip,
} from '../../../src/audio';

class FakeClock implements AudioClock {
  currentTime = 0;

  advanceBy(seconds: number) {
    this.currentTime += seconds;
  }
}

class FakeLoadedClip implements LoadedAudioClip {
  constructor(
    public readonly key: string,
    private readonly events: { type: string; key: string; at?: number }[],
  ) {}

  async play(atSeconds: number) {
    this.events.push({ type: 'play', key: this.key, at: atSeconds });
  }

  async unload() {
    this.events.push({ type: 'unload', key: this.key });
  }
}

class FakePlayer implements AudioClipPlayer {
  public readonly events: { type: string; key: string; at?: number }[] = [];

  async load(clip: AudioClip) {
    this.events.push({ type: 'load', key: clip.key });
    return new FakeLoadedClip(clip.key, this.events);
  }
}

describe('native audio transport spike', () => {
  it('loads and schedules accented beats plus subdivisions ahead of playback time', async () => {
    jest.useFakeTimers();

    const clock = new FakeClock();
    const player = new FakePlayer();
    const engine = createExpoAudioEngine({
      player,
      clock,
      accentClip: { key: 'accent', moduleId: 1 },
      tickClip: { key: 'tick', moduleId: 2 },
    });

    const transport = createAudioTransport({
      engine,
      clock,
      initialState: {
        bpm: 120,
        beatsPerBar: 4,
        noteValue: 4,
        subdivision: 'eighth',
      },
    });

    await transport.prepare();
    await transport.start();
    const scheduled = await transport.schedulerTick();

    expect(scheduled).toBeGreaterThan(0);
    expect(player.events.filter((event) => event.type === 'load').map((event) => event.key)).toEqual(['accent', 'tick']);
    expect(player.events.filter((event) => event.type === 'play')).toEqual([]);
    expect(transport.getDebugState().queuedNotes).toBeGreaterThan(0);

    await jest.advanceTimersByTimeAsync(800);
    expect(player.events.filter((event) => event.type === 'play').slice(0, 4)).toEqual([
      { type: 'play', key: 'accent', at: 0.05 },
      { type: 'play', key: 'tick', at: 0.3 },
      { type: 'play', key: 'tick', at: 0.55 },
      { type: 'play', key: 'tick', at: 0.8 },
    ]);

    jest.useRealTimers();
  });

  it('reschedules future beats after a stop/start cycle without leaking old queue state', async () => {
    jest.useFakeTimers();

    const clock = new FakeClock();
    const player = new FakePlayer();
    const engine = createExpoAudioEngine({
      player,
      clock,
      accentClip: { key: 'accent', moduleId: 1 },
      tickClip: { key: 'tick', moduleId: 2 },
    });

    const transport = createAudioTransport({
      engine,
      clock,
      initialState: {
        bpm: 90,
        beatsPerBar: 3,
        noteValue: 4,
        subdivision: 'quarter',
      },
    });

    await transport.prepare();
    await transport.start();
    await transport.schedulerTick();
    transport.stop();

    clock.advanceBy(2);
    await transport.start();
    await transport.schedulerTick();
    await jest.advanceTimersByTimeAsync(1000);

    const playEvents = player.events.filter((event) => event.type === 'play');
    const restartEvents = playEvents.slice(-2);

    expect(restartEvents[0].at).toBeGreaterThan(2);
    expect(player.events.filter((event) => event.type === 'play').length).toBeGreaterThanOrEqual(2);

    jest.useRealTimers();
  });

  it('adapts future scheduling when the denominator changes while stopped', async () => {
    jest.useFakeTimers();

    const clock = new FakeClock();
    const player = new FakePlayer();
    const engine = createExpoAudioEngine({
      player,
      clock,
      accentClip: { key: 'accent', moduleId: 1 },
      tickClip: { key: 'tick', moduleId: 2 },
    });

    const transport = createAudioTransport({
      engine,
      clock,
      initialState: {
        bpm: 120,
        beatsPerBar: 4,
        noteValue: 4,
        subdivision: 'quarter',
      },
    });

    await transport.prepare();
    transport.updateState({ noteValue: 8 });
    await transport.start();
    await transport.schedulerTick();
    await jest.advanceTimersByTimeAsync(300);

    const playEvents = player.events.filter((event) => event.type === 'play');
    expect(playEvents[0]).toEqual({ type: 'play', key: 'accent', at: 0.05 });
    expect(playEvents[1]).toEqual({ type: 'play', key: 'tick', at: 0.3 });

    jest.useRealTimers();
  });

  it('unloads prepared clips when disposed', async () => {
    const clock = new FakeClock();
    const player = new FakePlayer();
    const engine = createExpoAudioEngine({
      player,
      clock,
      accentClip: { key: 'accent', moduleId: 1 },
      tickClip: { key: 'tick', moduleId: 2 },
    });

    const transport = createAudioTransport({
      engine,
      clock,
      initialState: {
        bpm: 120,
        beatsPerBar: 4,
        noteValue: 4,
        subdivision: 'quarter',
      },
    });

    await transport.prepare();
    await transport.dispose();

    expect(player.events.filter((event) => event.type === 'unload').map((event) => event.key)).toEqual(['accent', 'tick']);
  });

  it('configures the audio session for foreground metronome playback', async () => {
    const calls: object[] = [];
    const controller: AudioSessionController = {
      async setAudioModeAsync(mode) {
        calls.push(mode);
      },
    };

    await configureAudioSession(controller);

    expect(calls).toEqual([
      {
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        staysActiveInBackground: false,
      },
    ]);
  });

  it('schedules future playback without blocking the scheduler until the click actually fires', async () => {
    const clock = new FakeClock();
    const player = new FakePlayer();
    const engine = createExpoAudioEngine({
      player,
      clock,
      accentClip: { key: 'accent', moduleId: 1 },
      tickClip: { key: 'tick', moduleId: 2 },
    });

    const transport = createAudioTransport({
      engine,
      clock,
      initialState: {
        bpm: 120,
        beatsPerBar: 4,
        noteValue: 4,
        subdivision: 'quarter',
      },
      lookAheadSeconds: 0.1,
      startDelaySeconds: 0.05,
    });

    await transport.start();
    const scheduled = await transport.schedulerTick();

    expect(scheduled).toBeGreaterThan(0);
    expect(player.events.filter((event) => event.type === 'play')).toEqual([]);
    expect(transport.getDebugState().queuedNotes).toBeGreaterThan(0);
  });

  it('cancels queued future playback when the transport stops before the click fires', async () => {
    jest.useFakeTimers();

    const clock = new FakeClock();
    const player = new FakePlayer();
    const engine = createExpoAudioEngine({
      player,
      clock,
      accentClip: { key: 'accent', moduleId: 1 },
      tickClip: { key: 'tick', moduleId: 2 },
    });

    const transport = createAudioTransport({
      engine,
      clock,
      initialState: {
        bpm: 120,
        beatsPerBar: 4,
        noteValue: 4,
        subdivision: 'quarter',
      },
    });

    await transport.start();
    await transport.schedulerTick();
    transport.stop();

    await jest.advanceTimersByTimeAsync(1000);
    expect(player.events.filter((event) => event.type === 'play')).toEqual([]);

    jest.useRealTimers();
  });

  it('does not double-load clips when prepare is called concurrently', async () => {
    const clock = new FakeClock();
    const player = new FakePlayer();
    const engine = createExpoAudioEngine({
      player,
      clock,
      accentClip: { key: 'accent', moduleId: 1 },
      tickClip: { key: 'tick', moduleId: 2 },
    });

    await Promise.all([engine.prepare(), engine.prepare(), engine.prepare()]);

    expect(player.events.filter((event) => event.type === 'load').map((event) => event.key)).toEqual(['accent', 'tick']);
  });

  it('realigns overdue scheduler work instead of bunching late beats onto the current time', async () => {
    jest.useFakeTimers();

    const clock = new FakeClock();
    const player = new FakePlayer();
    const engine = createExpoAudioEngine({
      player,
      clock,
      accentClip: { key: 'accent', moduleId: 1 },
      tickClip: { key: 'tick', moduleId: 2 },
    });

    const transport = createAudioTransport({
      engine,
      clock,
      initialState: {
        bpm: 120,
        beatsPerBar: 4,
        noteValue: 4,
        subdivision: 'quarter',
      },
    });

    await transport.start();
    clock.advanceBy(3);
    await transport.schedulerTick();
    await jest.advanceTimersByTimeAsync(600);

    const playEvents = player.events.filter((event) => event.type === 'play');
    expect(playEvents[0]).toEqual({ type: 'play', key: 'tick', at: 3.05 });
    expect(playEvents[1]).toEqual({ type: 'play', key: 'tick', at: 3.55 });
    expect(playEvents.every((event) => (event.at ?? 0) >= 3.05)).toBe(true);

    jest.useRealTimers();
  });
});