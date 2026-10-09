import "server-only";
import { apiRequest } from "@/lib/api/client";
import type { ApiResult, Me } from "@/lib/api/types";

/* As rotas do Usuário autenticado (docs/lld.md, seção 3.2). */

export function getMe(accessToken: string): Promise<ApiResult<Me>> {
  return apiRequest("/me", { accessToken });
}
