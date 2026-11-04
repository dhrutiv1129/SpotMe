import React, {useRef, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {WorkoutPlanNavigator} from './WorkoutPlanNavigator';
import {WorkoutSessionNavigator} from './WorkoutSessionNavigator';
import {colors} from '../theme';
import {useWorkoutSession} from '../state/useWorkoutSession';
import type {WorkoutSessionSource} from '../state/useWorkoutSession';

type SessionProps = React.ComponentProps<typeof WorkoutSessionNavigator>;

interface Props {
  plan: Omit<React.ComponentProps<typeof WorkoutPlanNavigator>, 'onStartWorkout'>;
  source: WorkoutSessionSource;
  session: Omit<SessionProps, 'sessionId' | 'activeWorkout' | 'completion'> & {
    activeWorkout: Omit<SessionProps['activeWorkout'], 'workout' | 'loading' | 'error' | 'onRetry' | 'onNextExercise'>;
    completion: Omit<SessionProps['completion'], 'onReturnToTrain'>;
  };
}

/** Starts the workout and keeps the training screens updated after changes. */
export function TrainNavigator({plan, source, session}: Props) {
  const {workout, startWorkout, refreshWorkout, clearWorkout} = useWorkoutSession(source);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshingRef = useRef(false);
  const hasSession = workout !== null;
  const actions = session.activeWorkout;

  async function changeWorkout(action: () => Promise<void>) {
    await action();
    await refreshWorkout();
  }

  async function openExercise(exerciseId?: string) {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    setError(null);
    try {
      await refreshWorkout(exerciseId);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The workout could not be loaded.');
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }

  function returnToPlans() {
    clearWorkout();
    setError(null);
  }

  return (
    <View style={styles.screen}>
      <View
        style={[styles.screen, hasSession && styles.hidden]}
        pointerEvents={hasSession ? 'none' : 'auto'}
        accessibilityElementsHidden={hasSession}
        importantForAccessibility={hasSession ? 'no-hide-descendants' : 'auto'}
      >
        <WorkoutPlanNavigator {...plan} onStartWorkout={startWorkout} />
      </View>
      {workout && (
        <View style={styles.screen} pointerEvents={refreshing ? 'none' : 'auto'}>
          <WorkoutSessionNavigator
            {...session}
            sessionId={workout.sessionId}
            activeWorkout={{
              ...actions,
              workout,
              onRetry: () => {void openExercise();},
              onNextExercise: (id) => {void openExercise(id);},
              onLogSet: (...args) => changeWorkout(() => actions.onLogSet(...args)),
              onEditSet: (...args) => changeWorkout(() => actions.onEditSet(...args)),
              onRemoveSet: (...args) => changeWorkout(() => actions.onRemoveSet(...args)),
              onPause: (id) => changeWorkout(() => actions.onPause(id)),
              onResume: (id) => changeWorkout(() => actions.onResume(id)),
              onDiscard: async (id) => {
                await actions.onDiscard(id);
                returnToPlans();
              },
            }}
            swap={{
              ...session.swap,
              onUseExercise: (...args) => changeWorkout(() => session.swap.onUseExercise(...args)),
            }}
            completion={{
              ...session.completion,
              onReturnToTrain: returnToPlans,
              onViewHistory: () => {
                returnToPlans();
                session.completion.onViewHistory();
              },
              onViewStrength: () => {
                returnToPlans();
                session.completion.onViewStrength();
              },
            }}
          />
        </View>
      )}
      {refreshing && <ActivityIndicator accessibilityLabel="Loading exercise" color={colors.green} />}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  hidden: {display: 'none'},
  error: {color: colors.danger, fontSize: 13, lineHeight: 19, padding: 16},
});
