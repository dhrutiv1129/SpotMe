import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {Button} from '../components/WorkoutControls';
import {colors} from '../theme';

export interface SavedWorkoutReceipt {
  status: 'saved';
  sessionId: string;
  name: string;
  dateLabel: string;
  durationLabel: string;
  volumeLabel: string;
  exercisesCompleted: number;
  setsCompleted: number;
  weeklyProgressLabel: string;
  weeklyMessage: string;
  weekDays: Array<{id: string; label: string; dateLabel: string; completed: boolean}>;
  streakLabel: string;
  streakDescription: string;
  monthlyWorkoutsLabel: string;
  monthlyWorkoutsDescription: string;
}

interface Props {
  receipt: SavedWorkoutReceipt;
  onViewSession: (sessionId: string) => void;
  onViewHistory: () => void;
}

/** Shows totals and streaks returned after the workout is saved. */
export function WorkoutSavedScreen({receipt, onViewSession, onViewHistory}: Props) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Workout saved</Text>
      <View style={styles.hero}>
        <Text style={styles.trophy}>🏆</Text>
        <Text style={styles.eyebrow}>SAVED TO YOUR HISTORY</Text>
        <Text accessibilityRole="header" style={styles.title}>
          You showed up.{'\n'}That’s a win.
        </Text>
        <Text style={styles.heroCaption}>{receipt.name} · {receipt.dateLabel}</Text>
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.value}>{receipt.durationLabel}</Text><Text style={styles.caption}>time well spent</Text></View>
        <View style={styles.stat}><Text style={styles.value}>{receipt.volumeLabel}</Text><Text style={styles.caption}>total volume</Text></View>
        <View style={styles.stat}><Text style={styles.value}>{receipt.exercisesCompleted}</Text><Text style={styles.caption}>exercises completed</Text></View>
        <View style={styles.stat}><Text style={styles.value}>{receipt.setsCompleted}</Text><Text style={styles.caption}>sets completed</Text></View>
      </View>
      <View style={styles.week}>
        <Text style={styles.weekTitle}>{receipt.weeklyProgressLabel}</Text>
        <View style={styles.days}>
          {receipt.weekDays.map((day) => (
            <View key={day.id} style={styles.day}>
              <Text
                accessibilityLabel={`${day.label} ${day.dateLabel}${day.completed ? ', completed workout' : ''}`}
                style={[styles.date, day.completed && styles.completedDate]}
              >
                {day.completed ? '✓' : day.dateLabel}
              </Text>
              <Text style={styles.dayLabel}>{day.label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.weekMessage}>{receipt.weeklyMessage}</Text>
      </View>
      <View style={styles.highlights}>
        <View style={styles.highlight}>
          <Text style={styles.value}>{receipt.streakLabel}</Text>
          <Text style={styles.caption}>{receipt.streakDescription}</Text>
        </View>
        <View style={styles.highlight}>
          <Text style={styles.value}>{receipt.monthlyWorkoutsLabel}</Text>
          <Text style={styles.caption}>{receipt.monthlyWorkoutsDescription}</Text>
        </View>
      </View>
      <Button label="View saved session" onPress={() => onViewSession(receipt.sessionId)} />
      <Button label="View workout history" variant="secondary" onPress={onViewHistory} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  content: {paddingHorizontal: 22, paddingTop: 24, paddingBottom: 28, gap: 22},
  header: {color: colors.ink, fontSize: 15, fontWeight: '700', marginBottom: 10},
  hero: {backgroundColor: colors.ink, borderRadius: 22, padding: 24, alignItems: 'center', gap: 18},
  trophy: {color: colors.green, backgroundColor: colors.lime, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 10, fontSize: 36},
  eyebrow: {color: colors.lime, fontSize: 10, fontWeight: '700', letterSpacing: 1.3},
  title: {color: colors.surface, fontSize: 32, fontWeight: '700', textAlign: 'center', letterSpacing: -0.7},
  heroCaption: {color: '#B6C4B4', fontSize: 14, textAlign: 'center'},
  stats: {backgroundColor: colors.surface, borderRadius: 22, padding: 20, flexDirection: 'row', flexWrap: 'wrap', rowGap: 18},
  stat: {width: '50%', paddingRight: 8, gap: 6},
  value: {color: colors.ink, fontSize: 28, fontWeight: '700', letterSpacing: -0.5},
  caption: {color: colors.muted, fontSize: 12, lineHeight: 18},
  week: {backgroundColor: colors.pale, borderRadius: 22, padding: 18, gap: 16},
  weekTitle: {color: colors.ink, fontSize: 14, fontWeight: '700'},
  days: {flexDirection: 'row', gap: 5},
  day: {flex: 1, alignItems: 'center', gap: 7},
  date: {backgroundColor: colors.surface, color: colors.muted, borderRadius: 18, width: 30, height: 30, textAlign: 'center', lineHeight: 30, fontSize: 12},
  completedDate: {backgroundColor: colors.green, color: colors.surface},
  dayLabel: {color: colors.muted, fontSize: 10},
  weekMessage: {color: colors.green, fontSize: 12, lineHeight: 18},
  highlights: {flexDirection: 'row', gap: 12},
  highlight: {flex: 1, backgroundColor: colors.surface, borderRadius: 22, padding: 18, gap: 10},
});
