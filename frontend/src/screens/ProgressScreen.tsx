import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StrengthChart } from '../components/StrengthChart';
import type { StrengthPoint } from '../components/StrengthChart';
import { colors } from '../theme';
import { Button } from '../components/WorkoutControls';
import Back from '../assets/strength/back.svg';
import Dumbbell from '../assets/strength/dumbbell.svg';
import ChevronDown from '../assets/strength/chevron-down.svg';
import EmptyExercise from '../assets/strength/empty.svg';
import Trophy from '../assets/strength/trophy.svg';
import Next from '../assets/strength/next.svg';

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
    ticks: Array<{ id: string; value: number; label: string }>;
    dateLabels: Array<{ id: string; label: string }>;
    accessibilityLabel: string;
  };
  actualSet?: {
    weight: number;
    reps: number;
    weightLabel: string;
    repsLabel: string;
  };
  estimatedSet?: {
    weight: number;
    reps: number;
    weightLabel: string;
    repsLabel: string;
  };
  volumeLabel: string;
  volumeChangeLabel: string;
  bestSetLabel: string;
  bestSetDateLabel: string;
  state?: 'empty' | 'single' | 'trend';
  latestDateLabel?: string;
  hasEstimate?: boolean;
  recordTitle?: string;
  recordMetrics?: Array<{
    id: string;
    title: string;
    valueLabel: string;
    dateLabel: string;
    workoutId?: number;
  }>;
  recentSessions: Array<{
    sessionId: string;
    dateLabel: string;
    fullDateLabel?: string;
    description: string;
    estimatedMaxLabel: string;
  }>;
}

interface Props {
  progress: StrengthProgressView;
  onViewHistory: () => void;
  onViewConsistency?: () => void;
  onChooseExercise: () => void;
  onViewSession: (sessionId: string) => void;
  onTrain?: () => void;
}

