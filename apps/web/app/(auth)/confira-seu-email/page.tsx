import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { pendingVerificationEmail } from "../pending-verification";
import { ResendVerification } from "./resend-verification";

export const metadata: Metadata = { title: "Confira seu e-mail" };

async function Support() {
  const email = await pendingVerificationEmail();
  return (
    <>
      Enviamos um link de verificação para {email ?? "o seu e-mail"}. Abra o
      link para ativar sua conta. Ele vale por 24 horas.
    </>
  );
}

async function Actions() {
  return <ResendVerification canResend={!!(await pendingVerificationEmail())} />;
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
