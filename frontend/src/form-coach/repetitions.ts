import { DEFAULT_CONFIG, type AnalysisConfig } from "./config";
import type { AngleFrame } from "./landmarks";
export type RepState = "STANDING" | "DESCENDING" | "BOTTOM" | "ASCENDING";
export interface Repetition {
  number: number;
  start: number;
  end: number;
  minimumKneeAngle: number;
  minimumHipAngle: number;
  validFrames: number;
}
export interface RepDetection {
  repetitions: Repetition[];
  incompleteMovements: number;
  interruptedMovements: number;
}
const validAngle = (angle: number | null) =>
  angle !== null && Number.isFinite(angle) && angle >= 0 && angle <= 180;

export function detectRepetitions(
  frames: readonly AngleFrame[],
  config: AnalysisConfig = DEFAULT_CONFIG,
): RepDetection {
  const repetitions: Repetition[] = [];
  let state: RepState = "STANDING",
    armed = false,
    standingRun = 0;
  let start = 0,
    minimumKnee = 180,
    minimumHip = 180,
    observations = 0;
  let incompleteMovements = 0,
    interruptedMovements = 0,
    lastValid: number | null = null;
  let lastTimestamp = -Infinity,
    window: number[] = [];
  let candidate = false,
    reachedBottom = false;
  const reset = () => {
    state = "STANDING";
    armed = false;
    standingRun = 0;
    window = [];
    candidate = false;
    reachedBottom = false;
    observations = 0;
  };
  for (const frame of frames) {
    if (!Number.isFinite(frame.timestamp) || frame.timestamp <= lastTimestamp)
      continue;
    lastTimestamp = frame.timestamp;
    if (
      lastValid !== null &&
      frame.timestamp - lastValid > config.maximumGapSeconds
    ) {
      if (candidate) interruptedMovements++;
      reset();
      lastValid = null;
    }
    if (!validAngle(frame.knee) || !validAngle(frame.hip)) continue;
    lastValid = frame.timestamp;
    window.push(frame.knee!);
    if (window.length > config.smoothingWindow) window.shift();
    const knee = [...window].sort((a, b) => a - b)[
      Math.floor(window.length / 2)
    ];
    if (!armed) {
      standingRun = knee >= config.standingAngle ? standingRun + 1 : 0;
      if (standingRun >= config.standingFrames) {
        armed = true;
        state = "STANDING";
      }
      continue;
    }
    if (state === "STANDING") {
      if (knee < config.leaveStandingAngle) {
        state = "DESCENDING";
        candidate = true;
        reachedBottom = false;
        start = frame.timestamp;
        minimumKnee = knee;
        minimumHip = frame.hip!;
        observations = 1;
        standingRun = 0;
      }
      continue;
    }
    observations++;
    minimumKnee = Math.min(minimumKnee, knee);
    minimumHip = Math.min(minimumHip, frame.hip!);
    if (state === "DESCENDING" && knee <= config.flexedAngle) {
      state = "BOTTOM";
      reachedBottom = true;
    }
    if (state === "BOTTOM" && knee >= config.bottomExitAngle)
      state = "ASCENDING";
    // A second descent without standing stays in the same movement, never a second rep.
    if (state === "ASCENDING" && knee <= config.flexedAngle) {
      state = "BOTTOM";
      incompleteMovements++;
    }
    standingRun = knee >= config.standingAngle ? standingRun + 1 : 0;
    if (standingRun >= config.standingFrames) {
      if (
        reachedBottom &&
        observations >= config.minimumRepFrames &&
        frame.timestamp - start >= config.minimumRepSeconds
      ) {
        repetitions.push({
          number: repetitions.length + 1,
          start,
          end: frame.timestamp,
          minimumKneeAngle: minimumKnee,
          minimumHipAngle: minimumHip,
          validFrames: observations,
        });
      }
      state = "STANDING";
      candidate = false;
      reachedBottom = false;
      standingRun = 0;
    }
  }
  if (candidate && reachedBottom) incompleteMovements++;
  return { repetitions, incompleteMovements, interruptedMovements };
}
