package com.spotme.consistency;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Collections;
import java.util.Map;
import java.util.TreeMap;

/** Derived counts and daily streaks for the authenticated user. */
public record ConsistencySummaryDTO(
    long totalWorkouts, int currentStreak, int longestStreak,
    Map<LocalDate, Long> weeklyCounts, Map<YearMonth, Long> monthlyCounts) {
  public ConsistencySummaryDTO {
    weeklyCounts = Collections.unmodifiableMap(new TreeMap<>(weeklyCounts));
    monthlyCounts = Collections.unmodifiableMap(new TreeMap<>(monthlyCounts));
  }
}
