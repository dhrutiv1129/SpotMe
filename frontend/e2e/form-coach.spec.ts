/// <reference types="node" />
import { test, expect, type Page } from "@playwright/test";
import { resolve } from "node:path";
import { DISCLAIMER } from "../src/form-coach/config";
import { SDK_URL } from "../src/form-coach/visionSdk";
import { MODEL_URL } from "../src/form-coach/pose";
const fixture = resolve(process.cwd(), "e2e/fixtures/flower.mp4");

async function openCoach(page: Page) {
  // Isolate Form Coach UI tests from account creation/rate limits; existing beta tests exercise real auth.
  await page.addInitScript(() =>
    sessionStorage.setItem("spotme-session", "form-coach-test-session"),
  );
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me")
      return route.fulfill({
        json: { id: 9001, email: "form-coach@example.com" },
      });
    if (path === "/api/exercises" || path === "/api/workouts")
      return route.fulfill({ json: [] });
    return route.abort();
  });
  await page.goto("/");
  await page.getByRole("tab", { name: "You", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Form Analysis · Bodyweight Squat",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Meet your movement." }),
  ).toBeVisible();
}
// Explicit synthetic landmarks used only by this test's intercepted SDK request.
const mockSdk = `window.Vision = {
  FilesetResolver: {forVisionTasks: async () => ({})},
  PoseLandmarker: {createFromOptions: async () => ({
    close() {window.__poseClosed = (window.__poseClosed || 0) + 1;},
    detectForVideo(video, timestamp) {
      const sequence = [175,175,175,175,155,145,130,115,100,100,100,115,130,145,165,165,165,175,175,175];
      const knee = sequence[Math.round(timestamp / 100) % sequence.length];
      const angle = knee * Math.PI / 180;
      const aspect = video.videoWidth / video.videoHeight;
      const pose = Array.from({length: 33}, () => ({x: 0.5, y: 0.5, visibility: 0.99}));
      for(let side = 0; side <= 1; side++) {
        const x = 0.48 + side * 0.01;
        pose[11+side] = {x, y: 0.1, visibility: 0.99};
        pose[23+side] = {x, y: 0.3, visibility: 0.99};
        pose[25+side] = {x, y: 0.5, visibility: 0.99};
        pose[27+side] = {x: x + 0.2 * Math.sin(angle) / aspect, y: 0.5 - 0.2 * Math.cos(angle), visibility: 0.99};
      }
      return {landmarks: [pose]};
    }
  })}
};`;

test("Form Coach rejects unsupported and unreadable files and can select another", async ({
  page,
}) => {
  await openCoach(page);
  const input = page.getByLabel("Upload Video", { exact: true });
  await expect(
    page.getByRole("button", { name: "Analyze Video", exact: true }),
  ).toBeDisabled();
  await input.setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not video"),
  });
  await expect(page.getByRole("alert")).toContainText(
    "Unsupported video format",
  );
  await input.setInputFiles({
    name: "broken.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("corrupt bytes"),
  });
  await expect(page.getByRole("alert")).toContainText("could not be decoded");
  await input.setInputFiles(fixture);
  await expect(page.getByLabel("Selected squat video preview")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "Remove video", exact: true }).click();
  await expect(page.getByLabel("Selected squat video preview")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Upload Video", exact: true }),
  ).toBeVisible();
});

test("explicit analysis, model failure, retry, measured results and cleanup", async ({
  page,
}) => {
  let sdkRequests = 0;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(SDK_URL, async (route) => {
    sdkRequests++;
    if (sdkRequests === 1) return route.abort();
    return route.fulfill({
      contentType: "text/javascript",
      headers: { "access-control-allow-origin": "*" },
      body: mockSdk,
    });
  });
  await page.route(MODEL_URL, (route) =>
    route.fulfill({
      headers: { "access-control-allow-origin": "*" },
      body: Buffer.from([0]),
    }),
  );
  await openCoach(page);
  await page.getByLabel("Upload Video", { exact: true }).setInputFiles(fixture);
  await expect(page.getByLabel("Selected squat video preview")).toBeVisible();
  expect(sdkRequests).toBe(0);
  await expect(
    page.getByRole("button", { name: "Analyze Video", exact: true }),
  ).toBeDisabled();
  await page.getByRole("checkbox").click();
  await expect(page.getByText(DISCLAIMER, { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Analyze Video", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "pose model could not load",
  );
  await page
    .getByRole("button", { name: "Retry Analysis", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "3 · Your movement observations" }),
  ).toBeVisible();
  await expect(page.getByText("Rep 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Rep 2", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Tracking quality: good", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as Window & { __poseClosed?: number }).__poseClosed,
    ),
  ).toBe(1);
  await expect(page.getByText(DISCLAIMER, { exact: true })).toHaveCount(2);
  await page.screenshot({
    path: `test-results/form-coach-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Analyze Another Video", exact: true })
    .click();
  await expect(page.getByLabel("Selected squat video preview")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "3 · Your movement observations" }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("cancelling model initialization allows a fresh upload", async ({
  page,
}) => {
  await page.route(SDK_URL, (route) =>
    route.fulfill({
      contentType: "text/javascript",
      headers: { "access-control-allow-origin": "*" },
      body: mockSdk,
    }),
  );
  await page.route(MODEL_URL, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route
      .fulfill({
        headers: { "access-control-allow-origin": "*" },
        body: Buffer.from([0]),
      })
      .catch(() => {});
  });
  await openCoach(page);
  await page.getByLabel("Upload Video", { exact: true }).setInputFiles(fixture);
  await page.getByRole("checkbox").click();
  await page
    .getByRole("button", { name: "Analyze Video", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cancel & remove video", exact: true })
    .click();
  await expect(page.getByLabel("Selected squat video preview")).toHaveCount(0);
  await page.getByLabel("Upload Video", { exact: true }).setInputFiles(fixture);
  await expect(page.getByLabel("Selected squat video preview")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Analyze Video", exact: true }),
  ).toBeDisabled();
});

test("real MediaPipe runtime processes a decoded no-person video", async ({
  page,
}) => {
  test.skip(
    process.env.FORM_COACH_REAL_MODEL !== "1",
    "Opt-in network/runtime smoke test, not exercise validation.",
  );
  test.setTimeout(120000);
  await openCoach(page);
  await page.getByLabel("Upload Video", { exact: true }).setInputFiles(fixture);
  await page.getByRole("checkbox").click();
  await page
    .getByRole("button", { name: "Analyze Video", exact: true })
    .click();
  await expect(
    page.getByText("Tracking quality: unreliable", { exact: true }),
  ).toBeVisible({ timeout: 90000 });
  await expect(
    page.getByText(
      "We couldn't reliably track your movement. Try recording from the side with your full body visible.",
      { exact: true },
    ),
  ).toBeVisible();
});