/** Shows strength results returned by the backend. */
export function ProgressScreen({
  progress,
  onViewHistory,
  onViewConsistency,
  onChooseExercise,
  onViewSession,
  onTrain,
}: Props) {
  const weightScale = Math.max(
    progress.actualSet?.weight || 0,
    progress.estimatedSet?.weight || 0,
    1,
  );
  const repScale = Math.max(
    progress.actualSet?.reps || 0,
    progress.estimatedSet?.reps || 0,
    1,
  );
  const single = progress.state === 'single';
  const empty = progress.state === 'empty';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.between}>
        {single || empty ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Train"
            disabled={!onTrain}
            onPress={onTrain}
            style={styles.headerBack}
          >
            <Back accessible={false} />
            <Text style={styles.headerLabel}>Your progress</Text>
          </Pressable>
        ) : (
          <Text style={styles.headerLabel}>Your progress</Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View workout history"
          onPress={onViewHistory}
          style={styles.historyLink}
        >
          <Text style={styles.link}>History</Text>
        </Pressable>
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        Small steps. Real strength.
      </Text>
      <View style={styles.tabs}>
        <View
          accessibilityRole="tab"
          accessibilityState={{ selected: true }}
          style={[styles.tab, styles.selectedTab]}
        >
          <Text style={styles.selectedTabText}>Strength</Text>
        </View>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: false, disabled: !onViewConsistency }}
          disabled={!onViewConsistency}
          onPress={onViewConsistency}
          style={styles.tab}
        >
          <Text style={styles.tabText}>Consistency</Text>
        </Pressable>
      </View>
      <View style={styles.between}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose exercise"
          onPress={onChooseExercise}
          style={styles.exercisePicker}
        >
          <Dumbbell accessible={false} />
          <Text style={styles.exerciseName}>{progress.exerciseName}</Text>
          <ChevronDown accessible={false} />
        </Pressable>
        <Text style={styles.period}>{progress.periodLabel}</Text>
      </View>
      {empty ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <EmptyExercise accessible={false} />
          </View>
          <Text accessibilityRole="header" style={styles.emptyTitle}>
            No workouts yet
          </Text>
          <Text style={styles.emptyBody}>
            You haven’t logged {progress.exerciseName.toLowerCase()} yet. Save a
            workout with this exercise to see your strength here.
          </Text>
          {!!onTrain && (
            <View style={styles.fullWidth}>
              <Button label="Go to Train" onPress={onTrain} />
            </View>
          )}
          <Button
            label="Choose another exercise"
            variant="text"
            onPress={onChooseExercise}
          />
        </View>
      ) : (
        <>
          <View style={styles.chartCard}>
            <View style={styles.between}>
              <View style={styles.metric}>
                <Text style={styles.caption}>Estimated one-rep max</Text>
                <Text style={styles.maximum}>
                  {progress.estimatedMaxLabel}{' '}
                  <Text style={styles.unit}>{progress.unit}</Text>
                </Text>
              </View>
              {!single && !!progress.changeLabel && (
                <Text style={styles.badge}>{progress.changeLabel}</Text>
              )}
            </View>
            {single ? (
              <>
                <Text style={styles.caption}>
                  From your saved session · {progress.latestDateLabel}
                </Text>
                <Text style={styles.firstSession}>
                  One session recorded—keep going to see a trend.
                </Text>
              </>
            ) : progress.chart.points.length >= 2 ? (
              <StrengthChart {...progress.chart} />
            ) : (
              <Text style={styles.caption}>
                More saved estimates will help show a trend.
              </Text>
            )}
            {progress.hasEstimate === false && (
              <Text style={styles.caption}>
                No estimated max for the latest session. Zero external load has
                no estimate.
              </Text>
            )}
          </View>
          {!single && progress.actualSet && progress.estimatedSet && (
            <View style={styles.explanation}>
              {[
                { id: 'actual', title: 'Actual set', ...progress.actualSet },
                {
                  id: 'estimated',
                  title: 'Estimated max',
                  ...progress.estimatedSet,
                },
              ].map((set) => (
                <View key={set.id} style={styles.comparison}>
                  <Text style={styles.comparisonTitle}>{set.title}</Text>
                  <View style={styles.bars}>
                    <View style={styles.barColumn}>
                      <View
                        style={[
                          styles.weightBar,
                          { height: (set.weight / weightScale) * 32 },
                        ]}
                      />
                      <Text style={styles.barLabel}>{set.weightLabel}</Text>
                    </View>
                    <View style={styles.barColumn}>
                      <View
                        style={[
                          styles.repsBar,
                          { height: (set.reps / repScale) * 40 },
                        ]}
                      />
                      <Text style={styles.barLabel}>{set.repsLabel}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
          <Text style={styles.caption}>
            The Epley estimate uses your logged weight and reps to compare
            strength across sessions. It is an estimate, not a weight
            recommendation.
          </Text>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {progress.exerciseName} performance
            </Text>
            <View style={styles.performance}>
              <View style={styles.performanceCard}>
                <Text style={styles.caption}>Exercise volume</Text>
                <Text style={styles.value}>{progress.volumeLabel}</Text>
                <Text style={styles.greenCaption}>
                  {progress.volumeChangeLabel}
                </Text>
              </View>
              <View style={styles.performanceCard}>
                <View style={styles.recordLabel}>
                  {!single && (
                    <Trophy accessible={false} />
                  )}
                  <Text style={styles.caption}>
                    {progress.recordTitle || 'Personal best'}
                  </Text>
                </View>
                <Text style={styles.value}>{progress.bestSetLabel}</Text>
                <Text style={styles.greenCaption}>
                  {progress.bestSetDateLabel}
                </Text>
              </View>
            </View>
          </View>
          {!!progress.recordMetrics?.length && (
            <View style={styles.performance}>
              {progress.recordMetrics.map((record) => (
                <Pressable
                  key={record.id}
                  accessibilityRole="button"
                  accessibilityLabel={`View workout for ${record.title}, ${record.valueLabel}, ${record.dateLabel}`}
                  disabled={!record.workoutId}
                  onPress={() =>
                    record.workoutId && onViewSession(String(record.workoutId))
                  }
                  style={styles.performanceCard}
                >
                  <Text style={styles.caption}>{record.title}</Text>
                  <Text style={styles.value}>{record.valueLabel}</Text>
                  <Text style={styles.greenCaption}>{record.dateLabel}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent sessions</Text>
            {progress.recentSessions.map((session) => (
              <Pressable
                key={session.sessionId}
                accessibilityRole="button"
                accessibilityLabel={`View workout from ${session.fullDateLabel || session.dateLabel}`}
                onPress={() => onViewSession(session.sessionId)}
                style={single ? styles.singleSession : styles.session}
              >
                {single ? (
                  <>
                    <View style={styles.between}>
                      <Text style={styles.singleDate}>
                        {session.fullDateLabel || session.dateLabel}
                      </Text>
                      <Next accessible={false} />
                    </View>
                    <Text style={styles.caption}>Saved workout</Text>
                    <Text style={styles.firstSession}>
                      {session.description}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.sessionDate}>{session.dateLabel}</Text>
                    <Text style={[styles.caption, styles.sessionDescription]}>
                      {session.description}
                    </Text>
                    <Text style={styles.greenCaption}>
                      {session.estimatedMaxLabel}
                    </Text>
                  </>
                )}
              </Pressable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 26,
    gap: 22,
  },
  fullWidth: { width: '100%' },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 20,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 27,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  firstSession: {
    color: colors.green,
    backgroundColor: colors.pale,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    lineHeight: 19,
  },
  singleSession: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    gap: 12,
  },
  singleDate: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  headerLabel: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  headerBack: {
    minHeight: 44,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    flexShrink: 1,
  },
  title: { color: colors.ink, fontSize: 32, fontWeight: '700', lineHeight: 36 },
  tabs: {
    backgroundColor: colors.soft,
    borderRadius: 14,
    padding: 4,
    flexDirection: 'row',
    gap: 4,
  },
  tab: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  selectedTab: { backgroundColor: colors.surface },
  selectedTabText: { color: colors.green, fontSize: 14, fontWeight: '600' },
  tabText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  exercisePicker: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flexShrink: 1,
  },
  exerciseName: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 1,
  },
  period: {
    color: colors.muted,
    backgroundColor: colors.soft,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
  },
  chartCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 22,
    gap: 14,
  },
  metric: { gap: 3, flexShrink: 1 },
  caption: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  maximum: { color: colors.ink, fontSize: 38, fontWeight: '700' },
  unit: { color: colors.muted, fontSize: 18, fontWeight: '500' },
  badge: {
    color: colors.green,
    backgroundColor: colors.pale,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
  explanation: {
    backgroundColor: colors.pale,
    padding: 16,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 12,
  },
  comparison: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE7D8',
    padding: 12,
    gap: 8,
  },
  comparisonTitle: { color: colors.green, fontSize: 11, fontWeight: '700' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, minHeight: 60 },
  barColumn: { flex: 1, alignItems: 'center', gap: 6 },
  weightBar: { width: '100%', backgroundColor: colors.pale, borderRadius: 6 },
  repsBar: { width: '100%', backgroundColor: colors.green, borderRadius: 6 },
  barLabel: { color: colors.muted, fontSize: 10 },
  section: { gap: 12 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  performance: { flexDirection: 'row', gap: 12 },
  performanceCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    gap: 7,
  },
  recordLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { color: colors.ink, fontSize: 26, fontWeight: '700' },
  greenCaption: { color: colors.green, fontSize: 11, fontWeight: '600' },
  historyLink: { minHeight: 44, justifyContent: 'center' },
  link: { color: colors.green, fontSize: 13, fontWeight: '700' },
  session: {
    minHeight: 44,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
  },
  sessionDate: { color: colors.ink, fontSize: 12, width: 51 },
  sessionDescription: { flex: 1 },
});
