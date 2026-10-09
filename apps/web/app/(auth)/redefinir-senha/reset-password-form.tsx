"use client";

import { useActionState } from "react";
import { Banner } from "@/components/ui/banner";
import { ButtonPrimary } from "@/components/ui/button-primary";
import { PasswordField } from "@/components/ui/password-field";
import { resetPassword } from "../actions";
import type { ResetPasswordFormState } from "../form-state";

const INITIAL_STATE: ResetPasswordFormState = {};

type ResetPasswordFormProps = {
  /** O token do link do e-mail, que segue para a Server Action num campo oculto. */
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [state, action, pending] = useActionState(resetPassword, INITIAL_STATE);

  return (
    // A validação é da Server Action: a do navegador mostraria balões fora do design.
    <form action={action} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="token" value={token} />
      {state.formError && (
        <Banner variant="error" layout="narrow">
          {state.formError}
        </Banner>
      )}
      <div className="flex flex-col gap-4">
        <PasswordField
          label="Nova senha"
          name="password"
          autoComplete="new-password"
          helper="De 10 a 128 caracteres."
          error={state.fieldErrors?.password}
        />
      </div>
      <ButtonPrimary type="submit" fullWidth loading={pending}>
        Salvar nova senha
      </ButtonPrimary>
    </form>
  );
}
