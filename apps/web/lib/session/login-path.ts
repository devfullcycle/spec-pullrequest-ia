import { LOGIN_PATH } from "@/lib/session/paths";
import { RETURN_PARAM } from "@/lib/session/return-path";

/*
 * O endereço da tela de entrar, com o que outro fluxo manda para ela. Sem `server-only`,
 * porque o Proxy o importa.
 */

/** O parâmetro da tela de entrar que traz o aviso de outro fluxo. */
export const NOTICE_PARAM = "aviso";

/** O e-mail acabou de ser verificado. */
export const EMAIL_VERIFIED_NOTICE = "email-verificado";

/** A senha acabou de ser redefinida. */
export const PASSWORD_RESET_NOTICE = "senha-redefinida";

/** A Sessão expirou ou foi revogada. */
export const SESSION_EXPIRED_NOTICE = "sessao-expirada";

type LoginNotice =
  | typeof EMAIL_VERIFIED_NOTICE
  | typeof PASSWORD_RESET_NOTICE
  | typeof SESSION_EXPIRED_NOTICE;

/** A tela de entrar, com o aviso a mostrar e a página para onde voltar depois do login. */
export function loginPath(
  options: { notice?: LoginNotice; returnTo?: string } = {},
): string {
  const params = new URLSearchParams();
  if (options.notice) params.set(NOTICE_PARAM, options.notice);
  if (options.returnTo) params.set(RETURN_PARAM, options.returnTo);
  return params.size ? `${LOGIN_PATH}?${params}` : LOGIN_PATH;
}
