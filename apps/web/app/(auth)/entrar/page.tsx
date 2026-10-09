import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { Banner } from "@/components/ui/banner";
import { TextLink } from "@/components/ui/text-link";

export const metadata: Metadata = { title: "Entrar" };

type Props = PageProps<"/entrar">;

/** O aviso que chega de outro fluxo, pelo parâmetro `aviso` da URL. */
async function Notice({ searchParams }: Props) {
  const { aviso } = await searchParams;
  if (aviso !== "email-verificado") return null;

  return (
    <Banner variant="success" layout="narrow">
      E-mail verificado. Agora você já pode entrar.
    </Banner>
  );
}

// Por enquanto, só o cartão e o aviso: o formulário chega com o login.
export default function LoginPage(props: Props) {
  return (
    <AuthCard title="Entrar">
      <Suspense>
        <Notice {...props} />
      </Suspense>
      <div className="flex flex-col items-center gap-2">
        <p className="text-body text-ink-muted">
          Ainda não tem conta? <TextLink href="/criar-conta">Criar conta</TextLink>
        </p>
      </div>
    </AuthCard>
  );
}
