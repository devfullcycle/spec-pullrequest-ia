/*
 * Onde a API está e quanto esperar por ela. É o único arquivo de `lib/api` sem `server-only`:
 * o Proxy, que renova a Sessão, também precisa dele, e ele não guarda segredo.
 */

/** Quanto esperar a API, em milissegundos. O mesmo padrão dos prazos da própria API. */
export const API_TIMEOUT_MS = 10_000;

/** O endereço de uma rota da API. O caminho é relativo ao prefixo `/v1` (`/auth/login`). */
export function apiEndpoint(path: string): string {
  const url = process.env.API_URL;
  if (!url) {
    throw new Error(
      "A variável de ambiente API_URL não está definida (docs/lld.md, seção 6).",
    );
  }
  return `${url.replace(/\/+$/, "")}/v1${path}`;
}
