import React, {useRef, useState} from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Button} from '../components/WorkoutControls';
import {colors} from '../theme';

export interface ExerciseGuide {
  exerciseId: string;
  name: string;
  originalExerciseName: string;
  targetLabel: string;
  loadLabel: string;
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
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to exercise alternatives" onPress={onBack} disabled={busy} style={styles.back}>
          <Image source={require('../assets/back.png')} style={styles.headerIcon} />
          <Text style={styles.backLabel}>Exercise guide</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Close guide and keep current exercise" onPress={onKeepExercise} disabled={busy} style={styles.close}>
          <Image source={require('../assets/close.png')} style={styles.headerIcon} />
        </Pressable>
      </View>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Replacing {guide.originalExerciseName}</Text>
        <Text accessibilityRole="header" style={styles.heroTitle}>{guide.name}</Text>
        <Text style={styles.heroBody}>{guide.loadLabel}</Text>
        <Text style={styles.target}>{guide.targetLabel}</Text>
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
      <View style={styles.note}>
        <Image source={require('../assets/shield-check.png')} style={styles.safetyIcon} />
        <Text style={[styles.body, styles.noteText]}>Warm up first. Stop if you feel pain.</Text>
      </View>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <View style={styles.actions}>
        <Button label="Use this exercise" busy={busy} onPress={() => {void useExercise();}} />
        <Pressable accessibilityRole="button" disabled={busy} onPress={onKeepExercise} style={styles.keep}>
          <Text style={styles.keepLabel}>Keep current exercise</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  content: {paddingHorizontal: 22, paddingTop: 10, paddingBottom: 26, gap: 22},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12},
  back: {minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1},
  headerIcon: {width: 22, height: 22},
  close: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  backLabel: {color: colors.ink, fontSize: 15, fontWeight: '700'},
  body: {color: colors.muted, fontSize: 13, lineHeight: 20},
  hero: {backgroundColor: colors.hero, borderRadius: 22, padding: 20, gap: 16},
  eyebrow: {color: colors.lime, fontSize: 10, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase'},
  heroTitle: {color: colors.surface, fontSize: 32, lineHeight: 36, fontWeight: '700', letterSpacing: -1.2},
  heroBody: {color: colors.pale, fontSize: 13},
  target: {color: colors.lime, fontSize: 15},
  section: {gap: 10},
  sectionTitle: {color: colors.ink, fontSize: 16, fontWeight: '700'},
  cue: {flexDirection: 'row', gap: 12, alignItems: 'flex-start'},
  cueNumber: {color: colors.green, backgroundColor: colors.pale, borderRadius: 10, width: 28, height: 28, lineHeight: 28, textAlign: 'center', fontSize: 11, fontWeight: '700'},
  cueText: {flex: 1, paddingTop: 4},
  note: {backgroundColor: '#F7EDD8', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10},
  safetyIcon: {width: 19, height: 19},
  noteText: {flex: 1},
  actions: {gap: 12},
  keep: {minHeight: 44, justifyContent: 'center', alignItems: 'center'},
  keepLabel: {color: colors.green, fontSize: 13},
  error: {color: colors.danger, fontSize: 13, lineHeight: 19},
});
