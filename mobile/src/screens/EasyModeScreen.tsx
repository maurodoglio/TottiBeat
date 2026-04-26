import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { configureAudioSession, createAudioTransport, createExpoAudioEngine, type AudioTransport } from '../audio';
import { ScreenContainer } from '../components/ScreenContainer';
import {
  MAX_BEATS_PER_BAR,
  MAX_BPM,
  MIN_BPM,
  TIME_SIGNATURE_DENOMINATORS,
  createMetronomeState,
  getTempoName,
  registerTapTempoTap,
  type NoteValue,
} from '../domain/metronome';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

const NUMERATOR_OPTIONS = Array.from({ length: MAX_BEATS_PER_BAR }, (_, index) => index + 1);
const SCHEDULER_INTERVAL_MS = 25;
const TRANSPORT_SCHEDULER_OPTIONS = {
  lookAheadSeconds: 0.05,
  startDelaySeconds: 0.05,
} as const;

type StatPillProps = {
  label: string;
  value: string;
};

function StatPill({ label, value }: StatPillProps) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

type ControlButtonProps = {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'secondary' | 'ghost';
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'radio';
  accessibilityState?: { disabled?: boolean; selected?: boolean; checked?: boolean; busy?: boolean };
  disabled?: boolean;
};

function ControlButton({
  label,
  onPress,
  tone = 'secondary',
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityState,
  disabled = false,
}: ControlButtonProps) {
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ ...accessibilityState, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.controlButton,
        tone === 'primary' ? styles.primaryButton : null,
        tone === 'secondary' ? styles.secondaryButton : null,
        tone === 'ghost' ? styles.ghostButton : null,
        pressed ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null,
      ]}
    >
      <Text
        style={[
          styles.controlButtonLabel,
          tone === 'primary' ? styles.primaryButtonLabel : null,
          tone === 'secondary' ? styles.secondaryButtonLabel : null,
          tone === 'ghost' ? styles.ghostButtonLabel : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type SegmentedButtonProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
};

function SegmentedButton({ label, selected, onPress, accessibilityLabel }: SegmentedButtonProps) {
  return (
    <ControlButton
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, selected }}
      label={label}
      onPress={onPress}
      tone={selected ? 'secondary' : 'ghost'}
    />
  );
}

