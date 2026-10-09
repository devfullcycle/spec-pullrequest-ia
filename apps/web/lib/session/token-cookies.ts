import type { TokenPair } from "@/lib/api/types";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/session/access-token";
import { secureCookies } from "@/lib/session/cookie-options";

/*
 * Como os dois cookies de token são gravados e apagados (docs/lld.md, seção 4.5). Sem
 * `server-only`, porque o Proxy grava na resposta dele e as Server Actions, em `cookies()`: os
 * dois passam o próprio armazenamento.
 */

/**
 * Quanto o cookie do token de renovação dura no navegador: a validade padrão do token. Quem
 * decide se a Sessão ainda vale é a API.
 */
const REFRESH_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** O que `cookies()` e os cookies de uma resposta têm em comum. */
interface CookieStore {
  set(name: string, value: string, options: object): unknown;
}

function tokenCookieOptions() {
  return {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    domain: process.env.COOKIE_DOMAIN || undefined,
  } as const;
}

export function writeTokenCookies(store: CookieStore, tokens: TokenPair): void {
  const options = tokenCookieOptions();
  store.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...options,
    maxAge: tokens.expiresIn,
  });
  store.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...options,
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearTokenCookies(store: CookieStore): void {
  clearAccessTokenCookie(store);
  store.set(REFRESH_TOKEN_COOKIE, "", expiredCookieOptions());
}

/** Apaga só o token de acesso. A Sessão continua, e a rota seguinte tenta renová-la. */
export function clearAccessTokenCookie(store: CookieStore): void {
  store.set(ACCESS_TOKEN_COOKIE, "", expiredCookieOptions());
}

function expiredCookieOptions() {
  // O navegador só apaga o cookie se o domínio e o caminho forem os da gravação.
  return { ...tokenCookieOptions(), maxAge: 0 };
}
