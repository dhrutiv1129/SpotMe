import React, {useRef, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Button, NumberField, Sheet} from '../components/WorkoutControls';
import type {ExerciseView, LoggedSet} from '../components/ExerciseRow';
import {WorkoutForm, validateSetInput} from '../components/WorkoutForm';
import type {SetInput} from '../components/WorkoutForm';
import {colors} from '../theme';

export type {LoggedSet} from '../components/ExerciseRow';

export interface WorkoutView {
  sessionId: string;
  name: string;
  status: 'active' | 'paused';
  elapsedLabel: string;
  completedSets: number;
  totalSets: number;
  pendingSets: number;
  exercise: ExerciseView;
  restLabel?: string;
  nextExercise?: {id: string; name: string; targetLabel: string};
}

interface Props {
  workout: WorkoutView | null;
  loading?: boolean;
  error?: string;
  onRetry: () => void;
  onBack: () => void;
  onSwap: (exerciseId: string) => void;
  onGuide: (exerciseId: string) => void;
  onFullPlan: () => void;
  onReview: () => void;
  onNextExercise: (exerciseId: string) => void;
  onSkipRest: () => void;
  onLogSet: (
    sessionId: string,
    exerciseId: string,
    input: SetInput,
  ) => Promise<void>;
  onEditSet: (
    sessionId: string,
    setId: string,
    input: SetInput,
  ) => Promise<void>;
  onRemoveSet: (sessionId: string, setId: string) => Promise<void>;
  onPause: (sessionId: string) => Promise<void>;
  onResume: (sessionId: string) => Promise<void>;
  onDiscard: (sessionId: string) => Promise<void>;
  onSaveForLater: (sessionId: string) => Promise<void>;
}

/** Server response drives totals and status; only form drafts and dialogs live here. */
export function WorkoutLogScreen(props: Props) {
  if (props.loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.green} />
        <Text style={styles.body}>Loading your workout…</Text>
      </View>
    );
  }
  if (!props.workout) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>
          {props.error ? 'Workout couldn’t load.' : 'Your workout starts here.'}
        </Text>
        <Text style={styles.body}>
          {props.error || 'Choose a plan to start training.'}
        </Text>
        <Button
          label={props.error ? 'Retry loading workout' : 'Back to Train'}
          onPress={props.error ? props.onRetry : props.onBack}
        />
      </View>
    );
  }
  return (
    <ActiveWorkout
      key={`${props.workout.sessionId}:${props.workout.exercise.id}`}
      {...props}
      workout={props.workout}
    />
  );
}

