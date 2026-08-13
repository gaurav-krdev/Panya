import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, View, StyleSheet } from 'react-native';
import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { GlobalAgentInputBar } from '@/components/global-agent-input-bar';
import { initNotifications } from '@/utils/notificationService';
import { agentEngine } from '@/utils/agentEngine';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();

  // Initialise the notification system on app boot
  useEffect(() => {
    (async () => {
      const granted = await initNotifications();
      if (granted) {
        // Sync all enabled+pending routines with the OS alarm scheduler
        agentEngine.syncAllAlarms();
      }
    })();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <View style={styles.layoutContainer}>
        <View style={styles.contentArea}>
          <AppTabs />
        </View>
        <GlobalAgentInputBar />
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  layoutContainer: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
  },
});
