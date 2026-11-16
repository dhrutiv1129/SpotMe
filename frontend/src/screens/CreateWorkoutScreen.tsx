import React, { useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, NumberField } from '../components/WorkoutControls';
import type { Exercise } from '../beta/api';
import { colors } from '../theme';

export interface WorkoutBuilderValue {
  name: string;
  exercises: Array<{ exerciseId: number; sets: string; reps: string }>;
}

export function validTarget(value: string) {
  return (
    value.trim() !== '' &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) > 0
  );
}

const equipmentGroup = (exercise: Exercise) =>
  exercise.bodyweight
    ? 'Bodyweight'
    : exercise.requiredEquipment.some((item) =>
          item.toLowerCase().includes('dumbbell'),
        )
      ? 'Dumbbell'
      : exercise.requiredEquipment.some((item) =>
            item.toLowerCase().includes('barbell'),
          )
        ? 'Barbell'
        : 'Machine';
const titleCase = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

interface Props {
  value: WorkoutBuilderValue;
  catalog: Exercise[];
  initials: string;
  onChange: (value: WorkoutBuilderValue) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
}

export function CreateWorkoutScreen({
  value,
  catalog,
  initials,
  onChange,
  onSave,
  onCancel,
}: Props) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [equipment, setEquipment] = useState('All equipment');
  const [muscle, setMuscle] = useState('All muscles');
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  const invalid =
    !value.name.trim() ||
    !value.exercises.length ||
    value.exercises.some(
      (row) =>
        !validTarget(row.sets) ||
        !validTarget(row.reps) ||
        !catalog.some((exercise) => exercise.id === row.exerciseId),
    );
  const equipmentOptions = [
    'All equipment',
    ...new Set(catalog.map(equipmentGroup)),
  ];
  const muscleOptions = [
    'All muscles',
    ...new Set(catalog.map((exercise) => exercise.muscleGroup)),
  ];
  const filtered = catalog.filter(
    (exercise) =>
      exercise.name.toLowerCase().includes(query.trim().toLowerCase()) &&
      (equipment === 'All equipment' ||
        equipmentGroup(exercise) === equipment) &&
      (muscle === 'All muscles' || exercise.muscleGroup === muscle),
  );

  function updateRow(id: number, field: 'sets' | 'reps', text: string) {
    setError('');
    onChange({
      ...value,
      exercises: value.exercises.map((row) =>
        row.exerciseId === id ? { ...row, [field]: text } : row,
      ),
    });
  }
  function move(index: number, offset: number) {
    const rows = [...value.exercises];
    [rows[index], rows[index + offset]] = [rows[index + offset], rows[index]];
    onChange({ ...value, exercises: rows });
  }
  async function save() {
    if (saving.current || invalid) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      await onSave();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Your plan could not be saved. Try again.',
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const header = (
    <View style={styles.header}>
      <View style={styles.identity}>
        <View style={styles.brandMark}>
          <Image
            source={
              libraryOpen
                ? require('../assets/create/library-brand.png')
                : require('../assets/create/brand.png')
            }
            accessible={false}
            style={libraryOpen ? styles.libraryBrandIcon : styles.brandIcon}
          />
        </View>
        <Text style={styles.brand}>SpotMe</Text>
      </View>
      <View style={styles.avatar}>
        <Text style={styles.initials}>{initials}</Text>
      </View>
    </View>
  );

  if (libraryOpen)
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {header}
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.title}>
            Exercise library
          </Text>
          <Text style={styles.body}>
            Add to {value.name.trim() || 'your workout'} plan
          </Text>
        </View>
        <View style={styles.search}>
          <Image
            source={require('../assets/create/search.png')}
            accessible={false}
            style={styles.searchIcon}
          />
          <TextInput
            accessibilityLabel="Search exercises"
            placeholder="Search exercises"
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
          />
        </View>
        <View style={styles.section}>
          <View style={styles.filters}>
            {equipmentOptions.map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityLabel={option}
                accessibilityState={{ selected: equipment === option }}
                onPress={() => setEquipment(option)}
                style={[
                  styles.chip,
                  equipment === option && styles.chipSelected,
                ]}
              >
                <Text style={styles.chipText}>{option}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.filters}>
            {muscleOptions.map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityLabel={titleCase(option)}
                accessibilityState={{ selected: muscle === option }}
                onPress={() => setMuscle(option)}
                style={[styles.chip, muscle === option && styles.chipSelected]}
              >
                <Text style={styles.chipText}>{titleCase(option)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.section}>
          <View style={styles.between}>
            <Text style={styles.heading}>Exercises</Text>
            <Text style={styles.caption}>
              {filtered.length} results · {selected.length} selected
            </Text>
          </View>
          {filtered.map((exercise) => {
            const inPlan = value.exercises.some(
              (row) => row.exerciseId === exercise.id,
            );
            const checked = selected.includes(exercise.id);
            const group = equipmentGroup(exercise);
            const icon =
              group === 'Bodyweight'
                ? require('../assets/create/bodyweight.png')
                : group === 'Machine'
                  ? require('../assets/create/machine.png')
                  : require('../assets/create/dumbbell.png');
            return (
              <Pressable
                key={exercise.id}
                accessibilityRole="checkbox"
                accessibilityLabel={exercise.name}
                accessibilityState={{
                  checked: checked || inPlan,
                  disabled: inPlan,
                }}
                disabled={inPlan}
                onPress={() =>
                  setSelected((ids) =>
                    checked
                      ? ids.filter((id) => id !== exercise.id)
                      : [...ids, exercise.id],
                  )
                }
                style={[styles.result, checked && styles.resultSelected]}
              >
                <View style={styles.thumbnail}>
                  <Image
                    source={icon}
                    accessible={false}
                    style={styles.exerciseIcon}
                  />
                </View>
                <View style={styles.resultCopy}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.caption}>
                    {group} · {titleCase(exercise.muscleGroup)}
                  </Text>
                </View>
                <View style={[styles.addMark, inPlan && styles.inPlan]}>
                  <Text style={inPlan ? styles.caption : styles.addText}>
                    {inPlan ? 'In plan' : checked ? '✓' : '+'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          {!filtered.length && (
            <View style={styles.noResults}>
              <Text style={styles.heading}>No matching exercises</Text>
              <Text style={styles.body}>
                Try another search or clear your filters.
              </Text>
              <Button
                label="Clear filters"
                variant="text"
                onPress={() => {
                  setQuery('');
                  setEquipment('All equipment');
                  setMuscle('All muscles');
                }}
              />
            </View>
          )}
        </View>
        <View style={styles.section}>
          <Button
            label={`Add ${selected.length} exercise${selected.length === 1 ? '' : 's'}`}
            disabled={!selected.length}
            onPress={() => {
              onChange({
                ...value,
                exercises: [
                  ...value.exercises,
                  ...selected
                    .filter(
                      (id) =>
                        !value.exercises.some((row) => row.exerciseId === id),
                    )
                    .map((exerciseId) => ({
                      exerciseId,
                      sets: '3',
                      reps: '10',
                    })),
                ],
              });
              setSelected([]);
              setLibraryOpen(false);
            }}
          />
          <Button
            label="Cancel"
            variant="secondary"
            onPress={() => {
              setSelected([]);
              setLibraryOpen(false);
            }}
          />
        </View>
      </ScrollView>
    );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {header}
      <Text accessibilityRole="header" style={styles.title}>
        Create workout
      </Text>
      <View style={styles.section}>
        <Text style={styles.label}>WORKOUT NAME</Text>
        <TextInput
          accessibilityLabel="Workout name"
          placeholder="Name your workout"
          value={value.name}
          maxLength={100}
          onChangeText={(name) => onChange({ ...value, name })}
          editable={!busy}
          style={styles.input}
        />
      </View>
      <View style={styles.section}>
        <View style={styles.between}>
          <Text style={styles.heading}>Exercises</Text>
          <Text style={styles.caption}>{value.exercises.length} exercises</Text>
        </View>
        {!value.exercises.length && (
          <View style={styles.empty}>
            <View style={styles.emptySymbol}>
              <Image
                source={require('../assets/create/empty.png')}
                accessible={false}
                style={styles.emptyIcon}
              />
            </View>
            <Text style={styles.emptyTitle}>No exercises</Text>
          </View>
        )}
        {value.exercises.map((row, index) => {
          const name =
            catalog.find((exercise) => exercise.id === row.exerciseId)?.name ||
            'Unavailable exercise';
          return (
            <View key={row.exerciseId} style={styles.planRow}>
              <View style={styles.between}>
                <Text style={styles.exerciseName}>
                  {String(index + 1).padStart(2, '0')} {name}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${name}`}
                  disabled={busy}
                  onPress={() =>
                    onChange({
                      ...value,
                      exercises: value.exercises.filter(
                        (item) => item.exerciseId !== row.exerciseId,
                      ),
                    })
                  }
                  style={styles.remove}
                >
                  <Text style={styles.removeText}>−</Text>
                </Pressable>
              </View>
              <View style={styles.targets}>
                <NumberField
                  label={`${name} sets`}
                  value={row.sets}
                  onChange={(text) => updateRow(row.exerciseId, 'sets', text)}
                  integer
                  disabled={busy}
                  error={
                    validTarget(row.sets)
                      ? undefined
                      : 'Enter a positive whole number.'
                  }
                />
                <NumberField
                  label={`${name} reps`}
                  value={row.reps}
                  onChange={(text) => updateRow(row.exerciseId, 'reps', text)}
                  integer
                  disabled={busy}
                  error={
                    validTarget(row.reps)
                      ? undefined
                      : 'Enter a positive whole number.'
                  }
                />
              </View>
              <View style={styles.targets}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${name} up`}
                  accessibilityState={{ disabled: busy || index === 0 }}
                  disabled={busy || index === 0}
                  onPress={() => move(index, -1)}
                  style={[styles.move, (busy || index === 0) && styles.dimmed]}
                >
                  <Text style={styles.moveText}>↑</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${name} down`}
                  accessibilityState={{
                    disabled: busy || index === value.exercises.length - 1,
                  }}
                  disabled={busy || index === value.exercises.length - 1}
                  onPress={() => move(index, 1)}
                  style={[
                    styles.move,
                    (busy || index === value.exercises.length - 1) &&
                      styles.dimmed,
                  ]}
                >
                  <Text style={styles.moveText}>↓</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
        <Button
          label="+ Add exercise"
          variant="secondary"
          disabled={busy || !catalog.length}
          onPress={() => {
            setSelected([]);
            setLibraryOpen(true);
          }}
        />
        {!catalog.length && (
          <Text style={styles.body}>
            No exercises are available yet. Return to Train and reload your
            account.
          </Text>
        )}
      </View>
      <View style={styles.section}>
        {!!error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}
        <Button
          label="Save plan"
          disabled={invalid}
          busy={busy}
          onPress={() => {
            void save();
          }}
        />
        <Button
          label="Cancel"
          variant="secondary"
          disabled={busy}
          onPress={onCancel}
        />
        <Text style={styles.body}>
          Plans are saved on this device. Target sets are not logged sets.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 26,
    gap: 22,
  },
  header: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  identity: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIcon: { width: 22, height: 22 },
  libraryBrandIcon: { width: 20, height: 20 },
  move: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: colors.soft,
  },
  moveText: { color: colors.green, fontSize: 20 },
  dimmed: { opacity: 0.4 },
  brand: {
    fontSize: 23,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: colors.green, fontSize: 12, fontWeight: '600' },
  title: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -1.1,
    color: colors.ink,
  },
  section: { gap: 12 },
  label: { fontSize: 10, fontWeight: '700', color: colors.green },
  input: {
    height: 54,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    paddingHorizontal: 16,
    color: colors.ink,
    fontSize: 15,
  },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heading: { fontSize: 18, color: colors.ink, fontWeight: '700' },
  caption: { fontSize: 11, color: colors.muted, lineHeight: 16 },
  body: { fontSize: 13, lineHeight: 20, color: colors.muted },
  empty: {
    height: 290,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptySymbol: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: { width: 30, height: 30 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.ink },
  search: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  searchIcon: { width: 20, height: 20 },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: 50,
    fontSize: 14,
    color: colors.ink,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.pale },
  chipText: { fontSize: 11, fontWeight: '700', color: colors.green },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    borderRadius: 15,
  },
  resultSelected: { borderColor: colors.green, backgroundColor: '#F0F4EA' },
  thumbnail: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: colors.pale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseIcon: { width: 22, height: 22 },
  resultCopy: { flex: 1, gap: 6 },
  exerciseName: {
    flexShrink: 1,
    fontSize: 14,
    color: colors.ink,
    fontWeight: '600',
  },
  addMark: {
    width: 36,
    height: 36,
    backgroundColor: colors.pale,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inPlan: { width: 54, backgroundColor: colors.soft },
  addText: { color: colors.green, fontSize: 20 },
  noResults: {
    padding: 20,
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 18,
  },
  planRow: {
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
    gap: 12,
  },
  targets: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  remove: {
    width: 36,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
  },
  removeText: { color: colors.danger, fontSize: 20 },
  error: { fontSize: 13, lineHeight: 20, color: colors.danger },
});
