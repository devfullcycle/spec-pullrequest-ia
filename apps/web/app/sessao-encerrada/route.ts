import { redirect } from "next/navigation";
import { checkSession } from "@/lib/dal/user";
import { loginPath, SESSION_EXPIRED_NOTICE } from "@/lib/session/login-path";
import { HOME_PATH } from "@/lib/session/paths";
import { renewSession } from "@/lib/session/renewal";
import {
  clearAccessToken,
  clearSession,
  refreshToken,
  saveSession,
} from "@/lib/session/tokens";

/**
 * Para onde a camada de acesso a dados manda quem tem um token de acesso que a API recusou.
 * A renderização de uma página não pode gravar cookies, e esta rota pode. Sem ela, o Proxy
 * continuaria vendo uma Sessão nos cookies e tiraria a pessoa da tela de entrar.
 *
 * A Sessão só acaba aqui se a API também recusar o token de renovação. A rota confere a Sessão
 * de novo e tenta renová-la antes de apagar: um link para cá, aberto por quem tem uma Sessão
 * boa, não desloga ninguém.
 */
export async function GET() {
  const { status } = await checkSession();
  if (status === "valid" || status === "unavailable") redirect(HOME_PATH);

  const token = await refreshToken();
  const renewal = token ? await renewSession(token) : null;

  if (renewal?.status === "renewed") {
    await saveSession(renewal.tokens);
    redirect(HOME_PATH);
  }
  if (renewal?.status === "unavailable") {
    // A API falhou, e a Sessão pode estar boa. Sai só o token de acesso recusado: com ele nos
    // cookies, o Proxy mandaria a pessoa de volta ao produto, e dali para cá, sem fim.
    await clearAccessToken();
    redirect(loginPath());
  }

  await clearSession();
  // Sem nenhum token, ninguém estava dentro: não há Sessão expirada para avisar.
  const hadSession = status === "rejected" || renewal !== null;
  redirect(loginPath({ notice: hadSession ? SESSION_EXPIRED_NOTICE : undefined }));
}
