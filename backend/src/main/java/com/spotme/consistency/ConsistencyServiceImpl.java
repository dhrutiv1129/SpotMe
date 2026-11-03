package com.spotme.consistency;

import com.spotme.workout.WorkoutResponse;
import com.spotme.workout.WorkoutService;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** Reads owner-scoped workout history and prepares summary/calendar results. */
public final class ConsistencyServiceImpl implements ConsistencyService {
  private final WorkoutService workouts;
  private final Clock clock;
  private final StreakCalculator streaks = new StreakCalculator();
  private final FrequencyCalculator frequency = new FrequencyCalculator();

  public ConsistencyServiceImpl(WorkoutService workouts, Clock clock) {
    this.workouts = Objects.requireNonNull(workouts);
    this.clock = Objects.requireNonNull(clock);
  }

  @Override
  public ConsistencySummaryDTO getSummary() {
    List<WorkoutResponse> history = readHistory();
    List<LocalDate> dates = history.stream().map(WorkoutResponse::date).toList();
    var streak = streaks.calculate(dates, clock);
    return new ConsistencySummaryDTO(history.size(), streak.current(), streak.longest(),
        frequency.byWeek(dates), frequency.byMonth(dates));
  }

  @Override
  public List<CalendarDayDTO> getCalendar(YearMonth month) {
    Objects.requireNonNull(month, "Month is required");
    Map<LocalDate, List<Long>> idsByDate = new HashMap<>();
    for (var workout : readHistory()) {
      if (YearMonth.from(workout.date()).equals(month)) {
        idsByDate.computeIfAbsent(workout.date(), ignored -> new ArrayList<>())
            .add(workout.id());
      }
    }
    List<CalendarDayDTO> days = new ArrayList<>();
    for (int day = 1; day <= month.lengthOfMonth(); day++) {
      LocalDate date = month.atDay(day);
      List<Long> ids = idsByDate.getOrDefault(date, List.of()).stream()
          .sorted(Comparator.naturalOrder()).toList();
      // Intensity is a capped session count; the full count and IDs remain available.
      days.add(new CalendarDayDTO(date, ids.size(), Math.min(ids.size(), 5), ids));
    }
    return List.copyOf(days);
  }

  private List<WorkoutResponse> readHistory() {
    List<WorkoutResponse> history = Objects.requireNonNull(
        workouts.getWorkoutHistory(), "Workout history must not be null");
    Set<Long> ids = new HashSet<>();
    LocalDate today = LocalDate.now(clock);
    for (var workout : history) {
      if (workout == null || workout.id() <= 0 || !ids.add(workout.id())
          || workout.date() == null || workout.date().isAfter(today)) {
        throw new IllegalArgumentException("Workout history contains an invalid workout");
      }
    }
    return history;
  }
}
