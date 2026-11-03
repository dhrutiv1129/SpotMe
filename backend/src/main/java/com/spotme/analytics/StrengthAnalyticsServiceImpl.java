package com.spotme.analytics;

import com.spotme.workout.SetHistoryEntry;
import com.spotme.workout.WorkoutService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/** Assembles per-workout progress from the authenticated workout service. */
public final class StrengthAnalyticsServiceImpl implements StrengthAnalyticsService {
  private final WorkoutService workouts;
  private final OneRepMaxCalculator oneRepMax;
  private final VolumeCalculator volume;
  private final PersonalRecordFinder records;

  public StrengthAnalyticsServiceImpl(WorkoutService workouts) {
    this.workouts = Objects.requireNonNull(workouts);
    this.oneRepMax = new OneRepMaxCalculator();
    this.volume = new VolumeCalculator();
    this.records = new PersonalRecordFinder();
  }

  @Override
  public ExerciseProgressDTO getExerciseProgress(long exerciseId) {
    if (exerciseId <= 0) {
      throw new IllegalArgumentException("Exercise ID must be positive");
    }
    List<SetHistoryEntry> history = workouts.getSetHistory(exerciseId);
    Map<Long, List<SetHistoryEntry>> sessions = new HashMap<>();
    for (var set : history) {
      if (set == null || set.exerciseId() != exerciseId || set.workoutId() <= 0
          || set.date() == null) {
        throw new IllegalArgumentException("Set history contains invalid exercise or workout data");
      }
      sessions.computeIfAbsent(set.workoutId(), ignored -> new ArrayList<>()).add(set);
    }
    List<Session> sorted = new ArrayList<>();
    for (var entry : sessions.entrySet()) {
      List<SetHistoryEntry> sets = entry.getValue();
      LocalDate date = sets.getFirst().date();
      if (sets.stream().anyMatch(set -> !date.equals(set.date()))) {
        throw new IllegalArgumentException("Workout has inconsistent dates");
      }
      BigDecimal sessionVolume = volume.total(sets);
      Optional<BigDecimal> sessionMax = sets.stream()
          .map(set -> oneRepMax.calculate(set.weight(), set.reps()))
          .flatMap(Optional::stream).max(BigDecimal::compareTo);
      sorted.add(new Session(entry.getKey(), date, sessionVolume, sessionMax));
    }
    sorted.sort(Comparator.comparing(Session::date).thenComparingLong(Session::workoutId));
    List<ProgressPoint> points = new ArrayList<>();
    Optional<BigDecimal> previous = Optional.empty();
    for (var session : sorted) {
      Optional<BigDecimal> prior = previous;
      Optional<BigDecimal> change = session.estimatedOneRepMax()
          .flatMap(current -> prior.map(current::subtract));
      points.add(new ProgressPoint(session.workoutId(), session.date(), session.volume(),
          session.estimatedOneRepMax(), change));
      previous = session.estimatedOneRepMax();
    }
    Optional<PersonalRecordDTO> record = records.findRecords(history).stream().findFirst();
    return new ExerciseProgressDTO(exerciseId, points, record);
  }

  @Override
  public List<PersonalRecordDTO> getPersonalRecords() {
    return records.findRecords(workouts.getAllSetHistory());
  }

  private record Session(long workoutId, LocalDate date, BigDecimal volume,
                         Optional<BigDecimal> estimatedOneRepMax) {}
}
