import { expect, test } from "@playwright/test";

test("o campo de senha alterna entre ocultar e exibir", async ({ page }) => {
  await page.goto("/vitrine/auth-card");
  const password = page.getByLabel("Senha", { exact: true });

  await expect(password).toHaveAttribute("type", "password");

  await page.getByRole("button", { name: "Exibir senha" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("uma senha longa");

  await page.getByRole("button", { name: "Ocultar senha" }).click();
  await expect(password).toHaveAttribute("type", "password");
});

test("o erro de um campo fica ligado a ele", async ({ page }) => {
  await page.goto("/vitrine");
  const email = page.locator('input[name="erro"]');

  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAccessibleDescription(
    "Informe um e-mail válido, como nome@exemplo.com.",
  );
});
