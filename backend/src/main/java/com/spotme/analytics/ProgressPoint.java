package com.spotme.analytics;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

/** One completed workout's exercise metrics, including change from the prior workout. */
public record ProgressPoint(
    long workoutId, LocalDate date, BigDecimal volume,
    Optional<BigDecimal> estimatedOneRepMax, Optional<BigDecimal> oneRepMaxChange) {}
