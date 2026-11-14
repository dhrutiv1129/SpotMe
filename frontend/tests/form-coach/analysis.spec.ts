import { test, expect } from "@playwright/test";
import { jointAngle } from "../../src/form-coach/angles";
import { DEFAULT_CONFIG } from "../../src/form-coach/config";
import {
  chooseSide,
  measureFrame,
  type AngleFrame,
  type Landmark,
  type PoseFrame,
} from "../../src/form-coach/landmarks";
import { detectRepetitions } from "../../src/form-coach/repetitions";
import {
  generateFeedback,
  TRACKING_WARNING,
} from "../../src/form-coach/feedback";
import { analyzeVideo } from "../../src/form-coach/analyze";
import {
  validateVideoFile,
  validateVideoMetadata,
  MAX_VIDEO_BYTES,
  waitForVideo,
} from "../../src/form-coach/video";

const repeat = <T>(angle: T, count = 3) => Array<T>(count).fill(angle);
const cycle = (bottom = 100) => [
  ...repeat(175, 4),
  155,
  145,
  130,
  115,
  ...repeat(bottom),
  115,
  130,
  145,
  ...repeat(165),
  ...repeat(175),
];
const frames = (angles: (number | null)[]): AngleFrame[] =>
  angles.map((knee, i) => ({
    timestamp: i / 10,
    knee,
    hip: knee === null ? null : 150,
  }));
function pose(
  knee = 100,
  leftVisibility = 0.99,
  rightVisibility = 0.8,
): Landmark[] {
  const points = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: 0.99,
  }));
  const rad = (knee * Math.PI) / 180;
  for (const [offset, visibility] of [
    [0, leftVisibility],
    [1, rightVisibility],
  ]) {
    const x = 0.48 + offset * 0.01;
    points[11 + offset] = { x, y: 0.1, visibility };
    points[23 + offset] = { x, y: 0.3, visibility };
    points[25 + offset] = { x, y: 0.5, visibility };
    points[27 + offset] = {
      x: x + 0.2 * Math.sin(rad),
      y: 0.5 - 0.2 * Math.cos(rad),
      visibility,
    };
  }
  return points;
}

