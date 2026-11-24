import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import Back from '../assets/workout/back.svg';
import Trophy from '../assets/saved/trophy.svg';
import Flame from '../assets/saved/flame.svg';
import Calendar from '../assets/saved/calendar.svg';
import type {Workout} from '../beta/api';
import {Button} from '../components/WorkoutControls';
import {validateWorkouts} from '../state/workoutHistory';
import {useTheme, useThemedStyles} from '../theme';
import type {ThemeColors} from '../theme';

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
  dataNote?: string;
}

// Use the confirmed saved sets and leave missing totals unavailable
export function buildSavedWorkoutReceipt(workout: Workout): SavedWorkoutReceipt {
  validateWorkouts([workout]);
  const exercises = workout.exercises.filter(exercise => exercise.sets.length > 0);
  if (!exercises.length) throw new Error('Your workout save has not been confirmed yet.');
  const date = new Date(`${workout.date}T12:00:00`);
  return {
    status: 'saved', sessionId: String(workout.id), name: `Workout ${workout.id}`,
    dateLabel: date.toLocaleDateString(undefined, {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'}),
    durationLabel: '—', volumeLabel: '—',
    exercisesCompleted: new Set(exercises.map(exercise => exercise.exerciseId)).size,
    setsCompleted: exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0),
    weeklyProgressLabel: 'Weekly goal unavailable',
    weeklyMessage: 'Your workout is saved. Goals and streaks will appear when available.',
    weekDays: [], streakLabel: '—', streakDescription: 'weekly goal streak · unavailable',
    monthlyWorkoutsLabel: '—',
    monthlyWorkoutsDescription: `${date.toLocaleDateString(undefined, {month: 'long'})} workouts · unavailable`,
    dataNote: 'Your saved sets are ready to view. Duration and progress totals are not available yet.',
  };
}

interface Props {
  receipt: SavedWorkoutReceipt;
  onViewSession: (sessionId: string) => void;
  onReturnToTrain: () => void;
}

/** Shows totals and streaks returned after the workout is saved. */
export function WorkoutSavedScreen({receipt, onViewSession, onReturnToTrain}: Props) {
  const {colors} = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to Train" onPress={onReturnToTrain} style={styles.headerBack}>
        <Back accessible={false} color={colors.ink} />
        <Text style={styles.header}>Workout saved</Text>
      </Pressable>
      <View style={styles.hero}>
        <View style={styles.trophy}><Trophy accessible={false} /></View>
        <Text style={styles.eyebrow}>SAVED TO YOUR HISTORY</Text>
        <Text accessibilityRole="header" style={styles.title}>
          You showed up.{'\n'}That’s a win.
        </Text>
        <Text style={styles.heroCaption}>{receipt.name} · {receipt.dateLabel}</Text>
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.value}>{receipt.durationLabel}</Text><Text style={styles.caption}>duration</Text></View>
        <View style={styles.stat}><Text style={styles.value}>{receipt.volumeLabel}</Text><Text style={styles.caption}>total volume</Text></View>
        <View style={styles.stat}><Text style={styles.value}>{receipt.exercisesCompleted}</Text><Text style={styles.caption}>exercises completed</Text></View>
        <View style={styles.stat}><Text style={styles.value}>{receipt.setsCompleted}</Text><Text style={styles.caption}>sets completed</Text></View>
      </View>
      {!!receipt.dataNote && <Text style={styles.caption}>{receipt.dataNote}</Text>}
      <View style={styles.week}>
        <Text style={styles.weekTitle}>{receipt.weeklyProgressLabel}</Text>
        {receipt.weekDays.length > 0 && <View style={styles.days}>
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
        </View>}
        <Text style={styles.weekMessage}>{receipt.weeklyMessage}</Text>
      </View>
      <View style={styles.highlights}>
        <View style={styles.highlight}>
          <Flame accessible={false} color={colors.green} />
          <Text style={styles.value}>{receipt.streakLabel}</Text>
          <Text style={styles.caption}>{receipt.streakDescription}</Text>
        </View>
        <View style={styles.highlight}>
          <Calendar accessible={false} color={colors.green} />
          <Text style={styles.value}>{receipt.monthlyWorkoutsLabel}</Text>
          <Text style={styles.caption}>{receipt.monthlyWorkoutsDescription}</Text>
        </View>
      </View>
      <Button label="View saved session" onPress={() => onViewSession(receipt.sessionId)} />
      <Button label="Return to Train" variant="secondary" onPress={onReturnToTrain} />
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  content: {width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 10, paddingBottom: 26, gap: 22},
  headerBack: {flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 44},
  header: {color: colors.ink, fontSize: 15, fontWeight: '700'},
  hero: {backgroundColor: colors.hero, borderRadius: 22, padding: 24, alignItems: 'center', gap: 16},
  trophy: {backgroundColor: colors.lime, borderRadius: 24, width: 72, height: 72, alignItems: 'center', justifyContent: 'center'},
  eyebrow: {color: colors.lime, fontSize: 10, fontWeight: '700', letterSpacing: 1.3},
  title: {color: colors.onHero, fontSize: 32, lineHeight: 35.2, fontWeight: '700', textAlign: 'center', letterSpacing: -1.2},
  heroCaption: {color: colors.heroMuted, fontSize: 14, textAlign: 'center'},
  stats: {backgroundColor: colors.surface, borderRadius: 22, padding: 18, flexDirection: 'row', flexWrap: 'wrap', rowGap: 12},
  stat: {width: '50%', paddingRight: 10, gap: 5},
  value: {color: colors.ink, fontSize: 28, fontWeight: '700', letterSpacing: -0.5},
  caption: {color: colors.muted, fontSize: 11, lineHeight: 16},
  week: {backgroundColor: colors.pale, borderRadius: 22, padding: 18, gap: 12},
  weekTitle: {color: colors.ink, fontSize: 14, fontWeight: '700'},
  days: {flexDirection: 'row', gap: 5},
  day: {flex: 1, alignItems: 'center', gap: 7},
  date: {backgroundColor: colors.surface, color: colors.muted, borderRadius: 18, width: 30, height: 30, textAlign: 'center', lineHeight: 30, fontSize: 12},
  completedDate: {backgroundColor: colors.primary, color: colors.onPrimary},
  dayLabel: {color: colors.muted, fontSize: 10},
  weekMessage: {color: colors.green, fontSize: 12, lineHeight: 18},
  highlights: {flexDirection: 'row', gap: 12},
  highlight: {flex: 1, backgroundColor: colors.surface, borderRadius: 20, padding: 16, gap: 8},
});
