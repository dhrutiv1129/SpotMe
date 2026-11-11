import React from 'react';
import {Image, Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import type {WorkoutDetailView} from '../screens/WorkoutDetailScreen';
import {colors} from '../theme';
import {Button} from './WorkoutControls';

interface Props {
  workout: WorkoutDetailView;
  onClose: () => void;
  onViewWorkout: () => void;
}

/** Shows the saved workout for the selected calendar day. */
export function CalendarDaySheet({workout, onClose, onViewWorkout}: Props) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close day details" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>{workout.dateLabel}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close day details" onPress={onClose} style={styles.close}>
              <Image source={require('../assets/close.png')} style={styles.closeIcon} />
            </Pressable>
          </View>
          <View style={styles.summary}>
            <Text style={styles.name}>{workout.name}</Text>
            <Text style={styles.caption}>{workout.durationLabel} · {workout.summaryLabel}</Text>
            <Text style={styles.volume}>{workout.volumeLabel} volume</Text>
          </View>
          <Button label="View workout →" onPress={onViewWorkout} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(13, 26, 18, 0.38)'},
  sheet: {backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 34, gap: 16},
  handle: {width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center'},
  heading: {flexDirection: 'row', alignItems: 'center', gap: 12},
  title: {flex: 1, color: colors.ink, fontSize: 30, fontWeight: '700', lineHeight: 33, letterSpacing: -1.1},
  close: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  closeIcon: {width: 22, height: 22},
  summary: {gap: 7},
  name: {color: colors.ink, fontSize: 20, fontWeight: '700'},
  caption: {color: colors.muted, fontSize: 13, lineHeight: 19},
  volume: {color: colors.green, fontSize: 14, fontWeight: '700'},
});
