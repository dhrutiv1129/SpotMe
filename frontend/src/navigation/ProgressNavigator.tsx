import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {CalendarDaySheet} from '../components/CalendarDaySheet';
import {StrengthExerciseSelector} from '../components/StrengthExerciseSelector';
import type {StrengthExerciseOption} from '../components/StrengthExerciseSelector';
import {ConsistencyScreen} from '../screens/ConsistencyScreen';
import type {ConsistencyView} from '../screens/ConsistencyScreen';
import {ProgressScreen} from '../screens/ProgressScreen';
import type {StrengthProgressView} from '../screens/ProgressScreen';
import {WorkoutDetailScreen} from '../screens/WorkoutDetailScreen';
import type {WorkoutDetailView} from '../screens/WorkoutDetailScreen';
import {WorkoutHistoryScreen} from '../screens/WorkoutHistoryScreen';
import type {WorkoutHistoryView} from '../screens/WorkoutHistoryScreen';
import {WeeklyGoalScreen} from '../screens/WeeklyGoalScreen';
import type {WeeklyGoalView} from '../screens/WeeklyGoalScreen';
import {colors} from '../theme';

interface Props {
  strength: StrengthProgressView;
  consistency: ConsistencyView;
  history: WorkoutHistoryView;
  loadWorkout: (sessionId: string) => Promise<WorkoutDetailView>;
  searchExercises: (query: string, signal: AbortSignal) => Promise<readonly StrengthExerciseOption[]>;
  loadStrength: (exerciseId: string) => Promise<StrengthProgressView>;
  onEditGoal: () => void;
  goalEditor?: {
    goal: WeeklyGoalView;
    onSave: (workoutsPerWeek: number) => Promise<void>;
  };
  onChangeMonth: (monthId: string) => void;
  onViewDay: (date: string, sessionIds: readonly string[]) => void;
  onLoadMoreHistory?: () => void;
}

/** Handles navigation between the Progress screens. */
export function ProgressNavigator({
  strength, consistency, history, loadWorkout,
  searchExercises, loadStrength, onEditGoal, goalEditor, onChangeMonth, onViewDay, onLoadMoreHistory,
}: Props) {
  const [tab, setTab] = useState<'strength' | 'consistency'>('strength');
  const [selectedStrength, setSelectedStrength] = useState(strength);
  const [choosingExercise, setChoosingExercise] = useState(false);
  const [view, setView] = useState<'summary' | 'history' | 'goal'>('summary');
  const [workout, setWorkout] = useState<WorkoutDetailView | null>(null);
  const [dayWorkout, setDayWorkout] = useState<WorkoutDetailView | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [workoutOrigin, setWorkoutOrigin] = useState<'summary' | 'history'>('history');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  useEffect(() => () => {requestVersion.current += 1;}, []);
  useEffect(() => {setSelectedStrength(strength);}, [strength]);

  function navigate(nextView: 'summary' | 'history' | 'goal') {
    requestVersion.current += 1;
    setLoading(false);
    setError(null);
    setWorkout(null);
    setDayWorkout(null);
    setSelectedDate(null);
    setChoosingExercise(false);
    setView(nextView);
  }

  async function openWorkout(sessionId: string, showDay = false) {
    const version = ++requestVersion.current;
    setLoading(true);
    setError(null);
    try {
      const response = await loadWorkout(sessionId);
      if (version !== requestVersion.current) return;
      if (response.sessionId !== sessionId || response.status !== 'saved') {
        throw new Error('The saved workout could not be opened.');
      }
      setWorkoutOrigin(view === 'history' ? 'history' : 'summary');
      if (showDay) setDayWorkout(response);
      else setWorkout(response);
    } catch (failure) {
      if (version === requestVersion.current) {
        setSelectedDate(null);
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

  async function selectExercise(exerciseId: string) {
    const version = ++requestVersion.current;
    const response = await loadStrength(exerciseId);
    if (version !== requestVersion.current) return;
    if (response.exerciseId !== exerciseId) {
      throw new Error('Strength results for this exercise could not be loaded.');
    }
    setSelectedStrength(response);
  }

  function viewDay(date: string, sessionIds: readonly string[]) {
    if (sessionIds.length === 1) {
      setSelectedDate(date);
      void openWorkout(sessionIds[0], true);
    } else {
      onViewDay(date, sessionIds);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.screen}>
        {view === 'goal' && goalEditor ? (
          <WeeklyGoalScreen
            goal={goalEditor.goal}
            onSave={goalEditor.onSave}
            onClose={() => switchTab('consistency')}
          />
        ) : workout ? (
          <WorkoutDetailScreen
            workout={workout}
            onBackToHistory={() => navigate(workoutOrigin)}
            onViewHistory={() => navigate('history')}
            backLabel={workoutOrigin === 'history' ? 'All workout history' : tab === 'consistency' ? 'Consistency' : 'Strength progress'}
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
            progress={selectedStrength}
            onViewHistory={() => navigate('history')}
            onViewConsistency={() => switchTab('consistency')}
            onChooseExercise={() => setChoosingExercise(true)}
            onViewSession={(id) => {void openWorkout(id);}}
          />
        ) : (
          <ConsistencyScreen
            consistency={consistency}
            selectedDate={selectedDate}
            onViewStrength={() => switchTab('strength')}
            onViewHistory={() => navigate('history')}
            onEditGoal={() => {
              if (goalEditor) navigate('goal');
              else onEditGoal();
            }}
            onChangeMonth={(monthId) => {
              setSelectedDate(null);
              onChangeMonth(monthId);
            }}
            onViewDay={viewDay}
          />
        )}
      </View>
      {choosingExercise && (
        <StrengthExerciseSelector
          selectedExerciseId={selectedStrength.exerciseId}
          searchExercises={searchExercises}
          onSelect={selectExercise}
          onClose={() => setChoosingExercise(false)}
        />
      )}
      {dayWorkout && (
        <CalendarDaySheet
          workout={dayWorkout}
          onClose={() => {
            setDayWorkout(null);
            setSelectedDate(null);
          }}
          onViewWorkout={() => {
            setWorkout(dayWorkout);
            setDayWorkout(null);
          }}
        />
      )}
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
