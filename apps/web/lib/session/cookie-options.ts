/**
 * Se os cookies da web levam `Secure`. Só o ambiente local, que usa HTTP, desliga
 * (docs/lld.md, seção 6): por HTTP, o navegador descartaria um cookie `Secure`. Sem
 * `server-only`, porque o Proxy também grava cookies.
 */
export function secureCookies(): boolean {
  return process.env.COOKIE_SECURE !== "false";
}
