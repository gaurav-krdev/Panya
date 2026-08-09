import { useState, useEffect } from 'react';
import { Colors } from '@/constants/theme';
import { useColorScheme as useRNColorScheme } from '@/hooks/use-color-scheme';

export type ThemePreference = 'system' | 'light' | 'dark';

let globalThemePref: ThemePreference = 'system';
const listeners = new Set<() => void>();

export function setThemePreference(pref: ThemePreference) {
  globalThemePref = pref;
  listeners.forEach((l) => l());
}

export function getThemePreference(): ThemePreference {
  return globalThemePref;
}

export function useTheme() {
  const systemScheme = useRNColorScheme();
  const [pref, setPref] = useState<ThemePreference>(globalThemePref);

  useEffect(() => {
    const onChange = () => setPref(globalThemePref);
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  const activeScheme = pref === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : pref;
  return Colors[activeScheme];
}

export function useActiveColorScheme(): 'light' | 'dark' {
  const systemScheme = useRNColorScheme();
  const [pref, setPref] = useState<ThemePreference>(globalThemePref);

  useEffect(() => {
    const onChange = () => setPref(globalThemePref);
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  return pref === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : pref;
}
