import { redirect } from "next/navigation";
import { checkSession } from "@/lib/dal/user";
import { HOME_PATH, LOGIN_PATH } from "@/lib/session/paths";
import { clearSession } from "@/lib/session/tokens";

/**
 * Para onde a camada de acesso a dados manda quem tem cookies de uma Sessão que a API recusou.
 * Apaga os cookies e leva à tela de entrar. Sem isso, o Proxy continuaria vendo uma Sessão
 * neles e tiraria a pessoa da tela de entrar.
 *
 * A rota confere a Sessão de novo antes de apagar: um link para cá, aberto por quem tem uma
 * Sessão boa, não desloga ninguém.
 */
export async function GET() {
  const { status } = await checkSession();
  if (status === "valid" || status === "unavailable") redirect(HOME_PATH);

  await clearSession();
  redirect(LOGIN_PATH);
}
