import React from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {StrengthChart} from '../components/StrengthChart';
import type {StrengthPoint} from '../components/StrengthChart';
import {colors} from '../theme';

export interface StrengthProgressView {
  exerciseId: string;
  exerciseName: string;
  periodLabel: string;
  estimatedMaxLabel: string;
  unit: string;
  changeLabel: string;
  chart: {
    points: StrengthPoint[];
    minimum: number;
    maximum: number;
    ticks: Array<{id: string; value: number; label: string}>;
    dateLabels: Array<{id: string; label: string}>;
    accessibilityLabel: string;
  };
  actualSet: {weight: number; reps: number; weightLabel: string; repsLabel: string};
  estimatedSet: {weight: number; reps: number; weightLabel: string; repsLabel: string};
  volumeLabel: string;
  volumeChangeLabel: string;
  bestSetLabel: string;
  bestSetDateLabel: string;
  recentSessions: Array<{sessionId: string; dateLabel: string; description: string; estimatedMaxLabel: string}>;
}

interface Props {
  progress: StrengthProgressView;
  onViewHistory: () => void;
  onViewConsistency: () => void;
  onChooseExercise: () => void;
  onViewSession: (sessionId: string) => void;
}

/** Shows strength results returned by the backend. */
export function ProgressScreen({progress, onViewHistory, onViewConsistency, onChooseExercise, onViewSession}: Props) {
  const weightScale = Math.max(progress.actualSet.weight, progress.estimatedSet.weight, 1);
  const repScale = Math.max(progress.actualSet.reps, progress.estimatedSet.reps, 1);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.between}>
        <Text style={styles.headerLabel}>Your progress</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="View workout history" onPress={onViewHistory} style={styles.historyLink}>
          <Text style={styles.link}>History</Text>
        </Pressable>
      </View>
      <Text accessibilityRole="header" style={styles.title}>Small steps. Real strength.</Text>
      <View style={styles.tabs}>
        <View accessibilityRole="tab" accessibilityState={{selected: true}} style={[styles.tab, styles.selectedTab]}><Text style={styles.selectedTabText}>Strength</Text></View>
        <Pressable accessibilityRole="tab" accessibilityState={{selected: false}} onPress={onViewConsistency} style={styles.tab}><Text style={styles.tabText}>Consistency</Text></Pressable>
      </View>
      <View style={styles.between}>
        <Pressable accessibilityRole="button" accessibilityLabel="Choose exercise" onPress={onChooseExercise} style={styles.exercisePicker}>
          <Image source={require('../assets/dumbbell.png')} style={styles.exerciseIcon} />
          <Text style={styles.exerciseName}>{progress.exerciseName}</Text>
          <Image source={require('../assets/chevron-down.png')} style={styles.chevron} />
        </Pressable>
        <Text style={styles.period}>{progress.periodLabel}</Text>
      </View>
      <View style={styles.chartCard}>
        <View style={styles.between}>
          <View style={styles.metric}>
            <Text style={styles.caption}>Estimated one-rep max</Text>
            <Text style={styles.maximum}>{progress.estimatedMaxLabel} <Text style={styles.unit}>{progress.unit}</Text></Text>
          </View>
          <Text style={styles.badge}>{progress.changeLabel}</Text>
        </View>
        <StrengthChart {...progress.chart} />
      </View>
      <View style={styles.explanation}>
        {([
          {id: 'actual', title: 'Actual set', ...progress.actualSet},
          {id: 'estimated', title: 'Estimated max', ...progress.estimatedSet},
        ]).map((set) => (
          <View key={set.id} style={styles.comparison}>
            <Text style={styles.comparisonTitle}>{set.title}</Text>
            <View style={styles.bars}>
              <View style={styles.barColumn}><View style={[styles.weightBar, {height: set.weight / weightScale * 32}]} /><Text style={styles.barLabel}>{set.weightLabel}</Text></View>
              <View style={styles.barColumn}><View style={[styles.repsBar, {height: set.reps / repScale * 40}]} /><Text style={styles.barLabel}>{set.repsLabel}</Text></View>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{progress.exerciseName} performance</Text>
        <View style={styles.performance}>
          <View style={styles.performanceCard}>
            <Text style={styles.caption}>Exercise volume</Text>
            <Text style={styles.value}>{progress.volumeLabel}</Text>
            <Text style={styles.greenCaption}>{progress.volumeChangeLabel}</Text>
          </View>
          <View style={styles.performanceCard}>
            <View style={styles.recordLabel}><Image source={require('../assets/trophy.png')} style={styles.trophy} /><Text style={styles.caption}>Personal best</Text></View>
            <Text style={styles.value}>{progress.bestSetLabel}</Text>
            <Text style={styles.greenCaption}>{progress.bestSetDateLabel}</Text>
          </View>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent sessions</Text>
        {progress.recentSessions.map((session) => (
          <Pressable key={session.sessionId} accessibilityRole="button" accessibilityLabel={`View workout from ${session.dateLabel}`} onPress={() => onViewSession(session.sessionId)} style={styles.session}>
            <Text style={styles.sessionDate}>{session.dateLabel}</Text>
            <Text style={[styles.caption, styles.sessionDescription]}>{session.description}</Text>
            <Text style={styles.greenCaption}>{session.estimatedMaxLabel}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  content: {paddingHorizontal: 22, paddingTop: 10, paddingBottom: 26, gap: 22},
  between: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10},
  headerLabel: {color: colors.ink, fontSize: 15, fontWeight: '700'},
  title: {color: colors.ink, fontSize: 32, fontWeight: '700', lineHeight: 36},
  tabs: {backgroundColor: colors.soft, borderRadius: 14, padding: 4, flexDirection: 'row', gap: 4},
  tab: {flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 11},
  selectedTab: {backgroundColor: colors.surface},
  selectedTabText: {color: colors.green, fontSize: 14, fontWeight: '600'},
  tabText: {color: colors.muted, fontSize: 14, fontWeight: '600'},
  exercisePicker: {minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1},
  exerciseIcon: {width: 20, height: 20},
  exerciseName: {color: colors.ink, fontSize: 17, fontWeight: '700', flexShrink: 1},
  chevron: {width: 16, height: 16},
  period: {color: colors.muted, backgroundColor: colors.soft, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, fontSize: 11},
  chartCard: {backgroundColor: colors.surface, padding: 20, borderRadius: 22, gap: 14},
  metric: {gap: 3},
  caption: {color: colors.muted, fontSize: 12, lineHeight: 18},
  maximum: {color: colors.ink, fontSize: 38, fontWeight: '700'},
  unit: {color: colors.muted, fontSize: 18, fontWeight: '500'},
  badge: {color: colors.green, backgroundColor: colors.pale, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, fontSize: 11, fontWeight: '700', flexShrink: 1},
  explanation: {backgroundColor: colors.pale, padding: 16, borderRadius: 18, flexDirection: 'row', gap: 12},
  comparison: {flex: 1, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: '#DCE7D8', padding: 12, gap: 8},
  comparisonTitle: {color: colors.green, fontSize: 11, fontWeight: '700'},
  bars: {flexDirection: 'row', alignItems: 'flex-end', gap: 8, minHeight: 60},
  barColumn: {flex: 1, alignItems: 'center', gap: 6},
  weightBar: {width: '100%', backgroundColor: colors.pale, borderRadius: 6},
  repsBar: {width: '100%', backgroundColor: colors.green, borderRadius: 6},
  barLabel: {color: colors.muted, fontSize: 10},
  section: {gap: 12},
  sectionTitle: {color: colors.ink, fontSize: 18, fontWeight: '700'},
  performance: {flexDirection: 'row', gap: 12},
  performanceCard: {flex: 1, backgroundColor: colors.surface, borderRadius: 18, padding: 16, gap: 7},
  recordLabel: {flexDirection: 'row', alignItems: 'center', gap: 6},
  trophy: {width: 15, height: 15},
  value: {color: colors.ink, fontSize: 26, fontWeight: '700'},
  greenCaption: {color: colors.green, fontSize: 11, fontWeight: '600'},
  historyLink: {minHeight: 44, justifyContent: 'center'},
  link: {color: colors.green, fontSize: 13, fontWeight: '700'},
  session: {minHeight: 44, flexDirection: 'row', gap: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10},
  sessionDate: {color: colors.ink, fontSize: 12, width: 51},
  sessionDescription: {flex: 1},
});
