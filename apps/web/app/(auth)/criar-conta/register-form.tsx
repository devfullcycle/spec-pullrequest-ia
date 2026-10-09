"use client";

import { useActionState } from "react";
import { Banner } from "@/components/ui/banner";
import { ButtonPrimary } from "@/components/ui/button-primary";
import { PasswordField } from "@/components/ui/password-field";
import { TextField } from "@/components/ui/text-field";
import { register } from "../actions";
import type { RegisterFormState } from "../form-state";

const INITIAL_STATE: RegisterFormState = {};

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, INITIAL_STATE);

  return (
    // A validação é da Server Action: a do navegador mostraria balões fora do design.
    <form action={action} noValidate className="flex flex-col gap-6">
      {state.formError && (
        <Banner variant="error" layout="narrow">
          {state.formError}
        </Banner>
      )}
      <div className="flex flex-col gap-4">
        <TextField
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nome@exemplo.com"
          defaultValue={state.email}
          error={state.fieldErrors?.email}
        />
        <PasswordField
          label="Senha"
          name="password"
          autoComplete="new-password"
          helper="De 10 a 128 caracteres."
          error={state.fieldErrors?.password}
        />
      </div>
      <ButtonPrimary type="submit" fullWidth loading={pending}>
        Criar conta
      </ButtonPrimary>
    </form>
  );
}
