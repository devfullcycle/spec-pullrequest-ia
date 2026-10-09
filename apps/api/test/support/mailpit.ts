import { randomUUID } from 'node:crypto';
import { inject } from 'vitest';

/** Um e-mail capturado pelo Mailpit, só com o que os testes conferem. */
export interface CapturedMail {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
}

interface MailpitAddress {
  Address: string;
}

interface MailpitSearchResult {
  /** Do mais novo para o mais antigo. */
  messages: { ID: string }[];
}

interface MailpitMessage {
  From: MailpitAddress;
  To: MailpitAddress[];
  Subject: string;
  Text: string;
  HTML: string;
}

interface WaitForMailOptions {
  /**
   * Quantos e-mails o endereço já tem de ter recebido, contando desde o começo
   * do teste. O padrão é 1. Um teste que provoca um segundo envio para o mesmo
   * destinatário (reenvio, redefinição de senha) espera com `count: 2`, para
   * não ler o primeiro e-mail enquanto o segundo ainda não chegou.
   */
  count?: number;
  timeoutMs?: number;
}

/**
 * Endereço que nenhum outro teste usa. Os testes acham os próprios e-mails pelo
 * destinatário, sem apagar a caixa do Mailpit, que também serve ao
 * desenvolvimento.
 */
export function uniqueEmail(): string {
  return `teste-${randomUUID()}@example.com`;
}

/**
 * Espera o endereço ter recebido `count` e-mails e devolve o mais novo deles. A
 * espera existe porque a API pode responder antes de o envio terminar.
 */
export async function waitForMailTo(
  address: string,
  { count = 1, timeoutMs = 5000 }: WaitForMailOptions = {},
): Promise<CapturedMail> {
  const newest = await vi.waitFor(
    async () => {
      const messages = await searchMailTo(address);
      if (messages.length < count) {
        throw new Error(
          `O Mailpit recebeu ${messages.length} e-mail(s) para ${address}, e o teste esperava ${count}.`,
        );
      }
      return messages[0];
    },
    { timeout: timeoutMs, interval: 100 },
  );
  // Só o e-mail devolvido tem o corpo buscado.
  return readMail(newest.ID);
}

/**
 * Quantos e-mails o endereço recebeu até agora. Serve para provar que um envio
 * não aconteceu: o teste provoca depois um envio que conhece, espera por ele com
 * `waitForMailTo` e confere que o total não passou do esperado.
 */
export async function countMailTo(address: string): Promise<number> {
  return (await searchMailTo(address)).length;
}

/** Todos os e-mails que o endereço recebeu até agora, do mais novo para o mais antigo. */
export async function readAllMailTo(address: string): Promise<CapturedMail[]> {
  const messages = await searchMailTo(address);
  return Promise.all(messages.map(({ ID }) => readMail(ID)));
}

/**
 * O link do e-mail para o caminho `path` (`/verificar-email`, por exemplo).
 * Falha se o e-mail não tiver exatamente um, para o teste não seguir o link
 * errado.
 */
export function extractLink(mail: CapturedMail, path: string): URL {
  const links = (mail.text.match(/https?:\/\/[^\s<>"')]+/g) ?? [])
    // A pontuação que fecha a frase não faz parte do link.
    .map((link) => new URL(link.replace(/[.,;:!?]+$/, '')))
    .filter((link) => link.pathname === path);
  if (links.length !== 1) {
    throw new Error(
      `O e-mail "${mail.subject}" tem ${links.length} link(s) para ${path}, e o teste esperava 1.`,
    );
  }
  return links[0];
}

/** Os e-mails que o endereço recebeu, do mais novo para o mais antigo. */
async function searchMailTo(address: string): Promise<{ ID: string }[]> {
  const query = encodeURIComponent(`to:"${address}"`);
  const { messages } = await getJson<MailpitSearchResult>(
    `/api/v1/search?query=${query}`,
  );
  return messages;
}

async function readMail(id: string): Promise<CapturedMail> {
  const message = await getJson<MailpitMessage>(`/api/v1/message/${id}`);
  return {
    from: message.From.Address,
    to: message.To.map((recipient) => recipient.Address),
    subject: message.Subject,
    text: message.Text,
    html: message.HTML,
  };
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${inject('mailpitApiUrl')}${path}`);
  if (!response.ok) {
    throw new Error(`Mailpit respondeu ${response.status} em ${path}.`);
  }
  return (await response.json()) as T;
}
