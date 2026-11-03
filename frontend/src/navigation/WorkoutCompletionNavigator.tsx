import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {WorkoutDetailScreen} from '../screens/WorkoutDetailScreen';
import type {WorkoutDetailView} from '../screens/WorkoutDetailScreen';
import {WorkoutReviewScreen} from '../screens/WorkoutReviewScreen';
import type {WorkoutReview} from '../screens/WorkoutReviewScreen';
import {WorkoutSavedScreen} from '../screens/WorkoutSavedScreen';
import type {SavedWorkoutReceipt} from '../screens/WorkoutSavedScreen';
import {colors} from '../theme';

interface Props {
  workout: WorkoutReview;
  onSave: (sessionId: string) => Promise<SavedWorkoutReceipt>;
  loadWorkout: (sessionId: string) => Promise<WorkoutDetailView>;
  onKeepTraining: () => void;
  onViewHistory: () => void;
  onViewStrength: () => void;
}

/** Connects workout review, the saved celebration and saved details. */
export function WorkoutCompletionNavigator(props: Props) {
  return <CompletionFlow key={props.workout.sessionId} {...props} />;
}

function CompletionFlow({workout, onSave, loadWorkout, onKeepTraining, onViewHistory, onViewStrength}: Props) {
  const [receipt, setReceipt] = useState<SavedWorkoutReceipt | null>(null);
  const [detail, setDetail] = useState<WorkoutDetailView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const loadingRef = useRef(false);

  useEffect(() => () => {requestVersion.current += 1;}, []);

  function leave(action: () => void) {
    requestVersion.current += 1;
    loadingRef.current = false;
    setLoading(false);
    setError(null);
    action();
  }

  async function openSavedWorkout(sessionId: string) {
    if (loadingRef.current || sessionId !== receipt?.sessionId) return;
    loadingRef.current = true;
    const version = ++requestVersion.current;
    setLoading(true);
    setError(null);
    try {
      const response = await loadWorkout(sessionId);
      if (version !== requestVersion.current) return;
      if (response.sessionId !== sessionId || response.status !== 'saved') {
        throw new Error('The saved workout could not be opened.');
      }
      setDetail(response);
    } catch (failure) {
      if (version === requestVersion.current) {
        setError(failure instanceof Error ? failure.message : 'The saved workout could not be opened.');
      }
    } finally {
      if (version === requestVersion.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }

  return (
    <View style={styles.screen}>
      {detail ? (
        <WorkoutDetailScreen
          workout={detail}
          backLabel="Workout saved"
          onBackToHistory={() => setDetail(null)}
          onViewHistory={() => leave(onViewHistory)}
          onViewStrength={() => leave(onViewStrength)}
        />
      ) : receipt ? (
        <WorkoutSavedScreen
          receipt={receipt}
          onViewSession={(id) => {void openSavedWorkout(id);}}
          onViewHistory={() => leave(onViewHistory)}
        />
      ) : (
        <WorkoutReviewScreen
          workout={workout}
          onSave={onSave}
          onSaved={setReceipt}
          onKeepTraining={() => leave(onKeepTraining)}
        />
      )}
      {loading && <ActivityIndicator accessibilityLabel="Loading saved workout" color={colors.green} style={styles.loading} />}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  loading: {padding: 12},
  error: {color: colors.danger, fontSize: 13, lineHeight: 19, padding: 16},
});
