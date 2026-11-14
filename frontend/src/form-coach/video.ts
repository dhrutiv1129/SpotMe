export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 30;
const formats: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  ogv: "video/ogg",
  mov: "video/quicktime",
};
const mimeTypes = new Set(Object.values(formats).concat("video/x-m4v"));
export interface VideoFile {
  name: string;
  size: number;
  type: string;
}
export function validateVideoFile(file: VideoFile): string {
  if (!Number.isFinite(file.size) || file.size <= 0)
    throw new Error("This file is empty or unreadable. Choose another video.");
  if (file.size > MAX_VIDEO_BYTES)
    throw new Error("Choose a video smaller than 50 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const mime = file.type.toLowerCase().split(";")[0];
  if (mime && !mimeTypes.has(mime))
    throw new Error("Unsupported video format. Try an MP4 or WebM video.");
  if (!mime && !formats[extension])
    throw new Error("Unsupported video format. Try an MP4 or WebM video.");
  return mime || formats[extension];
}
export function validateVideoMetadata(
  duration: number,
  width: number,
  height: number,
) {
  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  )
    throw new Error(
      "This video could not be read. Try exporting it as MP4 or WebM.",
    );
  if (duration > MAX_VIDEO_SECONDS)
    throw new Error("Choose a video no longer than 30 seconds.");
}
export function checkAborted(signal?: AbortSignal) {
  if (signal?.aborted)
    throw new DOMException("Analysis cancelled.", "AbortError");
}
/** Every listener and timeout is removed on success, failure or cancellation. */
export function waitForVideo(
  video: HTMLVideoElement,
  event: "loadeddata" | "seeked",
  signal?: AbortSignal,
  timeoutMs = 15000,
  start?: () => void,
): Promise<void> {
  checkAborted(signal);
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener(event, done);
      video.removeEventListener("error", fail);
      signal?.removeEventListener("abort", cancel);
    };
    const done = () => {
      cleanup();
      resolve();
    };
    const fail = () => {
      cleanup();
      reject(
        new Error(
          "This video could not be decoded. Try another MP4 or WebM video.",
        ),
      );
    };
    const cancel = () => {
      cleanup();
      reject(new DOMException("Analysis cancelled.", "AbortError"));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          "Reading the video timed out. Try a shorter clip or a different format.",
        ),
      );
    }, timeoutMs);
    video.addEventListener(event, done, { once: true });
    video.addEventListener("error", fail, { once: true });
    signal?.addEventListener("abort", cancel, { once: true });
    try {
      start?.();
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}
export interface LoadedVideo {
  video: HTMLVideoElement;
  url: string;
  duration: number;
  dispose: () => void;
}
export async function loadVideo(
  file: File,
  signal?: AbortSignal,
): Promise<LoadedVideo> {
  const mime = validateVideoFile(file);
  checkAborted(signal);
  const video = document.createElement("video");
  if (!video.canPlayType(mime))
    throw new Error(
      "Your browser cannot play this format. Try MP4 (H.264) or WebM in a current browser.",
    );
  const url = URL.createObjectURL(file);
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  };
  try {
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    const loaded = waitForVideo(video, "loadeddata", signal, 15000, () => {
      video.src = url;
      video.load();
    });
    await loaded;
    checkAborted(signal);
    validateVideoMetadata(video.duration, video.videoWidth, video.videoHeight);
    return { video, url, duration: video.duration, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
export async function seekVideo(
  video: HTMLVideoElement,
  seconds: number,
  signal?: AbortSignal,
): Promise<void> {
  checkAborted(signal);
  if (Math.abs(video.currentTime - seconds) < 0.0001 && video.readyState >= 2)
    return;
  const seeked = waitForVideo(video, "seeked", signal, 15000, () => {
    video.currentTime = seconds;
  });
  await seeked;
  if (video.readyState < 2)
    throw new Error("A video frame could not be decoded. Try another video.");
}
