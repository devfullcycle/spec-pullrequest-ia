"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import * as authApi from "@/lib/api/auth";
import { errorMessage } from "@/lib/api/error-messages";
import type { ApiError } from "@/lib/api/types";
import { RETURN_PARAM, safeReturnPath } from "@/lib/session/return-path";
import { saveSession } from "@/lib/session/tokens";
import type {
  LoginFormState,
  RegisterFormState,
  RequestLinkFormState,
  ResendFormState,
} from "./form-state";
import {
  pendingVerificationEmail,
  rememberPendingVerification,
} from "./pending-verification";

const INVALID_EMAIL = "Informe um e-mail válido, como nome@exemplo.com.";
const INVALID_PASSWORD = "A senha precisa ter de 10 a 128 caracteres.";

const email = z.string().trim().pipe(z.email(INVALID_EMAIL).max(254, INVALID_EMAIL));

const registerSchema = z.object({
  email,
  password: z
    .string()
    .min(10, "A senha precisa ter pelo menos 10 caracteres.")
    .max(128, "A senha pode ter no máximo 128 caracteres."),
});

const resendSchema = z.object({ email });

// Sem o mínimo do cadastro: uma senha curta é só uma senha errada.
const loginSchema = z.object({
  email,
  password: z.string().min(1, "Informe sua senha."),
});

/** As mensagens da API são para quem desenvolve: a web escreve a própria, por campo. */
const CHECK_YOUR_EMAIL_PATH = "/confira-seu-email";

const API_FIELD_MESSAGES = { email: INVALID_EMAIL, password: INVALID_PASSWORD };

export async function register(
  _previous: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  const typedEmail = text(formData.get("email"));
  const parsed = registerSchema.safeParse({
    email: typedEmail,
    password: text(formData.get("password")),
  });
  if (!parsed.success) {
    return { fieldErrors: firstMessages(parsed.error), email: typedEmail };
  }

  const result = await authApi.register(parsed.data);
  if (!result.ok) {
    return { ...apiFailure(result.error), email: typedEmail };
  }
  await rememberPendingVerification(parsed.data.email);
  redirect(CHECK_YOUR_EMAIL_PATH);
}

/** O formulário da tela de link inválido: pede outro link e leva à tela "confira seu e-mail". */
export async function requestVerificationLink(
  _previous: RequestLinkFormState,
  formData: FormData,
): Promise<RequestLinkFormState> {
  const typedEmail = text(formData.get("email"));
  const parsed = resendSchema.safeParse({ email: typedEmail });
  if (!parsed.success) {
    return { fieldErrors: firstMessages(parsed.error), email: typedEmail };
  }

  const result = await authApi.resendVerification(parsed.data);
  if (!result.ok) {
    return { ...apiFailure(result.error), email: typedEmail };
  }
  await rememberPendingVerification(parsed.data.email);
  redirect(CHECK_YOUR_EMAIL_PATH);
}

/**
 * A tela de entrar. O botão do aviso de e-mail não verificado envia um formulário à parte para
 * a mesma ação, com `intent=resend`, e pede o reenvio sem sair da tela. Uma ação só mantém um
 * estado só, e a tela mostra sempre o aviso do último envio.
 */
export async function login(
  previous: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  if (formData.get("intent") === "resend") {
    const state = await resendFromLogin(text(formData.get("unverifiedEmail")));
    // O formulário do reenvio não traz o campo de e-mail: vale o do envio anterior.
    return { ...state, email: previous.email };
  }
  // O e-mail digitado volta ao campo, seja qual for o resultado.
  const email = text(formData.get("email"));
  return { ...(await signIn(email, formData)), email };
}

async function signIn(
  typedEmail: string,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    email: typedEmail,
    password: text(formData.get("password")),
  });
  if (!parsed.success) {
    return { fieldErrors: firstMessages(parsed.error) };
  }

  const result = await authApi.login(parsed.data);
  if (!result.ok) {
    return result.error.code === "email_not_verified"
      ? {
          unverifiedEmail: parsed.data.email,
          formError: errorMessage(result.error.code),
        }
      : apiFailure(result.error);
  }
  await saveSession(result.data);
  redirect(safeReturnPath(text(formData.get(RETURN_PARAM))));
}

async function resendFromLogin(
  unverifiedEmail: string,
): Promise<LoginFormState> {
  const parsed = resendSchema.safeParse({ email: unverifiedEmail });
  if (!parsed.success) {
    return { formError: errorMessage("validation_error") };
  }
  const result = await authApi.resendVerification(parsed.data);
  return result.ok
    ? { verificationSent: true }
    : {
        formError: errorMessage(result.error.code),
        unverifiedEmail: parsed.data.email,
      };
}

/**
 * O "Reenviar e-mail" da tela "confira seu e-mail": a pessoa continua nela. O destinatário é o
 * do cookie gravado pelo cadastro, e nunca um valor vindo do formulário.
 */
export async function resendVerification(): Promise<ResendFormState> {
  const email = await pendingVerificationEmail();
  if (!email) {
    return { error: "Não foi possível reenviar. Faça o cadastro de novo." };
  }

  const result = await authApi.resendVerification({ email });
  return result.ok
    ? { sent: true }
    : { error: errorMessage(result.error.code) };
}

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

/** A primeira mensagem de cada campo recusado pelo schema. */
function firstMessages(error: z.ZodError): Record<string, string> {
  const messages: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0]);
    messages[field] ??= issue.message;
  }
  return messages;
}

/** Um `validation_error` com campos vira erro de campo; o resto vira o aviso do formulário. */
function apiFailure(error: ApiError): {
  fieldErrors?: Record<string, string>;
  formError?: string;
} {
  const fieldErrors: Record<string, string> = {};
  for (const { field } of error.fieldErrors) {
    if (field in API_FIELD_MESSAGES) {
      fieldErrors[field] =
        API_FIELD_MESSAGES[field as keyof typeof API_FIELD_MESSAGES];
    }
  }
  return Object.keys(fieldErrors).length > 0
    ? { fieldErrors }
    : { formError: errorMessage(error.code) };
}
