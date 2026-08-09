// src/components/app-tabs.web.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Text, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarPosition: 'top',
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarRipple: { color: 'transparent' },
        tabBarStyle: {
          backgroundColor: colors.backgroundElement,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          paddingTop: Math.max(insets.top, 8),
          height: 54 + Math.max(insets.top, 8),
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarIndicatorStyle: {
          backgroundColor: colors.primary,
          height: 3,
          borderRadius: 2,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          textTransform: 'none',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: () => (
            <Text style={{ fontSize: 16 }}>🏠</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Notes',
          tabBarIcon: () => (
            <Text style={{ fontSize: 16 }}>📝</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="console"
        options={{
          title: 'Console',
          tabBarIcon: () => (
            <Text style={{ fontSize: 16 }}>💻</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="sandbox"
        options={{
          title: 'Sandbox',
          tabBarIcon: () => (
            <Text style={{ fontSize: 16 }}>📦</Text>
          ),
        }}
      />
    </Tabs>
  );
}
