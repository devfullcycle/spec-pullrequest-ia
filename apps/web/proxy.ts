import { NextResponse, type NextRequest } from "next/server";
import type { TokenPair } from "@/lib/api/types";
import {
  ACCESS_TOKEN_COOKIE,
  isAccessTokenExpired,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/session/access-token";
import { loginPath, SESSION_EXPIRED_NOTICE } from "@/lib/session/login-path";
import {
  HOME_PATH,
  LOGIN_PATH,
  SESSION_ENDED_PATH,
} from "@/lib/session/paths";
import { renewSession } from "@/lib/session/renewal";
import {
  clearTokenCookies,
  writeTokenCookies,
} from "@/lib/session/token-cookies";

/*
 * Roda antes de cada rota e faz um filtro otimista, só com o que o cookie diz (docs/lld.md,
 * seção 4.5): manda para a tela de entrar quem não tem Sessão e tira das telas de autenticação
 * quem tem. Quando o token de acesso expirou, renova a Sessão na API e regrava os cookies. Ele
 * não confere a assinatura do token. Quem protege os dados é a camada de acesso a dados
 * (`lib/dal`), em cada página e Server Action.
 */

/** As telas de quem ainda não entrou. Quem tem Sessão é levado ao produto. */
const AUTH_PATHS = [
  LOGIN_PATH,
  "/criar-conta",
  "/confira-seu-email",
];

/**
 * O que abre com ou sem Sessão. Tudo o que não está aqui nem em `AUTH_PATHS` é protegido: uma
 * rota nova nasce fechada.
 */
const PUBLIC_PATHS = [
  "/termos",
  "/privacidade",
  // Os links dos e-mails valem para quem já entrou em outra aba.
  "/verificar-email",
  "/redefinir-senha",
  // Quem tem Sessão também pede o link: é para cá que a tela de link inválido e o e-mail
  // "sua senha foi alterada" mandam.
  "/esqueci-minha-senha",
  SESSION_ENDED_PATH,
  // Só existe no servidor de desenvolvimento.
  "/vitrine",
];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (matches(pathname, PUBLIC_PATHS)) return NextResponse.next();

  // Uma Server Action nunca é redirecionada daqui: o navegador repetiria o envio no destino, e
  // a pessoa veria um erro. Ela segue, e é a própria ação que confere a Sessão. A de sair, por
  // exemplo, tem de funcionar com a Sessão já expirada.
  const action = request.headers.has("next-action");
  const leavesAuthScreen = matches(pathname, AUTH_PATHS) && !action;

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (accessToken && !isAccessTokenExpired(accessToken)) {
    return leavesAuthScreen ? redirectHome(request) : NextResponse.next();
  }

  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const renewal = refreshToken
    ? await renewSession(refreshToken)
    : ({ status: "missing" } as const);

  if (renewal.status === "renewed") {
    const response = leavesAuthScreen
      ? redirectHome(request)
      : continueWith(request, renewal.tokens);
    writeTokenCookies(response.cookies, renewal.tokens);
    return response;
  }

  // Sem Sessão, a ação segue como veio. Os cookies que sobraram são apagados por ela mesma ou
  // na navegação seguinte: apagá-los aqui disputaria com os que a ação de entrar grava.
  if (action) return NextResponse.next();

  const rejected = renewal.status === "rejected";
  if (matches(pathname, AUTH_PATHS)) {
    const response = NextResponse.next();
    if (rejected) clearTokenCookies(response.cookies);
    return response;
  }

  const requested = pathname + search;
  const login = loginPath({
    notice: rejected ? SESSION_EXPIRED_NOTICE : undefined,
    returnTo: requested === HOME_PATH ? undefined : requested,
  });
  const response = NextResponse.redirect(new URL(login, request.url));
  // Uma falha da API não encerra a Sessão: os cookies ficam, e a próxima rota tenta de novo.
  if (renewal.status !== "unavailable") clearTokenCookies(response.cookies);
  return response;
}

function redirectHome(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL(HOME_PATH, request.url));
}

/** Segue para a rota, que já lê os tokens novos nos cookies da requisição. */
function continueWith(request: NextRequest, tokens: TokenPair): NextResponse {
  request.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken);
  request.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken);
  return NextResponse.next({ request: { headers: request.headers } });
}

function matches(pathname: string, paths: string[]): boolean {
  return paths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export const config = {
  // Fora os arquivos do próprio Next.js e os estáticos, que não dependem da Sessão. As extensões
  // são uma lista fechada: uma rota com ponto no nome (`/arquivos/relatorio.pdf`) passa pelo Proxy.
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
