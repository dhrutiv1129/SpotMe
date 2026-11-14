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
    page.getByRole("heading", { name: /You’ve got this/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Let’s get moving  →", exact: true })
    .click();
  await page.getByRole("button", { name: "Leg press", exact: true }).click();
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
    .getByRole("button", { name: "Continue workout  →", exact: true })
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
  await expect(
    page.getByText("Best session volume: 200 lb", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/beta-progress.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Today", exact: true }).click();
  await page.getByRole("tab", { name: "You", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("correct horse battery staple");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("tab", { name: "You", exact: true }).click();
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
    .getByRole("button", { name: "Let’s get moving  →", exact: true })
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

test("navigate the redesigned dashboard, gym setup and consistency calendar", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "New here? Create an account", exact: true })
    .click();
  await page
    .getByLabel("Email", { exact: true })
    .fill(`design-${Date.now()}@example.com`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("correct horse battery staple");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /You’ve got this/ }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/dashboard-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("tab", { name: "You", exact: true }).click();
  await page
    .getByRole("button", { name: "Your gym setup", exact: true })
    .click();
  await expect(
    page.getByText("What’s at your gym?", { exact: true }),
  ).toBeVisible();
  const equipment = page.getByRole("checkbox").first();
  const checked = await equipment.getAttribute("aria-checked");
  await equipment.click();
  await expect(equipment).toHaveAttribute(
    "aria-checked",
    checked === "true" ? "false" : "true",
  );
  await page.getByLabel("Search equipment").fill("nothing-matches");
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await page.getByLabel("Search equipment").fill("");
  await page
    .getByRole("button", { name: "✓  Use gym setup", exact: true })
    .click();
  await page.getByRole("tab", { name: "Progress", exact: true }).click();
  await page.getByText("Consistency", { exact: true }).click();
  await expect(
    page.getByText("Every visit counts.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Previous month", exact: true })
    .click();
  await page.getByRole("button", { name: "Next month", exact: true }).click();
  await page.screenshot({
    path: `test-results/calendar-${test.info().project.name}.png`,
    fullPage: true,
  });
});
