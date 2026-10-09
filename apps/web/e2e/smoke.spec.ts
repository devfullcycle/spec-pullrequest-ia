import { expect, test } from "@playwright/test";

test("a web abre: sem Sessão, a página inicial leva à tela de entrar", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});
