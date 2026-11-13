import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../theme';
import {NumberField} from './WorkoutControls';

interface BaseProps {
  number: number;
  disabled?: boolean;
}

interface LoggedProps extends BaseProps {
  completed: true;
  weight: number;
  reps: number;
  onEdit: () => void;
}

interface DraftProps extends BaseProps {
  completed: false;
  weight: string;
  reps: string;
  weightError?: string;
  repsError?: string;
  onWeightChange: (value: string) => void;
  onRepsChange: (value: string) => void;
}

/** Controlled row: drafts become logged sets only after an API response. */
export function SetRow(props: LoggedProps | DraftProps) {
  if (props.completed) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit set ${props.number}, ${props.weight} pounds, ${props.reps} reps`}
        disabled={props.disabled}
        onPress={props.onEdit}
        style={styles.loggedRow}
      >
        <Text style={styles.number}>{props.number}</Text>
        <Text style={styles.value}>{props.weight}</Text>
        <Text style={styles.value}>{props.reps}</Text>
        <View style={styles.check}>
          <Text style={styles.checkText}>✓</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.draftRow}>
      <Text style={styles.number}>{props.number}</Text>
      <NumberField
        label="Weight (lb)"
        value={props.weight}
        onChange={props.onWeightChange}
        error={props.weightError}
        disabled={props.disabled}
      />
      <NumberField
        label="Reps"
        value={props.reps}
        onChange={props.onRepsChange}
        error={props.repsError}
        disabled={props.disabled}
        integer
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loggedRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.pale,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  number: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
    width: 32,
    textAlign: 'center',
  },
  value: {flex: 1, textAlign: 'center', fontSize: 18, color: colors.ink},
  check: {
    width: 36,
    height: 36,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  checkText: {fontSize: 22, color: colors.surface},
  draftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
  },
});
