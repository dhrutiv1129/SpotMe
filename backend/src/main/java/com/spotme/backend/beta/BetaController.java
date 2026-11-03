package com.spotme.backend.beta;

import com.spotme.analytics.*;
import com.spotme.recommendation.*;
import com.spotme.workout.*;
import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class BetaController {
  private final Authentication auth;
  private final DatabaseAdapters db;
  private final WorkoutService workouts;
  private final SaveWorkout saves;
  private final StrengthAnalyticsService analytics;
  private final RecommendationService recommendations;

  public BetaController(
      Authentication auth,
      DatabaseAdapters db,
      WorkoutService workouts,
      SaveWorkout saves,
      StrengthAnalyticsService analytics,
      RecommendationService recommendations) {
    this.auth = auth;
    this.db = db;
    this.workouts = workouts;
    this.saves = saves;
    this.analytics = analytics;
    this.recommendations = recommendations;
  }

  @PostMapping("/auth/register")
  @ResponseStatus(HttpStatus.CREATED)
  public Authentication.Session register(@RequestBody Authentication.Credentials body) {
    return auth.register(body);
  }

  @PostMapping("/auth/login")
  public Authentication.Session login(@RequestBody Authentication.Credentials body) {
    return auth.login(body);
  }

  @GetMapping("/auth/me")
  public Authentication.User me(HttpServletRequest request) {
    return auth.current(request);
  }

  @PostMapping("/auth/logout")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void logout(HttpServletRequest request) {
    auth.logout(request);
  }

  @GetMapping("/exercises")
  public List<DatabaseAdapters.Exercise> exercises() {
    return db.exercises();
  }

  @PostMapping("/workouts")
  @ResponseStatus(HttpStatus.CREATED)
  public WorkoutResponse save(
      @RequestHeader("Idempotency-Key") String key, @RequestBody WorkoutRequest body) {
    return saves.save(key, body);
  }

  @GetMapping("/workouts")
  public List<WorkoutResponse> history() {
    return workouts.getWorkoutHistory();
  }

  @GetMapping("/workouts/{id}")
  public WorkoutResponse detail(@PathVariable long id) {
    return workouts.getWorkoutHistory().stream()
        .filter(w -> w.id() == id)
        .findFirst()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workout not found."));
  }

  @GetMapping("/progress/{exerciseId}")
  public ExerciseProgressDTO progress(@PathVariable long exerciseId) {
    return analytics.getExerciseProgress(exerciseId);
  }

  @GetMapping("/records")
  public List<PersonalRecordDTO> records() {
    return analytics.getPersonalRecords();
  }

  @GetMapping("/exercises/{id}/alternatives")
  public List<AlternativeDTO> alternatives(
      @PathVariable long id,
      @RequestParam(defaultValue = "") Set<String> equipment,
      @RequestParam(defaultValue = "false") boolean beginnerOnly) {
    return recommendations.getAlternatives(id, equipment, beginnerOnly);
  }
}
