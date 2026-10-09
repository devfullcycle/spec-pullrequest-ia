import "server-only";
import { apiRequest } from "@/lib/api/client";
import type {
  ApiResult,
  RegisterInput,
  ResendVerificationInput,
  VerifyEmailInput,
} from "@/lib/api/types";

/* As rotas de autenticação da API (docs/lld.md, seção 3.2). */

export function register(input: RegisterInput): Promise<ApiResult<void>> {
  return apiRequest("/auth/register", { method: "POST", body: input });
}

export function verifyEmail(input: VerifyEmailInput): Promise<ApiResult<void>> {
  return apiRequest("/auth/verify-email", { method: "POST", body: input });
}

export function resendVerification(
  input: ResendVerificationInput,
): Promise<ApiResult<void>> {
  return apiRequest("/auth/resend-verification", {
    method: "POST",
    body: input,
  });
}
