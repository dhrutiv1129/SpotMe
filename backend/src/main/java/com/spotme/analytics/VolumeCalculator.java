package com.spotme.analytics;

import com.spotme.workout.SetHistoryEntry;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.Collections;
import java.util.function.Function;

/** External-load volume: sum(weight * reps), counting each supplied set exactly once. */
public final class VolumeCalculator {
  public BigDecimal total(List<SetHistoryEntry> sets) {
    requireHistory(sets);
    return sets.stream().map(this::setVolume).reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  public Map<Long, BigDecimal> byExercise(List<SetHistoryEntry> sets) {
    return group(sets, SetHistoryEntry::exerciseId);
  }

  public Map<Long, BigDecimal> byWorkout(List<SetHistoryEntry> sets) {
    return group(sets, SetHistoryEntry::workoutId);
  }

  /** Week keys are Monday dates, including ISO week boundaries crossing calendar years. */
  public Map<LocalDate, BigDecimal> byWeek(List<SetHistoryEntry> sets) {
    return group(sets, set -> {
      if (set.date() == null) {
        throw new IllegalArgumentException("Workout date is required for weekly volume");
      }
      return set.date().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    });
  }

  private <K extends Comparable<? super K>> Map<K, BigDecimal> group(
      List<SetHistoryEntry> sets, Function<SetHistoryEntry, K> key) {
    requireHistory(sets);
    Map<K, BigDecimal> totals = new TreeMap<>();
    for (var set : sets) {
      BigDecimal volume = setVolume(set);
      totals.merge(key.apply(set), volume, BigDecimal::add);
    }
    return Collections.unmodifiableMap(totals);
  }

  private BigDecimal setVolume(SetHistoryEntry set) {
    if (set == null) {
      throw new IllegalArgumentException("History must not contain null sets");
    }
    OneRepMaxCalculator.validate(set.weight(), set.reps());
    return set.weight().multiply(BigDecimal.valueOf(set.reps()));
  }

  private static void requireHistory(List<SetHistoryEntry> sets) {
    if (sets == null) {
      throw new IllegalArgumentException("Set history is required");
    }
  }
}
