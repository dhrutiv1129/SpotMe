import React from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Button} from '../components/WorkoutControls';
import {colors} from '../theme';

export interface WorkoutHistoryView {
  monthLabel: string;
  monthlyCountLabel: string;
  monthlyDescription: string;
  weeklyCountLabel: string;
  weeklyDescription: string;
  resultLabel: string;
  sections: Array<{
    id: string;
    title: string;
    sessions: Array<{
      sessionId: string;
      dayLabel: string;
      weekdayLabel: string;
      name: string;
      description: string;
      detailLabel: string;
      highlighted?: boolean;
    }>;
  }>;
  moreLabel?: string;
  footerLabel: string;
}

interface Props {
  history: WorkoutHistoryView;
  onBack: () => void;
  onViewSession: (sessionId: string) => void;
  onLoadMore?: () => void;
}

/** Shows workout dates and totals returned by the backend. */
export function WorkoutHistoryScreen({history, onBack, onViewSession, onLoadMore}: Props) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}>
        <Image source={require('../assets/back.png')} style={styles.backIcon} />
        <Text style={styles.backLabel}>Your progress</Text>
      </Pressable>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>Every session, saved.</Text>
        <Text style={styles.body}>Your workout history, newest first.</Text>
      </View>
      <View style={styles.summary}>
        <View style={styles.metric}>
          <Text style={styles.value}>{history.monthlyCountLabel}</Text>
          <Text style={styles.caption}>{history.monthlyDescription}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.value}>{history.weeklyCountLabel}</Text>
          <Text style={styles.caption}>{history.weeklyDescription}</Text>
        </View>
      </View>
      <View style={styles.heading}>
        <Text style={styles.month}>{history.monthLabel}</Text>
        <Text style={styles.body}>{history.resultLabel}</Text>
      </View>
      {history.sections.map((section) => (
        <View key={section.id} style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>{section.title}</Text>
          {section.sessions.map((session) => (
            <Pressable
              key={session.sessionId}
              accessibilityRole="button"
              accessibilityLabel={`View ${session.name}, ${session.weekdayLabel} ${session.dayLabel}`}
              onPress={() => onViewSession(session.sessionId)}
              style={styles.entry}
            >
              <View style={styles.date}>
                <Text style={[styles.day, session.highlighted && styles.highlight]}>{session.dayLabel}</Text>
                <Text style={styles.weekday}>{session.weekdayLabel}</Text>
              </View>
              <View style={styles.entryCopy}>
                <Text style={styles.entryTitle}>{session.name}</Text>
                <Text style={styles.caption}>{session.description}</Text>
                <Text style={[styles.caption, session.highlighted && styles.highlight]}>{session.detailLabel}</Text>
              </View>
              <Image source={require('../assets/chevron-right.png')} style={styles.chevron} />
            </Pressable>
          ))}
        </View>
      ))}
      {!!history.moreLabel && !!onLoadMore && <Button label={history.moreLabel} variant="secondary" onPress={onLoadMore} />}
      <Text style={styles.body}>{history.footerLabel}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  content: {paddingHorizontal: 22, paddingTop: 10, paddingBottom: 26, gap: 22},
  back: {minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12},
  backIcon: {width: 22, height: 22},
  backLabel: {color: colors.ink, fontSize: 15, fontWeight: '700'},
  heading: {gap: 8},
  title: {color: colors.ink, fontSize: 32, lineHeight: 36, letterSpacing: -1.2, fontWeight: '700'},
  body: {color: colors.muted, fontSize: 12, lineHeight: 18},
  summary: {backgroundColor: colors.pale, borderRadius: 22, padding: 18, flexDirection: 'row', gap: 20},
  metric: {flex: 1, gap: 5},
  value: {color: colors.ink, fontSize: 28, fontWeight: '700', letterSpacing: -0.8},
  caption: {color: colors.muted, fontSize: 11, lineHeight: 16},
  month: {color: colors.ink, backgroundColor: colors.surface, borderRadius: 14, padding: 14, fontSize: 14, fontWeight: '600'},
  section: {gap: 10},
  sectionTitle: {color: colors.ink, fontSize: 13, fontWeight: '700'},
  entry: {backgroundColor: colors.surface, padding: 14, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12},
  date: {width: 42, alignItems: 'center', gap: 3},
  day: {color: colors.ink, fontSize: 25, fontWeight: '700'},
  weekday: {color: colors.muted, fontSize: 10},
  entryCopy: {flex: 1, gap: 6},
  entryTitle: {color: colors.ink, fontSize: 15, fontWeight: '700'},
  highlight: {color: colors.green},
  chevron: {width: 16, height: 16},
});
