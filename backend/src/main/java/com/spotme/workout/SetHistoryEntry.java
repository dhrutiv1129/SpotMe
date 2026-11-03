package com.spotme.workout;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Read model for analytics; exercise order and set number are one-based within a workout. */
public record SetHistoryEntry(
    long workoutId, LocalDate date, long exerciseId, int exerciseOrder,
    int setNumber, int reps, BigDecimal weight) {}
