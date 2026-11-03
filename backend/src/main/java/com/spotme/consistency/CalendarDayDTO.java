package com.spotme.consistency;

import java.time.LocalDate;
import java.util.List;

/** One local calendar date, including inactive dates and IDs for opening workouts. */
public record CalendarDayDTO(LocalDate date, int workoutCount, int intensity, List<Long> workoutIds) {
  public CalendarDayDTO {
    workoutIds = List.copyOf(workoutIds);
  }
}
