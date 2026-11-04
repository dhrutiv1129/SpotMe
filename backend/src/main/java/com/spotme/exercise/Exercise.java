package com.spotme.exercise;

import java.util.List;

/** Shared catalog data returned by the exercise API. */
public record Exercise(
      long id,
      String name,
      String muscleGroup,
      List<String> requiredEquipment,
      String difficulty,
      boolean bodyweight,
      String instructions) {}
