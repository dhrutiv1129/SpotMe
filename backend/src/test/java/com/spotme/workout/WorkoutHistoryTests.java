package com.spotme.workout;

import com.spotme.auth.CurrentUser;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class WorkoutHistoryTests {
  private final CurrentUser user = mock(CurrentUser.class);
  private final WorkoutHistoryReader reader = mock(WorkoutHistoryReader.class);
  private final WorkoutStore store = mock(WorkoutStore.class);
  private final ExerciseCatalog catalog = mock(ExerciseCatalog.class);
  private final WorkoutService service = new WorkoutServiceImpl(user,
      new WorkoutValidator(catalog, Clock.systemUTC()), store, reader);

  private void history(WorkoutResponse... workouts) {
    when(user.requireUserId()).thenReturn(7L);
    when(reader.findByUserId(7L)).thenReturn(java.util.Arrays.stream(workouts)
        .map(workout -> new WorkoutHistoryReader.OwnedWorkout(7L, workout)).toList());
  }

  @Test
  void returnsOnlyRequestedOwnersHistoryInStableNewestFirstOrder() {
    var older = workout(1, "2026-11-01");
    var newer = workout(2, "2026-11-02");
    var sameDay = workout(3, "2026-11-02");
    history(older, newer, sameDay);
    var result = service.getWorkoutHistory();
    assertThat(result).containsExactly(sameDay, newer, older);
    assertThatThrownBy(result::clear).isInstanceOf(UnsupportedOperationException.class);
    verify(reader).findByUserId(7L);
    verifyNoInteractions(store, catalog);
  }

  @Test
  void returnsEmptyReadModelsForEmptyHistory() {
    history();
    assertThat(service.getWorkoutHistory()).isEmpty();
    assertThat(service.getSetHistory(99)).isEmpty();
    assertThat(service.getWorkoutDates()).isEmpty();
  }

  @Test
  void filtersSetsAndPreservesOneBasedOrderAndDecimalWeights() {
    history(workout(1, "2026-11-01"), workout(2, "2026-11-02"));
    assertThat(service.getAllSetHistory()).hasSize(6)
        .extracting(SetHistoryEntry::exerciseId).containsExactly(1L, 5L, 5L, 1L, 5L, 5L);
    var sets = service.getSetHistory(5);
    assertThat(sets).containsExactly(
        new SetHistoryEntry(2, LocalDate.parse("2026-11-02"), 5, 2, 1, 8, new BigDecimal("40.25")),
        new SetHistoryEntry(2, LocalDate.parse("2026-11-02"), 5, 2, 2, 6, new BigDecimal("42.5")),
        new SetHistoryEntry(1, LocalDate.parse("2026-11-01"), 5, 2, 1, 8, new BigDecimal("40.25")),
        new SetHistoryEntry(1, LocalDate.parse("2026-11-01"), 5, 2, 2, 6, new BigDecimal("42.5")));
    assertThatThrownBy(sets::clear).isInstanceOf(UnsupportedOperationException.class);
    assertThat(service.getSetHistory(99)).isEmpty();
  }

  @Test
  void returnsDistinctDatesInAscendingOrder() {
    history(workout(1, "2026-11-02"), workout(2, "2026-11-01"), workout(3, "2026-11-02"));
    assertThat(service.getWorkoutDates()).containsExactly(
        LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-02"));
  }

  @Test
  void rejectsInvalidExerciseIdWithoutQueryingDatabase() {
    for (long id : new long[] {0, -1}) {
      assertThatThrownBy(() -> service.getSetHistory(id)).isInstanceOf(IllegalArgumentException.class);
    }
    verifyNoInteractions(reader);
  }

  @Test
  void rejectsUnauthenticatedReadsBeforeQuerying() {
    var denied = new IllegalStateException("Unauthenticated");
    when(user.requireUserId()).thenThrow(denied);
    assertThatThrownBy(service::getWorkoutHistory).isSameAs(denied);
    assertThatThrownBy(service::getWorkoutDates).isSameAs(denied);
    assertThatThrownBy(() -> service.getSetHistory(5)).isSameAs(denied);
    verifyNoInteractions(reader);
  }

  @Test
  void rejectsInvalidIdentityBeforeQuerying() {
    when(user.requireUserId()).thenReturn(0L);
    assertThatThrownBy(service::getWorkoutHistory).isInstanceOf(IllegalStateException.class);
    verifyNoInteractions(reader);
  }

  @Test
  void failsClosedWhenAdapterReturnsAnotherUsersWorkout() {
    when(user.requireUserId()).thenReturn(7L);
    when(reader.findByUserId(7L)).thenReturn(List.of(
        new WorkoutHistoryReader.OwnedWorkout(8L, workout(1, "2026-11-01"))));
    assertThatThrownBy(service::getWorkoutHistory).isInstanceOf(IllegalStateException.class);
    assertThatThrownBy(service::getWorkoutDates).isInstanceOf(IllegalStateException.class);
    assertThatThrownBy(() -> service.getSetHistory(5)).isInstanceOf(IllegalStateException.class);
  }

  @Test
  void propagatesDatabaseFailureRatherThanReturningEmptyHistory() {
    var failure = new IllegalStateException("Database unavailable");
    when(user.requireUserId()).thenReturn(7L);
    when(reader.findByUserId(7L)).thenThrow(failure);
    assertThatThrownBy(service::getWorkoutHistory).isSameAs(failure);
  }

  private static WorkoutResponse workout(long id, String date) {
    return new WorkoutResponse(id, LocalDate.parse(date), List.of(
        new WorkoutRequest.ExerciseInput(1L, List.of(new WorkoutRequest.SetInput(10, BigDecimal.ZERO))),
        new WorkoutRequest.ExerciseInput(5L, List.of(
            new WorkoutRequest.SetInput(8, new BigDecimal("40.25")),
            new WorkoutRequest.SetInput(6, new BigDecimal("42.5"))))));
  }
}
