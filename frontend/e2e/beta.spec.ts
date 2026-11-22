import { test, expect } from "@playwright/test";

test("sign in, replace unavailable machine, save workout, reload, and see progress", async ({
  page,
}) => {
  const email = `beta-${Date.now()}@example.com`;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "New here? Create an account", exact: true })
    .click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("correct horse battery staple");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByText("Make today count.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Start a workout", exact: true })
    .click();
  const search = page.getByRole("textbox", {
    name: "Search exercises by name",
  });
  await page.getByRole("button", { name: "legs", exact: true }).click();
  await page.getByRole("button", { name: "dumbbell", exact: true }).click();
  await expect(
    page.getByText("1 exercise found", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Goblet squat", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Leg press", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Clear search and filters", exact: true })
    .click();
  await page.getByRole("tab", { name: "Progress", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Progress", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Progress", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "History", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Every session, saved.", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Workout", exact: true }).click();
  await search.fill("  LEG PRESS  ");
  await expect(
    page.getByText("1 exercise found", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Goblet squat", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Leg press", exact: true }).click();
  await search.fill("no-such-exercise");
  await expect(
    page.getByText(
      "No exercises match. Try another name or clear your filters.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Weight (lb)", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Clear search and filters", exact: true })
    .click();
  await expect(search).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Goblet squat", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Find alternatives", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Beginner alternatives only",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByLabel("Weight (lb)", { exact: true }).fill("95");
  await page.getByLabel("Reps", { exact: true }).fill("10");
  await page.getByRole("tab", { name: "Home", exact: true }).click();
  await page.getByRole("tab", { name: "Workout", exact: true }).click();
  await expect(page.getByLabel("Weight (lb)", { exact: true })).toHaveValue(
    "95",
  );
  await expect(page.getByLabel("Reps", { exact: true })).toHaveValue("10");
  await page.getByRole("button", { name: /Swap exercise/ }).click();
  await expect(
    page.getByRole("heading", { name: "Find an alternative", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Back to workout", exact: true })
    .click();
  await expect(page.getByLabel("Weight (lb)", { exact: true })).toHaveValue(
    "95",
  );
  await expect(page.getByLabel("Reps", { exact: true })).toHaveValue("10");
  await page.getByRole("button", { name: /Swap exercise/ }).click();
  await page
    .getByRole("button", { name: "Find alternatives", exact: true })
    .click();
  await page.getByRole("button", { name: /Swap an exercise/ }).click();
  await expect(
    page.getByText("Available equipment", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Find alternatives", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Find alternatives", exact: true })
    .click();
  await page.getByRole("radio", { name: /Goblet squat/ }).click();
  await page.getByRole("button", { name: /Learn goblet squat/ }).click();
  await page
    .getByRole("button", { name: /Use this exercise|Use goblet squat/i })
    .click();
  await page.getByLabel("Weight (lb)", { exact: true }).fill("25");
  await page.getByLabel("Reps", { exact: true }).fill("8");
  await page.getByRole("button", { name: /Log set 1/ }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "Continue workout", exact: true })
    .click();
  await expect(
    page.getByText("Goblet squat · 1 sets", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Review & finish", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Finish workout & save", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Workout saved", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "See progress for Goblet squat", exact: true })
    .click();
  await expect(
    page.getByText("Heaviest weight: 25 lb", { exact: true }),
  ).toBeVisible();
  const help = page.getByRole("button", {
    name: "What do these numbers mean?",
    exact: true,
  });
  await expect(
    page.getByRole("heading", {
      name: "Understanding your numbers",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(help).toHaveAttribute("aria-expanded", "false");
  await help.click();
  await expect(
    page.getByRole("heading", {
      name: "Understanding your numbers",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Hide explanations", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Understanding your numbers",
      exact: true,
    }),
  ).toHaveCount(0);

  await expect(
    page.getByText("Best session volume: 200 lb", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/beta-progress.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Back to home", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("correct horse battery staple");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByRole("button", { name: "Workout history", exact: true })
    .click();
  await expect(
    page.getByText("Goblet squat · 200 lb volume", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("a lost save response survives reload and retries without duplication", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "New here? Create an account", exact: true })
    .click();
  await page
    .getByLabel("Email", { exact: true })
    .fill(`retry-${Date.now()}@example.com`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("correct horse battery staple");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start a workout", exact: true })
    .click();
  await page.getByRole("button", { name: "Goblet squat", exact: true }).click();
  await page.getByLabel("Weight (lb)", { exact: true }).fill("30");
  await page.getByLabel("Reps", { exact: true }).fill("10");
  await page.getByRole("button", { name: /Log set 1/ }).click();
  await page
    .getByRole("button", { name: "Review & finish", exact: true })
    .click();
  let dropped = false;
  await page.route("**/api/workouts", async (route) => {
    if (route.request().method() === "POST" && !dropped) {
      dropped = true;
      const response = await route.fetch();
      expect(response.status()).toBe(201); // The server committed, but the client never receives the receipt.
      await route.abort();
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "Finish workout & save", exact: true })
    .click();
  await expect(page.getByText(/Could not reach SpotMe/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Keep training", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await page
    .getByRole("button", { name: "Confirm pending save", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Workout saved", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "View workout history", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /View workout \d+/ }),
  ).toHaveCount(1);
});
