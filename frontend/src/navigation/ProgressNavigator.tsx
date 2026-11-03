import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {ConsistencyScreen} from '../screens/ConsistencyScreen';
import type {ConsistencyView} from '../screens/ConsistencyScreen';
import {ProgressScreen} from '../screens/ProgressScreen';
import type {StrengthProgressView} from '../screens/ProgressScreen';
import {WorkoutDetailScreen} from '../screens/WorkoutDetailScreen';
import type {WorkoutDetailView} from '../screens/WorkoutDetailScreen';
import {WorkoutHistoryScreen} from '../screens/WorkoutHistoryScreen';
import type {WorkoutHistoryView} from '../screens/WorkoutHistoryScreen';
import {colors} from '../theme';

interface Props {
  strength: StrengthProgressView;
  consistency: ConsistencyView;
  history: WorkoutHistoryView;
  loadWorkout: (sessionId: string) => Promise<WorkoutDetailView>;
  onChooseExercise: () => void;
  onEditGoal: () => void;
  onChangeMonth: (monthId: string) => void;
  onViewDay: (date: string, sessionIds: readonly string[]) => void;
  onLoadMoreHistory?: () => void;
}

/** Handles navigation between the Progress screens. */
export function ProgressNavigator({
  strength, consistency, history, loadWorkout,
  onChooseExercise, onEditGoal, onChangeMonth, onViewDay, onLoadMoreHistory,
}: Props) {
  const [tab, setTab] = useState<'strength' | 'consistency'>('strength');
  const [view, setView] = useState<'summary' | 'history'>('summary');
  const [workout, setWorkout] = useState<WorkoutDetailView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  useEffect(() => () => {requestVersion.current += 1;}, []);

  function navigate(nextView: 'summary' | 'history') {
    requestVersion.current += 1;
    setLoading(false);
    setError(null);
    setWorkout(null);
    setView(nextView);
  }

  async function openWorkout(sessionId: string) {
    const version = ++requestVersion.current;
    setLoading(true);
    setError(null);
    try {
      const response = await loadWorkout(sessionId);
      if (version !== requestVersion.current) return;
      if (response.sessionId !== sessionId || response.status !== 'saved') {
        throw new Error('The saved workout could not be opened.');
      }
      setWorkout(response);
    } catch (failure) {
      if (version === requestVersion.current) {
        setError(failure instanceof Error ? failure.message : 'Please try again.');
      }
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }

  function switchTab(nextTab: 'strength' | 'consistency') {
    navigate('summary');
    setTab(nextTab);
  }

  function viewDay(date: string, sessionIds: readonly string[]) {
    if (sessionIds.length === 1) {
      void openWorkout(sessionIds[0]);
    } else {
      onViewDay(date, sessionIds);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.screen}>
        {workout ? (
          <WorkoutDetailScreen
            workout={workout}
            onBackToHistory={() => navigate('history')}
            onViewStrength={() => switchTab('strength')}
          />
        ) : view === 'history' ? (
          <WorkoutHistoryScreen
            history={history}
            onBack={() => navigate('summary')}
            onViewSession={(id) => {void openWorkout(id);}}
            onLoadMore={onLoadMoreHistory}
          />
        ) : tab === 'strength' ? (
          <ProgressScreen
            progress={strength}
            onViewHistory={() => navigate('history')}
            onViewConsistency={() => switchTab('consistency')}
            onChooseExercise={onChooseExercise}
            onViewSession={(id) => {void openWorkout(id);}}
          />
        ) : (
          <ConsistencyScreen
            consistency={consistency}
            onViewStrength={() => switchTab('strength')}
            onViewHistory={() => navigate('history')}
            onEditGoal={onEditGoal}
            onChangeMonth={onChangeMonth}
            onViewDay={viewDay}
          />
        )}
      </View>
      {loading && <ActivityIndicator accessibilityLabel="Loading workout" color={colors.green} style={styles.loading} />}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  loading: {padding: 12},
  error: {color: colors.danger, fontSize: 13, lineHeight: 19, padding: 16},
});
