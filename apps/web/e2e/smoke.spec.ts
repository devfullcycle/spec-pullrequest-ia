import { expect, test } from "@playwright/test";

test("a web abre", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Gerenciador de arquivos" }),
  ).toBeVisible();
});
