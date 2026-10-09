import "server-only";
import { cookies } from "next/headers";
import { secureCookies } from "@/lib/session/cookie-options";

const COOKIE = "pending_verification_email";

/** A tela só é útil logo depois do cadastro. Passado o prazo, a pessoa pede outro link pelo e-mail. */
const MAX_AGE_SECONDS = 60 * 60;

/*
 * O e-mail de quem acabou de se cadastrar, ou de pedir outro link, para a tela "confira seu
 * e-mail" mostrá-lo e reenviar a verificação. Ele fica num cookie `HttpOnly`, e não na URL,
 * que vai para o histórico do navegador e para os logs.
 */

/** Só funciona numa Server Action ou num Route Handler, onde os cookies podem ser gravados. */
export async function rememberPendingVerification(email: string): Promise<void> {
  (await cookies()).set(COOKIE, email, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/confira-seu-email",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function pendingVerificationEmail(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE)?.value || undefined;
}
