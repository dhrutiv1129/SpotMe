package com.spotme.analytics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.spotme.analytics.PersonalRecordDTO.Achievement;
import com.spotme.workout.SetHistoryEntry;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;

class PersonalRecordFinderTests {
  private final PersonalRecordFinder finder = new PersonalRecordFinder();

  @Test
  void firstSessionEstablishesRecordsAndWeakerLaterSessionRetainsThem() {
    var first = set(1, 5, "2026-11-01", 10, "60");
    var initial = finder.findRecords(List.of(first)).getFirst();
    check(initial.maxWeight(), "60", "2026-11-01", 1);
    check(initial.estimatedOneRepMax().orElseThrow(), "80", "2026-11-01", 1);
    check(initial.maxWorkoutVolume(), "600", "2026-11-01", 1);
    assertThat(finder.findRecords(List.of(first, set(2, 5, "2026-11-02", 5, "40"))))
        .containsExactly(initial);
  }

  @Test
  void updatesEachRecordIndependentlyWithItsOwnAchievementDate() {
    var records = finder.findRecords(List.of(
        set(1, 5, "2026-11-01", 1, "100"),
        set(2, 5, "2026-11-02", 1, "110"),
        set(3, 5, "2026-11-03", 10, "90"),
        set(4, 5, "2026-11-04", 10, "50"),
        new SetHistoryEntry(4, LocalDate.parse("2026-11-04"), 5, 2, 1, 10, new BigDecimal("50"))))
        .getFirst();
    check(records.maxWeight(), "110", "2026-11-02", 2);
    check(records.estimatedOneRepMax().orElseThrow(), "120", "2026-11-03", 3);
    check(records.maxWorkoutVolume(), "1000", "2026-11-04", 4);
  }

  @Test
  void equalRecordsKeepEarliestDateThenLowestIdRegardlessOfInputOrder() {
    var sets = new ArrayList<>(List.of(set(3, 5, "2026-11-02", 10, "60"),
        set(2, 5, "2026-11-01", 10, "60"), set(1, 5, "2026-11-01", 10, "60")));
    var original = finder.findRecords(sets);
    Collections.reverse(sets);
    assertThat(finder.findRecords(sets)).isEqualTo(original);
    var record = original.getFirst();
    check(record.maxWeight(), "60", "2026-11-01", 1);
    check(record.estimatedOneRepMax().orElseThrow(), "80", "2026-11-01", 1);
    check(record.maxWorkoutVolume(), "600", "2026-11-01", 1);
  }

  @Test
  void separatesExercisesAndWorkoutsRatherThanCombiningSameDaySessions() {
    var records = finder.findRecords(List.of(set(1, 9, "2026-11-01", 10, "100"),
        set(1, 5, "2026-11-01", 10, "10.25"), set(2, 5, "2026-11-01", 10, "20.5")));
    assertThat(records).extracting(PersonalRecordDTO::exerciseId).containsExactly(5L, 9L);
    check(records.getFirst().maxWorkoutVolume(), "205", "2026-11-01", 2);
    check(records.getLast().maxWorkoutVolume(), "1000", "2026-11-01", 1);
    assertThatThrownBy(records::clear).isInstanceOf(UnsupportedOperationException.class);
  }

  @Test
  void emptyHistoryReturnsNoRecords() {
    assertThat(finder.findRecords(List.of())).isEmpty();
  }

  @Test
  void bodyweightOnlyHasZeroExternalLoadRecordsAndNoOneRepMax() {
    var records = finder.findRecords(List.of(set(1, 5, "2026-11-01", 10, "0"))).getFirst();
    check(records.maxWeight(), "0", "2026-11-01", 1);
    check(records.maxWorkoutVolume(), "0", "2026-11-01", 1);
    assertThat(records.estimatedOneRepMax()).isEmpty();
    var weighted = finder.findRecords(List.of(set(1, 5, "2026-11-01", 10, "0"),
        set(2, 5, "2026-11-02", 1, "5"))).getFirst();
    check(weighted.estimatedOneRepMax().orElseThrow(), "5", "2026-11-02", 2);
  }

  @Test
  void rejectsMalformedHistoryRatherThanProducingMisleadingRecords() {
    assertThatThrownBy(() -> finder.findRecords(null)).isInstanceOf(IllegalArgumentException.class);
    for (var set : Arrays.asList(null, set(0, 5, "2026-11-01", 10, "10"),
        set(1, 0, "2026-11-01", 10, "10"), set(1, 5, "2026-11-01", 0, "10"),
        set(1, 5, "2026-11-01", 10, "-1"),
        new SetHistoryEntry(1, null, 5, 1, 1, 10, BigDecimal.ONE))) {
      assertThatThrownBy(() -> finder.findRecords(Arrays.asList(set)))
          .isInstanceOf(IllegalArgumentException.class);
    }
    assertThatThrownBy(() -> finder.findRecords(List.of(
        set(1, 5, "2026-11-01", 10, "10"), set(1, 9, "2026-11-02", 10, "10"))))
        .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("consistent date");
  }

  private static void check(Achievement achievement, String value, String date, long workoutId) {
    assertThat(achievement.value()).isEqualByComparingTo(value);
    assertThat(achievement.date()).isEqualTo(LocalDate.parse(date));
    assertThat(achievement.workoutId()).isEqualTo(workoutId);
  }

  private static SetHistoryEntry set(long workout, long exercise, String date, int reps, String weight) {
    return new SetHistoryEntry(workout, LocalDate.parse(date), exercise, 1, 1,
        reps, new BigDecimal(weight));
  }
}
