package com.spotme.workout;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;

class WorkoutServiceTests {
  private final CurrentUser user = mock(CurrentUser.class);
  private final WorkoutStore store = mock(WorkoutStore.class);
  private final ExerciseCatalog catalog = mock(ExerciseCatalog.class);
  private final WorkoutValidator validator = new WorkoutValidator(catalog,
      Clock.fixed(Instant.parse("2026-11-02T12:00:00Z"), ZoneOffset.UTC));
  private final WorkoutService service = new WorkoutServiceImpl(user, validator, store, mock(WorkoutHistoryReader.class));

  private void authenticated() {
    when(user.requireUserId()).thenReturn(7L);
    when(catalog.findById(1)).thenReturn(Optional.of(new ExerciseCatalog.ExerciseInfo(true)));
    when(catalog.findById(2)).thenReturn(Optional.of(new ExerciseCatalog.ExerciseInfo(false)));
  }

  @Test
  void savesForAuthenticatedOwnerAndReturnsIdDateAndOrderedValues() {
    authenticated();
    var request = validWorkout();
    when(store.save(7L, request)).thenReturn(42L);
    var response = service.createWorkout(request);
    assertThat(response.id()).isEqualTo(42L);
    assertThat(response.date()).isEqualTo(request.date());
    assertThat(response.exercises()).isEqualTo(request.exercises());
    verify(store).save(7L, request);
  }

  @Test
  void rejectsInvalidInputWithoutSaving() {
    authenticated();
    var invalid = new WorkoutRequest(LocalDate.of(2026, 11, 3), List.of());
    assertThatThrownBy(() -> service.createWorkout(invalid))
        .isInstanceOf(WorkoutValidationException.class);
    verifyNoInteractions(store);
  }

  @Test
  void rejectsNullWorkoutAndNullNestedElementsWithoutSaving() {
    authenticated();
    for (var request : Arrays.asList(null,
        new WorkoutRequest(LocalDate.of(2026, 11, 2),
            Arrays.asList((WorkoutRequest.ExerciseInput) null)),
        new WorkoutRequest(LocalDate.of(2026, 11, 2), List.of(
            new WorkoutRequest.ExerciseInput(1L, Arrays.asList((WorkoutRequest.SetInput) null)))))) {
      assertThatThrownBy(() -> service.createWorkout(request))
          .isInstanceOf(WorkoutValidationException.class);
    }
    verifyNoInteractions(store);
  }

  @Test
  void rejectsUnknownExerciseWithoutSaving() {
    authenticated();
    when(catalog.findById(1)).thenReturn(Optional.empty());
    assertThatThrownBy(() -> service.createWorkout(validWorkout()))
        .isInstanceOf(WorkoutValidationException.class);
    verifyNoInteractions(store);
  }

  @Test
  void unauthenticatedRequestNeverReachesCatalogOrStore() {
    var denied = new IllegalStateException("Not authenticated");
    when(user.requireUserId()).thenThrow(denied);
    assertThatThrownBy(() -> service.createWorkout(validWorkout())).isSameAs(denied);
    verifyNoInteractions(catalog, store);
  }

  @Test
  void rejectsInvalidAuthenticatedIdentityBeforeAccessingData() {
    when(user.requireUserId()).thenReturn(0L);
    assertThatThrownBy(() -> service.createWorkout(validWorkout()))
        .isInstanceOf(IllegalStateException.class);
    verifyNoInteractions(catalog, store);
  }

  @Test
  void propagatesStorageFailureWithoutReturningSuccess() {
    authenticated();
    var failure = new IllegalStateException("Database unavailable");
    when(store.save(eq(7L), any())).thenThrow(failure);
    assertThatThrownBy(() -> service.createWorkout(validWorkout())).isSameAs(failure);
  }

  @Test
  void rejectsInvalidSavedId() {
    authenticated();
    when(store.save(eq(7L), any())).thenReturn(0L);
    assertThatThrownBy(() -> service.createWorkout(validWorkout()))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("positive saved ID");
  }

  @Test
  void snapshotsInputAndReturnsImmutableCollections() {
    authenticated();
    var sets = new ArrayList<>(validWorkout().exercises().getFirst().sets());
    var exercises = new ArrayList<>(List.of(new WorkoutRequest.ExerciseInput(1L, sets)));
    var request = new WorkoutRequest(LocalDate.of(2026, 11, 2), exercises);
    when(store.save(eq(7L), any())).thenAnswer(invocation -> {
      WorkoutRequest saved = invocation.getArgument(1);
      sets.clear();
      exercises.clear();
      assertThat(saved.exercises()).hasSize(1);
      assertThat(saved.exercises().getFirst().sets()).hasSize(2);
      return 42L;
    });
    var response = service.createWorkout(request);
    assertThat(response.exercises().getFirst().sets()).hasSize(2);
    assertThatThrownBy(() -> response.exercises().clear())
        .isInstanceOf(UnsupportedOperationException.class);
    assertThatThrownBy(() -> response.exercises().getFirst().sets().clear())
        .isInstanceOf(UnsupportedOperationException.class);
  }

  private static WorkoutRequest validWorkout() {
    return new WorkoutRequest(LocalDate.of(2026, 11, 2), List.of(
        new WorkoutRequest.ExerciseInput(1L, List.of(
            new WorkoutRequest.SetInput(10, BigDecimal.ZERO),
            new WorkoutRequest.SetInput(8, new BigDecimal("5.25")))),
        new WorkoutRequest.ExerciseInput(2L, List.of(
            new WorkoutRequest.SetInput(6, new BigDecimal("40.5"))))));
  }
}
