import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  workers: 1,
  projects: [
    { name: "desktop" },
    { name: "phone", use: { viewport: { width: 390, height: 844 } } },
  ],
  use: {
    baseURL: process.env.WEB_URL || "http://localhost:8081",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    launchOptions:
      process.env.PLAYWRIGHT_CHANNEL === "chromium"
        ? {}
        : { channel: "chrome" },
  },
  webServer: [
    {
      command:
        "./mvnw --batch-mode spring-boot:run -Dspring-boot.run.arguments=--server.port=18080",
      cwd: "../backend",
      url: "http://localhost:18080/api/exercises",
      timeout: 180000,
      reuseExistingServer: !process.env.CI,
      env: {
        SPRING_DATASOURCE_URL:
          "jdbc:h2:mem:spotme-browser-tests;DB_CLOSE_DELAY=-1",
      },
    },
    {
      command: "npx expo start --web --host localhost --port 8081",
      url: "http://localhost:8081",
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
      env: { EXPO_PUBLIC_API_URL: "http://localhost:18080" },
    },
  ],
  reporter: "list",
});
