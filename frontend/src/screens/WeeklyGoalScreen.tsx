import React, {useRef, useState} from 'react';
import {ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {colors} from '../theme';

export interface WeeklyGoalView {
  workoutsPerWeek: number;
  weeklyProgressLabel: string;
  weekRangeLabel: string;
  effectiveDateLabel: string;
  days: Array<{
    date: string;
    dateLabel: string;
    weekdayLabel: string;
    accessibilityLabel: string;
    state: 'completed' | 'rest' | 'future';
    showCheck: boolean;
  }>;
}

interface Props {
  goal: WeeklyGoalView;
  onSave: (workoutsPerWeek: number) => Promise<void>;
  onClose: () => void;
}

/** Edits the weekly goal without changing the current week's results. */
export function WeeklyGoalScreen({goal, onSave, onClose}: Props) {
  const [selected, setSelected] = useState(goal.workoutsPerWeek);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const valid = Number.isInteger(selected) && selected >= 1 && selected <= 7;
  const canSave = valid && selected !== goal.workoutsPerWeek && !saving;

  async function save() {
    if (!canSave || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await onSave(selected);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Your goal could not be saved.');
      savingRef.current = false;
      setSaving(false);
      return;
    }
    onClose();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Consistency" disabled={saving} onPress={onClose} style={styles.back}>
          <Image source={require('../assets/back.png')} style={styles.backIcon} />
          <Text style={styles.headerLabel}>Edit weekly goal</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={saving} onPress={onClose} style={styles.cancel}>
          <Text style={styles.cancelLabel}>Cancel</Text>
        </Pressable>
      </View>
      <Text accessibilityRole="header" style={styles.title}>Weekly workout goal</Text>
      <View style={[styles.card, styles.pale]}>
        <View style={styles.header}>
          <Text style={styles.progress}>{goal.weeklyProgressLabel}</Text>
          <Text style={styles.badge}>Current goal</Text>
        </View>
        <View style={styles.days}>
          {goal.days.map((day) => (
            <View key={day.date} accessible accessibilityLabel={day.accessibilityLabel} style={styles.day}>
              <View style={[styles.circle, day.state === 'completed' && styles.completed, day.state === 'rest' && styles.rest]}>
                {day.showCheck ? <Image source={require('../assets/goal-day-check.png')} style={styles.dayCheck} /> : (
                  <Text style={[styles.date, day.state === 'completed' && styles.lightText, day.state === 'rest' && styles.restText]}>{day.dateLabel}</Text>
                )}
              </View>
              <Text style={styles.weekday}>{day.weekdayLabel}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.caption}>{goal.weekRangeLabel}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Workouts per week</Text>
        <View style={styles.valueRow}><Text style={styles.value}>{selected}</Text><Text style={styles.unit}>workouts / week</Text></View>
        <View accessibilityRole="radiogroup" accessibilityLabel="Workouts per week" style={styles.choices}>
          {[1, 2, 3, 4, 5, 6, 7].map((value) => (
            <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${value} workouts per week`} accessibilityState={{selected: selected === value, disabled: saving}} disabled={saving} onPress={() => setSelected(value)} style={[styles.choice, selected === value && styles.selected]}>
              <Text style={[styles.choiceLabel, selected === value && styles.lightText]}>{value}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.guidance}>
        <Image source={require('../assets/calendar.png')} style={styles.calendarIcon} />
        <Text style={styles.effectiveDate}>{goal.effectiveDateLabel}</Text>
      </View>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Pressable accessibilityRole="button" accessibilityState={{disabled: !canSave, busy: saving}} disabled={!canSave} onPress={() => {void save();}} style={[styles.save, !canSave && styles.disabled]}>
        {saving ? <ActivityIndicator color={colors.surface} /> : <Image source={require('../assets/goal-save-check.png')} style={styles.saveCheck} />}
        <Text style={styles.saveLabel}>{saving ? 'Saving goal…' : 'Save goal'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  content: {paddingHorizontal: 22, paddingTop: 10, paddingBottom: 26, gap: 22},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12},
  back: {flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, flexShrink: 1},
  backIcon: {width: 22, height: 22},
  headerLabel: {color: colors.ink, fontSize: 15, fontWeight: '700'},
  cancel: {minHeight: 44, justifyContent: 'center'},
  cancelLabel: {color: colors.green, fontSize: 13},
  title: {color: colors.ink, fontSize: 32, fontWeight: '700', lineHeight: 36, letterSpacing: -1.2},
  card: {backgroundColor: colors.surface, borderRadius: 22, padding: 18, gap: 12},
  pale: {backgroundColor: colors.pale},
  progress: {color: colors.ink, fontSize: 14, fontWeight: '700', flex: 1},
  badge: {color: colors.green, fontSize: 11, fontWeight: '700'},
  days: {flexDirection: 'row', justifyContent: 'space-between', gap: 4},
  day: {alignItems: 'center', gap: 7},
  circle: {width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center'},
  completed: {backgroundColor: colors.green, borderColor: colors.green},
  rest: {backgroundColor: '#D6E4D0', borderColor: '#D6E4D0'},
  date: {color: colors.muted, fontSize: 11},
  restText: {color: colors.green},
  dayCheck: {width: 14, height: 14},
  weekday: {color: colors.muted, fontSize: 10},
  caption: {color: colors.muted, fontSize: 12, lineHeight: 18},
  label: {color: colors.ink, fontSize: 15, fontWeight: '700'},
  valueRow: {flexDirection: 'row', alignItems: 'baseline', gap: 10},
  value: {color: colors.green, fontSize: 48, fontWeight: '700', letterSpacing: -1.5},
  unit: {color: colors.muted, fontSize: 14},
  choices: {flexDirection: 'row', gap: 6},
  choice: {flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center'},
  selected: {backgroundColor: colors.green, borderColor: colors.green},
  choiceLabel: {color: colors.ink, fontSize: 15, fontWeight: '600'},
  lightText: {color: colors.surface},
  guidance: {backgroundColor: colors.pale, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12},
  calendarIcon: {width: 20, height: 20},
  effectiveDate: {flex: 1, color: colors.ink, fontSize: 14, fontWeight: '700'},
  save: {minHeight: 54, borderRadius: 16, backgroundColor: colors.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 10},
  saveCheck: {width: 18, height: 18},
  saveLabel: {color: colors.surface, fontSize: 15, fontWeight: '700'},
  disabled: {opacity: 0.45},
  error: {color: colors.danger, fontSize: 13, lineHeight: 19},
});
