import "server-only";
import { cookies } from "next/headers";
import type { TokenPair } from "@/lib/api/types";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/session/access-token";
import {
  clearTokenCookies,
  writeTokenCookies,
} from "@/lib/session/token-cookies";

/*
 * A guarda dos tokens da Sessão: dois cookies `HttpOnly`, fora do alcance do JavaScript da
 * página (docs/lld.md, seção 4.5).
 */

/** Só funciona numa Server Action ou num Route Handler, onde os cookies podem ser gravados. */
export async function saveSession(tokens: TokenPair): Promise<void> {
  writeTokenCookies(await cookies(), tokens);
}

/** Só funciona numa Server Action ou num Route Handler. */
export async function clearSession(): Promise<void> {
  clearTokenCookies(await cookies());
}

export async function accessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value || undefined;
}

export async function refreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_TOKEN_COOKIE)?.value || undefined;
}
