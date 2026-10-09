import "server-only";
import { unstable_rethrow } from "next/navigation";
import { clientIpHeaders } from "@/lib/api/client-ip";
import { API_TIMEOUT_MS, apiEndpoint } from "@/lib/api/endpoint";
import {
  API_ERROR_CODES,
  type ApiError,
  type ApiErrorCode,
  type ApiFieldError,
  type ApiResult,
} from "@/lib/api/types";

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  /** Enviado como JSON. */
  body?: unknown;
  /** Token de acesso do Usuário, nas rotas protegidas. */
  accessToken?: string;
  /** Quanto esperar a resposta, em milissegundos. O padrão é de 10 segundos. */
  timeoutMs?: number;
}

/**
 * Chama uma rota da API, sempre a partir do servidor do Next.js. O caminho é relativo ao
 * prefixo `/v1` (`/auth/login`).
 *
 * Um erro esperado volta como valor, com o `code` da API, para quem chama decidir a mensagem.
 * Uma API fora do ar, lenta demais ou com resposta ilegível vira `internal_error`. A função só
 * lança quando a web está mal configurada.
 */
export async function apiRequest<T = void>(
  path: string,
  {
    method = "GET",
    body,
    accessToken,
    timeoutMs = API_TIMEOUT_MS,
  }: ApiRequestOptions = {},
): Promise<ApiResult<T>> {
  // Fora do `try`: sem as variáveis, o erro é de configuração, e não uma falha da API.
  const url = apiEndpoint(path);
  const headers = new Headers({
    Accept: "application/json",
    ...(await clientIpHeaders()),
  });
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (cause) {
    // Na pré-renderização, o Next.js interrompe o `fetch` com um erro próprio, que não é falha da API.
    unstable_rethrow(cause);
    // API fora do ar ou inalcançável: para o Usuário, é uma falha não prevista.
    console.error(`A chamada ${method} ${path} não chegou à API.`, cause);
    return { ok: false, error: unexpectedError(502) };
  }

  if (!response.ok) {
    return { ok: false, error: await readError(response) };
  }
  try {
    // Várias rotas respondem sem corpo (201 e 204), e `response.json()` lançaria nelas.
    const text = await response.text();
    return { ok: true, data: (text ? JSON.parse(text) : undefined) as T };
  } catch (cause) {
    unstable_rethrow(cause);
    console.error(`A resposta de ${method} ${path} não pôde ser lida.`, cause);
    return { ok: false, error: unexpectedError(502) };
  }
}

/** Lê o corpo RFC 9457 da API. O `code` é o único campo que decide o erro. */
async function readError(response: Response): Promise<ApiError> {
  let problem: unknown;
  try {
    problem = await response.json();
  } catch {
    return unexpectedError(response.status);
  }
  if (!isRecord(problem) || !isApiErrorCode(problem.code)) {
    // Um `code` que a web não conhece (`method_not_allowed`, por exemplo) não tem mensagem própria.
    return unexpectedError(response.status);
  }
  return {
    code: problem.code,
    status: response.status,
    fieldErrors: readFieldErrors(problem.errors),
  };
}

function readFieldErrors(errors: unknown): ApiFieldError[] {
  if (!Array.isArray(errors)) return [];
  return errors.flatMap((item) =>
    isRecord(item) &&
    typeof item.field === "string" &&
    Array.isArray(item.messages)
      ? [
          {
            field: item.field,
            messages: item.messages.filter(
              (message): message is string => typeof message === "string",
            ),
          },
        ]
      : [],
  );
}

function unexpectedError(status: number): ApiError {
  return { code: "internal_error", status, fieldErrors: [] };
}

function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return (API_ERROR_CODES as readonly unknown[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
