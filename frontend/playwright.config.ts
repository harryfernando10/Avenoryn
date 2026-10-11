import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const frontendDir = fileURLToPath(new URL(".", import.meta.url));
const backendDir = fileURLToPath(new URL("../backend", import.meta.url));
const backendEnv = readFileSync(`${backendDir}/.env`, "utf8");
const configuredUrl = backendEnv
  .split(/\r?\n/)
  .find((line) => line.startsWith("DATABASE_URL="))
  ?.slice("DATABASE_URL=".length)
  .trim()
  .replace(/^['"]|['"]$/g, "");

if (!configuredUrl) throw new Error("backend/.env must configure DATABASE_URL for isolated E2E startup.");
const testDatabase = new URL(configuredUrl);
if (testDatabase.hostname !== "localhost" || testDatabase.port !== "5432" || testDatabase.pathname !== "/lifeos") {
  throw new Error("Refusing E2E startup: expected the development URL shape localhost:5432/lifeos before deriving the isolated database target.");
}
testDatabase.pathname = "/avenoryn_test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  outputDir: "./test-results",
  use: {
    baseURL: "http://localhost:5174",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } },
    { name: "mobile-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: false, hasTouch: true } },
  ],
  webServer: [
    {
      command: "npm run dev",
      cwd: backendDir,
      url: "http://localhost:3002/api/health",
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        DATABASE_URL: testDatabase.toString(),
        PORT: "3002",
        FRONTEND_ORIGIN: "http://localhost:5174",
        PRIVATE_STORAGE_ROOT: `${backendDir}/.e2e-private-storage`,
        SESSION_SECRET: "avenoryn-playwright-test-secret-only-32-chars",
        AI_SERVICE_URL: "",
        AI_SERVICE_TOKEN: "",
      },
    },
    {
      command: "npm run dev -- --host localhost --port 5174 --strictPort",
      cwd: frontendDir,
      url: "http://localhost:5174/login",
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: "pipe",
      stderr: "pipe",
      env: { VITE_API_BASE_URL: "http://localhost:3002/api" },
    },
  ],
});
