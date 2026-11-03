import React from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../theme';

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
  previousMonthId: string | null;
  nextMonthId: string | null;
  weeks: Array<{id: string; days: Array<CalendarDay | null>}>;
}

interface Props {
  calendar: WorkoutCalendar;
  onChangeMonth: (monthId: string) => void;
  onViewDay: (date: string, sessionIds: readonly string[]) => void;
}

const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Shows workout dates and activity levels returned by the backend. */
export function CalendarView({calendar, onChangeMonth, onViewDay}: Props) {
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
            <Image source={require('../assets/calendar-previous.png')} style={styles.chevron} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            disabled={!calendar.nextMonthId}
            onPress={() => {if (calendar.nextMonthId) onChangeMonth(calendar.nextMonthId);}}
            style={[styles.monthButton, !calendar.nextMonthId && styles.disabled]}
          >
            <Image source={require('../assets/calendar-next.png')} style={styles.chevron} />
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
                disabled={day.isFuture || day.sessionIds.length === 0}
                onPress={() => onViewDay(day.date, day.sessionIds)}
                style={styles.cell}
              >
                <View style={[styles.date, activityStyles[day.activity], day.isToday && styles.today]}>
                  <Text style={[styles.dateText, day.activity === 'high' && styles.highText, day.isFuture && styles.futureText]}>{day.dayLabel}</Text>
                </View>
              </Pressable>
            ) : <View key={`blank-${index}`} style={styles.cell} />)}
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <Text style={styles.legendText}>Activity</Text>
        <View style={[styles.swatch, styles.light]} />
        <View style={[styles.swatch, styles.medium]} />
        <View style={[styles.swatch, styles.high]} />
        <Text style={styles.legendText}>Today</Text>
        <View style={styles.todayLegend} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {backgroundColor: colors.surface, borderRadius: 22, padding: 18, gap: 12},
  heading: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10},
  title: {color: colors.ink, fontSize: 18, fontWeight: '700', flex: 1},
  monthActions: {flexDirection: 'row'},
  monthButton: {width: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center'},
  chevron: {width: 18, height: 18},
  disabled: {opacity: 0.4},
  weekdays: {flexDirection: 'row'},
  weekday: {flex: 1, color: colors.muted, fontSize: 10, textAlign: 'center'},
  weeks: {gap: 6},
  week: {flexDirection: 'row'},
  cell: {flex: 1, minHeight: 32, alignItems: 'center', justifyContent: 'center'},
  date: {width: 32, height: 32, borderRadius: 11, borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center'},
  dateText: {color: colors.ink, fontSize: 12},
  none: {backgroundColor: colors.surface},
  light: {backgroundColor: '#D6E8CC'},
  medium: {backgroundColor: '#7DB27D'},
  high: {backgroundColor: colors.green},
  highText: {color: colors.surface, fontWeight: '700'},
  futureText: {color: '#9AA196'},
  today: {borderColor: colors.green},
  legend: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2},
  legendText: {color: colors.ink, fontSize: 12},
  swatch: {width: 12, height: 8, borderRadius: 2},
  todayLegend: {width: 13, height: 13, borderRadius: 7, borderWidth: 1, borderColor: colors.ink},
});

const activityStyles = {
  none: styles.none,
  light: styles.light,
  medium: styles.medium,
  high: styles.high,
};
