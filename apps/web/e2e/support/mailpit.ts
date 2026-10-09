import { randomUUID } from "node:crypto";
import { expect } from "@playwright/test";
import { requiredEnv } from "./env";

/** Um e-mail capturado pelo Mailpit, só com o que os testes conferem. */
export interface CapturedMail {
  to: string[];
  subject: string;
  text: string;
}

interface MailpitSearchResult {
  /** Do mais novo para o mais antigo. */
  messages: { ID: string }[];
}

interface MailpitMessage {
  To: { Address: string }[];
  Subject: string;
  Text: string;
}

interface WaitForMailOptions {
  /**
   * Quantos e-mails o endereço já tem de ter recebido, contando desde o começo do teste.
   * Um teste que provoca um segundo envio para o mesmo destinatário espera com `count: 2`,
   * para não ler o primeiro e-mail enquanto o segundo ainda não chegou.
   */
  count?: number;
}

/**
 * Endereço que nenhum outro teste usa. Os testes acham os próprios e-mails pelo
 * destinatário, sem apagar a caixa do Mailpit, que também serve ao desenvolvimento.
 */
export function uniqueEmail(): string {
  return `teste-${randomUUID()}@example.com`;
}

/**
 * Espera o endereço ter recebido `count` e-mails e devolve o mais novo deles. A espera
 * existe porque a API responde antes de o envio terminar.
 */
export async function waitForMailTo(
  address: string,
  { count = 1 }: WaitForMailOptions = {},
): Promise<CapturedMail> {
  const query = encodeURIComponent(`to:"${address}"`);
  let newestId = "";

  await expect(async () => {
    const { messages } = await getJson<MailpitSearchResult>(
      `/api/v1/search?query=${query}`,
    );
    expect(
      messages.length,
      `e-mails que o Mailpit recebeu para ${address}`,
    ).toBeGreaterThanOrEqual(count);
    newestId = messages[0].ID;
  }).toPass({ timeout: 5000, intervals: [100] });

  // Só o e-mail devolvido tem o corpo buscado.
  const message = await getJson<MailpitMessage>(`/api/v1/message/${newestId}`);
  return {
    to: message.To.map((recipient) => recipient.Address),
    subject: message.Subject,
    text: message.Text,
  };
}

/**
 * Devolve o link do e-mail para o caminho `path` (`/verificar-email`, por exemplo). Falha se
 * o e-mail não tiver exatamente um, para o teste não seguir o link errado.
 */
export function extractLink(mail: CapturedMail, path: string): URL {
  const links = (mail.text.match(/https?:\/\/[^\s<>"')]+/g) ?? [])
    // A pontuação que fecha a frase não faz parte do link.
    .map((link) => new URL(link.replace(/[.,;:!?]+$/, "")))
    .filter((link) => link.pathname === path);

  if (links.length !== 1) {
    throw new Error(
      `O e-mail "${mail.subject}" tem ${links.length} link(s) para ${path}, e o teste esperava 1.`,
    );
  }
  return links[0];
}

export function mailpitUrl(): string {
  return requiredEnv("MAILPIT_URL");
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${mailpitUrl()}${path}`);
  if (!response.ok) {
    throw new Error(`Mailpit respondeu ${response.status} em ${path}.`);
  }
  return (await response.json()) as T;
}
