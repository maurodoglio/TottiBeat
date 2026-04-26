import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '../components/ScreenContainer';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionButton({ label, tone = 'primary' }: { label: string; tone?: 'primary' | 'secondary' }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: true }}
      disabled
      style={[styles.actionButton, tone === 'primary' ? styles.primaryAction : styles.secondaryAction, styles.disabledAction]}
    >
      <Text style={[styles.actionLabel, tone === 'primary' ? styles.primaryActionLabel : styles.secondaryActionLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function EasyModeScreen() {
  return (
    <ScreenContainer
      eyebrow="Easy mode"
      title="TottiBeat"
      subtitle="A native-feel one-thumb metronome preview with big transport, readable timing, and practice-ready glanceability."
      headerAccessory={<Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.heroPulse}>●</Text>}
    >
      <Text style={styles.sectionLabel}>Native feel preview</Text>

      <View style={styles.heroCard}>
        <View style={styles.metricColumn}>
          <Text style={styles.metricValue}>120</Text>
          <Text style={styles.metricLabel}>BPM</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricColumn}>
          <Text style={styles.metricValue}>4/4</Text>
          <Text style={styles.metricLabel}>Time signature</Text>
        </View>
      </View>

      <View style={styles.beatRow}>
        <View style={[styles.beatDot, styles.beatAccent]} />
        <View style={styles.beatDot} />
        <View style={styles.beatDot} />
        <View style={styles.beatDot} />
      </View>

      <View style={styles.quickStatsRow}>
        <StatPill label="Mode" value="Easy" />
        <StatPill label="Tempo" value="Allegro" />
        <StatPill label="Sound" value="Accent" />
      </View>

      <View style={styles.actionsRow}>
        <ActionButton label="Play" />
        <ActionButton label="Tap tempo" tone="secondary" />
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
  beatRow: {
    flexDirection: 'row',
    justifyContent: 'center',
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
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    borderRadius: 22,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledAction: {
    opacity: 0.72,
  },
  primaryAction: {
    backgroundColor: colors.accent,
  },
  secondaryAction: {
    backgroundColor: colors.accentSoft,
  },
  actionLabel: {
    fontSize: typography.body,
    fontWeight: '800',
  },
  primaryActionLabel: {
    color: colors.surface,
  },
  secondaryActionLabel: {
    color: colors.accentStrong,
  },
});
