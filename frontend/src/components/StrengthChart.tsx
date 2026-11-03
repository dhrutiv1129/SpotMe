import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '../theme';

export interface StrengthPoint {
  id: string;
  dateLabel: string;
  value: number;
}

interface Props {
  points: StrengthPoint[];
  minimum: number;
  maximum: number;
  ticks: Array<{id: string; value: number; label: string}>;
  dateLabels: Array<{id: string; label: string}>;
  accessibilityLabel: string;
}

const plotHeight = 112;
const inset = 6;

/** Plots the strength values returned by the backend. */
export function StrengthChart({points, minimum, maximum, ticks, dateLabels, accessibilityLabel}: Props) {
  const [width, setWidth] = useState(0);
  const range = maximum - minimum;
  const positions = points.map((point, index) => ({
    ...point,
    x: inset + (points.length > 1 ? index / (points.length - 1) : 0.5) * Math.max(0, width - inset * 2),
    y: inset + (range > 0 ? 1 - (point.value - minimum) / range : 0.5) * (plotHeight - inset * 2),
  }));

  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      <View style={styles.chart}>
        <View style={styles.axis}>
          {ticks.map((tick) => (
            <Text key={tick.id} style={[styles.tick, {top: inset + (range > 0 ? 1 - (tick.value - minimum) / range : 0.5) * (plotHeight - inset * 2) - 6}]}>{tick.label}</Text>
          ))}
        </View>
        <View style={styles.plot} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
          {ticks.map((tick) => (
            <View key={tick.id} style={[styles.grid, {top: inset + (range > 0 ? 1 - (tick.value - minimum) / range : 0.5) * (plotHeight - inset * 2)}]} />
          ))}
          {width > 0 && positions.slice(1).map((point, index) => {
            const previous = positions[index];
            const dx = point.x - previous.x;
            const dy = point.y - previous.y;
            const length = Math.hypot(dx, dy);
            return (
              <View key={point.id} style={[
                styles.line,
                {width: length, left: (previous.x + point.x - length) / 2, top: (previous.y + point.y) / 2 - 1.5, transform: [{rotate: `${Math.atan2(dy, dx)}rad`}]},
              ]} />
            );
          })}
          {width > 0 && positions.map((point) => (
            <View key={point.id} style={[styles.dot, {left: point.x - 3.5, top: point.y - 3.5}]} />
          ))}
        </View>
      </View>
      <View style={styles.dates}>
        {dateLabels.map((date) => <Text key={date.id} style={styles.date}>{date.label}</Text>)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {flexDirection: 'row', gap: 12},
  axis: {width: 23, height: plotHeight, position: 'relative'},
  tick: {position: 'absolute', color: colors.muted, fontSize: 10},
  plot: {flex: 1, height: plotHeight, position: 'relative'},
  grid: {position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.border},
  line: {position: 'absolute', height: 3, backgroundColor: colors.green, borderRadius: 2},
  dot: {position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green, borderWidth: 2, borderColor: colors.surface},
  dates: {paddingLeft: 35, marginTop: 14, flexDirection: 'row', justifyContent: 'space-between'},
  date: {fontSize: 10, color: colors.muted},
});
