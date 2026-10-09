import "server-only";
import type { ApiError } from "@/lib/api/types";

/**
 * O erro diz que o link do e-mail não vale: o token não existe, expirou, já foi usado ou veio
 * malformado. Qualquer outro erro é falha nossa, e o link pode continuar bom.
 */
export function isInvalidLinkToken(error: ApiError): boolean {
  return (
    error.code === "invalid_token" ||
    error.fieldErrors.some(({ field }) => field === "token")
  );
}
