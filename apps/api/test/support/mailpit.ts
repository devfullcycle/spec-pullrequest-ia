import { randomUUID } from 'node:crypto';
import { MAILPIT_API_URL } from './test-env.js';

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
  messages: { ID: string }[];
}

interface MailpitMessage {
  From: MailpitAddress;
  To: MailpitAddress[];
  Subject: string;
  Text: string;
  HTML: string;
}

/**
 * Endereço que nenhum outro teste usa. Os testes acham os próprios e-mails pelo
 * destinatário, sem apagar a caixa do Mailpit, que também serve ao
 * desenvolvimento.
 */
export function uniqueEmail(): string {
  return `teste-${randomUUID()}@example.com`;
}

/** E-mails enviados para o endereço, do mais novo para o mais antigo. */
export async function findMailsTo(address: string): Promise<CapturedMail[]> {
  const query = encodeURIComponent(`to:"${address}"`);
  const { messages } = await getJson<MailpitSearchResult>(
    `/api/v1/search?query=${query}`,
  );

  return Promise.all(
    messages.map(async ({ ID }) => {
      const message = await getJson<MailpitMessage>(`/api/v1/message/${ID}`);
      return {
        from: message.From.Address,
        to: message.To.map((recipient) => recipient.Address),
        subject: message.Subject,
        text: message.Text,
        html: message.HTML,
      };
    }),
  );
}

/**
 * Espera o e-mail mais novo para o endereço. A espera existe porque a API pode
 * responder antes de o envio terminar.
 */
export async function waitForMailTo(
  address: string,
  timeoutMs = 5000,
): Promise<CapturedMail> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const [newest] = await findMailsTo(address);
    if (newest) {
      return newest;
    }
    if (Date.now() > deadline) {
      throw new Error(`Nenhum e-mail para ${address} chegou ao Mailpit.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${MAILPIT_API_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Mailpit respondeu ${response.status} em ${path}.`);
  }
  return (await response.json()) as T;
}
