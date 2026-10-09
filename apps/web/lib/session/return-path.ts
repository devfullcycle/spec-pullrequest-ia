import { HOME_PATH } from "@/lib/session/paths";

/*
 * O destino de retorno depois do login. Sem `server-only`, porque o Proxy o importa.
 */

/** O parâmetro da tela de entrar que guarda a página pedida antes do login. */
export const RETURN_PARAM = "destino";

// Só serve para resolver o caminho. O nome nunca chega ao navegador.
const BASE = "http://interno.invalid";

/**
 * O caminho para onde levar o Usuário depois do login. Só aceita caminhos internos: um
 * endereço de outro site, ou qualquer coisa que o navegador leria como tal (`//site`, `/\site`),
 * vira a página inicial. Sem isso, um link para a tela de entrar levaria a pessoa, já
 * autenticada, a um site de terceiros.
 */
export function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || /^\/[/\\]/.test(value)) {
    return HOME_PATH;
  }
  // O navegador ignora tabulação e quebra de linha numa URL, e trata `\` como `/`.
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return HOME_PATH;

  try {
    const url = new URL(value, BASE);
    return url.origin === BASE
      ? url.pathname + url.search + url.hash
      : HOME_PATH;
  } catch {
    return HOME_PATH;
  }
}
