import "server-only";
import type { ApiErrorCode } from "@/lib/api/types";

/**
 * O único lugar que traduz o `code` da API em texto para o Usuário. Nenhum componente
 * mostra o `title` nem o `detail` da resposta.
 */
const MESSAGES: Record<ApiErrorCode, string> = {
  validation_error: "Confira os dados informados e tente de novo.",
  invalid_token: "Este link é inválido ou expirou. Peça um novo.",
  unauthenticated: "Sua sessão expirou. Entre de novo.",
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_verified:
    "Seu e-mail ainda não foi verificado. Confira sua caixa de entrada.",
  rate_limited: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
  not_found: "Não encontramos o que você procura.",
  internal_error: "Algo deu errado. Tente de novo em instantes.",
};

export function errorMessage(code: ApiErrorCode): string {
  return MESSAGES[code];
}
