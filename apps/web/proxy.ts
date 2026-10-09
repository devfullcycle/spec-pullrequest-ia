import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  isAccessTokenExpired,
} from "@/lib/session/access-token";
import {
  HOME_PATH,
  LOGIN_PATH,
  SESSION_ENDED_PATH,
} from "@/lib/session/paths";
import { RETURN_PARAM } from "@/lib/session/return-path";
import { clearTokenCookies } from "@/lib/session/token-cookies";

/*
 * Roda antes de cada rota e faz um filtro otimista, só com o que o cookie diz (docs/lld.md,
 * seção 4.5): manda para a tela de entrar quem não tem Sessão e tira das telas de autenticação
 * quem tem. Ele não confere a assinatura do token nem fala com a API. Quem protege os dados é a
 * camada de acesso a dados (`lib/dal`), em cada página e Server Action.
 */

/** As telas de quem ainda não entrou. Quem tem Sessão é levado ao produto. */
const AUTH_PATHS = [
  LOGIN_PATH,
  "/criar-conta",
  "/confira-seu-email",
  // A tela chega com a recuperação de senha. O link da tela de entrar já aponta para cá.
  "/esqueci-minha-senha",
];

/**
 * O que abre com ou sem Sessão. Tudo o que não está aqui nem em `AUTH_PATHS` é protegido: uma
 * rota nova nasce fechada.
 */
const PUBLIC_PATHS = [
  "/termos",
  "/privacidade",
  // O link do e-mail vale para quem já entrou em outra aba.
  "/verificar-email",
  SESSION_ENDED_PATH,
  // Só existe no servidor de desenvolvimento.
  "/vitrine",
];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (matches(pathname, PUBLIC_PATHS)) return NextResponse.next();

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const hasSession = !!token && !isAccessTokenExpired(token);

  if (matches(pathname, AUTH_PATHS)) {
    return hasSession
      ? NextResponse.redirect(new URL(HOME_PATH, request.url))
      : NextResponse.next();
  }

  if (hasSession) return NextResponse.next();

  const login = new URL(LOGIN_PATH, request.url);
  const requested = pathname + search;
  if (requested !== HOME_PATH) login.searchParams.set(RETURN_PARAM, requested);
  const response = NextResponse.redirect(login);
  // O token de acesso expirou, e a renovação ainda não existe: a Sessão acaba aqui.
  clearTokenCookies(response.cookies);
  return response;
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
