import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { ResendVerification } from "./resend-verification";

export const metadata: Metadata = { title: "Confira seu e-mail" };

type SearchParams = PageProps<"/confira-seu-email">["searchParams"];

/** O e-mail vem na URL, posto pelo cadastro ou pelo pedido de novo link. */
async function emailFrom(searchParams: SearchParams): Promise<string | undefined> {
  const { email } = await searchParams;
  return typeof email === "string" && email ? email : undefined;
}

async function Support({ searchParams }: { searchParams: SearchParams }) {
  const email = await emailFrom(searchParams);
  return (
    <>
      Enviamos um link de verificação para {email ?? "o seu e-mail"}. Abra o
      link para ativar sua conta. Ele vale por 24 horas.
    </>
  );
}

async function Actions({ searchParams }: { searchParams: SearchParams }) {
  return <ResendVerification email={await emailFrom(searchParams)} />;
}

export default function CheckYourEmailPage({
  searchParams,
}: PageProps<"/confira-seu-email">) {
  return (
    <AuthCard
      title="Confira seu e-mail"
      support={
        <Suspense>
          <Support searchParams={searchParams} />
        </Suspense>
      }
    >
      <Suspense>
        <Actions searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}
