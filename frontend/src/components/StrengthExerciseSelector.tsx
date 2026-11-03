import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {colors} from '../theme';

export interface StrengthExerciseOption {
  id: string;
  name: string;
  description: string;
}

interface Props {
  selectedExerciseId: string;
  searchExercises: (query: string, signal: AbortSignal) => Promise<readonly StrengthExerciseOption[]>;
  onSelect: (exerciseId: string) => Promise<void>;
  onClose: () => void;
}

/** Finds exercises and opens strength results for the selected exercise. */
export function StrengthExerciseSelector({selectedExerciseId, searchExercises, onSelect, onClose}: Props) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<readonly StrengthExerciseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectingRef = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {mounted.current = false;};
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setLoading(true);
    setOptions([]);
    setError(null);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const response = await searchExercises(query, controller.signal);
          if (current) setOptions(response);
        } catch (failure) {
          if (current) setError(failure instanceof Error ? failure.message : 'Exercises could not be loaded.');
        } finally {
          if (current) setLoading(false);
        }
      })();
    }, query ? 250 : 0);
    return () => {
      current = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchExercises]);

  function close() {
    if (!selectingRef.current) onClose();
  }

  async function select(exerciseId: string) {
    if (selectingRef.current || loading) return;
    if (exerciseId === selectedExerciseId) {
      onClose();
      return;
    }
    selectingRef.current = true;
    setSelecting(true);
    setError(null);
    try {
      await onSelect(exerciseId);
    } catch (failure) {
      if (mounted.current) {
        setError(failure instanceof Error ? failure.message : 'Strength results could not be loaded.');
        setSelecting(false);
        selectingRef.current = false;
      }
      return;
    }
    if (mounted.current) onClose();
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close exercise selector" disabled={selecting} onPress={close} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <View style={styles.heading}>
              <Text accessibilityRole="header" style={styles.title}>Choose exercise</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close exercise selector" disabled={selecting} onPress={close} style={styles.close}>
                <Image source={require('../assets/close.png')} style={styles.icon} />
              </Pressable>
            </View>
            <View style={styles.search}>
              <Image source={require('../assets/search.png')} style={styles.searchIcon} />
              <TextInput accessibilityLabel="Search exercises" placeholder="Search exercises" placeholderTextColor={colors.muted} value={query} editable={!selecting} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} style={styles.input} />
            </View>
            {loading && <ActivityIndicator accessibilityLabel="Searching exercises" color={colors.green} />}
            <View accessibilityRole="radiogroup" accessibilityLabel="Strength exercise" style={styles.options}>
              {options.map((exercise) => (
                <Pressable key={exercise.id} accessibilityRole="radio" accessibilityLabel={`${exercise.name}, ${exercise.description}`} accessibilityState={{checked: exercise.id === selectedExerciseId, disabled: selecting || loading}} disabled={selecting || loading} onPress={() => {void select(exercise.id);}} style={[styles.option, exercise.id === selectedExerciseId && styles.selected]}>
                  <Image source={require('../assets/exercise-option.png')} style={styles.icon} />
                  <View style={styles.info}>
                    <Text style={styles.name}>{exercise.name}</Text>
                    <Text style={styles.description}>{exercise.description}</Text>
                  </View>
                  {exercise.id === selectedExerciseId ? <Image source={require('../assets/exercise-selected.png')} style={styles.icon} /> : <View style={styles.unselected} />}
                </Pressable>
              ))}
            </View>
            {!loading && !error && options.length === 0 && <Text style={styles.description}>No matching exercises.</Text>}
            {selecting && <ActivityIndicator accessibilityLabel="Loading strength results" color={colors.green} />}
            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            <Pressable accessibilityRole="button" accessibilityState={{disabled: selecting}} disabled={selecting} onPress={close} style={styles.cancel}>
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(13, 26, 18, 0.38)'},
  sheet: {maxHeight: '92%', backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 16},
  handle: {width: 44, height: 4, borderRadius: 2, backgroundColor: '#D6D9D2', alignSelf: 'center', marginBottom: 16},
  content: {paddingHorizontal: 22, paddingBottom: 34, gap: 16},
  heading: {flexDirection: 'row', alignItems: 'center', gap: 12},
  title: {flex: 1, color: colors.ink, fontSize: 30, lineHeight: 33, fontWeight: '700', letterSpacing: -1.1},
  close: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  icon: {width: 22, height: 22},
  search: {minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12},
  searchIcon: {width: 20, height: 20},
  input: {flex: 1, color: colors.ink, fontSize: 14, paddingVertical: 12},
  options: {gap: 8},
  option: {minHeight: 68, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12},
  selected: {backgroundColor: colors.pale, borderColor: colors.green},
  info: {flex: 1, gap: 3},
  name: {color: colors.ink, fontSize: 14, fontWeight: '700', lineHeight: 20},
  description: {color: colors.muted, fontSize: 11, lineHeight: 16},
  unselected: {width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: '#C9D4C7'},
  cancel: {minHeight: 54, borderWidth: 1, borderColor: colors.border, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16},
  cancelLabel: {color: colors.ink, fontSize: 15, fontWeight: '700'},
  error: {color: colors.danger, fontSize: 13, lineHeight: 19},
});
