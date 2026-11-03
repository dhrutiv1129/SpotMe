import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {AlternativesModel} from '../components/AlternativesModel';
import {ExerciseGuideScreen} from '../screens/ExerciseGuideScreen';
import type {ExerciseGuide} from '../screens/ExerciseGuideScreen';
import {WorkoutLogScreen} from '../screens/WorkoutLogScreen';
import type {WorkoutReview} from '../screens/WorkoutReviewScreen';
import {colors} from '../theme';
import {WorkoutCompletionNavigator} from './WorkoutCompletionNavigator';

export interface ExerciseSwapView extends Omit<React.ComponentProps<typeof AlternativesModel>, 'onViewGuide' | 'onBack'> {
  originalExerciseId: string;
}

interface Props {
  sessionId: string;
  activeWorkout: Omit<React.ComponentProps<typeof WorkoutLogScreen>, 'onReview' | 'onSwap'>;
  loadReview: (sessionId: string) => Promise<WorkoutReview>;
  completion: Omit<React.ComponentProps<typeof WorkoutCompletionNavigator>, 'workout' | 'onKeepTraining'>;
  swap: {
    loadAlternatives: (sessionId: string, exerciseId: string) => Promise<ExerciseSwapView>;
    loadGuide: (sessionId: string, exerciseId: string) => Promise<ExerciseGuide>;
    onUseExercise: (sessionId: string, originalExerciseId: string, replacementId: string) => Promise<void>;
  };
}

/** Connects exercise swaps and workout review while keeping the training form available. */
export function WorkoutSessionNavigator(props: Props) {
  return <SessionFlow key={props.sessionId} {...props} />;
}

function SessionFlow({sessionId, activeWorkout, loadReview, completion, swap}: Props) {
  const [review, setReview] = useState<WorkoutReview | null>(null);
  const [alternatives, setAlternatives] = useState<ExerciseSwapView | null>(null);
  const [guide, setGuide] = useState<ExerciseGuide | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const loadingRef = useRef(false);

  useEffect(() => () => {requestVersion.current += 1;}, []);

  async function loadScreen<T>(request: () => Promise<T>, show: (response: T) => void) {
    if (loadingRef.current || activeWorkout.workout?.sessionId !== sessionId) return;
    loadingRef.current = true;
    const version = ++requestVersion.current;
    setLoading(true);
    setError(null);
    try {
      const response = await request();
      if (version !== requestVersion.current) return;
      show(response);
    } catch (failure) {
      if (version === requestVersion.current) {
        setError(failure instanceof Error ? failure.message : 'This screen could not be opened.');
      }
    } finally {
      if (version === requestVersion.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }

  function openReview() {
    return loadScreen(() => loadReview(sessionId), (response) => {
      if (response.sessionId !== sessionId) throw new Error('The workout review could not be opened.');
      setReview(response);
    });
  }

  function openSwap(exerciseId: string) {
    return loadScreen(() => swap.loadAlternatives(sessionId, exerciseId), (response) => {
      if (response.originalExerciseId !== exerciseId) throw new Error('Exercise alternatives could not be opened.');
      setAlternatives(response);
    });
  }

  function openGuide(exerciseId: string) {
    if (!alternatives?.alternatives.some((exercise) => exercise.id === exerciseId)) return;
    return loadScreen(() => swap.loadGuide(sessionId, exerciseId), (response) => {
      if (response.exerciseId !== exerciseId) throw new Error('The exercise guide could not be opened.');
      setGuide(response);
    });
  }

  function returnToTraining() {
    setAlternatives(null);
    setGuide(null);
    setError(null);
  }

  async function useExercise(exerciseId: string) {
    if (!alternatives || guide?.exerciseId !== exerciseId) return;
    const version = ++requestVersion.current;
    await swap.onUseExercise(sessionId, alternatives.originalExerciseId, exerciseId);
    if (version === requestVersion.current) returnToTraining();
  }

  function leave(action: () => void) {
    requestVersion.current += 1;
    loadingRef.current = false;
    setLoading(false);
    setError(null);
    action();
  }

  return (
    <View style={styles.screen}>
      <View
        style={[styles.screen, (!!review || !!alternatives) && styles.hidden]}
        pointerEvents={loading || review || alternatives ? 'none' : 'auto'}
        accessibilityElementsHidden={!!review || !!alternatives}
        importantForAccessibility={review || alternatives ? 'no-hide-descendants' : 'auto'}
      >
        <WorkoutLogScreen
          {...activeWorkout}
          onBack={() => leave(activeWorkout.onBack)}
          onReview={() => {void openReview();}}
          onSwap={(id) => {void openSwap(id);}}
        />
      </View>
      {alternatives && (
        <View
          style={[styles.screen, !!guide && styles.hidden]}
          pointerEvents={loading || guide ? 'none' : 'auto'}
          accessibilityElementsHidden={!!guide}
          importantForAccessibility={guide ? 'no-hide-descendants' : 'auto'}
        >
          <AlternativesModel
            {...alternatives}
            onViewGuide={(id) => {void openGuide(id);}}
            onBack={returnToTraining}
          />
        </View>
      )}
      {guide && (
        <ExerciseGuideScreen
          key={guide.exerciseId}
          guide={guide}
          onBack={() => setGuide(null)}
          onKeepExercise={returnToTraining}
          onUseExercise={useExercise}
        />
      )}
      {review && (
        <WorkoutCompletionNavigator
          {...completion}
          workout={review}
          onKeepTraining={() => setReview(null)}
        />
      )}
      {loading && <ActivityIndicator accessibilityLabel="Loading workout screen" color={colors.green} style={styles.loading} />}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  hidden: {display: 'none'},
  loading: {padding: 12},
  error: {color: colors.danger, fontSize: 13, lineHeight: 19, padding: 16},
});
