import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTheme, useThemedStyles} from '../theme';
import type {ThemeColors, ThemePreference} from '../theme';

export function AppearanceSettings() {
  const {preference, saving, error, setPreference} = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>Appearance</Text>
      <Text style={styles.caption}>Choose a look, or follow your device. Saved on this device.</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Appearance" style={styles.options}>
        {(['system', 'light', 'dark'] as ThemePreference[]).map(value => (
          <Pressable key={value} accessibilityRole="radio"
            accessibilityLabel={`${value[0].toUpperCase()}${value.slice(1)} appearance`}
            accessibilityState={{checked: preference === value, disabled: saving}}
            disabled={saving} onPress={() => {void setPreference(value);}}
            style={[styles.option, preference === value && styles.selected]}>
            <Text style={[styles.label, preference === value && styles.selectedLabel]}>
              {value[0].toUpperCase()}{value.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
      {saving && <Text accessibilityLiveRegion="polite" style={styles.caption}>Saving appearance…</Text>}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {backgroundColor: colors.surface, borderRadius: 20, padding: 18, gap: 12},
  title: {color: colors.ink, fontSize: 19, fontWeight: '700'},
  caption: {color: colors.muted, fontSize: 13, lineHeight: 19},
  options: {flexDirection: 'row', backgroundColor: colors.soft, padding: 4, borderRadius: 14, gap: 4},
  option: {flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 11},
  selected: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.green},
  label: {color: colors.muted, fontSize: 14, fontWeight: '600'},
  selectedLabel: {color: colors.green},
  error: {color: colors.danger, fontSize: 13, lineHeight: 19},
});
