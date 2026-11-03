package com.spotme.recommendation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.spotme.recommendation.ExerciseOption.Difficulty;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class RecommendationRulesTests {
  private final AlternativeFilter filter = new AlternativeFilter();
  private final DifficultyRanker ranker = new DifficultyRanker();
  private final ExerciseOption original = exercise(1, Set.of("chest"), Set.of("barbell"),
      Difficulty.INTERMEDIATE);

  @Test
  void filtersMuscleEquipmentOriginalAndBeginnerSuitability() {
    var candidates = List.of(
        candidate(1, "chest", "barbell", Difficulty.INTERMEDIATE, 100),
        candidate(2, "back", "dumbbell", Difficulty.BEGINNER, 100),
        candidate(3, "chest", "barbell", Difficulty.BEGINNER, 90),
        candidate(4, "chest", "dumbbell", Difficulty.ADVANCED, 95),
        candidate(5, "chest", "dumbbell", Difficulty.BEGINNER, 80));
    var result = filter.filter(original, candidates, Set.of("dumbbell"), true);
    assertThat(result).extracting(c -> c.exercise().id()).containsExactly(5L);
    assertThat(filter.filter(original, candidates, Set.of("dumbbell"), false))
        .extracting(c -> c.exercise().id()).containsExactly(4L, 5L);
  }

  @Test
  void requiresAllEquipmentButAllowsEquipmentFreeExercises() {
    var bodyweight = new AlternativeCandidate(
        exercise(2, Set.of("chest"), Set.of(), Difficulty.BEGINNER), 50);
    var mixed = new AlternativeCandidate(
        exercise(3, Set.of("chest"), Set.of("bench", "dumbbell"), Difficulty.BEGINNER), 80);
    assertThat(filter.filter(original, List.of(bodyweight, mixed), Set.of("bench"), true))
        .containsExactly(bodyweight);
    assertThat(filter.filter(original, List.of(bodyweight, mixed),
        Set.of("bench", "dumbbell"), true)).containsExactly(bodyweight, mixed);
  }

  @Test
  void matchingAnyTargetMuscleIsEnough() {
    var candidate = new AlternativeCandidate(
        exercise(2, Set.of("shoulders", "chest"), Set.of(), Difficulty.BEGINNER), 75);
    assertThat(filter.filter(original, List.of(candidate), Set.of(), true))
        .containsExactly(candidate);
  }

  @Test
  void ranksDifficultyThenRelevanceThenIdAndReturnsOnlyThree() {
    var candidates = List.of(candidate(9, "chest", "none", Difficulty.INTERMEDIATE, 99),
        candidate(5, "chest", "none", Difficulty.BEGINNER, 50),
        candidate(4, "chest", "none", Difficulty.BEGINNER, 50),
        candidate(3, "chest", "none", Difficulty.BEGINNER, 80),
        candidate(8, "chest", "none", Difficulty.ADVANCED, 100));
    assertThat(ranker.topThree(candidates)).extracting(c -> c.exercise().id())
        .containsExactly(3L, 4L, 5L);
    assertThat(ranker.topThree(List.of(candidates.get(2), candidates.get(3),
        candidates.get(1), candidates.get(0), candidates.get(4))))
        .extracting(c -> c.exercise().id()).containsExactly(3L, 4L, 5L);
  }

  @Test
  void returnsFewerThanThreeWhenCatalogHasFewerSuitableOptions() {
    var candidate = candidate(2, "chest", "dumbbell", Difficulty.BEGINNER, 80);
    assertThat(ranker.topThree(filter.filter(original, List.of(candidate),
        Set.of("dumbbell"), true))).containsExactly(candidate);
    assertThat(ranker.topThree(filter.filter(original, List.of(candidate),
        Set.of(), true))).isEmpty();
  }

  @Test
  void rejectsMalformedCatalogMetadataAndRelevance() {
    assertThatThrownBy(() -> exercise(0, Set.of("chest"), Set.of(), Difficulty.BEGINNER))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> exercise(2, Set.of(), Set.of(), Difficulty.BEGINNER))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> new AlternativeCandidate(original, 101))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> new AlternativeCandidate(original, -1))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void rejectsNullCandidateCollectionsAndEquipment() {
    assertThatThrownBy(() -> filter.filter(original, null, Set.of(), true))
        .isInstanceOf(NullPointerException.class);
    assertThatThrownBy(() -> filter.filter(original, List.of(), null, true))
        .isInstanceOf(NullPointerException.class);
    assertThatThrownBy(() -> ranker.topThree(null))
        .isInstanceOf(NullPointerException.class);
  }

  private static ExerciseOption exercise(long id, Set<String> muscles,
      Set<String> equipment, Difficulty difficulty) {
    return new ExerciseOption(id, muscles, equipment, difficulty);
  }

  private static AlternativeCandidate candidate(long id, String muscle, String equipment,
      Difficulty difficulty, int relevance) {
    return new AlternativeCandidate(exercise(id, Set.of(muscle), Set.of(equipment), difficulty),
        relevance);
  }
}
