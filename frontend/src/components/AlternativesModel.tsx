import React, {useState} from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Button} from './WorkoutControls';
import {colors} from '../theme';

export interface ExerciseAlternative {
  id: string;
  rank: number;
  name: string;
  difficulty: string;
  equipmentLabels: string[];
  imageUri?: string;
}

interface Props {
  originalExerciseName: string;
  targetLabel: string;
  availableEquipment: string[];
  alternatives: readonly ExerciseAlternative[];
  onViewGuide: (exerciseId: string) => void;
  onBack: () => void;
}

/** Shows alternatives in the order returned by the backend. */
export function AlternativesModel({
  originalExerciseName, targetLabel, availableEquipment, alternatives,
  onViewGuide, onBack,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = alternatives.find((exercise) => exercise.id === selectedId);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}>
        <Text style={styles.backLabel}>‹   Swap an exercise</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>
        {originalExerciseName} busy?{'\n'}Keep your flow.
      </Text>
      <View style={styles.replacing}>
        <Text style={styles.replacingText}>⇄   Replacing {originalExerciseName}</Text>
        <Text style={styles.target}>{targetLabel}</Text>
      </View>
      <View style={styles.equipment}>
        <Text style={styles.label}>Available at your gym</Text>
        <View style={styles.badges}>
          {availableEquipment.map((item) => <Text key={item} style={styles.badge}>✓ {item}</Text>)}
        </View>
      </View>
      {alternatives.length === 0 && <Text style={styles.target}>No alternatives match this equipment. Try changing what is available.</Text>}
      {alternatives.map((exercise) => (
        <Pressable
          key={exercise.id}
          accessibilityRole="radio"
          accessibilityState={{checked: exercise.id === selectedId}}
          accessibilityLabel={`${exercise.rank}. ${exercise.name}, ${exercise.difficulty}`}
          onPress={() => setSelectedId(exercise.id)}
          style={[styles.card, exercise.id === selectedId && styles.selected]}
        >
          {!!exercise.imageUri && <Image source={{uri: exercise.imageUri}} style={styles.image} accessibilityIgnoresInvertColors />}
          <View style={styles.cardContent}>
            <Text style={styles.difficulty}>{exercise.difficulty}</Text>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <View style={styles.badges}>
              {exercise.equipmentLabels.map((item) => <Text key={item} style={styles.badge}>{item}</Text>)}
            </View>
          </View>
          <View style={[styles.radio, exercise.id === selectedId && styles.checked]}>
            {exercise.id === selectedId && <Text style={styles.check}>✓</Text>}
          </View>
        </Pressable>
      ))}
      <Button
        label={selected ? `Learn ${selected.name.toLowerCase()}  →` : 'Choose an exercise'}
        disabled={!selected}
        onPress={() => {if (selected) onViewGuide(selected.id);}}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  content: {paddingHorizontal: 22, paddingTop: 12, paddingBottom: 28, gap: 14},
  back: {minHeight: 44, justifyContent: 'center', marginBottom: 10},
  backLabel: {color: colors.ink, fontSize: 15, fontWeight: '700'},
  title: {color: colors.ink, fontSize: 32, fontWeight: '700', letterSpacing: -0.7, marginBottom: 8},
  replacing: {backgroundColor: colors.ink, borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', gap: 12},
  replacingText: {color: colors.surface, fontSize: 13, flex: 1},
  target: {color: colors.lime, fontSize: 13},
  equipment: {gap: 10, marginVertical: 8},
  label: {color: colors.ink, fontSize: 13, fontWeight: '700'},
  badges: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  badge: {color: colors.green, backgroundColor: colors.pale, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6, fontSize: 10, fontWeight: '600'},
  card: {backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 22, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 146},
  selected: {borderColor: colors.green, backgroundColor: '#F1F5EB'},
  image: {width: 86, height: 124, borderRadius: 14},
  cardContent: {flex: 1, gap: 10},
  difficulty: {alignSelf: 'flex-start', color: colors.green, backgroundColor: colors.pale, fontSize: 10, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, fontWeight: '700'},
  exerciseName: {color: colors.ink, fontSize: 20, fontWeight: '700'},
  radio: {width: 22, height: 22, borderRadius: 11, borderColor: colors.border, borderWidth: 1, alignSelf: 'flex-start', alignItems: 'center', justifyContent: 'center', marginTop: 18},
  checked: {backgroundColor: colors.green, borderColor: colors.green},
  check: {color: colors.surface, fontSize: 14},
});
