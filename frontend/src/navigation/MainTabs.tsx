import React from 'react';
import {Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import Train from '../assets/navigation/train.svg';
import TrainSelected from '../assets/navigation/train-selected.svg';
import Progress from '../assets/navigation/progress.svg';
import ProgressSelected from '../assets/navigation/progress-selected.svg';
import You from '../assets/navigation/you.svg';
import YouSelected from '../assets/navigation/you-selected.svg';
import {useTheme, useThemedStyles} from '../theme';
import type {ThemeColors} from '../theme';

export type MainTab = 'train' | 'progress' | 'you';

const tabs = [
  {id: 'train', label: 'Train', icon: Train, selectedIcon: TrainSelected},
  {id: 'progress', label: 'Progress', icon: Progress, selectedIcon: ProgressSelected},
  {id: 'you', label: 'You', icon: You, selectedIcon: YouSelected},
] as const;

export function MainTabs({activeTab, disabled = false, onSelect}: {
  activeTab: MainTab;
  disabled?: boolean;
  onSelect: (tab: MainTab) => void;
}) {
  const {colors} = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View accessibilityRole="tablist" accessibilityLabel="Main navigation" style={styles.bar}>
      {tabs.map(tab => {
        const selected = tab.id === activeTab;
        const Icon = selected ? tab.selectedIcon : tab.icon;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{selected, disabled}}
            disabled={disabled}
            onPress={() => onSelect(tab.id)}
            style={({pressed}) => [styles.tab, pressed && styles.pressed]}
          >
            <View style={styles.icon}><Icon accessible={false} color={selected ? colors.green : colors.muted} /></View>
            <Text style={[styles.label, selected && styles.selected]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexShrink: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  tab: {flex: 1, minHeight: 44, alignItems: 'center', gap: 5},
  icon: {width: 22, height: 22, alignItems: 'center', justifyContent: 'center'},
  label: {fontSize: 11, fontWeight: '500', color: colors.muted},
  selected: {color: colors.green, fontWeight: '700'},
  pressed: {opacity: 0.65},
});
