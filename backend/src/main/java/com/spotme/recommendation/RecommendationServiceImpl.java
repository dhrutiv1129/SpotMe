package com.spotme.recommendation;

import com.spotme.recommendation.RecommendationCatalog.CatalogAlternative;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** Loads trusted catalog data and applies the filtering/ranking rules. */
public final class RecommendationServiceImpl implements RecommendationService {
  private final RecommendationCatalog catalog;
  private final AlternativeFilter filter = new AlternativeFilter();
  private final DifficultyRanker ranker = new DifficultyRanker();

  public RecommendationServiceImpl(RecommendationCatalog catalog) {
    this.catalog = Objects.requireNonNull(catalog);
  }

  @Override
  public List<AlternativeDTO> getAlternatives(
      long exerciseId, Set<String> availableEquipment, boolean beginnerOnly) {
    if (exerciseId <= 0) {
      throw new IllegalArgumentException("Exercise ID must be positive");
    }
    Objects.requireNonNull(availableEquipment, "Available equipment is required");
    var original = catalog.findExercise(exerciseId)
        .orElseThrow(() -> new ExerciseNotFoundException(exerciseId));
    Map<Long, CatalogAlternative> details = new HashMap<>();
    for (var candidate : Objects.requireNonNull(catalog.findAlternatives(exerciseId))) {
      if (candidate == null) {
        throw new IllegalArgumentException("Catalog alternatives must not contain null");
      }
      // One result per exercise; a stronger curated relationship wins duplicates.
      details.merge(candidate.exercise().option().id(), candidate,
          (prior, next) -> next.relevance() > prior.relevance() ? next : prior);
    }
    List<AlternativeCandidate> candidates = details.values().stream()
        .map(candidate -> new AlternativeCandidate(candidate.exercise().option(),
            candidate.relevance()))
        .toList();
    return ranker.topThree(filter.filter(
        original.option(), candidates, availableEquipment, beginnerOnly)).stream()
        .map(candidate -> {
          var detail = details.get(candidate.exercise().id()).exercise();
          var option = candidate.exercise();
          return new AlternativeDTO(option.id(), detail.name(), option.muscleGroups(),
              option.requiredEquipment(), option.difficulty(), detail.instructions(),
              candidate.relevance());
        }).toList();
  }
}
