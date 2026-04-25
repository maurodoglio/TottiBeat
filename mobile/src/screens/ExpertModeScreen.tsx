import { Text } from 'react-native';

import { ScreenContainer } from '../components/ScreenContainer';

export function ExpertModeScreen() {
  return (
    <ScreenContainer
      title="Expert Mode"
      subtitle="Subdivision, practice workflows, beat settings, and presets will be ported after the native foundation is in place."
    >
      <Text>Advanced controls are intentionally placeholders in Batch A.</Text>
    </ScreenContainer>
  );
}
