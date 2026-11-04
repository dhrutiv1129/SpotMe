package com.spotme.recommendation;

import java.util.Set;

/** Display-ready exercise substitute with an ID the UI can select for a new workout. */
public record AlternativeDTO(
    long exerciseId, String name, Set<String> muscleGroups,
    Set<String> requiredEquipment, ExerciseOption.Difficulty difficulty,
    String instructions, int relevance) {
  public AlternativeDTO {
    muscleGroups = Set.copyOf(muscleGroups);
    requiredEquipment = Set.copyOf(requiredEquipment);
  }
}
