export type AudioClock = {
  currentTime: number;
};

export type AudioClip = {
  key: string;
  moduleId: number;
};

export type LoadedAudioClip = {
  play(atSeconds: number): Promise<void>;
  unload(): Promise<void>;
};

export type AudioClipPlayer = {
  load(clip: AudioClip): Promise<LoadedAudioClip>;
};

export type AudioEngine = {
  prepare(): Promise<void>;
  playAccent(atSeconds: number): Promise<void>;
  playTick(atSeconds: number): Promise<void>;
  unload(): Promise<void>;
};

export type AudioSessionMode = {
  allowsRecordingIOS: boolean;
  playsInSilentModeIOS: boolean;
  shouldDuckAndroid: boolean;
  staysActiveInBackground: boolean;
};

export type AudioSessionController = {
  setAudioModeAsync(mode: AudioSessionMode): Promise<void>;
};

export type ExpoAudioEngineOptions = {
  player?: AudioClipPlayer;
  clock?: AudioClock;
  accentClip: AudioClip;
  tickClip: AudioClip;
};

type ExpoSoundInstance = {
  replayAsync(): Promise<void>;
  unloadAsync(): Promise<void>;
};

type ExpoAvModule = {
  Audio: {
    setAudioModeAsync(mode: AudioSessionMode): Promise<void>;
    Sound: {
      createAsync(
        source: number,
        initialStatus: { shouldPlay: boolean; progressUpdateIntervalMillis: number },
      ): Promise<{ sound: ExpoSoundInstance }>;
    };
  };
};

async function loadExpoAvModule(): Promise<ExpoAvModule> {
  return (await import('expo-av')) as unknown as ExpoAvModule;
}

class ExpoLoadedClip implements LoadedAudioClip {
  constructor(private readonly sound: ExpoSoundInstance) {}

  async play(): Promise<void> {
    await this.sound.replayAsync();
  }

  async unload(): Promise<void> {
    await this.sound.unloadAsync();
  }
}

class ExpoAudioClipPlayer implements AudioClipPlayer {
  async load(clip: AudioClip): Promise<LoadedAudioClip> {
    const expoAv = await loadExpoAvModule();
    const { sound } = await expoAv.Audio.Sound.createAsync(clip.moduleId, {
      shouldPlay: false,
      progressUpdateIntervalMillis: 16,
    });

    return new ExpoLoadedClip(sound);
  }
}

export async function configureAudioSession(
  controller?: AudioSessionController,
): Promise<void> {
  const resolvedController = controller ?? (await loadExpoAvModule()).Audio;

  await resolvedController.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: false,
    staysActiveInBackground: false,
  });
}

export function createExpoAudioEngine({
  player = new ExpoAudioClipPlayer(),
  clock = { currentTime: 0 },
  accentClip,
  tickClip,
}: ExpoAudioEngineOptions): AudioEngine {
  let accent: LoadedAudioClip | null = null;
  let tick: LoadedAudioClip | null = null;
  let accentPromise: Promise<LoadedAudioClip> | null = null;
  let tickPromise: Promise<LoadedAudioClip> | null = null;

  async function ensureAccent() {
    if (accent) {
      return accent;
    }

    if (!accentPromise) {
      accentPromise = player.load(accentClip).then((loaded) => {
        accent = loaded;
        return loaded;
      });
    }

    return accentPromise;
  }

  async function ensureTick() {
    if (tick) {
      return tick;
    }

    if (!tickPromise) {
      tickPromise = player.load(tickClip).then((loaded) => {
        tick = loaded;
        return loaded;
      });
    }

    return tickPromise;
  }

  return {
    async prepare() {
      await Promise.all([ensureAccent(), ensureTick()]);
    },

    async playAccent(atSeconds: number) {
      const loadedAccent = await ensureAccent();
      await loadedAccent.play(Math.max(atSeconds, clock.currentTime));
    },

    async playTick(atSeconds: number) {
      const loadedTick = await ensureTick();
      await loadedTick.play(Math.max(atSeconds, clock.currentTime));
    },

    async unload() {
      if (accent) {
        await accent.unload();
      }
      if (tick) {
        await tick.unload();
      }

      accent = null;
      tick = null;
      accentPromise = null;
      tickPromise = null;
    },
  };
}
