import { expect, test, type Page } from "@playwright/test";
import {
  createVerifiedUser,
  fillLogin,
  openMailLink,
  PASSWORD,
  signIn,
  signUp,
} from "./support/account";
import { uniqueEmail } from "./support/mailpit";

const NEW_PASSWORD = "outra senha bem longa";

/** Preenche e envia o pedido do link, na tela "Esqueci minha senha" em que a página já está. */
async function sendResetRequest(page: Page, email: string) {
  // Pelo papel, e não pelo rótulo: depois de uma navegação, o Next.js mantém a tela anterior
  // escondida na página, e o rótulo acharia também o campo dela.
  await page.getByRole("textbox", { name: "E-mail" }).fill(email);
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(
    page.getByRole("heading", { name: "Confira seu e-mail" }),
  ).toBeVisible();
}

/** Pede o link de redefinição pela tela "Esqueci minha senha". */
async function requestReset(page: Page, email: string) {
  await page.goto("/esqueci-minha-senha");
  await sendResetRequest(page, email);
}

/**
 * Abre o link de redefinição do e-mail mais novo. O padrão de `count` conta o e-mail do
 * cadastro e o do pedido.
 */
async function openResetLink(page: Page, email: string, count = 2) {
  const link = await openMailLink(page, email, "/redefinir-senha", count);
  await expect(page.getByRole("heading", { name: "Nova senha" })).toBeVisible();
  return link;
}

async function saveNewPassword(page: Page, password: string) {
  await page.getByLabel("Nova senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
}

test("o Usuário pede o link, define a senha nova, vê o aviso na tela de entrar e entra com ela", async ({
  page,
}) => {
  const email = uniqueEmail();
  await createVerifiedUser(page, email);

  await page.getByRole("link", { name: "Esqueci minha senha" }).click();
  await expect(
    page.getByRole("heading", { name: "Esqueci minha senha" }),
  ).toBeVisible();
  await sendResetRequest(page, email);

  await expect(page.getByText(email)).toBeVisible();
  // O endereço não vai para a URL, que fica no histórico e nos logs.
  await expect(page).toHaveURL(/\/esqueci-minha-senha\/enviado$/);

  await openResetLink(page, email);
  await saveNewPassword(page, NEW_PASSWORD);

  await expect(page).toHaveURL(/\/entrar\?aviso=senha-redefinida$/);
  await expect(page.getByRole("status")).toHaveText(
    "Senha redefinida. Entre com a nova senha.",
  );

  await fillLogin(page, email, PASSWORD);
  await expect(page.getByRole("alert").filter({ hasText: "incorretos" })).toHaveText(
    "E-mail ou senha incorretos.",
  );
  await fillLogin(page, email, NEW_PASSWORD);
  await expect(page.getByText(email)).toBeVisible();
});

test("o pedido mostra a mesma confirmação para um e-mail sem Usuário", async ({
  page,
}) => {
  const email = uniqueEmail();

  await requestReset(page, email);

  await expect(
    page.getByText(`Se houver uma conta com ${email}`),
  ).toBeVisible();
});

test("um e-mail malformado no pedido aparece junto ao campo, em português", async ({
  page,
}) => {
  await page.goto("/esqueci-minha-senha");
  const email = page.getByLabel("E-mail");

  await email.fill("nome@exemplo");
  await page.getByRole("button", { name: "Enviar link" }).click();

  await expect(email).toHaveAccessibleDescription(
    "Informe um e-mail válido, como nome@exemplo.com.",
  );
  await expect(email).toHaveValue("nome@exemplo");
  await expect(page).toHaveURL(/\/esqueci-minha-senha$/);
});

test("um link de redefinição inválido mostra a tela de link inválido, com o caminho para pedir outro", async ({
  page,
}) => {
  await page.goto("/redefinir-senha?token=um-token-que-nunca-existiu");
  await saveNewPassword(page, NEW_PASSWORD);

  await expect(
    page.getByRole("heading", { name: "Link inválido ou expirado" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/redefinir-senha\/link-invalido$/);
  await expect(
    page.getByText("Este link de redefinição não vale mais"),
  ).toBeVisible();

  await page.getByRole("link", { name: "Pedir novo link" }).click();

  await expect(
    page.getByRole("heading", { name: "Esqueci minha senha" }),
  ).toBeVisible();
});

test("um link de redefinição já usado mostra a tela de link inválido", async ({
  page,
}) => {
  const email = uniqueEmail();
  await createVerifiedUser(page, email);
  await requestReset(page, email);
  const link = await openResetLink(page, email);
  await saveNewPassword(page, NEW_PASSWORD);
  await expect(page).toHaveURL(/\/entrar/);

  await page.goto(link.pathname + link.search);
  await saveNewPassword(page, "uma terceira senha longa");

  await expect(
    page.getByRole("heading", { name: "Link inválido ou expirado" }),
  ).toBeVisible();
});

test("o link de redefinição sem token mostra a tela de link inválido", async ({
  page,
}) => {
  await page.goto("/redefinir-senha");

  await expect(
    page.getByRole("heading", { name: "Link inválido ou expirado" }),
  ).toBeVisible();
});

test("uma senha nova fora da regra aparece junto ao campo, e o link continua valendo", async ({
  page,
}) => {
  const email = uniqueEmail();
  await createVerifiedUser(page, email);
  await requestReset(page, email);
  await openResetLink(page, email);
  const password = page.getByLabel("Nova senha", { exact: true });

  await saveNewPassword(page, "curta");

  await expect(password).toHaveAccessibleDescription(
    "A senha precisa ter pelo menos 10 caracteres.",
  );
  await expect(password).toHaveAttribute("aria-invalid", "true");

  await saveNewPassword(page, NEW_PASSWORD);

  await expect(page.getByRole("status")).toHaveText(
    "Senha redefinida. Entre com a nova senha.",
  );
});

test("o Usuário que nunca verificou o e-mail redefine a senha e entra", async ({
  page,
}) => {
  const email = uniqueEmail();
  await signUp(page, email);
  await requestReset(page, email);
  await openResetLink(page, email);

  await saveNewPassword(page, NEW_PASSWORD);
  await expect(page).toHaveURL(/\/entrar/);

  await fillLogin(page, email, NEW_PASSWORD);
  await expect(page.getByText(email)).toBeVisible();
});

test("redefinir a senha com uma Sessão aberta no navegador encerra a Sessão e leva à tela de entrar", async ({
  page,
}) => {
  const email = uniqueEmail();
  await signIn(page, email);
  await requestReset(page, email);

  await openResetLink(page, email);
  await saveNewPassword(page, NEW_PASSWORD);

  await expect(page).toHaveURL(/\/entrar\?aviso=senha-redefinida$/);
  await expect(page.getByRole("status")).toHaveText(
    "Senha redefinida. Entre com a nova senha.",
  );
  await page.goto("/");
  await expect(page).toHaveURL(/\/entrar/);
});

test("quem tem Sessão e abre um link inválido consegue pedir outro", async ({
  page,
}) => {
  await signIn(page, uniqueEmail());

  await page.goto("/redefinir-senha/link-invalido");
  await page.getByRole("link", { name: "Pedir novo link" }).click();

  await expect(
    page.getByRole("heading", { name: "Esqueci minha senha" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/esqueci-minha-senha$/);
});
