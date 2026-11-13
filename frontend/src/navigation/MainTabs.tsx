import React from 'react';
import {Image, Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../theme';

export type MainTab = 'train' | 'progress' | 'you';

const tabs = [
  {id: 'train', label: 'Train', icon: require('../assets/navigation/train.png')},
  {id: 'progress', label: 'Progress', icon: require('../assets/navigation/progress.png')},
  {id: 'you', label: 'You', icon: require('../assets/navigation/you.png')},
] as const;

export function MainTabs({activeTab, disabled = false, onSelect}: {
  activeTab: MainTab;
  disabled?: boolean;
  onSelect: (tab: MainTab) => void;
}) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel="Main navigation" style={styles.bar}>
      {tabs.map(tab => {
        const selected = tab.id === activeTab;
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
            <Image source={tab.icon} accessible={false} style={[styles.icon, {tintColor: selected ? colors.green : colors.muted}]} />
            <Text style={[styles.label, selected && styles.selected]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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
  icon: {width: 22, height: 22, resizeMode: 'contain'},
  label: {fontSize: 11, fontWeight: '500', color: colors.muted},
  selected: {color: colors.green, fontWeight: '700'},
  pressed: {opacity: 0.65},
});
