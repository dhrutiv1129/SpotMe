import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api, ApiError } from '../beta/api';
import type { Exercise, Progress, Workout } from '../beta/api';
import { StrengthExerciseSelector } from '../components/StrengthExerciseSelector';
import { Button } from '../components/WorkoutControls';
import { buildStrengthProgress } from '../state/strengthProgress';
import { colors } from '../theme';
import { ProgressScreen } from './ProgressScreen';
import type { StrengthProgressView } from './ProgressScreen';

interface StrengthData {
  progress: Progress;
  workouts: Workout[];
  detailsUnavailable?: boolean;
}

export async function loadStrengthData(
  exerciseId: number,
): Promise<StrengthData> {
  const [progress, workouts] = await Promise.allSettled([
    api<Progress>(`/progress/${exerciseId}`),
    api<Workout[]>('/workouts'),
  ]);
  if (progress.status === 'rejected') throw progress.reason;
  if (
    workouts.status === 'rejected' &&
    workouts.reason instanceof ApiError &&
    workouts.reason.status === 401
  )
    throw workouts.reason;
  return {
    progress: progress.value,
    workouts: workouts.status === 'fulfilled' ? workouts.value : [],
    detailsUnavailable: workouts.status === 'rejected',
  };
}

interface Props {
  catalog: Exercise[];
  exerciseId: number | null;
  onSelectExercise: (id: number) => void;
  onViewHistory: () => void;
  onViewSession: (id: number) => void;
  onTrain: () => void;
  onUnauthorized: () => void;
  load?: (id: number) => Promise<StrengthData>;
}

export function StrengthProgressScreen({
  catalog,
  exerciseId,
  onSelectExercise,
  onViewHistory,
  onViewSession,
  onTrain,
  onUnauthorized,
  load = loadStrengthData,
}: Props) {
  const selectedId = catalog.some((exercise) => exercise.id === exerciseId)
    ? exerciseId!
    : catalog[0]?.id;
  const [progress, setProgress] = useState<StrengthProgressView | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailsUnavailable, setDetailsUnavailable] = useState(false);
  const [reload, setReload] = useState(0);
  const version = useRef(0);
  const mounted = useRef(true);
  const auth = useRef(onUnauthorized);
  auth.current = onUnauthorized;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      version.current += 1;
    };
  }, []);

  useEffect(() => {
    const request = ++version.current;
    setProgress(null);
    setError('');
    setLoading(!!selectedId);
    setDetailsUnavailable(false);
    if (!selectedId) return;
    const exercise = catalog.find((item) => item.id === selectedId)!;
    void load(selectedId)
      .then((data) => {
        if (!mounted.current || request !== version.current) return;
        setProgress(
          buildStrengthProgress(exercise, data.progress, data.workouts),
        );
        setDetailsUnavailable(!!data.detailsUnavailable);
      })
      .catch((failure) => {
        if (!mounted.current || request !== version.current) return;
        setError(
          failure instanceof Error
            ? failure.message
            : 'Your strength results could not load.',
        );
        if (failure instanceof ApiError && failure.status === 401)
          auth.current();
      })
      .finally(() => {
        if (mounted.current && request === version.current) setLoading(false);
      });
    return () => {
      version.current += 1;
    };
  }, [selectedId, catalog, load, reload]);

  const searchExercises = useCallback(
    async (query: string, signal: AbortSignal) => {
      if (signal.aborted) return [];
      const search = query.trim().toLowerCase();
      return catalog
        .filter((exercise) =>
          `${exercise.name} ${exercise.muscleGroup} ${exercise.requiredEquipment.join(' ')}`
            .toLowerCase()
            .includes(search),
        )
        .map((exercise) => ({
          id: String(exercise.id),
          name: exercise.name,
          description: `${exercise.requiredEquipment.join(', ') || 'Bodyweight'} · ${exercise.muscleGroup}`,
        }));
    },
    [catalog],
  );

  async function chooseExercise(id: string) {
    const exercise = catalog.find((item) => String(item.id) === id);
    if (!exercise) throw new Error('This exercise is no longer available.');
    onSelectExercise(exercise.id);
    setChoosing(false);
  }

  return (
    <View style={styles.screen}>
      {progress && !loading ? (
        <ProgressScreen
          progress={progress}
          onChooseExercise={() => setChoosing(true)}
          onViewHistory={onViewHistory}
          onViewSession={(id) => onViewSession(Number(id))}
          onTrain={onTrain}
        />
      ) : (
        <View style={styles.state}>
          <Text accessibilityRole="header" style={styles.title}>
            Small steps. Real strength.
          </Text>
          {loading ? (
            <>
              <ActivityIndicator
                accessibilityLabel="Loading strength results"
                color={colors.green}
              />
              <Text style={styles.body}>
                Loading your saved strength results…
              </Text>
            </>
          ) : (
            <>
              <Text
                accessibilityRole={error ? 'alert' : undefined}
                style={styles.body}
              >
                {error || 'No exercises are available yet.'}
              </Text>
              {!!selectedId && (
                <Button
                  label="Retry loading strength"
                  onPress={() => setReload((value) => value + 1)}
                />
              )}
              {!!catalog.length && (
                <Button
                  label="Choose another exercise"
                  variant="secondary"
                  onPress={() => setChoosing(true)}
                />
              )}
              <Button
                label="View workout history"
                variant="text"
                onPress={onViewHistory}
              />
            </>
          )}
        </View>
      )}
      {detailsUnavailable && !loading && (
        <View style={styles.warning}>
          <Text style={styles.body}>
            Your analytics loaded, but set details couldn’t load.
          </Text>
          <Button
            label="Retry set details"
            variant="text"
            onPress={() => setReload((value) => value + 1)}
          />
        </View>
      )}
      {choosing && (
        <StrengthExerciseSelector
          selectedExerciseId={String(selectedId || '')}
          searchExercises={searchExercises}
          onSelect={chooseExercise}
          onClose={() => setChoosing(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  state: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    padding: 22,
    gap: 20,
  },
  title: { fontSize: 32, lineHeight: 36, fontWeight: '700', color: colors.ink },
  body: { fontSize: 14, lineHeight: 21, color: colors.muted },
  warning: {
    paddingHorizontal: 22,
    paddingTop: 10,
    backgroundColor: colors.pale,
  },
});
