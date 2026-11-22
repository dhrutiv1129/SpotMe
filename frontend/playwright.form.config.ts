import { defineConfig } from "@playwright/test";
/** Logic tests run in Node; no browser, backend, network, or pose model required. */
export default defineConfig({
  testDir: "./tests/form-coach",
  workers: 1,
  reporter: "list",
});
