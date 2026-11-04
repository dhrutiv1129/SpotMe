package com.spotme.analytics;

import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class AnalyticsController {
  private final StrengthAnalyticsService analytics;

  public AnalyticsController(StrengthAnalyticsService analytics) {
    this.analytics = analytics;
  }

  @GetMapping("/progress/{exerciseId}")
  public ExerciseProgressDTO progress(@PathVariable long exerciseId) {
    return analytics.getExerciseProgress(exerciseId);
  }

  @GetMapping("/records")
  public List<PersonalRecordDTO> records() {
    return analytics.getPersonalRecords();
  }
}
