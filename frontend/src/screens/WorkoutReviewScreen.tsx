import React, {useRef, useState} from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Button} from '../components/WorkoutControls';
import type {LoggedSet} from '../components/ExerciseRow';
import type {SavedWorkoutReceipt} from './WorkoutSavedScreen';
import {colors} from '../theme';

export interface WorkoutReview {
  sessionId: string;
  name: string;
  durationLabel: string;
  volumeLabel: string;
  summaryLabel: string;
  completedSets: number;
  unit: 'kg' | 'lb';
  exercises: Array<{
    id: string;
    name: string;
    substitutionLabel?: string;
    performanceLabel: string;
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
      <Pressable accessibilityRole="button" disabled={busy} onPress={onKeepTraining} style={styles.back}>
        <Image source={require('../assets/back.png')} style={styles.backIcon} />
        <Text style={styles.header}>Your workout</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>Review & finish</Text>
      <View style={styles.summary}>
        <Text style={styles.workoutName}>{workout.name}</Text>
        <View style={styles.metrics}>
          <View style={styles.summaryItem}><Text style={styles.value}>{workout.durationLabel}</Text><Text style={styles.heroCaption}>duration</Text></View>
          <View style={styles.summaryItem}><Text style={styles.value}>{workout.volumeLabel}</Text><Text style={styles.heroCaption}>total volume</Text></View>
        </View>
        <Text style={styles.heroCaption}>{workout.summaryLabel}</Text>
      </View>
      <View style={styles.exercises}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Exercise summary</Text>
      {workout.exercises.map((exercise) => (
        <View key={exercise.id} style={styles.exercise}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          {!!exercise.substitutionLabel && <Text style={styles.badge}>{exercise.substitutionLabel}</Text>}
          <Text style={styles.performance}>{exercise.performanceLabel}</Text>
          {!!exercise.loadLabel && <Text style={styles.body}>{exercise.loadLabel}</Text>}
        </View>
      ))}
      </View>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Button label="Save workout" busy={busy} disabled={workout.completedSets === 0} onPress={() => {void save();}} />
      <Button label="Keep training" variant="text" disabled={busy} onPress={onKeepTraining} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  content: {paddingHorizontal: 22, paddingTop: 10, paddingBottom: 26, gap: 22},
  back: {flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44},
  backIcon: {width: 22, height: 22},
  header: {color: colors.ink, fontSize: 15, fontWeight: '700'},
  title: {color: colors.ink, fontSize: 32, lineHeight: 36, fontWeight: '700', letterSpacing: -1.2},
  body: {color: colors.muted, fontSize: 11, lineHeight: 16},
  summary: {backgroundColor: colors.hero, borderRadius: 22, padding: 20, gap: 16},
  workoutName: {color: colors.surface, fontSize: 27, fontWeight: '700', letterSpacing: -0.8},
  metrics: {flexDirection: 'row', gap: 18},
  summaryItem: {flex: 1, gap: 5},
  value: {color: colors.surface, fontSize: 28, fontWeight: '700', letterSpacing: -0.8},
  heroCaption: {color: '#C1CCBD', fontSize: 12},
  exercises: {gap: 12},
  sectionTitle: {color: colors.ink, fontSize: 18, fontWeight: '700', letterSpacing: -0.4},
  exercise: {backgroundColor: colors.surface, borderRadius: 20, padding: 16, gap: 9},
  exerciseName: {color: colors.ink, fontSize: 17, fontWeight: '700', letterSpacing: -0.4},
  performance: {color: colors.ink, fontSize: 14, fontWeight: '600'},
  badge: {alignSelf: 'flex-start', color: colors.green, backgroundColor: colors.pale, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, fontSize: 11, fontWeight: '700'},
  error: {color: colors.danger, fontSize: 13, lineHeight: 19},
});
