import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useThemedStyles} from '../theme';
import type {ThemeColors} from '../theme';
import {SetRow} from './SetRow';

export interface LoggedSet {
  id: string;
  number: number;
  weight: number;
  reps: number;
}

export interface ExerciseView {
  id: string;
  name: string;
  position: number;
  totalExercises: number;
  substitutionLabel?: string;
  targetLabel: string;
  loadLabel: string;
  previousSessionLabel: string;
  sets: LoggedSet[];
  nextSetNumber: number | null;
  targetSets?: number;
  targetReps?: number;
  draft: {weight: string; reps: string};
}

interface Props {
  exercise: ExerciseView;
  weight: string;
  reps: string;
  weightError?: string;
  repsError?: string;
  disabled?: boolean;
  onWeightChange: (value: string) => void;
  onRepsChange: (value: string) => void;
  onEditSet: (set: LoggedSet) => void;
  onSwap: (exerciseId: string) => void;
  onGuide: (exerciseId: string) => void;
  onLog?: () => void;
  canLog?: boolean;
}

/** Displays one exercise and its sets without calculating workout results. */
export function ExerciseRow({
  exercise, weight, reps, weightError, repsError, disabled,
  onWeightChange, onRepsChange, onEditSet, onSwap, onGuide, onLog, canLog,
}: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <View style={styles.between}>
        <Text style={styles.caption}>
          EXERCISE {exercise.position} OF {exercise.totalExercises}
        </Text>
        <Pressable
          accessibilityRole="button"
          style={styles.linkTarget}
          disabled={disabled}
          onPress={() => onSwap(exercise.id)}
        >
          <Text style={styles.link}>Find alternatives ⇄</Text>
        </Pressable>
      </View>
      <Text accessibilityRole="header" style={styles.title}>{exercise.name}</Text>
      <View style={styles.inline}>
        {!!exercise.substitutionLabel && (
          <Text style={styles.badge}>{exercise.substitutionLabel}</Text>
        )}
        <Pressable
          accessibilityRole="button"
          style={styles.linkTarget}
          onPress={() => onGuide(exercise.id)}
          disabled={disabled}
        >
          <Text style={styles.linkRegular}>How to →</Text>
        </Pressable>
      </View>
      <Text style={styles.body}>
        {exercise.targetLabel}{'\n'}
        {exercise.loadLabel} · Unchecked sets aren’t logged.
      </Text>
      <View style={styles.setCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.columnLabel, styles.numberColumn]}>SET</Text>
          <Text style={styles.columnLabel}>LB</Text>
          <Text style={styles.columnLabel}>REPS</Text>
          <Text style={[styles.columnLabel, styles.doneColumn]}>DONE</Text>
        </View>
        {exercise.sets.map((set) => (
          <SetRow
            key={set.id}
            completed
            number={set.number}
            weight={set.weight}
            reps={set.reps}
            disabled={disabled}
            onEdit={() => onEditSet(set)}
          />
        ))}
        {exercise.nextSetNumber !== null && (
          <SetRow
            completed={false}
            number={exercise.nextSetNumber}
            weight={weight}
            reps={reps}
            onWeightChange={onWeightChange}
            onRepsChange={onRepsChange}
            weightError={weightError}
            repsError={repsError}
            disabled={disabled}
            onLog={onLog}
            canLog={canLog}
          />
        )}
        {Array.from({length: Math.min(100, Math.max(0, (exercise.targetSets || 0) - exercise.sets.length - (exercise.nextSetNumber === null ? 0 : 1)))}, (_, index) => (
          <View key={`pending-${index}`} style={styles.pendingRow} accessibilityLabel={`Set ${exercise.sets.length + index + 2}, pending`}>
            <Text style={styles.pendingNumber}>{exercise.sets.length + index + 2}</Text>
            <View style={styles.pendingValue} />
            <Text style={styles.pendingValue}>{exercise.targetReps || '—'}</Text>
            <Text style={styles.pendingStatus}>—</Text>
          </View>
        ))}
        <Text style={styles.previous}>{exercise.previousSessionLabel}</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {gap: 16},
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  caption: {color: colors.muted, fontSize: 12, lineHeight: 18},
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.7,
  },
  linkTarget: {minHeight: 44, justifyContent: 'center'},
  link: {fontSize: 13, fontWeight: '700', color: colors.green},
  linkRegular: {fontSize: 13, color: colors.green},
  inline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: -12,
    marginBottom: -8,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.green,
    backgroundColor: colors.pale,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  body: {color: colors.muted, fontSize: 14, lineHeight: 21},
  setCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 12,
    gap: 8,
  },
  tableHeader: {flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 8, gap: 10},
  numberColumn: {flex: 0, width: 30},
  doneColumn: {flex: 0, width: 36},
  pendingRow: {flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 8},
  pendingNumber: {width: 30, textAlign: 'center', fontSize: 14, color: colors.ink, fontWeight: '700'},
  pendingValue: {flex: 1, height: 44, borderRadius: 8, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, textAlign: 'center', lineHeight: 42, color: colors.muted, fontSize: 18},
  pendingStatus: {width: 36, textAlign: 'center', color: colors.muted},
  columnLabel: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    textAlign: 'center',
  },
  previous: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
    marginTop: 2,
  },
});
