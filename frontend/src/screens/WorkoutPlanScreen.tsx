import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Button} from '../components/WorkoutControls';
import {useTheme, useThemedStyles} from '../theme';
import type {ThemeColors} from '../theme';
import Back from '../assets/workout/back.svg';

interface PlanSet {
  id: string;
  number: number;
  targetReps: number;
  weight: number | null;
  reps: number | null;
  status: 'logged' | 'draft' | 'pending';
}

interface PlanExercise {
  id: string;
  name: string;
  substitutionLabel?: string;
  targetLabel: string;
  previousLoadLabel?: string;
  completedSets: number;
  targetSets: number;
  sets: PlanSet[];
}

export interface WorkoutPlanView {
  sessionId: string;
  dateLabel: string;
  name: string;
  description: string;
  status: 'active' | 'paused';
  completedSets: number;
  totalSets: number;
  progressNote: string;
  unit: 'kg' | 'lb';
  activeExerciseId: string;
  exercises: PlanExercise[];
}

interface Props {
  plan: WorkoutPlanView | null;
  loading?: boolean;
  error?: string;
  onRetry: () => void;
  onReturnToWorkout: () => void;
  onSelectExercise?: (id: string) => void;
}

const statusLabels = {
  logged: '✓ Logged',
  draft: 'Draft',
  pending: 'Pending',
};

