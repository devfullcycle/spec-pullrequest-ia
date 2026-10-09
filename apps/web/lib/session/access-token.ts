/*
 * O que o Proxy e a guarda dos cookies sabem sobre o token de acesso. Este arquivo não tem
 * `server-only` porque o Proxy o importa. Ele não guarda segredo: só nomes e uma leitura.
 */

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

/**
 * Diz se o token de acesso já expirou, pelo `exp` do JWT. A assinatura não é conferida: a web
 * não tem a chave pública, e quem valida o token é a API (docs/lld.md, seção 4.5). Um valor que
 * não é um JWT com `exp` conta como expirado.
 */
export function isAccessTokenExpired(token: string): boolean {
  try {
    const payload: unknown = JSON.parse(
      Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"),
    );
    const exp =
      typeof payload === "object" && payload !== null && "exp" in payload
        ? payload.exp
        : undefined;
    return typeof exp !== "number" || exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}
