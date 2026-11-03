package com.spotme.analytics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.spotme.workout.SetHistoryEntry;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

class VolumeCalculatorTests {
  private final VolumeCalculator calculator = new VolumeCalculator();

  @Test
  void calculatesSingleSetIncludingExactDecimalWeight() {
    assertThat(calculator.total(List.of(set(1, 5, "2026-11-01", 3, "2.125"))))
        .isEqualByComparingTo("6.375");
  }

  @Test
  void aggregatesSetsExercisesAndSessionsWithoutMultiplyingSetCountAgain() {
    var sets = List.of(set(1, 5, "2026-11-01", 10, "40"),
        set(1, 5, "2026-11-01", 8, "45"), set(1, 6, "2026-11-01", 5, "20"),
        set(2, 5, "2026-11-02", 5, "50"));
    assertThat(calculator.total(sets)).isEqualByComparingTo("1110");
    assertThat(calculator.byExercise(sets).get(5L)).isEqualByComparingTo("1010");
    assertThat(calculator.byExercise(sets).get(6L)).isEqualByComparingTo("100");
    assertThat(calculator.byWorkout(sets).get(1L)).isEqualByComparingTo("860");
    assertThat(calculator.byWorkout(sets).get(2L)).isEqualByComparingTo("250");
  }

  @Test
  void groupsSundayAndMondayAcrossYearBoundary() {
    var totals = calculator.byWeek(List.of(set(1, 5, "2024-12-29", 10, "10"),
        set(2, 5, "2024-12-30", 5, "20"), set(3, 5, "2025-01-01", 2, "25")));
    assertThat(totals.keySet()).containsExactly(LocalDate.parse("2024-12-23"),
        LocalDate.parse("2024-12-30"));
    assertThat(totals.get(LocalDate.parse("2024-12-23"))).isEqualByComparingTo("100");
    assertThat(totals.get(LocalDate.parse("2024-12-30"))).isEqualByComparingTo("150");
    assertThatThrownBy(totals::clear).isInstanceOf(UnsupportedOperationException.class);
  }

  @Test
  void emptyHistoryHasZeroVolumeAndNoGroups() {
    assertThat(calculator.total(List.of())).isEqualByComparingTo("0");
    assertThat(calculator.byExercise(List.of())).isEmpty();
    assertThat(calculator.byWorkout(List.of())).isEmpty();
    assertThat(calculator.byWeek(List.of())).isEmpty();
  }

  @Test
  void bodyweightContributesZeroExternalLoad() {
    assertThat(calculator.total(List.of(set(1, 5, "2026-11-01", 10, "0"))))
        .isEqualByComparingTo("0");
  }

  @Test
  void rejectsInvalidHistoryRatherThanSilentlyIgnoringSets() {
    assertThatThrownBy(() -> calculator.total(null)).isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> calculator.total(Arrays.asList((SetHistoryEntry) null)))
        .isInstanceOf(IllegalArgumentException.class);
    for (var invalid : List.of(set(1, 5, "2026-11-01", 0, "10"),
        set(1, 5, "2026-11-01", -1, "10"), set(1, 5, "2026-11-01", 2, "-1"),
        new SetHistoryEntry(1, LocalDate.parse("2026-11-01"), 5, 1, 1, 2, null))) {
      assertThatThrownBy(() -> calculator.total(List.of(invalid)))
          .isInstanceOf(IllegalArgumentException.class);
      assertThatThrownBy(() -> calculator.byExercise(List.of(invalid)))
          .isInstanceOf(IllegalArgumentException.class);
    }
    assertThatThrownBy(() -> calculator.byWeek(List.of(
        new SetHistoryEntry(1, null, 5, 1, 1, 2, BigDecimal.ONE))))
        .isInstanceOf(IllegalArgumentException.class);
  }

  private static SetHistoryEntry set(long workout, long exercise, String date, int reps, String weight) {
    return new SetHistoryEntry(workout, LocalDate.parse(date), exercise, 1, 1,
        reps, new BigDecimal(weight));
  }
}
