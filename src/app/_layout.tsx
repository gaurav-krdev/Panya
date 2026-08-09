import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, View, StyleSheet } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { GlobalAgentInputBar } from '@/components/global-agent-input-bar';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
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
