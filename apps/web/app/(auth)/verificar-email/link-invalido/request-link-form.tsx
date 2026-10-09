"use client";

import { useActionState } from "react";
import { Banner } from "@/components/ui/banner";
import { ButtonPrimary } from "@/components/ui/button-primary";
import { TextField } from "@/components/ui/text-field";
import { requestVerificationLink } from "../../actions";
import type { RequestLinkFormState } from "../../form-state";

const INITIAL_STATE: RequestLinkFormState = {};

export function RequestLinkForm() {
  const [state, action, pending] = useActionState(
    requestVerificationLink,
    INITIAL_STATE,
  );

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
      </div>
      <ButtonPrimary type="submit" fullWidth loading={pending}>
        Enviar novo link
      </ButtonPrimary>
    </form>
  );
}
