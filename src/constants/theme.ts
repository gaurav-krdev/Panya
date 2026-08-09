/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0d0d0d',
    background: '#fafafa',
    backgroundElement: '#f4f4f6',
    backgroundSelected: '#e5e5e7',
    textSecondary: '#6e6e80',
    primary: '#0d9488',
    secondary: '#2563eb',
    accent: '#059669',
    border: '#e5e5e8',
    glow: 'rgba(13, 148, 136, 0.12)',
  },
  dark: {
    text: '#ececf1',
    background: '#171717',
    backgroundElement: '#212121',
    backgroundSelected: '#2f2f32',
    textSecondary: '#a1a1aa',
    primary: '#20b2aa',
    secondary: '#3b82f6',
    accent: '#10b981',
    border: '#2e2e32',
    glow: 'rgba(32, 178, 170, 0.15)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
