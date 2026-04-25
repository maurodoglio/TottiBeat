import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { EasyModeScreen } from '../screens/EasyModeScreen';
import { ExpertModeScreen } from '../screens/ExpertModeScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    border: colors.border,
    primary: colors.accent,
    text: colors.text,
  },
};

type AppNavigatorProps = {
  testMode?: boolean;
};

export function AppNavigator({ testMode = false }: AppNavigatorProps) {
  const tabNavigator = (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
      }}
    >
      <Tab.Screen
        name="Easy"
        component={EasyModeScreen}
        options={{ tabBarIcon: () => <Text>🥁</Text> }}
      />
      <Tab.Screen
        name="Expert"
        component={ExpertModeScreen}
        options={{ tabBarIcon: () => <Text>🎚️</Text> }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: () => <Text>⚙️</Text> }}
      />
    </Tab.Navigator>
  );

  if (testMode) {
    return tabNavigator;
  }

  return <NavigationContainer theme={navigationTheme}>{tabNavigator}</NavigationContainer>;
}