function ActiveWorkout({
  workout,
  ...actions
}: Omit<Props, 'workout'> & {workout: WorkoutView}) {
  const {exercise} = workout;
  const nextExercise = workout.nextExercise;
  const [weight, setWeight] = useState(exercise.draft.weight);
  const [reps, setReps] = useState(exercise.draft.reps);
  const [sheet, setSheet] = useState<
    'paused' | 'edit' | 'remove' | 'discard' | 'incomplete' | 'empty' | null
  >(workout.status === 'paused' ? 'paused' : null);
  const [selectedSet, setSelectedSet] = useState<LoggedSet | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editReps, setEditReps] = useState('');
  const [busy, setBusy] = useState(false);
  const writeInFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const editErrors = validateSetInput(editWeight, editReps);
  const editInvalid = !!editErrors.weight || !!editErrors.reps;
  const editUnchanged =
    !!selectedSet &&
    Number(editWeight) === selectedSet.weight &&
    Number(editReps) === selectedSet.reps;
  const sheetTitles = {
    paused: 'Workout paused',
    edit: 'Edit logged set',
    remove: 'Remove logged set?',
    discard: 'Discard workout?',
    incomplete: `Finish with ${workout.completedSets} of ${workout.totalSets} sets?`,
    empty: 'No sets logged yet',
  };

  async function submit(action: () => Promise<void>, after?: () => void) {
    if (writeInFlight.current) return;
    writeInFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
      after?.();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      writeInFlight.current = false;
      setBusy(false);
    }
  }

  function openEdit(set: LoggedSet) {
    setSelectedSet(set);
    setEditWeight(String(set.weight));
    setEditReps(String(set.reps));
    setError(null);
    setSheet('edit');
  }

  function closeSheet() {
    if (!busy) {
      setSheet(null);
      setError(null);
    }
  }
  const errorNotice = error && (
    <Text accessibilityRole="alert" style={styles.error}>
      {error}
    </Text>
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Train"
            onPress={actions.onBack}
            style={styles.topButton}
          >
            <Text style={styles.back}>‹</Text>
            <Text style={styles.topTitle}>Your workout</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pause workout"
            disabled={busy}
            style={styles.iconButton}
            onPress={() => {
              void submit(
                () => actions.onPause(workout.sessionId),
                () => setSheet('paused'),
              );
            }}
          >
            <Text style={styles.pause}>Ⅱ</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.between}>
            <Text style={styles.eyebrow}>
              {workout.status === 'paused' ? 'PAUSED' : 'IN PROGRESS'}
            </Text>
            <Text style={styles.heroTime}>◷ {workout.elapsedLabel}</Text>
          </View>
          <Text style={styles.heroTitle}>{workout.name}</Text>
          <View
            style={styles.segments}
            accessibilityLabel={`${workout.completedSets} of ${workout.totalSets} sets logged`}
          >
            {Array.from({length: workout.totalSets}, (_, index) => (
              <View
                key={index}
                style={[
                  styles.segment,
                  index < workout.completedSets && styles.completedSegment,
                ]}
              />
            ))}
          </View>
          <Text style={styles.heroCaption}>
            {workout.completedSets} of {workout.totalSets} sets logged ·{' '}
            {workout.pendingSets} sets pending
          </Text>
        </View>

        <WorkoutForm
          exercise={exercise}
          weight={weight}
          reps={reps}
          onWeightChange={setWeight}
          onRepsChange={setReps}
          disabled={workout.status === 'paused'}
          busy={busy}
          error={sheet ? undefined : error ?? undefined}
          onEditSet={openEdit}
          onSwap={actions.onSwap}
          onGuide={actions.onGuide}
          onSubmit={(input) => {
            void submit(() =>
              actions.onLogSet(workout.sessionId, exercise.id, input),
            );
          }}
        />
        {!!workout.restLabel && (
          <View style={styles.rest}>
            <Text style={styles.link}>◷ Rest timer · {workout.restLabel}</Text>
            <Pressable
              accessibilityRole="button"
              style={styles.linkTarget}
              onPress={actions.onSkipRest}
            >
              <Text style={styles.linkRegular}>Skip</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.between}>
          <Text style={styles.sectionTitle}>
            {workout.nextExercise ? 'Up next' : 'Your plan'}
          </Text>
          <Pressable
            accessibilityRole="button"
            style={styles.linkTarget}
            onPress={actions.onFullPlan}
          >
            <Text style={styles.linkRegular}>Full plan →</Text>
          </Pressable>
        </View>
        {!!workout.nextExercise && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Next exercise: ${workout.nextExercise.name}`}
            onPress={() => {
              if (nextExercise) actions.onNextExercise(nextExercise.id);
            }}
            style={styles.nextCard}
          >
            <View style={styles.exerciseIcon}>
              <Text style={styles.exerciseGlyph}>↗</Text>
            </View>
            <View style={styles.nextCopy}>
              <Text style={styles.nextName}>{workout.nextExercise.name}</Text>
              <Text style={styles.caption}>
                {workout.nextExercise.targetLabel}
              </Text>
            </View>
            <Text style={styles.back}>›</Text>
          </Pressable>
        )}
        <Button
          label={`Review & finish · ${workout.completedSets} logged · ${workout.pendingSets} pending`}
          variant="text"
          disabled={busy || workout.status === 'paused'}
          onPress={() => {
            setError(null);
            if (workout.completedSets === 0) {
              setSheet('empty');
            } else if (workout.pendingSets > 0) {
              setSheet('incomplete');
            } else {
              actions.onReview();
            }
          }}
        />
      </ScrollView>

      {sheet && (
        <Sheet
          title={sheetTitles[sheet]}
          onClose={closeSheet}
          locked={busy || workout.status === 'paused'}
        >
          {sheet === 'incomplete' && (
            <>
              <Text style={styles.body}>
                {workout.pendingSets} sets are unfinished. Draft entries aren’t
                logged and won’t be saved as completed.
              </Text>
              <Button label="Keep training" onPress={closeSheet} />
              <Button
                label={`Review & finish ${workout.completedSets} completed sets`}
                variant="secondary"
                onPress={() => {
                  closeSheet();
                  actions.onReview();
                }}
              />
              <Text style={styles.caption}>
                Only logged sets go to review. Your workout stays unsaved until
                saving succeeds.
              </Text>
            </>
          )}
          {sheet === 'empty' && (
            <>
              <Text style={styles.body}>
                Log at least one set before finishing. Your draft inputs haven’t
                been counted as completed work.
              </Text>
              <Button label="Keep training" onPress={closeSheet} />
              <Button
                label="Discard workout"
                variant="secondary"
                onPress={() => setSheet('discard')}
              />
            </>
          )}
          {sheet === 'paused' && (
            <>
              <Text style={styles.body}>
                {workout.name} · {workout.completedSets} of {workout.totalSets}{' '}
                sets · {workout.elapsedLabel}
              </Text>
              {errorNotice}
              <Button
                label="Resume workout"
                busy={busy}
                onPress={() => {
                  void submit(
                    () => actions.onResume(workout.sessionId),
                    closeSheet,
                  );
                }}
              />
              <Button
                label="Save for later"
                variant="secondary"
                disabled={busy}
                onPress={() => {
                  void submit(
                    () => actions.onSaveForLater(workout.sessionId),
                    actions.onBack,
                  );
                }}
              />
              <Button
                label="Discard workout"
                variant="danger"
                disabled={busy}
                onPress={() => {
                  setError(null);
                  setSheet('discard');
                }}
              />
            </>
          )}
          {sheet === 'discard' && (
            <>
              <View style={styles.notice}>
                <Text style={styles.sectionTitle}>{workout.name}</Text>
                <Text style={styles.body}>
                  {workout.status === 'paused' ? 'Paused' : 'In progress'} ·{' '}
                  {workout.completedSets} logged sets ·{' '}
                  {workout.elapsedLabel}
                </Text>
              </View>
              <Text style={styles.body}>
                This discards your current workout draft and its logged sets.
                Your plan and saved history stay.
              </Text>
              {errorNotice}
              <Button
                label="Discard workout"
                variant="danger"
                busy={busy}
                onPress={() => {
                  void submit(
                    () => actions.onDiscard(workout.sessionId),
                    actions.onBack,
                  );
                }}
              />
              <Button
                label="Keep workout"
                variant="secondary"
                disabled={busy}
                onPress={() => {
                  setError(null);
                  setSheet(workout.status === 'paused' ? 'paused' : null);
                }}
              />
            </>
          )}
          {sheet === 'edit' && selectedSet && (
            <>
              <Text style={styles.body}>
                Correct the entry or remove this set.
              </Text>
              <View style={styles.notice}>
                <Text style={styles.sectionTitle}>{exercise.name}</Text>
                <Text style={styles.caption}>
                  Set {selectedSet.number} · Logged
                </Text>
              </View>
              <Text style={styles.caption}>
                Original values · {selectedSet.weight} kg × {selectedSet.reps}{' '}
                reps
              </Text>
              <NumberField
                label="WEIGHT (KG)"
                value={editWeight}
                onChange={setEditWeight}
                error={editErrors.weight}
                disabled={busy}
              />
              <NumberField
                label="REPS"
                value={editReps}
                onChange={setEditReps}
                error={editErrors.reps}
                disabled={busy}
                integer
              />
              {errorNotice}
              <Button
                label="Save changes"
                busy={busy}
                disabled={editInvalid || editUnchanged}
                onPress={() => {
                  void submit(
                    () =>
                      actions.onEditSet(workout.sessionId, selectedSet.id, {
                        weight: Number(editWeight),
                        reps: Number(editReps),
                      }),
                    closeSheet,
                  );
                }}
              />
              <Button
                label="Remove set"
                variant="secondary"
                disabled={busy}
                onPress={() => {
                  setError(null);
                  setSheet('remove');
                }}
              />
              <Text style={styles.caption}>
                Changes apply to this workout log when you save.
              </Text>
              <Button
                label="Cancel"
                variant="text"
                disabled={busy}
                onPress={closeSheet}
              />
            </>
          )}
          {sheet === 'remove' && selectedSet && (
            <>
              <View style={styles.notice}>
                <Text style={styles.sectionTitle}>
                  {exercise.name} · Set {selectedSet.number}
                </Text>
                <Text style={styles.body}>
                  {selectedSet.weight} kg × {selectedSet.reps} reps
                </Text>
              </View>
              <Text style={styles.body}>
                Only this set is removed from your current log. The exercise and
                plan stay.
              </Text>
              {errorNotice}
              <Button
                label="Remove set"
                variant="danger"
                busy={busy}
                onPress={() => {
                  void submit(
                    () =>
                      actions.onRemoveSet(workout.sessionId, selectedSet.id),
                    closeSheet,
                  );
                }}
              />
              <Button
                label="Keep set"
                variant="secondary"
                disabled={busy}
                onPress={() => {
                  setError(null);
                  setSheet('edit');
                }}
              />
            </>
          )}
        </Sheet>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  content: {paddingHorizontal: 22, paddingTop: 12, paddingBottom: 24, gap: 16},
  center: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    justifyContent: 'center',
    gap: 18,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  topButton: {
    minHeight: 44,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  topTitle: {fontSize: 15, fontWeight: '700', color: colors.ink},
  back: {fontSize: 28, color: colors.ink},
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pause: {color: colors.ink, fontSize: 24},
  hero: {backgroundColor: colors.hero, borderRadius: 22, padding: 20, gap: 14},
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.1,
    color: colors.lime,
    fontWeight: '700',
  },
  heroTime: {color: '#D4DDD1', fontSize: 12},
  heroTitle: {
    color: colors.onHero,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  heroCaption: {color: '#B6C4B4', fontSize: 12},
  segments: {flexDirection: 'row', gap: 4},
  segment: {height: 4, borderRadius: 4, flex: 1, backgroundColor: '#354B3C'},
  completedSegment: {backgroundColor: colors.lime},
  caption: {color: colors.muted, fontSize: 12, lineHeight: 18},
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.7,
  },
  linkTarget: {minHeight: 44, justifyContent: 'center'},
  link: {fontSize: 13, fontWeight: '700', color: colors.green},
  linkRegular: {fontSize: 13, color: colors.green},
  body: {color: colors.muted, fontSize: 14, lineHeight: 21},
  rest: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: colors.pale,
    borderRadius: 12,
  },
  sectionTitle: {color: colors.ink, fontSize: 18, fontWeight: '700'},
  nextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  exerciseIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.soft,
    borderRadius: 12,
  },
  exerciseGlyph: {color: colors.ink, fontSize: 24},
  nextCopy: {flex: 1, gap: 2},
  nextName: {color: colors.ink, fontSize: 14},
  notice: {backgroundColor: colors.pale, borderRadius: 18, padding: 16, gap: 8},
  error: {
    color: colors.errorText,
    fontSize: 13,
    lineHeight: 19,
    backgroundColor: colors.dangerSoft,
    borderRadius: 12,
    padding: 12,
  },
});
