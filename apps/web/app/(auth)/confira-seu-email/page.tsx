import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { PENDING_VERIFICATION, pendingEmail } from "../pending-email";
import { ResendVerification } from "./resend-verification";

export const metadata: Metadata = { title: "Confira seu e-mail" };

async function Support() {
  const email = await pendingEmail(PENDING_VERIFICATION);
  return (
    <>
      Enviamos um link de verificação para {email ?? "o seu e-mail"}. Abra o
      link para ativar sua conta. Ele vale por 24 horas.
    </>
  );
}

async function Actions() {
  return <ResendVerification canResend={!!(await pendingEmail(PENDING_VERIFICATION))} />;
}

export default function CheckYourEmailPage() {
  return (
    <AuthCard
      title="Confira seu e-mail"
      support={
        <Suspense>
          <Support />
        </Suspense>
      }
    >
      <Suspense>
        <Actions />
      </Suspense>
    </AuthCard>
  );
}
