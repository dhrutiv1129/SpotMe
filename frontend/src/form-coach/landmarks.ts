import { jointAngle } from "./angles";
import { DEFAULT_CONFIG, type AnalysisConfig } from "./config";
export interface Landmark {
  x: number;
  y: number;
  visibility?: number;
  presence?: number;
}
export interface PoseFrame {
  timestamp: number;
  poses: Landmark[][];
}
export interface AngleFrame {
  timestamp: number;
  knee: number | null;
  hip: number | null;
}
export type BodySide = "left" | "right";
const INDICES = { left: [11, 23, 25, 27], right: [12, 24, 26, 28] } as const;
function visible(p: Landmark | undefined, threshold: number): p is Landmark {
  return (
    !!p &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    p.x >= 0 &&
    p.x <= 1 &&
    p.y >= 0 &&
    p.y <= 1 &&
    Number.isFinite(p.visibility) &&
    p.visibility! >= threshold &&
    (p.presence === undefined ||
      (Number.isFinite(p.presence) && p.presence >= threshold))
  );
}
function sideScore(pose: Landmark[], side: BodySide, threshold: number) {
  const points = INDICES[side].map((i) => pose[i]);
  return points.every((p) => visible(p, threshold))
    ? points.reduce((sum, p) => sum + p.visibility!, 0) / points.length
    : 0;
}
/** Pick one side for the entire recording; never stitch left/right legs across frames. */
export function chooseSide(
  frames: readonly PoseFrame[],
  config: AnalysisConfig = DEFAULT_CONFIG,
): BodySide | null {
  let left = 0,
    right = 0;
  for (const frame of frames)
    if (frame.poses.length === 1) {
      left += sideScore(frame.poses[0], "left", config.visibility);
      right += sideScore(frame.poses[0], "right", config.visibility);
    }
  return left === 0 && right === 0 ? null : left >= right ? "left" : "right";
}
/** A conservative frontal-view heuristic, not a reliable camera-orientation classifier. */
export function looksFrontal(
  pose: Landmark[],
  aspect: number,
  config: AnalysisConfig = DEFAULT_CONFIG,
): boolean {
  if (![11, 12, 23, 24].every((i) => visible(pose[i], config.visibility)))
    return false;
  const shoulderY = (pose[11].y + pose[12].y) / 2;
  const hipY = (pose[23].y + pose[24].y) / 2;
  const torso = Math.abs(hipY - shoulderY);
  if (torso < 0.05) return false;
  const width =
    Math.max(
      Math.abs(pose[11].x - pose[12].x),
      Math.abs(pose[23].x - pose[24].x),
    ) * aspect;
  return width / torso > config.frontalWidthRatio;
}
export function measureFrame(
  frame: PoseFrame,
  side: BodySide | null,
  aspect: number,
  config: AnalysisConfig = DEFAULT_CONFIG,
): AngleFrame {
  const invalid = { timestamp: frame.timestamp, knee: null, hip: null };
  if (
    !side ||
    frame.poses.length !== 1 ||
    !Number.isFinite(aspect) ||
    aspect <= 0
  )
    return invalid;
  const pose = frame.poses[0];
  if (
    looksFrontal(pose, aspect, config) ||
    !sideScore(pose, side, config.visibility)
  )
    return invalid;
  // x and y are normalized to different dimensions. Correct aspect ratio before vector math.
  const [shoulder, hip, knee, ankle] = INDICES[side].map((i) => ({
    x: pose[i].x * aspect,
    y: pose[i].y,
  }));
  return {
    timestamp: frame.timestamp,
    knee: jointAngle(hip, knee, ankle),
    hip: jointAngle(shoulder, hip, knee),
  };
}
