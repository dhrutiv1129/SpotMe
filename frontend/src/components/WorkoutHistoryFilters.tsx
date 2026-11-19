import React, { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Exercise, Workout } from '../beta/api';
import {
  allHistoryFilters,
  currentHistoryMonth,
  historyFilterError,
  historyMonthLabel,
} from '../state/workoutHistory';
import type { HistoryFilters } from '../state/workoutHistory';
import { colors } from '../theme';
import { Button, Sheet } from './WorkoutControls';

interface Props {
  filters: HistoryFilters;
  catalog: Exercise[];
  workouts: Workout[];
  sheet: 'month' | 'more' | null;
  onOpen: (sheet: 'month' | 'more' | null) => void;
  onApply: (filters: HistoryFilters) => void;
}

export function WorkoutHistoryFilters({
  filters,
  catalog,
  workouts,
  sheet,
  onOpen,
  onApply,
}: Props) {
  const [month, setMonth] = useState(filters.month || currentHistoryMonth());
  const [staged, setStaged] = useState(filters);
  const [search, setSearch] = useState('');
  useEffect(() => {
    if (sheet) {
      setMonth(filters.month || currentHistoryMonth());
      setStaged({ ...filters });
      setSearch('');
    }
  }, [sheet, filters]);
  const year = Number(month.slice(0, 4));
  const years = [
    ...new Set([
      new Date().getFullYear(),
      new Date().getFullYear() - 1,
      ...workouts.map((workout) => Number(workout.date.slice(0, 4))),
    ]),
  ].sort((a, b) => a - b);
  const error = historyFilterError(staged);
  const exercise = catalog.find((item) => item.id === filters.exerciseId);
  const apply = (value: HistoryFilters) => {
    onApply(value);
    onOpen(null);
  };
  const close = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Cancel filter changes"
      onPress={() => onOpen(null)}
      style={styles.close}
    >
      <Image
        source={require('../assets/history/close.png')}
        style={styles.closeIcon}
      />
    </Pressable>
  );
  return (
    <>
      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Choose history month, ${historyMonthLabel(filters.month)}`}
          onPress={() => onOpen('month')}
          style={styles.month}
        >
          <Image
            source={require('../assets/history/calendar.png')}
            style={styles.calendar}
          />
          <Text style={styles.monthLabel}>
            {historyMonthLabel(filters.month)}
          </Text>
          <Image
            source={require('../assets/history/down.png')}
            style={styles.down}
          />
        </Pressable>
        <View style={styles.chips}>
          {filters.exerciseId !== null && (
            <FilterChip
              label={`${exercise?.name || `Exercise ${filters.exerciseId}`} ×`}
              selected
              onPress={() => onApply({ ...filters, exerciseId: null })}
            />
          )}
          {(filters.from || filters.to) && (
            <FilterChip
              label={`${filters.from || 'Any date'} – ${filters.to || 'Any date'} ×`}
              selected
              onPress={() => onApply({ ...filters, from: '', to: '' })}
            />
          )}
          <FilterChip label="More filters" onPress={() => onOpen('more')} />
          <FilterChip
            label="Clear filters"
            onPress={() => onApply(allHistoryFilters())}
          />
        </View>
      </View>
      {sheet === 'month' && (
        <Sheet
          title="Choose month"
          onClose={() => onOpen(null)}
          headerAction={close}
        >
          <Text style={styles.body}>
            Filter your completed workout history.
          </Text>
          <Text style={styles.label}>YEAR</Text>
          <ScrollView horizontal contentContainerStyle={styles.chips}>
            {years.map((value) => (
              <FilterChip
                key={value}
                label={String(value)}
                selected={year === value}
                onPress={() => setMonth(`${value}-${month.slice(5)}`)}
              />
            ))}
          </ScrollView>
          <View style={styles.monthGrid}>
            {Array.from({ length: 12 }, (_, index) => {
              const value = `${year}-${String(index + 1).padStart(2, '0')}`;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: value === month }}
                  onPress={() => setMonth(value)}
                  style={[
                    styles.monthOption,
                    month === value && styles.selected,
                  ]}
                >
                  <Text style={styles.monthText}>
                    {new Date(year, index, 1).toLocaleDateString(undefined, {
                      month: 'long',
                    })}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Button
            label="Apply"
            disabled={month === filters.month}
            onPress={() => apply({ ...filters, month })}
          />
          <Button
            label="Cancel"
            variant="secondary"
            onPress={() => onOpen(null)}
          />
          <Button
            label="All time · Clear filters"
            variant="text"
            onPress={() => apply(allHistoryFilters())}
          />
        </Sheet>
      )}
      {sheet === 'more' && (
        <Sheet
          title="More filters"
          onClose={() => onOpen(null)}
          headerAction={close}
        >
          <Text style={styles.body}>Changes apply when you tap Apply.</Text>
          <Text style={styles.context}>
            Within {historyMonthLabel(staged.month)}
          </Text>
          <Text style={styles.heading}>Contains logged exercise</Text>
          <TextInput
            accessibilityLabel="Search exercise filters"
            placeholder="Search exercises"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            style={styles.input}
            autoCapitalize="none"
          />
          <View style={styles.chips}>
            <FilterChip
              label="Any exercise"
              selected={staged.exerciseId === null}
              onPress={() => setStaged({ ...staged, exerciseId: null })}
            />
            {catalog
              .filter((item) =>
                item.name.toLowerCase().includes(search.trim().toLowerCase()),
              )
              .map((item) => (
                <FilterChip
                  key={item.id}
                  label={item.name}
                  selected={staged.exerciseId === item.id}
                  onPress={() => setStaged({ ...staged, exerciseId: item.id })}
                />
              ))}
          </View>
          <Text style={styles.heading}>Workout dates</Text>
          <Text style={styles.body}>
            Use YYYY-MM-DD. Leave a date blank for no limit.
          </Text>
          <View style={styles.dates}>
            {(['from', 'to'] as const).map((field) => (
              <View key={field} style={styles.field}>
                <Text style={styles.label}>{field.toUpperCase()}</Text>
                <TextInput
                  accessibilityLabel={
                    field === 'from' ? 'History start date' : 'History end date'
                  }
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.muted}
                  value={staged[field]}
                  onChangeText={(value) =>
                    setStaged({ ...staged, [field]: value })
                  }
                  style={[styles.input, !!error && styles.invalid]}
                  maxLength={10}
                />
              </View>
            ))}
          </View>
          {!!error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          <Text style={styles.context}>
            Selected · Not applied
            {staged.exerciseId
              ? ` · ${catalog.find((item) => item.id === staged.exerciseId)?.name || 'Exercise'}`
              : ''}
            {staged.from || staged.to
              ? ` · ${staged.from || 'Any date'} – ${staged.to || 'Any date'}`
              : ''}
          </Text>
          <Button
            label="Apply"
            disabled={
              !!error || JSON.stringify(staged) === JSON.stringify(filters)
            }
            onPress={() => apply(staged)}
          />
          <Button
            label="Cancel"
            variant="secondary"
            onPress={() => onOpen(null)}
          />
          <Button
            label="Clear filters"
            variant="text"
            onPress={() => setStaged(allHistoryFilters())}
          />
        </Sheet>
      )}
    </>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text style={[styles.chipText, selected && styles.selectedText]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  controls: { gap: 12 },
  month: {
    minHeight: 48,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calendar: { width: 18, height: 18 },
  down: { width: 16, height: 16 },
  monthLabel: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: colors.surface,
  },
  selected: { backgroundColor: colors.pale, borderColor: colors.green },
  chipText: { fontSize: 11, color: colors.muted },
  selectedText: { color: colors.green, fontWeight: '700' },
  body: { fontSize: 13, lineHeight: 19, color: colors.muted },
  label: { fontSize: 10, fontWeight: '700', color: colors.green },
  heading: { fontSize: 14, fontWeight: '700', color: colors.ink },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthOption: {
    width: '31%',
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthText: { fontSize: 13, color: colors.ink },
  close: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: { width: 22, height: 22 },
  context: {
    backgroundColor: colors.pale,
    color: colors.green,
    padding: 12,
    borderRadius: 12,
    fontSize: 12,
    lineHeight: 18,
  },
  dates: { flexDirection: 'row', gap: 12 },
  field: { flex: 1, gap: 6 },
  input: {
    minHeight: 54,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  invalid: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18 },
});
