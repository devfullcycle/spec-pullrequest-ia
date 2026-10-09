import { expect, test } from "@playwright/test";

test("o erro da API chega tipado pelo code e traduzido", async ({ page }) => {
  await page.goto("/vitrine/api");

  await expect(page.getByTestId("rota-code")).toHaveText("not_found");
  await expect(page.getByTestId("rota-status")).toHaveText("404");
  await expect(page.getByTestId("rota-mensagem")).toHaveText(
    "Não encontramos o que você procura.",
  );
});

test("a API que não responde no prazo vira uma falha não prevista", async ({
  page,
}) => {
  await page.goto("/vitrine/api");

  await expect(page.getByTestId("prazo-code")).toHaveText("internal_error");
  await expect(page.getByTestId("prazo-status")).toHaveText("502");
  await expect(page.getByTestId("prazo-mensagem")).toHaveText(
    "Algo deu errado. Tente de novo em instantes.",
  );
});
