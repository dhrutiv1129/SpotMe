import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ApiError } from '../beta/api';
import type { Workout } from '../beta/api';
import type { WorkoutCalendar } from '../components/CalendarView';
import { Button, Sheet } from '../components/WorkoutControls';
import { loadWorkoutHistory } from '../navigation/WorkoutHistoryFlow';
import {
  currentHistoryMonth,
  historyMonthLabel,
  validateWorkouts,
} from '../state/workoutHistory';
import { colors } from '../theme';
import { ConsistencyScreen } from './ConsistencyScreen';

function localDate(value: Date) {
  return `${currentHistoryMonth(value)}-${String(value.getDate()).padStart(2, '0')}`;
}

// Group saved workouts for display without calculating goals or streaks
export function buildWorkoutCalendar(
  workouts: Workout[],
  month: string,
  now = new Date(),
) {
  const today = localDate(now);
  const saved = validateWorkouts(workouts).filter(
    (workout) =>
      workout.date <= today &&
      workout.exercises.some((exercise) => exercise.sets.length > 0),
  );
  const first = new Date(`${month}-01T12:00:00`);
  if (
    !/^\d{4}-\d{2}$/.test(month) ||
    !Number.isFinite(first.getTime()) ||
    currentHistoryMonth(first) !== month
  )
    throw new Error('Choose a valid calendar month.');
  const previous = new Date(first);
  previous.setMonth(previous.getMonth() - 1);
  const next = new Date(first);
  next.setMonth(next.getMonth() + 1);
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: WorkoutCalendar['weeks'][number]['days'] = Array(
    (first.getDay() + 6) % 7,
  ).fill(null);
  for (let day = 1; day <= days; day += 1) {
    const date = `${month}-${String(day).padStart(2, '0')}`;
    const sessions = saved
      .filter((workout) => workout.date === date)
      .sort((a, b) => b.id - a.id);
    cells.push({
      date,
      dayLabel: String(day),
      accessibilityLabel: `${new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { dateStyle: 'full' })}, ${sessions.length} saved workouts${date === today ? ', today' : ''}`,
      activity: sessions.length ? 'high' : 'none',
      isToday: date === today,
      isFuture: date > today,
      sessionIds: sessions.map((workout) => String(workout.id)),
    });
  }
  while (cells.length % 7) cells.push(null);
  const calendar: WorkoutCalendar = {
    monthLabel: historyMonthLabel(month),
    previousMonthId: month > '0001-01' ? currentHistoryMonth(previous) : null,
    nextMonthId:
      month < currentHistoryMonth(now) ? currentHistoryMonth(next) : null,
    activityLabel: 'Saved workout',
    weeks: Array.from({ length: cells.length / 7 }, (_, index) => ({
      id: `${month}-${index}`,
      days: cells.slice(index * 7, index * 7 + 7),
    })),
  };
  return {
    calendar,
    saved,
    count: saved.filter((workout) => workout.date.startsWith(month)).length,
  };
}

interface Props {
  month: string;
  onChangeMonth: (month: string) => void;
  onViewStrength: () => void;
  onViewHistory: () => void;
  onViewWorkout: (id: number) => void;
  onUnauthorized: () => void;
  load?: typeof loadWorkoutHistory;
}

export function ConsistencyCalendarScreen({
  month,
  onChangeMonth,
  onViewStrength,
  onViewHistory,
  onViewWorkout,
  onUnauthorized,
  load = loadWorkoutHistory,
}: Props) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const auth = useRef(onUnauthorized);
  auth.current = onUnauthorized;
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    void load()
      .then((response) => {
        if (!cancelled) setWorkouts(validateWorkouts(response));
      })
      .catch((failure) => {
        if (cancelled) return;
        setError(
          failure instanceof Error
            ? failure.message
            : 'Your calendar could not load.',
        );
        if (failure instanceof ApiError && failure.status === 401)
          auth.current();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load, reload]);

  const { calendar, saved, count } = buildWorkoutCalendar(workouts, month);
  const dayWorkouts = saved
    .filter((workout) => workout.date === selectedDate)
    .sort((a, b) => b.id - a.id);
  const state = loading ? (
    <View style={styles.state}>
      <ActivityIndicator
        accessibilityLabel="Loading workout calendar"
        color={colors.green}
      />
      <Text style={styles.body}>Loading your saved workout dates…</Text>
    </View>
  ) : error ? (
    <View style={styles.state}>
      <Text accessibilityRole="alert" style={styles.body}>
        {error}
      </Text>
      <Text style={styles.body}>
        Your selected month is kept. Try again when your connection is ready.
      </Text>
      <Button
        label="Retry loading calendar"
        onPress={() => setReload((value) => value + 1)}
      />
    </View>
  ) : undefined;
  return (
    <>
      <ConsistencyScreen
        consistency={{
          monthlyCountLabel: String(count),
          monthlyDescription: `workouts in ${calendar.monthLabel}`,
          streakCountLabel: '—',
          streakDescription: 'Weekly goal streak · unavailable',
          weeklyProgressLabel: 'Weekly goals and streaks aren’t available yet.',
          calendar,
        }}
        state={state}
        selectedDate={selectedDate}
        onViewStrength={onViewStrength}
        onViewHistory={onViewHistory}
        onChangeMonth={(value) => {
          setSelectedDate(null);
          onChangeMonth(value);
        }}
        onViewDay={(date) => setSelectedDate(date)}
      />
      {!loading && !error && selectedDate && dayWorkouts.length > 0 && (
        <Sheet
          title={new Date(`${selectedDate}T12:00:00`).toLocaleDateString(
            undefined,
            { weekday: 'long', day: 'numeric', month: 'long' },
          )}
          onClose={() => setSelectedDate(null)}
          headerAction={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close day details"
              onPress={() => setSelectedDate(null)}
              style={styles.close}
            >
              <Image
                source={require('../assets/history/close.png')}
                style={styles.closeIcon}
              />
            </Pressable>
          }
        >
          <Text style={styles.body}>
            {selectedDate.slice(0, 4)} · {dayWorkouts.length} completed{' '}
            {dayWorkouts.length === 1 ? 'workout' : 'workouts'}
          </Text>
          {dayWorkouts.map((workout) => {
            const exercises = workout.exercises.filter(
              (exercise) => exercise.sets.length > 0,
            );
            return (
              <View key={workout.id} style={styles.session}>
                <Text style={styles.name}>Workout {workout.id}</Text>
                <Text style={styles.body}>
                  {
                    new Set(exercises.map((exercise) => exercise.exerciseId))
                      .size
                  }{' '}
                  exercises ·{' '}
                  {exercises.reduce(
                    (sum, exercise) => sum + exercise.sets.length,
                    0,
                  )}{' '}
                  logged sets
                </Text>
                <Button
                  label={
                    dayWorkouts.length === 1
                      ? 'View workout →'
                      : `View workout ${workout.id} →`
                  }
                  onPress={() => onViewWorkout(workout.id)}
                />
              </View>
            );
          })}
        </Sheet>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  state: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 22,
    gap: 16,
  },
  body: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  session: { gap: 12 },
  name: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  close: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: { width: 22, height: 22 },
});
