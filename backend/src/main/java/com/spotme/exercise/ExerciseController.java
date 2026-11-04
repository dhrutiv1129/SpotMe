package com.spotme.exercise;

import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/exercises")
public class ExerciseController {
  private final JdbcExerciseCatalog catalog;

  public ExerciseController(JdbcExerciseCatalog catalog) {
    this.catalog = catalog;
  }

  @GetMapping
  public List<Exercise> exercises() {
    return catalog.exercises();
  }
}
