/** Experimental engineering thresholds, not targets or definitions of correct technique. */
export const DEFAULT_CONFIG = {
  fps: 10,
  visibility: 0.65,
  standingAngle: 160,
  leaveStandingAngle: 150,
  flexedAngle: 110,
  bottomExitAngle: 118,
  minimumRepSeconds: 0.8,
  minimumRepFrames: 7,
  standingFrames: 2,
  smoothingWindow: 3,
  maximumGapSeconds: 0.45,
  minimumValidFrames: 15,
  minimumValidRatio: 0.65,
  consistencyDegrees: 15,
  frontalWidthRatio: 0.65,
} as const;
export type AnalysisConfig = { [K in keyof typeof DEFAULT_CONFIG]: number };
export const RECORDING_INSTRUCTIONS =
  "Record from the side with your entire body visible. Keep the camera stationary, use good lighting, and perform 3–5 slow bodyweight squats.";
export const DISCLAIMER =
  "SpotMe Form Coach provides automated movement observations for educational purposes only. Results may be inaccurate due to camera angle, visibility, or pose-estimation limitations. Feedback does not guarantee safe or correct exercise form and is not a substitute for guidance from a qualified fitness professional.";
