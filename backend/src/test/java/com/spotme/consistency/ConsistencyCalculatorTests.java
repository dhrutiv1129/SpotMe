package com.spotme.consistency;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

class ConsistencyCalculatorTests {
  private static final Clock CLOCK = Clock.fixed(
      Instant.parse("2026-11-03T02:00:00Z"), ZoneId.of("America/Los_Angeles"));
  private final StreakCalculator streaks = new StreakCalculator();
  private final FrequencyCalculator frequency = new FrequencyCalculator();

  @Test
  void currentStreakUsesLocalTodayOrYesterdayAndDeduplicatesDates() {
    assertThat(streaks.calculate(List.of(date("2026-11-02"), date("2026-11-01"),
        date("2026-11-02")), CLOCK)).isEqualTo(new StreakCalculator.Streaks(2, 2));
    assertThat(streaks.calculate(List.of(date("2026-11-01"), date("2026-10-31")), CLOCK))
        .isEqualTo(new StreakCalculator.Streaks(2, 2));
  }

  @Test
  void gapResetsCurrentButRetainsLongestHistoricalStreak() {
    assertThat(streaks.calculate(List.of(date("2026-10-25"), date("2026-10-26"),
        date("2026-10-27"), date("2026-11-02")), CLOCK))
        .isEqualTo(new StreakCalculator.Streaks(1, 3));
    assertThat(streaks.calculate(List.of(date("2026-10-25"), date("2026-10-26")), CLOCK))
        .isEqualTo(new StreakCalculator.Streaks(0, 2));
  }

  @Test
  void unsortedDatesAndLeapDayFormConsecutiveStreak() {
    assertThat(streaks.calculate(List.of(date("2024-03-01"), date("2024-02-28"),
        date("2024-02-29")), CLOCK))
        .isEqualTo(new StreakCalculator.Streaks(0, 3));
  }

  @Test
  void emptyHistoryHasZeroStreaks() {
    assertThat(streaks.calculate(List.of(), CLOCK))
        .isEqualTo(new StreakCalculator.Streaks(0, 0));
  }

  @Test
  void rejectsFutureOrMissingCompletedDates() {
    assertThatThrownBy(() -> streaks.calculate(List.of(date("2026-11-03")), CLOCK))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> streaks.calculate(null, CLOCK))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> streaks.calculate(Arrays.asList((LocalDate) null), CLOCK))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> streaks.calculate(List.of(), null))
        .isInstanceOf(NullPointerException.class);
  }

  @Test
  void weeklyCountsUseMondayBucketsAndCountMultipleSessions() {
    var weekly = frequency.byWeek(List.of(date("2024-12-29"), date("2024-12-30"),
        date("2024-12-30"), date("2025-01-01")));
    assertThat(weekly).containsEntry(date("2024-12-23"), 1L)
        .containsEntry(date("2024-12-30"), 3L).hasSize(2);
    assertThatThrownBy(weekly::clear).isInstanceOf(UnsupportedOperationException.class);
  }

  @Test
  void monthlyCountsHandleLeapDayAndYearBoundaries() {
    var monthly = frequency.byMonth(List.of(date("2028-02-28"), date("2028-02-29"),
        date("2028-03-01"), date("2029-02-01")));
    assertThat(monthly).containsEntry(YearMonth.of(2028, 2), 2L)
        .containsEntry(YearMonth.of(2028, 3), 1L)
        .containsEntry(YearMonth.of(2029, 2), 1L);
  }

  @Test
  void emptyFrequencyAndMalformedInputAreExplicit() {
    assertThat(frequency.byWeek(List.of())).isEmpty();
    assertThat(frequency.byMonth(List.of())).isEmpty();
    assertThatThrownBy(() -> frequency.byWeek(null)).isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> frequency.byMonth(Arrays.asList((LocalDate) null)))
        .isInstanceOf(IllegalArgumentException.class);
  }

  private static LocalDate date(String value) {
    return LocalDate.parse(value);
  }
}
