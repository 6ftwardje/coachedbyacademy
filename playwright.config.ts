import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const baseURL =
  process.env.E2E_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:3000";
const hasStudentCredentials = Boolean(
  process.env.E2E_EMAIL && process.env.E2E_PASSWORD
);
const authFile = "output/playwright/.auth/student.json";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "output/playwright/test-results",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["line"],
    ["html", { outputFolder: "output/playwright/report", open: "never" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: "public-chromium",
      testMatch: /public\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    ...(hasStudentCredentials
      ? [
          {
            name: "student-auth-setup",
            testMatch: /auth\.setup\.ts/,
          },
          {
            name: "student-readonly",
            testMatch: /student-readonly\.spec\.ts/,
            dependencies: ["student-auth-setup"],
            use: {
              ...devices["Desktop Chrome"],
              storageState: authFile,
            },
          },
        ]
      : []),
  ],
});

export { authFile };
