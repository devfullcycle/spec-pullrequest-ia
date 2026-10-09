import { expect, test, type BrowserContext } from "@playwright/test";
import {
  createVerifiedUser,
  fillLogin,
  openVerificationLink,
  PASSWORD,
  signIn,
  signUp,
} from "./support/account";
import { requiredEnv } from "./support/env";
import { uniqueEmail, waitForMailTo } from "./support/mailpit";

const TOKEN_COOKIES = ["access_token", "refresh_token"];

/** Um JWT que ninguém assinou, com a expiração pedida. A web não confere a assinatura. */
function unsignedToken(expiresInSeconds: number): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return [
    encode({ alg: "RS256", typ: "JWT" }),
    encode({
      sub: "0198a3f0-0000-7000-8000-000000000000",
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    }),
    "assinatura-que-nao-confere",
  ].join(".");
}

/** Põe no navegador os cookies de uma Sessão que a API nunca abriu. */
async function plantSession(context: BrowserContext, accessToken: string) {
  const url = requiredEnv("WEB_URL");
  await context.addCookies([
    { name: TOKEN_COOKIES[0], value: accessToken, url, httpOnly: true },
    {
      name: TOKEN_COOKIES[1],
      value: "token-que-nunca-existiu",
      url,
      httpOnly: true,
    },
  ]);
}

async function tokenCookies(context: BrowserContext) {
  return (await context.cookies()).filter(({ name }) =>
    TOKEN_COOKIES.includes(name),
  );
}

test("o Usuário entra, vê o próprio e-mail na página provisória e sai", async ({
  page,
}) => {
  const email = uniqueEmail();
  await createVerifiedUser(page, email);

  await fillLogin(page, email);

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(email)).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();

  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  // A Sessão acabou: a página do produto volta a pedir o login.
  await page.goto("/");
  await expect(page).toHaveURL(/\/entrar$/);
});

test("abrir uma página protegida sem Sessão leva à tela de entrar e, depois do login, de volta à página pedida", async ({
  page,
}) => {
  const email = uniqueEmail();
  await createVerifiedUser(page, email);

  await page.goto("/?origem=teste");

  await expect(page).toHaveURL(/\/entrar\?destino=%2F%3Forigem%3Dteste$/);
  await fillLogin(page, email);

  await expect(page).toHaveURL(/\/\?origem=teste$/);
  await expect(page.getByText(email)).toBeVisible();
});

for (const destination of [
  "https://example.com/roubo",
  "//example.com/roubo",
  "/\\example.com/roubo",
]) {
  test(`o destino de retorno externo ${destination} é ignorado`, async ({
    page,
  }) => {
    const email = uniqueEmail();
    await createVerifiedUser(page, email);

    await page.goto(`/entrar?destino=${encodeURIComponent(destination)}`);
    await fillLogin(page, email);

    await expect(page.getByText(email)).toBeVisible();
    expect(new URL(page.url()).origin).toBe(requiredEnv("WEB_URL"));
    expect(new URL(page.url()).pathname).toBe("/");
  });
}

test("abrir a tela de entrar, ou a de criar conta, com Sessão leva ao produto", async ({
  page,
}) => {
  const email = uniqueEmail();
  await signIn(page, email);

  await page.goto("/entrar");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(email)).toBeVisible();

  await page.goto("/criar-conta");
  await expect(page).toHaveURL(/\/$/);
});

test("os cookies de token são HttpOnly e não aparecem para o JavaScript da página", async ({
  page,
  context,
}) => {
  await signIn(page, uniqueEmail());

  const cookies = await tokenCookies(context);
  expect(cookies.map(({ name }) => name).sort()).toEqual(TOKEN_COOKIES);
  for (const cookie of cookies) {
    expect(cookie.httpOnly, `${cookie.name} é HttpOnly`).toBe(true);
    expect(cookie.sameSite, `${cookie.name} é SameSite=Lax`).toBe("Lax");
    expect(cookie.value).not.toBe("");
  }
  const visible = await page.evaluate(() => document.cookie);
  for (const name of TOKEN_COOKIES) {
    expect(visible).not.toContain(name);
  }
});

