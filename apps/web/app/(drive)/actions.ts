"use server";

import { redirect } from "next/navigation";
import * as authApi from "@/lib/api/auth";
import { LOGIN_PATH } from "@/lib/session/paths";
import { clearSession, refreshToken } from "@/lib/session/tokens";

/**
 * Encerra a Sessão deste navegador. As outras Sessões do Usuário continuam. Sair funciona
 * mesmo se a API falhar ou a Sessão já tiver acabado: os cookies são apagados de todo jeito.
 */
export async function logout(): Promise<void> {
  const token = await refreshToken();
  if (token) {
    const result = await authApi.logout({ refreshToken: token });
    if (!result.ok) {
      // A pessoa sai deste navegador de todo jeito, mas a Sessão continua valendo na API.
      console.error(
        `A API não encerrou a Sessão no logout (${result.error.status} ${result.error.code}).`,
      );
    }
  }
  await clearSession();
  redirect(LOGIN_PATH);
}
