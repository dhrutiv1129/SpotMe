import type { Exercise, Progress, Workout } from '../beta/api';
import type { WorkoutHistoryView } from '../screens/WorkoutHistoryScreen';
import type { WorkoutDetailView } from '../screens/WorkoutDetailScreen';
import { formatStrengthNumber, strengthDate } from './strengthProgress';

export interface HistoryFilters {
  month: string | null;
  exerciseId: number | null;
  from: string;
  to: string;
}
export interface HistoryBrowseState {
  filters: HistoryFilters;
  limit: number;
}
export function newHistoryBrowseState(): HistoryBrowseState {
  return {filters: {...allHistoryFilters(), month: currentHistoryMonth()}, limit: 6};
}

export const allHistoryFilters = (): HistoryFilters => ({
  month: null,
  exerciseId: null,
  from: '',
  to: '',
});
export function currentHistoryMonth(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
export function validHistoryDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return (
    Number.isFinite(date.getTime()) &&
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` ===
      value
  );
}
export function historyFilterError(filters: HistoryFilters) {
  if (
    (filters.from && !validHistoryDate(filters.from)) ||
    (filters.to && !validHistoryDate(filters.to))
  )
    return 'Enter dates as YYYY-MM-DD, using a real calendar date.';
  if (filters.from && filters.to && filters.from > filters.to)
    return 'The end date must be on or after the start date.';
  return '';
}
export function validateWorkouts(value: Workout[]): Workout[] {
  if (
    !Array.isArray(value) ||
    value.some(
      (workout) =>
        !workout ||
        !Number.isSafeInteger(workout.id) ||
        workout.id <= 0 ||
        !validHistoryDate(workout.date) ||
        !Array.isArray(workout.exercises) ||
        workout.exercises.some(
          (exercise) =>
            !exercise ||
            !Number.isSafeInteger(exercise.exerciseId) ||
            exercise.exerciseId <= 0 ||
            !Array.isArray(exercise.sets) ||
            exercise.sets.some(
              (set) =>
                !set ||
                !Number.isFinite(set.weight) ||
                set.weight < 0 ||
                !Number.isSafeInteger(set.reps) ||
                set.reps <= 0,
            ),
        ),
    ) ||
    new Set(value.map((workout) => workout.id)).size !== value.length
  )
    throw new Error('Saved workouts could not be read. Please try again.');
  return value;
}
export function filterWorkouts(workouts: Workout[], filters: HistoryFilters) {
  return workouts
    .filter(
      (workout) =>
        (!filters.month || workout.date.startsWith(filters.month)) &&
        (!filters.from || workout.date >= filters.from) &&
        (!filters.to || workout.date <= filters.to) &&
        (filters.exerciseId === null ||
          workout.exercises.some(
            (exercise) =>
              exercise.exerciseId === filters.exerciseId &&
              exercise.sets.length > 0,
          )),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}
export function historyMonthLabel(month: string | null) {
  return month
    ? new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })
    : 'All time';
}
export function buildWorkoutHistory(
  workouts: Workout[],
  catalog: Exercise[],
  filters: HistoryFilters,
  limit: number,
): WorkoutHistoryView {
  const matches = filterWorkouts(workouts, filters);
  const visible = matches.slice(0, limit);
  const groups = new Map<string, WorkoutHistoryView['sections'][number]>();
  for (const workout of visible) {
    const month = workout.date.slice(0, 7);
    const section = groups.get(month) || {
      id: month,
      title: historyMonthLabel(month),
      sessions: [],
    };
    const exercises = workout.exercises.filter(
      (exercise) => exercise.sets.length > 0,
    );
    section.sessions.push({
      sessionId: String(workout.id),
      dayLabel: workout.date.slice(8),
      weekdayLabel: new Date(`${workout.date}T12:00:00`)
        .toLocaleDateString(undefined, { weekday: 'short' })
        .toUpperCase(),
      name: `Workout ${workout.id}`,
      description: `${new Set(exercises.map((exercise) => exercise.exerciseId)).size} exercises · ${exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)} logged sets`,
      detailLabel: [
        ...new Set(
          exercises.map(
            (exercise) =>
              catalog.find((item) => item.id === exercise.exerciseId)?.name ||
              `Exercise ${exercise.exerciseId}`,
          ),
        ),
      ].join(', '),
    });
    groups.set(month, section);
  }
  const monthCount = workouts.filter(
    (workout) => !filters.month || workout.date.startsWith(filters.month),
  ).length;
  return {
    monthLabel: historyMonthLabel(filters.month),
    monthlyCountLabel: String(monthCount),
    monthlyDescription: filters.month
      ? `saved in ${historyMonthLabel(filters.month)}`
      : 'saved workouts',
    weeklyCountLabel: String(matches.length),
    weeklyDescription: 'matching filters',
    resultLabel: `${matches.length} completed sessions · Showing ${visible.length}`,
    sections: [...groups.values()],
    moreLabel:
      matches.length > limit
        ? `Show ${Math.min(6, matches.length - limit)} more sessions`
        : undefined,
  };
}

export function buildWorkoutDetail(
  workout: Workout,
  catalog: Exercise[],
  analytics: Map<number, Progress>,
  focusExerciseId?: number | null,
): WorkoutDetailView {
  validateWorkouts([workout]);
  const grouped = new Map<number, Workout['exercises'][number]>();
  for (const exercise of workout.exercises) {
    const entry = grouped.get(exercise.exerciseId);
    grouped.set(exercise.exerciseId, {
      ...exercise,
      sets: [...(entry?.sets || []), ...exercise.sets],
    });
  }
  const actual = [...grouped.values()].filter(
    (exercise) => exercise.sets.length > 0,
  );
  const name = (id: number) =>
    catalog.find((exercise) => exercise.id === id)?.name || `Exercise ${id}`;
  const selected =
    actual.find((exercise) => exercise.exerciseId === focusExerciseId) ||
    actual[0];
  const progress = selected ? analytics.get(selected.exerciseId) : undefined;
  const ordered = progress
    ? [...progress.points].sort(
        (a, b) => a.date.localeCompare(b.date) || a.workoutId - b.workoutId,
      )
    : [];
  const index = ordered.findIndex((point) => point.workoutId === workout.id);
  const point = ordered[index];
  const previous = ordered[index - 1];
  return {
    sessionId: String(workout.id),
    status: 'saved',
    dateLabel: strengthDate(workout.date, true),
    name: `Workout ${workout.id}`,
    durationLabel: '—',
    volumeLabel: '—',
    summaryLabel: `${actual.length} exercises · ${actual.reduce((sum, exercise) => sum + exercise.sets.length, 0)} logged sets`,
    unit: 'lb',
    dataNote:
      'Duration and total session volume aren’t available. Exercise volumes below describe each exercise separately.',
    comparison:
      point && selected
        ? {
            title: previous
              ? `${name(selected.exerciseId)} vs ${strengthDate(previous.date)}`
              : `${name(selected.exerciseId)} · first saved session`,
            volumeLabel: `${formatStrengthNumber(point.volume)} lb`,
            volumeDescription: previous
              ? `Exercise volume · previous ${formatStrengthNumber(previous.volume)} lb`
              : 'Exercise volume',
            estimatedMaxLabel:
              point.estimatedOneRepMax === null
                ? '—'
                : `${formatStrengthNumber(point.estimatedOneRepMax)} lb`,
            estimatedMaxDescription:
              point.oneRepMaxChange === null
                ? 'Estimated 1RM'
                : `${point.oneRepMaxChange > 0 ? '+' : ''}${formatStrengthNumber(point.oneRepMaxChange)} lb vs previous session`,
            bestSetMessage:
              'Estimated strength helps compare sessions. It is not a weight recommendation.',
          }
        : undefined,
    exercises: actual.map((exercise) => {
      const point = analytics
        .get(exercise.exerciseId)
        ?.points.find((point) => point.workoutId === workout.id);
      return {
        id: String(exercise.exerciseId),
        name: name(exercise.exerciseId),
        volumeLabel: point
          ? `${formatStrengthNumber(point.volume)} lb volume`
          : '—',
        loadLabel: 'Logged external load · lb',
        canViewStrength: catalog.some(
          (item) => item.id === exercise.exerciseId,
        ),
        completedSets: exercise.sets.map((set, index) => ({
          ...set,
          id: `${exercise.exerciseId}:${index}`,
          number: index + 1,
        })),
      };
    }),
  };
}
