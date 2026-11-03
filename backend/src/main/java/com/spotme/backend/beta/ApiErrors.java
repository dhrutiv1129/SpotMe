package com.spotme.backend.beta;

import com.spotme.recommendation.ExerciseNotFoundException;
import com.spotme.workout.WorkoutValidationException;
import java.util.*;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class ApiErrors {
  public record Error(int status, String message, Object errors) {}

  private ResponseEntity<Error> error(int status, String message, Object errors) {
    return ResponseEntity.status(status).body(new Error(status, message, errors));
  }

  @ExceptionHandler(WorkoutValidationException.class)
  public ResponseEntity<Error> validation(WorkoutValidationException ex) {
    return error(400, "Check your workout fields.", ex.violations());
  }

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<Error> status(ResponseStatusException ex) {
    return error(ex.getStatusCode().value(), ex.getReason(), List.of());
  }

  @ExceptionHandler({
    IllegalArgumentException.class,
    HttpMessageNotReadableException.class,
    MethodArgumentTypeMismatchException.class,
    MissingRequestHeaderException.class
  })
  public ResponseEntity<Error> malformed(Exception ex) {
    return error(
        400,
        ex instanceof IllegalArgumentException
            ? ex.getMessage()
            : "Invalid request. Check dates, fields, and numeric values.",
        List.of());
  }

  @ExceptionHandler({ExerciseNotFoundException.class, NoResourceFoundException.class})
  public ResponseEntity<Error> missing(Exception ex) {
    return error(404, "Not found.", List.of());
  }

  @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
  public ResponseEntity<Error> method(Exception ex) {
    return error(405, "Method not allowed.", List.of());
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<Error> unexpected(Exception ex) {
    // Do not log SQL, request bodies, tokens, or credentials.
    org.slf4j.LoggerFactory.getLogger(ApiErrors.class)
        .error("API failure type: {}", ex.getClass().getName());
    return error(500, "Unable to complete the request. Please retry.", List.of());
  }
}
