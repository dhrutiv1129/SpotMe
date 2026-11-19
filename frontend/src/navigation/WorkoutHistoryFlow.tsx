import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { api, ApiError } from '../beta/api';
import type { Exercise, Progress, Workout } from '../beta/api';
import { WorkoutHistoryFilters } from '../components/WorkoutHistoryFilters';
import { Button } from '../components/WorkoutControls';
import { WorkoutHistoryScreen } from '../screens/WorkoutHistoryScreen';
import { WorkoutDetailScreen } from '../screens/WorkoutDetailScreen';
import type { WorkoutDetailView } from '../screens/WorkoutDetailScreen';
import {
  allHistoryFilters,
  buildWorkoutDetail,
  buildWorkoutHistory,
  validateWorkouts,
  validHistoryDate,
} from '../state/workoutHistory';
import type { HistoryFilters, HistoryBrowseState } from '../state/workoutHistory';
import { colors } from '../theme';

export async function loadWorkoutHistory() {
  return validateWorkouts(await api<Workout[]>('/workouts'));
}
export async function loadWorkoutDetail(id: number) {
  const workout = await api<Workout>(`/workouts/${id}`);
  validateWorkouts([workout]);
  if (workout.id !== id)
    throw new Error('The saved workout could not be opened.');
  const ids = [
    ...new Set(
      workout.exercises
        .filter((exercise) => exercise.sets.length > 0)
        .map((exercise) => exercise.exerciseId),
    ),
  ];
  const analytics = new Map<number, Progress>();
  let analyticsUnavailable = false;
  for (let start = 0; start < ids.length; start += 4) {
    const batch = ids.slice(start, start + 4);
    const results = await Promise.allSettled(
      batch.map((id) => api<Progress>(`/progress/${id}`)),
    );
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        if (result.reason instanceof ApiError && result.reason.status === 401)
          throw result.reason;
        analyticsUnavailable = true;
        return;
      }
      const response = result.value;
      if (
        response.exerciseId !== batch[index] ||
        !Array.isArray(response.points) ||
        response.points.some(
          (point) =>
            !Number.isSafeInteger(point.workoutId) ||
            !validHistoryDate(point.date) ||
            !Number.isFinite(point.volume) ||
            point.volume < 0 ||
            (point.estimatedOneRepMax !== null &&
              (!Number.isFinite(point.estimatedOneRepMax) ||
                point.estimatedOneRepMax < 0)) ||
            (point.oneRepMaxChange !== null &&
              !Number.isFinite(point.oneRepMaxChange)),
        )
      ) {
        analyticsUnavailable = true;
        return;
      }
      analytics.set(batch[index], response);
    });
  }
  return { workout, analytics, analyticsUnavailable };
}

interface Props {
  browseState: HistoryBrowseState;
  onBrowseStateChange: (state: HistoryBrowseState) => void;
  catalog: Exercise[];
  initialWorkoutId?: number | null;
  focusExerciseId?: number | null;
  backLabel: string;
  onBack: () => void;
  onTrain: () => void;
  onViewStrength: (exerciseId: number) => void;
  onUnauthorized: () => void;
  loadHistory?: typeof loadWorkoutHistory;
  loadDetail?: typeof loadWorkoutDetail;
}

