import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { TextLink } from "@/components/ui/text-link";
import { PENDING_PASSWORD_RESET, pendingEmail } from "../../pending-email";

export const metadata: Metadata = { title: "Confira seu e-mail" };

/** O texto é o mesmo exista ou não o Usuário: a tela não revela quem tem cadastro. */
async function Support() {
  const email = await pendingEmail(PENDING_PASSWORD_RESET);
  return (
    <>
      Se houver uma conta com {email ?? "o e-mail informado"}, enviamos um link
      para redefinir a senha. Ele vale por 1 hora.
    </>
  );
}

export default function PasswordResetSentPage() {
  return (
    <AuthCard
      title="Confira seu e-mail"
      support={
        <Suspense>
          <Support />
        </Suspense>
      }
    >
      <div className="flex flex-col items-center gap-2">
        <TextLink href="/entrar">Voltar para Entrar</TextLink>
      </div>
    </AuthCard>
  );
}
