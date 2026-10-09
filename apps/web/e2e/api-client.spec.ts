import { expect, test } from "@playwright/test";

test("o erro da API chega tipado pelo code e traduzido", async ({ page }) => {
  await page.goto("/vitrine/api");

  await expect(page.getByTestId("code")).toHaveText("not_found");
  await expect(page.getByTestId("status")).toHaveText("404");
  await expect(page.getByTestId("mensagem")).toHaveText(
    "Não encontramos o que você procura.",
  );
});
