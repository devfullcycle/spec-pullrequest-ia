import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { verifyEmail } from "@/lib/api/auth";
import { isInvalidLinkToken } from "@/lib/api/link-errors";
import { EMAIL_VERIFIED_NOTICE, loginPath } from "@/lib/session/login-path";

const INVALID_LINK_PATH = "/verificar-email/link-invalido";

/**
 * O destino do link do e-mail de verificação. Gasta o token na API e leva a pessoa à tela de
 * entrar, com o aviso de sucesso. Verificar não abre Sessão.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) redirect(INVALID_LINK_PATH);

  const result = await verifyEmail({ token });
  if (result.ok) redirect(loginPath({ notice: EMAIL_VERIFIED_NOTICE }));

  // Uma falha nossa não condena o link, que pode continuar bom.
  redirect(
    isInvalidLinkToken(result.error)
      ? INVALID_LINK_PATH
      : `${INVALID_LINK_PATH}?motivo=falha`,
  );
}
