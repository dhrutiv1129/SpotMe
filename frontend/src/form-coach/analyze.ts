import { DEFAULT_CONFIG, type AnalysisConfig } from "./config";
import { generateFeedback, type AnalysisResult } from "./feedback";
import { chooseSide, measureFrame, type PoseFrame } from "./landmarks";
import type { PoseEstimator, PoseFactory } from "./pose";
import { checkAborted, seekVideo, validateVideoMetadata } from "./video";
export interface AnalysisStatus {
  stage: "model" | "frames" | "results";
  progress: number;
  message: string;
}
export interface AnalysisOptions {
  signal: AbortSignal;
  onStatus?: (status: AnalysisStatus) => void;
  createEstimator: PoseFactory;
  config?: AnalysisConfig;
  seek?: typeof seekVideo;
}
/** No React or MediaPipe dependency: tests can inject a decoder and estimator. */
export async function analyzeVideo(
  video: HTMLVideoElement,
  options: AnalysisOptions,
): Promise<AnalysisResult> {
  const {
    signal,
    onStatus,
    createEstimator,
    config = DEFAULT_CONFIG,
    seek = seekVideo,
  } = options;
  validateVideoMetadata(video.duration, video.videoWidth, video.videoHeight);
  checkAborted(signal);
  let estimator: PoseEstimator | undefined;
  // Bound model initialization, including SDK WASM work that does not support AbortSignal.
  const modelAbort = new AbortController();
  const cancel = () => modelAbort.abort();
  signal.addEventListener("abort", cancel, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    modelAbort.abort();
  }, 60000);
  let rejectInitialization: (() => void) | undefined;
  const interrupted = new Promise<never>((_, reject) => {
    rejectInitialization = () =>
      reject(new DOMException("Analysis cancelled.", "AbortError"));
    modelAbort.signal.addEventListener("abort", rejectInitialization, {
      once: true,
    });
  });
  try {
    onStatus?.({
      stage: "model",
      progress: 0,
      message: "Loading the pose model… Your video stays on this device.",
    });
    estimator = await Promise.race([
      createEstimator(modelAbort.signal).then((value) => {
        // A non-cancellable SDK initialization may finish after cancellation/timeout.
        if (modelAbort.signal.aborted) {
          value.close();
          checkAborted(modelAbort.signal);
        }
        return value;
      }),
      interrupted,
    ]);
    clearTimeout(timer);
    if (timedOut)
      throw new Error(
        "Loading the pose model timed out. Check your connection and retry.",
      );
    checkAborted(signal);
    const frames: PoseFrame[] = [];
    const count = Math.ceil(video.duration * config.fps);
    let previousDecodedTime = -1;
    for (let index = 0; index < count; index++) {
      checkAborted(signal);
      const timestamp = index / config.fps;
      await seek(video, timestamp, signal);
      checkAborted(signal);
      // Use the actual decoded seek position; never count duplicated/unchanged frames.
      const actualTime = video.currentTime;
      if (!Number.isFinite(actualTime) || actualTime <= previousDecodedTime)
        continue;
      previousDecodedTime = actualTime;
      const poses = estimator.detect(video, actualTime * 1000);
      frames.push({ timestamp: actualTime, poses });
      onStatus?.({
        stage: "frames",
        progress: (index + 1) / count,
        message: `Tracking movement · ${Math.round(((index + 1) / count) * 100)}%`,
      });
      // Inference is synchronous; yield between frames so progress and cancellation can render.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    checkAborted(signal);
    if (!frames.length)
      throw new Error("No video frames could be read. Try a different video.");
    onStatus?.({
      stage: "results",
      progress: 1,
      message: "Calculating joint angles and movement observations…",
    });
    const side = chooseSide(frames, config);
    const angles = frames.map((frame) =>
      measureFrame(frame, side, video.videoWidth / video.videoHeight, config),
    );
    return generateFeedback(angles, side, config);
  } catch (error) {
    if (signal.aborted) checkAborted(signal);
    if (timedOut)
      throw new Error(
        "Loading the pose model timed out. Check your connection and retry.",
      );
    if (!estimator)
      throw new Error(
        "The pose model could not load. Check your internet connection, allow model downloads, and retry.",
      );
    throw new Error(
      "Pose analysis could not finish. Try a shorter, readable video with one person fully visible.",
    );
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", cancel);
    if (rejectInitialization)
      modelAbort.signal.removeEventListener("abort", rejectInitialization);
    modelAbort.abort();
    estimator?.close();
  }
}
