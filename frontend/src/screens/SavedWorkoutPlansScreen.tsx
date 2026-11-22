import React, {useRef, useState} from 'react';
import {ActivityIndicator, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import Brand from '../assets/train/brand.svg';
import Play from '../assets/train/play.svg';
import {Button} from '../components/WorkoutControls';
import {colors} from '../theme';

export interface SavedWorkoutPlanView {
  id: string;
  name: string;
  summaryLabel: string;
  exercisePreview: Array<{
    id: string;
    orderLabel: string;
    name: string;
    targetLabel: string;
  }>;
  remainingExercisesLabel?: string;
}

interface Props {
  plan: SavedWorkoutPlanView | null;
  initials: string;
  onStartWorkout: (planId: string) => Promise<void>;
  onEditPlan: (planId: string) => void;
  onCreateWorkout?: () => void;
  editLabel?: string;
  loading?: boolean;
  loadError?: string;
  onRetry?: () => void;
  disabled?: boolean;
  unfinishedWorkout?: {exerciseLabel: string; completedSets: number; pendingSave: boolean};
  onResumeWorkout?: () => void;
}

/** Shows the saved plan before editing it or starting a workout. */
export function SavedWorkoutPlansScreen({plan, initials, onStartWorkout, onEditPlan, onCreateWorkout, editLabel = 'Edit plan', loading, loadError, onRetry, disabled, unfinishedWorkout, onResumeWorkout}: Props) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startingRef = useRef(false);
  const locked = starting || !!disabled;

  async function start() {
    if (startingRef.current || disabled || unfinishedWorkout || !plan) return;
    startingRef.current = true;
    setStarting(true);
    setError(null);
    try {
      await onStartWorkout(plan.id);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The workout could not be started.');
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View style={styles.identity}>
          <View style={styles.brandMark}><Brand accessible={false} /></View>
          <Text style={styles.brand}>SpotMe</Text>
        </View>
        <View style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>
      </View>
      <Text accessibilityRole="header" style={styles.title}>Your workouts</Text>
      {unfinishedWorkout && (
        <View style={styles.resumeSection}>
          <View style={styles.resumeCard}>
            <Text style={styles.resumeBadge}>{unfinishedWorkout.pendingSave ? 'SAVE AWAITING CONFIRMATION' : 'UNFINISHED WORKOUT'}</Text>
            <Text style={styles.resumeTitle}>Your current workout</Text>
            <Text style={styles.resumeBody}>{unfinishedWorkout.exerciseLabel}</Text>
            <Text style={styles.resumeBody}>{unfinishedWorkout.completedSets} sets logged</Text>
          </View>
          <Button label={unfinishedWorkout.pendingSave ? 'Confirm pending save' : 'Resume workout'} disabled={locked} onPress={() => onResumeWorkout?.()} />
        </View>
      )}
      {loading && <View style={styles.empty}><ActivityIndicator color={colors.green} /><Text style={styles.body}>Loading saved workouts…</Text></View>}
      {!!loadError && (
        <View style={styles.empty}>
          <Text accessibilityRole="alert" style={styles.error}>{loadError}</Text>
          {onRetry && <Button label="Retry loading workouts" variant="secondary" onPress={onRetry} />}
        </View>
      )}
      {!loading && !loadError && !plan && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Your next workout starts here.</Text>
          <Text style={styles.body}>Create a workout and save it to history. You can use it again from here.</Text>
        </View>
      )}
      {!loading && !loadError && plan && <>
      {unfinishedWorkout && <Text style={styles.sectionTitle}>Saved workout</Text>}
      <View style={styles.plan}>
        <ImageBackground source={require('../assets/train-cover.png')} resizeMode="cover" style={styles.cover}>
          <View style={[StyleSheet.absoluteFill, styles.scrim]} />
          <Text style={styles.badge}>SAVED WORKOUT</Text>
          <View style={styles.planHeading}>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.summary}>{plan.summaryLabel}</Text>
          </View>
        </ImageBackground>
        <View style={styles.planContent}>
          <View style={styles.exercises}>
            {plan.exercisePreview.map((exercise) => (
              <View key={exercise.id} style={styles.exercise}>
                <Text style={styles.order}>{exercise.orderLabel}</Text>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.target}>{exercise.targetLabel}</Text>
              </View>
            ))}
            {!!plan.remainingExercisesLabel && <Text style={styles.remaining}>{plan.remainingExercisesLabel}</Text>}
          </View>
          <Pressable accessibilityRole="button" accessibilityState={{disabled: locked || !!unfinishedWorkout, busy: starting}} disabled={locked || !!unfinishedWorkout} onPress={() => {void start();}} style={({pressed}) => [styles.start, (pressed || locked || !!unfinishedWorkout) && styles.dimmed]}>
            <Text style={styles.startLabel}>{starting ? 'Starting workout…' : 'Start workout'}</Text>
            {starting ? <ActivityIndicator color={colors.surface} /> : <Play accessible={false} />}
          </Pressable>
        </View>
      </View>
      <Button label={editLabel} variant="secondary" disabled={locked} onPress={() => onEditPlan(plan.id)} />
      {unfinishedWorkout && <Text style={styles.body}>Resume your current workout before starting another.</Text>}
      </>}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {onCreateWorkout && (
        <Pressable accessibilityRole="button" accessibilityState={{disabled: locked || !!unfinishedWorkout}} disabled={locked || !!unfinishedWorkout} onPress={onCreateWorkout} style={[styles.create, (locked || !!unfinishedWorkout) && styles.dimmed]}>
          <Text style={styles.createLabel}>+ Create workout</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  content: {paddingHorizontal: 22, paddingTop: 10, paddingBottom: 26, gap: 22},
  header: {minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  identity: {flexDirection: 'row', alignItems: 'center', gap: 10},
  brandMark: {width: 32, height: 32, backgroundColor: colors.green, borderRadius: 11, alignItems: 'center', justifyContent: 'center'},
  brand: {color: colors.ink, fontSize: 23, fontWeight: '700'},
  avatar: {width: 36, height: 36, backgroundColor: colors.pale, borderRadius: 18, alignItems: 'center', justifyContent: 'center'},
  initials: {color: colors.green, fontSize: 12},
  title: {color: colors.ink, fontSize: 32, lineHeight: 36, fontWeight: '700', letterSpacing: -1.2},
  plan: {backgroundColor: colors.hero, borderRadius: 22, overflow: 'hidden'},
  cover: {height: 172, padding: 18, justifyContent: 'space-between'},
  scrim: {backgroundImage: 'linear-gradient(to right, rgba(20,38,31,0.95), rgba(20,38,31,0.13))'},
  badge: {alignSelf: 'flex-start', backgroundColor: '#304438', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 6, color: colors.lime, fontSize: 11, fontWeight: '700'},
  planHeading: {gap: 7},
  planName: {color: colors.surface, fontSize: 29, fontWeight: '700'},
  summary: {color: '#F7F9EF', fontSize: 12},
  planContent: {padding: 18, gap: 15},
  exercises: {gap: 12},
  exercise: {flexDirection: 'row', alignItems: 'center', gap: 12},
  order: {color: colors.lime, fontSize: 11, fontWeight: '600'},
  exerciseName: {flex: 1, color: '#F7F9EF', fontSize: 14},
  target: {color: '#B7C6B9', fontSize: 12},
  remaining: {color: '#B7C6B9', fontSize: 11},
  start: {minHeight: 54, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 16, backgroundColor: colors.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10},
  startLabel: {color: colors.surface, fontSize: 15, fontWeight: '700'},
  dimmed: {opacity: 0.75},
  create: {minHeight: 44, alignItems: 'center', justifyContent: 'center'},
  createLabel: {color: colors.ink, fontSize: 14, fontWeight: '700'},
  error: {color: colors.danger, fontSize: 13, lineHeight: 19},
  empty: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 22, gap: 16},
  emptyTitle: {color: colors.ink, fontSize: 22, fontWeight: '700'},
  body: {color: colors.muted, fontSize: 13, lineHeight: 20},
  sectionTitle: {color: colors.ink, fontSize: 18, fontWeight: '700'},
  resumeSection: {gap: 12},
  resumeCard: {backgroundColor: colors.hero, borderRadius: 22, padding: 20, gap: 16},
  resumeBadge: {color: colors.lime, fontSize: 10, fontWeight: '700', letterSpacing: 1.3},
  resumeTitle: {color: colors.surface, fontSize: 27, fontWeight: '700', letterSpacing: -0.8},
  resumeBody: {color: '#B7C6B9', fontSize: 13, lineHeight: 20},
});
