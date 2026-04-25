import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from './src/navigation';

type AppProps = {
  testMode?: boolean;
};

export default function App({ testMode = false }: AppProps) {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppNavigator testMode={testMode} />
    </SafeAreaProvider>
  );
}
