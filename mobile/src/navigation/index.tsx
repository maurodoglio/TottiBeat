import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator, useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EasyModeScreen } from '../screens/EasyModeScreen';
import { ExpertModeScreen } from '../screens/ExpertModeScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

const Tab = createBottomTabNavigator();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.tabBar,
    border: colors.border,
    primary: colors.accent,
    text: colors.text,
  },
};

type AppNavigatorProps = {
  testMode?: boolean;
};

type ShellProps = {
  children: ReactNode;
};

function NativeShell({ children }: ShellProps) {
  const bottomTabBarHeight = useBottomTabBarHeight();

  return <View style={[styles.shell, { paddingBottom: bottomTabBarHeight + spacing.lg }]}>{children}</View>;
}

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={[styles.iconShell, focused ? styles.iconShellActive : null]}>
      <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.iconEmoji}>{emoji}</Text>
      <Text style={[styles.iconLabel, focused ? styles.iconLabelActive : null]}>{label}</Text>
    </View>
  );
}

export function AppNavigator({ testMode = false }: AppNavigatorProps) {
  const tabNavigator = (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        sceneStyle: styles.scene,
        tabBarIcon: ({ focused }) => {
          if (route.name === 'Easy') {
            return <TabIcon emoji="🥁" label="Easy" focused={focused} />;
          }
          if (route.name === 'Expert') {
            return <TabIcon emoji="🎚️" label="Expert" focused={focused} />;
          }
          return <TabIcon emoji="⚙️" label="Settings" focused={focused} />;
        },
      })}
    >
      <Tab.Screen name="Easy">{() => <NativeShell><EasyModeScreen /></NativeShell>}</Tab.Screen>
      <Tab.Screen name="Expert">{() => <NativeShell><ExpertModeScreen /></NativeShell>}</Tab.Screen>
      <Tab.Screen name="Settings">{() => <NativeShell><SettingsScreen /></NativeShell>}</Tab.Screen>
    </Tab.Navigator>
  );

  if (testMode) {
    return tabNavigator;
  }

  return <NavigationContainer theme={navigationTheme}>{tabNavigator}</NavigationContainer>;
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scene: {
    backgroundColor: colors.background,
  },
  tabBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    height: 78,
    borderTopWidth: 0,
    borderRadius: 28,
    backgroundColor: colors.tabBar,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  tabBarItem: {
    paddingVertical: spacing.sm,
  },
  iconShell: {
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    borderRadius: 18,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  iconShellActive: {
    backgroundColor: colors.accentSoft,
  },
  iconEmoji: {
    fontSize: typography.metric,
  },
  iconLabel: {
    color: colors.textDim,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  iconLabelActive: {
    color: colors.accentStrong,
  },
});