test.describe("joint angles", () => {
  test("straight, right, and acute joint angles", () => {
    expect(
      jointAngle({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }),
    ).toBeCloseTo(180);
    expect(
      jointAngle({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 }),
    ).toBeCloseTo(90);
    expect(
      jointAngle({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 1 }),
    ).toBeCloseTo(45);
  });
  test("missing, NaN, infinite and zero-length inputs are rejected", () => {
    for (const a of [
      undefined,
      null,
      { x: NaN, y: 1 },
      { x: Infinity, y: 0 },
      { x: 0, y: 0 },
    ])
      expect(jointAngle(a, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
  });
  test("floating point cosine boundaries and large finite coordinates stay finite", () => {
    expect(
      jointAngle({ x: 0.1, y: 0.1 }, { x: 0, y: 0 }, { x: 0.3, y: 0.3 }),
    ).toBeCloseTo(0, 4);
    expect(
      jointAngle(
        { x: 1e150, y: 1e150 },
        { x: 0, y: 0 },
        { x: -1e150, y: -1e150 },
      ),
    ).toBeCloseTo(180, 4);
  });
});

test.describe("landmark measurements", () => {
  test("chooses the most consistently visible side and measures both joints", () => {
    const input = [0, 1, 2].map((timestamp) => ({
      timestamp,
      poses: [pose(100, 0.4, 0.99)],
    }));
    expect(chooseSide(input)).toBe("right");
    const measured = measureFrame(input[0], "right", 1);
    expect(measured.knee).toBeCloseTo(100);
    expect(measured.hip).toBeCloseTo(180);
  });
  test("corrects non-square normalized coordinates for the source aspect ratio", () => {
    const points = pose(90);
    // A 45° vector in pixel space has dx twice smaller at aspect 2.
    points[27] = {
      x: points[25].x + 0.1,
      y: points[25].y - 0.2,
      visibility: 0.99,
    };
    expect(
      measureFrame({ timestamp: 0, poses: [points] }, "left", 2).knee,
    ).toBeCloseTo(45);
  });
  test("rejects absent confidence, clipped points, missing points and multiple people", () => {
    for (const bad of [
      { x: 0.5, y: 0.5 },
      { x: -0.2, y: 0.5, visibility: 1 },
      { x: 0.5, y: 0.5, visibility: 0.2 },
      { x: NaN, y: 0.5, visibility: 1 },
    ]) {
      const points = pose();
      points[25] = bad;
      expect(
        measureFrame({ timestamp: 0, poses: [points] }, "left", 1).knee,
      ).toBeNull();
    }
    expect(
      measureFrame({ timestamp: 0, poses: [] }, "left", 1).knee,
    ).toBeNull();
    expect(
      measureFrame({ timestamp: 0, poses: [pose(), pose()] }, "left", 1).knee,
    ).toBeNull();
    expect(
      measureFrame({ timestamp: 0, poses: [[]] }, "left", 1).knee,
    ).toBeNull();
    expect(chooseSide([{ timestamp: 0, poses: [] }])).toBeNull();
  });
  test("rejects obvious frontal shoulder separation", () => {
    const points = pose();
    points[11].x = 0.2;
    points[12].x = 0.8;
    expect(
      measureFrame({ timestamp: 0, poses: [points] }, "left", 1).knee,
    ).toBeNull();
  });
  test("does not substitute the opposite side during occlusion", () => {
    const input = [
      ...Array.from({ length: 10 }, (_, timestamp) => ({
        timestamp,
        poses: [pose(100)],
      })),
      { timestamp: 11, poses: [pose(100, 0.1, 1)] },
    ];
    const side = chooseSide(input);
    expect(side).toBe("left");
    expect(measureFrame(input.at(-1)!, side, 1).knee).toBeNull();
  });
});

test.describe("repetition state machine", () => {
  test("one complete squat", () => {
    const result = detectRepetitions(frames(cycle()));
    expect(result.repetitions).toHaveLength(1);
    expect(result.repetitions[0].minimumKneeAngle).toBeCloseTo(100);
  });
  test("three complete squats", () =>
    expect(
      detectRepetitions(frames([...cycle(), ...cycle(), ...cycle()]))
        .repetitions,
    ).toHaveLength(3));
  test("no movement", () =>
    expect(detectRepetitions(frames(repeat(175, 50))).repetitions).toHaveLength(
      0,
    ));
  test("a partial squat does not cross the experimental flexion threshold", () =>
    expect(
      detectRepetitions(
        frames([
          ...repeat(175, 4),
          150,
          140,
          ...repeat(125),
          145,
          160,
          ...repeat(175, 4),
        ]),
      ).repetitions,
    ).toHaveLength(0));
  test("an incomplete final repetition is excluded and reported", () => {
    const result = detectRepetitions(
      frames([...cycle(), ...repeat(175), 145, 130, ...repeat(95), 120, 135]),
    );
    expect(result.repetitions).toHaveLength(1);
    expect(result.incompleteMovements).toBe(1);
  });
  test("noisy observations retain counts with median smoothing", () => {
    const noisy = cycle().map((v, i) =>
      i === 8 ? 178 : v + [1, -2, 2, -1][i % 4],
    );
    expect(detectRepetitions(frames(noisy)).repetitions).toHaveLength(1);
  });
  test("a short missing-frame gap can be bridged but a long gap cannot", () => {
    const short = cycle();
    const shortFrames = frames(short);
    shortFrames[9] = { timestamp: 0.9, knee: null, hip: null };
    expect(detectRepetitions(shortFrames).repetitions).toHaveLength(1);
    const long = frames(cycle());
    for (let i = 8; i <= 14; i++)
      long[i] = { ...long[i], knee: null, hip: null };
    const result = detectRepetitions(long);
    expect(result.repetitions).toHaveLength(0);
    expect(result.interruptedMovements).toBe(1);
  });
  test("repeated threshold crossings and duplicated timestamps never double-count", () => {
    expect(
      detectRepetitions(
        frames([
          ...repeat(175, 4),
          ...Array.from({ length: 25 }, (_, i) => (i % 2 ? 149 : 151)),
          ...repeat(175, 4),
        ]),
      ).repetitions,
    ).toHaveLength(0);
    const repeated = frames(cycle()).flatMap((f) => [f, f, f]);
    expect(detectRepetitions(repeated).repetitions).toHaveLength(1);
  });
  test("starting while already squatting requires a later standing start", () => {
    const beginning = [...repeat(95, 5), 120, 145, ...repeat(175, 4)];
    expect(detectRepetitions(frames(beginning)).repetitions).toHaveLength(0);
    expect(
      detectRepetitions(frames([...beginning, ...cycle()])).repetitions,
    ).toHaveLength(1);
  });
  test("bouncing before returning upright yields one rep and a completion observation", () => {
    const result = detectRepetitions(
      frames([
        ...repeat(175, 4),
        145,
        130,
        ...repeat(95),
        ...repeat(130),
        ...repeat(95),
        130,
        145,
        ...repeat(175, 4),
      ]),
    );
    expect(result.repetitions).toHaveLength(1);
    expect(result.incompleteMovements).toBeGreaterThan(0);
  });
  test("very fast flexion spikes cannot count as a repetition", () => {
    expect(
      detectRepetitions(frames([...repeat(175, 4), 95, 95, ...repeat(175, 4)]))
        .repetitions,
    ).toHaveLength(0);
  });
});

test.describe("measured feedback", () => {
  test("consistent reps have real averages and measured ranges", () => {
    const result = generateFeedback(
      frames([...cycle(100), ...cycle(102), ...cycle(98)]),
      "left",
    );
    expect(result.repetitions).toHaveLength(3);
    expect(result.averageMinimumKneeAngle).toBeCloseTo(100);
    expect(result.consistent).toBe(true);
    expect(result.minimumAngleRange).toBeCloseTo(4);
  });
  test("inconsistent depth produces the variation observation", () => {
    const result = generateFeedback(
      frames([...cycle(90), ...cycle(108)]),
      "left",
    );
    expect(result.consistent).toBe(false);
    expect(result.observations.join(" ")).toContain(
      "Your knee bend varied between repetitions",
    );
  });
  test("incomplete return to standing is reported", () => {
    const result = generateFeedback(
      frames([...cycle(), ...repeat(175), 145, 130, ...repeat(95), 120]),
      "left",
    );
    expect(result.observations.join(" ")).toContain(
      "couldn't clearly detect a return to standing",
    );
  });
  test("insufficient reliable observations, low quality, and empty data give no invented counts", () => {
    for (const input of [
      [],
      frames([175, 100, 175]),
      frames([...cycle(), ...repeat(null, 80)]),
    ]) {
      const result = generateFeedback(input, "left");
      expect(result.reliable).toBe(false);
      expect(result.repetitions).toHaveLength(0);
      expect(result.averageMinimumKneeAngle).toBeNull();
      expect(result.observations).toContain(TRACKING_WARNING);
    }
  });
  test("a well tracked still video has zero completed reps, not a tracking failure", () => {
    const result = generateFeedback(frames(repeat(175, 40)), "left");
    expect(result.reliable).toBe(true);
    expect(result.repetitions).toHaveLength(0);
    expect(result.consistent).toBeNull();
  });
});

test.describe("video validation", () => {
  test("valid supported file, including a missing MIME with a recognized extension", () => {
    expect(
      validateVideoFile({ name: "squat.mp4", size: 1024, type: "video/mp4" }),
    ).toBe("video/mp4");
    expect(
      validateVideoFile({ name: "SQUAT.WEBM", size: 1024, type: "" }),
    ).toBe("video/webm");
    expect(() => validateVideoMetadata(30, 1920, 1080)).not.toThrow();
  });
  test("unsupported format and empty files", () => {
    for (const file of [
      { name: "a.txt", size: 10, type: "text/plain" },
      { name: "a.mp4", size: 10, type: "image/jpeg" },
      { name: "a.xyz", size: 10, type: "" },
      { name: "a.mp4", size: 0, type: "video/mp4" },
    ])
      expect(() => validateVideoFile(file)).toThrow();
  });
  test("oversized file and excessive duration", () => {
    expect(() =>
      validateVideoFile({
        name: "a.mp4",
        size: MAX_VIDEO_BYTES + 1,
        type: "video/mp4",
      }),
    ).toThrow(/50 MB/);
    expect(() => validateVideoMetadata(30.01, 100, 100)).toThrow(/30 seconds/);
  });
  test("corrupt/unreadable metadata, live streams, and missing dimensions", () => {
    for (const duration of [0, -1, NaN, Infinity])
      expect(() => validateVideoMetadata(duration, 100, 100)).toThrow(
        /could not be read/,
      );
    expect(() => validateVideoMetadata(10, 0, 0)).toThrow();
  });
  test("decode error, timeout and cancellation reject and remove video event listeners", async () => {
    const target = new EventTarget() as HTMLVideoElement;
    const failed = waitForVideo(target, "loadeddata");
    target.dispatchEvent(new Event("error"));
    await expect(failed).rejects.toThrow(/decoded/);
    await expect(
      waitForVideo(target, "loadeddata", undefined, 5),
    ).rejects.toThrow(/timed out/);
    const controller = new AbortController();
    const cancelled = waitForVideo(target, "seeked", controller.signal);
    controller.abort();
    await expect(cancelled).rejects.toThrow(/cancelled/);
    const success = waitForVideo(target, "seeked");
    target.dispatchEvent(new Event("seeked"));
    await success;
  });
});

test.describe("analysis orchestration with a mocked estimator", () => {
  function fakeVideo(duration = cycle().length / 10) {
    return {
      duration,
      videoWidth: 100,
      videoHeight: 100,
      currentTime: 0,
      readyState: 2,
    } as HTMLVideoElement;
  }
  const seek = async (video: HTMLVideoElement, seconds: number) => {
    video.currentTime = seconds;
  };
  test("samples about 10 FPS, uses one model, calculates actual landmark angles and closes it", async () => {
    let creations = 0,
      closed = 0,
      calls = 0;
    const input = cycle();
    const result = await analyzeVideo(fakeVideo(), {
      signal: new AbortController().signal,
      seek,
      createEstimator: async () => {
        creations++;
        return {
          detect: (_video, timestamp) => {
            calls++;
            return [pose(input[Math.round(timestamp / 100)])];
          },
          close: () => {
            closed++;
          },
        };
      },
    });
    expect(creations).toBe(1);
    expect(calls).toBe(input.length);
    expect(closed).toBe(1);
    expect(result.repetitions).toHaveLength(1);
    expect(result.averageMinimumKneeAngle).toBeCloseTo(100);
  });
  test("pose detection failure closes the model and gives a useful error", async () => {
    let closed = false;
    await expect(
      analyzeVideo(fakeVideo(), {
        signal: new AbortController().signal,
        seek,
        createEstimator: async () => ({
          detect: () => {
            throw new Error("GPU/runtime failure");
          },
          close: () => {
            closed = true;
          },
        }),
      }),
    ).rejects.toThrow(/Pose analysis could not finish/);
    expect(closed).toBe(true);
  });
  test("model download failure has a retryable message", async () => {
    await expect(
      analyzeVideo(fakeVideo(), {
        signal: new AbortController().signal,
        seek,
        createEstimator: async () => {
          throw new Error("offline");
        },
      }),
    ).rejects.toThrow(/pose model could not load/);
  });
  test("no visible pose returns unreliable tracking instead of a fake result", async () => {
    const result = await analyzeVideo(fakeVideo(), {
      signal: new AbortController().signal,
      seek,
      createEstimator: async () => ({ detect: () => [], close: () => {} }),
    });
    expect(result.reliable).toBe(false);
    expect(result.observations).toContain(TRACKING_WARNING);
  });
  test("cancellation between frames closes the runtime", async () => {
    const controller = new AbortController();
    let closed = false;
    await expect(
      analyzeVideo(fakeVideo(), {
        signal: controller.signal,
        seek,
        createEstimator: async () => ({
          detect: () => {
            controller.abort();
            return [pose()];
          },
          close: () => {
            closed = true;
          },
        }),
      }),
    ).rejects.toThrow(/cancelled/);
    expect(closed).toBe(true);
  });
});

test("cancelling model initialization returns promptly and disposes a late model", async () => {
  const controller = new AbortController();
  let closed = false;
  let resolveModel:
    ((value: { detect: () => never[]; close: () => void }) => void) | undefined;
  const promise = analyzeVideo(
    { duration: 2, videoWidth: 100, videoHeight: 100 } as HTMLVideoElement,
    {
      signal: controller.signal,
      createEstimator: () =>
        new Promise((resolve) => {
          resolveModel = resolve;
        }),
    },
  );
  controller.abort();
  await expect(promise).rejects.toThrow(/cancelled/);
  resolveModel!({
    detect: () => [],
    close: () => {
      closed = true;
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(closed).toBe(true);
});