test("credenciais inválidas aparecem num aviso acima do formulário, igual para senha errada e e-mail sem Usuário", async ({
  page,
}) => {
  const email = uniqueEmail();
  await createVerifiedUser(page, email);

  await fillLogin(page, email, "uma senha bem errada");

  const alert = page.locator("form").getByRole("alert");
  await expect(alert).toHaveText("E-mail ou senha incorretos.");
  // O aviso vem antes dos campos, e o e-mail digitado continua no lugar.
  const alertBox = await alert.boundingBox();
  const fieldBox = await page.getByLabel("E-mail").boundingBox();
  expect(alertBox!.y + alertBox!.height).toBeLessThan(fieldBox!.y);
  await expect(page.getByLabel("E-mail")).toHaveValue(email);
  await expect(page.getByLabel("Senha", { exact: true })).toHaveValue("");
  await expect(page).toHaveURL(/\/entrar/);

  await fillLogin(page, uniqueEmail(), PASSWORD);
  await expect(alert).toHaveText("E-mail ou senha incorretos.");
});

test("o Usuário não verificado vê o aviso e pede o reenvio na própria tela de entrar", async ({
  page,
}) => {
  const email = uniqueEmail();
  await signUp(page, email);
  await waitForMailTo(email);

  await page.goto("/entrar");
  await fillLogin(page, email);

  await expect(page.locator("form").getByRole("alert")).toContainText(
    "Seu e-mail ainda não foi verificado. Confira sua caixa de entrada.",
  );
  // O reenvio vale para o e-mail recusado, mesmo que o campo mude depois.
  await page.getByLabel("E-mail").fill("outro@example.com");
  await page.getByRole("button", { name: "Reenviar e-mail" }).click();

  await expect(page.getByRole("status")).toHaveText(
    "Enviamos um novo link. Confira sua caixa de entrada.",
  );
  await expect(page).toHaveURL(/\/entrar$/);

  await openVerificationLink(page, email, 2);
  await fillLogin(page, email);
  await expect(page.getByText(email)).toBeVisible();
});

test("com o aviso de e-mail não verificado na tela, a tecla Enter entra, e não reenvia", async ({
  page,
  context,
}) => {
  const email = uniqueEmail();
  await signUp(page, email);
  await page.goto("/entrar");
  await fillLogin(page, email);
  await expect(page.locator("form").getByRole("alert")).toBeVisible();

  // A pessoa verifica o e-mail em outra aba e volta para digitar a senha.
  await openVerificationLink(await context.newPage(), email);
  const password = page.getByLabel("Senha", { exact: true });
  await password.fill(PASSWORD);
  await password.press("Enter");

  await expect(page.getByText(email)).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test("os erros de preenchimento do login aparecem junto ao campo, em português", async ({
  page,
}) => {
  await page.goto("/entrar");
  const email = page.getByLabel("E-mail");
  await email.fill("nome@exemplo");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(email).toHaveAccessibleDescription(
    "Informe um e-mail válido, como nome@exemplo.com.",
  );
  await expect(
    page.getByLabel("Senha", { exact: true }),
  ).toHaveAccessibleDescription("Informe sua senha.");
  await expect(email).toHaveValue("nome@exemplo");
});

test("a tela de entrar leva ao cadastro", async ({ page }) => {
  await page.goto("/entrar");
  await expect(
    page.getByRole("link", { name: "Esqueci minha senha" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Criar conta" }).click();

  await expect(page.getByRole("heading", { name: "Criar conta" })).toBeVisible();
});

test("o link \"Esqueci minha senha\" não volta para a tela de entrar", async ({
  page,
}) => {
  await page.goto("/entrar");

  await page.getByRole("link", { name: "Esqueci minha senha" }).click();

  // A tela chega com a recuperação de senha. Até lá, o Proxy só não pode tratá-la como protegida.
  await expect(page).toHaveURL(/\/esqueci-minha-senha$/);
});

test("uma rota com ponto no nome também passa pelo Proxy", async ({ page }) => {
  await page.goto("/arquivos/relatorio.pdf");

  await expect(page).toHaveURL(
    /\/entrar\?destino=%2Farquivos%2Frelatorio\.pdf$/,
  );
});

test("um token de acesso expirado leva à tela de entrar e apaga os cookies", async ({
  page,
  context,
}) => {
  await plantSession(context, unsignedToken(-60));

  await page.goto("/");

  await expect(page).toHaveURL(/\/entrar$/);
  expect(await tokenCookies(context)).toEqual([]);
});

test("um token que só parece válido não passa da camada de acesso a dados", async ({
  page,
  context,
}) => {
  // O Proxy vê uma expiração futura e deixa passar. Quem barra é a API, pela assinatura.
  await plantSession(context, unsignedToken(600));

  await page.goto("/");

  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  expect(await tokenCookies(context)).toEqual([]);
});

test("a rota que encerra a Sessão não desloga quem tem uma Sessão boa", async ({
  page,
}) => {
  const email = uniqueEmail();
  await signIn(page, email);

  await page.goto("/sessao-encerrada");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(email)).toBeVisible();
});
