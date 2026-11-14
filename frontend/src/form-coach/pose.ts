import type { Landmark } from "./landmarks";
import { checkAborted } from "./video";
import { loadVisionSdk, WASM_URL } from "./visionSdk";
export interface PoseEstimator {
  detect: (video: HTMLVideoElement, timestampMs: number) => Landmark[][];
  close: () => void;
}
export type PoseFactory = (signal: AbortSignal) => Promise<PoseEstimator>;
// Versioned public assets. Only the model/runtime are downloaded; no user frames leave the browser.
export const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export const createPoseEstimator: PoseFactory = async (signal) => {
  checkAborted(signal);
  const { FilesetResolver, PoseLandmarker } = await loadVisionSdk();
  checkAborted(signal);
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
  checkAborted(signal);
  // Use fetch with cancellation, instead of an uninterruptible model URL inside createFromOptions.
  const response = await fetch(MODEL_URL, { signal, credentials: "omit" });
  if (!response.ok)
    throw new Error(
      "The pose model could not be downloaded. Check your connection and retry.",
    );
  const model = new Uint8Array(await response.arrayBuffer());
  checkAborted(signal);
  const landmarker = await PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetBuffer: model, delegate: "CPU" },
    runningMode: "VIDEO",
    numPoses: 2,
    minPoseDetectionConfidence: 0.6,
    minPosePresenceConfidence: 0.6,
    minTrackingConfidence: 0.6,
    outputSegmentationMasks: false,
  });
  if (signal.aborted) {
    landmarker.close();
    checkAborted(signal);
  }
  return {
    detect: (video, timestamp) =>
      landmarker.detectForVideo(video, timestamp).landmarks,
    close: () => landmarker.close(),
  };
};
