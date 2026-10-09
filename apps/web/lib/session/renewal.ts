import { apiEndpoint } from "@/lib/api/endpoint";
import type { TokenPair } from "@/lib/api/types";

/*
 * A renovação da Sessão (docs/lld.md, seção 4.5). Sem `server-only`, porque quem renova é o
 * Proxy. Por isso a chamada não passa pelo cliente de `lib/api`, que o Proxy não pode importar.
 */

/**
 * Quanto esperar a renovação, em milissegundos. Fica abaixo da janela de tolerância ao reuso
 * (docs/lld.md, seção 4.5): se a API troca o token e a resposta se perde, a tentativa seguinte
 * ainda cai dentro da janela, em vez de parecer roubo e encerrar todas as Sessões.
 */
const RENEWAL_TIMEOUT_MS = 5_000;

export type Renewal =
  | { status: "renewed"; tokens: TokenPair }
  /** A API não aceita mais o token: a Sessão expirou ou foi revogada. */
  | { status: "rejected" }
  /** A API falhou, e a Sessão pode estar boa. */
  | { status: "unavailable" };

/** Troca o token de renovação por um par novo. Nunca lança por falha da API. */
export async function renewSession(refreshToken: string): Promise<Renewal> {
  // Fora do `try`: sem a variável, o erro é de configuração, e não uma falha da API.
  const url = apiEndpoint("/auth/refresh");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(RENEWAL_TIMEOUT_MS),
    });
    const body: unknown = await response.json().catch(() => undefined);
    // Quem diz que o token não vale é o `code` da API, e não o status: um 401 de outra origem
    // não encerra a Sessão.
    if (hasCode(body, "unauthenticated")) return { status: "rejected" };
    if (!response.ok) {
      console.error(`A API não renovou a Sessão (${response.status}).`);
      return { status: "unavailable" };
    }

    if (!isTokenPair(body)) {
      console.error("A resposta da renovação da Sessão não traz o par de tokens.");
      return { status: "unavailable" };
    }
    return { status: "renewed", tokens: body };
  } catch (cause) {
    console.error("A renovação da Sessão não chegou à API.", cause);
    return { status: "unavailable" };
  }
}

function hasCode(value: unknown, code: string): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    value.code === code
  );
}

function isTokenPair(value: unknown): value is TokenPair {
  if (typeof value !== "object" || value === null) return false;
  const { accessToken, refreshToken, expiresIn } = value as Record<
    string,
    unknown
  >;
  return (
    typeof accessToken === "string" &&
    typeof refreshToken === "string" &&
    typeof expiresIn === "number"
  );
}
