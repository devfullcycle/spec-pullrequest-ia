import "server-only";
import { cookies } from "next/headers";
import { secureCookies } from "@/lib/session/cookie-options";
import { CHECK_YOUR_EMAIL_PATH, PASSWORD_RESET_SENT_PATH } from "./paths";

/*
 * O e-mail que a pessoa acabou de informar, guardado para a tela seguinte mostrá-lo. Ele fica
 * num cookie `HttpOnly`, restrito a essa tela, e não na URL, que vai para o histórico do
 * navegador e para os logs.
 */

interface PendingEmail {
  /** O nome do cookie. */
  name: string;
  /** A tela que mostra o e-mail. O navegador só manda o cookie para ela. */
  path: string;
}

/** De quem acabou de se cadastrar, ou de pedir outro link de verificação. */
export const PENDING_VERIFICATION: PendingEmail = {
  name: "pending_verification_email",
  path: CHECK_YOUR_EMAIL_PATH,
};

/** De quem acabou de pedir a redefinição de senha. */
export const PENDING_PASSWORD_RESET: PendingEmail = {
  name: "pending_password_reset_email",
  path: PASSWORD_RESET_SENT_PATH,
};

/** A tela só é útil logo depois do envio. Passado o prazo, a pessoa pede outro link. */
const MAX_AGE_SECONDS = 60 * 60;

/** Só funciona numa Server Action ou num Route Handler, onde os cookies podem ser gravados. */
export async function rememberPendingEmail(
  pending: PendingEmail,
  email: string,
): Promise<void> {
  (await cookies()).set(pending.name, email, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: pending.path,
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function pendingEmail(
  pending: PendingEmail,
): Promise<string | undefined> {
  return (await cookies()).get(pending.name)?.value || undefined;
}
