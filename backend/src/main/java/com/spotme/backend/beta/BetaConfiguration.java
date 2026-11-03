package com.spotme.backend.beta;

import com.spotme.analytics.*;
import com.spotme.recommendation.*;
import com.spotme.workout.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Clock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
public class BetaConfiguration implements WebMvcConfigurer {
  private final Authentication auth;
  private final String[] origins;

  public BetaConfiguration(
      Authentication auth, @Value("${spotme.allowed-origins}") String origins) {
    this.auth = auth;
    this.origins = origins.split(",");
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry
        .addMapping("/api/**")
        .allowedOrigins(origins)
        .allowedMethods("GET", "POST", "OPTIONS")
        .allowedHeaders("Authorization", "Content-Type", "Idempotency-Key")
        .maxAge(3600);
  }

  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry
        .addInterceptor(
            new HandlerInterceptor() {
              @Override
              public boolean preHandle(
                  HttpServletRequest request, HttpServletResponse response, Object handler) {
                response.setHeader("Cache-Control", "no-store");
                response.setHeader("X-Content-Type-Options", "nosniff");
                if (request.getMethod().equals("OPTIONS")) return true;
                String path = request.getRequestURI();
                if (path.equals("/api/auth/register") || path.equals("/api/auth/login")) {
                  auth.throttle(request.getRemoteAddr());
                  return true;
                }
                auth.authenticate(request);
                return true;
              }
            })
        .addPathPatterns("/api/**");
  }

  @Bean
  public CurrentUser currentUser(HttpServletRequest request) {
    return () -> auth.current(request).id();
  }

  @Bean
  public WorkoutValidator workoutValidator(DatabaseAdapters db) {
    return new WorkoutValidator(db, Clock.systemUTC());
  }

  @Bean
  public WorkoutService workoutService(
      CurrentUser user, WorkoutValidator validator, DatabaseAdapters db) {
    return new WorkoutServiceImpl(user, validator, db, db);
  }

  @Bean
  public StrengthAnalyticsService strengthAnalyticsService(WorkoutService workouts) {
    return new StrengthAnalyticsServiceImpl(workouts);
  }

  @Bean
  public RecommendationService recommendationService(DatabaseAdapters db) {
    return new RecommendationServiceImpl(db);
  }
}
