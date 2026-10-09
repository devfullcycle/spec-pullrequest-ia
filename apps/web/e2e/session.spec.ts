import {
  expect,
  test,
  type BrowserContext,
  type Page,
} from "@playwright/test";
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

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";
const TOKEN_COOKIES = [ACCESS_COOKIE, REFRESH_COOKIE];

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

const SESSION_EXPIRED = "Sua sessão expirou. Entre de novo para continuar.";

/** Põe no navegador os cookies de uma Sessão. Sem o token de renovação, vai um que a API nunca emitiu. */
async function plantSession(
  context: BrowserContext,
  tokens: { accessToken?: string; refreshToken?: string },
) {
  const url = requiredEnv("WEB_URL");
  const { accessToken, refreshToken = "token-que-nunca-existiu" } = tokens;
  await context.addCookies([
    ...(accessToken
      ? [{ name: ACCESS_COOKIE, value: accessToken, url, httpOnly: true }]
      : []),
    { name: REFRESH_COOKIE, value: refreshToken, url, httpOnly: true },
  ]);
}

/**
 * Deixa o navegador como ele fica quando o token de acesso expira: o cookie dele dura o mesmo
 * que o token e some, e o do token de renovação continua.
 */
async function expireAccessToken(context: BrowserContext) {
  await context.clearCookies({ name: ACCESS_COOKIE });
}

/** A tela de entrar, com o aviso de que a Sessão acabou e sem mais nada na URL. */
async function expectSessionExpiredNotice(page: Page) {
  await expect(page).toHaveURL(/\/entrar\?aviso=sessao-expirada$/);
  await expect(page.getByRole("status")).toHaveText(SESSION_EXPIRED);
}

async function refreshTokenOf(context: BrowserContext): Promise<string> {
  const cookie = (await context.cookies()).find(
    ({ name }) => name === REFRESH_COOKIE,
  );
  if (!cookie) throw new Error("O navegador não tem o cookie de renovação.");
  return cookie.value;
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

test("com o token de acesso expirado e o de renovação válido, a navegação segue sem passar pela tela de entrar", async ({
  page,
  context,
}) => {
  const email = uniqueEmail();
  await signIn(page, email);
  const previous = await refreshTokenOf(context);
  await expireAccessToken(context);

  await page.goto("/?origem=teste");

  await expect(page).toHaveURL(/\/\?origem=teste$/);
  await expect(page.getByText(email)).toBeVisible();
  // A renovação trocou o par: os dois cookies voltaram, e o de renovação é outro.
  const cookies = await tokenCookies(context);
  expect(cookies.map(({ name }) => name).sort()).toEqual(TOKEN_COOKIES);
  expect(await refreshTokenOf(context)).not.toBe(previous);
  for (const cookie of cookies) {
    expect(cookie.httpOnly, `${cookie.name} é HttpOnly`).toBe(true);
  }
});

test("um token de acesso expirado que ainda está no cookie também é renovado", async ({
  page,
  context,
}) => {
  const email = uniqueEmail();
  await signIn(page, email);
  await plantSession(context, {
    accessToken: unsignedToken(-60),
    refreshToken: await refreshTokenOf(context),
  });

  await page.goto("/");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(email)).toBeVisible();
});

test("abrir a tela de entrar com o token de acesso expirado e a Sessão válida leva ao produto", async ({
  page,
  context,
}) => {
  const email = uniqueEmail();
  await signIn(page, email);
  await expireAccessToken(context);

  await page.goto("/entrar");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(email)).toBeVisible();
});

test("duas abas navegando ao mesmo tempo com o token de acesso expirado continuam com Sessão", async ({
  page,
  context,
}) => {
  const email = uniqueEmail();
  await signIn(page, email);
  const otherTab = await context.newPage();
  await expireAccessToken(context);

  await Promise.all([page.goto("/?aba=1"), otherTab.goto("/?aba=2")]);

  await expect(page).toHaveURL(/\/\?aba=1$/);
  await expect(otherTab).toHaveURL(/\/\?aba=2$/);
  await expect(page.getByText(email)).toBeVisible();
  await expect(otherTab.getByText(email)).toBeVisible();
  // O cookie que ficou, de qualquer uma das duas renovações, ainda renova.
  await expireAccessToken(context);
  await page.goto("/?aba=1");
  await expect(page).toHaveURL(/\/\?aba=1$/);
  await expect(page.getByText(email)).toBeVisible();
});

