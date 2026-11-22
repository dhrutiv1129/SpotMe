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
  selectedExerciseId?: string | null;
  onSelectExercise?: (exerciseId: string) => void;
  onEditEquipment?: () => void;
  onViewGuide: (exerciseId: string) => void;
  onBack: () => void;
}

/** Shows alternatives in the order returned by the backend.*/
export function AlternativesModel({
  originalExerciseName, targetLabel, availableEquipment, alternatives,
  onViewGuide, onBack, selectedExerciseId, onSelectExercise,
  onEditEquipment,
}: Props) {
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);
  const selectedId = selectedExerciseId === undefined ? localSelectedId : selectedExerciseId;
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
        <View style={styles.between}>
          <Text style={styles.label}>Available at your gym</Text>
          {!!alternatives.length && onEditEquipment && <Pressable accessibilityRole="button" accessibilityLabel="Edit equipment filters" onPress={onEditEquipment} style={styles.editButton}>
            <Text style={styles.editLabel}>Edit</Text>
          </Pressable>}
        </View>
        <View style={styles.badges}>
          {availableEquipment.map((item) => <Text key={item} style={styles.badge}>✓ {item}</Text>)}
          {!availableEquipment.length && <Text style={styles.body}>No equipment selected</Text>}
        </View>
      </View>
      {alternatives.length > 0 ? <View style={styles.resultsHeading}>
        <Text accessibilityRole="header" style={styles.label}>Ranked alternatives</Text>
        {alternatives.length < 3 && <Text style={styles.body}>Only {alternatives.length} {alternatives.length === 1 ? 'alternative matches' : 'alternatives match'} your equipment and filters.</Text>}
      </View> : <View style={styles.empty}>
        <Text accessibilityRole="header" style={styles.emptyTitle}>No matching swaps</Text>
        <Text style={styles.body}>Change your equipment or filters to see more options. Your active workout is still here.</Text>
        {onEditEquipment && <Button label="Edit equipment filters" onPress={onEditEquipment} />}
        <Button label="Back to active workout" variant="secondary" onPress={onBack} />
      </View>}
      {alternatives.map((exercise) => (
        <Pressable
          key={exercise.id}
          accessibilityRole="radio"
          accessibilityState={{checked: exercise.id === selectedId}}
          accessibilityLabel={`${exercise.rank}. ${exercise.name}, ${exercise.difficulty}`}
          onPress={() => {setLocalSelectedId(exercise.id); onSelectExercise?.(exercise.id);}}
          style={[styles.card, exercise.id === selectedId && styles.selected]}
        >
          <AlternativePhoto key={`${exercise.id}:${exercise.imageUri || 'local'}`} exercise={exercise} />
          <View style={styles.cardContent}>
            <View style={styles.badges}>
              <Text style={styles.rank}>#{exercise.rank}</Text>
              <Text style={[styles.difficulty, ['beginner', 'easy'].includes(exercise.difficulty.toLowerCase()) && styles.easy, ['advanced', 'hard'].includes(exercise.difficulty.toLowerCase()) && styles.hard]}>{difficultyLabel(exercise.difficulty)}</Text>
            </View>
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
      {alternatives.length > 0 && <Button
        label={selected ? `Learn ${selected.name.toLowerCase()}  →` : 'Choose an exercise'}
        disabled={!selected}
        onPress={() => {if (selected) onViewGuide(selected.id);}}
      />}
    </ScrollView>
  );
}

function difficultyLabel(value: string) {
  const labels: Record<string, string> = {beginner: 'Easy', intermediate: 'Medium', advanced: 'Hard'};
  return labels[value.toLowerCase()] || value;
}

function AlternativePhoto({exercise}: {exercise: ExerciseAlternative}) {
  const [failed, setFailed] = useState(false);
  // Match the catalog identity so rank changes never change the exercise photo
  const source = exercise.imageUri ? {uri: exercise.imageUri} :
    exercise.id === '2' && exercise.name.trim().toLowerCase() === 'goblet squat' ? require('../assets/alternatives/goblet-squat.png') : null;
  return source && !failed ? <Image source={source} style={styles.image} resizeMode="cover" accessible={false} accessibilityIgnoresInvertColors onError={() => setFailed(true)} /> :
    <View style={[styles.image, styles.photoPlaceholder]}><Text style={styles.photoCaption}>Photo unavailable</Text></View>;
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  content: {width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 12, paddingBottom: 28, gap: 14},
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
  card: {backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 150},
  selected: {borderColor: colors.green, borderWidth: 2, backgroundColor: '#F0F5E9'},
  image: {width: 86, height: 124, borderRadius: 12},
  photoPlaceholder: {backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center', padding: 8},
  photoCaption: {color: colors.muted, fontSize: 11, textAlign: 'center'},
  cardContent: {flex: 1, gap: 8},
  difficulty: {alignSelf: 'flex-start', color: colors.green, backgroundColor: colors.pale, fontSize: 10, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, fontWeight: '700'},
  easy: {color: colors.muted, backgroundColor: colors.soft},
  hard: {color: '#8A6428', backgroundColor: '#F7EDD8'},
  rank: {color: colors.green, fontSize: 11, fontWeight: '700', paddingVertical: 6},
  exerciseName: {color: colors.ink, fontSize: 18, fontWeight: '700'},
  between: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12},
  editButton: {minHeight: 44, justifyContent: 'center'},
  editLabel: {color: colors.green, fontSize: 12},
  body: {color: colors.muted, fontSize: 13, lineHeight: 20},
  resultsHeading: {gap: 6},
  empty: {backgroundColor: colors.surface, borderRadius: 22, padding: 20, gap: 16},
  emptyTitle: {color: colors.ink, fontSize: 22, fontWeight: '700'},
  radio: {width: 22, height: 22, borderRadius: 11, borderColor: colors.border, borderWidth: 1, alignSelf: 'flex-start', alignItems: 'center', justifyContent: 'center', marginTop: 18},
  checked: {backgroundColor: colors.green, borderColor: colors.green},
  check: {color: colors.surface, fontSize: 14},
});
