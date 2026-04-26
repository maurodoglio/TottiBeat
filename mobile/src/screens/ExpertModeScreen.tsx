import { StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '../components/ScreenContainer';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

function FeatureCard({ title, body, accent }: { title: string; body: string; accent: string }) {
  return (
    <View style={styles.featureCard}>
      <View style={[styles.featureAccent, { backgroundColor: accent }]} />
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureBody}>{body}</Text>
      </View>
    </View>
  );
}

export function ExpertModeScreen() {
  return (
    <ScreenContainer
      eyebrow="Expert mode"
      title="Expert Mode"
      subtitle="Advanced workflow surfaces stay grouped in clear native cards so power users gain capability without crowding Easy mode."
      headerAccessory={<Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.headerGlyph}>🎚️</Text>}
    >
      <FeatureCard
        title="Beat subdivision"
        body="Expert-only pulse shaping keeps subdivision distinct from the time signature while remaining easy to scan."
        accent={colors.accent}
      />
      <FeatureCard
        title="Practice ramp"
        body="Bar-boundary tempo growth stays visible as a dedicated training card rather than a buried advanced setting."
        accent={colors.success}
      />
      <FeatureCard
        title="Preset slots"
        body="Saved sessions, beat colors, and future import/export flows can attach to a native preset surface here."
        accent={colors.accentStrong}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerGlyph: {
    fontSize: typography.title,
  },
  featureCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 24,
    padding: spacing.lg,
    alignItems: 'flex-start',
  },
  featureAccent: {
    width: 10,
    borderRadius: 999,
    alignSelf: 'stretch',
  },
  featureContent: {
    flex: 1,
    gap: spacing.xs,
  },
  featureTitle: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    fontWeight: '700',
  },
  featureBody: {
    color: colors.textDim,
    fontSize: typography.body,
    lineHeight: 22,
  },
});
