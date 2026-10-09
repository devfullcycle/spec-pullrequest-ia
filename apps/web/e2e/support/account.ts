import { expect, type Page } from "@playwright/test";
import { extractLink, waitForMailTo } from "./mailpit";

export const PASSWORD = "uma senha bem longa";

/** Preenche e envia o formulário de cadastro. */
export async function signUp(page: Page, email: string, password = PASSWORD) {
  await page.goto("/criar-conta");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(
    page.getByRole("heading", { name: "Confira seu e-mail" }),
  ).toBeVisible();
}

/** Abre o link de verificação do e-mail mais novo, depois de o endereço ter recebido `count`. */
export async function openVerificationLink(
  page: Page,
  email: string,
  count = 1,
) {
  const link = extractLink(
    await waitForMailTo(email, { count }),
    "/verificar-email",
  );
  await page.goto(link.pathname + link.search);
  return link;
}

/** Deixa o e-mail com um Usuário verificado, pelo mesmo caminho que a pessoa faz. */
export async function createVerifiedUser(page: Page, email: string) {
  await signUp(page, email);
  await openVerificationLink(page, email);
  await expect(page).toHaveURL(/\/entrar/);
}

/** Preenche e envia o formulário de entrar, na tela em que a página já está. */
export async function fillLogin(page: Page, email: string, password = PASSWORD) {
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

/** Cria um Usuário verificado e entra com ele. Termina na página inicial do produto. */
export async function signIn(page: Page, email: string) {
  await createVerifiedUser(page, email);
  await fillLogin(page, email);
  await expect(page.getByText(email)).toBeVisible();
}
