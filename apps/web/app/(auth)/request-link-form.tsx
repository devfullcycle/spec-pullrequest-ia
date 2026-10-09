"use client";

import { useActionState } from "react";
import { Banner } from "@/components/ui/banner";
import { ButtonPrimary } from "@/components/ui/button-primary";
import { EmailField } from "./email-field";
import type { RequestLinkFormState } from "./form-state";

const INITIAL_STATE: RequestLinkFormState = {};

type RequestLinkFormProps = {
  /** A Server Action que pede o link para o e-mail informado. */
  action: (
    previous: RequestLinkFormState,
    formData: FormData,
  ) => Promise<RequestLinkFormState>;
  submitLabel: string;
};

/** O formulário das telas que pedem um link por e-mail: só o campo de e-mail e o botão. */
export function RequestLinkForm({ action, submitLabel }: RequestLinkFormProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);

  return (
    // A validação é da Server Action: a do navegador mostraria balões fora do design.
    <form action={formAction} noValidate className="flex flex-col gap-6">
      {state.formError && (
        <Banner variant="error" layout="narrow">
          {state.formError}
        </Banner>
      )}
      <div className="flex flex-col gap-4">
        <EmailField
          defaultValue={state.email}
          error={state.fieldErrors?.email}
        />
      </div>
      <ButtonPrimary type="submit" fullWidth loading={pending}>
        {submitLabel}
      </ButtonPrimary>
    </form>
  );
}
