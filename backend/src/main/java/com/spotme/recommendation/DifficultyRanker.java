package com.spotme.recommendation;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/** Easiest first, higher relationship relevance next, then exercise ID for stable ties. */
public final class DifficultyRanker {
  public List<AlternativeCandidate> topThree(List<AlternativeCandidate> candidates) {
    Objects.requireNonNull(candidates);
    if (candidates.stream().anyMatch(Objects::isNull)) {
      throw new IllegalArgumentException("Candidates must not contain null");
    }
    return candidates.stream()
        .sorted(Comparator.comparing((AlternativeCandidate c) -> c.exercise().difficulty())
            .thenComparing(Comparator.comparingInt(AlternativeCandidate::relevance).reversed())
            .thenComparingLong(c -> c.exercise().id()))
        .limit(3)
        .toList();
  }
}
