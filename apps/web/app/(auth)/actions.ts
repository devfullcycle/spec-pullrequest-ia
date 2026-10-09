"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import * as authApi from "@/lib/api/auth";
import { errorMessage } from "@/lib/api/error-messages";
import type { ApiError } from "@/lib/api/types";
import type { RegisterFormState, ResendFormState } from "./form-state";

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

/** As mensagens da API são para quem desenvolve: a web escreve a própria, por campo. */
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
  redirect(checkYourEmailPath(parsed.data.email));
}

/** O formulário da tela de link inválido: pede outro link e leva à tela "confira seu e-mail". */
export async function requestVerificationLink(
  previous: ResendFormState,
  formData: FormData,
): Promise<ResendFormState> {
  const state = await resendVerification(previous, formData);
  if (state.sent) {
    redirect(checkYourEmailPath(state.email));
  }
  return state;
}

/** O "Reenviar e-mail" da tela "confira seu e-mail": a pessoa continua nela. */
export async function resendVerification(
  _previous: ResendFormState,
  formData: FormData,
): Promise<ResendFormState> {
  const typedEmail = text(formData.get("email"));
  const parsed = resendSchema.safeParse({ email: typedEmail });
  if (!parsed.success) {
    return { fieldErrors: firstMessages(parsed.error), email: typedEmail };
  }

  const result = await authApi.resendVerification(parsed.data);
  if (!result.ok) {
    return { ...apiFailure(result.error), email: typedEmail };
  }
  return { sent: true, email: parsed.data.email };
}

function checkYourEmailPath(address: string): string {
  return `/confira-seu-email?${new URLSearchParams({ email: address })}`;
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
