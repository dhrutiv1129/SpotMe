import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Platform, StatusBar, View, useColorScheme} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const lightColors = {
  background: '#F6F5EF',
  surface: '#FFFFFF',
  ink: '#1C3025',
  hero: '#1D3025',
  muted: '#687269',
  green: '#267849',
  pale: '#E8F1E5',
  lime: '#DAEF9E',
  border: '#E1E5DA',
  soft: '#ECEEE5',
  danger: '#B9362A',
  dangerSoft: '#FCEBE4',
  dangerSolid: '#B9362A',
  primary: '#267849',
  onPrimary: '#FFFFFF',
  onHero: '#F7F9EF',
  heroMuted: '#C1CCBD',
  selected: '#F0F5E9',
  warning: '#8A6428',
  warningSoft: '#F7EDD8',
  activityLight: '#D6E8CC',
  activityMedium: '#7DB27D',
  disabledText: '#9AA196',
  overlay: 'rgba(22, 39, 28, 0.42)',
  handle: '#D6D9D2',
  preview: '#DEE4DE',
  device: '#18211C',
};

export type ThemeColors = {[Key in keyof typeof lightColors]: string};
export const darkColors: ThemeColors = {
  background: '#101914',
  surface: '#1B2820',
  ink: '#ECF4EB',
  hero: '#1D3025',
  muted: '#B4C2B6',
  green: '#8BDDAB',
  pale: '#243F2D',
  lime: '#DAEF9E',
  border: '#43564A',
  soft: '#29382E',
  danger: '#FFADA2',
  dangerSoft: '#4B2523',
  dangerSolid: '#B9362A',
  primary: '#267849',
  onPrimary: '#FFFFFF',
  onHero: '#F7F9EF',
  heroMuted: '#C1CCBD',
  selected: '#253F2D',
  warning: '#F0CE8D',
  warningSoft: '#40351F',
  activityLight: '#31563B',
  activityMedium: '#5B9164',
  disabledText: '#96A798',
  overlay: 'rgba(0, 0, 0, 0.65)',
  handle: '#637769',
  preview: '#0A100C',
  device: '#050906',
};

// Keep the light palette available to non-React consumers; components use hooks.
export const colors = lightColors;
export type ThemePreference = 'system' | 'light' | 'dark';
const storageKey = 'spotme-appearance-v1';
interface ThemeContextValue {
  colors: ThemeColors;
  mode: 'light' | 'dark';
  preference: ThemePreference;
  saving: boolean;
  error: string | null;
  setPreference: (value: ThemePreference) => Promise<void>;
}
const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors, mode: 'light', preference: 'system', saving: false,
  error: null, setPreference: async () => {},
});

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const systemMode = useColorScheme();
  const [preference, setValue] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const writing = useRef(false);
  const mode = preference === 'system' ? (systemMode === 'dark' ? 'dark' : 'light') : preference;
  const palette = mode === 'dark' ? darkColors : lightColors;

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(storageKey).then(value => {
      if (mounted && (value === 'system' || value === 'light' || value === 'dark')) setValue(value);
    }).catch(() => {
      if (mounted) setError('Your saved appearance could not be loaded. Choose it again to retry.');
    }).finally(() => {if (mounted) setReady(true);});
    return () => {mounted = false;};
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const root = document.documentElement;
    const previousScheme = root.style.colorScheme;
    const previousBackground = document.body.style.backgroundColor;
    root.style.colorScheme = mode;
    document.body.style.backgroundColor = palette.background;
    return () => {
      root.style.colorScheme = previousScheme;
      document.body.style.backgroundColor = previousBackground;
    };
  }, [mode, palette.background]);

  async function setPreference(value: ThemePreference) {
    if (writing.current) return;
    writing.current = true;
    setSaving(true);
    setError(null);
    try {
      await AsyncStorage.setItem(storageKey, value);
      setValue(value);
    } catch {
      setError('Appearance could not be saved. Please try again.');
    } finally {
      writing.current = false;
      setSaving(false);
    }
  }

  return React.createElement(ThemeContext.Provider, {
    value: {colors: palette, mode, preference, saving, error, setPreference},
  }, React.createElement(StatusBar, {barStyle: mode === 'dark' ? 'light-content' : 'dark-content'}),
  ready ? children : React.createElement(View, {
    style: {flex: 1, backgroundColor: palette.background, alignItems: 'center', justifyContent: 'center'},
  }, React.createElement(ActivityIndicator, {color: palette.green, accessibilityLabel: 'Loading appearance'})));
}

export const useTheme = () => useContext(ThemeContext);

export function useThemedStyles<T>(factory: (palette: ThemeColors) => T): T {
  const {colors: palette} = useTheme();
  return useMemo(() => factory(palette), [factory, palette]);
}
