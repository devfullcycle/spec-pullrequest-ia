import { defineConfig, devices } from "@playwright/test";
import { requiredEnv } from "./e2e/support/env";

/*
 * Os testes rodam no serviço `playwright` do Compose, contra a web e a API reais, que já
 * têm de estar no ar (`pnpm dev` no contêiner `web` e `pnpm start:dev` no `api`).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: requiredEnv("WEB_URL"),
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
