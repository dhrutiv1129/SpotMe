import React, {useRef, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {Button} from '../components/WorkoutControls';
import type {LoggedSet} from '../components/ExerciseRow';
import type {SavedWorkoutReceipt} from './WorkoutSavedScreen';
import {colors} from '../theme';

export interface WorkoutReview {
  sessionId: string;
  name: string;
  durationLabel: string;
  volumeLabel: string;
  completedSets: number;
  unit: 'kg' | 'lb';
  exercises: Array<{
    id: string;
    name: string;
    substitutionLabel?: string;
    loadLabel: string;
    completedSets: LoggedSet[];
  }>;
}

interface Props {
  workout: WorkoutReview;
  onKeepTraining: () => void;
  onSave: (sessionId: string) => Promise<SavedWorkoutReceipt>;
  onSaved: (receipt: SavedWorkoutReceipt) => void;
}

/** Shows logged sets for review. Drafts stay in the workout form. */
export function WorkoutReviewScreen({workout, onKeepTraining, onSave, onSaved}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const writeInFlight = useRef(false);

  async function save() {
    if (writeInFlight.current || workout.completedSets === 0) return;
    writeInFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const receipt = await onSave(workout.sessionId);
      if (receipt.status !== 'saved' || receipt.sessionId !== workout.sessionId) {
        throw new Error('Your workout save has not been confirmed yet.');
      }
      onSaved(receipt);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Please try again.');
    } finally {
      writeInFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Review & finish</Text>
      <Text accessibilityRole="header" style={styles.title}>Ready to call it a win?</Text>
      <Text style={styles.body}>{workout.name} · Review your logged sets before saving.</Text>
      <View style={styles.summary}>
        <View style={styles.summaryItem}><Text style={styles.value}>{workout.completedSets} sets</Text><Text style={styles.body}>logged · {workout.durationLabel}</Text></View>
        <View style={styles.summaryItem}><Text style={styles.value}>{workout.volumeLabel}</Text><Text style={styles.body}>total training volume</Text></View>
      </View>
      {workout.exercises.map((exercise) => (
        <View key={exercise.id} style={styles.exercise}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          {!!exercise.substitutionLabel && <Text style={styles.badge}>{exercise.substitutionLabel}</Text>}
          <Text style={styles.body}>{exercise.loadLabel}</Text>
          <View style={styles.row}>
            <Text style={[styles.columnLabel, styles.number]}>SET</Text>
            <Text style={[styles.columnLabel, styles.column]}>{workout.unit.toUpperCase()}</Text>
            <Text style={[styles.columnLabel, styles.column]}>REPS</Text>
            <Text style={[styles.columnLabel, styles.column]}>ACTUAL</Text>
          </View>
          {exercise.completedSets.map((set) => (
            <View key={set.id} style={[styles.row, styles.loggedSet]}>
              <Text style={[styles.setValue, styles.number]}>{set.number}</Text>
              <Text style={[styles.setValue, styles.column]}>{set.weight}</Text>
              <Text style={[styles.setValue, styles.column]}>{set.reps}</Text>
              <Text style={[styles.loggedLabel, styles.column]}>✓ Logged</Text>
            </View>
          ))}
        </View>
      ))}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Button label="Finish workout & save" busy={busy} disabled={workout.completedSets === 0} onPress={() => {void save();}} />
      <Button label="Keep training" variant="text" disabled={busy} onPress={onKeepTraining} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  content: {paddingHorizontal: 22, paddingTop: 24, paddingBottom: 28, gap: 20},
  header: {color: colors.ink, fontSize: 15, fontWeight: '700', marginBottom: 10},
  title: {color: colors.ink, fontSize: 32, fontWeight: '700', letterSpacing: -0.7},
  body: {color: colors.muted, fontSize: 12, lineHeight: 19},
  summary: {backgroundColor: colors.pale, borderRadius: 22, padding: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 16},
  summaryItem: {flexGrow: 1, gap: 6},
  value: {color: colors.ink, fontSize: 26, fontWeight: '700'},
  exercise: {backgroundColor: colors.surface, borderRadius: 22, padding: 16, gap: 12},
  exerciseName: {color: colors.ink, fontSize: 18, fontWeight: '700'},
  badge: {alignSelf: 'flex-start', color: colors.green, backgroundColor: colors.pale, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, fontSize: 11, fontWeight: '700'},
  row: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8},
  columnLabel: {color: colors.muted, fontSize: 10},
  number: {width: 22},
  column: {flex: 1},
  loggedSet: {backgroundColor: colors.pale, borderRadius: 8, paddingVertical: 10},
  setValue: {color: colors.ink, fontSize: 14},
  loggedLabel: {color: colors.green, fontSize: 11, fontWeight: '600'},
  error: {color: colors.errorText, fontSize: 13, lineHeight: 19},
});
