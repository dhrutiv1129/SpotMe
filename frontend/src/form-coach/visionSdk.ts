// MediaPipe's native browser bundle avoids Metro rewriting the SDK's internal dynamic WASM import.
// This is a type-only reference; Metro never bundles the SDK's ESM implementation.
type VisionSdk = Pick<
  typeof import("@mediapipe/tasks-vision"),
  "FilesetResolver" | "PoseLandmarker"
>;
// Keep aligned with the exact dependency version in package.json.
export const VISION_VERSION = "1.2.3";
export const SDK_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VISION_VERSION}/vision_bundle.js`;
export const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VISION_VERSION}/wasm`;
let pending: Promise<VisionSdk> | null = null;
export function loadVisionSdk(): Promise<VisionSdk> {
  const global = window as Window & { Vision?: VisionSdk };
  if (global.Vision?.PoseLandmarker && global.Vision.FilesetResolver)
    return Promise.resolve(global.Vision);
  if (pending) return pending;
  pending = new Promise<VisionSdk>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.crossOrigin = "anonymous";
    const cleanup = () => {
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      script.remove();
    };
    const fail = () => {
      cleanup();
      reject(
        new Error(
          "The pose runtime could not be downloaded. Check your connection and retry.",
        ),
      );
    };
    const timer = setTimeout(fail, 30000);
    script.onload = () => {
      cleanup();
      if (global.Vision?.PoseLandmarker && global.Vision.FilesetResolver)
        resolve(global.Vision);
      else
        reject(new Error("The pose runtime did not initialize. Please retry."));
    };
    script.onerror = fail;
    document.head.appendChild(script);
  }).catch((error) => {
    pending = null;
    throw error;
  });
  return pending;
}