export function EasyModeScreen() {
  const initialState = useMemo(() => createMetronomeState(), []);
  const [bpm, setBpm] = useState(initialState.bpm);
  const [bpmInput, setBpmInput] = useState(String(initialState.bpm));
  const [beatsPerBar, setBeatsPerBar] = useState(initialState.beatsPerBar);
  const [noteValue, setNoteValue] = useState<NoteValue>(initialState.noteValue as NoteValue);
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const transportRef = useRef<AudioTransport | null>(null);
  const schedulerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const isStartingRef = useRef(false);
  const startAttemptRef = useRef(0);

  if (!transportRef.current) {
    const engine = createExpoAudioEngine({
      accentClip: { key: 'accent', moduleId: require('../../assets/audio/accent.wav') },
      tickClip: { key: 'tick', moduleId: require('../../assets/audio/tick.wav') },
    });

    transportRef.current = createAudioTransport({
      engine,
      clock: {
        get currentTime() {
          return Date.now() / 1000;
        },
      },
      initialState: {
        bpm: initialState.bpm,
        beatsPerBar: initialState.beatsPerBar,
        noteValue: initialState.noteValue,
        subdivision: 'quarter',
      },
      ...TRANSPORT_SCHEDULER_OPTIONS,
    });
  }

  const transport = transportRef.current;
  const tempoName = getTempoName(bpm);
  const timeSignature = `${beatsPerBar}/${noteValue}`;
  const tapTempoLabel = tapTimes.length >= 2 ? `Tap tempo · ${bpm} BPM` : 'Tap tempo';

  useEffect(() => {
    transport.updateState({ bpm, beatsPerBar, noteValue, subdivision: 'quarter' });
  }, [bpm, beatsPerBar, noteValue, transport]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      startAttemptRef.current += 1;
      if (schedulerIntervalRef.current) {
        clearInterval(schedulerIntervalRef.current);
        schedulerIntervalRef.current = null;
      }
      transport.stop();
      void transport.dispose();
    };
  }, [transport]);

  function clampBpm(nextBpm: number) {
    return Math.min(MAX_BPM, Math.max(MIN_BPM, nextBpm));
  }

  function applyBpm(nextBpm: number, preserveTapHistory = false) {
    const sanitizedBpm = clampBpm(nextBpm);
    setBpm(sanitizedBpm);
    setBpmInput(String(sanitizedBpm));
    if (!preserveTapHistory) {
      setTapTimes([]);
    }
  }

  function handleTapTempo() {
    const result = registerTapTempoTap(tapTimes, Date.now(), bpm);
    setTapTimes(result.tapTimes);
    setBpm(result.bpm);
    setBpmInput(String(result.bpm));
  }

  function handleBpmSubmit() {
    const parsed = Number.parseInt(bpmInput, 10);
    applyBpm(Number.isNaN(parsed) ? bpm : parsed);
  }

  async function handleTogglePlayback() {
    if (isStartingRef.current || isStarting) {
      return;
    }

    if (isPlaying) {
      if (schedulerIntervalRef.current) {
        clearInterval(schedulerIntervalRef.current);
        schedulerIntervalRef.current = null;
      }
      startAttemptRef.current += 1;
      transport.stop();
      setIsPlaying(false);
      return;
    }

    const startAttempt = startAttemptRef.current + 1;
    startAttemptRef.current = startAttempt;
    isStartingRef.current = true;
    setIsStarting(true);

    try {
      if (schedulerIntervalRef.current) {
        clearInterval(schedulerIntervalRef.current);
        schedulerIntervalRef.current = null;
      }

      await configureAudioSession();
      await transport.start();

      if (!isMountedRef.current || startAttemptRef.current !== startAttempt) {
        transport.stop();
        return;
      }

      await transport.schedulerTick();

      if (!isMountedRef.current || startAttemptRef.current !== startAttempt) {
        transport.stop();
        return;
      }

      schedulerIntervalRef.current = setInterval(() => {
        void transport.schedulerTick();
      }, SCHEDULER_INTERVAL_MS);

      setIsPlaying(true);
    } catch {
      if (schedulerIntervalRef.current) {
        clearInterval(schedulerIntervalRef.current);
        schedulerIntervalRef.current = null;
      }
      transport.stop();
      if (isMountedRef.current) {
        setIsPlaying(false);
      }
    } finally {
      if (startAttemptRef.current === startAttempt) {
        isStartingRef.current = false;
      }
      if (isMountedRef.current && startAttemptRef.current === startAttempt) {
        setIsStarting(false);
      }
    }
  }

  return (
    <ScreenContainer
      eyebrow="Easy mode"
      title="TottiBeat"
      subtitle="A native-feel one-thumb metronome with big transport, readable timing, and musician-friendly glanceability."
      headerAccessory={<Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.heroPulse}>●</Text>}
    >
      <Text style={styles.sectionLabel}>Tempo</Text>

      <View style={styles.heroCard}>
        <View style={styles.metricColumn}>
          <TextInput
            accessibilityHint={`Enter a BPM between ${MIN_BPM} and ${MAX_BPM}`}
            accessibilityLabel="BPM input"
            keyboardType="number-pad"
            onBlur={handleBpmSubmit}
            onChangeText={setBpmInput}
            onSubmitEditing={handleBpmSubmit}
            style={styles.metricInput}
            value={bpmInput}
          />
          <Text style={styles.metricLabel}>BPM</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricColumn}>
          <Text style={styles.metricValue}>{timeSignature}</Text>
          <Text style={styles.metricLabel}>Time signature</Text>
        </View>
      </View>

      <View style={styles.tempoAdjustRow}>
        <ControlButton accessibilityLabel="Decrease BPM" label="−" onPress={() => applyBpm(bpm - 1)} tone="ghost" />
        <ControlButton accessibilityLabel="Increase BPM" label="+" onPress={() => applyBpm(bpm + 1)} tone="ghost" />
      </View>

      <View style={styles.beatRow}>
        {Array.from({ length: beatsPerBar }, (_, index) => (
          <View key={`beat-${index + 1}`} style={[styles.beatDot, index === 0 ? styles.beatAccent : null]} />
        ))}
      </View>

      <View style={styles.quickStatsRow}>
        <StatPill label="Mode" value="Easy" />
        <StatPill label="Tempo" value={tempoName || 'Free'} />
        <StatPill label="Subdivision" value="Quarter" />
      </View>

      <Text accessibilityLabel="Time signature numerator" style={styles.sectionLabel}>
        Time signature
      </Text>
      <View accessibilityLabel="Time signature numerator choices" accessibilityRole="radiogroup" style={styles.segmentGroup}>
        {NUMERATOR_OPTIONS.map((value) => (
          <SegmentedButton
            accessibilityLabel={`${value} beats per bar`}
            key={`numerator-${value}`}
            label={String(value)}
            onPress={() => setBeatsPerBar(value)}
            selected={beatsPerBar === value}
          />
        ))}
      </View>

      <View accessibilityLabel="Time signature denominator choices" accessibilityRole="radiogroup" style={styles.segmentGroup}>
        {TIME_SIGNATURE_DENOMINATORS.map((value) => (
          <SegmentedButton
            accessibilityLabel={`Set denominator to ${value}`}
            key={`denominator-${value}`}
            label={`/${value}`}
            onPress={() => setNoteValue(value)}
            selected={noteValue === value}
          />
        ))}
      </View>

      <View style={styles.actionsRow}>
        <ControlButton
          accessibilityState={{ busy: isStarting }}
          disabled={isStarting}
          label={isPlaying ? 'Stop' : isStarting ? 'Starting…' : 'Start'}
          onPress={() => void handleTogglePlayback()}
          tone="primary"
        />
        <ControlButton label={tapTempoLabel} onPress={handleTapTempo} tone="secondary" />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroPulse: {
    color: colors.accent,
    fontSize: typography.hero,
    lineHeight: typography.hero,
  },
  sectionLabel: {
    color: colors.textDim,
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 28,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  metricInput: {
    minWidth: 112,
    borderRadius: 20,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: typography.hero,
    fontWeight: '800',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
  },
  metricValue: {
    color: colors.text,
    fontSize: typography.hero,
    fontWeight: '800',
  },
  metricLabel: {
    color: colors.textDim,
    fontSize: typography.bodySmall,
    fontWeight: '600',
  },
  metricDivider: {
    width: 1,
    height: 56,
    backgroundColor: colors.border,
  },
  tempoAdjustRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  beatRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  beatDot: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  beatAccent: {
    width: 22,
    height: 22,
    backgroundColor: colors.accent,
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statPill: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 20,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    color: colors.text,
    fontSize: typography.metric,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.textDim,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  segmentGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  controlButton: {
    flex: 1,
    borderRadius: 22,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButton: {
    backgroundColor: colors.accent,
  },
  secondaryButton: {
    backgroundColor: colors.accentSoft,
  },
  ghostButton: {
    backgroundColor: colors.surfaceMuted,
  },
  controlButtonLabel: {
    fontSize: typography.body,
    fontWeight: '800',
    textAlign: 'center',
  },
  primaryButtonLabel: {
    color: colors.surface,
  },
  secondaryButtonLabel: {
    color: colors.accentStrong,
  },
  ghostButtonLabel: {
    color: colors.text,
  },
});
