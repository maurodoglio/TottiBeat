import { Text } from 'react-native';

import { ScreenContainer } from '../components/ScreenContainer';

export function SettingsScreen() {
  return (
    <ScreenContainer
      title="Settings"
      subtitle="Native device options like wake lock, haptics, and release settings will live here in later batches."
    >
      <Text>Settings are intentionally limited in the foundation batch.</Text>
    </ScreenContainer>
  );
}