export function WorkoutHistoryFlow({
  browseState,
  onBrowseStateChange,
  catalog,
  initialWorkoutId,
  focusExerciseId,
  backLabel,
  onBack,
  onTrain,
  onViewStrength,
  onUnauthorized,
  loadHistory = loadWorkoutHistory,
  loadDetail = loadWorkoutDetail,
}: Props) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const {filters, limit} = browseState;
  const [sheet, setSheet] = useState<'month' | 'more' | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(
    initialWorkoutId || null,
  );
  const [visitedList, setVisitedList] = useState(!initialWorkoutId);
  const [detail, setDetail] = useState<WorkoutDetailView | null>(null);
  const [analyticsUnavailable, setAnalyticsUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const version = useRef(0);
  const auth = useRef(onUnauthorized);
  auth.current = onUnauthorized;

  useEffect(() => {
    setSelectedId(initialWorkoutId || null);
    setVisitedList(!initialWorkoutId);
  }, [initialWorkoutId]);
  useEffect(() => {
    const request = ++version.current;
    setError('');
    setAnalyticsUnavailable(false);
    setDetail(null);
    if (selectedId === null && historyReady) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void (async () => {
      try {
        if (selectedId === null) {
          const response = validateWorkouts(await loadHistory());
          if (request !== version.current) return;
          setWorkouts(response);
          setHistoryReady(true);
        } else {
          const response = await loadDetail(selectedId);
          if (request !== version.current) return;
          if (response.workout.id !== selectedId)
            throw new Error('The saved workout could not be opened.');
          setDetail(
            buildWorkoutDetail(
              response.workout,
              catalog,
              response.analytics,
              focusExerciseId,
            ),
          );
          setAnalyticsUnavailable(response.analyticsUnavailable);
        }
      } catch (failure) {
        if (request !== version.current) return;
        setError(
          failure instanceof Error
            ? failure.message
            : 'Your saved workouts could not load.',
        );
        if (failure instanceof ApiError && failure.status === 401)
          auth.current();
      } finally {
        if (request === version.current) setLoading(false);
      }
    })();
    return () => {
      version.current += 1;
    };
  }, [selectedId, reload, catalog, focusExerciseId, loadHistory, loadDetail]);

  function applyFilters(value: HistoryFilters) {
    onBrowseStateChange({filters: value, limit: 6});
  }
  function openHistory() {
    setVisitedList(true);
    setSelectedId(null);
  }
  function retry() {
    if (selectedId === null) setHistoryReady(false);
    setReload((value) => value + 1);
  }
  const history = buildWorkoutHistory(workouts, catalog, filters, limit);
  const strengthExercise =
    detail?.exercises.find(
      (exercise) =>
        exercise.canViewStrength && Number(exercise.id) === focusExerciseId,
    ) || detail?.exercises.find((exercise) => exercise.canViewStrength);
  const empty =
    history.sections.length === 0 ? (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Image
            source={require('../assets/history/search.png')}
            style={styles.search}
          />
        </View>
        <Text accessibilityRole="header" style={styles.emptyTitle}>
          {workouts.length ? 'No matching workouts' : 'Your story starts here.'}
        </Text>
        <Text style={[styles.body, styles.centered]}>
          {workouts.length
            ? 'No saved workouts match these filters. Try another exercise or date range.'
            : 'No completed workouts yet. Your first saved session will appear here.'}
        </Text>
        <Button
          label={workouts.length ? 'Clear filters' : 'Go to Train'}
          onPress={
            workouts.length ? () => applyFilters(allHistoryFilters()) : onTrain
          }
        />
        {!!workouts.length && (
          <Button
            label="Edit filters"
            variant="secondary"
            onPress={() => setSheet('more')}
          />
        )}
      </View>
    ) : undefined;

  if (loading || error)
    return (
      <View style={styles.state}>
        <Button
          label={
            selectedId !== null && visitedList
              ? 'Back to history'
              : `Back to ${backLabel}`
          }
          variant="text"
          onPress={selectedId !== null && visitedList ? openHistory : onBack}
        />
        <Text accessibilityRole="header" style={styles.title}>
          {selectedId === null ? 'Workout history' : 'Saved workout'}
        </Text>
        {loading ? (
          <>
            <ActivityIndicator
              accessibilityLabel="Loading saved workouts"
              color={colors.green}
            />
            <Text style={styles.body}>Loading your saved workouts…</Text>
          </>
        ) : (
          <>
            <Text accessibilityRole="alert" style={styles.body}>
              {error}
            </Text>
            <Text style={styles.body}>
              Your filters are kept. Try again when your connection is ready.
            </Text>
            <Button label="Retry loading workout" onPress={retry} />
            {selectedId !== null && !visitedList && (
              <Button
                label="View all workout history"
                variant="secondary"
                onPress={openHistory}
              />
            )}
          </>
        )}
      </View>
    );
  return (
    <View style={styles.screen}>
      {detail && selectedId !== null ? (
        <WorkoutDetailScreen
          workout={detail}
          backLabel={
            visitedList ? 'All workout history' : `Back to ${backLabel}`
          }
          onBackToHistory={visitedList ? openHistory : onBack}
          onViewHistory={openHistory}
          onViewStrength={
            strengthExercise
              ? () => onViewStrength(Number(strengthExercise.id))
              : undefined
          }
          onViewExercise={onViewStrength}
        />
      ) : (
        <WorkoutHistoryScreen
          history={history}
          onBack={onBack}
          backLabel={backLabel}
          onViewSession={(id) => {
            setVisitedList(true);
            setSelectedId(Number(id));
          }}
          onLoadMore={() => onBrowseStateChange({...browseState, limit: limit + 6})}
          empty={empty}
          filters={
            <WorkoutHistoryFilters
              filters={filters}
              catalog={catalog}
              workouts={workouts}
              sheet={sheet}
              onOpen={setSheet}
              onApply={applyFilters}
            />
          }
        />
      )}
      {analyticsUnavailable && (
        <View style={styles.warning}>
          <Text style={styles.body}>
            Your saved sets loaded, but some exercise analytics couldn’t load.
          </Text>
          <Button
            label="Retry exercise analytics"
            variant="text"
            onPress={retry}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  state: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    padding: 22,
    gap: 20,
  },
  title: { fontSize: 32, fontWeight: '700', color: colors.ink },
  body: { fontSize: 14, lineHeight: 21, color: colors.muted },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 36,
    gap: 20,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    backgroundColor: colors.pale,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  search: { width: 30, height: 30 },
  emptyTitle: {
    fontSize: 27,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  centered: { textAlign: 'center' },
  warning: {
    backgroundColor: colors.pale,
    paddingHorizontal: 22,
    paddingTop: 12,
  },
});
