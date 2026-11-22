import type { Exercise, Progress, Workout } from '../beta/api';
import type { StrengthProgressView } from '../screens/ProgressScreen';

export const formatStrengthNumber = (value: number | null | undefined) =>
  value == null
    ? '—'
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 });

export function strengthDate(value: string, full = false) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: full ? 'long' : 'short',
    ...(full ? { year: 'numeric' as const } : {}),
  });
}

export function buildStrengthProgress(
  exercise: Exercise,
  response: Progress,
  workouts: Workout[],
): StrengthProgressView {
  const finite = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value);
  const date = (value: unknown) =>
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(new Date(`${value}T12:00:00`).getTime());
  if (
    response.exerciseId !== exercise.id ||
    !Array.isArray(response.points) ||
    response.points.some(
      (point) =>
        !Number.isSafeInteger(point.workoutId) ||
        point.workoutId <= 0 ||
        !date(point.date) ||
        !finite(point.volume) ||
        point.volume < 0 ||
        (point.estimatedOneRepMax !== null &&
          (!finite(point.estimatedOneRepMax) ||
            point.estimatedOneRepMax < 0)) ||
        (point.oneRepMaxChange !== null && !finite(point.oneRepMaxChange)),
    )
  )
    throw new Error('Strength results could not be read. Please try again.');
  const records = response.records;
  if (
    records &&
    [
      records.maxWeight,
      records.maxWorkoutVolume,
      records.estimatedOneRepMax,
    ].some(
      (record) =>
        record &&
        (!finite(record.value) || record.value < 0 || !date(record.date)),
    )
  )
    throw new Error('Personal records could not be read. Please try again.');
  const points = [...response.points].sort(
    (a, b) => a.date.localeCompare(b.date) || a.workoutId - b.workoutId,
  );
  const latest = points[points.length - 1];
  const setsFor = (id: number) =>
    workouts
      .find((workout) => workout.id === id)
      ?.exercises.filter((item) => item.exerciseId === exercise.id)
      .flatMap((item) => item.sets) || [];
  const sets = latest ? setsFor(latest.workoutId) : [];
  const firstSet = sets[0];
  const identical =
    !!firstSet &&
    sets.every(
      (set) => set.weight === firstSet.weight && set.reps === firstSet.reps,
    );
  const chartPoints = points.flatMap((point, index) =>
    point.estimatedOneRepMax === null
      ? []
      : [
          {
            id: String(point.workoutId),
            dateLabel: strengthDate(point.date),
            value: point.estimatedOneRepMax,
            timestamp: new Date(`${point.date}T12:00:00`).getTime(),
            gapBefore:
              index > 0 && points[index - 1].estimatedOneRepMax === null,
          },
        ],
  );
  const values = chartPoints.map((point) => point.value);
  const low = values.length ? Math.min(...values) : 0;
  const high = values.length ? Math.max(...values) : 1;
  const padding = low === high ? Math.max(1, high * 0.1) : (high - low) * 0.1;
  const minimum = Math.max(0, low - padding);
  const maximum = high + padding;
  const firstTime = chartPoints[0]?.timestamp;
  const lastTime = chartPoints[chartPoints.length - 1]?.timestamp;
  const dateLabels =
    firstTime === undefined || lastTime === undefined
      ? []
      : firstTime === lastTime
        ? [
            {
              id: 'only',
              label: strengthDate(
                points.find(
                  (point) => String(point.workoutId) === chartPoints[0].id,
                )!.date,
              ),
            },
          ]
        : [firstTime, (firstTime + lastTime) / 2, lastTime].map(
            (time, index) => ({
              id: String(index),
              label: new Date(time).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
              }),
            }),
          );
  const estimate = latest?.estimatedOneRepMax ?? null;
  const recordedSet = firstSet
    ? `${formatStrengthNumber(firstSet.weight)} lb × ${firstSet.reps}`
    : '—';
  const record = records?.estimatedOneRepMax;
  const performance = (id: number, volume: number) => {
    const sets = setsFor(id);
    const first = sets[0];
    if (!first) return `${formatStrengthNumber(volume)} lb volume`;
    if (
      sets.every(
        (set) => set.weight === first.weight && set.reps === first.reps,
      )
    )
      return `${formatStrengthNumber(first.weight)} lb × ${first.reps} × ${sets.length} sets · ${formatStrengthNumber(volume)} lb volume`;
    return `${sets.length} logged sets · ${formatStrengthNumber(volume)} lb volume`;
  };
  return {
    exerciseId: String(exercise.id),
    exerciseName: exercise.name,
    periodLabel: 'All saved sessions',
    state:
      points.length === 0 ? 'empty' : points.length === 1 ? 'single' : 'trend',
    estimatedMaxLabel: formatStrengthNumber(estimate),
    unit: 'lb',
    hasEstimate: estimate !== null,
    latestDateLabel: latest ? strengthDate(latest.date, true) : '',
    changeLabel:
      !latest || latest.oneRepMaxChange === null
        ? ''
        : latest.oneRepMaxChange === 0
          ? 'Matched previous estimate'
          : `${latest.oneRepMaxChange > 0 ? '+' : ''}${formatStrengthNumber(latest.oneRepMaxChange)} lb vs previous session`,
    chart: {
      points: chartPoints,
      minimum,
      maximum,
      ticks: [maximum, (minimum + maximum) / 2, minimum].map(
        (value, index) => ({
          id: String(index),
          value,
          label: formatStrengthNumber(value),
        }),
      ),
      dateLabels,
      accessibilityLabel: `${exercise.name} estimated one-rep max in pounds. ${points.map((point) => `${strengthDate(point.date, true)}: ${point.estimatedOneRepMax === null ? 'no estimate' : formatStrengthNumber(point.estimatedOneRepMax) + ' lb'}`).join('. ')}`,
    },
    actualSet:
      identical && estimate !== null
        ? {
            ...firstSet,
            weightLabel: `${formatStrengthNumber(firstSet.weight)} lb`,
            repsLabel: `${firstSet.reps} reps`,
          }
        : undefined,
    estimatedSet:
      identical && estimate !== null
        ? {
            weight: estimate,
            reps: 1,
            weightLabel: `${formatStrengthNumber(estimate)} lb`,
            repsLabel: '1 rep',
          }
        : undefined,
    volumeLabel: latest ? `${formatStrengthNumber(latest.volume)} lb` : '—',
    volumeChangeLabel: sets.length
      ? `${sets.length} completed sets · ${strengthDate(latest.date)}`
      : latest
        ? strengthDate(latest.date)
        : '',
    bestSetLabel:
      points.length === 1 && firstSet
        ? recordedSet
        : record
          ? `${formatStrengthNumber(record.value)} lb`
          : '—',
    recordTitle:
      points.length === 1 && firstSet ? 'Recorded set' : 'Best estimated 1RM',
    bestSetDateLabel:
      points.length === 1 && firstSet
        ? strengthDate(latest.date)
        : record
          ? `Set on ${strengthDate(record.date)}`
          : 'No estimate recorded',
    recordMetrics: records
      ? [
          {
            id: 'weight',
            title: 'Heaviest external load',
            valueLabel: `${formatStrengthNumber(records.maxWeight.value)} lb`,
            dateLabel: strengthDate(records.maxWeight.date),
            workoutId: records.maxWeight.workoutId,
          },
          {
            id: 'volume',
            title: 'Best session volume',
            valueLabel: `${formatStrengthNumber(records.maxWorkoutVolume.value)} lb`,
            dateLabel: strengthDate(records.maxWorkoutVolume.date),
            workoutId: records.maxWorkoutVolume.workoutId,
          },
        ]
      : [],
    recentSessions: [...points]
      .reverse()
      .slice(0, 5)
      .map((point) => ({
        sessionId: String(point.workoutId),
        dateLabel: strengthDate(point.date),
        fullDateLabel: strengthDate(point.date, true),
        description: performance(point.workoutId, point.volume),
        estimatedMaxLabel:
          point.estimatedOneRepMax === null
            ? 'No estimate'
            : `${formatStrengthNumber(point.estimatedOneRepMax)} lb est.`,
      })),
  };
}
