package com.spotme.workout;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/workouts")
public class WorkoutController {
  private final WorkoutService workouts;
  private final SaveWorkout saves;

  public WorkoutController(WorkoutService workouts, SaveWorkout saves) {
    this.workouts = workouts;
    this.saves = saves;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public WorkoutResponse save(
      @RequestHeader("Idempotency-Key") String key, @RequestBody WorkoutRequest body) {
    return saves.save(key, body);
  }

  @GetMapping
  public List<WorkoutResponse> history() {
    return workouts.getWorkoutHistory();
  }

  @GetMapping("/{id}")
  public WorkoutResponse detail(@PathVariable long id) {
    return workouts.getWorkoutHistory().stream()
        .filter(w -> w.id() == id)
        .findFirst()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workout not found."));
  }
}
