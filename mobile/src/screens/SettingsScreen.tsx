import { StyleSheet, Text, View } from 'react-native';

import { buildAudioValidationChecklist, summarizeAudioValidationReadiness } from '../audio';
import { ScreenContainer } from '../components/ScreenContainer';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

const validationChecklist = buildAudioValidationChecklist();
const readiness = summarizeAudioValidationReadiness(validationChecklist);

export function SettingsScreen() {
  return (
    <ScreenContainer
      eyebrow="Device settings"
      title="Settings"
      subtitle="Native device options and hardware sign-off planning live together so the mobile roadmap stays visible without overstating release readiness."
      headerAccessory={<Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.headerGlyph}>⚙️</Text>}
    >
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Audio validation preview</Text>
        <Text style={styles.summaryBody}>{readiness.summary}</Text>
        <Text style={styles.summaryNote}>Placeholder surface until real device inputs and persistence land.</Text>
      </View>

      {validationChecklist.map((item) => (
        <View key={item.id} style={styles.checkItem}>
          <View style={styles.checkText}>
            <Text style={styles.checkLabel}>{item.label}</Text>
            <Text style={styles.checkDetail}>{item.detail}</Text>
          </View>
          <Text style={styles.pendingBadge}>{item.status}</Text>
        </View>
      ))}

      <View style={styles.preferenceRow}>
        <Text style={styles.preferenceTitle}>Wake lock</Text>
        <Text style={styles.preferenceValue}>Planned</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerGlyph: {
    fontSize: typography.title,
  },
  summaryCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  summaryTitle: {
    color: colors.accentStrong,
    fontSize: typography.sectionTitle,
    fontWeight: '700',
  },
  summaryBody: {
    color: colors.text,
    fontSize: typography.body,
  },
  summaryNote: {
    color: colors.textDim,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  checkItem: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 22,
    padding: spacing.lg,
  },
  checkText: {
    flex: 1,
    gap: spacing.xs,
  },
  checkLabel: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  checkDetail: {
    color: colors.textDim,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  pendingBadge: {
    color: colors.accentStrong,
    backgroundColor: colors.surface,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    fontSize: typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  preferenceTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  preferenceValue: {
    color: colors.textDim,
    fontSize: typography.bodySmall,
    fontWeight: '600',
  },
});