test("com a Sessão revogada, os cookies são apagados e a tela de entrar mostra o aviso de sessão expirada", async ({
  page,
  context,
}) => {
  const email = uniqueEmail();
  await signIn(page, email);
  const revoked = await refreshTokenOf(context);
  // Sair encerra a Sessão na API. O navegador volta a ter o token dela, como outro aparelho teria.
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await plantSession(context, { refreshToken: revoked });

  await page.goto("/?origem=teste");

  await expect(page).toHaveURL(
    /\/entrar\?aviso=sessao-expirada&destino=%2F%3Forigem%3Dteste$/,
  );
  await expect(page.getByRole("status")).toHaveText(SESSION_EXPIRED);
  expect(await tokenCookies(context)).toEqual([]);

  // O aviso não atrapalha a volta ao destino.
  await fillLogin(page, email);
  await expect(page).toHaveURL(/\/\?origem=teste$/);
  await expect(page.getByText(email)).toBeVisible();
});

test("sair com o token de acesso expirado encerra a Sessão na API e apaga os cookies", async ({
  page,
  context,
}) => {
  await signIn(page, uniqueEmail());
  const beforeLogout = await refreshTokenOf(context);
  await expireAccessToken(context);

  await page.getByRole("button", { name: "Sair" }).click();

  await expect(page).toHaveURL(/\/entrar$/);
  expect(await tokenCookies(context)).toEqual([]);
  // A Sessão acabou na API, e não só neste navegador: o token dela não renova mais.
  await plantSession(context, { refreshToken: beforeLogout });
  await page.goto("/");
  await expectSessionExpiredNotice(page);
});

test("sair com a Sessão já revogada leva à tela de entrar e apaga os cookies", async ({
  page,
  context,
}) => {
  await signIn(page, uniqueEmail());
  const otherTab = await context.newPage();
  await otherTab.goto("/");
  const revoked = await refreshTokenOf(context);
  await otherTab.getByRole("button", { name: "Sair" }).click();
  await expect(otherTab).toHaveURL(/\/entrar$/);
  // A primeira aba continua na página do produto, com os cookies de uma Sessão que acabou.
  await plantSession(context, { refreshToken: revoked });

  await page.getByRole("button", { name: "Sair" }).click();

  await expect(page).toHaveURL(/\/entrar/);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  expect(await tokenCookies(context)).toEqual([]);
});

test("um token de renovação que a API não conhece leva à tela de entrar com o aviso e apaga os cookies", async ({
  page,
  context,
}) => {
  await plantSession(context, { accessToken: unsignedToken(-60) });

  await page.goto("/");

  await expectSessionExpiredNotice(page);
  expect(await tokenCookies(context)).toEqual([]);
});

test("um token que só parece válido não passa da camada de acesso a dados", async ({
  page,
  context,
}) => {
  // O Proxy vê uma expiração futura e deixa passar. Quem barra é a API, pela assinatura.
  await plantSession(context, { accessToken: unsignedToken(600) });

  await page.goto("/");

  await expectSessionExpiredNotice(page);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  expect(await tokenCookies(context)).toEqual([]);
});

test("a rota que encerra a Sessão renova, em vez de deslogar, quem só está com o token de acesso expirado", async ({
  page,
  context,
}) => {
  const email = uniqueEmail();
  await signIn(page, email);
  await expireAccessToken(context);

  await page.goto("/sessao-encerrada");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(email)).toBeVisible();
});

test("um token de acesso que a API recusa é trocado pela renovação, sem derrubar a Sessão", async ({
  page,
  context,
}) => {
  const email = uniqueEmail();
  await signIn(page, email);
  // O Proxy vê uma expiração futura e não renova. Quem recusa o token é a API.
  await plantSession(context, {
    accessToken: unsignedToken(600),
    refreshToken: await refreshTokenOf(context),
  });

  await page.goto("/");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(email)).toBeVisible();
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
