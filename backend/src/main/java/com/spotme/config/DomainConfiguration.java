package com.spotme.config;

import com.spotme.analytics.StrengthAnalyticsService;
import com.spotme.analytics.StrengthAnalyticsServiceImpl;
import com.spotme.auth.CurrentUser;
import com.spotme.recommendation.RecommendationCatalog;
import com.spotme.recommendation.RecommendationService;
import com.spotme.recommendation.RecommendationServiceImpl;
import com.spotme.workout.*;
import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Explicitly assembles the framework-independent business services. */
@Configuration
public class DomainConfiguration {
  @Bean
  public WorkoutValidator workoutValidator(ExerciseCatalog catalog) {
    return new WorkoutValidator(catalog, Clock.systemUTC());
  }

  @Bean
  public WorkoutService workoutService(
      CurrentUser user, WorkoutValidator validator, WorkoutStore store, WorkoutHistoryReader history) {
    return new WorkoutServiceImpl(user, validator, store, history);
  }

  @Bean
  public StrengthAnalyticsService strengthAnalyticsService(WorkoutService workouts) {
    return new StrengthAnalyticsServiceImpl(workouts);
  }

  @Bean
  public RecommendationService recommendationService(RecommendationCatalog catalog) {
    return new RecommendationServiceImpl(catalog);
  }
}
