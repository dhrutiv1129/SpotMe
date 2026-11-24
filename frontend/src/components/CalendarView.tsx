import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import PreviousMonth from '../assets/consistency/previous.svg';
import NextMonth from '../assets/consistency/next.svg';
import {useTheme, useThemedStyles} from '../theme';
import type {ThemeColors} from '../theme';

export interface CalendarDay {
  date: string;
  dayLabel: string;
  accessibilityLabel: string;
  activity: 'none' | 'light' | 'medium' | 'high';
  isToday: boolean;
  isFuture: boolean;
  sessionIds: string[];
}

export interface WorkoutCalendar {
  monthLabel: string;
  activityLabel?: string;
  previousMonthId: string | null;
  nextMonthId: string | null;
  weeks: Array<{id: string; days: Array<CalendarDay | null>}>;
}

interface Props {
  calendar: WorkoutCalendar;
  selectedDate?: string | null;
  onChangeMonth: (monthId: string) => void;
  onViewDay: (date: string, sessionIds: readonly string[]) => void;
}

const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Shows workout dates and activity levels returned by the backend. */
export function CalendarView({calendar, selectedDate, onChangeMonth, onViewDay}: Props) {
  const {colors} = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>{calendar.monthLabel}</Text>
        <View style={styles.monthActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            disabled={!calendar.previousMonthId}
            onPress={() => {if (calendar.previousMonthId) onChangeMonth(calendar.previousMonthId);}}
            style={[styles.monthButton, !calendar.previousMonthId && styles.disabled]}
          >
            <PreviousMonth accessible={false} color={colors.ink} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            disabled={!calendar.nextMonthId}
            onPress={() => {if (calendar.nextMonthId) onChangeMonth(calendar.nextMonthId);}}
            style={[styles.monthButton, !calendar.nextMonthId && styles.disabled]}
          >
            <NextMonth accessible={false} color={colors.muted} />
          </Pressable>
        </View>
      </View>
      <View style={styles.weekdays}>
        {weekdays.map((label, index) => <Text key={`${index}-${label}`} style={styles.weekday}>{label}</Text>)}
      </View>
      <View style={styles.weeks}>
        {calendar.weeks.map((week) => (
          <View key={week.id} style={styles.week}>
            {week.days.map((day, index) => day ? (
              <Pressable
                key={day.date}
                accessibilityRole="button"
                accessibilityLabel={day.accessibilityLabel}
                accessibilityState={{selected: day.date === selectedDate, disabled: day.isFuture || day.sessionIds.length === 0}}
                disabled={day.isFuture || day.sessionIds.length === 0}
                onPress={() => onViewDay(day.date, day.sessionIds)}
                style={styles.cell}
              >
                <View style={[styles.date, styles[day.activity], day.isToday && styles.today, day.date === selectedDate && styles.selected]}>
                  <Text style={[styles.dateText, day.activity === 'high' && styles.highText, day.isFuture && styles.futureText]}>{day.dayLabel}</Text>
                </View>
              </Pressable>
            ) : <View key={`blank-${index}`} style={styles.cell} />)}
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <Text style={styles.legendText}>{calendar.activityLabel || 'Activity'}</Text>
        {!calendar.activityLabel && <>
          <View style={[styles.swatch, styles.light]} />
          <View style={[styles.swatch, styles.medium]} />
        </>}
        <View style={[styles.swatch, styles.high]} />
        <Text style={styles.legendText}>{selectedDate ? 'Selected' : 'Today'}</Text>
        <View style={styles.todayLegend} />
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {backgroundColor: colors.surface, borderRadius: 22, padding: 18, gap: 12},
  heading: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10},
  title: {color: colors.ink, fontSize: 18, fontWeight: '700', flex: 1},
  monthActions: {flexDirection: 'row'},
  monthButton: {width: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center'},
  disabled: {opacity: 0.4},
  weekdays: {flexDirection: 'row'},
  weekday: {flex: 1, color: colors.muted, fontSize: 10, textAlign: 'center'},
  weeks: {gap: 6},
  week: {flexDirection: 'row'},
  cell: {flex: 1, minHeight: 32, alignItems: 'center', justifyContent: 'center'},
  date: {width: 32, height: 32, borderRadius: 11, borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center'},
  dateText: {color: colors.ink, fontSize: 12},
  none: {backgroundColor: colors.surface},
  light: {backgroundColor: colors.activityLight},
  medium: {backgroundColor: colors.activityMedium},
  high: {backgroundColor: colors.primary},
  highText: {color: colors.onPrimary, fontWeight: '700'},
  futureText: {color: colors.disabledText},
  today: {borderColor: colors.green},
  selected: {borderWidth: 2, borderColor: colors.ink},
  legend: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2},
  legendText: {color: colors.ink, fontSize: 12},
  swatch: {width: 12, height: 8, borderRadius: 2},
  todayLegend: {width: 13, height: 13, borderRadius: 7, borderWidth: 1, borderColor: colors.ink},
});
