package com.spotme.recommendation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.spotme.recommendation.ExerciseOption.Difficulty;
import com.spotme.recommendation.RecommendationCatalog.CatalogAlternative;
import com.spotme.recommendation.RecommendationCatalog.CatalogExercise;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;

class RecommendationServiceTests {
  private final RecommendationCatalog catalog = mock(RecommendationCatalog.class);
  private final RecommendationService service = new RecommendationServiceImpl(catalog);
  private final CatalogExercise original = exercise(1, "Bench press", "chest", "barbell",
      Difficulty.INTERMEDIATE);

  @Test
  void loadsRanksAndReturnsDisplayReadyAlternatives() {
    when(catalog.findExercise(1)).thenReturn(Optional.of(original));
    when(catalog.findAlternatives(1)).thenReturn(List.of(
        alternative(5, "Advanced press", "chest", "dumbbell", Difficulty.ADVANCED, 95),
        alternative(3, "Easy press", "chest", "dumbbell", Difficulty.BEGINNER, 80),
        alternative(4, "Other press", "chest", "dumbbell", Difficulty.BEGINNER, 70),
        alternative(2, "Back row", "back", "dumbbell", Difficulty.BEGINNER, 100),
        alternative(6, "Machine press", "chest", "machine", Difficulty.BEGINNER, 90),
        alternative(7, "Medium press", "chest", "dumbbell", Difficulty.INTERMEDIATE, 85)));
    var result = service.getAlternatives(1, Set.of("dumbbell"), false);
    assertThat(result).extracting(AlternativeDTO::exerciseId).containsExactly(3L, 4L, 7L);
    assertThat(result.getFirst().name()).isEqualTo("Easy press");
    assertThat(result.getFirst().instructions()).isEqualTo("Do Easy press");
    assertThat(result.getFirst().requiredEquipment()).containsExactly("dumbbell");
    assertThat(result.getFirst().relevance()).isEqualTo(80);
    verify(catalog).findAlternatives(1);
  }

  @Test
  void beginnerOnlyAndDuplicateCatalogEdgesProduceOneSuitableResult() {
    when(catalog.findExercise(1)).thenReturn(Optional.of(original));
    when(catalog.findAlternatives(1)).thenReturn(List.of(
        alternative(3, "Easy press", "chest", "dumbbell", Difficulty.BEGINNER, 60),
        alternative(3, "Easy press", "chest", "dumbbell", Difficulty.BEGINNER, 80),
        alternative(4, "Advanced press", "chest", "dumbbell", Difficulty.ADVANCED, 99)));
    var result = service.getAlternatives(1, Set.of("dumbbell"), true);
    assertThat(result).hasSize(1);
    assertThat(result.getFirst().exerciseId()).isEqualTo(3);
    assertThat(result.getFirst().relevance()).isEqualTo(80);
  }

  @Test
  void emptyCandidateListReturnsNoFabricatedAlternatives() {
    when(catalog.findExercise(1)).thenReturn(Optional.of(original));
    when(catalog.findAlternatives(1)).thenReturn(List.of());
    assertThat(service.getAlternatives(1, Set.of(), true)).isEmpty();
  }

  @Test
  void rejectsNonpositiveIdWithoutCatalogCalls() {
    assertThatThrownBy(() -> service.getAlternatives(0, Set.of(), true))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> service.getAlternatives(-1, Set.of(), true))
        .isInstanceOf(IllegalArgumentException.class);
    verifyNoInteractions(catalog);
  }

  @Test
  void reportsUnknownExerciseWithoutLoadingCandidates() {
    when(catalog.findExercise(99)).thenReturn(Optional.empty());
    assertThatThrownBy(() -> service.getAlternatives(99, Set.of(), true))
        .isInstanceOf(ExerciseNotFoundException.class)
        .hasMessageContaining("99");
    verify(catalog).findExercise(99);
  }

  @Test
  void propagatesCatalogFailureAndRejectsMissingEquipmentInput() {
    var outage = new IllegalStateException("Catalog unavailable");
    when(catalog.findExercise(1)).thenThrow(outage);
    assertThatThrownBy(() -> service.getAlternatives(1, Set.of(), true)).isSameAs(outage);
    assertThatThrownBy(() -> service.getAlternatives(1, null, true))
        .isInstanceOf(NullPointerException.class);
  }

  private static CatalogAlternative alternative(long id, String name, String muscle,
      String equipment, Difficulty difficulty, int relevance) {
    return new CatalogAlternative(exercise(id, name, muscle, equipment, difficulty), relevance);
  }

  private static CatalogExercise exercise(long id, String name, String muscle,
      String equipment, Difficulty difficulty) {
    return new CatalogExercise(new ExerciseOption(id, Set.of(muscle), Set.of(equipment),
        difficulty), name, "Do " + name);
  }
}
