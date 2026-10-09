import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { TextLink } from "@/components/ui/text-link";
import { INVALID_RESET_LINK_PATH } from "../paths";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Nova senha" };

type Props = PageProps<"/redefinir-senha">;

/**
 * O formulário só existe depois de o token do link ser lido da URL: sem o token, o envio não
 * teria como valer. Só a API sabe se ele vale, então um token inválido só aparece no envio.
 * Sem token, o link nem chegou inteiro.
 */
async function Form({ searchParams }: Props) {
  const { token } = await searchParams;
  if (typeof token !== "string" || !token) {
    redirect(INVALID_RESET_LINK_PATH);
  }

  return <ResetPasswordForm token={token} />;
}

export default function ResetPasswordPage(props: Props) {
  return (
    <AuthCard
      title="Nova senha"
      support="Crie uma senha nova para voltar a entrar."
    >
      <Suspense>
        <Form {...props} />
      </Suspense>
      <div className="flex flex-col items-center gap-2">
        <TextLink href="/entrar">Voltar para Entrar</TextLink>
      </div>
    </AuthCard>
  );
}
