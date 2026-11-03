import React from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Button} from '../components/WorkoutControls';
import type {LoggedSet} from '../components/ExerciseRow';
import {colors} from '../theme';

export interface WorkoutDetailView {
  sessionId: string;
  status: 'saved';
  dateLabel: string;
  name: string;
  durationLabel: string;
  volumeLabel: string;
  summaryLabel: string;
  completedSetsLabel: string;
  unit: 'kg' | 'lb';
  comparison: {
    title: string;
    volumeLabel: string;
    volumeDescription: string;
    estimatedMaxLabel: string;
    estimatedMaxDescription: string;
    bestSetMessage: string;
  };
  exercises: Array<{
    id: string;
    name: string;
    volumeLabel: string;
    substitutionLabel?: string;
    planLabel: string;
    loadLabel: string;
    completedSets: LoggedSet[];
  }>;
}

interface Props {
  workout: WorkoutDetailView;
  onBackToHistory: () => void;
}

/** Shows the saved workout and its original plan. */
export function WorkoutDetailScreen({workout, onBackToHistory}: Props) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" onPress={onBackToHistory} style={styles.back}>
        <Image source={require('../assets/back.png')} style={styles.backIcon} />
        <Text style={styles.backLabel}>All workout history</Text>
      </Pressable>
      <View style={styles.heading}>
        <Text style={styles.date}>{workout.dateLabel}</Text>
        <Text accessibilityRole="header" style={styles.title}>{workout.name}</Text>
        <Text style={styles.subtitle}>Your completed workout · Saved to history</Text>
      </View>
      <View style={styles.hero}>
        <Text style={styles.savedLabel}>✓ SAVED · COMPLETED</Text>
        <View style={styles.metrics}>
          <View style={styles.metric}><Text style={styles.heroValue}>{workout.durationLabel}</Text><Text style={styles.heroCaption}>duration</Text></View>
          <View style={styles.metric}><Text style={styles.heroValue}>{workout.volumeLabel}</Text><Text style={styles.heroCaption}>total training volume</Text></View>
        </View>
        <Text style={styles.heroCaption}>{workout.summaryLabel}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your previous session, compared</Text>
        <View style={styles.comparison}>
          <Text style={styles.comparisonTitle}>{workout.comparison.title}</Text>
          <View style={styles.metrics}>
            <View style={styles.metric}><Text style={styles.value}>{workout.comparison.volumeLabel}</Text><Text style={styles.caption}>{workout.comparison.volumeDescription}</Text></View>
            <View style={styles.metric}><Text style={styles.value}>{workout.comparison.estimatedMaxLabel}</Text><Text style={styles.caption}>{workout.comparison.estimatedMaxDescription}</Text></View>
          </View>
          <Text style={styles.bestSet}>{workout.comparison.bestSetMessage}</Text>
        </View>
      </View>
      <View style={styles.log}>
        <Text style={styles.sectionTitle}>What you actually did</Text>
        <Text style={styles.body}>
          {workout.completedSetsLabel} The original plan is kept alongside your actual log.
        </Text>
        {workout.exercises.map((exercise) => (
          <View key={exercise.id} style={styles.exercise}>
            <View style={styles.exerciseHeading}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.exerciseVolume}>{exercise.volumeLabel}</Text>
            </View>
            {!!exercise.substitutionLabel && <Text style={styles.badge}>{exercise.substitutionLabel}</Text>}
            <View><Text style={styles.caption}>{exercise.planLabel}</Text><Text style={styles.caption}>{exercise.loadLabel}</Text></View>
            <View style={styles.row}>
              <Text style={[styles.columnLabel, styles.number]}>SET</Text>
              <Text style={[styles.columnLabel, styles.weight]}>{workout.unit.toUpperCase()}</Text>
              <Text style={[styles.columnLabel, styles.reps]}>REPS</Text>
              <Text style={[styles.columnLabel, styles.actual]}>ACTUAL</Text>
            </View>
            {exercise.completedSets.map((set) => (
              <View key={set.id} style={[styles.row, styles.loggedSet]}>
                <Text style={[styles.setNumber, styles.number]}>{set.number}</Text>
                <Text style={[styles.setValue, styles.weight]}>{set.weight}</Text>
                <Text style={[styles.setValue, styles.reps]}>{set.reps}</Text>
                <Text style={[styles.completed, styles.actual]}>✓ Completed</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
      <View style={styles.guidance}>
        <Image source={require('../assets/info.png')} style={styles.infoIcon} />
        <View style={styles.guidanceCopy}>
          <Text style={styles.guidanceTitle}>Your log, not a load recommendation</Text>
          <Text style={styles.body}>
            Volume is weight × reps across completed sets. Estimated 1RM uses
            Epley; it helps compare performance, not choose a weight to try.
          </Text>
        </View>
      </View>
      <Button label="Back to all history" variant="secondary" onPress={onBackToHistory} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  content: {paddingHorizontal: 22, paddingTop: 10, paddingBottom: 26, gap: 22},
  back: {minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12},
  backIcon: {width: 22, height: 22},
  backLabel: {color: colors.ink, fontSize: 15, fontWeight: '700'},
  heading: {gap: 8},
  date: {color: colors.green, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase'},
  title: {color: colors.ink, fontSize: 32, fontWeight: '700', lineHeight: 36, letterSpacing: -1.2},
  subtitle: {color: colors.muted, fontSize: 14, lineHeight: 21},
  hero: {backgroundColor: colors.hero, borderRadius: 22, padding: 18, gap: 12},
  savedLabel: {color: colors.lime, fontSize: 11, fontWeight: '700'},
  metrics: {flexDirection: 'row', gap: 18},
  metric: {flex: 1, gap: 5},
  heroValue: {color: colors.surface, fontSize: 28, fontWeight: '700', letterSpacing: -0.8},
  heroCaption: {color: '#C1CCBD', fontSize: 11, lineHeight: 16},
  section: {gap: 12},
  sectionTitle: {color: colors.ink, fontSize: 18, fontWeight: '700', letterSpacing: -0.4},
  comparison: {backgroundColor: colors.pale, borderRadius: 22, padding: 18, gap: 12},
  comparisonTitle: {color: colors.ink, fontSize: 13, fontWeight: '700'},
  value: {color: colors.ink, fontSize: 28, fontWeight: '700', letterSpacing: -0.8},
  caption: {color: colors.muted, fontSize: 11, lineHeight: 16},
  bestSet: {color: colors.green, fontSize: 12, lineHeight: 18},
  body: {color: colors.muted, fontSize: 12, lineHeight: 18},
  log: {gap: 14},
  exercise: {backgroundColor: colors.surface, borderRadius: 20, padding: 16, gap: 10},
  exerciseHeading: {flexDirection: 'row', alignItems: 'flex-start', gap: 10},
  exerciseName: {color: colors.ink, fontSize: 17, fontWeight: '700', flex: 1},
  exerciseVolume: {color: colors.green, fontSize: 12, fontWeight: '600'},
  badge: {alignSelf: 'flex-start', backgroundColor: colors.pale, color: colors.green, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, fontSize: 11, fontWeight: '700'},
  row: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6},
  columnLabel: {color: colors.muted, fontSize: 10},
  number: {width: 24},
  weight: {flex: 1},
  reps: {flex: 0.85},
  actual: {flex: 1.6},
  loggedSet: {minHeight: 32, backgroundColor: colors.pale, borderRadius: 8, paddingVertical: 6},
  setNumber: {color: colors.ink, fontSize: 12},
  setValue: {color: colors.ink, fontSize: 14},
  completed: {color: colors.green, fontSize: 11, fontWeight: '600'},
  guidance: {backgroundColor: colors.pale, borderRadius: 18, padding: 16, flexDirection: 'row', gap: 12},
  infoIcon: {width: 20, height: 20},
  guidanceCopy: {flex: 1, gap: 5},
  guidanceTitle: {color: colors.ink, fontSize: 14, fontWeight: '700'},
});
