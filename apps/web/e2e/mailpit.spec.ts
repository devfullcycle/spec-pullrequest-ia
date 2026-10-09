import { expect, test } from "@playwright/test";
import {
  extractLink,
  mailpitUrl,
  uniqueEmail,
  waitForMailTo,
} from "./support/mailpit";

/** Entrega um e-mail pela API de envio do Mailpit, já que a API ainda não envia nenhum por rota. */
async function deliver(to: string, subject: string, text: string) {
  const response = await fetch(`${mailpitUrl()}/api/v1/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      From: { Email: "nao-responda@gerenciador.local" },
      To: [{ Email: to }],
      Subject: subject,
      Text: text,
    }),
  });
  expect(response.ok).toBe(true);
}

test("lê o e-mail de um destinatário e extrai o link dele", async () => {
  const address = uniqueEmail();
  await deliver(
    address,
    "Confirme seu e-mail",
    "Olá!\n\nAbra o link para confirmar: http://web:3000/verificar-email?token=abc123\n\nSe não foi você, ignore.",
  );

  const mail = await waitForMailTo(address);
  const link = extractLink(mail, "/verificar-email");

  expect(mail.to).toEqual([address]);
  expect(mail.subject).toBe("Confirme seu e-mail");
  expect(link.pathname).toBe("/verificar-email");
  expect(link.searchParams.get("token")).toBe("abc123");
});

test("devolve o e-mail mais novo quando o destinatário recebeu mais de um", async () => {
  const address = uniqueEmail();
  await deliver(address, "Primeiro", "http://web:3000/verificar-email?token=antigo");
  await waitForMailTo(address);
  await deliver(address, "Segundo", "http://web:3000/verificar-email?token=novo");

  const mail = await waitForMailTo(address, { count: 2 });

  expect(mail.subject).toBe("Segundo");
  expect(extractLink(mail, "/verificar-email").searchParams.get("token")).toBe("novo");
});

test("ignora a pontuação depois do link e os links de outro caminho", async () => {
  const address = uniqueEmail();
  await deliver(
    address,
    "Confirme seu e-mail",
    "Confirme em http://web:3000/verificar-email?token=abc123. Ou peça outro em http://web:3000/verificar-email-reenviar.",
  );

  const mail = await waitForMailTo(address);
  const link = extractLink(mail, "/verificar-email");

  expect(link.searchParams.get("token")).toBe("abc123");
});

test("recusa um e-mail sem o link esperado", async () => {
  const address = uniqueEmail();
  await deliver(address, "Sua senha foi alterada", "Nenhum link aqui.");

  const mail = await waitForMailTo(address);

  expect(() => extractLink(mail, "/verificar-email")).toThrow(/0 link\(s\)/);
});
