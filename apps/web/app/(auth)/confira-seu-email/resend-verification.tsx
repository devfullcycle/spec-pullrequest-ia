"use client";

import { useActionState } from "react";
import { Banner } from "@/components/ui/banner";
import { TextLink } from "@/components/ui/text-link";
import { resendVerification } from "../actions";
import type { ResendFormState } from "../form-state";

const INITIAL_STATE: ResendFormState = {};

/** O aviso do reenvio e os links da tela. Sem um cadastro recente, não há para quem reenviar. */
export function ResendVerification({ canResend }: { canResend: boolean }) {
  const [state, action, pending] = useActionState(
    resendVerification,
    INITIAL_STATE,
  );

  return (
    <>
      {state.sent && (
        <Banner variant="success" layout="narrow">
          Enviamos um novo link. Confira sua caixa de entrada.
        </Banner>
      )}
      {state.error && (
        <Banner variant="error" layout="narrow">
          {state.error}
        </Banner>
      )}
      <div className="flex flex-col items-center gap-2">
        {canResend && (
          <form action={action} className="flex gap-1">
            <p className="text-body text-ink-muted">Não recebeu?</p>
            <TextLink type="submit" disabled={pending}>
              Reenviar e-mail
            </TextLink>
          </form>
        )}
        <TextLink href="/entrar">Voltar para Entrar</TextLink>
      </div>
    </>
  );
}
