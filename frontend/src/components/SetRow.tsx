import React from 'react';
import {Image, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {colors} from '../theme';

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
  onLog?: () => void;
  canLog?: boolean;
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
          <Image source={require('../assets/workout/check.png')} style={styles.smallIcon} />
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.fieldGroup}>
    <View style={styles.draftRow}>
      <Text style={styles.number}>{props.number}</Text>
      <TextInput
        accessibilityLabel={`Set ${props.number} weight in lb`}
        value={props.weight}
        onChangeText={props.onWeightChange}
        accessibilityHint={props.weightError}
        editable={!props.disabled}
        keyboardType="decimal-pad"
        selectTextOnFocus
        style={[styles.input, !!props.weightError && styles.invalid]}
      />
      <TextInput
        accessibilityLabel={`Set ${props.number} reps`}
        value={props.reps}
        onChangeText={props.onRepsChange}
        accessibilityHint={props.repsError}
        editable={!props.disabled}
        keyboardType="number-pad"
        selectTextOnFocus
        style={[styles.input, !!props.repsError && styles.invalid]}
      />
      <Pressable accessibilityRole="button" accessibilityLabel={`Log set ${props.number}`} accessibilityState={{disabled: props.disabled || !props.canLog}} disabled={props.disabled || !props.canLog} onPress={props.onLog} style={styles.add}>
        <Image source={require('../assets/workout/plus.png')} style={styles.smallIcon} />
      </Pressable>
    </View>
    {!!props.weightError && <Text accessibilityRole="alert" style={styles.error}>{props.weightError}</Text>}
    {!!props.repsError && <Text accessibilityRole="alert" style={styles.error}>{props.repsError}</Text>}
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
    paddingHorizontal: 8,
    gap: 10,
  },
  number: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
    width: 30,
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
  smallIcon: {width: 18, height: 18},
  fieldGroup: {gap: 6},
  input: {flex: 1, minWidth: 0, height: 44, backgroundColor: colors.background, color: colors.ink, borderRadius: 8, borderWidth: 1, borderColor: colors.border, textAlign: 'center', fontSize: 18, paddingHorizontal: 4},
  invalid: {borderColor: colors.danger},
  error: {fontSize: 12, color: colors.danger},
  add: {width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.soft},
  draftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
  },
});
