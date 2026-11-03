package com.spotme.recommendation;

import java.util.List;
import java.util.Set;

/** Returns suitable alternatives for an existing exercise. */
public interface RecommendationService {
  List<AlternativeDTO> getAlternatives(
      long exerciseId, Set<String> availableEquipment, boolean beginnerOnly);
}
