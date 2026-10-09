import "server-only";
import { headers } from "next/headers";

/*
 * O IP do navegador, que a web repassa à API (docs/lld.md, seção 1). As chamadas saem do
 * servidor do Next.js, e sem isto a API contaria todas as pessoas como um IP só.
 */

/**
 * Os cabeçalhos que dizem à API de que IP veio a requisição em curso: o IP e o segredo que
 * autoriza a web a informá-lo. Sem um IP legível, não vai nenhum, e a API usa o da conexão.
 */
export async function clientIpHeaders(): Promise<Record<string, string>> {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    throw new Error(
      "A variável de ambiente INTERNAL_API_SECRET não está definida (docs/lld.md, seção 6).",
    );
  }
  const ip = lastForwardedAddress((await headers()).get("x-forwarded-for"));
  return ip ? { "X-Client-Ip": ip, "X-Internal-Secret": secret } : {};
}

/**
 * O último endereço de `X-Forwarded-For`, que é o que o proxy na frente da web (o Cloud Run)
 * acrescenta. Os anteriores vêm do próprio navegador, que pode escrever ali o que quiser.
 */
function lastForwardedAddress(forwardedFor: string | null): string | undefined {
  return forwardedFor?.split(",").at(-1)?.trim();
}
