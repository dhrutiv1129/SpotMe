package com.spotme.consistency;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.TreeSet;

/** Daily workout streaks based on completed local calendar dates. */
public final class StreakCalculator {
  public record Streaks(int current, int longest) {}

  /**
   * A streak is consecutive active dates. Today or yesterday can anchor the current streak;
   * a longer gap means the current streak is zero. Multiple workouts on one date count once.
   */
  public Streaks calculate(List<LocalDate> workoutDates, Clock clock) {
    Objects.requireNonNull(clock, "Clock is required");
    if (workoutDates == null || workoutDates.stream().anyMatch(Objects::isNull)) {
      throw new IllegalArgumentException("Workout dates must be present");
    }
    LocalDate today = LocalDate.now(clock);
    TreeSet<LocalDate> dates = new TreeSet<>(workoutDates);
    if (!dates.isEmpty() && dates.last().isAfter(today)) {
      throw new IllegalArgumentException("Completed workout date cannot be in the future");
    }
    int longest = 0;
    int run = 0;
    LocalDate prior = null;
    for (LocalDate date : dates) {
      run = prior != null && prior.plusDays(1).equals(date) ? run + 1 : 1;
      longest = Math.max(longest, run);
      prior = date;
    }
    int current = prior != null && !prior.isBefore(today.minusDays(1)) ? run : 0;
    return new Streaks(current, longest);
  }
}
