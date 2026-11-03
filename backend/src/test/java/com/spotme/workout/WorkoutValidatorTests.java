package com.spotme.workout;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class WorkoutValidatorTests {
  private static final Clock CLOCK = Clock.fixed(
      Instant.parse("2026-11-03T00:30:00Z"), ZoneId.of("America/Los_Angeles"));
  private static final LocalDate TODAY = LocalDate.of(2026, 11, 2);
  private final WorkoutValidator validator = new WorkoutValidator(
      id -> id == 1 ? Optional.of(new ExerciseCatalog.ExerciseInfo(true))
          : id == 2 ? Optional.of(new ExerciseCatalog.ExerciseInfo(false)) : Optional.empty(),
      CLOCK);

  @Test
  void acceptsBodyweightAddedResistanceAndDecimalWeights() {
    assertThatCode(() -> validator.validate(new WorkoutRequest(TODAY, List.of(
        exercise(1L, set(10, "0.00"), set(8, "5.5")),
        exercise(2L, set(12, "40.25")))))).doesNotThrowAnyException();
    assertThatCode(() -> validator.validate(request(TODAY.minusDays(1), 2L, 1, "1")))
        .doesNotThrowAnyException();
  }

  static Stream<Arguments> invalidInputs() {
    String setPath = "exercises[0].sets[0]";
    return Stream.of(
        Arguments.of(null, "workout", "required"),
        Arguments.of(request(null, 1L, 10, "0"), "date", "required"),
        Arguments.of(request(TODAY.plusDays(1), 1L, 10, "0"), "date", "future_date"),
        Arguments.of(new WorkoutRequest(TODAY, null), "exercises", "required"),
        Arguments.of(new WorkoutRequest(TODAY, List.of()), "exercises", "required"),
        Arguments.of(new WorkoutRequest(TODAY, Arrays.asList((WorkoutRequest.ExerciseInput) null)),
            "exercises[0]", "required"),
        Arguments.of(request(TODAY, null, 10, "0"), "exercises[0].exerciseId", "invalid_id"),
        Arguments.of(request(TODAY, 0L, 10, "0"), "exercises[0].exerciseId", "invalid_id"),
        Arguments.of(request(TODAY, -1L, 10, "0"), "exercises[0].exerciseId", "invalid_id"),
        Arguments.of(request(TODAY, 99L, 10, "0"), "exercises[0].exerciseId", "unknown_exercise"),
        Arguments.of(new WorkoutRequest(TODAY, List.of(new WorkoutRequest.ExerciseInput(1L, null))),
            "exercises[0].sets", "required"),
        Arguments.of(new WorkoutRequest(TODAY, List.of(exercise(1L))),
            "exercises[0].sets", "required"),
        Arguments.of(new WorkoutRequest(TODAY, List.of(exercise(1L, (WorkoutRequest.SetInput) null))),
            setPath, "required"),
        Arguments.of(request(TODAY, 1L, null, "0"), setPath + ".reps", "invalid_reps"),
        Arguments.of(request(TODAY, 1L, 0, "0"), setPath + ".reps", "invalid_reps"),
        Arguments.of(request(TODAY, 1L, -1, "0"), setPath + ".reps", "invalid_reps"),
        Arguments.of(request(TODAY, 1L, 10, null), setPath + ".weight", "required"),
        Arguments.of(request(TODAY, 1L, 10, "-1"), setPath + ".weight", "negative_weight"),
        Arguments.of(request(TODAY, 2L, 10, "-1"), setPath + ".weight", "negative_weight"),
        Arguments.of(request(TODAY, 2L, 10, "0.00"), setPath + ".weight", "zero_weight"));
  }

  @ParameterizedTest
  @MethodSource("invalidInputs")
  void rejectsInvalidInputsWithFieldAndCode(WorkoutRequest request, String field, String code) {
    var exception = assertThrows(WorkoutValidationException.class, () -> validator.validate(request));
    assertThat(exception.violations()).singleElement().satisfies(error -> {
      assertThat(error.field()).isEqualTo(field);
      assertThat(error.code()).isEqualTo(code);
      assertThat(error.message()).isNotBlank();
    });
  }

  @Test
  void collectsErrorsAcrossExercisesAndSets() {
    var request = new WorkoutRequest(TODAY.plusDays(1), List.of(
        exercise(1L, set(0, "-2")), exercise(2L, set(5, "1"), set(1, "0"))));
    var exception = assertThrows(WorkoutValidationException.class, () -> validator.validate(request));
    assertThat(exception.violations()).extracting(error -> error.field()).containsExactly(
        "date", "exercises[0].sets[0].reps", "exercises[0].sets[0].weight",
        "exercises[1].sets[1].weight");
    assertThatThrownBy(() -> exception.violations().clear())
        .isInstanceOf(UnsupportedOperationException.class);
  }

  @Test
  void looksUpRepeatedExerciseOnlyOncePerValidation() {
    int[] calls = {0};
    var cachedValidator = new WorkoutValidator(id -> {
      calls[0]++;
      return Optional.of(new ExerciseCatalog.ExerciseInfo(true));
    }, CLOCK);
    var request = new WorkoutRequest(TODAY,
        List.of(exercise(1L, set(1, "0")), exercise(1L, set(2, "0"))));
    cachedValidator.validate(request);
    assertThat(calls[0]).isEqualTo(1);
    cachedValidator.validate(request);
    assertThat(calls[0]).isEqualTo(2);
  }

  @Test
  void doesNotDisguiseCatalogOutageAsInvalidInput() {
    var outage = new IllegalStateException("Catalog unavailable");
    var failingValidator = new WorkoutValidator(id -> { throw outage; }, CLOCK);
    assertThatThrownBy(() -> failingValidator.validate(request(TODAY, 1L, 10, "0")))
        .isSameAs(outage);
  }

  private static WorkoutRequest request(LocalDate date, Long id, Integer reps, String weight) {
    return new WorkoutRequest(date, List.of(exercise(id, set(reps, weight))));
  }

  private static WorkoutRequest.ExerciseInput exercise(Long id, WorkoutRequest.SetInput... sets) {
    return new WorkoutRequest.ExerciseInput(id, Arrays.asList(sets));
  }

  private static WorkoutRequest.SetInput set(Integer reps, String weight) {
    return new WorkoutRequest.SetInput(reps, weight == null ? null : new BigDecimal(weight));
  }
}
