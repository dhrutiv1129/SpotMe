package com.spotme.analytics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.spotme.workout.SetHistoryEntry;
import com.spotme.workout.WorkoutService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class StrengthAnalyticsServiceTests {
  private final WorkoutService workouts = mock(WorkoutService.class);
  private final StrengthAnalyticsService analytics = new StrengthAnalyticsServiceImpl(workouts);

  @Test
  void assemblesChronologicalProgressAndChangeFromPreviousSession() {
    when(workouts.getSetHistory(5)).thenReturn(List.of(
        set(3, "2026-11-03", 5, 10, "90"),
        set(2, "2026-11-02", 5, 5, "60"),
        set(1, "2026-11-01", 5, 10, "30"),
        set(3, "2026-11-03", 5, 5, "60")));
    var progress = analytics.getExerciseProgress(5);
    assertThat(progress.exerciseId()).isEqualTo(5);
    assertThat(progress.points()).extracting(ProgressPoint::workoutId).containsExactly(1L, 2L, 3L);
    assertThat(progress.points()).extracting(ProgressPoint::volume)
        .containsExactly(new BigDecimal("300"), new BigDecimal("300"), new BigDecimal("1200"));
    assertThat(progress.points().getFirst().oneRepMaxChange()).isEmpty();
    assertThat(progress.points().get(1).estimatedOneRepMax()).hasValueSatisfying(
        value -> assertThat(value).isEqualByComparingTo("70"));
    assertThat(progress.points().get(1).oneRepMaxChange()).hasValueSatisfying(
        value -> assertThat(value).isEqualByComparingTo("30"));
    assertThat(progress.points().get(2).estimatedOneRepMax()).hasValueSatisfying(
        value -> assertThat(value).isEqualByComparingTo("120"));
    assertThat(progress.points().get(2).oneRepMaxChange()).hasValueSatisfying(
        value -> assertThat(value).isEqualByComparingTo("50"));
    assertThat(progress.records()).isPresent();
    assertThat(progress.records().orElseThrow().maxWorkoutVolume().value())
        .isEqualByComparingTo("1200");
    verify(workouts).getSetHistory(5);
  }

  @Test
  void keepsSameDayWorkoutsSeparateAndOrdersById() {
    when(workouts.getSetHistory(5)).thenReturn(List.of(
        set(9, "2026-11-02", 5, 1, "20"),
        set(4, "2026-11-02", 5, 1, "10")));
    assertThat(analytics.getExerciseProgress(5).points())
        .extracting(ProgressPoint::workoutId).containsExactly(4L, 9L);
  }

  @Test
  void bodyweightAndEmptyHistoryKeepEstimatesAbsent() {
    when(workouts.getSetHistory(5)).thenReturn(List.of(set(1, "2026-11-01", 5, 10, "0")));
    var bodyweight = analytics.getExerciseProgress(5);
    assertThat(bodyweight.points().getFirst().estimatedOneRepMax()).isEmpty();
    assertThat(bodyweight.points().getFirst().oneRepMaxChange()).isEmpty();
    assertThat(bodyweight.records().orElseThrow().estimatedOneRepMax()).isEmpty();
    when(workouts.getSetHistory(5)).thenReturn(List.of());
    var empty = analytics.getExerciseProgress(5);
    assertThat(empty.points()).isEmpty();
    assertThat(empty.records()).isEmpty();
  }

  @Test
  void returnsRecordsAcrossExercisesFromAuthenticatedHistory() {
    when(workouts.getAllSetHistory()).thenReturn(List.of(
        set(1, "2026-11-01", 9, 10, "100"),
        set(2, "2026-11-02", 5, 5, "60")));
    assertThat(analytics.getPersonalRecords()).extracting(PersonalRecordDTO::exerciseId)
        .containsExactly(5L, 9L);
    verify(workouts).getAllSetHistory();
  }

  @Test
  void rejectsInvalidExerciseIdBeforeReadingHistory() {
    assertThatThrownBy(() -> analytics.getExerciseProgress(0))
        .isInstanceOf(IllegalArgumentException.class);
    verifyNoInteractions(workouts);
  }

  @Test
  void propagatesHistoryFailureAndRejectsMismatchedExercise() {
    var failure = new IllegalStateException("History unavailable");
    when(workouts.getSetHistory(5)).thenThrow(failure);
    assertThatThrownBy(() -> analytics.getExerciseProgress(5)).isSameAs(failure);
    doReturn(List.of(set(1, "2026-11-01", 9, 10, "20")))
        .when(workouts).getSetHistory(5);
    assertThatThrownBy(() -> analytics.getExerciseProgress(5))
        .isInstanceOf(IllegalArgumentException.class);
  }

  private static SetHistoryEntry set(long workoutId, String date, long exerciseId,
                                     int reps, String weight) {
    return new SetHistoryEntry(workoutId, LocalDate.parse(date), exerciseId, 1, 1,
        reps, new BigDecimal(weight));
  }
}
