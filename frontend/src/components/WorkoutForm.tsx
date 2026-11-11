import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '../theme';
import {ExerciseRow} from './ExerciseRow';
import type {ExerciseView, LoggedSet} from './ExerciseRow';
import {Button} from './WorkoutControls';

export interface SetInput {
  weight: number;
  reps: number;
}

interface Props {
  exercise: ExerciseView;
  weight: string;
  reps: string;
  disabled?: boolean;
  busy?: boolean;
  error?: string;
  onWeightChange: (value: string) => void;
  onRepsChange: (value: string) => void;
  onEditSet: (set: LoggedSet) => void;
  onSwap: (exerciseId: string) => void;
  onGuide: (exerciseId: string) => void;
  onSubmit: (input: SetInput) => void;
}

export function validateSetInput(weight: string, reps: string) {
  return {
    weight:
      weight.trim() === '' ||
      !Number.isFinite(Number(weight)) ||
      Number(weight) < 0
        ? 'Weight must be non-negative.'
        : undefined,
    reps:
      reps.trim() === '' ||
      !Number.isSafeInteger(Number(reps)) ||
      Number(reps) <= 0
        ? 'Reps must be a positive whole number.'
        : undefined,
  };
}

/** Checks input locally; the caller submits it and supplies confirmed results. */
export function WorkoutForm({
  exercise, weight, reps, disabled, busy, error,
  onWeightChange, onRepsChange, onEditSet, onSwap, onGuide, onSubmit,
}: Props) {
  const [touched, setTouched] = useState(false);
  const errors = validateSetInput(weight, reps);
  const invalid = !!errors.weight || !!errors.reps;

  return (
    <View style={styles.container}>
      <ExerciseRow
        exercise={exercise}
        weight={weight}
        reps={reps}
        onWeightChange={(value) => {
          setTouched(true);
          onWeightChange(value);
        }}
        onRepsChange={(value) => {
          setTouched(true);
          onRepsChange(value);
        }}
        weightError={touched ? errors.weight : undefined}
        repsError={touched ? errors.reps : undefined}
        disabled={disabled || busy}
        onEditSet={onEditSet}
        onSwap={onSwap}
        onGuide={onGuide}
      />
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {exercise.nextSetNumber !== null && (
        <Button
          label={`Log set ${exercise.nextSetNumber}  ✓`}
          busy={busy}
          disabled={disabled || invalid}
          onPress={() => {
            setTouched(true);
            if (disabled || busy || invalid) return;
            onSubmit({weight: Number(weight), reps: Number(reps)});
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {gap: 16},
  error: {
    color: colors.errorText,
    fontSize: 13,
    lineHeight: 19,
    backgroundColor: colors.dangerSoft,
    borderRadius: 12,
    padding: 12,
  },
});
