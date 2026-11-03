import React, {useRef, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Button} from '../components/WorkoutControls';
import {colors} from '../theme';

export interface ExerciseGuide {
  exerciseId: string;
  name: string;
  originalExerciseName: string;
  muscleEquipmentLabel: string;
  targetLabel: string;
  equipmentLabel: string;
  loadInstructions: string;
  cues: Array<{id: string; text: string}>;
}

interface Props {
  guide: ExerciseGuide;
  onBack: () => void;
  onKeepExercise: () => void;
  onUseExercise: (exerciseId: string) => Promise<void>;
}

/** Shows the guide for the selected exercise. */
export function ExerciseGuideScreen({guide, onBack, onKeepExercise, onUseExercise}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const writeInFlight = useRef(false);

  async function useExercise() {
    if (writeInFlight.current) return;
    writeInFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await onUseExercise(guide.exerciseId);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Please try again.');
    } finally {
      writeInFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" onPress={onBack} disabled={busy} style={styles.back}>
        <Text style={styles.backLabel}>‹   {guide.name}</Text>
      </Pressable>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>{guide.name}</Text>
        <Text style={styles.body}>Selected replacement · review before switching.</Text>
      </View>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>REPLACEMENT EXERCISE</Text>
        <Text style={styles.badge}>Swapped for {guide.originalExerciseName.toLowerCase()}</Text>
        <Text style={styles.heroTitle}>{guide.name}</Text>
        <Text style={styles.heroBody}>{guide.muscleEquipmentLabel}</Text>
        <Text style={styles.target}>{guide.targetLabel}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Equipment</Text>
        <Text style={styles.equipment}>{guide.equipmentLabel}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How to log load</Text>
        <Text style={styles.load}>{guide.loadInstructions}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Form cues</Text>
        {guide.cues.map((cue, index) => (
          <View key={cue.id} style={styles.cue}>
            <Text style={styles.cueNumber}>{String(index + 1).padStart(2, '0')}</Text>
            <Text style={[styles.body, styles.cueText]}>{cue.text}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.note}>Warm up first. Stop if you feel pain.</Text>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Button label="Use this exercise" busy={busy} onPress={() => {void useExercise();}} />
      <Button label="Keep current exercise" variant="text" disabled={busy} onPress={onKeepExercise} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  content: {paddingHorizontal: 22, paddingTop: 12, paddingBottom: 28, gap: 22},
  back: {minHeight: 44, justifyContent: 'center'},
  backLabel: {color: colors.ink, fontSize: 15, fontWeight: '700'},
  heading: {gap: 8},
  title: {color: colors.ink, fontSize: 32, fontWeight: '700', letterSpacing: -0.7},
  body: {color: colors.muted, fontSize: 13, lineHeight: 20},
  hero: {backgroundColor: colors.ink, borderRadius: 22, padding: 20, gap: 16},
  eyebrow: {color: colors.lime, fontSize: 10, fontWeight: '700', letterSpacing: 1.2},
  badge: {alignSelf: 'flex-start', backgroundColor: colors.pale, color: colors.green, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, fontSize: 11, fontWeight: '700'},
  heroTitle: {color: colors.surface, fontSize: 28, fontWeight: '700'},
  heroBody: {color: '#D4DDD1', fontSize: 13},
  target: {color: colors.lime, fontSize: 15},
  section: {gap: 10},
  sectionTitle: {color: colors.ink, fontSize: 18, fontWeight: '700'},
  equipment: {color: colors.ink, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 14, fontSize: 14},
  load: {color: colors.ink, backgroundColor: colors.pale, borderRadius: 16, padding: 14, fontSize: 13, lineHeight: 20},
  cue: {flexDirection: 'row', gap: 12, alignItems: 'flex-start'},
  cueNumber: {color: colors.green, backgroundColor: colors.pale, borderRadius: 10, padding: 8, fontSize: 11, fontWeight: '700'},
  cueText: {flex: 1, paddingTop: 4},
  note: {backgroundColor: '#F8EED8', color: colors.muted, borderRadius: 16, padding: 16, fontSize: 13},
  error: {color: colors.danger, fontSize: 13, lineHeight: 19},
});
