import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import type { Exercise } from '../beta/api';
import type { Draft } from '../beta/draft';
import {
  elapsedMilliseconds,
  pauseDraft,
  resumeDraft,
  resetWorkout,
  workoutCounts,
  workoutTargets,
} from '../beta/draft';
import { Button, Sheet } from '../components/WorkoutControls';
import { validateSetInput } from '../components/WorkoutForm';
import {colors} from '../theme';
import { WorkoutLogScreen } from './WorkoutLogScreen';
import { WorkoutPlanScreen } from './WorkoutPlanScreen';

interface Props {
  draft: Draft;
  catalog: Exercise[];
  selected: number | null;
  onSelect: (id: number) => void;
  onChange: (draft: Draft) => Promise<void>;
  onBack: () => void;
  onReview: () => void;
  onSwap: () => Promise<void>;
  inputs: Record<string, { weight: string; reps: string }>;
}

export function elapsedLabel(draft: Draft, now = Date.now()) {
  if (!draft.session) return '—';
  const seconds = Math.floor(elapsedMilliseconds(draft, now) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function ActiveWorkoutScreen({
  draft,
  catalog,
  selected,
  onSelect,
  onChange,
  onBack,
  onReview,
  onSwap,
  inputs,
}: Props) {
  const [now, setNow] = useState(Date.now);
  const [fullPlan, setFullPlan] = useState(false);
  const [guidance, setGuidance] = useState(false);
  const [leavingError, setLeavingError] = useState('');
  const current = useRef(draft);
  current.current = draft;
  const inputCache = useRef(inputs);
  const writing = useRef(false);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const entry =
    draft.exercises.find((item) => item.exerciseId === selected) ||
    draft.exercises[0];
  const exercise = catalog.find((item) => item.id === entry?.exerciseId);
  const targets = workoutTargets(draft);
  const target = targets.find((item) => item.exerciseId === entry?.exerciseId);
  const counts = workoutCounts(draft);
  const name = (id: number) =>
    catalog.find((item) => item.id === id)?.name || `Exercise ${id}`;
  const targetLabel = (id: number) => {
    const item = targets.find((value) => value.exerciseId === id);
    return item ? `${item.sets} × ${item.reps}` : 'Log the sets you complete';
  };
  const position = draft.exercises.indexOf(entry);
  const remaining = [
    ...draft.exercises.slice(position + 1),
    ...draft.exercises.slice(0, position),
  ];
  const next = remaining.find((item) => {
    const aim = targets.find((value) => value.exerciseId === item.exerciseId);
    return !aim || item.sets.length < aim.sets;
  });
  const input = (id: number) =>
    inputCache.current[String(id)] || {
      weight: '',
      reps: String(targets.find((item) => item.exerciseId === id)?.reps || ''),
    };
  const paused = draft.session?.runningSince === null;

  function snapshot(value: Draft): Draft {
    const session = value.session || resumeDraft(value).session!;
    return {
      ...value,
      session: { ...session, inputs: { ...inputCache.current } },
    };
  }
  async function change(
    sessionId: string,
    action: (value: Draft) => Draft,
    keepInputs = true,
  ) {
    if (writing.current)
      throw new Error('Please wait for your current change to finish.');
    if (
      current.current.key !== sessionId ||
      current.current.pending ||
      current.current.plan?.ready
    )
      throw new Error('Return to Train and reopen your workout.');
    writing.current = true;
    try {
      const value = action(
        keepInputs ? snapshot(current.current) : current.current,
      );
      await onChange(value);
      current.current = value;
    } finally {
      writing.current = false;
    }
  }
  async function leave(action: () => void | Promise<void>) {
    try {
      setLeavingError('');
      await change(draft.key, (value) => value);
      await action();
    } catch (failure) {
      setLeavingError(
        failure instanceof Error ? failure.message : 'Please try again.',
      );
    }
  }
  const substitution =
    draft.session?.substitutions?.[String(entry?.exerciseId)];
  const workout =
    entry && exercise
      ? {
          sessionId: draft.key,
          name: draft.plan?.name || 'Your workout',
          status: paused ? ('paused' as const) : ('active' as const),
          elapsedLabel: elapsedLabel(draft, now),
          completedSets: counts.completed,
          totalSets: counts.total,
          pendingSets: counts.pending,
          hasTargets: counts.hasTargets,
          exercise: {
            id: String(exercise.id),
            name: exercise.name,
            position: position + 1,
            totalExercises: draft.exercises.length,
            substitutionLabel: substitution
              ? `Swapped for ${name(substitution)}`
              : undefined,
            targetLabel: targetLabel(exercise.id),
            loadLabel: 'External load in lb',
            previousSessionLabel:
              'Tap a logged set to edit it. Planned reps are targets only.',
            sets: entry.sets.map((set, index) => ({
              ...set,
              id: `${exercise.id}:${index}`,
              number: index + 1,
            })),
            nextSetNumber:
              !target || entry.sets.length < target.sets
                ? entry.sets.length + 1
                : null,
            targetSets: target?.sets,
            targetReps: target?.reps,
            draft: input(exercise.id),
          },
          nextExercise: next
            ? {
                id: String(next.exerciseId),
                name: name(next.exerciseId),
                targetLabel: targetLabel(next.exerciseId),
              }
            : undefined,
        }
      : null;

  return (
    <View style={styles.screen}>
      <View
        style={[styles.screen, fullPlan && styles.hidden]}
        pointerEvents={fullPlan ? 'none' : 'auto'}
        accessibilityElementsHidden={fullPlan}
        importantForAccessibility={fullPlan ? 'no-hide-descendants' : 'auto'}
      >
        <WorkoutLogScreen
          workout={workout}
          error={leavingError}
          onRetry={onBack}
          onBack={() => {
            if (
              current.current.plan?.ready ||
              !current.current.exercises.length
            )
              onBack();
            else void leave(onBack);
          }}
          onSwap={() => {
            void leave(onSwap);
          }}
          onGuide={() => setGuidance(true)}
          onFullPlan={() => setFullPlan(true)}
          onReview={() => {
            void leave(onReview);
          }}
          onNextExercise={(id) => onSelect(Number(id))}
          onSkipRest={() => {}}
          onDraftChange={(id, value) => {
            inputCache.current[id] = value;
          }}
          onLogSet={async (sessionId, exerciseId, value) => {
            const errors = validateSetInput(
              String(value.weight),
              String(value.reps),
            );
            if (errors.weight || errors.reps)
              throw new Error(errors.weight || errors.reps);
            await change(sessionId, (current) => {
              if (current.session?.runningSince === null)
                throw new Error('Resume your workout before logging a set.');
              const item = current.exercises.find(
                (item) => item.exerciseId === Number(exerciseId),
              );
              if (!item)
                throw new Error('This exercise is no longer in your workout.');
              return {
                ...current,
                exercises: current.exercises.map((item) =>
                  item.exerciseId === Number(exerciseId)
                    ? { ...item, sets: [...item.sets, value] }
                    : item,
                ),
              };
            });
          }}
          onEditSet={async (sessionId, setId, value) => {
            const errors = validateSetInput(
              String(value.weight),
              String(value.reps),
            );
            if (errors.weight || errors.reps)
              throw new Error(errors.weight || errors.reps);
            await change(sessionId, (current) => {
              const [id, index] = setId.split(':').map(Number);
              if (
                !current.exercises.find((item) => item.exerciseId === id)?.sets[
                  index
                ]
              )
                throw new Error('This set is no longer in your workout.');
              return {
                ...current,
                exercises: current.exercises.map((item) =>
                  item.exerciseId === id
                    ? {
                        ...item,
                        sets: item.sets.map((set, i) =>
                          i === index ? value : set,
                        ),
                      }
                    : item,
                ),
              };
            });
          }}
          onRemoveSet={async (sessionId, setId) => {
            await change(sessionId, (current) => {
              const [id, index] = setId.split(':').map(Number);
              if (
                !current.exercises.find((item) => item.exerciseId === id)?.sets[
                  index
                ]
              )
                throw new Error('This set is no longer in your workout.');
              return {
                ...current,
                exercises: current.exercises.map((item) =>
                  item.exerciseId === id
                    ? { ...item, sets: item.sets.filter((_, i) => i !== index) }
                    : item,
                ),
              };
            });
          }}
          onPause={(id) => change(id, (value) => pauseDraft(value))}
          onResume={(id) => change(id, (value) => resumeDraft(value))}
          onSaveForLater={(id) => change(id, (value) => pauseDraft(value))}
          onDiscard={(id) => change(id, (value) => resetWorkout(value), false)}
        />
      </View>
      {fullPlan && (
        <WorkoutPlanScreen
          plan={{
            sessionId: draft.key,
            dateLabel: draft.date,
            name: draft.plan?.name || 'Your workout',
            description: `${draft.exercises.length} exercises`,
            status: paused ? 'paused' : 'active',
            completedSets: counts.completed,
            totalSets: counts.total,
            progressNote:
              'Only logged sets count. Planned targets and draft input stay separate.',
            unit: 'lb',
            activeExerciseId: String(entry?.exerciseId),
            exercises: draft.exercises.map((item) => {
              const aim = targets.find(
                (value) => value.exerciseId === item.exerciseId,
              );
              const edited = input(item.exerciseId);
              const valid =
                !validateSetInput(edited.weight, edited.reps).weight &&
                !validateSetInput(edited.weight, edited.reps).reps;
              return {
                id: String(item.exerciseId),
                name: name(item.exerciseId),
                targetLabel: targetLabel(item.exerciseId),
                completedSets: item.sets.length,
                targetSets: aim?.sets || item.sets.length,
                sets: Array.from(
                  {
                    length: Math.min(
                      100,
                      Math.max(aim?.sets || 0, item.sets.length),
                    ),
                  },
                  (_, index) => ({
                    id: `${item.exerciseId}:${index}`,
                    number: index + 1,
                    targetReps: aim?.reps || 0,
                    weight:
                      item.sets[index]?.weight ??
                      (index === item.sets.length && valid
                        ? Number(edited.weight)
                        : null),
                    reps:
                      item.sets[index]?.reps ??
                      (index === item.sets.length && valid
                        ? Number(edited.reps)
                        : null),
                    status: item.sets[index]
                      ? ('logged' as const)
                      : index === item.sets.length && valid
                        ? ('draft' as const)
                        : ('pending' as const),
                  }),
                ),
              };
            }),
          }}
          onRetry={() => setFullPlan(false)}
          onReturnToWorkout={() => setFullPlan(false)}
          onSelectExercise={(id) => {
            onSelect(Number(id));
            setFullPlan(false);
          }}
        />
      )}
      {!!leavingError && (
        <Text accessibilityRole="alert" style={styles.error}>
          {leavingError}
        </Text>
      )}
      {guidance && (
        <Sheet
          title={exercise?.name || 'Exercise guide'}
          onClose={() => setGuidance(false)}
        >
          <Text>
            {exercise?.instructions ||
              'Instructions are not available for this exercise yet.'}
          </Text>
          <Text>
            Enter external load in lb. Warm up first and stop if you feel pain.
          </Text>
          <Button label="Back to workout" onPress={() => setGuidance(false)} />
        </Sheet>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  hidden: { display: 'none' },
  error: { color: colors.danger, padding: 16 },
});