/** Shows plan and logged sets */
export function WorkoutPlanScreen({
  plan, loading, error, onRetry, onReturnToWorkout, onSelectExercise,
}: Props) {
  const {colors} = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable
        accessibilityRole="button"
        onPress={onReturnToWorkout}
        style={styles.backButton}
      >
        <Back accessible={false} color={colors.ink} />
        <Text style={styles.backLabel}>Back to active workout</Text>
      </Pressable>

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.green} />
          <Text style={styles.body}>Loading your workout plan…</Text>
        </View>
      ) : error ? (
        <View style={styles.state}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Your plan couldn’t load.
          </Text>
          <Text accessibilityRole="alert" style={styles.body}>{error}</Text>
          <Button label="Retry loading plan" onPress={onRetry} />
        </View>
      ) : !plan ? (
        <View style={styles.state}>
          <Text style={styles.sectionTitle}>No active workout plan</Text>
          <Text style={styles.body}>Return to Train to choose your workout.</Text>
        </View>
      ) : (
        <>
          <View style={styles.heading}>
            <Text style={styles.date}>{plan.dateLabel}</Text>
            <Text accessibilityRole="header" style={styles.title}>Workout overview</Text>
            <Text style={styles.body}>{plan.name} · {plan.description}</Text>
          </View>

          <View style={styles.hero}>
            <View style={styles.between}>
              <Text style={styles.eyebrow}>
                {plan.status === 'paused' ? 'PAUSED' : 'IN PROGRESS'}
              </Text>
              <Text style={styles.heroCount}>
                {plan.completedSets} / {plan.totalSets} sets logged
              </Text>
            </View>
            <View
              style={styles.segments}
              accessibilityLabel={`${plan.completedSets} of ${plan.totalSets} sets logged`}
            >
              {Array.from({length: Math.min(plan.totalSets, 100)}, (_, index) => (
                <View
                  key={index}
                  style={[styles.segment, index < plan.completedSets && styles.loggedSegment]}
                />
              ))}
            </View>
            <Text style={styles.heroNote}>{plan.progressNote}</Text>
          </View>

          {plan.exercises.map((exercise) => (
            <View
              key={exercise.id}
              style={[styles.exercise, exercise.id === plan.activeExerciseId && styles.activeExercise]}
            >
              <Pressable accessibilityRole="button" accessibilityLabel={`Go to ${exercise.name}`} disabled={!onSelectExercise} onPress={() => onSelectExercise?.(exercise.id)} style={styles.between}>
                <Text accessibilityRole="header" style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.count}>{exercise.completedSets}/{exercise.targetSets}</Text>
              </Pressable>
              {!!exercise.substitutionLabel && (
                <Text style={styles.badge}>{exercise.substitutionLabel}</Text>
              )}
              <View>
                <Text style={styles.body}>{exercise.targetLabel}</Text>
                {!!exercise.previousLoadLabel && (
                  <Text style={styles.body}>{exercise.previousLoadLabel}</Text>
                )}
              </View>
              <View style={styles.tableHeader}>
                <Text style={[styles.columnLabel, styles.number]}>SET</Text>
                <Text style={[styles.columnLabel, styles.target]}>TARGET</Text>
                <Text style={[styles.columnLabel, styles.load]}>{plan.unit.toUpperCase()} × REPS</Text>
                <Text style={[styles.columnLabel, styles.status]}>STATUS</Text>
              </View>
              {exercise.sets.map((set) => (
                <View key={set.id} style={[styles.set, set.status === 'logged' && styles.loggedSet]}>
                  <Text style={[styles.value, styles.number]}>{set.number}</Text>
                  <Text style={[styles.body, styles.target]}>{set.targetReps ? `${set.targetReps} reps` : '—'}</Text>
                  <Text style={[styles.value, styles.load]}>
                    {set.status !== 'pending' && set.weight !== null && set.reps !== null
                      ? `${set.weight} × ${set.reps}` : '—'}
                  </Text>
                  <Text style={[styles.setStatus, styles.status, set.status === 'logged' && styles.loggedText]}>
                    {statusLabels[set.status]}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          <Text style={styles.body}>Tap an exercise name to return to its set log. Draft input is not completed work.</Text>
          <Button label="←  Return to active workout" onPress={onReturnToWorkout} />
        </>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  content: {width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 12, paddingBottom: 28, gap: 22},
  backButton: {minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 14},
  backArrow: {color: colors.ink, fontSize: 28},
  backLabel: {color: colors.ink, fontSize: 15, fontWeight: '700'},
  heading: {gap: 12},
  date: {color: colors.green, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2},
  title: {color: colors.ink, fontSize: 32, fontWeight: '700', letterSpacing: -0.7},
  body: {color: colors.muted, fontSize: 12, lineHeight: 19},
  state: {paddingVertical: 40, gap: 18},
  sectionTitle: {color: colors.ink, fontSize: 22, fontWeight: '700'},
  hero: {backgroundColor: colors.hero, borderRadius: 22, padding: 20, gap: 14},
  between: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12},
  eyebrow: {color: colors.lime, fontSize: 10, fontWeight: '700'},
  heroCount: {color: colors.onHero, fontSize: 13},
  heroNote: {color: '#B6C4B4', fontSize: 12, lineHeight: 19},
  segments: {flexDirection: 'row', gap: 4},
  segment: {flex: 1, height: 4, borderRadius: 4, backgroundColor: '#354B3C'},
  loggedSegment: {backgroundColor: colors.lime},
  exercise: {backgroundColor: colors.surface, borderRadius: 22, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.surface},
  activeExercise: {borderColor: colors.green},
  exerciseName: {color: colors.ink, fontSize: 18, fontWeight: '700', flex: 1},
  count: {color: colors.green, fontSize: 13, fontWeight: '700'},
  badge: {alignSelf: 'flex-start', backgroundColor: colors.pale, color: colors.green, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, fontSize: 11, fontWeight: '700'},
  tableHeader: {flexDirection: 'row', gap: 8},
  columnLabel: {color: colors.muted, fontSize: 10},
  number: {width: 20},
  target: {flex: 0.8},
  load: {flex: 1},
  status: {flex: 1.4},
  set: {flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.background, paddingHorizontal: 8, paddingVertical: 12, borderRadius: 8},
  loggedSet: {backgroundColor: colors.pale},
  value: {color: colors.ink, fontSize: 12},
  setStatus: {color: colors.muted, fontSize: 11},
  loggedText: {color: colors.green, fontWeight: '700'},
});
