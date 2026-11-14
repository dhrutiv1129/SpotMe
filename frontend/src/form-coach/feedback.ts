import { DEFAULT_CONFIG, type AnalysisConfig } from "./config";
import type { AngleFrame, BodySide } from "./landmarks";
import { detectRepetitions, type Repetition } from "./repetitions";
export interface AnalysisResult {
  reliable: boolean;
  quality: "limited" | "good" | "unreliable";
  repetitions: Repetition[];
  averageMinimumKneeAngle: number | null;
  minimumAngleRange: number | null;
  consistent: boolean | null;
  validFrames: number;
  totalFrames: number;
  trackedRatio: number;
  side: BodySide | null;
  observations: string[];
}
export const TRACKING_WARNING =
  "We couldn't reliably track your movement. Try recording from the side with your full body visible.";
export function generateFeedback(
  frames: readonly AngleFrame[],
  side: BodySide | null,
  config: AnalysisConfig = DEFAULT_CONFIG,
): AnalysisResult {
  const validFrames = frames.filter(
    (f) =>
      Number.isFinite(f.knee) &&
      Number.isFinite(f.hip) &&
      f.knee !== null &&
      f.hip !== null &&
      f.knee >= 0 &&
      f.knee <= 180 &&
      f.hip >= 0 &&
      f.hip <= 180,
  ).length;
  const trackedRatio = frames.length ? validFrames / frames.length : 0;
  const reliable =
    side !== null &&
    validFrames >= config.minimumValidFrames &&
    trackedRatio >= config.minimumValidRatio;
  const detected = detectRepetitions(frames, config);
  const repetitions = reliable ? detected.repetitions : [];
  const minima = repetitions.map((r) => r.minimumKneeAngle);
  const averageMinimumKneeAngle = minima.length
    ? minima.reduce((a, b) => a + b, 0) / minima.length
    : null;
  const minimumAngleRange =
    minima.length >= 2 ? Math.max(...minima) - Math.min(...minima) : null;
  const consistent =
    minimumAngleRange === null
      ? null
      : minimumAngleRange <= config.consistencyDegrees;
  const observations: string[] = [];
  if (!reliable) observations.push(TRACKING_WARNING);
  else {
    if (!repetitions.length)
      observations.push(
        "We couldn't clearly identify a complete squat repetition. Begin standing, bend your knees within your intended range, and return to standing in view of the camera. This counter may not recognize smaller ranges of motion.",
      );
    if (consistent === false)
      observations.push(
        "Your knee bend varied between repetitions. Try keeping your movement consistent if that matches your intended range of motion.",
      );
    if (consistent === true)
      observations.push(
        "The minimum estimated knee angles were similar across the detected repetitions.",
      );
    if (detected.incompleteMovements > 0)
      observations.push(
        "We couldn't clearly detect a return to standing between some movements.",
      );
    if (detected.interruptedMovements > 0)
      observations.push(
        "Tracking was interrupted during some movements; those movements were not counted.",
      );
    if (trackedRatio < 0.9)
      observations.push(
        "Some frames were obscured or unsuitable and were excluded. Counts may be incomplete.",
      );
  }
  observations.push(
    "These are estimated joint angles: 180° represents an approximately straight knee. Smaller angles indicate more knee bend; they are not a prescribed depth.",
  );
  return {
    reliable,
    quality: !reliable
      ? "unreliable"
      : trackedRatio >= 0.9 && detected.interruptedMovements === 0
        ? "good"
        : "limited",
    repetitions,
    averageMinimumKneeAngle,
    minimumAngleRange,
    consistent,
    validFrames,
    totalFrames: frames.length,
    trackedRatio,
    side,
    observations,
  };
}
