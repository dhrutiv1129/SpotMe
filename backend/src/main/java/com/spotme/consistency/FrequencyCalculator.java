package com.spotme.consistency;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.function.Function;

/** Workout session counts; multiple sessions on a date each contribute one. */
public final class FrequencyCalculator {
  /** Week keys are the Monday of each ISO-style Monday–Sunday week. */
  public Map<LocalDate, Long> byWeek(List<LocalDate> workoutDates) {
    return count(workoutDates, date ->
        date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)));
  }

  /** Month keys include the year, so January in different years stays separate. */
  public Map<YearMonth, Long> byMonth(List<LocalDate> workoutDates) {
    return count(workoutDates, YearMonth::from);
  }

  private <K extends Comparable<? super K>> Map<K, Long> count(
      List<LocalDate> workoutDates, Function<LocalDate, K> key) {
    if (workoutDates == null || workoutDates.stream().anyMatch(Objects::isNull)) {
      throw new IllegalArgumentException("Workout dates must be present");
    }
    Map<K, Long> totals = new TreeMap<>();
    for (LocalDate date : workoutDates) {
      totals.merge(key.apply(date), 1L, Long::sum);
    }
    return Collections.unmodifiableMap(totals);
  }
}
