import React, {useRef, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {Button, NumberField} from '../components/WorkoutControls';
import {colors} from '../theme';

export interface EditableWorkoutPlan {
  id: string;
  name: string;
  exercises: Array<{id: string; name: string; sets: number; reps: number}>;
}

interface Props {
  plan: EditableWorkoutPlan;
  dateLabel: string;
  onSave: (plan: EditableWorkoutPlan) => Promise<EditableWorkoutPlan>;
  onStartWorkout: (planId: string) => Promise<void>;
  onCancel: () => void;
}

function createDraft(plan: EditableWorkoutPlan) {
  return plan.exercises.map((exercise) => ({
    id: exercise.id,
    sets: String(exercise.sets),
    reps: String(exercise.reps),
  }));
}

function positiveInteger(value: string) {
  return value.trim() !== '' && Number.isSafeInteger(Number(value)) && Number(value) > 0;
}

/** Edit targets, wait for save acknowledgement, then start the saved plan. */
export function WorkoutPlanEditorScreen({
  plan, dateLabel, onSave, onStartWorkout, onCancel,
}: Props) {
  const [savedPlan, setSavedPlan] = useState(plan);
  const [draft, setDraft] = useState(() => createDraft(plan));
  const [busy, setBusy] = useState<'save' | 'start' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const writeInFlight = useRef(false);
  const changed = JSON.stringify(draft) !== JSON.stringify(createDraft(savedPlan));
  const invalid = draft.length === 0 || draft.some((row) =>
    !positiveInteger(row.sets) || !positiveInteger(row.reps));

  function updateDraft(id: string, field: 'sets' | 'reps', value: string) {
    setError(null);
    setDraft((rows) => rows.map((row) => row.id === id ? {...row, [field]: value} : row));
  }

  async function run(action: 'save' | 'start') {
    if (writeInFlight.current || invalid || (action === 'start' && changed)) return;
    writeInFlight.current = true;
    setBusy(action);
    setError(null);
    try {
      if (action === 'save') {
        const response = await onSave({
          ...savedPlan,
          exercises: savedPlan.exercises.map((exercise, index) => ({
            ...exercise,
            sets: Number(draft[index].sets),
            reps: Number(draft[index].reps),
          })),
        });
        setSavedPlan(response);
        setDraft(createDraft(response));
      } else {
        await onStartWorkout(savedPlan.id);
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Please try again.');
    } finally {
      writeInFlight.current = false;
      setBusy(null);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.brandRow}>
        <Text style={styles.brand}>SpotMe</Text>
        <Text style={styles.date}>{dateLabel}</Text>
      </View>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>Edit workout plan</Text>
        <Text style={styles.body}>Build a session that fits your goals.</Text>
      </View>
      <View style={styles.nameCard}>
        <Text style={styles.label}>WORKOUT NAME</Text>
        <Text style={styles.name}>{savedPlan.name}</Text>
      </View>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Exercises</Text>
      {savedPlan.exercises.map((exercise, index) => (
        <View key={exercise.id} style={styles.exercise}>
          <Text style={styles.exerciseName}>
            <Text style={styles.order}>{String(index + 1).padStart(2, '0')}  </Text>
            {exercise.name}
          </Text>
          <View style={styles.fields}>
            <NumberField
              label={`${exercise.name.toUpperCase()} · SETS`}
              value={draft[index].sets}
              onChange={(value) => updateDraft(exercise.id, 'sets', value)}
              integer
              disabled={!!busy}
              error={positiveInteger(draft[index].sets) ? undefined : 'Enter a positive whole number.'}
            />
            <NumberField
              label={`${exercise.name.toUpperCase()} · REPS`}
              value={draft[index].reps}
              onChange={(value) => updateDraft(exercise.id, 'reps', value)}
              integer
              disabled={!!busy}
              error={positiveInteger(draft[index].reps) ? undefined : 'Enter a positive whole number.'}
            />
          </View>
        </View>
      ))}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Button
        label="Save workout plan"
        disabled={!changed || invalid || !!busy}
        busy={busy === 'save'}
        onPress={() => {void run('save');}}
      />
      {!changed && (
        <Button
          label="Start workout  →"
          disabled={invalid || !!busy}
          busy={busy === 'start'}
          onPress={() => {void run('start');}}
        />
      )}
      <Button label="Cancel" variant="secondary" disabled={!!busy} onPress={onCancel} />
      <Text style={styles.body}>Changes update the plan, not past workout history.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  content: {paddingHorizontal: 22, paddingTop: 24, paddingBottom: 28, gap: 16},
  brandRow: {gap: 24, marginBottom: 4},
  brand: {fontSize: 24, fontWeight: '700', color: colors.ink},
  date: {fontSize: 10, color: colors.green, textTransform: 'uppercase', letterSpacing: 1.2},
  heading: {gap: 10},
  title: {fontSize: 32, fontWeight: '700', color: colors.ink, letterSpacing: -0.7},
  body: {fontSize: 13, lineHeight: 20, color: colors.muted},
  nameCard: {backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap'},
  label: {color: colors.green, fontSize: 10, fontWeight: '700', letterSpacing: 1},
  name: {color: colors.ink, fontSize: 15},
  sectionTitle: {color: colors.ink, fontSize: 20, fontWeight: '700', marginTop: 8},
  exercise: {backgroundColor: colors.surface, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.border, gap: 12},
  exerciseName: {color: colors.ink, fontSize: 15, fontWeight: '600'},
  order: {color: colors.green, fontSize: 12, fontWeight: '700'},
  fields: {flexDirection: 'row', gap: 10},
  error: {color: colors.errorText, fontSize: 13, lineHeight: 19},
});
