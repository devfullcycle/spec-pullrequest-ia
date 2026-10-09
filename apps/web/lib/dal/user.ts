import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getMe } from "@/lib/api/users";
import { LOGIN_PATH, SESSION_ENDED_PATH } from "@/lib/session/paths";
import { accessToken } from "@/lib/session/tokens";

/** O Usuário autenticado, só com o que as telas mostram. */
export interface CurrentUser {
  id: string;
  email: string;
}

/** O que a API disse sobre a Sessão deste navegador. */
export type SessionCheck =
  | { status: "valid"; user: CurrentUser }
  /** Não há token de acesso nos cookies. */
  | { status: "missing" }
  /** A API recusou o token. */
  | { status: "rejected" }
  /** A API falhou, e a Sessão pode estar boa. */
  | { status: "unavailable"; httpStatus: number };

/**
 * Confere a Sessão na API, sem redirecionar. A web não valida o token, e o Proxy só faz um
 * filtro otimista (docs/lld.md, seção 4.5). O `cache` evita a chamada repetida dentro da mesma
 * requisição, e não guarda nada entre requisições.
 */
export const checkSession = cache(async (): Promise<SessionCheck> => {
  const token = await accessToken();
  if (!token) return { status: "missing" };

  const result = await getMe(token);
  if (result.ok) {
    const { id, email } = result.data;
    return { status: "valid", user: { id, email } };
  }
  return result.error.code === "unauthenticated"
    ? { status: "rejected" }
    : { status: "unavailable", httpStatus: result.error.status };
});

/**
 * O Usuário da Sessão. Toda página e Server Action protegida passa por aqui.
 *
 * Sem Sessão, leva à tela de entrar. Se a API recusa o token, leva à rota que apaga os cookies:
 * a renderização de uma página não pode apagá-los.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const session = await checkSession();
  switch (session.status) {
    case "valid":
      return session.user;
    case "missing":
      redirect(LOGIN_PATH);
    case "rejected":
      redirect(SESSION_ENDED_PATH);
    case "unavailable":
      // A pessoa não é deslogada por uma falha da API.
      throw new Error(
        `Não foi possível conferir a Sessão na API (${session.httpStatus}).`,
      );
  }
}
