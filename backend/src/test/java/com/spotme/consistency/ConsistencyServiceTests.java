package com.spotme.consistency;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.spotme.workout.WorkoutResponse;
import com.spotme.workout.WorkoutService;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.Test;

class ConsistencyServiceTests {
  private static final Clock CLOCK = Clock.fixed(
      Instant.parse("2026-11-03T02:00:00Z"), ZoneId.of("America/Los_Angeles"));
  private final WorkoutService workouts = mock(WorkoutService.class);
  private final ConsistencyService service = new ConsistencyServiceImpl(workouts, CLOCK);

  @Test
  void summaryCountsSessionsButStreakCountsActiveDates() {
    when(workouts.getWorkoutHistory()).thenReturn(List.of(
        workout(3, "2026-11-02"), workout(2, "2026-11-02"),
        workout(1, "2026-11-01"), workout(4, "2026-10-20")));
    var result = service.getSummary();
    assertThat(result.totalWorkouts()).isEqualTo(4);
    assertThat(result.currentStreak()).isEqualTo(2);
    assertThat(result.longestStreak()).isEqualTo(2);
    assertThat(result.weeklyCounts()).containsEntry(LocalDate.parse("2026-11-02"), 2L)
        .containsEntry(LocalDate.parse("2026-10-26"), 1L)
        .containsEntry(LocalDate.parse("2026-10-19"), 1L);
    assertThat(result.monthlyCounts()).containsEntry(YearMonth.of(2026, 11), 3L)
        .containsEntry(YearMonth.of(2026, 10), 1L);
    assertThatThrownBy(result.weeklyCounts()::clear)
        .isInstanceOf(UnsupportedOperationException.class);
    verify(workouts).getWorkoutHistory();
  }

  @Test
  void calendarIncludesInactiveDaysAndSortedWorkoutIds() {
    when(workouts.getWorkoutHistory()).thenReturn(List.of(
        workout(7, "2024-02-29"), workout(3, "2024-02-29"),
        workout(2, "2024-02-01"), workout(9, "2024-03-01")));
    var days = service.getCalendar(YearMonth.of(2024, 2));
    assertThat(days).hasSize(29);
    assertThat(days.getFirst()).isEqualTo(new CalendarDayDTO(
        LocalDate.parse("2024-02-01"), 1, 1, List.of(2L)));
    assertThat(days.get(1)).isEqualTo(new CalendarDayDTO(
        LocalDate.parse("2024-02-02"), 0, 0, List.of()));
    assertThat(days.getLast()).isEqualTo(new CalendarDayDTO(
        LocalDate.parse("2024-02-29"), 2, 2, List.of(3L, 7L)));
    assertThatThrownBy(days::clear).isInstanceOf(UnsupportedOperationException.class);
    assertThatThrownBy(days.getLast().workoutIds()::clear)
        .isInstanceOf(UnsupportedOperationException.class);
  }

  @Test
  void heatmapIntensityCapsAtFiveWithoutLosingSessionCountOrIds() {
    when(workouts.getWorkoutHistory()).thenReturn(List.of(
        workout(1, "2026-11-02"), workout(2, "2026-11-02"),
        workout(3, "2026-11-02"), workout(4, "2026-11-02"),
        workout(5, "2026-11-02"), workout(6, "2026-11-02")));
    var day = service.getCalendar(YearMonth.of(2026, 11)).get(1);
    assertThat(day.workoutCount()).isEqualTo(6);
    assertThat(day.intensity()).isEqualTo(5);
    assertThat(day.workoutIds()).containsExactly(1L, 2L, 3L, 4L, 5L, 6L);
  }

  @Test
  void emptyHistoryProducesZeroSummaryAndCompleteInactiveMonth() {
    when(workouts.getWorkoutHistory()).thenReturn(List.of());
    var summary = service.getSummary();
    assertThat(summary.totalWorkouts()).isZero();
    assertThat(summary.currentStreak()).isZero();
    assertThat(summary.longestStreak()).isZero();
    assertThat(summary.weeklyCounts()).isEmpty();
    assertThat(summary.monthlyCounts()).isEmpty();
    assertThat(service.getCalendar(YearMonth.of(2026, 11))).hasSize(30)
        .allSatisfy(day -> assertThat(day.workoutCount()).isZero());
  }

  @Test
  void invalidMonthIsRejectedBeforeReadingHistory() {
    assertThatThrownBy(() -> service.getCalendar(null))
        .isInstanceOf(NullPointerException.class);
    verifyNoInteractions(workouts);
  }

  @Test
  void propagatesAuthenticationFailureAndRejectsMalformedHistory() {
    var denied = new IllegalStateException("Unauthenticated");
    when(workouts.getWorkoutHistory()).thenThrow(denied);
    assertThatThrownBy(service::getSummary).isSameAs(denied);
    assertThatThrownBy(() -> service.getCalendar(YearMonth.of(2026, 11))).isSameAs(denied);
  }

  @Test
  void rejectsDuplicateIdsAndFutureCompletedWorkouts() {
    when(workouts.getWorkoutHistory()).thenReturn(List.of(
        workout(1, "2026-11-01"), workout(1, "2026-11-02")));
    assertThatThrownBy(service::getSummary).isInstanceOf(IllegalArgumentException.class);
    when(workouts.getWorkoutHistory()).thenReturn(List.of(workout(2, "2026-11-03")));
    assertThatThrownBy(() -> service.getCalendar(YearMonth.of(2026, 11)))
        .isInstanceOf(IllegalArgumentException.class);
  }

  private static WorkoutResponse workout(long id, String date) {
    return new WorkoutResponse(id, LocalDate.parse(date), List.of());
  }
}
