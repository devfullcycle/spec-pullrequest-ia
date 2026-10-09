import { expect, test, type Page } from "@playwright/test";
import { extractLink, uniqueEmail, waitForMailTo } from "./support/mailpit";

const PASSWORD = "uma senha bem longa";

/** Preenche e envia o formulário de cadastro. */
async function signUp(page: Page, email: string) {
  await page.goto("/criar-conta");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Criar conta" }).click();
}

/** Abre o link de verificação do e-mail mais novo, depois de o endereço ter recebido `count`. */
async function openVerificationLink(page: Page, email: string, count = 1) {
  const link = extractLink(
    await waitForMailTo(email, { count }),
    "/verificar-email",
  );
  await page.goto(link.pathname + link.search);
  return link;
}

test("o visitante se cadastra, verifica o e-mail pelo link e chega à tela de entrar", async ({
  page,
}) => {
  const email = uniqueEmail();

  await signUp(page, email);

  await expect(
    page.getByRole("heading", { name: "Confira seu e-mail" }),
  ).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  // O endereço não vai para a URL, que fica no histórico e nos logs.
  await expect(page).toHaveURL(/\/confira-seu-email$/);

  await openVerificationLink(page, email);

  await expect(page).toHaveURL(/\/entrar/);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText(
    "E-mail verificado. Agora você já pode entrar.",
  );
});

test("os erros de preenchimento aparecem junto ao campo, em português", async ({
  page,
}) => {
  await page.goto("/criar-conta");
  const email = page.getByLabel("E-mail");
  const password = page.getByLabel("Senha", { exact: true });

  await email.fill("nome@exemplo");
  await password.fill("curta");
  await page.getByRole("button", { name: "Criar conta" }).click();

  await expect(email).toHaveAccessibleDescription(
    "Informe um e-mail válido, como nome@exemplo.com.",
  );
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(password).toHaveAccessibleDescription(
    "A senha precisa ter pelo menos 10 caracteres.",
  );
  // O e-mail digitado continua no campo, e a tela não muda.
  await expect(email).toHaveValue("nome@exemplo");
  await expect(page).toHaveURL(/\/criar-conta$/);
});

test("a tela de cadastro leva aos Termos e à Política de Privacidade", async ({
  page,
}) => {
  await page.goto("/criar-conta");
  await page.getByRole("link", { name: "Termos de Uso" }).click();
  await expect(
    page.getByRole("heading", { name: "Termos de Uso" }),
  ).toBeVisible();

  await page.goto("/criar-conta");
  await page.getByRole("link", { name: "Política de Privacidade" }).click();
  await expect(
    page.getByRole("heading", { name: "Política de Privacidade" }),
  ).toBeVisible();
});

test("o reenvio da tela de confirmação manda um link novo, que verifica o e-mail", async ({
  page,
}) => {
  const email = uniqueEmail();
  await signUp(page, email);
  await waitForMailTo(email);

  await page.getByRole("button", { name: "Reenviar e-mail" }).click();

  await expect(page.getByRole("status")).toHaveText(
    "Enviamos um novo link. Confira sua caixa de entrada.",
  );
  await openVerificationLink(page, email, 2);
  await expect(page.getByRole("status")).toHaveText(
    "E-mail verificado. Agora você já pode entrar.",
  );
});

test("um link inválido mostra a tela de link inválido, com o caminho para o reenvio", async ({
  page,
}) => {
  const email = uniqueEmail();
  await signUp(page, email);
  await waitForMailTo(email);

  await page.goto("/verificar-email?token=um-token-que-nunca-existiu");

  await expect(
    page.getByRole("heading", { name: "Link inválido ou expirado" }),
  ).toBeVisible();

  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Enviar novo link" }).click();

  await expect(
    page.getByRole("heading", { name: "Confira seu e-mail" }),
  ).toBeVisible();
  await openVerificationLink(page, email, 2);
  await expect(page.getByRole("status")).toHaveText(
    "E-mail verificado. Agora você já pode entrar.",
  );
});

test("um link já usado mostra a tela de link inválido", async ({ page }) => {
  const email = uniqueEmail();
  await signUp(page, email);
  const link = await openVerificationLink(page, email);
  await expect(page).toHaveURL(/\/entrar/);

  await page.goto(link.pathname + link.search);

  await expect(
    page.getByRole("heading", { name: "Link inválido ou expirado" }),
  ).toBeVisible();
});

test("o link sem token mostra a tela de link inválido", async ({ page }) => {
  await page.goto("/verificar-email");

  await expect(
    page.getByRole("heading", { name: "Link inválido ou expirado" }),
  ).toBeVisible();
});

test("a tela de confirmação aberta sem um cadastro antes não oferece o reenvio", async ({
  page,
}) => {
  await page.goto("/confira-seu-email?email=alguem%40example.com");

  await expect(
    page.getByRole("heading", { name: "Confira seu e-mail" }),
  ).toBeVisible();
  await expect(page.getByText("alguem@example.com")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Reenviar e-mail" }),
  ).toHaveCount(0);
});
