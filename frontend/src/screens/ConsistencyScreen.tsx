import React from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {CalendarView} from '../components/CalendarView';
import type {WorkoutCalendar} from '../components/CalendarView';
import {colors} from '../theme';

export interface ConsistencyView {
  monthlyCountLabel: string;
  monthlyDescription: string;
  streakCountLabel: string;
  streakDescription: string;
  weeklyProgressLabel: string;
  calendar: WorkoutCalendar;
}

interface Props {
  consistency: ConsistencyView;
  selectedDate?: string | null;
  onViewStrength: () => void;
  onViewHistory: () => void;
  onEditGoal: () => void;
  onChangeMonth: (monthId: string) => void;
  onViewDay: (date: string, sessionIds: readonly string[]) => void;
}

/** Shows the calendar, weekly goal and streak returned by the backend. */
export function ConsistencyScreen({
  consistency, selectedDate, onViewStrength, onViewHistory, onEditGoal, onChangeMonth, onViewDay,
}: Props) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Your progress</Text>
        <Pressable accessibilityRole="button" onPress={onViewHistory} style={styles.linkButton}>
          <Text style={styles.link}>History</Text>
        </Pressable>
      </View>
      <Text accessibilityRole="header" style={styles.title}>Every visit counts.</Text>
      <View style={styles.tabs}>
        <Pressable accessibilityRole="tab" accessibilityState={{selected: false}} onPress={onViewStrength} style={styles.tab}>
          <Text style={styles.tabText}>Strength</Text>
        </Pressable>
        <View accessibilityRole="tab" accessibilityState={{selected: true}} style={[styles.tab, styles.selectedTab]}>
          <Text style={styles.selectedTabText}>Consistency</Text>
        </View>
      </View>
      <View style={styles.metrics}>
        <View style={styles.metric}>
          <View style={styles.metricHeading}>
            <Text style={styles.value}>{consistency.monthlyCountLabel}</Text>
            <Image source={require('../assets/calendar-check.png')} style={styles.metricIcon} />
          </View>
          <Text style={styles.caption}>{consistency.monthlyDescription}</Text>
        </View>
        <View style={styles.metric}>
          <View style={styles.metricHeading}>
            <Text style={styles.value}>{consistency.streakCountLabel}</Text>
            <Image source={require('../assets/flame.png')} style={styles.metricIcon} />
          </View>
          <Text style={styles.caption}>{consistency.streakDescription}</Text>
        </View>
      </View>
      <View style={styles.weeklyGoal}>
        <Text style={styles.weeklyLabel}>{consistency.weeklyProgressLabel}</Text>
        <Pressable accessibilityRole="button" onPress={onEditGoal} style={styles.linkButton}>
          <Text style={styles.editLink}>Edit goal</Text>
        </Pressable>
      </View>
      <CalendarView calendar={consistency.calendar} selectedDate={selectedDate} onChangeMonth={onChangeMonth} onViewDay={onViewDay} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  content: {paddingHorizontal: 22, paddingTop: 10, paddingBottom: 26, gap: 22},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  headerLabel: {color: colors.ink, fontSize: 15, fontWeight: '700'},
  linkButton: {minHeight: 44, justifyContent: 'center'},
  link: {color: colors.green, fontSize: 13, fontWeight: '700'},
  title: {color: colors.ink, fontSize: 32, fontWeight: '700', lineHeight: 36, letterSpacing: -0.7},
  tabs: {backgroundColor: colors.soft, borderRadius: 14, padding: 4, flexDirection: 'row', gap: 4},
  tab: {flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 11},
  selectedTab: {backgroundColor: colors.surface},
  selectedTabText: {color: colors.green, fontSize: 14, fontWeight: '600'},
  tabText: {color: colors.muted, fontSize: 14, fontWeight: '600'},
  metrics: {flexDirection: 'row', gap: 12},
  metric: {flex: 1, backgroundColor: colors.surface, borderRadius: 22, padding: 16, gap: 10},
  metricHeading: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8},
  metricIcon: {width: 22, height: 22},
  value: {color: colors.ink, fontSize: 38, fontWeight: '700'},
  caption: {color: colors.muted, fontSize: 12, lineHeight: 18},
  weeklyGoal: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginVertical: -10},
  weeklyLabel: {color: colors.ink, fontSize: 12, flex: 1},
  editLink: {color: colors.green, fontSize: 12},
});
